"""Central configuration loaded from environment variables / .env.

Security notes:
* Private keys are only read server-side from a file path or env var; never logged or returned by the API.
* Live order execution requires THREE independent switches (mode=live, armed flag, confirmation phrase)
  and is additionally gated at runtime by validation checks + the risk manager.
"""

from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

LIVE_CONFIRM_PHRASE = "I AUTHORIZE LIVE KALSHI ORDERS AND ACCEPT THE RISK OF LOSS"


class KalshiEnv(StrEnum):
    PROD = "prod"
    DEMO = "demo"


class ExecutionMode(StrEnum):
    INTELLIGENCE = "intelligence"  # recommendations only (default)
    PAPER = "paper"  # simulated fills against live books
    LIVE = "live"  # real orders — gated


KALSHI_URLS = {
    KalshiEnv.PROD: {
        "rest": "https://api.elections.kalshi.com/trade-api/v2",
        "ws": "wss://api.elections.kalshi.com/trade-api/ws/v2",
    },
    KalshiEnv.DEMO: {
        "rest": "https://demo-api.kalshi.co/trade-api/v2",
        "ws": "wss://demo-api.kalshi.co/trade-api/ws/v2",
    },
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    # --- Kalshi ---
    kalshi_env: KalshiEnv = KalshiEnv.PROD
    kalshi_api_key_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("kalshi_api_key_id", "boi_kalshi_key_id", "boi_kalshi_api_key_id"),
    )
    kalshi_private_key_path: Path | None = Field(
        default=None,
        validation_alias=AliasChoices("kalshi_private_key_path", "boi_kalshi_private_key_path"),
    )
    kalshi_private_key_pem: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("kalshi_private_key_pem", "boi_kalshi_private_key_pem"),
    )
    kalshi_rest_read_per_sec: float = Field(default=8.0, description="Client-side read throttle (below Basic tier)")
    kalshi_rest_write_per_sec: float = 4.0

    # --- Execution gating ---
    execution_mode: ExecutionMode = ExecutionMode.INTELLIGENCE
    live_trading_armed: bool = False
    live_trading_confirm: str = ""

    # --- Bankroll & risk policy (BALANCED / CAPITAL PRESERVATION defaults) ---
    bankroll: Decimal = Decimal("500")
    max_trade_risk_pct: Decimal = Decimal("0.01")
    max_open_risk_pct: Decimal = Decimal("0.10")
    max_daily_loss_pct: Decimal = Decimal("0.03")
    max_drawdown_pct: Decimal = Decimal("0.10")
    max_event_risk_pct: Decimal = Decimal("0.03")  # correlation bucket: same event
    max_category_risk_pct: Decimal = Decimal("0.06")
    kelly_fraction: Decimal = Decimal("0.25")
    trade_cooldown_after_loss_sec: int = 1800
    max_trades_per_day: int = 10

    # --- Signal thresholds ---
    min_conservative_edge: Decimal = Decimal("0.03")  # $/contract after costs at the conservative prob
    min_net_roi: Decimal = Decimal("0.05")
    strong_conservative_edge: Decimal = Decimal("0.06")
    strong_net_roi: Decimal = Decimal("0.12")
    max_spread: Decimal = Decimal("0.08")
    min_top_depth: Decimal = Decimal("5")
    recommendation_ttl_sec: int = 120
    max_market_data_age_sec: float = 10.0  # WS-fed books
    max_rest_book_age_sec: float = 45.0  # REST-polled books (no WS credentials)

    # --- Discovery ---
    discovery_interval_sec: int = 300
    max_tracked_markets: int = 400
    max_streamed_markets: int = 150
    enabled_series_prefixes: str = "KXHIGH,KXLOW,KXBTC,KXETH,KXSOL,KXXRP,KXDOGE,KXNFLGAME,KXNBAGAME,KXMLBGAME,KXNHLGAME,KXNCAAFGAME,KXWNBAGAME"

    # --- External providers ---
    nws_user_agent: str = "BettingIntelligenceOS/0.1 (contact: set NWS_USER_AGENT)"
    fred_api_key: SecretStr | None = None
    coinbase_ws_enabled: bool = True
    llm_provider: str | None = None  # "gemini" | "anthropic" | None
    llm_api_key: SecretStr | None = None
    llm_daily_budget_usd: Decimal = Decimal("2.00")

    # --- Alerts ---
    ntfy_topic_url: str | None = None  # e.g. https://ntfy.sh/your-private-topic
    alert_cooldown_sec: int = 600

    # --- Platform ---
    database_url: str = "sqlite+aiosqlite:///./data/boi.db"
    admin_token: SecretStr | None = None  # required for any state-changing API call
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    engine_enabled: bool = True
    log_level: str = "INFO"

    # ---------------------------------------------------------------- derived
    @property
    def kalshi_rest_url(self) -> str:
        return KALSHI_URLS[self.kalshi_env]["rest"]

    @property
    def kalshi_ws_url(self) -> str:
        return KALSHI_URLS[self.kalshi_env]["ws"]

    @property
    def has_kalshi_credentials(self) -> bool:
        return bool(self.kalshi_api_key_id and self.load_private_key_pem() is not None)

    def load_private_key_pem(self) -> bytes | None:
        if self.kalshi_private_key_pem:
            val = self.kalshi_private_key_pem.get_secret_value()
            if val and val.strip():
                return val.replace("\\n", "\n").encode()
        if (
            self.kalshi_private_key_path
            and str(self.kalshi_private_key_path).strip()
            and str(self.kalshi_private_key_path) != "."
        ):
            try:
                if self.kalshi_private_key_path.is_file():
                    return self.kalshi_private_key_path.read_bytes()
            except Exception:
                pass
        return None

    @property
    def live_execution_permitted_by_config(self) -> bool:
        return (
            self.execution_mode == ExecutionMode.LIVE
            and self.live_trading_armed
            and self.live_trading_confirm.strip() == LIVE_CONFIRM_PHRASE
            and self.has_kalshi_credentials
        )

    @property
    def series_prefixes(self) -> list[str]:
        return [s.strip().upper() for s in self.enabled_series_prefixes.split(",") if s.strip()]

    def public_view(self) -> dict:
        """Settings safe to expose to the UI (no secrets)."""
        return {
            "kalshi_env": self.kalshi_env.value,
            "kalshi_credentials_configured": self.has_kalshi_credentials,
            "execution_mode": self.execution_mode.value,
            "live_trading_armed": self.live_trading_armed,
            "live_execution_permitted_by_config": self.live_execution_permitted_by_config,
            "bankroll": str(self.bankroll),
            "risk": {
                "max_trade_risk_pct": str(self.max_trade_risk_pct),
                "max_open_risk_pct": str(self.max_open_risk_pct),
                "max_daily_loss_pct": str(self.max_daily_loss_pct),
                "max_drawdown_pct": str(self.max_drawdown_pct),
                "max_event_risk_pct": str(self.max_event_risk_pct),
                "max_category_risk_pct": str(self.max_category_risk_pct),
                "kelly_fraction": str(self.kelly_fraction),
                "trade_cooldown_after_loss_sec": self.trade_cooldown_after_loss_sec,
                "max_trades_per_day": self.max_trades_per_day,
            },
            "thresholds": {
                "min_conservative_edge": str(self.min_conservative_edge),
                "min_net_roi": str(self.min_net_roi),
                "strong_conservative_edge": str(self.strong_conservative_edge),
                "strong_net_roi": str(self.strong_net_roi),
                "max_spread": str(self.max_spread),
                "min_top_depth": str(self.min_top_depth),
                "recommendation_ttl_sec": self.recommendation_ttl_sec,
            },
            "providers": {
                "fred_configured": self.fred_api_key is not None,
                "llm_configured": bool(self.llm_provider and self.llm_api_key),
                "ntfy_configured": bool(self.ntfy_topic_url),
            },
            "series_prefixes": self.series_prefixes,
            "admin_token_configured": self.admin_token is not None,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
