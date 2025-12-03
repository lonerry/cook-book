#!/usr/bin/env python3
"""
Скрипт для очистки всех рецептов из базы данных.
Использование: python -m backend.scripts.clear_recipes
"""

import asyncio
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import delete
from backend.db.session import AsyncSessionLocal
from backend.models.recipe import Recipe, RecipeIngredient, RecipeStep
from backend.models.like import Like
from backend.models.comment import Comment


async def clear_all_recipes():
    """Удаляет все рецепты и связанные данные из базы данных."""
    async with AsyncSessionLocal() as db:
        try:
            print("Начинаю очистку рецептов...")
            
            # Удаляем комментарии (связаны с рецептами через CASCADE, но удалим явно для ясности)
            print("Удаляю комментарии...")
            await db.execute(delete(Comment))
            
            # Удаляем лайки (связаны с рецептами через CASCADE, но удалим явно для ясности)
            print("Удаляю лайки...")
            await db.execute(delete(Like))
            
            # Удаляем ингредиенты (связаны с рецептами через CASCADE)
            print("Удаляю ингредиенты...")
            await db.execute(delete(RecipeIngredient))
            
            # Удаляем шаги рецептов (связаны с рецептами через CASCADE)
            print("Удаляю шаги рецептов...")
            await db.execute(delete(RecipeStep))
            
            # Удаляем рецепты
            print("Удаляю рецепты...")
            result = await db.execute(delete(Recipe))
            deleted_count = result.rowcount
            
            await db.commit()
            
            print(f"✅ Успешно удалено {deleted_count} рецептов и все связанные данные!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Ошибка при удалении: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(clear_all_recipes())

