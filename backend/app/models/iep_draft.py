"""IEP Draft (BEP Taslağı) Modeli.

MEB formatına uygun Bireyselleştirilmiş Eğitim Programı taslağı.
İçerik JSONB olarak saklanır — 5 bölümlü MEB şablonu yapısında.

BEP Bölümleri:
  I   - Öğrenci Bilgileri (student_info)
  II  - Eğitsel Performans Formu (performance_assessment)
  III - Bireyselleştirilmiş Eğitim Planı (education_plan)
  IV  - BEP Geliştirme Birim Kararları (unit_decisions)
  V   - BEP Geliştirme Birim Üyeleri (team_members — manuel)
"""

import uuid
from typing import Optional

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class IEPDraft(Base, TimestampMixin):
    """AI tarafından üretilen BEP taslağı."""

    __tablename__ = "iep_drafts"

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
        index=True,
    )

    # BEP içeriği — MEB formatına uygun yapılandırılmış JSON
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Taslak versiyonu — aynı öğrenci için birden fazla BEP üretilebilir
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Durum: draft → reviewed → finalized
    status: Mapped[str] = mapped_column(
        SAEnum("draft", "reviewed", "finalized", name="iep_status_enum"),
        default="draft",
    )

    # Opsiyonel: Öğretmenin BEP hakkındaki notları
    teacher_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # İlişkiler
    student = relationship("Student", backref="iep_drafts")
    teacher = relationship("Teacher", backref="iep_drafts")

    def __repr__(self) -> str:
        return f"<IEPDraft(id={self.id}, student_id={self.student_id}, v{self.version})>"
