"""Production Kalshi REST and WebSocket gateway.

- Token-bucket rate limiting to stay strictly within Basic/Advanced API limits.
- Public market data functions work seamlessly without authentication.
- Authenticated requests are signed automatically when credentials are provided.
- WebSocket client maintains live books, recovers from disconnects with exponential backoff,
  and notifies the event bus if gaps occur.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import UTC, datetime
from typing import Any

import httpx
import websockets

from ..config import Settings, get_settings
from ..events import BOOK_STALE, BOOK_UPDATED, FEED_STATUS, MARKET_LIFECYCLE, TRADE_PRINT, Event, EventBus
from ..health import FeedHealth, FeedState
from ..money import D, PriceGrid
from ..orderbook import MarketOrderBook
from .auth import KalshiSigner

log = logging.getLogger("boi.kalshi")


class TokenBucket:
    def __init__(self, rate_per_sec: float, burst: float | None = None):
        self.rate = rate_per_sec
        self.capacity = burst if burst is not None else rate_per_sec * 2.0
        self.tokens = self.capacity
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.last_update = now
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return
                wait_time = (tokens - self.tokens) / self.rate
                await asyncio.sleep(wait_time)


class KalshiRestClient:
    def __init__(self, settings: Settings | None = None, health: FeedHealth | None = None):
        self.settings = settings or get_settings()
        self.base_url = self.settings.kalshi_rest_url
        self.read_bucket = TokenBucket(self.settings.kalshi_rest_read_per_sec)
        self.write_bucket = TokenBucket(self.settings.kalshi_rest_write_per_sec)
        self._http = httpx.AsyncClient(timeout=15.0)
        self.signer: KalshiSigner | None = None
        self.health = health or FeedHealth(
            name="kalshi_rest",
            description="Kalshi Production REST API",
            stale_after_sec=60.0,
            transport="rest",
            licensing_note="CFTC-regulated exchange official API",
            settlement_grade=True,
        )

        pem = self.settings.load_private_key_pem()
        if self.settings.kalshi_api_key_id and pem:
            try:
                self.signer = KalshiSigner(self.settings.kalshi_api_key_id, pem)
                log.info("Kalshi signer initialized for key %s", self.settings.kalshi_api_key_id)
            except Exception as e:
                log.error("Failed to load Kalshi private key: %s", e)

    async def close(self) -> None:
        await self._http.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        json_body: dict | None = None,
        auth_required: bool = False,
    ) -> dict[str, Any]:
        if method.upper() in ("GET", "HEAD"):
            await self.read_bucket.acquire(1.0)
        else:
            await self.write_bucket.acquire(1.0)

        url = f"{self.base_url}{path}"
        headers = {"Accept": "application/json", "User-Agent": "BettingIntelligenceOS/0.1"}

        if self.signer is not None:
            # Always sign if credentials exist, or required
            auth_headers = self.signer.sign_headers(method, f"/trade-api/v2{path}")
            headers.update(auth_headers)
        elif auth_required:
            raise PermissionError("authenticated request requires Kalshi API key and private key")

        t0 = time.monotonic()
        try:
            resp = await self._http.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers=headers,
            )
            lat_ms = (time.monotonic() - t0) * 1000
            if resp.status_code >= 400:
                err_text = resp.text[:400]
                self.health.mark_error(f"HTTP {resp.status_code}: {err_text}")
                resp.raise_for_status()
            data = resp.json()
            self.health.mark_ok(latency_ms=lat_ms)
            return data
        except Exception as e:
            if not isinstance(e, httpx.HTTPStatusError):
                self.health.mark_error(str(e))
            raise

    # --- Public Market Data ---
    async def get_exchange_status(self) -> dict:
        return await self._request("GET", "/exchange/status")

    async def get_markets(
        self,
        status: str = "open",
        limit: int = 1000,
        cursor: str | None = None,
        event_ticker: str | None = None,
        series_ticker: str | None = None,
        mve_filter: str = "exclude",
    ) -> dict:
        params: dict[str, Any] = {"status": status, "limit": limit, "mve_filter": mve_filter}
        if cursor:
            params["cursor"] = cursor
        if event_ticker:
            params["event_ticker"] = event_ticker
        if series_ticker:
            params["series_ticker"] = series_ticker
        return await self._request("GET", "/markets", params=params)

    async def get_market(self, ticker: str) -> dict:
        return await self._request("GET", f"/markets/{ticker}")

    async def get_market_orderbook(self, ticker: str, depth: int = 50) -> dict:
        return await self._request("GET", f"/markets/{ticker}/orderbook", params={"depth": depth})

    async def get_series(self, ticker: str) -> dict:
        return await self._request("GET", f"/series/{ticker}")

    async def get_series_list(self, category: str | None = None) -> dict:
        params = {"category": category} if category else None
        return await self._request("GET", "/series", params=params)

    async def get_events(self, status: str = "open", limit: int = 200, cursor: str | None = None) -> dict:
        params: dict[str, Any] = {"status": status, "limit": limit}
        if cursor:
            params["cursor"] = cursor
        return await self._request("GET", "/events", params=params)

    async def get_trades(self, ticker: str | None = None, limit: int = 100) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if ticker:
            params["ticker"] = ticker
        return await self._request("GET", "/markets/trades", params=params)

    async def get_live_data(self, milestone_id: str) -> dict:
        return await self._request("GET", f"/live_data/milestone/{milestone_id}")

    # --- Authenticated Endpoints ---
    async def get_balance(self) -> dict:
        return await self._request("GET", "/portfolio/balance", auth_required=True)

    async def get_positions(self, settlement_status: str = "unsettled", limit: int = 100) -> dict:
        return await self._request(
            "GET",
            "/portfolio/positions",
            params={"settlement_status": settlement_status, "limit": limit},
            auth_required=True,
        )

    async def get_fills(self, limit: int = 100) -> dict:
        return await self._request("GET", "/portfolio/fills", params={"limit": limit}, auth_required=True)

    async def get_orders(self, status: str = "resting") -> dict:
        return await self._request("GET", "/portfolio/orders", params={"status": status}, auth_required=True)

    async def create_order_v2(self, payload: dict) -> dict:
        return await self._request("POST", "/portfolio/events/orders", json_body=payload, auth_required=True)

    async def cancel_order_v2(self, order_id: str, market_ticker: str) -> dict:
        return await self._request(
            "DELETE",
            f"/portfolio/orders/{order_id}",
            params={"market_ticker": market_ticker},
            auth_required=True,
        )

    async def cancel_all_orders(self) -> dict:
        return await self._request("DELETE", "/portfolio/orders", auth_required=True)


class KalshiWsClient:
    """Manages real-time WebSocket connection to Kalshi with automatic reconnects and snapshot sync."""

    def __init__(
        self,
        books: dict[str, MarketOrderBook],
        bus: EventBus,
        rest_client: KalshiRestClient,
        settings: Settings | None = None,
        health: FeedHealth | None = None,
    ):
        self.books = books
        self.bus = bus
        self.rest = rest_client
        self.settings = settings or get_settings()
        self.ws_url = self.settings.kalshi_ws_url
        self.subscribed_tickers: set[str] = set()
        self.health = health or FeedHealth(
            name="kalshi_ws",
            description="Kalshi WebSocket Real-Time Stream",
            stale_after_sec=15.0,
            transport="ws",
            licensing_note="Official authenticated WebSocket feed",
            settlement_grade=True,
        )
        self._running = False
        self._task: asyncio.Task | None = None
        self._cmd_id = 1
        self._ws: Any = None

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._run_loop(), name="kalshi-ws")

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            await self._ws.close()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def set_subscribed_markets(self, tickers: list[str]) -> None:
        self.subscribed_tickers = set(tickers[: self.settings.max_streamed_markets])

    async def _run_loop(self) -> None:
        backoff = 1.0
        while self._running:
            if not self.rest.signer:
                # WebSocket requires authentication headers during handshake
                self.health.mark_disconnected("No Kalshi API credentials configured for WS")
                await asyncio.sleep(5.0)
                continue

            try:
                headers = self.rest.signer.ws_handshake_headers()
                log.info("Connecting to Kalshi WebSocket: %s", self.ws_url)
                async with websockets.connect(
                    self.ws_url,
                    additional_headers=headers,
                    ping_interval=20,
                    ping_timeout=10,
                ) as ws:
                    self._ws = ws
                    self.health.mark_ok()
                    backoff = 1.0
                    log.info("Connected to Kalshi WebSocket")

                    # Subscribe to tickers
                    if self.subscribed_tickers:
                        await self._subscribe(list(self.subscribed_tickers))

                    async for raw_msg in ws:
                        if not self._running:
                            break
                        await self._handle_message(raw_msg)

            except Exception as e:
                log.warning("Kalshi WebSocket disconnected: %s. Reconnecting in %.1fs", e, backoff)
                self.health.mark_disconnected(str(e))
                # Mark affected books stale
                for ticker in list(self.subscribed_tickers):
                    if ticker in self.books:
                        await self.bus.publish(
                            Event(
                                type=BOOK_STALE,
                                source="kalshi_ws",
                                ticker=ticker,
                                payload={"reason": "ws_disconnect"},
                            )
                        )
                await asyncio.sleep(backoff)
                backoff = min(60.0, backoff * 1.5)

    async def _subscribe(self, tickers: list[str]) -> None:
        if not self._ws or not tickers:
            return
        cmd = {
            "id": self._cmd_id,
            "cmd": "subscribe",
            "params": {
                "channels": ["orderbook_delta", "ticker", "trade"],
                "market_tickers": tickers,
            },
        }
        self._cmd_id += 1
        await self._ws.send(json.dumps(cmd))
        log.info("Subscribed to %d markets on WS", len(tickers))

    async def _handle_message(self, raw: str) -> None:
        try:
            data = json.loads(raw)
        except Exception:
            return

        msg_type = data.get("type")
        msg = data.get("msg", {})
        ticker = msg.get("market_ticker")
        seq = data.get("seq", 0)
        sending_ts_ms = data.get("sending_ts_ms")
        source_ts = (
            datetime.fromtimestamp(sending_ts_ms / 1000.0, tz=UTC)
            if sending_ts_ms
            else None
        )

        lat_ms = (
            (datetime.now(UTC) - source_ts).total_seconds() * 1000.0
            if source_ts
            else None
        )
        self.health.mark_ok(source_ts=source_ts, latency_ms=lat_ms)

        if not ticker:
            return

        book = self.books.get(ticker)
        if not book:
            return

        if msg_type == "orderbook_snapshot":
            yes_raw = msg.get("yes_dollars", []) or msg.get("yes_dollars_fp", []) or msg.get("yes", [])
            no_raw = msg.get("no_dollars", []) or msg.get("no_dollars_fp", []) or msg.get("no", [])
            book.apply_snapshot(
                yes_bids_raw=yes_raw,
                no_bids_raw=no_raw,
                seq=seq,
                source_ts=source_ts,
                transport="ws",
            )
            await self.bus.publish(
                Event(
                    type=BOOK_UPDATED,
                    source="kalshi_ws",
                    ticker=ticker,
                    payload={"seq": seq, "type": "snapshot"},
                )
            )

        elif msg_type == "orderbook_delta":
            side = msg.get("side", "yes")
            price = msg.get("price_dollars")
            delta = msg.get("delta_fp")
            if price is not None and delta is not None:
                ok = book.apply_delta(
                    side=side,
                    price_raw=price,
                    delta_qty_raw=delta,
                    seq=seq,
                    source_ts=source_ts,
                )
                if not ok:
                    # Sequence gap! Mark stale and request fresh snapshot
                    log.warning("Sequence gap detected on %s (seq=%d). Requesting resync.", ticker, seq)
                    await self.bus.publish(
                        Event(
                            type=BOOK_STALE,
                            source="kalshi_ws",
                            ticker=ticker,
                            payload={"reason": "sequence_gap", "seq": seq},
                        )
                    )
                else:
                    await self.bus.publish(
                        Event(
                            type=BOOK_UPDATED,
                            source="kalshi_ws",
                            ticker=ticker,
                            payload={"seq": seq, "type": "delta"},
                        )
                    )

        elif msg_type == "trade":
            await self.bus.publish(
                Event(
                    type=TRADE_PRINT,
                    source="kalshi_ws",
                    ticker=ticker,
                    payload={
                        "price": msg.get("yes_price_dollars") or msg.get("price_dollars"),
                        "count": msg.get("count_fp"),
                        "side": msg.get("taker_outcome_side"),
                    },
                )
            )
