from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetTokenInspectResponse,
    TokenResponse,
    VerifyRequest,
)
from backend.schemas.common import MessageResponse
from backend.services import app_auth as auth_svc
from backend.services.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", status_code=status.HTTP_201_CREATED, response_model=MessageResponse
)
async def register(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    """Регистрация нового пользователя.

    - Принимает: email, password
    - Действия: создаёт пользователя, генерирует код верификации и отправляет его на email
    - Ответ: message об успешной отправке кода
    """
    return await auth_svc.register(db, payload=payload)


@router.post("/verify", response_model=TokenResponse)
async def verify(
    payload: VerifyRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Подтверждение email кодом.

    - Принимает: email, code
    - Действия: валидирует код, активирует аккаунт, выдаёт access_token
    - Ответ: TokenResponse
    """
    return await auth_svc.verify(db, payload=payload)


@router.post("/login-json", response_model=TokenResponse)
async def login_json(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Логин по email+password. Возвращает access_token.

    - Принимает: email, password
    - Ответ: TokenResponse
    """
    return await auth_svc.login_json(db, payload=payload)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, current_user=Depends(get_current_user)) -> dict:  # type: ignore[no-redef]
    """Выход: инвалидация текущего токена (blacklist по jti).

    - Требует авторизации
    - Ответ: message
    """
    auth = request.headers.get("Authorization", "")
    token = auth.split(" ", 1)[1] if auth.lower().startswith("bearer ") else None
    resp = await auth_svc.logout(token=token)
    return resp.model_dump() if hasattr(resp, "model_dump") else resp


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    """Запрос ссылки для сброса пароля.

    - Принимает: email
    - Всегда возвращает одинаковый message
    """
    resp = await auth_svc.forgot_password(db, email=payload.email)
    return resp.model_dump() if hasattr(resp, "model_dump") else resp


@router.get("/reset-token/inspect", response_model=ResetTokenInspectResponse)
async def inspect_reset_token(token: str = Query(...)) -> ResetTokenInspectResponse:
    """Проверка валидности токена сброса пароля.

    - Принимает: token
    - Ответ: valid: bool
    """
    valid = await auth_svc.inspect_reset_token(token=token)
    return ResetTokenInspectResponse(valid=valid)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    """Сброс пароля по валидному токену.

    - Принимает: token, new_password
    - Ответ: message
    """
    resp = await auth_svc.reset_password(db, payload=payload)
    return resp.model_dump() if hasattr(resp, "model_dump") else resp
