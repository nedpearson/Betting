# Betting Intelligence OS (BOI)

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An institutional-grade, real-time quantitative trading intelligence engine and decision-support operating system engineered specifically for **Kalshi** binary prediction markets.

Combining the mathematical rigor of **Goldman Sachs** risk management, **Renaissance Technologies** statistical modeling, and **Two Sigma** alternative data ingestion, the Betting Intelligence OS evaluates contracts faster than manual research, computes defensible probability distributions, and tells you exactly when—and how much—to trade.

---

## Key Pillars & Institutional Principles

### 1. "LIVE means LIVE" (Zero Synthetic Data)
- **100% Real Production Feeds:** Connects directly to Kalshi's live exchange API (`api.elections.kalshi.com`), Open-Meteo multi-model ensembles, Coinbase spot ticks, and official government data (NWS, FRED).
- **Strict Time-To-Live (TTL):** Every feed tracks its age in seconds. If a source exceeds its staleness threshold, quoting and evaluation in that category are immediately vetoed.
- **Truthful Status Display:** If no contract clears conservative edge thresholds after fees and slippage, the system unambiguously outputs:
  ```json
  {
    "status": "NO QUALIFIED TRADE AVAILABLE",
    "reason": "No live market currently clears conservative edge thresholds after fees and slippage."
  }
  ```

### 2. Exact Quadratic Fee & EV Mathematics
- **Exact Kalshi Quadratic Fees:** Models the official non-linear taker fee formula:
  $$\text{Fee}(C, P) = \left\lceil M \times 0.07 \times C \times P \times (1 - P) \right\rceil$$
  rounded up to the nearest cent ($0.01) for retail or $0.0001 for direct members.
- **Conservative Probability ($p_{\text{conservative}}$):** Evaluates all trades at the 95% lower confidence bound ($p - 1.96 \times \text{SE}$) to prevent model overconfidence.
- **Fractional Kelly Capital Allocation:** Sizes trades using conservative quarter-Kelly ($f^* = 0.25$), quantized to discrete contracts.
- **Hard Portfolio Risk Caps:** Strict 1.0% max risk per trade ($5.00 on $500), 10.0% max total open risk ($50.00), 3.0% daily loss circuit breaker, and 10.0% peak-to-trough drawdown halt.

### 3. Triple-Lock Live Execution Safety Gating
Live order routing with real funds is **strictly opt-in** and disabled by default (`BOI_MODE=intelligence_only`). Live order submission requires satisfying all three independent safety locks concurrently:
1. **Lock 1:** Configuration flag `BOI_MODE=live`.
2. **Lock 2:** Cryptographic confirmation passphrase `BOI_LIVE_EXECUTION_CONFIRMED=I_UNDERSTAND_REAL_MONEY_IS_AT_RISK`.
3. **Lock 3:** Signed Ed25519/RSA-PSS API credentials and valid Admin Bearer token.

---

## 16-Agent Coordinated Architecture

```
                          ┌─────────────────────────┐
                          │   Live Event Ingestion  │
                          └───────────┬─────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     │                                │                                │
┌────▼────────────────┐      ┌────────▼──────────────┐      ┌──────────▼──────────┐
│ 01: Market Discovery│      │ 02: Live Book Monitor │      │ 09: Microstructure  │
└────┬────────────────┘      └────────┬──────────────┘      └──────────┬──────────┘
     └────────────────────────────────┼────────────────────────────────┘
                                      │
         ┌────────────────────────────▼────────────────────────────┐
         │         Domain Intelligence Agents (03-07)              │
         │  03: Sports (Stern Brownian)  •  04: Crypto (EWMA Vol)  │
         │  05: Macro (FRED / BLS)       •  06: Weather Ensemble   │
         │  07: Breaking News Wire (SHA-256 Provenance)            │
         └────────────────────────────┬────────────────────────────┘
                                      │
                 ┌────────────────────▼────────────────────┐
                 │    08: Quantitative Forecaster (ML)     │
                 └────────────────────┬────────────────────┘
                                      │
                 ┌────────────────────▼────────────────────┐
                 │       10: Expected Value Analyst        │
                 └────────────────────┬────────────────────┘
                                      │
                 ┌────────────────────▼────────────────────┐
                 │ 11: Portfolio Risk Manager [VETO POWER] │
                 └────────────────────┬────────────────────┘
                                      │
                 ┌────────────────────▼────────────────────┐
                 │    12: Execution Advisor (Paper/Live)   │
                 └────────────────────┬────────────────────┘
                                      │
                 ┌────────────────────▼────────────────────┐
                 │     Continuous Audit & CIO (13-16)      │
                 │ 13: Model Validation • 14: Behavioral   │
                 │ 15: System Reliability • 16: CIO Lead   │
                 └─────────────────────────────────────────┘
```

---

## Project Structure

