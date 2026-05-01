"""Response Chunk Bağlantı Modeli.

Many-to-Many ilişkisi (RagResponse <-> SourceChunk).
Hangi yanıtın, hangi kaynak parçalarına bakarak üretildiğini saklar.
Bu tablo, Geri Bildirim (Feedback) döngüsünün çalışması için kritiktir.
"""

from sqlalchemy import Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ResponseChunk(Base):
    """Yanıt - Kaynak Parçası eşleşme tablosu."""

    __tablename__ = "response_chunks"

    # SQLAlchemy 2.0'da junction table genellikle class olarak tanımlanır
    # çünkü ilişkide ekstra kolonlar (similarity_score vb.) saklıyoruz.

    response_id: Mapped[str] = mapped_column(
        ForeignKey("rag_responses.id", ondelete="CASCADE"), 
        primary_key=True
    )
    
    chunk_id: Mapped[str] = mapped_column(
        ForeignKey("source_chunks.id", ondelete="CASCADE"), 
        primary_key=True
    )
    
    # Vektör araması sonucunda çıkan benzerlik skoru (0.0 - 1.0)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Kaçıncı sırada getirildi? (1. en alakalı)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── İlişkiler ──
    response = relationship("RagResponse", back_populates="used_chunks")
    chunk = relationship("SourceChunk")

    def __repr__(self) -> str:
        return f"<ResponseChunk(resp={self.response_id}, chunk={self.chunk_id}, score={self.similarity_score})>"
