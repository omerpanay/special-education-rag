"""Material (Eğitim Materyali) Şemaları — API Kontratları.

Materyal üretim talebi, durumu ve indirme için gerekli şemaları tanımlar.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SceneOut(BaseModel):
    """Tek bir sahne bilgisi (sosyal öykü için)."""
    order: int
    text: str
    image_prompt: Optional[str] = None
    image_path: Optional[str] = None


class MaterialCreateRequest(BaseModel):
    """Materyal üretim talebi."""
    student_id: UUID = Field(..., description="Hangi öğrenci için?")
    material_type: str = Field(
        "social_story",
        description="Materyal türü: social_story veya pecs_card",
    )
    interest_topic: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Öğrencinin ilgi alanı (ör: Uzay, Dinozorlar, Arabalar)",
    )
    title: Optional[str] = Field(
        None,
        max_length=200,
        description="Materyal başlığı (opsiyonel — otomatik üretilir)",
    )
    scene_count: int = Field(
        3,
        ge=2,
        le=6,
        description="Kaç sahnelik materyal üretilsin (2-6)",
    )


class MaterialOut(BaseModel):
    """Materyal detay çıktısı."""
    id: UUID
    student_id: UUID
    teacher_id: UUID
    material_type: str
    title: str
    interest_topic: str
    status: str
    content: Optional[Dict] = None
    pdf_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaterialListResponse(BaseModel):
    """Öğrencinin materyal listesi."""
    student_id: UUID
    total: int
    materials: List[MaterialOut] = Field(default_factory=list)
