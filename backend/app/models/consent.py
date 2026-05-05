"""KVKK Rıza (Consent) Modeli.

FR-017: KVKK uyumu — Öğrenci verisi işlenmeden önce
velinin açık rızası alınmalı.

Rıza Türleri:
  - data_processing: Öğrenci kişisel verilerinin işlenmesi
  - ai_analysis: AI ile performans analizi
  - game_participation: Oyun oturumlarına katılım
"""

import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Consent(Base, TimestampMixin):
    """Veli/öğretmen rıza kaydı."""

    __tablename__ = "consents"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False,
    )

    consent_type: Mapped[str] = mapped_column(
        SAEnum(
            "data_processing", "ai_analysis", "game_participation",
            name="consent_type_enum",
        ),
        nullable=False,
    )

    is_granted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Rıza verildiğinde / iptal edildiğinde
    granted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Yasal metin referansı
    legal_text_version: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default="v1.0"
    )

    # İlişkiler
    student = relationship("Student", backref="consents")
    teacher = relationship("Teacher")

    def __repr__(self) -> str:
        return f"<Consent(student_id={self.student_id}, type={self.consent_type}, granted={self.is_granted})>"
