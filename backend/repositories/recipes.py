from typing import Iterable, List, Optional

from sqlalchemy import delete, exists, func, or_, select

from backend.models import Like, Recipe, RecipeIngredient, RecipeStep
from backend.models.recipe import TopicEnum
from backend.repositories.base import CRUDRepository


class RecipeRepository(CRUDRepository[Recipe]):
    model = Recipe

    async def list_recipes(
        self,
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
            # Очищаем запрос от лишних символов
            q_clean = q.strip()
            if not q_clean:
                return []
            
            # Full-text search по заголовку и описанию
            query = func.plainto_tsquery("russian", q_clean)
            tsv_recipe = func.to_tsvector(
                "russian",
                func.concat_ws(
                    " ",
                    func.coalesce(Recipe.title, ""),
                    func.coalesce(Recipe.description, ""),
                ),
            )
            cond_recipe = tsv_recipe.op("@@")(query)

            # Full-text search по ингредиентам
            tsv_ing = func.to_tsvector(
                "russian", func.coalesce(RecipeIngredient.name, "")
            )
            cond_ing = exists(
                select(1)
                .select_from(RecipeIngredient)
                .where(RecipeIngredient.recipe_id == Recipe.id)
                .where(tsv_ing.op("@@")(query))
            )

            # ILIKE поиск - только по заголовку и ингредиентам (убрали описание и шаги для более точного поиска)
            ilike_title = Recipe.title.ilike(f"%{q_clean}%")
            ilike_ing = exists(
                select(1)
                .select_from(RecipeIngredient)
                .where(RecipeIngredient.recipe_id == Recipe.id)
                .where(RecipeIngredient.name.ilike(f"%{q_clean}%"))
            )

            # Объединяем условия: full-text search ИЛИ ILIKE
            # Ищем в заголовке, ингредиентах (через full-text или ILIKE)
            search_condition = or_(
                cond_recipe,  # Full-text по заголовку/описанию
                cond_ing,     # Full-text по ингредиентам
                ilike_title,  # ILIKE по заголовку
                ilike_ing,    # ILIKE по ингредиентам
            )

            stmt = stmt.where(search_condition)
        if (order or "").lower() == "asc":
            stmt = stmt.order_by(Recipe.created_at.asc())
        else:
            stmt = stmt.order_by(Recipe.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)
        return list((await self.db.scalars(stmt)).all())

    async def popular(self, *, limit: int, offset: int) -> List[Recipe]:
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
        return list((await self.db.scalars(stmt)).all())

    async def likes_count(self, recipe_id: int) -> int:
        stmt = select(func.count(Like.id)).where(Like.recipe_id == recipe_id)
        return (await self.db.scalar(stmt)) or 0

    async def liked_by_user(
        self, *, recipe_id: int, user_id: Optional[int]
    ) -> Optional[bool]:
        if not user_id:
            return None
        stmt = select(Like).where(Like.user_id == user_id, Like.recipe_id == recipe_id)
        return (await self.db.scalars(stmt)).first() is not None

    async def toggle_like(self, *, user_id: int, recipe_id: int) -> tuple[bool, int]:
        stmt = select(Like).where(Like.user_id == user_id, Like.recipe_id == recipe_id)
        existing = (await self.db.scalars(stmt)).first()
        if existing:
            await self.db.delete(existing)
            liked = False
        else:
            self.db.add(Like(user_id=user_id, recipe_id=recipe_id))
            liked = True
        await self.db.commit()
        return liked, await self.likes_count(recipe_id)

    async def list_by_author(self, *, author_id: int) -> List[Recipe]:
        stmt = (
            select(Recipe)
            .where(Recipe.author_id == author_id)
            .order_by(Recipe.created_at.desc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def delete_by_author(self, *, recipe_id: int, author_id: int) -> bool:
        recipe = await self.db.get(Recipe, recipe_id)
        if not recipe or recipe.author_id != author_id:
            return False
        await self.db.delete(recipe)
        await self.db.commit()
        return True

    async def add_ingredients(
        self, recipe_id: int, items: Iterable[tuple[str, str]]
    ) -> None:
        for name, quantity in items:
            self.db.add(
                RecipeIngredient(recipe_id=recipe_id, name=name, quantity=quantity)
            )
        await self.db.commit()

    async def replace_ingredients(
        self, recipe_id: int, items: Iterable[tuple[str, str]]
    ) -> None:
        await self.db.execute(
            delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
        )
        await self.add_ingredients(recipe_id, items)

    async def set_steps(
        self, recipe_id: int, steps: Iterable[tuple[int, str, str | None]]
    ) -> None:
        await self.db.execute(delete(RecipeStep).where(RecipeStep.recipe_id == recipe_id))
        for order_index, text, photo_path in steps:
            self.db.add(
                RecipeStep(
                    recipe_id=recipe_id,
                    order_index=order_index,
                    text=text,
                    photo_path=photo_path,
                )
            )
        await self.db.commit()
