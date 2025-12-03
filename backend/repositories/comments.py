from typing import List, Optional

from sqlalchemy import select

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

async def list_for_recipe(
    db: AsyncSession, *, recipe_id: int, limit: int = 50, offset: int = 0
) -> List[Comment]:
    repo = CommentRepository(db)
    return await repo.list_for_recipe(recipe_id=recipe_id, limit=limit, offset=offset)


