from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from backend.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=False, nullable=False)

    nickname = Column(String(50), nullable=True)
    full_name = Column(String(100), nullable=True)
    photo_path = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    recipes = relationship(
        "Recipe", back_populates="author", cascade="all, delete-orphan", lazy="selectin"
    )
    likes = relationship(
        "Like", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
