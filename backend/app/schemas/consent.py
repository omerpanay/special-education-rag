"""KVKK Rıza Pydantic Şemaları."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentGrantRequest(BaseModel):
    """Rıza verme isteği."""
    student_id: UUID
    consent_types: List[str] = Field(
        ...,
        description="Verilecek rıza türleri: data_processing, ai_analysis, game_participation",
    )


class ConsentRevokeRequest(BaseModel):
    """Rıza iptal isteği."""
    student_id: UUID
    consent_types: List[str]


class ConsentStatusOut(BaseModel):
    """Bir öğrencinin rıza durumu."""
    student_id: UUID
    student_name: str
    data_processing: bool = False
    ai_analysis: bool = False
    game_participation: bool = False
    granted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
