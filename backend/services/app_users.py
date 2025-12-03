from __future__ import annotations

import io
import os
import time
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.errors import ErrorCode, http_error
from backend.core.security import get_password_hash, verify_password
from backend.models import User
from backend.repositories.recipes import RecipeRepository
from backend.repositories.users import UserRepository
from backend.schemas.common import PhotoResponse
from backend.schemas.user import ChangePasswordRequest
from backend.services.storage import delete_file_by_url, upload_public_file, get_public_url_or_presigned


async def get_me(db: AsyncSession, *, current_user: User) -> dict:
    recipes_repo = RecipeRepository(db)
    recipes_rows = await recipes_repo.list_by_author(author_id=current_user.id)
    recipes: list[dict] = []
    for r in recipes_rows:
        likes = await recipes_repo.likes_count(r.id)
        liked_by_me = await recipes_repo.liked_by_user(
            recipe_id=r.id, user_id=current_user.id
        )
        recipes.append(
            {
                "id": r.id,
                "title": r.title,
                "topic": r.topic.value if hasattr(r.topic, "value") else str(r.topic),
                "photo_path": get_public_url_or_presigned(r.photo_path) if r.photo_path else None,
                "description": r.description,
                "ingredients": [
                    {"name": i.name, "quantity": i.quantity} for i in r.ingredients
                ],
                "likes_count": likes,
                "liked_by_me": liked_by_me,
            }
        )
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "nickname": current_user.nickname,
        "full_name": current_user.full_name,
        "photo_path": get_public_url_or_presigned(current_user.photo_path) if current_user.photo_path else None,
        "recipes": recipes,
    }


async def get_public_profile(
    db: AsyncSession, *, user_id: int, viewer: Optional[User]
) -> dict:
    users_repo = UserRepository(db)
    recipes_repo = RecipeRepository(db)

    user = await users_repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    recipes_rows = await recipes_repo.list_by_author(author_id=user.id)
    recipes: list[dict] = []
    for r in recipes_rows:
        likes = await recipes_repo.likes_count(r.id)
        liked_by_me = await recipes_repo.liked_by_user(
            recipe_id=r.id, user_id=(viewer.id if viewer else None)
        )
        recipes.append(
            {
                "id": r.id,
                "title": r.title,
                "topic": r.topic.value if hasattr(r.topic, "value") else str(r.topic),
                "photo_path": get_public_url_or_presigned(r.photo_path) if r.photo_path else None,
                "likes_count": likes,
                "liked_by_me": liked_by_me,
            }
        )
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "full_name": user.full_name,
        "photo_path": get_public_url_or_presigned(user.photo_path) if user.photo_path else None,
        "recipes": recipes,
    }


async def update_me_form(
    db: AsyncSession,
    *,
    current_user: User,
    nickname: Optional[str],
    full_name: Optional[str],
    photo: Optional[UploadFile],
):
    photo_url: Optional[str] = None
    if photo is not None:
        ext = os.path.splitext(photo.filename or "")[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail="Invalid image type")
        if current_user.photo_path:
            try:
                delete_file_by_url(current_user.photo_path)
            except Exception:
                pass
        ts = int(time.time())
        key = f"avatars/{current_user.id}/avatar_{ts}{ext}"
        data = await photo.read()
        photo_url = upload_public_file(io.BytesIO(data), key)

    users_repo = UserRepository(db)
    data: dict = {
        "nickname": nickname,
        "full_name": full_name,
        "photo_path": photo_url,
    }
    user = await users_repo.update(current_user, {k: v for k, v in data.items() if v is not None})
    return user


async def update_me_json(
    db: AsyncSession,
    *,
    current_user: User,
    nickname: Optional[str],
    full_name: Optional[str],
):
    users_repo = UserRepository(db)
    data: dict = {"nickname": nickname, "full_name": full_name}
    return await users_repo.update(current_user, {k: v for k, v in data.items() if v is not None})


async def upload_avatar(
    db: AsyncSession,
    *,
    current_user: User,
    file: UploadFile,
) -> PhotoResponse:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Invalid image type")
    if current_user.photo_path:
        try:
            delete_file_by_url(current_user.photo_path)
        except Exception:
            pass
    ts = int(time.time())
    key = f"avatars/{current_user.id}/avatar_{ts}{ext}"
    data = await file.read()
    url = upload_public_file(io.BytesIO(data), key)
    users_repo = UserRepository(db)
    user = await users_repo.update(current_user, {"photo_path": url})
    # Return processed URL that's accessible
    return PhotoResponse(photo_path=get_public_url_or_presigned(user.photo_path) if user.photo_path else None)


async def delete_avatar(db: AsyncSession, *, current_user: User) -> dict:
    if not current_user.photo_path:
        return {"deleted": False}
    try:
        delete_file_by_url(current_user.photo_path)
    except Exception:
        pass
    users_repo = UserRepository(db)
    await users_repo.update(current_user, {"photo_path": None})
    return {"deleted": True}


async def change_password(
    db: AsyncSession,
    *,
    current_user: User,
    payload: ChangePasswordRequest,
) -> None:
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise http_error(ErrorCode.INCORRECT_CREDENTIALS)
    hashed = get_password_hash(payload.new_password)
    users_repo = UserRepository(db)
    await users_repo.update(current_user, {"hashed_password": hashed})
