"""Observation (Gözlem) Şemaları — API Kontratları.

Öğretmenin sesli gözlemlerinden üretilen yapılandırılmış verilerin
request/response formatlarını tanımlar.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ObservationCreate(BaseModel):
    """Manuel metin girişi ile gözlem oluşturma (opsiyonel alternatif)."""
    student_id: UUID = Field(..., description="Hangi öğrenci için?")
    category: str = Field(..., description="Gözlem kategorisi")
    summary: str = Field(..., min_length=5, description="Gözlem özeti")
    antecedent: Optional[str] = Field(None, description="ABC: Tetikleyici")
    behavior: Optional[str] = Field(None, description="ABC: Davranış")
    consequence: Optional[str] = Field(None, description="ABC: Sonuç")


class ObservationOut(BaseModel):
    """Tek bir gözlem kaydının API çıktısı."""
    id: UUID
    student_id: UUID
    category: str
    summary: str
    antecedent: Optional[str] = None
    behavior: Optional[str] = None
    consequence: Optional[str] = None
    raw_transcript: str
    audio_duration_ms: Optional[int] = None
    transcription_latency_ms: Optional[float] = None
    structuring_latency_ms: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VoiceObservationRequest(BaseModel):
    """Sesli gözlem isteği için metadata.

    Not: Ses dosyası multipart/form-data olarak ayrı gönderilir.
    Bu şema sadece ek metadata'yı validate eder.
    """
    student_id: UUID = Field(..., description="Hangi öğrenci için gözlem yapılıyor?")


class VoiceObservationResponse(BaseModel):
    """Sesli gözlem işlemi sonucu."""
    observation: ObservationOut
    processing_info: dict = Field(
        default_factory=dict,
        description="Transkripsiyon ve yapılandırma süreleri",
    )


class ObservationListResponse(BaseModel):
    """Öğrencinin gözlem listesi."""
    student_id: UUID
    total: int
    observations: List[ObservationOut] = Field(default_factory=list)
