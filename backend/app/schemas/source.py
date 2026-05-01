"""Akademik Kaynak (Source) Şemaları.

Dosya yükleme ve listeleme endpoint'leri için Pydantic validasyonları.
"""

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.academic_source import SourceType


class SourceBase(BaseModel):
    """Ortak kaynak alanları."""
    title: str = Field(..., description="Kaynağın başlığı")
    source_type: SourceType = Field(..., description="Kaynağın türü (MEB, MAKALE vs.)")


class SourceCreate(SourceBase):
    """Dosya yükleme sırasındaki metadata."""
    pass


class SourceResponse(SourceBase):
    """Tekil kaynak dönüş modeli."""
    id: UUID
    file_name: str
    page_count: int
    is_indexed: bool
    created_at: datetime
    uploaded_by: UUID

    model_config = ConfigDict(from_attributes=True)


class SourceListResponse(BaseModel):
    """Kaynak listesi dönüş modeli."""
    total: int
    items: List[SourceResponse]


class SourceUploadResponse(BaseModel):
    """Dosya yükleme başarılı yanıtı."""
    message: str
    source: SourceResponse


class SourceStatusResponse(BaseModel):
    """Vektörleştirme işlemi durumu."""
    id: UUID
    is_indexed: bool
    page_count: int
    message: str
