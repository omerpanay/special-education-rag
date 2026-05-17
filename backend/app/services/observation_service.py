"""Observation Service — Sesli Gözlem Orkestratörü.

─── MİMARİ KARAR: Neden bu servis ayrı? ───
Voice-to-Action pipeline 3 farklı sistemi koordine eder:
1. Groq Whisper API → Ses → Metin (transkripsiyon)
2. Groq LLM + Structured Output → Metin → ABC yapısı
3. Database → Yapılandırılmış veri → Kalıcı kayıt

─── NEDEN GROQ WHISPER? ───
- OpenAI Whisper: Doğru ama yavaş (~5-10sn)
- Groq Whisper: Aynı model (whisper-large-v3) ama LPU ile ~1sn
- Ücretsiz tier: Yeterli limit
- whisper-large-v3-turbo: Daha hızlı, biraz daha az doğru

─── STRUCTURED OUTPUT YAKLAŞIMI ───
LLM'den doğrudan Pydantic nesnesi almak yerine,
JSON formatında çıktı isteyip parse ediyoruz.
Groq'un structured output desteği ile bu güvenilir çalışır.
"""

import json
import logging
import time
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.observation import Observation, ObservationCategory
from app.models.student import Student
from app.schemas.observation import ObservationOut, VoiceObservationResponse

settings = get_settings()
logger = logging.getLogger("edurag.observation")

# ── Structured Output Prompt ──
# This prompt instructs the LLM to extract ABC model from transcript
STRUCTURING_PROMPT = """You are an expert behavior analyst specializing in special education.
Extract structured information from the teacher's observation transcript below.

OUTPUT FORMAT (Return only JSON, nothing else):
{{
  "category": "<Behavior|Academic|Crisis|Social|Communication>",
  "summary": "<1-2 sentence summary of the observation>",
  "antecedent": "<Event or context BEFORE the behavior. Even if not explicitly stated in the transcript, infer from context. For example, 'during class' is a trigger>",
  "behavior": "<The observed behavior — what the student did>",
  "consequence": "<What happened AFTER the behavior — the teacher's response or student's outcome>"
}}

RULES:
1. category MUST be one of the 5 options above (in English)
2. summary, antecedent, behavior, consequence fields MUST ALL be filled
3. Even if not explicitly stated in the transcript, make reasonable inferences from context — do NOT use null
4. ALL text MUST be in English. If the transcript is in another language, translate your output to English.
5. Return only JSON, no explanations

TRANSCRIPT:
{transcript}
"""


