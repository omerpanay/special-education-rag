"""Feedback (Geri Bildirim) Modeli.

Öğretmenin bir RAG yanıtına verdiği değerlendirme.
Bir yanıta bir öğretmen yalnızca 1 kez geri bildirim verebilir.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedbacks"
    __table_args__ = (
        UniqueConstraint("response_id", "teacher_id", name="uq_feedback_response_teacher"),
    )

    response_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_responses.id"), nullable=False
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False
    )
    is_helpful: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # İlişkiler
    response = relationship("RagResponse", backref="feedbacks")
    teacher = relationship("Teacher", backref="feedbacks")
