from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    is_active: bool
    nickname: Optional[str] = None
    full_name: Optional[str] = None
    photo_path: Optional[str] = None


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    full_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=6, max_length=128)  # type: ignore[arg-type]
    new_password: str = Field(min_length=6, max_length=128)  # type: ignore[arg-type]
