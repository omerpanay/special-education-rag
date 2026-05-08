"""Observation Endpoints — Sesli Gözlem API'si.

Endpoint'ler:
- POST /api/v1/observations/voice        → Ses kaydı → yapılandırılmış gözlem
- POST /api/v1/observations/             → Manuel metin girişi ile gözlem
- GET  /api/v1/observations/{student_id} → Öğrencinin gözlem geçmişi
"""

import logging
import time
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.observation import Observation, ObservationCategory
from app.models.teacher import Teacher
from app.schemas.observation import (
    ObservationCreate,
    ObservationListResponse,
    ObservationOut,
    VoiceObservationResponse,
)
from app.services.observation_service import ObservationService, parse_category, structure_transcript

logger = logging.getLogger("edurag.api.observations")

router = APIRouter(prefix="/observations", tags=["observations"])


# ── Ses ile Gözlem (Voice-to-Action) ──
@router.post(
    "/voice",
    response_model=VoiceObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sesli gözlem kaydı oluştur",
    description=(
        "Öğretmenin ses kaydını alır, Groq Whisper ile metne çevirir, "
        "LLM ile ABC modeline yapılandırır ve veritabanına kaydeder."
    ),
)
async def create_voice_observation(
    student_id: UUID = Form(..., description="Gözlem yapılan öğrenci"),
    audio: UploadFile = File(..., description="Ses dosyası (webm, mp3, wav, m4a)"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> VoiceObservationResponse:
    """Ses kaydından yapılandırılmış gözlem oluştur.

    Neden Form + File (multipart/form-data)?
    Ses dosyası binary, student_id ise string.
    JSON body içinde binary gönderilemez → multipart kullanıyoruz.

    Frontend'den gelen istek:
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('student_id', selectedStudentId);
        fetch('/api/v1/observations/voice', { method: 'POST', body: formData });
    """
    # Dosya boyutu kontrolü (max 25MB — Whisper limiti)
    audio_bytes = await audio.read()
    max_size = 25 * 1024 * 1024  # 25 MB
    if len(audio_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ses dosyası çok büyük: {len(audio_bytes)} bytes (max {max_size})",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ses dosyası boş",
        )

    try:
        result = await ObservationService.process_voice_observation(
            db=db,
            audio_bytes=audio_bytes,
            student_id=student_id,
            teacher_id=current_teacher.id,
            filename=audio.filename or "recording.webm",
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


# ── Manuel Gözlem Girişi ──
@router.post(
    "/",
    response_model=ObservationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Manuel gözlem kaydı oluştur",
)
async def create_manual_observation(
    data: ObservationCreate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ObservationOut:
    """Metin girişi ile doğrudan gözlem oluştur (ses olmadan).

    Sesli kayıt yerine manuel olarak ABC verisi girmek isteyen
    öğretmenler için alternatif endpoint.
    """

    # Eğer öğretmen ABC alanlarını boş bıraktıysa, LLM ile düz metni parçala (Text-to-Action)
    structuring_latency = None
    if not data.antecedent and not data.behavior and not data.consequence:
        t0 = time.time()
        structured_data = await structure_transcript(data.summary)
        t1 = time.time()
        
        # LLM'den gelen verilerle boş alanları doldur
        data.category = structured_data.get("category", data.category)
        data.summary = structured_data.get("summary", data.summary)
        data.antecedent = structured_data.get("antecedent")
        data.behavior = structured_data.get("behavior")
        data.consequence = structured_data.get("consequence")
        structuring_latency = (t1 - t0) * 1000

    category = parse_category(data.category)

    observation = Observation(
        student_id=data.student_id,
        teacher_id=current_teacher.id,
        category=category,
        summary=data.summary,
        antecedent=data.antecedent,
        behavior=data.behavior,
        consequence=data.consequence,
        raw_transcript=data.summary,  # Manuel girişte transcript = summary
        structuring_latency_ms=structuring_latency,
    )
    db.add(observation)
    await db.commit()
    await db.refresh(observation)

    return ObservationOut.model_validate(observation)


# ── Gözlem Listesi ──
@router.get(
    "/{student_id}",
    response_model=ObservationListResponse,
    summary="Öğrencinin gözlem geçmişi",
)
async def get_student_observations(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ObservationListResponse:
    """Belirtilen öğrencinin tüm gözlem kayıtlarını döner.

    Sadece öğretmenin kendi öğrencilerinin gözlemleri görünür.
    Kronolojik sırada (en yeni en üstte).
    """
    try:
        observations = await ObservationService.get_student_observations(
            db=db,
            student_id=student_id,
            teacher_id=current_teacher.id,
        )
        return ObservationListResponse(
            student_id=student_id,
            total=len(observations),
            observations=[
                ObservationOut.model_validate(obs) for obs in observations
            ],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
