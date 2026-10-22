"""Small, dependency-free statistics toolkit (normal/Student-t CDFs, EWMA vol, calibration metrics)."""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence

SQRT2 = math.sqrt(2.0)


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / SQRT2))


def norm_ppf(p: float) -> float:
    """Inverse standard normal CDF (Acklam's algorithm, |rel err| < 1.2e-9)."""
    if not 0.0 < p < 1.0:
        raise ValueError("p must be in (0,1)")
    a = [-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02, 1.383577518672690e02,
         -3.066479806614716e01, 2.506628277459239e00]
    b = [-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02, 6.680131188771972e01,
         -1.328068155288572e01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00, -2.549732539343734e00,
         4.374664141464968e00, 2.938163982698783e00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00, 3.754408661907416e00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    if p > phigh:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def clamp_prob(p: float, eps: float = 0.001) -> float:
    return clamp(p, eps, 1 - eps)


def mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs) if xs else float("nan")


def stdev(xs: Sequence[float]) -> float:
    n = len(xs)
    if n < 2:
        return float("nan")
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1))


def ewma_vol(log_returns: Sequence[float], lam: float = 0.97) -> float:
    """RiskMetrics-style EWMA standard deviation of per-period log returns."""
    if not log_returns:
        return float("nan")
    var = log_returns[0] ** 2
    for r in log_returns[1:]:
        var = lam * var + (1 - lam) * r * r
    return math.sqrt(var)


def wilson_interval(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


# ---------------------------------------------------------------- calibration
def brier(probs: Sequence[float], outcomes: Sequence[int]) -> float:
    return mean([(p - o) ** 2 for p, o in zip(probs, outcomes, strict=True)])


def log_loss(probs: Sequence[float], outcomes: Sequence[int], eps: float = 1e-6) -> float:
    total = 0.0
    for p, o in zip(probs, outcomes, strict=True):
        p = clamp(p, eps, 1 - eps)
        total += -(o * math.log(p) + (1 - o) * math.log(1 - p))
    return total / len(probs) if probs else float("nan")


def reliability_bins(probs: Sequence[float], outcomes: Sequence[int], n_bins: int = 10) -> list[dict]:
    bins: list[list[tuple[float, int]]] = [[] for _ in range(n_bins)]
    for p, o in zip(probs, outcomes, strict=True):
        idx = min(n_bins - 1, int(p * n_bins))
        bins[idx].append((p, o))
    out = []
    for i, b in enumerate(bins):
        if not b:
            out.append({"bin": i, "lo": i / n_bins, "hi": (i + 1) / n_bins, "n": 0, "mean_p": None,
                        "freq": None, "ci": None})
            continue
        k = sum(o for _, o in b)
        lo, hi = wilson_interval(k, len(b))
        out.append({"bin": i, "lo": i / n_bins, "hi": (i + 1) / n_bins, "n": len(b),
                    "mean_p": mean([p for p, _ in b]), "freq": k / len(b), "ci": [lo, hi]})
    return out


def expected_calibration_error(probs: Sequence[float], outcomes: Sequence[int], n_bins: int = 10) -> float:
    n = len(probs)
    if n == 0:
        return float("nan")
    ece = 0.0
    for b in reliability_bins(probs, outcomes, n_bins):
        if b["n"]:
            ece += b["n"] / n * abs(b["mean_p"] - b["freq"])
    return ece


def interval_coverage(probs: Sequence[float], lows: Sequence[float], highs: Sequence[float],
                      outcomes: Sequence[int], n_bins: int = 10) -> dict:
    """Binned interval coverage for binary forecasts.

    Single binary outcomes cannot be "inside" a probability interval, so forecasts are grouped by point
    probability; for each bin we test whether the realized frequency lies within the bin's mean
    [p_low, p_high]. Returns the share of populated bins (weighted by count) that are covered.
    """
    groups: dict[int, list[tuple[float, float, int]]] = {}
    for p, lo, hi, o in zip(probs, lows, highs, outcomes, strict=True):
        groups.setdefault(min(n_bins - 1, int(p * n_bins)), []).append((lo, hi, o))
    total = sum(len(g) for g in groups.values())
    if total == 0:
        return {"coverage": None, "bins": 0}
    covered = 0
    for g in groups.values():
        freq = sum(o for _, _, o in g) / len(g)
        if mean([lo for lo, _, _ in g]) <= freq <= mean([hi for _, hi, _ in g]):
            covered += len(g)
    return {"coverage": covered / total, "bins": len(groups)}


def bootstrap_mean_ci(xs: Sequence[float], n_boot: int = 2000, alpha: float = 0.05, seed: int = 7) -> tuple[float, float]:
    import random

    if len(xs) < 2:
        return (float("nan"), float("nan"))
    rng = random.Random(seed)
    n = len(xs)
    means = sorted(mean([xs[rng.randrange(n)] for _ in range(n)]) for _ in range(n_boot))
    return (means[int(alpha / 2 * n_boot)], means[int((1 - alpha / 2) * n_boot) - 1])