```
Betting/
├── backend/                  # Python 3.12+ Quantitative Backend
│   ├── boi/                  # Core package
│   │   ├── agents/           # 16 Coordinated deterministic & quant agents
│   │   ├── external/         # Independent external domain feeds (Weather, Crypto, Sports, Macro, News)
│   │   ├── kalshi/           # REST & WebSocket client with Ed25519 / RSA-PSS signing
│   │   ├── api.py            # FastAPI REST & SSE streaming server
│   │   ├── backtest.py       # Zero look-ahead walk-forward backtest simulator
│   │   ├── config.py         # Pydantic Settings & Triple-Lock validation
│   │   ├── db.py             # SQLAlchemy 2.0 async database models
│   │   ├── ev.py             # Walk-book, quadratic fees, Kelly sizing, net EV
│   │   ├── events.py         # Asynchronous typed event bus
│   │   ├── fees.py           # Exact Kalshi quadratic taker/maker formulas
│   │   ├── health.py         # Feed health & TTL telemetry tracker
│   │   ├── main.py           # Unified CLI ('scan' and 'serve')
│   │   ├── money.py          # Exact Decimal quantization & PriceGrid
│   │   ├── orderbook.py      # Binary depth engine & derived ask calculations
│   │   ├── portfolio.py      # Real-time bankroll, cost basis, and P&L ledger
│   │   └── stats.py          # Brier scores, log-loss, normal CDF/PPF, ECE
│   ├── tests/                # 20 unit and live integration tests
│   └── pyproject.toml        # Hatchling build & dependencies
├── frontend/                 # Wall Street-Grade Web Terminal
│   ├── src/
│   │   ├── components/       # BestTradeCard, MarketBrowser, DomainViews, AgentCommandCenter, etc.
│   │   ├── api.ts            # REST client & Server-Sent Events subscriber
│   │   ├── types.ts          # TypeScript type definitions
│   │   └── App.tsx           # Terminal workspace with live tab navigation
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md       # High-level architecture specification
│   └── AUDIT.md              # Formal Institutional Trading Audit report
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

---

## Quick Start

### 1. Environment Setup

Clone the repository and copy the environment configuration:
```bash
git clone https://github.com/nedpearson/Betting.git
cd Betting
cp .env.example .env
```

Set up the Python backend virtual environment:
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -e .
```

Set up the React frontend:
```bash
cd ../frontend
npm install
```

---

### 2. Run a One-Shot Live Market Scan (CLI)

Scan active Kalshi markets, compute external probabilities, and output the #1 live opportunity to the console:
```bash
# From backend directory with venv activated:
python -m boi.main scan
```

Sample output:
```
================================================================================
BETTING INTELLIGENCE OS - KALSHI LIVE DECISION ENGINE
================================================================================
Mode: Intelligence Only | Bankroll: $500.00 | Taker Fee: Exact Quadratic
Market Scan: 1000 open markets fetched from Kalshi Production REST API

NO QUALIFIED TRADE AVAILABLE
Reason: No live market currently clears conservative edge thresholds after fees and slippage.
Checked at: 2026-10-21 21:40:55 UTC
```

---

### 3. Run the Live Backend Engine & Web Terminal

**Start the Backend Server (Port 8000):**
```bash
cd backend
python -m boi.main serve --port 8000
```

**Start the Web Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173` to access the Wall Street-grade trading terminal.

---

### 4. Running the Automated Test Suite

Run the full pytest suite (including unit tests for exact math, fees, Kelly sizing, order book sequence gaps, risk vetoes, and live API smoke tests):
```bash
cd backend
python -m pytest -v
```
All 20 tests pass out of the box with zero errors.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/best_trade` | Returns the single #1 highest-conviction live opportunity or `NO QUALIFIED TRADE AVAILABLE`. |
| `GET` | `/api/opportunities` | Returns ranked secondary candidate opportunities. |
| `GET` | `/api/markets` | Returns active Kalshi contracts with filter options (`category`). |
| `GET` | `/api/market/{ticker}` | Returns order book depth, ticks, and derived executable asks for a contract. |
| `GET` | `/api/portfolio` | Real-time bankroll, cost basis, open positions, unrealized/realized P&L. |
| `GET` | `/api/agents` | Status, decision counts, error logs, and metrics for all 16 agents. |
| `GET` | `/api/health` | Live telemetry, TTL countdowns, and latency for all external data feeds. |
| `GET` | `/api/calibration` | Brier score, Expected Calibration Error (ECE), and log-loss report. |
| `POST` | `/api/orders` | Submit paper or live orders (protected by Triple-Lock and risk governor). |
| `POST` | `/api/kill_switch` | Immediate emergency shutdown and trading halt. |
| `GET` | `/api/stream` | Server-Sent Events (SSE) live push stream for recommendations and fills. |

---

## Institutional Trading Audit

For full technical specifications, risk equations, and regulatory compliance details, refer to:
- [Institutional Trading Audit (docs/AUDIT.md)](docs/AUDIT.md)
- [System Architecture (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
