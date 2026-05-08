"""RAG Soru-Cevap (Query) Şemaları.

Kullanıcının sorduğu soru ve asistanın verdiği yanıt için validasyonlar.
Adaptive RAG desteği: Yerel (pgvector) ve Web (Tavily) kaynak ayrımı.
"""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QueryRequest(BaseModel):
    """Öğretmenden gelen soru isteği."""
    query: str = Field(..., min_length=3, description="Sorulacak soru")
    
    # İsteğe bağlı bağlam (Context)
    student_id: Optional[UUID] = Field(None, description="Hangi öğrenci için soruluyor?")
    disability_type: Optional[str] = Field(None, description="Engel türü (Otizm, Disleksi vb.)")
    grade_level: Optional[int] = Field(None, ge=1, le=12, description="Sınıf seviyesi (1-12)")
    conversation_id: Optional[UUID] = Field(None, description="Devam eden konuşma ID'si")


class Citation(BaseModel):
    """Yanıtta kullanılan yerel veritabanı referansı (Atıf)."""
    source_id: UUID
    source_title: str
    source_type: str
    page_numbers: List[int]
    similarity_score: float
    source_origin: Literal["local", "web"] = Field("local", description="Kaynak tipi")

    model_config = ConfigDict(from_attributes=True)


class WebCitation(BaseModel):
    """Web aramasından dönen kaynak referansı."""
    title: str = Field(..., description="Web sayfası başlığı")
    url: str = Field(..., description="Kaynak URL'si")
    score: float = Field(0.0, description="Tavily relevance skoru")
    source_origin: Literal["web"] = "web"


class QueryResponse(BaseModel):
    """AI'dan dönen RAG yanıtı — Adaptive RAG desteği ile."""
    id: UUID = Field(..., description="RagResponse kayıt ID'si (Geri bildirim için kullanılacak)")
    answer: str = Field(..., description="LLM tarafından üretilen yanıt")
    citations: List[Citation] = Field(default_factory=list, description="Yerel veritabanı kaynakları")
    web_citations: List[WebCitation] = Field(default_factory=list, description="Web kaynakları")
    is_fallback: bool = Field(..., description="Kaynak bulunamadığı için standart cevap mı verildi?")
    route_decision: Optional[str] = Field(None, description="Adaptive Router kararı (local/web/hybrid)")
    
    # Observability
    total_latency_ms: Optional[float] = None
    created_at: datetime
    conversation_id: Optional[str] = Field(None, description="İlişkili konuşma ID'si")

    model_config = ConfigDict(from_attributes=True)
