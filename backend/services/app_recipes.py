from __future__ import annotations

import io
import json
import os
from typing import List, Optional

from fastapi import Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.errors import ErrorCode, http_error
from backend.models import User
from backend.models.comment import Comment
from backend.models.recipe import Recipe, RecipeIngredient, TopicEnum
from backend.repositories.comments import CommentRepository
from backend.repositories.recipes import RecipeRepository
from backend.schemas.recipe import (
    AuthorPublic,
    CommentPublic,
    IngredientItem,
    RecipePublic,
    RecipeStepItem,
)
from backend.services.storage import upload_public_file, get_public_url_or_presigned


def _slugify_ascii(text: str, fallback: str = "file") -> str:
    import re
    import unicodedata

    norm = unicodedata.normalize("NFKD", text)
    ascii_bytes = norm.encode("ascii", "ignore")
    ascii_text = ascii_bytes.decode("ascii")
    ascii_text = re.sub(r"[^A-Za-z0-9_-]+", "_", ascii_text).strip("_")
    return ascii_text or fallback


def map_recipe_to_public(
    recipe,
    *,
    likes_count: int,
    include_author: bool = True,
    include_comments: bool = False,
    comments_list: Optional[list] = None,
    liked_by_me: bool | None = None,
) -> RecipePublic:
    ingredients = [
        IngredientItem(name=i.name, quantity=i.quantity) for i in recipe.ingredients
    ]
    author = None
    if include_author and recipe.author is not None:
        author = AuthorPublic(
            id=recipe.author.id,
            email=recipe.author.email,
            nickname=recipe.author.nickname,
            photo_path=get_public_url_or_presigned(recipe.author.photo_path) if recipe.author.photo_path else None,
        )
    steps = [
        RecipeStepItem(
            order_index=s.order_index, 
            text=s.text, 
            photo_path=get_public_url_or_presigned(s.photo_path) if s.photo_path else None
        )
        for s in getattr(recipe, "steps", [])
    ]
    comments = None
    if include_comments and comments_list is not None:
        comments = [
            CommentPublic(
                id=c.id,
                author=AuthorPublic(
                    id=c.author.id,
                    email=c.author.email,
                    nickname=c.author.nickname,
                    photo_path=get_public_url_or_presigned(c.author.photo_path) if c.author.photo_path else None,
                ),
                content=c.content,
                created_at=c.created_at,
            )
            for c in comments_list
        ]

    return RecipePublic(
        id=recipe.id,
        author_id=recipe.author_id,
        author=author,
        title=recipe.title,
        description=recipe.description,
        topic=recipe.topic,
        photo_path=get_public_url_or_presigned(recipe.photo_path) if recipe.photo_path else None,
        created_at=recipe.created_at,
        likes_count=likes_count,
        liked_by_me=liked_by_me,
        ingredients=ingredients,
        steps=steps,
        comments=comments,
    )


