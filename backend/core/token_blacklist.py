import redis.asyncio as aioredis

from backend.core.config import get_settings


class TokenBlacklist:
    def __init__(self) -> None:
        s = get_settings()
        self.ttl = s.token_blacklist_ttl_seconds
        self.redis: aioredis.Redis = aioredis.from_url(s.redis_url)

    async def is_blacklisted(self, jti: str | None) -> bool:
        if not jti:
            return False
        exists = await self.redis.exists(self._key(jti))
        return bool(exists)

    async def add(self, jti: str | None) -> None:
        if not jti:
            return
        await self.redis.set(self._key(jti), 1, ex=self.ttl)

    def _key(self, jti: str) -> str:
        return f"jwt:blacklist:{jti}"


_blacklist = TokenBlacklist()


async def is_blacklisted(jti: str | None) -> bool:
    return await _blacklist.is_blacklisted(jti)


async def add_to_blacklist(jti: str | None) -> None:
    await _blacklist.add(jti)
