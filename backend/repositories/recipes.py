from typing import Iterable, List, Optional

from sqlalchemy import delete, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Like, Recipe, RecipeIngredient, RecipeStep
from backend.models.recipe import TopicEnum


async def create(
    db: AsyncSession,
    *,
    author_id: int,
    title: str,
    description: str,
    topic: TopicEnum,
    photo_path: str | None,
) -> Recipe:
    recipe = Recipe(
        author_id=author_id,
        title=title,
        description=description,
        topic=topic,
        photo_path=photo_path,
    )
    db.add(recipe)
    await db.flush()
    return recipe


async def add_ingredients(
    db: AsyncSession, recipe_id: int, items: Iterable[tuple[str, str]]
) -> None:
    for name, quantity in items:
        db.add(RecipeIngredient(recipe_id=recipe_id, name=name, quantity=quantity))


async def replace_ingredients(
    db: AsyncSession, recipe_id: int, items: Iterable[tuple[str, str]]
) -> None:
    await db.execute(
        delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
    )
    await add_ingredients(db, recipe_id, items)


async def commit_refresh(db: AsyncSession, recipe: Recipe) -> Recipe:
    await db.commit()
    await db.refresh(recipe)
    return recipe


async def set_steps(
    db: AsyncSession, recipe_id: int, steps: Iterable[tuple[int, str, str | None]]
) -> None:
    # remove existing
    await db.execute(delete(RecipeStep).where(RecipeStep.recipe_id == recipe_id))
    for order_index, text, photo_path in steps:
        db.add(
            RecipeStep(
                recipe_id=recipe_id,
                order_index=order_index,
                text=text,
                photo_path=photo_path,
            )
        )


async def list_recipes(
    db: AsyncSession,
    *,
    topic: Optional[TopicEnum],
    limit: int,
    offset: int,
    order: str = "desc",
    q: Optional[str] = None,
) -> List[Recipe]:
    stmt = select(Recipe)
    if topic is not None:
        stmt = stmt.where(Recipe.topic == topic)
    if q:
        query = func.plainto_tsquery("russian", q)
        tsv_recipe = func.to_tsvector(
            "russian",
            func.concat_ws(
                " ",
                func.coalesce(Recipe.title, ""),
                func.coalesce(Recipe.description, ""),
            ),
        )
        cond_recipe = tsv_recipe.op("@@")(query)

        tsv_ing = func.to_tsvector("russian", func.coalesce(RecipeIngredient.name, ""))
        cond_ing = exists(
            select(1)
            .select_from(RecipeIngredient)
            .where(RecipeIngredient.recipe_id == Recipe.id)
            .where(tsv_ing.op("@@")(query))
        )

        # Fallback to ILIKE for partials when tsquery finds nothing or for non‑indexed cases
        ilike = or_(Recipe.title.ilike(f"%{q}%"), Recipe.description.ilike(f"%{q}%"))
        ilike_ing = exists(
            select(1)
            .select_from(RecipeIngredient)
            .where(RecipeIngredient.recipe_id == Recipe.id)
            .where(RecipeIngredient.name.ilike(f"%{q}%"))
        )
        ilike_step = exists(
            select(1)
            .select_from(RecipeStep)
            .where(RecipeStep.recipe_id == Recipe.id)
            .where(RecipeStep.text.ilike(f"%{q}%"))
        )

        stmt = stmt.where(or_(cond_recipe, cond_ing, ilike, ilike_ing, ilike_step))
    if (order or "").lower() == "asc":
        stmt = stmt.order_by(Recipe.created_at.asc())
    else:
        stmt = stmt.order_by(Recipe.created_at.desc())
    stmt = stmt.offset(offset).limit(limit)
    return list((await db.scalars(stmt)).all())


async def popular(db: AsyncSession, *, limit: int, offset: int) -> List[Recipe]:
    subq = (
        select(Like.recipe_id, func.count(Like.id).label("likes"))
        .group_by(Like.recipe_id)
        .subquery()
    )
    stmt = (
        select(Recipe)
        .outerjoin(subq, Recipe.id == subq.c.recipe_id)
        .order_by(func.coalesce(subq.c.likes, 0).desc(), Recipe.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list((await db.scalars(stmt)).all())


async def likes_count(db: AsyncSession, recipe_id: int) -> int:
    stmt = select(func.count(Like.id)).where(Like.recipe_id == recipe_id)
    return (await db.scalar(stmt)) or 0


async def get(db: AsyncSession, recipe_id: int) -> Optional[Recipe]:
    return await db.get(Recipe, recipe_id)


async def liked_by_user(
    db: AsyncSession, *, recipe_id: int, user_id: Optional[int]
) -> Optional[bool]:
    if not user_id:
        return None
    stmt = select(Like).where(Like.user_id == user_id, Like.recipe_id == recipe_id)
    return (await db.scalars(stmt)).first() is not None


async def toggle_like(
    db: AsyncSession, *, user_id: int, recipe_id: int
) -> tuple[bool, int]:
    stmt = select(Like).where(Like.user_id == user_id, Like.recipe_id == recipe_id)
    existing = (await db.scalars(stmt)).first()
    if existing:
        await db.delete(existing)
        liked = False
    else:
        db.add(Like(user_id=user_id, recipe_id=recipe_id))
        liked = True
    await db.commit()
    return liked, await likes_count(db, recipe_id)


async def list_by_author(db: AsyncSession, *, author_id: int) -> List[Recipe]:
    stmt = (
        select(Recipe)
        .where(Recipe.author_id == author_id)
        .order_by(Recipe.created_at.desc())
    )
    return list((await db.scalars(stmt)).all())


async def delete_by_author(db: AsyncSession, *, recipe_id: int, author_id: int) -> bool:
    recipe = await db.get(Recipe, recipe_id)
    if not recipe or recipe.author_id != author_id:
        return False
    await db.delete(recipe)
    await db.commit()
    return True
