"""Observation (Gözlem) Modeli — Öğrenci Davranış Takibi.

─── MİMARİ KARAR: Neden Observation tablosu? ───
Özel eğitimde öğrenci davranışlarını sistematik olarak takip etmek
en kritik görevlerden biridir. ABC (Antecedent-Behavior-Consequence)
modeli, uygulamalı davranış analizinde (ABA) altın standarttır.

Bu model, öğretmenin sesli gözlemlerini yapılandırılmış veriye
dönüştürerek kayıt altına alır.

─── SES → YAPI AKIŞI ───
1. Öğretmen ses kaydı yapar
2. Groq Whisper → metin (transkript)
3. Groq LLM + Structured Output → ABC modeli
4. Bu tabloya kaydedilir
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import (
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ObservationCategory(str, enum.Enum):
    """Gözlem kategorileri — Özel eğitim standartlarına göre."""
    BEHAVIOR = "Davranış"
    ACADEMIC = "Akademik"
    CRISIS = "Kriz"
    SOCIAL = "Sosyal"
    COMMUNICATION = "İletişim"


class Observation(Base, TimestampMixin):
    """Öğrenci davranış gözlem kaydı.

    ABC Modeli (Applied Behavior Analysis):
    - Antecedent: Davranıştan hemen önce ne oldu? (Tetikleyici)
    - Behavior: Ne gözlemlendi? (Davranışın kendisi)
    - Consequence: Davranışın ardından ne oldu? (Sonuç)
    """
    __tablename__ = "observations"

    # ── İlişkiler ──
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False,
        doc="Gözlem yapılan öğrenci",
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False,
        doc="Gözlemi kaydeden öğretmen",
    )

    # ── ABC Modeli ──
    category: Mapped[str] = mapped_column(
        SAEnum(ObservationCategory, name="observation_category_enum"),
        nullable=False,
        doc="Gözlem kategorisi (Davranış, Akademik, Kriz...)",
    )
    summary: Mapped[str] = mapped_column(
        Text, nullable=False,
        doc="Gözlemin kısa özeti (LLM tarafından üretilir)",
    )
    antecedent: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="ABC: Tetikleyici — Davranıştan önce ne oldu?",
    )
    behavior: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="ABC: Davranış — Ne gözlemlendi?",
    )
    consequence: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="ABC: Sonuç — Davranışın ardından ne oldu?",
    )

    # ── Ham Veri ──
    raw_transcript: Mapped[str] = mapped_column(
        Text, nullable=False,
        doc="Whisper'dan gelen orijinal transkript",
    )

    # ── Observability ──
    audio_duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        doc="Ses kaydı süresi (milisaniye)",
    )
    transcription_latency_ms: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True,
        doc="Whisper transkripsiyon süresi (ms)",
    )
    structuring_latency_ms: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True,
        doc="LLM yapılandırma süresi (ms)",
    )

    # ── ORM İlişkileri ──
    student = relationship("Student", backref="observations")
    teacher = relationship("Teacher", backref="observations")
