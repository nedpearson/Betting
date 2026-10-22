"""FastAPI web and streaming API for Betting Intelligence OS."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, SecretStr
from sqlalchemy import select

from .agents import AgentSystem
from .config import Settings, get_settings
from .db import Database, MarketRecord, OrderRecord, RecommendationRecord
from .events import EventBus
from .kalshi.auth import KalshiSigner
from .money import D

security_bearer = HTTPBearer(auto_error=False)


def create_app(
    agent_system: AgentSystem,
    bus: EventBus,
    db: Database,
    settings: Settings | None = None,
) -> FastAPI:
    cfg = settings or get_settings()
    app = FastAPI(
        title="Betting Intelligence OS",
        version="0.1.0",
        description="Institutional-Grade Real-Time AI Prediction and Trading Intelligence Platform for Kalshi",
    )

    origins = [o.strip() for o in cfg.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def verify_admin(creds: HTTPAuthorizationCredentials = Security(security_bearer)) -> bool:
        if not cfg.admin_token:
            return True
        if not creds or creds.credentials != cfg.admin_token.get_secret_value():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
        return True

    # ---------------------------------------------------------------- Endpoints

    @app.get("/api/health")
    async def get_health():
        return {
            "status": "online",
            "is_halted": agent_system.risk_manager.is_halted,
            "halt_reason": agent_system.risk_manager.halt_reason,
            "utc_time": datetime.now(UTC).isoformat(),
            "feeds": agent_system.health_registry.snapshot(),
        }

    @app.get("/api/settings")
    async def get_public_settings():
        return cfg.public_view()

    @app.get("/api/best_trade")
    async def get_best_live_trade():
        """Prominently displays BEST LIVE TRADE RIGHT NOW or explains why NO QUALIFIED TRADE AVAILABLE."""
        best = agent_system.cio.best_live_opportunity
        if best and best.status == "active":
            return {
                "available": True,
                "opportunity": best.payload,
                "created_at": best.created_at.isoformat(),
                "expires_at": best.expires_at.isoformat(),
                "status": "LIVE",
            }
        else:
            return {
                "available": False,
                "status": "NO QUALIFIED TRADE AVAILABLE",
                "reason": agent_system.cio.no_trade_reason,
                "checked_at": datetime.now(UTC).isoformat(),
            }

    @app.get("/api/opportunities")
    async def get_opportunities():
        """Leaderboard of active trade candidates ranked by conservative ROI."""
        recs = [r.payload for r in agent_system.cio.active_recommendations.values() if r.status == "active"]
        recs.sort(key=lambda r: float(r.get("net_roi", 0)), reverse=True)
        return {"count": len(recs), "opportunities": recs}

    @app.get("/api/markets")
    async def get_markets(limit: int = 200, category: str | None = None, ticker: str | None = None):
        """List tracked markets with executable prices, or return market detail if ticker specified."""
        if ticker:
            return await get_market_detail(ticker)

        async with db.session() as s:
            stmt = select(MarketRecord).limit(limit)
            res = await s.execute(stmt)
            markets = list(res.scalars().all())

        out = []
        for m in markets:
            if category and m.category != category:
                continue
            book = agent_system.books.get(m.ticker)
            snap = book.get_snapshot(max_age_sec=cfg.max_rest_book_age_sec) if book else None
            out.append({
                "ticker": m.ticker,
                "title": m.title,
                "yes_sub_title": m.yes_sub_title,
                "category": m.category,
                "status": m.status,
                "close_time": m.close_time.isoformat() if m.close_time else None,
                "yes_bid": str(snap.best_yes_bid) if snap and snap.best_yes_bid else None,
                "yes_ask": str(snap.best_yes_ask) if snap and snap.best_yes_ask else None,
                "spread": str(snap.spread) if snap and snap.spread else None,
                "is_stale": snap.is_stale if snap else True,
            })
        return {"count": len(out), "markets": out}

    @app.get("/api/market/{ticker}")
    async def get_market_detail(ticker: str):
        async with db.session() as s:
            rec = await s.get(MarketRecord, ticker)
            if not rec:
                raise HTTPException(status_code=404, detail="Market not found")

        book = agent_system.books.get(ticker)
        snap = book.get_snapshot(max_age_sec=cfg.max_rest_book_age_sec) if book else None
        forecast = agent_system.forecaster.latest_forecasts.get(ticker)

        return {
            "ticker": rec.ticker,
            "title": rec.title,
            "category": rec.category,
            "status": rec.status,
            "close_time": rec.close_time.isoformat() if rec.close_time else None,
            "orderbook": {
                "yes_bids": [(str(l.price), str(l.qty)) for l in (snap.yes_bids[:10] if snap else [])],
                "yes_asks": [(str(l.price), str(l.qty)) for l in (snap.yes_asks[:10] if snap else [])],
                "best_yes_bid": str(snap.best_yes_bid) if snap and snap.best_yes_bid else None,
                "best_yes_ask": str(snap.best_yes_ask) if snap and snap.best_yes_ask else None,
                "spread": str(snap.spread) if snap and snap.spread else None,
                "is_stale": snap.is_stale if snap else True,
            },
            "forecast": {
                "p_yes": forecast.p_yes,
                "p_low": forecast.p_low,
                "p_high": forecast.p_high,
                "model": forecast.model,
                "independence": forecast.independence,
                "inputs": forecast.inputs,
            } if forecast else None,
        }

    @app.get("/api/agents")
    async def get_agents():
        """Command Center status of all 16 specialized agents."""
        return {"agents": agent_system.snapshot()}

    @app.get("/api/portfolio")
    async def get_portfolio():
        """Bankroll, risk limits, open exposure, and P&L."""
        mids = {}
        for t, b in agent_system.books.items():
            snap = b.get_snapshot()
            if snap.mid_price:
                mids[t] = snap.mid_price

        # Update portfolio tracker
        from .portfolio import PortfolioTracker
        tracker = PortfolioTracker(db=db, settings=cfg)
        await tracker.reload_positions()
        res = tracker.mark_to_market(mids)

        # Reconcile with live Kalshi if credentials are authenticated
        if agent_system.rest and agent_system.rest.signer:
            try:
                bal = await agent_system.rest.get_balance()
                bal_cents = bal.get("balance", 0)
                port_cents = bal.get("portfolio_value", 0)
                cash_dlrs = Decimal(bal_cents) / Decimal(100)
                port_dlrs = Decimal(port_cents) / Decimal(100)
                total_dlrs = cash_dlrs + port_dlrs

                res["starting_bankroll"] = f"{total_dlrs:.2f}"
                res["available_cash"] = f"{cash_dlrs:.2f}"
                res["total_equity"] = f"{total_dlrs:.2f}"
                res["total_open_risk"] = f"{port_dlrs:.2f}"
                res["kalshi_connected"] = True

                pos_data = await agent_system.rest.get_positions()
                m_pos = pos_data.get("market_positions", [])
                if m_pos:
                    k_positions = []
                    for mp in m_pos:
                        pos_fp = mp.get("position_fp", "0")
                        cost = mp.get("market_exposure_dollars", "0")
                        pnl = mp.get("realized_pnl_dollars", "0")
                        k_positions.append({
                            "ticker": mp.get("ticker", ""),
                            "side": "yes",
                            "contracts": str(round(float(pos_fp), 2)),
                            "avg_entry": f"{float(cost):.2f}" if cost else "0.00",
                            "current_mid": None,
                            "unrealized_pnl": f"{float(pnl):.2f}",
                            "cost_basis": f"{float(cost):.2f}" if cost else "0.00",
                        })
                    res["open_positions_count"] = len(k_positions)
                    res["positions"] = k_positions
            except Exception as e:
                logger.warning("Could not sync live Kalshi portfolio: %s", e)

        return res

    @app.get("/api/calibration")
    async def get_calibration():
        """Model validation, Brier scores, and calibration statistics."""
        return await agent_system.validation.run_calibration_audit()

    @app.post("/api/orders")
    async def place_order(
        request: Request,
        _auth: bool = Depends(verify_admin),
    ):
        body = await request.json()
        ticker = body.get("ticker")
        side = body.get("side")
        contracts = Decimal(str(body.get("contracts", "1")))
        limit_price = Decimal(str(body.get("limit_price", "0.50")))

        if not ticker or side not in ("yes", "no"):
            raise HTTPException(status_code=400, detail="Invalid order parameters")

        order = await agent_system.execution.execute_order(
            ticker=ticker,
            side=side,
            contracts=contracts,
            limit_price=limit_price,
            recommendation_id=body.get("recommendation_id"),
        )
        return {
            "order_id": order.id,
            "status": order.status,
            "filled": order.filled,
            "avg_fill_price": order.avg_fill_price,
            "fees": order.fees,
        }

    @app.get("/api/kill_switch")
    async def get_kill_switch_status():
        return {
            "status": "HALTED" if agent_system.risk_manager.is_halted else "ACTIVE",
            "is_halted": agent_system.risk_manager.is_halted,
            "reason": agent_system.risk_manager.halt_reason,
            "time": datetime.now(UTC).isoformat(),
        }

    @app.post("/api/kill_switch")
    async def trigger_emergency_kill(
        _auth: bool = Depends(verify_admin),
    ):
        agent_system.risk_manager.trigger_safety_halt("Emergency Kill Switch triggered by operator")
        return {"status": "HALTED", "time": datetime.now(UTC).isoformat()}

    @app.post("/api/resume")
    @app.delete("/api/kill_switch")
    async def resume_trading(
        _auth: bool = Depends(verify_admin),
    ):
        agent_system.risk_manager.resume_trading()
        return {
            "status": "ACTIVE",
            "is_halted": False,
            "reason": "Trading resumed by operator; safety halt cleared",
            "time": datetime.now(UTC).isoformat(),
        }

    @app.get("/api/stream")
    async def sse_event_stream(request: Request):
        """Server-Sent Events stream for real-time frontend terminal updates."""
        q = bus.ui_subscribe()

        async def generator() -> AsyncGenerator[str, None]:
            try:
                # Send initial ping
                yield "event: connected\ndata: {}\n\n"
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        ev = await asyncio.wait_for(q.get(), timeout=20.0)
                        yield f"event: {ev['type']}\ndata: {json.dumps(ev)}\n\n"
                    except asyncio.TimeoutError:
                        yield "event: heartbeat\ndata: {}\n\n"
            finally:
                bus.ui_unsubscribe(q)

        return StreamingResponse(generator(), media_type="text/event-stream")

    @app.get("/api/settings/kalshi")
    async def get_kalshi_status():
        """Retrieve Kalshi connection status, masked key ID, and real balance if authenticated."""
        has_key = bool(agent_system.rest.signer)
        key_id = agent_system.rest.settings.kalshi_api_key_id
        masked = (key_id[:6] + "..." + key_id[-4:]) if key_id and len(key_id) > 10 else (key_id or "")
        balance = None
        if has_key:
            try:
                balance = await agent_system.rest.get_balance()
            except Exception as e:
                balance = {"error": str(e)}
        return {
            "connected": has_key,
            "key_id": masked,
            "balance": balance,
            "mode": cfg.execution_mode.value,
        }

    @app.post("/api/settings/kalshi")
    async def configure_kalshi(request: Request):
        """Verify and dynamically bind Kalshi API credentials."""
        body = await request.json()
        key_id = (body.get("key_id") or "").strip()
        private_key = (body.get("private_key") or "").strip()

        if not key_id or not private_key:
            raise HTTPException(status_code=400, detail="Key ID and Private Key are required")

        if "BEGIN" not in private_key:
            private_key_pem = f"-----BEGIN PRIVATE KEY-----\n{private_key}\n-----END PRIVATE KEY-----"
        else:
            private_key_pem = private_key

        try:
            signer = KalshiSigner(key_id=key_id, private_key_pem=private_key_pem)
            headers = signer.sign_headers("GET", "/trade-api/v2/portfolio/balance")
            url = f"{cfg.kalshi_rest_url}/portfolio/balance"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    balance_data = resp.json()
                    # Apply credentials in-memory
                    agent_system.rest.signer = signer
                    agent_system.rest.settings.kalshi_api_key_id = key_id
                    agent_system.rest.settings.kalshi_private_key_pem = SecretStr(private_key_pem)

                    # Persist key safely to kalshi_key.pem and update .env
                    try:
                        key_file = Path("kalshi_key.pem")
                        key_file.write_text(private_key_pem.strip() + "\n", encoding="utf-8")
                        env_file = Path(".env")
                        if env_file.exists():
                            env_lines = env_file.read_text(encoding="utf-8").splitlines()
                            updated_lines = []
                            for eline in env_lines:
                                if eline.startswith("BOI_KALSHI_KEY_ID="):
                                    updated_lines.append(f'BOI_KALSHI_KEY_ID="{key_id}"')
                                elif eline.startswith("BOI_KALSHI_PRIVATE_KEY_PATH="):
                                    updated_lines.append('BOI_KALSHI_PRIVATE_KEY_PATH="kalshi_key.pem"')
                                else:
                                    updated_lines.append(eline)
                            env_file.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
                    except Exception as persist_err:
                        logger.warning("Could not persist key to disk: %s", persist_err)

                    return {
                        "success": True,
                        "connected": True,
                        "key_id": key_id[:8] + "...",
                        "balance": balance_data.get("balance", 0),
                        "balance_dollars": str((balance_data.get("balance", 0) / 100.0) if "balance" in balance_data else "0.00"),
                        "message": "Kalshi account authenticated successfully!",
                    }
                else:
                    return {
                        "success": False,
                        "connected": False,
                        "status_code": resp.status_code,
                        "error": resp.text,
                        "message": f"Kalshi authentication failed ({resp.status_code}): {resp.text}",
                    }
        except Exception as e:
            return {
                "success": False,
                "connected": False,
                "error": str(e),
                "message": f"Cryptographic validation error: {e}",
            }

    return app
