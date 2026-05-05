"""Conversation (Konuşma) Modelleri — Multi-Turn RAG.

Öğretmenin asistanla çok-aşamalı diyalog kurmasını sağlar.
"Bu stratejinin alternatifi ne?" gibi devam soruları artık çalışır.

Yapı:
  Conversation → 1:N → ConversationMessage
  ConversationMessage.role: 'user' | 'assistant'
"""

import uuid
from typing import Optional

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Conversation(Base, TimestampMixin):
    """Öğretmen-asistan konuşma oturumu."""

    __tablename__ = "conversations"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Konuşma hangi öğrenci bağlamında? (opsiyonel)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Başlık — ilk sorudan otomatik üretilir
    title: Mapped[str] = mapped_column(Text, nullable=False)

    # İlişkiler
    teacher = relationship("Teacher", backref="conversations")
    student = relationship("Student", backref="conversations")
    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, title='{self.title[:30]}...')>"


class ConversationMessage(Base, TimestampMixin):
    """Konuşma içindeki tek bir mesaj."""

    __tablename__ = "conversation_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # user | assistant
    role: Mapped[str] = mapped_column(
        SAEnum("user", "assistant", name="message_role_enum"),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Asistan mesajları için ilişkili RAG yanıtı (opsiyonel)
    rag_response_id: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
    )

    # İlişkiler
    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message(role={self.role}, len={len(self.content)})>"