class ObservationService:
    """Sesli gözlem işleme servisi."""

    @staticmethod
    async def process_voice_observation(
        db: AsyncSession,
        audio_bytes: bytes,
        student_id: UUID,
        teacher_id: UUID,
        filename: str = "recording.webm",
    ) -> VoiceObservationResponse:
        """Ses kaydını işle → transkribe et → yapılandır → kaydet.

        Akış:
        1. Groq Whisper API'ye ses gönder → transkript al
        2. Transkripti Groq LLM'e gönder → ABC yapısı al
        3. Yapılandırılmış veriyi DB'ye kaydet
        4. Sonucu döndür

        Args:
            audio_bytes: Ham ses verisi (webm, mp3, wav, m4a)
            student_id: Hangi öğrenci için
            teacher_id: Kim kaydediyor
            filename: Dosya adı (content-type için)

        Returns:
            VoiceObservationResponse: Yapılandırılmış gözlem + metrikler
        """
        t0 = time.time()

        # ── 1. TRANSKRİPSİYON (Groq Whisper) ──
        transcript = await _transcribe_audio(audio_bytes, filename)
        t1 = time.time()
        transcription_latency = (t1 - t0) * 1000

        logger.info(
            f"transkripsiyon_tamamlandi sure_ms={transcription_latency} metin_uzunluk={len(transcript)}"
        )

        # ── 2. YAPILANDIRMA (Groq LLM Structured Output) ──
        structured_data = await structure_transcript(transcript)
        t2 = time.time()
        structuring_latency = (t2 - t1) * 1000

        logger.info(
            f"yapilandirma_tamamlandi sure_ms={structuring_latency} kategori={structured_data.get('category', '?')}"
        )

        # ── 3. VERİTABANINA KAYDET ──
        # Kategoriyi enum'a çevir (güvenli fallback ile)
        category = parse_category(structured_data.get("category", "Davranış"))

        observation = Observation(
            student_id=student_id,
            teacher_id=teacher_id,
            category=category,
            summary=structured_data.get("summary", transcript[:200]),
            antecedent=structured_data.get("antecedent"),
            behavior=structured_data.get("behavior"),
            consequence=structured_data.get("consequence"),
            raw_transcript=transcript,
            audio_duration_ms=None,  # Frontend'den gelecek (opsiyonel)
            transcription_latency_ms=transcription_latency,
            structuring_latency_ms=structuring_latency,
        )
        db.add(observation)
        await db.commit()
        await db.refresh(observation)

        # ── 4. RESPONSE OLUŞTUR ──
        return VoiceObservationResponse(
            observation=ObservationOut.model_validate(observation),
            processing_info={
                "transcription_ms": round(transcription_latency, 1),
                "structuring_ms": round(structuring_latency, 1),
                "total_ms": round((t2 - t0) * 1000, 1),
                "transcript_length": len(transcript),
            },
        )

    @staticmethod
    async def get_student_observations(
        db: AsyncSession,
        student_id: UUID,
        teacher_id: UUID,
        limit: int = 50,
    ) -> list[Observation]:
        """Öğrencinin gözlem geçmişini getir.

        Sadece ilgili öğretmenin öğrencisinin gözlemlerini döner.
        """
        # Öğrencinin bu öğretmene ait olduğunu doğrula
        student_result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.teacher_id == teacher_id,
            )
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError("Öğrenci bulunamadı veya erişim izniniz yok")

        result = await db.execute(
            select(Observation)
            .where(Observation.student_id == student_id)
            .order_by(Observation.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


# ═══════════════════════════════════════════
# Private Helper Fonksiyonları
# ═══════════════════════════════════════════

async def _transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Groq Whisper API ile ses → metin dönüşümü.

    Groq REST API kullanıyoruz (SDK yerine httpx ile).
    Neden? Daha az bağımlılık, daha fazla kontrol.

    API endpoint: https://api.groq.com/openai/v1/audio/transcriptions
    Model: whisper-large-v3-turbo (hız/doğruluk dengesi)
    """
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY ayarlanmamış — ses işleme yapılamaz")

    # Content type'ı dosya uzantısından belirle
    content_type_map = {
        ".webm": "audio/webm",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
    }
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".webm"
    content_type = content_type_map.get(ext, "audio/webm")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
            },
            files={
                "file": (filename, audio_bytes, content_type),
            },
            data={
                "model": settings.whisper_model,
                "language": "tr",        # Türkçe optimizasyonu
                "response_format": "text",
            },
        )

        if response.status_code != 200:
            logger.error(
                f"whisper_api_hatasi status={response.status_code} detail={response.text[:200]}"
            )
            raise ValueError(f"Whisper API hatası: {response.status_code}")

        transcript = response.text.strip()

        if not transcript:
            raise ValueError("Ses kaydından metin çıkarılamadı — kayıt boş olabilir")

        return transcript


async def structure_transcript(transcript: str) -> dict:
    """Groq LLM ile transkripti ABC modeline yapılandır.

    Structured Output yaklaşımı:
    1. Prompt'ta JSON formatı belirt
    2. temperature=0 (deterministik)
    3. JSON parse et
    4. Parse hatası → güvenli fallback
    """
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_groq import ChatGroq

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a JSON generator assistant. Return only valid JSON."),
        ("human", STRUCTURING_PROMPT),
    ])

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name=settings.llm_model,
        temperature=0.0,    # Yapılandırma deterministik olmalı
        max_tokens=500,     # ABC yapısı kısa
    )

    chain = prompt | llm | StrOutputParser()
    response = await chain.ainvoke({"transcript": transcript})

    # JSON parse — toleranslı
    try:
        # Bazen LLM markdown code block içinde döner: ```json ... ```
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1]  # İlk satırı at
            clean = clean.rsplit("```", 1)[0]  # Son ``` at
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError) as e:
        logger.warning(
            f"json_parse_hatasi error={e} raw_response={response[:200]}"
        )
        # Fallback: En azından summary'yi transkriptten al
        return {
            "category": "Behavior",
            "summary": transcript[:200],
            "antecedent": None,
            "behavior": None,
            "consequence": None,
        }


def parse_category(category_str: str) -> ObservationCategory:
    """Convert category string to enum (with safe fallback).

    LLM output may not always match exactly:
    - "behavior" → BEHAVIOR ✅
    - "Behavioral" → BEHAVIOR ✅ (fuzzy match)
    - "Davranış" → BEHAVIOR ✅ (Turkish legacy support)
    - "xyz" → BEHAVIOR (fallback)
    """
    category_map = {
        # English categories (primary)
        "behavior": ObservationCategory.BEHAVIOR,
        "academic": ObservationCategory.ACADEMIC,
        "crisis": ObservationCategory.CRISIS,
        "social": ObservationCategory.SOCIAL,
        "communication": ObservationCategory.COMMUNICATION,
        # Turkish categories (legacy support)
        "davranış": ObservationCategory.BEHAVIOR,
        "akademik": ObservationCategory.ACADEMIC,
        "kriz": ObservationCategory.CRISIS,
        "sosyal": ObservationCategory.SOCIAL,
        "iletişim": ObservationCategory.COMMUNICATION,
    }

    normalized = category_str.lower().strip()

    # Exact match
    if normalized in category_map:
        return category_map[normalized]

    # Fuzzy match — search for keyword inside category string
    for key, value in category_map.items():
        if key in normalized:
            return value

    # Fallback
    return ObservationCategory.BEHAVIOR
