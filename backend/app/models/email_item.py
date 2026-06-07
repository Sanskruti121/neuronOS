import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class EmailItem(Base):
    __tablename__ = "email_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    gmail_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=True)
    sender: Mapped[str] = mapped_column(String, nullable=True)
    body_text: Mapped[str] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    priority_score: Mapped[int] = mapped_column(Integer, nullable=True)
    priority_reason: Mapped[str] = mapped_column(Text, nullable=True)
    action_required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="emails")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="source_email")


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    vector: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
