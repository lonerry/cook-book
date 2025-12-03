from __future__ import annotations

import random

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.core.errors import ErrorCode, http_error
from backend.core.security import (
    create_access_token,
    create_reset_token,
    get_password_hash,
    verify_password,
)
from backend.core.token_blacklist import add_to_blacklist, is_blacklisted
from backend.models import User
from backend.repositories.users import UserRepository
from backend.repositories.verification import EmailVerificationRepository
from backend.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyRequest,
)
from backend.schemas.common import MessageResponse
from backend.services.email import publish_reset_email, publish_verification_email


async def register(db: AsyncSession, *, payload: RegisterRequest) -> MessageResponse:
    users_repo = UserRepository(db)
    ver_repo = EmailVerificationRepository(db)

    existing = await users_repo.get_by_email(payload.email)
    if existing:
        raise http_error(ErrorCode.EMAIL_EXISTS)

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        is_active=False,
    )
    user = await users_repo.create(user)

    code = f"{random.randint(0, 999999):06d}"
    await ver_repo.create_code(user_id=user.id, code=code)

    try:
        publish_verification_email(user.email, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return MessageResponse(message="Registered. Check your email for the verification code.") 


async def verify(db: AsyncSession, *, payload: VerifyRequest) -> TokenResponse:
    users_repo = UserRepository(db)
    ver_repo = EmailVerificationRepository(db)

    user = await users_repo.get_by_email(payload.email)
    if not user:
        raise http_error(ErrorCode.USER_NOT_FOUND)

    ver = await ver_repo.get_valid_code(user_id=user.id, code=payload.code)
    if not ver:
        ver = await ver_repo.get_valid_code_by_email(db, email=payload.email, code=payload.code)
    if not ver:
        raise http_error(ErrorCode.INVALID_CODE)

    await ver_repo.consume(ver)
    user = await users_repo.update(user, {"is_active": True})

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


async def login_json(db: AsyncSession, *, payload: LoginRequest) -> TokenResponse:
    users_repo = UserRepository(db)
    user = await users_repo.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise http_error(ErrorCode.INCORRECT_CREDENTIALS)
    if not user.is_active:
        raise http_error(ErrorCode.EMAIL_NOT_VERIFIED)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


async def logout(*, token: str | None) -> MessageResponse:
    if not token:
        return MessageResponse(message="Logged out")
    s = get_settings()
    try:
        payload = jwt.decode(token, s.secret_key, algorithms=[s.algorithm])
        await add_to_blacklist(payload.get("jti"))
    except JWTError:
        pass
    return MessageResponse(message="Logged out")


async def forgot_password(db: AsyncSession, *, email: str) -> MessageResponse:
    users_repo = UserRepository(db)
    user = await users_repo.get_by_email(email)
    if user and user.is_active:
        token = create_reset_token(str(user.id))
        s = get_settings()
        link = f"{s.frontend_url.rstrip('/')}/reset-password?token={token}"
        try:
            publish_reset_email(user.email, link)
        except Exception:
            pass
    return MessageResponse(message="If the email exists, a reset link has been sent.")


async def inspect_reset_token(*, token: str) -> bool:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.secret_key, algorithms=[s.algorithm])
        if payload.get("type") != "reset":
            return False
        if await is_blacklisted(payload.get("jti")):
            return False
        return True
    except JWTError:
        return False


async def reset_password(
    db: AsyncSession, *, payload: ResetPasswordRequest
) -> MessageResponse:
    s = get_settings()
    try:
        data = jwt.decode(payload.token, s.secret_key, algorithms=[s.algorithm])
        if data.get("type") != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
            )
        user_id = int(data["sub"]) 
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )

    if await is_blacklisted(data.get("jti")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )

    users_repo = UserRepository(db)
    user = await users_repo.get(user_id)
    if not user:
        raise http_error(ErrorCode.USER_NOT_FOUND)

    await users_repo.update(user, {"hashed_password": get_password_hash(payload.new_password)})

    await add_to_blacklist(data.get("jti"))

    return MessageResponse(message="Password has been reset successfully.")


def _decode_access_token(token: str) -> dict:
    s = get_settings()
    return jwt.decode(token, s.secret_key, algorithms=[s.algorithm])


async def validate_access_token(token: str) -> int:
    try:
        payload = _decode_access_token(token)
        if await is_blacklisted(payload.get("jti")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Logged out token"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        return int(user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


async def try_get_user_id_from_token(token: str | None) -> int | None:
    if not token:
        return None
    try:
        payload = _decode_access_token(token)
        if await is_blacklisted(payload.get("jti")):
            return None
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except JWTError:
        return None
