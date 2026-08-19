"""
Cache service with Redis backend and in-memory fallback.

Used for caching search results and provider responses to respect
rate limits and avoid redundant API calls.
"""

import json
import time
import hashlib
import logging
from typing import Optional, Any, Dict

logger = logging.getLogger("job_discovery.cache")


class InMemoryCache:
    """Simple TTL-aware in-memory cache for development environments."""

    def __init__(self, max_entries: int = 1000):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._max_entries = max_entries

    async def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            del self._store[key]
            return None
        return entry["value"]

    async def set(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
        # Evict oldest if at capacity
        if len(self._store) >= self._max_entries:
            oldest_key = min(self._store, key=lambda k: self._store[k]["expires_at"])
            del self._store[oldest_key]
        self._store[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        result = await self.get(key)
        return result is not None

    async def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)


class CacheService:
    """
    Cache abstraction layer. Uses Redis if available, falls back to in-memory.

    Cache keys are namespaced and hashed to prevent collisions.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._redis = None
        self._memory_cache = InMemoryCache()
        self._using_redis = False

        if redis_url:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_timeout=5.0,
                    retry_on_timeout=True,
                )
                self._using_redis = True
                logger.info("Cache: Using Redis backend")
            except Exception as e:
                logger.warning(f"Cache: Redis unavailable ({e}), using in-memory fallback")
        else:
            logger.info("Cache: No Redis URL configured, using in-memory fallback")

    @staticmethod
    def _make_key(namespace: str, params: Dict[str, Any]) -> str:
        """Generate a deterministic cache key from namespace + params."""
        sorted_params = json.dumps(params, sort_keys=True, default=str)
        param_hash = hashlib.md5(sorted_params.encode()).hexdigest()
        return f"jd:{namespace}:{param_hash}"

    async def get_cached(self, namespace: str, params: Dict[str, Any]) -> Optional[Any]:
        """Retrieve cached data, return None on miss."""
        key = self._make_key(namespace, params)
        try:
            if self._using_redis and self._redis:
                data = await self._redis.get(key)
            else:
                data = await self._memory_cache.get(key)

            if data:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(data)
            logger.debug(f"Cache MISS: {key}")
            return None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    async def set_cached(
        self,
        namespace: str,
        params: Dict[str, Any],
        data: Any,
        ttl_seconds: int = 3600,
    ) -> None:
        """Store data in cache with TTL."""
        key = self._make_key(namespace, params)
        try:
            serialized = json.dumps(data, default=str)
            if self._using_redis and self._redis:
                await self._redis.setex(key, ttl_seconds, serialized)
            else:
                await self._memory_cache.set(key, serialized, ttl_seconds)
            logger.debug(f"Cache SET: {key} (TTL={ttl_seconds}s)")
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    async def invalidate(self, namespace: str, params: Dict[str, Any]) -> None:
        """Remove a specific cache entry."""
        key = self._make_key(namespace, params)
        try:
            if self._using_redis and self._redis:
                await self._redis.delete(key)
            else:
                await self._memory_cache.delete(key)
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")

    @property
    def backend(self) -> str:
        return "redis" if self._using_redis else "in-memory"

    async def health_check(self) -> bool:
        """Check if cache backend is reachable."""
        if self._using_redis and self._redis:
            try:
                await self._redis.ping()
                return True
            except Exception:
                return False
        return True  # In-memory is always available
