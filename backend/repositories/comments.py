from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Comment


async def list_for_recipe(
    db: AsyncSession, *, recipe_id: int, limit: int = 50, offset: int = 0
) -> List[Comment]:
    stmt = (
        select(Comment)
        .where(Comment.recipe_id == recipe_id)
        .order_by(Comment.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return list((await db.scalars(stmt)).all())


async def create(
    db: AsyncSession, *, recipe_id: int, author_id: int, content: str
) -> Comment:
    comment = Comment(recipe_id=recipe_id, author_id=author_id, content=content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def get(db: AsyncSession, *, comment_id: int) -> Optional[Comment]:
    return await db.get(Comment, comment_id)


async def update_content(
    db: AsyncSession, *, comment: Comment, content: str
) -> Comment:
    comment.content = content
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def delete(db: AsyncSession, *, comment: Comment) -> None:
    await db.delete(comment)
    await db.commit()
