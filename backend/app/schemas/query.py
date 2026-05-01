"""RAG Soru-Cevap (Query) Şemaları.

Kullanıcının sorduğu soru ve asistanın verdiği yanıt için validasyonlar.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QueryRequest(BaseModel):
    """Öğretmenden gelen soru isteği."""
    query: str = Field(..., min_length=3, description="Sorulacak soru")
    
    # İsteğe bağlı bağlam (Context)
    student_id: Optional[UUID] = Field(None, description="Hangi öğrenci için soruluyor?")
    disability_type: Optional[str] = Field(None, description="Engel türü (Otizm, Disleksi vb.)")
    grade_level: Optional[int] = Field(None, ge=1, le=12, description="Sınıf seviyesi (1-12)")


class Citation(BaseModel):
    """Yanıtta kullanılan referans (Atıf)."""
    source_id: UUID
    source_title: str
    source_type: str
    page_numbers: List[int]
    similarity_score: float

    model_config = ConfigDict(from_attributes=True)


class QueryResponse(BaseModel):
    """AI'dan dönen RAG yanıtı."""
    id: UUID = Field(..., description="RagResponse kayıt ID'si (Geri bildirim için kullanılacak)")
    answer: str = Field(..., description="LLM tarafından üretilen yanıt")
    citations: List[Citation] = Field(default_factory=list, description="Kullanılan kaynaklar")
    is_fallback: bool = Field(..., description="Kaynak bulunamadığı için standart cevap mı verildi?")
    
    # Observability
    total_latency_ms: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