async def create_from_request(
    db: AsyncSession,
    *,
    current_user: User,
    request: Request,
    title: str,
    description: Optional[str],
    topic: TopicEnum,
    ingredients: str,
    steps: Optional[str],
) -> RecipePublic:
    try:
        items: List[dict] = json.loads(ingredients)
        parsed_ing = [IngredientItem(**item) for item in items]
    except Exception:
        raise http_error(ErrorCode.INVALID_INGREDIENTS_JSON)

    form = await request.form()

    # cover photo
    photo_file: Optional[UploadFile] = None
    for key in ("photo", "photo[]"):
        if key in form:
            candidate = (
                form.getlist(key)[0] if hasattr(form, "getlist") else form.get(key)
            )
            if candidate is not None and getattr(candidate, "filename", None):
                photo_file = candidate  # type: ignore[assignment]
                break

    # Read cover photo (if any) but upload only after recipe is created to use its id
    photo_ext: Optional[str] = None
    photo_bytes: Optional[bytes] = None
    if photo_file is not None:
        ext = os.path.splitext(photo_file.filename or "")[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise http_error(ErrorCode.INVALID_IMAGE_TYPE)
        photo_ext = ext
        photo_bytes = await photo_file.read()

    recipes_repo = RecipeRepository(db)
    recipe = Recipe(
        author_id=current_user.id,
        title=title,
        description=description,
        topic=topic,
        photo_path=None,
    )
    recipe = await recipes_repo.create(recipe)

    for i in parsed_ing:
        db.add(RecipeIngredient(recipe_id=recipe.id, name=i.name, quantity=i.quantity))
    await db.commit()
    await db.refresh(recipe)

    # Now that we have recipe.id, upload the cover photo with a unique key
    if photo_bytes is not None and photo_ext is not None:
        key = f"recipes/{current_user.id}/{recipe.id}/cover{photo_ext}"
        recipe.photo_path = upload_public_file(io.BytesIO(photo_bytes), key)
        db.add(recipe)
        await db.commit()
        await db.refresh(recipe)

    # steps
    step_items: List[dict] = []
    try:
        step_items = json.loads(steps or "[]")
        if not isinstance(step_items, list):
            step_items = []
    except Exception:
        step_items = []

    files: List[UploadFile] = []
    for key in ("step_photos", "step_photos[]"):
        if key in form:
            lst = form.getlist(key) if hasattr(form, "getlist") else [form.get(key)]
            files = [f for f in lst if f is not None and getattr(f, "filename", None)]  # type: ignore[list-item]
            if files:
                break

    uploaded_steps: List[tuple[int, str, str | None]] = []
    file_cursor = 0
    for idx, item in enumerate(step_items):
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        url: Optional[str] = None
        if bool(item.get("with_file")) and file_cursor < len(files):
            f = files[file_cursor]
            file_cursor += 1
            ext = os.path.splitext(f.filename or "")[1].lower()
            if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
                raise http_error(ErrorCode.INVALID_IMAGE_TYPE)
            key = f"recipes/{current_user.id}/{recipe.id}/steps/step_{idx+1}{ext}"
            data = await f.read()
            url = upload_public_file(io.BytesIO(data), key)
        uploaded_steps.append((idx + 1, text, url))

    if uploaded_steps:
        await recipes_repo.set_steps(recipe.id, uploaded_steps)
        recipe = await recipes_repo.get(recipe.id)  # refresh

    return map_recipe_to_public(recipe, likes_count=0)


async def list_public(
    db: AsyncSession,
    *,
    current_user: Optional[User],
    topic: Optional[TopicEnum],
    order: Optional[str],
    limit: int,
    offset: int,
    q: Optional[str] = None,
) -> List[RecipePublic]:
    recipes_repo = RecipeRepository(db)
    recipes = await recipes_repo.list_recipes(
        topic=topic, limit=limit, offset=offset, order=(order or "desc"), q=q
    )
    result: List[RecipePublic] = []
    for r in recipes:
        liked = await recipes_repo.liked_by_user(
            recipe_id=r.id, user_id=(current_user.id if current_user else None)
        )
        result.append(
            map_recipe_to_public(
                r,
                likes_count=await recipes_repo.likes_count(r.id),
                include_author=True,
                liked_by_me=liked,
            )
        )
    return result


async def popular_public(
    db: AsyncSession,
    *,
    current_user: Optional[User],
    limit: int,
    offset: int,
) -> List[RecipePublic]:
    recipes_repo = RecipeRepository(db)
    recipes = await recipes_repo.popular(limit=limit, offset=offset)
    result: List[RecipePublic] = []
    for r in recipes:
        liked = await recipes_repo.liked_by_user(
            recipe_id=r.id, user_id=(current_user.id if current_user else None)
        )
        result.append(
            map_recipe_to_public(
                r,
                likes_count=await recipes_repo.likes_count(r.id),
                include_author=True,
                liked_by_me=liked,
            )
        )
    return result


async def get_public(
    db: AsyncSession,
    *,
    current_user: Optional[User],
    recipe_id: int,
) -> RecipePublic:
    recipes_repo = RecipeRepository(db)
    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    liked = await recipes_repo.liked_by_user(
        recipe_id=recipe.id, user_id=(current_user.id if current_user else None)
    )
    likes = await recipes_repo.likes_count(recipe.id)
    return map_recipe_to_public(
        recipe,
        likes_count=likes,
        include_author=True,
        include_comments=False,
        liked_by_me=liked,
    )


async def toggle_like(
    db: AsyncSession, *, current_user: User, recipe_id: int
) -> tuple[bool, int]:
    recipes_repo = RecipeRepository(db)
    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    return await recipes_repo.toggle_like(
        user_id=current_user.id, recipe_id=recipe_id
    )


async def delete_by_author(
    db: AsyncSession, *, current_user: User, recipe_id: int
) -> None:
    recipes_repo = RecipeRepository(db)
    ok = await recipes_repo.delete_by_author(
        recipe_id=recipe_id, author_id=current_user.id
    )
    if not ok:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)


