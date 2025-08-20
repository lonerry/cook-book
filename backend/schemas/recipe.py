from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models.recipe import TopicEnum


class IngredientItem(BaseModel):
    name: str = Field(max_length=100)
    quantity: str = Field(max_length=50)


class RecipeStepItem(BaseModel):
    order_index: int
    text: str
    photo_path: Optional[str] = None


class RecipeCreate(BaseModel):
    title: str = Field(max_length=150)
    description: str
    topic: TopicEnum
    ingredients: List[IngredientItem]


class AuthorPublic(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    photo_path: Optional[str] = None


class CommentPublic(BaseModel):
    id: int
    author: AuthorPublic
    content: str
    created_at: datetime
    can_edit: bool
    can_delete: bool


class RecipePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_id: int
    author: Optional[AuthorPublic] = None
    title: str
    description: Optional[str] = None
    topic: TopicEnum
    photo_path: Optional[str] = None
    created_at: datetime
    likes_count: int = 0
    liked_by_me: Optional[bool] = None
    ingredients: List[IngredientItem]
    steps: Optional[List[RecipeStepItem]] = None
    comments: Optional[List[CommentPublic]] = None
