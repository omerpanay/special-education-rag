"""IEP/BEP Servis Katmanı.

MEB formatına uygun Bireyselleştirilmiş Eğitim Programı taslağı üretir.

Akış:
  1. Öğrenci profilini çek (engel türü, sınıf, notlar)
  2. RAG retrieval ile engel türüne uygun stratejiler ara
  3. IEP prompt template ile LLM'e gönder (max_tokens=2048)
  4. JSON output parse et
  5. IEPDraft tablosuna kaydet
"""

import json
import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.iep_draft import IEPDraft
from app.models.student import Student
from app.rag.iep_prompts import get_iep_prompt
from app.rag.retrieval import retrieve_hybrid_chunks
from app.schemas.iep import (
    IEPGenerateRequest,
    IEPListResponse,
    IEPResponse,
    IEPUpdateRequest,
)

logger = logging.getLogger("edurag.iep")
settings = get_settings()

# Engel türü → Türkçe eğitsel tanı eşleme
DISABILITY_LABELS = {
    "disleksi": "Özel Öğrenme Güçlüğü (Disleksi)",
    "otizm": "Otizm Spektrum Bozukluğu",
    "zihin_yetersizligi": "Zihinsel Yetersizlik",
    "isitme": "İşitme Yetersizliği",
    "bedensel": "Bedensel Yetersizlik",
    "dehb": "Dikkat Eksikliği ve Hiperaktivite Bozukluğu",
}

# Engel türüne göre varsayılan odak alanları
DEFAULT_FOCUS_AREAS = {
    "disleksi": ["Türkçe — Okuma", "Türkçe — Yazma", "Dikkat ve Konsantrasyon"],
    "otizm": ["İletişim Becerileri", "Sosyal Beceriler", "Davranış Düzenleme"],
    "zihin_yetersizligi": ["Öz Bakım Becerileri", "Akademik — Türkçe", "Akademik — Matematik", "Günlük Yaşam"],
    "isitme": ["Alıcı Dil Becerileri", "İfade Edici Dil Becerileri", "Akademik — Türkçe"],
    "bedensel": ["Psikomotor Beceriler", "Akademik Uyarlama"],
    "dehb": ["Dikkat ve Odaklanma", "Sosyal Beceriler", "Akademik Yapılandırma"],
}


