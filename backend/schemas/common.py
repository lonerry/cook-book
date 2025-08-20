from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class PhotoResponse(BaseModel):
    photo_path: str


class DeleteResponse(BaseModel):
    deleted: bool


class LikeResponse(BaseModel):
    liked: bool
    likes_count: int
