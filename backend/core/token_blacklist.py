from typing import Optional

import redis.asyncio as aioredis

from backend.core.config import get_settings


class TokenBlacklist:
    def __init__(self) -> None:
        s = get_settings()
        self.ttl = s.token_blacklist_ttl_seconds
        self.redis: Optional[aioredis.Redis] = (
            aioredis.from_url(s.redis_url) if s.redis_url else None
        )
        self.memory: set[str] = set()

    async def is_blacklisted(self, jti: str | None) -> bool:
        if not jti:
            return False
        if self.redis is None:
            return jti in self.memory
        try:
            exists = await self.redis.exists(self._key(jti))
            return bool(exists)
        except Exception as e:
            print(f"[token_blacklist] redis check failed: {e}; using memory fallback")
            return jti in self.memory

    async def add(self, jti: str | None) -> None:
        if not jti:
            return
        if self.redis is None:
            self.memory.add(jti)
            return
        try:
            await self.redis.set(self._key(jti), 1, ex=self.ttl)
        except Exception as e:
            print(f"[token_blacklist] redis set failed: {e}; using memory fallback")
            self.memory.add(jti)

    def _key(self, jti: str) -> str:
        return f"jwt:blacklist:{jti}"


_blacklist = TokenBlacklist()


async def is_blacklisted(jti: str | None) -> bool:
    return await _blacklist.is_blacklisted(jti)


async def add_to_blacklist(jti: str | None) -> None:
    await _blacklist.add(jti)
