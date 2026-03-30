from __future__ import annotations

from typing import Any

import yfinance as yf

from app.core.settings import Settings
from app.domain.ports.repositories import MarketDataPort
from app.infrastructure.gateways.redis_cache import RedisCache


class YFinanceMarketDataGateway(MarketDataPort):
    def __init__(self, cache: RedisCache, settings: Settings) -> None:
        self._cache = cache
        self._ttl_sec = settings.market_data_ttl_sec

    async def get_company_metrics(self, ticker: str) -> dict[str, float | str | None]:
        cache_key = f"market:{ticker.upper()}"
        cached = await self._cache.get_json(cache_key)
        if cached is not None:
            return {
                key: (
                    float(value)
                    if isinstance(value, int)
                    else value
                    if isinstance(value, (float, str)) or value is None
                    else str(value)
                )
                for key, value in cached.items()
            }

        info = yf.Ticker(ticker).info
        payload: dict[str, Any] = {
            "ticker": ticker.upper(),
            "company_name": info.get("longName") or info.get("shortName") or ticker.upper(),
            "price": info.get("currentPrice"),
            "pe": info.get("trailingPE"),
            "ev_ebitda": info.get("enterpriseToEbitda"),
            "revenue_growth": info.get("revenueGrowth"),
            "debt_to_equity": info.get("debtToEquity"),
            "sector": info.get("sector"),
        }
        await self._cache.set_json(cache_key, payload, ttl_sec=self._ttl_sec)
        return {
            key: (
                float(value)
                if isinstance(value, int)
                else value
                if isinstance(value, (float, str)) or value is None
                else str(value)
            )
            for key, value in payload.items()
        }
