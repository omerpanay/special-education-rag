"""Material (Eğitim Materyali) Modeli — Sosyal Öykü ve PECS Kartı.

─── MİMARİ KARAR: Neden Material tablosu? ───
Agentic Materyal Üretici (LangGraph), öğrencinin ilgi alanına göre
kişiselleştirilmiş eğitim materyalleri üretir:
- Sosyal Öykü: 3-4 sahnelik hikaye + görseller
- PECS Kartı: İletişim için resimli kartlar

Üretim süreci uzun (10-30sn) olabilir, bu yüzden:
- status alanı ile durum takibi (generating → completed → failed)
- content alanı JSONB ile esnek veri yapısı (sahneler, görseller)
- pdf_path ile üretilen PDF'in yolu

─── JSONB CONTENT YAPISI (Sosyal Öykü) ───
{
    "scenes": [
        {
            "order": 1,
            "text": "Ali uzay gemisine bindi...",
            "image_prompt": "A friendly cartoon boy entering a spaceship...",
            "image_path": "/static/materials/abc-123/scene_1.png"
        },
        ...
    ],
    "metadata": {
        "interest_topic": "Uzay",
        "disability_type": "Otizm",
        "total_scenes": 3
    }
}
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MaterialType(str, enum.Enum):
    """Materyal türleri."""
    SOCIAL_STORY = "social_story"
    PECS_CARD = "pecs_card"


class MaterialStatus(str, enum.Enum):
    """Materyal üretim durumu."""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Material(Base, TimestampMixin):
    """Eğitim materyali kaydı.

    Materyal üretim süreci:
    1. Öğretmen talep oluşturur → status = generating
    2. LangGraph pipeline çalışır (Writer → Prompt → Image → PDF)
    3. Başarılıysa → status = completed, pdf_path dolu
    4. Hata varsa → status = failed, error_message dolu
    """
    __tablename__ = "materials"

    # ── İlişkiler ──
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False,
        doc="Materyal hangi öğrenci için üretildi",
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False,
        doc="Materyali talep eden öğretmen",
    )

    # ── Materyal Bilgileri ──
    material_type: Mapped[str] = mapped_column(
        SAEnum(MaterialType, name="material_type_enum"),
        nullable=False,
        doc="Materyal türü (social_story veya pecs_card)",
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False,
        doc="Materyal başlığı (ör: Ali'nin Uzay Macerası)",
    )
    interest_topic: Mapped[str] = mapped_column(
        String(100), nullable=False,
        doc="Öğrencinin ilgi alanı (ör: Dinozorlar, Uzay)",
    )

    # ── İçerik (Esnek JSON) ──
    content: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, default=None,
        doc="Sahneler, görseller ve metadata (JSONB formatında)",
    )

    # ── Durum Takibi ──
    status: Mapped[str] = mapped_column(
        SAEnum(MaterialStatus, name="material_status_enum"),
        default=MaterialStatus.GENERATING,
        nullable=False,
        doc="Üretim durumu",
    )
    pdf_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True,
        doc="Üretilen PDF'in dosya yolu",
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        doc="Hata durumunda açıklama",
    )

    # ── ORM İlişkileri ──
    student = relationship("Student", backref="materials")
    teacher = relationship("Teacher", backref="materials")
