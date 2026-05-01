"""RAG Yanıt Modeli (RagResponse).

Kullanıcının sorduğu soruları, sistemin verdiği yanıtları ve bu süreçteki
performans metriklerini (latency) saklar.
Fallback (kaynak bulunamadığı için verilen standart cevap) durumu da izlenir.
"""

from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class RagResponse(Base, TimestampMixin):
    """RAG işlem geçmişi ve AI yanıtları."""

    __tablename__ = "rag_responses"

    # Hangi öğretmen sordu?
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"), index=True)
    
    # Hangi öğrenci bağlamında sordu? (Opsiyonel)
    # Phase 4'te ForeignKey("students.id") eklenecek
    student_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    
    # Sorunun kendisi
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Öğrencinin engel durumu (Yanıtın zorluk seviyesini etkiler)
    disability_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Sınıf seviyesi (1-12)
    grade_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # LLM'in ürettiği yanıt
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Kaynak bulunamadığı için fallback mesajı mı verildi?
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # ── Metrikler (FR-021: Observability) ──
    embedding_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    retrieval_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    llm_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── İlişkiler ──
    teacher = relationship("Teacher")
    # student = relationship("Student") # Phase 4'te açılacak
    
    # Yanıtı üretmek için kullanılan kaynak parçaları (junction table üzerinden)
    used_chunks = relationship("ResponseChunk", back_populates="response", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<RagResponse(id={self.id}, is_fallback={self.is_fallback})>"
