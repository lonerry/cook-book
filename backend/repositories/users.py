from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import User


async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(func.lower(User.email) == email.lower())
    return await db.scalar(stmt)


async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    return await db.get(User, user_id)


async def create(db: AsyncSession, email: str, hashed_password: str) -> User:
    user = User(email=email, hashed_password=hashed_password, is_active=False)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def activate(db: AsyncSession, user: User) -> User:
    user.is_active = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_password(
    db: AsyncSession, *, user: User, hashed_password: str
) -> User:
    user.hashed_password = hashed_password
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_profile(
    db: AsyncSession,
    user: User,
    *,
    nickname: str | None = None,
    full_name: str | None = None,
    photo_path: str | None = None,
) -> User:
    if nickname is not None:
        user.nickname = nickname
    if full_name is not None:
        user.full_name = full_name
    if photo_path is not None:
        user.photo_path = photo_path
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
