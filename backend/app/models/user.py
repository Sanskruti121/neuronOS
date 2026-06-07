import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=True)
    google_access_token: Mapped[str] = mapped_column(Text, nullable=True)
    google_refresh_token: Mapped[str] = mapped_column(Text, nullable=True)
    github_token: Mapped[str] = mapped_column(Text, nullable=True)
    telegram_chat_id: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    emails: Mapped[list["EmailItem"]] = relationship("EmailItem", back_populates="user")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="user")