async def update_from_request(
    db: AsyncSession,
    *,
    current_user: User,
    recipe_id: int,
    request: Request,
    title: Optional[str],
    description: Optional[str],
    topic: Optional[TopicEnum],
    ingredients: Optional[str],
    steps: Optional[str],
) -> RecipePublic:
    recipes_repo = RecipeRepository(db)
    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    if recipe.author_id != current_user.id:
        raise http_error(ErrorCode.FORBIDDEN)

    form = await request.form()

    # Update cover photo if provided in any of expected keys
    photo_file: Optional[UploadFile] = None
    for key in ("photo", "photo[]"):
        if key in form:
            candidate = (
                form.getlist(key)[0] if hasattr(form, "getlist") else form.get(key)
            )
            if candidate is not None and getattr(candidate, "filename", None):
                photo_file = candidate  # type: ignore[assignment]
                break
    if photo_file is not None:
        ext = os.path.splitext(photo_file.filename or "")[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise http_error(ErrorCode.INVALID_IMAGE_TYPE)
        key = f"recipes/{current_user.id}/{recipe.id}/cover{ext}"
        data = await photo_file.read()
        recipe.photo_path = upload_public_file(io.BytesIO(data), key)

    # Update primitive fields
    if title is not None:
        recipe.title = title
    if description is not None:
        recipe.description = description
    if topic is not None:
        recipe.topic = topic

    # Update ingredients if provided
    if ingredients is not None:
        try:
            items: list[dict] = json.loads(ingredients)
            parsed = [(str(i["name"]), str(i["quantity"])) for i in items]
        except Exception:
            raise http_error(ErrorCode.INVALID_INGREDIENTS_JSON)
        await recipes_repo.replace_ingredients(recipe.id, parsed)

    # Update steps if provided
    if steps is not None:
        try:
            step_items: list[dict] = json.loads(steps or "[]")
            if not isinstance(step_items, list):
                step_items = []
        except Exception:
            step_items = []

        # Load existing steps to preserve photos that aren't being replaced
        existing_steps = {s.order_index: s.photo_path for s in recipe.steps}

        files: list[UploadFile] = []
        for key in ("step_photos", "step_photos[]"):
            if key in form:
                lst = form.getlist(key) if hasattr(form, "getlist") else [form.get(key)]
                files = [f for f in lst if f is not None and getattr(f, "filename", None)]  # type: ignore[list-item]
                if files:
                    break

        uploaded_steps: list[tuple[int, str, str | None]] = []
        file_cursor = 0
        for idx, item in enumerate(step_items):
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            url: str | None = None
            order_index = idx + 1
            
            # Check if a new file is being uploaded for this step
            if bool(item.get("with_file")) and file_cursor < len(files):
                # New file uploaded - use it
                f = files[file_cursor]
                file_cursor += 1
                ext = os.path.splitext(f.filename or "")[1].lower()
                if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
                    raise http_error(ErrorCode.INVALID_IMAGE_TYPE)
                key = f"recipes/{current_user.id}/{recipe.id}/steps/step_{order_index}{ext}"
                data = await f.read()
                url = upload_public_file(io.BytesIO(data), key)
            elif order_index in existing_steps:
                # No new file, but step had a photo - preserve it
                url = existing_steps[order_index]
            # If with_file is False or not set and no existing photo, url remains None
            
            uploaded_steps.append((order_index, text, url))
        await recipes_repo.set_steps(recipe.id, uploaded_steps)

    await db.commit()
    await db.refresh(recipe)
    likes = await recipes_repo.likes_count(recipe.id)
    return map_recipe_to_public(recipe, likes_count=likes, include_author=True)


async def list_comments_public(
    db: AsyncSession,
    *,
    recipe_id: int,
    current_user: Optional[User],
    limit: int,
    offset: int,
) -> list[CommentPublic]:
    recipes_repo = RecipeRepository(db)
    comments_repo = CommentRepository(db)

    rows = await comments_repo.list_for_recipe(
        recipe_id=recipe_id, limit=limit, offset=offset
    )
    recipe = await recipes_repo.get(recipe_id)
    return [
        CommentPublic(
            id=c.id,
            author=AuthorPublic(
                id=c.author.id,
                email=c.author.email,
                nickname=c.author.nickname,
                photo_path=get_public_url_or_presigned(c.author.photo_path) if c.author.photo_path else None,
            ),
            content=c.content,
            created_at=c.created_at,
            can_edit=(current_user is not None and c.author_id == current_user.id),
            can_delete=(
                current_user is not None
                and (
                    c.author_id == current_user.id
                    or (recipe and recipe.author_id == current_user.id)
                )
            ),
        )
        for c in rows
    ]


async def add_comment(
    db: AsyncSession,
    *,
    recipe_id: int,
    current_user: User,
    content: str,
) -> CommentPublic:
    recipes_repo = RecipeRepository(db)
    comments_repo = CommentRepository(db)

    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    comment = Comment(
        recipe_id=recipe_id, author_id=current_user.id, content=content
    )
    comment = await comments_repo.create(comment)
    return CommentPublic(
        id=comment.id,
        author=AuthorPublic(
            id=current_user.id,
            email=current_user.email,
            nickname=current_user.nickname,
            photo_path=get_public_url_or_presigned(current_user.photo_path) if current_user.photo_path else None,
        ),
        content=comment.content,
        created_at=comment.created_at,
        can_edit=True,
        can_delete=True,
    )


async def edit_comment(
    db: AsyncSession,
    *,
    recipe_id: int,
    comment_id: int,
    current_user: User,
    content: str,
) -> CommentPublic:
    recipes_repo = RecipeRepository(db)
    comments_repo = CommentRepository(db)

    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    comment = await comments_repo.get(comment_id)
    if not comment or comment.recipe_id != recipe_id:
        raise http_error(ErrorCode.COMMENT_NOT_FOUND)
    if comment.author_id != current_user.id:
        raise http_error(ErrorCode.FORBIDDEN)
    comment = await comments_repo.update(comment, {"content": content})
    return CommentPublic(
        id=comment.id,
        author=AuthorPublic(
            id=current_user.id,
            email=current_user.email,
            nickname=current_user.nickname,
            photo_path=get_public_url_or_presigned(current_user.photo_path) if current_user.photo_path else None,
        ),
        content=comment.content,
        created_at=comment.created_at,
        can_edit=True,
        can_delete=True,
    )


async def delete_comment(
    db: AsyncSession,
    *,
    recipe_id: int,
    comment_id: int,
    current_user: User,
) -> dict:
    recipes_repo = RecipeRepository(db)
    comments_repo = CommentRepository(db)

    recipe = await recipes_repo.get(recipe_id)
    if not recipe:
        raise http_error(ErrorCode.RECIPE_NOT_FOUND)
    comment = await comments_repo.get(comment_id)
    if not comment or comment.recipe_id != recipe_id:
        raise http_error(ErrorCode.COMMENT_NOT_FOUND)
    if comment.author_id != current_user.id and recipe.author_id != current_user.id:
        raise http_error(ErrorCode.FORBIDDEN)
    await comments_repo.delete(comment)
    return {"deleted": True}
