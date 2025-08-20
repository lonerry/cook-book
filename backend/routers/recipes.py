from typing import List, Optional

from fastapi import APIRouter, Depends, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.models import User
from backend.models.recipe import TopicEnum
from backend.schemas.common import LikeResponse
from backend.schemas.recipe import CommentPublic, RecipePublic
from backend.services import app_recipes as svc
from backend.services.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/", response_model=RecipePublic)
async def create_recipe(
    request: Request,
    title: str = Form(...),
    description: Optional[str] = Form(default=None),
    topic: TopicEnum = Form(...),
    ingredients: str = Form(..., description="JSON list of {name, quantity}"),
    steps: Optional[str] = Form(
        default=None,
        description="JSON list of {text}. Files in step_photos[] map by index",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecipePublic:
    """Создание рецепта из multipart/form-data.

    - Поля: title, description?, topic, ingredients(JSON), steps(JSON)
    - Файлы: photo?, step_photos[]
    """
    return await svc.create_from_request(
        db,
        current_user=current_user,
        request=request,
        title=title,
        description=description,
        topic=topic,
        ingredients=ingredients,
        steps=steps,
    )


@router.get("/", response_model=List[RecipePublic])
async def list_recipes(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    topic: Optional[TopicEnum] = None,
    order: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[RecipePublic]:
    """Лента рецептов.

    - Фильтры: topic, q (поиск), order(asc|desc)
    - Пагинация: limit, offset
    """
    return await svc.list_public(
        db,
        current_user=current_user,
        topic=topic,
        order=order,
        limit=limit,
        offset=offset,
        q=q,
    )


@router.get("/popular", response_model=List[RecipePublic])
async def popular_recipes(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    limit: int = 20,
    offset: int = 0,
) -> List[RecipePublic]:
    """Популярные рецепты (по лайкам)."""
    return await svc.popular_public(
        db, current_user=current_user, limit=limit, offset=offset
    )


@router.get("/{recipe_id}", response_model=RecipePublic)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> RecipePublic:
    """Один рецепт по id."""
    return await svc.get_public(db, current_user=current_user, recipe_id=recipe_id)


@router.get("/{recipe_id}/comments", response_model=List[CommentPublic])
async def list_comments(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    limit: int = 50,
    offset: int = 0,
) -> List[CommentPublic]:
    """Комментарии к рецепту."""
    return await svc.list_comments_public(
        db, recipe_id=recipe_id, current_user=current_user, limit=limit, offset=offset
    )


@router.post("/{recipe_id}/comments", response_model=CommentPublic)
async def add_comment(
    recipe_id: int,
    content: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentPublic:
    """Добавление комментария (form-data: content)."""
    return await svc.add_comment(
        db, recipe_id=recipe_id, current_user=current_user, content=content
    )


@router.put("/{recipe_id}/comments/{comment_id}", response_model=CommentPublic)
async def edit_comment(
    recipe_id: int,
    comment_id: int,
    content: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentPublic:
    """Редактирование комментария (только автор)."""
    return await svc.edit_comment(
        db,
        recipe_id=recipe_id,
        comment_id=comment_id,
        current_user=current_user,
        content=content,
    )


@router.delete("/{recipe_id}/comments/{comment_id}")
async def delete_comment(
    recipe_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Удаление комментария (автор комментария или автор рецепта)."""
    return await svc.delete_comment(
        db, recipe_id=recipe_id, comment_id=comment_id, current_user=current_user
    )


@router.post("/{recipe_id}/like", response_model=LikeResponse)
async def like_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LikeResponse:
    """Тоггл лайка и получение актуального счётчика."""
    liked, likes = await svc.toggle_like(
        db, current_user=current_user, recipe_id=recipe_id
    )
    return LikeResponse(liked=liked, likes_count=likes)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Удаление рецепта автором."""
    await svc.delete_by_author(db, current_user=current_user, recipe_id=recipe_id)
    return {"deleted": True}


@router.put("/{recipe_id}", response_model=RecipePublic)
async def update_recipe(
    recipe_id: int,
    request: Request,
    title: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None),
    topic: Optional[TopicEnum] = Form(default=None),
    ingredients: Optional[str] = Form(
        default=None, description="JSON list of {name, quantity}"
    ),
    steps: Optional[str] = Form(
        default=None,
        description="JSON list of {text}. Files in step_photos[] map by index",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecipePublic:
    """Обновление рецепта: поддерживает замену обложки и шагов (multipart)."""
    return await svc.update_from_request(
        db,
        current_user=current_user,
        recipe_id=recipe_id,
        request=request,
        title=title,
        description=description,
        topic=topic,
        ingredients=ingredients,
        steps=steps,
    )
