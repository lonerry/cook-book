from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Comment
from backend.repositories.base import CRUDRepository


class CommentRepository(CRUDRepository[Comment]):
    model = Comment

    async def list_for_recipe(
        self, *, recipe_id: int, limit: int = 50, offset: int = 0
    ) -> List[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.recipe_id == recipe_id)
            .order_by(Comment.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        return list((await self.db.scalars(stmt)).all())
