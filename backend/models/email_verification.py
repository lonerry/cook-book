from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from backend.models.base import Base


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code = Column(String(10), nullable=False, index=True)
    expires_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc) + timedelta(minutes=15),
        nullable=False,
    )
    consumed = Column(Boolean, default=False, nullable=False)

    user = relationship("User")
