from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis


class RedisCache:
    def __init__(self, redis_url: str) -> None:
        self._client = Redis.from_url(redis_url, decode_responses=True)

    async def get_json(self, key: str) -> dict[str, Any] | None:
        value = await self._client.get(key)
        if value is None:
            return None
        return json.loads(value)

    async def set_json(self, key: str, value: dict[str, Any], ttl_sec: int) -> None:
        await self._client.set(key, json.dumps(value), ex=ttl_sec)

    async def close(self) -> None:
        await self._client.aclose()
