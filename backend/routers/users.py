from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.models import User
from backend.schemas.common import DeleteResponse, MessageResponse, PhotoResponse
from backend.schemas.user import ChangePasswordRequest, UserPublic
from backend.services import app_users as svc
from backend.services.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """Текущий пользователь с его рецептами и лайками.

    - Требует авторизации
    - Ответ: профиль + список моих рецептов
    """
    return await svc.get_me(db, current_user=current_user)


@router.get("/{user_id}")
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> dict:
    """Публичный профиль пользователя и его рецепты.

    - Не требует авторизации (viewer опционален)
    - Ответ: публичные данные и рецепты
    """
    return await svc.get_public_profile(db, user_id=user_id, viewer=viewer)


@router.patch("/me", response_model=UserPublic)
async def update_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    nickname: Optional[str] = Form(default=None),
    full_name: Optional[str] = Form(default=None),
    photo: Optional[UploadFile] = File(default=None),
) -> UserPublic:
    """Обновление профиля (ник/ФИО/аватар) через multipart/form-data.

    - Поля опциональны; передавай только изменяемые
    - Ответ: обновлённый UserPublic
    """
    user = await svc.update_me_form(
        db,
        current_user=current_user,
        nickname=nickname,
        full_name=full_name,
        photo=photo,
    )
    return UserPublic.model_validate(user)


@router.post("/me/photo", response_model=PhotoResponse)
async def upload_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    """Загрузка аватара.

    - Принимает: file (image/*)
    - Ответ: { photo_path }
    """
    resp = await svc.upload_avatar(db, current_user=current_user, file=file)
    return resp.model_dump() if hasattr(resp, "model_dump") else resp


@router.delete("/me/photo", response_model=DeleteResponse)
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Удаление аватара пользователя.

    - Ответ: { deleted: bool }
    """
    return await svc.delete_avatar(db, current_user=current_user)


@router.post("/me/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Смена пароля: old_password -> new_password.

    - Валидация старого пароля на бэке
    - Ответ: message
    """
    if len(payload.new_password) < 6:
        return {"message": "New password is too short"}
    await svc.change_password(db, current_user=current_user, payload=payload)
    return {"message": "Password changed"}
