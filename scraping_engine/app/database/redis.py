import json
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    try:
        client = await get_redis()
        val = await client.get(key)
        return json.loads(val) if val else None
    except Exception as exc:
        logger.warning("Redis GET failed for key=%s: %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    try:
        client = await get_redis()
        await client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as exc:
        logger.warning("Redis SET failed for key=%s: %s", key, exc)
        return False


async def cache_delete(key: str) -> bool:
    try:
        client = await get_redis()
        await client.delete(key)
        return True
    except Exception as exc:
        logger.warning("Redis DELETE failed for key=%s: %s", key, exc)
        return False


async def cache_delete_pattern(pattern: str) -> int:
    try:
        client = await get_redis()
        keys = await client.keys(pattern)
        if keys:
            return await client.delete(*keys)
        return 0
    except Exception as exc:
        logger.warning("Redis pattern delete failed for pattern=%s: %s", pattern, exc)
        return 0
