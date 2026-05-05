"""SourceChunk Modeli

Bu model, PDF veya diğer dokümanlardan çıkarılan metin parçalarını (chunk)
ve bunların vektör (embedding) ile FTS temsillerini tutar.
"""

from typing import Optional
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SourceChunk(Base, TimestampMixin):
    """PDF'ten çıkarılan her bir metin parçasının vektörel karşılığı."""

    __tablename__ = "source_chunks"

    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("academic_sources.id", ondelete="CASCADE"), index=True)
    
    # Metnin kendisi
    content: Mapped[str] = mapped_column(String, nullable=False)
    
    # ── pgvector (Anlamsal Arama) ──
    # multilingual-e5-large modeli 1024 boyutlu vektör üretir
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1024), nullable=True)
    
    # ── PostgreSQL FTS (Anahtar Kelime Araması) ──
    fts_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR, nullable=True)
    
    # Meta Bilgiler
    page_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_size: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_overlap: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # RLHF Geri Bildirim Metrikleri
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=False, default="intfloat/multilingual-e5-large")
    negative_feedback_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    
    # İlişkiler
    source = relationship("AcademicSource", back_populates="chunks")
