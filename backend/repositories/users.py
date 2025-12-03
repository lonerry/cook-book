from typing import Optional

from sqlalchemy import func, select

from backend.models import User
from backend.repositories.base import CRUDRepository


class UserRepository(CRUDRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(func.lower(User.email) == email.lower())
        return await self.db.scalar(stmt)
