"""Akademik Kaynak (Academic Source) Modeli.

Öğretmenlerin veya sistem yöneticilerinin yüklediği PDF dokümanlarını temsil eder.
- source_type: Kaynağın türü (MEB, YÖK, vb.)
- file_hash: Aynı dosyanın tekrar yüklenmesini engellemek için SHA-256 hash
- is_indexed: Dosya chunk'lanıp vektör veritabanına eklendi mi?
"""

import enum
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SourceType(str, enum.Enum):
    """Kaynağın resmi türü."""
    MEB = "MEB"
    YOK_TEZ = "YOK_TEZ"
    MAKALE = "MAKALE"
    SAGLIK_BAK = "SAGLIK_BAK"


class AcademicSource(Base, TimestampMixin):
    """Akademik kaynak tablosu."""

    __tablename__ = "academic_sources"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type_enum"), 
        nullable=False
    )
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Duplikasyon kontrolü için (FR-014)
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Hangi öğretmen yükledi?
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    
    # Vektör veritabanına işlendi mi?
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # ── İlişkiler ──
    teacher = relationship("Teacher")
    chunks = relationship("SourceChunk", back_populates="source", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<AcademicSource(title={self.title}, is_indexed={self.is_indexed})>"
