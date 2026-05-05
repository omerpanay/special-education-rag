"""IEP/BEP Pydantic Şemaları.

MEB formatına uygun Bireyselleştirilmiş Eğitim Programı
request/response validasyonu.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Request Schemas ──

class IEPGenerateRequest(BaseModel):
    """BEP taslağı üretme isteği."""
    student_id: UUID = Field(..., description="Hangi öğrenci için BEP üretilecek?")
    focus_areas: Optional[List[str]] = Field(
        None,
        description="Odak alanları (ör: ['Türkçe', 'Sosyal Beceri'])",
    )
    additional_notes: Optional[str] = Field(
        None,
        description="Öğretmenin ek notları (ör: 'Görsel materyallerle daha iyi öğreniyor')",
    )


class IEPUpdateRequest(BaseModel):
    """BEP taslağı güncelleme isteği."""
    content: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern="^(draft|reviewed|finalized)$")
    teacher_notes: Optional[str] = None


# ── Response Schemas ──

class IEPResponse(BaseModel):
    """Tek bir BEP taslağı yanıtı."""
    id: UUID
    student_id: UUID
    student_name: str = ""
    content: Dict[str, Any]
    version: int
    status: str
    teacher_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IEPListResponse(BaseModel):
    """Öğrencinin BEP taslakları listesi."""
    items: List[IEPResponse]
    total: int
