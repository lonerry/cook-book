from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from jose import jwt
from passlib.context import CryptContext

from backend.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    to_encode = {
        "sub": subject,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
        "type": "access",
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_reset_token(subject: str) -> str:
    settings = get_settings()
    to_encode = {
        "sub": subject,
        "exp": datetime.now(timezone.utc)
        + timedelta(seconds=settings.reset_token_ttl_seconds),
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
        "type": "reset",
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
