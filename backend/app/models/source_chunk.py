"""Kaynak Parçası (Source Chunk) Modeli — Vector DB.

Buradaki en kritik nokta `pgvector` kütüphanesinin kullanımıdır.
Metinler (chunk) `multilingual-e5-large` modeli kullanılarak 1024 boyutlu
vektörlere dönüştürülür ve `embedding` kolonunda saklanır.

Ayrıca PostgreSQL Full Text Search (FTS) için `fts_vector` kullanıyoruz.
"""

from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Integer, String, ForeignKey, Float
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SourceChunk(Base, TimestampMixin):
    """PDF'ten çıkarılan her bir metin parçasının vektörel karşılığı."""

    __tablename__ = "source_chunks"

    source_id: Mapped[str] = mapped_column(ForeignKey("academic_sources.id", ondelete="CASCADE"), index=True)
    
    # Metnin kendisi
    content: Mapped[str] = mapped_column(String, nullable=False)
    
    # ── pgvector (Anlamsal Arama) ──
    # multilingual-e5-large modeli 1024 boyutlu vektör üretir
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1024), nullable=True)
    
    # ── PostgreSQL FTS (Anahtar Kelime Araması) ──
    fts_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR, nullable=True)
    
    # Bu chunk hangi sayfalardan alındı? (Atıf yapabilmek için)
    page_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_size: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_overlap: Mapped[int] = mapped_column(Integer, nullable=False)
    
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Öğretmenler RAG yanıtını "Beğenmedim" diye işaretlediğinde,
    # bu yanıtı oluşturmak için kullanılan chunk'ların ceza puanı artar (FR-013)
    negative_feedback_count: Mapped[int] = mapped_column(Integer, default=0, index=True)

    # ── İlişkiler ──
    source = relationship("AcademicSource", back_populates="chunks")

    def __repr__(self) -> str:
        return f"<SourceChunk(source_id={self.source_id}, idx={self.chunk_index})>"
