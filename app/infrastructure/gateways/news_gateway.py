from __future__ import annotations

import asyncio
from typing import Any

from duckduckgo_search import DDGS

from app.application.ports.gateways import NewsGateway


class DuckDuckGoNewsGateway(NewsGateway):
    def _search_sync(self, query: str, max_results: int) -> list[dict[str, Any]]:
        with DDGS() as client:
            return list(client.news(query, max_results=max_results))

    async def search_finance_news(self, query: str, max_results: int = 5) -> list[dict[str, str]]:
        try:
            response = await asyncio.to_thread(self._search_sync, query, max_results)
        except Exception:
            return []

        output: list[dict[str, str]] = []
        for item in response:
            output.append(
                {
                    "title": str(item.get("title") or ""),
                    "url": str(item.get("url") or ""),
                    "content": str(item.get("body") or item.get("content") or ""),
                }
            )
        return output
