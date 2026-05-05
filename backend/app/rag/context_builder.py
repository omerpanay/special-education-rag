"""Adaptive Context Builder — Öğrenci Bağlamını RAG Prompt'una Enjekte Eder.

─── MİMARİ KARAR: Neden Context Builder? ───
Mevcut RAG pipeline tüm öğrencilere aynı yanıtı veriyor.
"Disleksili 3. sınıf" seçilse bile, öğrencinin GELİŞİM DÜZEYİ bilinmiyor.

Bu modül öğrenci profilini + birikmiş verileri analiz eder ve
RAG prompt'una "adaptif bağlam" olarak enjekte eder.

─── VERİ AKIŞI ───
Student profili  ──┐
Feedback verisi  ──┤──→ ContextBuilder.build() ──→ Formatlanmış metin
RAG yanıt sayısı ──┘
    ↓
HUMAN_TEMPLATE'e {student_context} olarak eklenir
    ↓
LLM artık öğrencinin profilini bilerek yanıt verir
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.models.rag_response import RagResponse
from app.models.student import Student


class ContextBuilder:
    """Öğrenci bağlam bilgisini RAG prompt'u için hazırlar."""

    @staticmethod
    async def build_student_context(
        db: AsyncSession,
        student_id: UUID,
        teacher_id: UUID,
    ) -> str:
        """Öğrenci profilinden RAG prompt'una eklenecek bağlam metni üretir.

        Toplanan veriler:
        1. Öğrenci profil bilgileri (engel türü, sınıf, yetkinlik notları)
        2. Öğretmenin bu öğrenci için yaptığı toplam sorgu sayısı
        3. Geri bildirim istatistikleri (faydalı/faydalı değil oranı)

        Returns:
            Formatlanmış bağlam metni veya boş string (öğrenci bulunamazsa)
        """
        # ── 1. Öğrenci profilini çek ──
        result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.teacher_id == teacher_id,
            )
        )
        student = result.scalar_one_or_none()
        if not student:
            return ""

        # ── 2. Bu öğrenci için yapılmış RAG sorgu sayısı ──
        query_count_result = await db.execute(
            select(func.count()).where(
                RagResponse.student_id == str(student_id),
                RagResponse.teacher_id == str(teacher_id),
            )
        )
        total_queries = query_count_result.scalar() or 0

        # ── 3. Geri bildirim istatistikleri ──
        # Bu öğrenci bağlamında verilen yanıtlara gelen feedback'ler
        feedback_stats = await _get_feedback_stats(db, student_id, teacher_id)

        # ── 4. Engel türü etiketlerini Türkçeye çevir ──
        disability_labels = {
            "disleksi": "Özel Öğrenme Güçlüğü (Disleksi)",
            "otizm": "Otizm Spektrum Bozukluğu",
            "zihin_yetersizligi": "Zihinsel Yetersizlik",
            "isitme": "İşitme Yetersizliği",
            "bedensel": "Bedensel Yetersizlik",
            "dehb": "Dikkat Eksikliği ve Hiperaktivite Bozukluğu",
        }
        disability_label = disability_labels.get(
            student.disability_type, student.disability_type
        )

        # ── 5. Bağlam metnini formatla ──
        context_lines = [
            f"Öğrenci Adı: {student.name}",
            f"Eğitsel Tanı: {disability_label}",
            f"Sınıf Seviyesi: {student.grade_level}. Sınıf",
        ]

        if student.competency_notes:
            context_lines.append(
                f"Öğretmen Yetkinlik Notları: {student.competency_notes}"
            )

        if total_queries > 0:
            context_lines.append(
                f"Bu öğrenci için daha önce {total_queries} sorgu yapılmış."
            )

        if feedback_stats["total"] > 0:
            helpful_pct = (
                feedback_stats["helpful"] / feedback_stats["total"] * 100
            )
            context_lines.append(
                f"Yanıt memnuniyet oranı: %{helpful_pct:.0f} "
                f"({feedback_stats['helpful']}/{feedback_stats['total']} faydalı)"
            )

        return "\n".join(context_lines)


async def _get_feedback_stats(
    db: AsyncSession,
    student_id: UUID,
    teacher_id: UUID,
) -> dict:
    """Öğrenci bağlamındaki yanıtlara verilen geri bildirim istatistikleri."""
    # Bu öğrenci için yapılan RAG yanıtlarının ID'lerini bul
    response_ids_result = await db.execute(
        select(RagResponse.id).where(
            RagResponse.student_id == str(student_id),
            RagResponse.teacher_id == str(teacher_id),
        )
    )
    response_ids = [str(row[0]) for row in response_ids_result.all()]

    if not response_ids:
        return {"total": 0, "helpful": 0, "not_helpful": 0}

    # Bu yanıtlara verilen feedback'leri say
    total_result = await db.execute(
        select(func.count()).where(
            Feedback.response_id.in_(response_ids)
        )
    )
    total = total_result.scalar() or 0

    helpful_result = await db.execute(
        select(func.count()).where(
            Feedback.response_id.in_(response_ids),
            Feedback.is_helpful.is_(True),
        )
    )
    helpful = helpful_result.scalar() or 0

    return {
        "total": total,
        "helpful": helpful,
        "not_helpful": total - helpful,
    }
"""
Description: ContextBuilder, öğrenci profilini + feedback istatistiklerini
analiz ederek RAG prompt'una enjekte edilecek kişiselleştirme bağlamı üretir.
Bu sayede aynı soru farklı öğrenci profilleri için farklı pedagojik
stratejiler önerecektir.
"""
