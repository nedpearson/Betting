"""Orchestrated Multi-Agent Intelligence System.

Initializes, wires, and manages all 16 specialized agents in Betting Intelligence OS.
"""

from __future__ import annotations

from typing import Any

from ..config import Settings, get_settings
from ..db import Database
from ..events import EventBus
from ..external.crypto import CryptoIntelligenceEngine
from ..external.economic import EconomicIntelligenceEngine
from ..external.news import NewsVerificationEngine
from ..external.sports import SportsIntelligenceEngine
from ..external.weather import WeatherIntelligenceEngine
from ..health import HealthRegistry
from ..kalshi.client import KalshiRestClient, KalshiWsClient
from ..orderbook import MarketOrderBook
from .auditors import BehavioralRiskAgent, ModelValidationAgent, SystemReliabilityAgent
from .cio import ChiefInvestmentOfficerAgent
from .discovery import MarketDiscoveryAgent
from .domain_agents import (
    CryptoIntelligenceAgent,
    EconomicIntelligenceAgent,
    NewsVerificationAgent,
    SportsIntelligenceAgent,
    WeatherIntelligenceAgent,
)
from .ev_analyst import ExpectedValueAnalystAgent
from .execution_advisor import TradeExecutionAdvisorAgent
from .forecaster import QuantitativeForecastingAgent
from .microstructure import MarketMicrostructureAgent
from .monitor import LiveMarketMonitorAgent
from .risk_manager import PortfolioRiskManagerAgent


class AgentSystem:
    def __init__(
        self,
        bus: EventBus,
        db: Database,
        rest_client: KalshiRestClient,
        health_registry: HealthRegistry,
        weather_engine: WeatherIntelligenceEngine,
        crypto_engine: CryptoIntelligenceEngine,
        sports_engine: SportsIntelligenceEngine,
        economic_engine: EconomicIntelligenceEngine,
        news_engine: NewsVerificationEngine,
        settings: Settings | None = None,
    ):
        self.settings = settings or get_settings()
        self.bus = bus
        self.db = db
        self.rest = rest_client
        self.health_registry = health_registry
        self.books: dict[str, MarketOrderBook] = {}

        # 1. Market Discovery
        self.discovery = MarketDiscoveryAgent(bus=bus, rest_client=rest_client, db=db, books=self.books, settings=self.settings)

        # 2. Live Market Monitor
        self.monitor = LiveMarketMonitorAgent(bus=bus, rest_client=rest_client, db=db, books=self.books, settings=self.settings)

        # 3. Sports Intelligence
        self.sports = SportsIntelligenceAgent(bus=bus, engine=sports_engine)

        # 4. Crypto Intelligence
        self.crypto = CryptoIntelligenceAgent(bus=bus, engine=crypto_engine)

        # 5. Economic Intelligence
        self.economic = EconomicIntelligenceAgent(bus=bus, engine=economic_engine)

        # 6. Weather Intelligence
        self.weather = WeatherIntelligenceAgent(bus=bus, engine=weather_engine)

        # 7. News Verification
        self.news = NewsVerificationAgent(bus=bus, engine=news_engine)

        # 8. Quantitative Forecasting
        self.forecaster = QuantitativeForecastingAgent(
            bus=bus,
            db=db,
            books=self.books,
            weather_engine=weather_engine,
            crypto_engine=crypto_engine,
            sports_engine=sports_engine,
        )

        # 9. Market Microstructure
        self.microstructure = MarketMicrostructureAgent(bus=bus, books=self.books, settings=self.settings)

        # 10. Expected Value Analyst
        self.ev_analyst = ExpectedValueAnalystAgent(bus=bus, books=self.books, settings=self.settings)

        # 11. Portfolio Risk Manager (VETO POWER)
        self.risk_manager = PortfolioRiskManagerAgent(bus=bus, db=db, settings=self.settings)

        # 12. Trade Execution Advisor
        self.execution = TradeExecutionAdvisorAgent(
            bus=bus,
            db=db,
            rest_client=rest_client,
            books=self.books,
            settings=self.settings,
        )

        # 13. Model Validation
        self.validation = ModelValidationAgent(bus=bus, db=db)

        # 14. Behavioral Risk Analyst
        self.behavioral_risk = BehavioralRiskAgent(bus=bus, settings=self.settings)

        # 15. System Reliability
        self.reliability = SystemReliabilityAgent(bus=bus, health_registry=health_registry)

        # 16. Chief Investment Officer
        self.cio = ChiefInvestmentOfficerAgent(
            bus=bus,
            db=db,
            books=self.books,
            forecaster=self.forecaster,
            microstructure=self.microstructure,
            ev_analyst=self.ev_analyst,
            risk_manager=self.risk_manager,
            behavioral_risk=self.behavioral_risk,
            settings=self.settings,
        )

        self.agents = [
            self.discovery,
            self.monitor,
            self.sports,
            self.crypto,
            self.economic,
            self.weather,
            self.news,
            self.forecaster,
            self.microstructure,
            self.ev_analyst,
            self.risk_manager,
            self.execution,
            self.validation,
            self.behavioral_risk,
            self.reliability,
            self.cio,
        ]

    def start(self) -> None:
        for agent in self.agents:
            if hasattr(agent, "start"):
                agent.start()

    async def stop(self) -> None:
        for agent in self.agents:
            if hasattr(agent, "stop"):
                try:
                    await agent.stop()
                except Exception:
                    pass

    def snapshot(self) -> list[dict[str, Any]]:
        return [a.snapshot() for a in self.agents]
