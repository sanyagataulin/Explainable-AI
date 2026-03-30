from app.infrastructure.gateways.news_gateway import DuckDuckGoNewsGateway


async def test_duckduckgo_gateway_normalizes_results() -> None:
    gateway = DuckDuckGoNewsGateway()

    def fake_search_sync(query: str, max_results: int) -> list[dict[str, str]]:
        assert query == "technology sector outlook latest"
        assert max_results == 3
        return [
            {"title": "Headline", "url": "https://example.com", "body": "Summary"},
            {"title": "No body", "url": "https://example.org", "content": "Fallback content"},
        ]

    gateway._search_sync = fake_search_sync  # type: ignore[method-assign]

    result = await gateway.search_finance_news("technology sector outlook latest", max_results=3)

    assert result == [
        {"title": "Headline", "url": "https://example.com", "content": "Summary"},
        {"title": "No body", "url": "https://example.org", "content": "Fallback content"},
    ]


async def test_duckduckgo_gateway_returns_empty_on_errors() -> None:
    gateway = DuckDuckGoNewsGateway()

    def fake_search_sync(query: str, max_results: int) -> list[dict[str, str]]:
        raise RuntimeError("network error")

    gateway._search_sync = fake_search_sync  # type: ignore[method-assign]

    result = await gateway.search_finance_news("technology", max_results=2)

    assert result == []
