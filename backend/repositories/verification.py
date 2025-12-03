from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import EmailVerification
from backend.repositories.base import CRUDRepository


class EmailVerificationRepository(CRUDRepository[EmailVerification]):
    model = EmailVerification

    async def create_code(
        self, *, user_id: int, code: str, ttl_minutes: int = 15
    ) -> EmailVerification:
        ver = EmailVerification(
            user_id=user_id,
            code=code,
            expires_at=datetime.utcnow() + timedelta(minutes=ttl_minutes),
        )
        return await self.create(ver)

    async def get_valid_code(
        self, *, user_id: int, code: str
    ) -> Optional[EmailVerification]:
        stmt = (
            select(EmailVerification)
            .where(
                EmailVerification.user_id == user_id,
                EmailVerification.code == code,
                EmailVerification.consumed.is_(False),
                EmailVerification.expires_at > datetime.utcnow(),
            )
            .order_by(EmailVerification.id.desc())
        )
        return await self.db.scalar(stmt)

    async def consume(self, ver: EmailVerification) -> None:
        await self.update(ver, {"consumed": True})
