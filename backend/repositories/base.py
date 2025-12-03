from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)

class CRUDRepository(Generic[ModelT]):
    model: Type[ModelT]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: int) -> Optional[ModelT]:
        return await self.db.get(self.model, id)

    async def update(self, obj: ModelT, data: dict) -> ModelT:
        for key, value in data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj
        
    async def list(self, limit: int = 100, offset: int = 0) -> List[ModelT]:
        stmt = select(self.model).offset(offset).limit(limit)
        return list((await self.db.scalars(stmt)).all())

    async def create(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.commit()