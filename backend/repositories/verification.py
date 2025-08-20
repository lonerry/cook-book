from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import EmailVerification


async def create_code(
    db: AsyncSession, *, user_id: int, code: str, ttl_minutes: int = 15
) -> EmailVerification:
    ver = EmailVerification(
        user_id=user_id,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
    )
    db.add(ver)
    await db.commit()
    await db.refresh(ver)
    return ver


async def get_valid_code(
    db: AsyncSession, *, user_id: int, code: str
) -> Optional[EmailVerification]:
    stmt = (
        select(EmailVerification)
        .where(
            EmailVerification.user_id == user_id,
            EmailVerification.code == code,
            not EmailVerification.consumed,
            EmailVerification.expires_at > datetime.now(timezone.utc),
        )
        .order_by(EmailVerification.id.desc())
    )
    return await db.scalar(stmt)


async def consume(db: AsyncSession, ver: EmailVerification) -> None:
    ver.consumed = True
    db.add(ver)
    await db.commit()