class IEPService:
    """MEB BEP formatında IEP taslağı yönetim servisi."""

    @staticmethod
    async def generate(
        db: AsyncSession,
        teacher_id: UUID,
        request: IEPGenerateRequest,
    ) -> IEPDraft:
        """Yeni BEP taslağı üret.

        1. Öğrenci profilini çek
        2. RAG ile akademik kaynaklardan engel türüne uygun bilgi çek
        3. LLM ile MEB formatında BEP taslağı üret
        4. Veritabanına kaydet
        """
        # ── 1. Öğrenci profili ──
        result = await db.execute(
            select(Student).where(
                Student.id == request.student_id,
                Student.teacher_id == teacher_id,
            )
        )
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(
                status_code=404,
                detail="Öğrenci bulunamadı veya bu öğrenci size ait değil.",
            )

        disability_label = DISABILITY_LABELS.get(
            student.disability_type, student.disability_type
        )

        # ── 2. RAG retrieval — engel türüne uygun stratejiler ──
        rag_query = (
            f"{disability_label} öğrenciler için eğitim hedefleri, "
            f"öğretim yöntemleri ve bireyselleştirilmiş eğitim stratejileri"
        )

        try:
            chunks_with_scores = await retrieve_hybrid_chunks(
                db=db,
                query_text=rag_query,
                limit=5,
            )
            rag_context_parts = []
            for rank, (chunk, score) in enumerate(chunks_with_scores, 1):
                source_title = chunk.source.title if chunk.source else "Bilinmeyen"
                rag_context_parts.append(
                    f"[Kaynak {rank}: {source_title}]\n{chunk.content}\n"
                )
            rag_context = "\n".join(rag_context_parts) if rag_context_parts else "Akademik kaynak bulunamadı."
        except Exception as e:
            logger.warning(f"RAG retrieval hatası: {e}")
            rag_context = "Akademik kaynak erişimi sırasında hata oluştu."

        # ── 3. Focus areas ──
        focus_areas = request.focus_areas or DEFAULT_FOCUS_AREAS.get(
            student.disability_type, ["Genel Akademik", "Sosyal Beceriler"]
        )
        focus_areas_text = ", ".join(focus_areas)

        # ── 4. LLM ile BEP taslağı üret ──
        prompt = get_iep_prompt()
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.llm_model,
            temperature=0.2,  # Biraz daha yaratıcı, ama güvenilir
            max_tokens=3000,  # BEP için daha uzun output
        )
        output_parser = StrOutputParser()
        chain = prompt | llm | output_parser

        additional_context = ""
        if request.additional_notes:
            additional_context = f"Öğretmenin Ek Notları: {request.additional_notes}"

        try:
            raw_output = await chain.ainvoke({
                "student_name": student.name,
                "disability_type": disability_label,
                "grade_level": str(student.grade_level),
                "competency_notes": student.competency_notes or "Belirtilmedi",
                "rag_context": rag_context,
                "focus_areas": focus_areas_text,
                "additional_context": additional_context,
            })

            # JSON parse — LLM bazen ekstra metin ekleyebilir
            bep_content = _extract_json(raw_output)

        except json.JSONDecodeError as e:
            logger.error(f"BEP JSON parse hatası: {e}\nRaw output: {raw_output[:500]}")
            # Fallback — temel yapı oluştur
            bep_content = _create_fallback_content(
                student, disability_label, focus_areas
            )
        except Exception as e:
            logger.error(f"BEP üretim hatası: {e}")
            raise HTTPException(
                status_code=500,
                detail="BEP taslağı üretilirken bir hata oluştu. Lütfen tekrar deneyin.",
            )

        # ── 5. Version hesapla ──
        version_result = await db.execute(
            select(func.count()).where(
                IEPDraft.student_id == request.student_id,
                IEPDraft.teacher_id == teacher_id,
            )
        )
        version = (version_result.scalar() or 0) + 1

        # ── 6. Veritabanına kaydet ──
        draft = IEPDraft(
            student_id=request.student_id,
            teacher_id=teacher_id,
            content=bep_content,
            version=version,
            status="draft",
            teacher_notes=request.additional_notes,
        )
        db.add(draft)
        await db.commit()
        await db.refresh(draft)

        logger.info(
            f"BEP taslağı üretildi: student={student.name}, version={version}"
        )

        return draft

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        iep_id: UUID,
        teacher_id: UUID,
    ) -> IEPDraft:
        """Belirli bir BEP taslağını getir."""
        result = await db.execute(
            select(IEPDraft).where(
                IEPDraft.id == iep_id,
                IEPDraft.teacher_id == teacher_id,
            )
        )
        draft = result.scalar_one_or_none()
        if not draft:
            raise HTTPException(status_code=404, detail="BEP taslağı bulunamadı.")
        return draft

    @staticmethod
    async def list_by_student(
        db: AsyncSession,
        student_id: UUID,
        teacher_id: UUID,
    ) -> list[IEPDraft]:
        """Öğrencinin tüm BEP taslaklarını listele."""
        result = await db.execute(
            select(IEPDraft)
            .where(
                IEPDraft.student_id == student_id,
                IEPDraft.teacher_id == teacher_id,
            )
            .order_by(IEPDraft.version.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession,
        iep_id: UUID,
        teacher_id: UUID,
        request: IEPUpdateRequest,
    ) -> IEPDraft:
        """BEP taslağını güncelle (öğretmen düzeltmeleri)."""
        draft = await IEPService.get_by_id(db, iep_id, teacher_id)

        if request.content is not None:
            draft.content = request.content
        if request.status is not None:
            draft.status = request.status
        if request.teacher_notes is not None:
            draft.teacher_notes = request.teacher_notes

        await db.commit()
        await db.refresh(draft)
        return draft


def _extract_json(raw: str) -> dict:
    """LLM çıktısından JSON kısmını ayıkla.

    LLM bazen JSON'dan önce/sonra açıklama ekleyebilir.
    Bu fonksiyon ilk { ile son } arasındaki kısmı parse eder.
    """
    # Markdown code block varsa temizle
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)

    # İlk { ile son } arasını bul
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start == -1 or end == -1:
        raise json.JSONDecodeError("JSON bulunamadı", cleaned, 0)

    json_str = cleaned[start:end + 1]
    return json.loads(json_str)


def _create_fallback_content(
    student: Student,
    disability_label: str,
    focus_areas: list[str],
) -> dict:
    """LLM JSON parse başarısız olduğunda temel BEP yapısı oluştur."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "student_info": {
            "name": student.name,
            "grade_level": student.grade_level,
            "disability_type": disability_label,
            "educational_diagnosis": disability_label,
            "environment_adjustments": "Öğretmen tarafından doldurulacak",
        },
        "performance_assessment": {
            "development_history": student.competency_notes or "Öğretmen tarafından doldurulacak",
            "areas": [
                {
                    "area_name": area,
                    "performance_level": "Değerlendirme yapılacak",
                    "behavior_problems": None,
                }
                for area in focus_areas
            ],
        },
        "education_plan": [
            {
                "development_area": area,
                "long_term_goal": f"{area} alanında becerilerini geliştirir",
                "short_term_goals": [
                    {
                        "goal": "Öğretmen tarafından belirlenecek",
                        "behaviors": [],
                        "criterion": "4/5 (%80)",
                        "methods": ["Doğrudan öğretim"],
                        "materials": ["Çalışma kağıdı"],
                        "start_date": today,
                        "end_date": today,
                        "evaluation_method": "Gözlem",
                        "evaluation_dates": "Her 2 haftada bir",
                        "result": None,
                    }
                ],
                "environment_adjustments": "",
            }
            for area in focus_areas
        ],
        "unit_decisions": {
            "school_services": [],
            "family_info_frequency": "Ayda bir",
            "family_info_method": "Yüz yüze toplantı",
            "family_education": True,
            "family_education_method": "Öğretmen tarafından belirlenecek",
        },
    }
