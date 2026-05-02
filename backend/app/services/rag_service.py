"""RAG Core Servisi — Soru Cevaplama Orkestratörü.

─── MİMARİ KARAR: Bu servis neden en karmaşık? ───
Çünkü 3 farklı sistemi koordine eder:
1. Retrieval: Veritabanında hibrit arama yap
2. Generation: Bulunan bağlamı LLM'e gönder, yanıt al
3. Observability: Her adımın süresini ölç ve kaydet

─── OBSERVABILITY (GÖZLEMLENEBİLİRLİK) NEDEN ÖNEMLİ? ───
Production'da "sistem yavaş" diye şikayet geldiğinde
darboğazın nerede olduğunu bilmen lazım:
  - Retrieval mı yavaş? → DB index'leri kontrol et
  - LLM mi yavaş? → Model değiştir veya cache ekle
  - Toplam mı yavaş? → İkisini de optimize et

Her soru-cevap etkileşimi DB'ye kaydedilir (RagResponse tablosu).
Bu sayede dashboard'da metrikler gösterilebilir.
"""

import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rag_response import RagResponse
from app.models.response_chunk import ResponseChunk
from app.rag.chain import create_rag_chain
from app.rag.retrieval import retrieve_hybrid_chunks
from app.schemas.query import Citation, QueryRequest, QueryResponse


class RagService:
    """RAG soru-cevap iş mantığı."""

    @staticmethod
    async def ask_question(
        db: AsyncSession,
        request: QueryRequest,
        teacher_id: UUID,
    ) -> QueryResponse:
        """Kullanıcının sorusuna RAG ile cevap üret.

        Akış:
        1. Hibrit arama → En alakalı 5 chunk bul
        2. Chunk'ları formatlı bağlam metnine çevir
        3. LCEL zinciri ile LLM'e sor
        4. Etkileşimi DB'ye kaydet (observability)
        5. Yanıtı döndür
        """
        t0 = time.time()

        # ── 1. RETRIEVAL ──
        chunks_with_scores = await retrieve_hybrid_chunks(
            db=db, query_text=request.query, limit=5
        )
        t1 = time.time()
        retrieval_latency = (t1 - t0) * 1000  # ms

        # ── 2. CONTEXT FORMATTING ──
        # Chunk'ları LLM'in okuyacağı formata çevir
        # Her chunk'ın hangi kaynaktan ve sayfadan geldiğini belirt
        context_parts = []
        for rank, (chunk, score) in enumerate(chunks_with_scores, 1):
            source_title = chunk.source.title if chunk.source else "Bilinmeyen"
            page = chunk.page_numbers[0] if chunk.page_numbers else 0
            context_parts.append(
                f"--- BAĞLAM {rank} (Kaynak: {source_title}, Sayfa: {page}) ---\n"
                f"{chunk.content}\n"
            )

        formatted_context = (
            "\n".join(context_parts) if context_parts
            else "Hiçbir akademik kaynak bulunamadı."
        )

        # ── 3. GENERATION ──
        # Chunk yoksa LLM'i çağırma bile → direkt fallback
        if not chunks_with_scores:
            answer = (
                "Üzgünüm, sağlanan akademik kaynaklarda "
                "bu sorunun cevabı bulunmamaktadır."
            )
        else:
            chain = create_rag_chain()
            answer = await chain.ainvoke({
                "context": formatted_context,
                "question": request.query,
                "disability_type": request.disability_type or "Belirtilmedi",
                "grade_level": (
                    str(request.grade_level) if request.grade_level
                    else "Belirtilmedi"
                ),
            })

        t2 = time.time()
        llm_latency = (t2 - t1) * 1000
        total_latency = (t2 - t0) * 1000

        is_fallback = "bulunmamaktadır" in answer.lower() or not chunks_with_scores

        # ── 4. PERSIST (DB'YE KAYDET) ──
        rag_response = RagResponse(
            teacher_id=str(teacher_id),
            student_id=str(request.student_id) if request.student_id else None,
            query_text=request.query,
            disability_type=request.disability_type,
            grade_level=request.grade_level,
            response_text=answer,
            is_fallback=is_fallback,
            retrieval_latency_ms=retrieval_latency,
            llm_latency_ms=llm_latency,
            total_latency_ms=total_latency,
        )
        db.add(rag_response)
        await db.flush()

        # Hangi chunk'lar kullanıldı → ResponseChunk tablosuna
        citations = []
        for rank, (chunk, score) in enumerate(chunks_with_scores, 1):
            rc = ResponseChunk(
                response_id=rag_response.id,
                chunk_id=chunk.id,
                similarity_score=score,
                rank_position=rank,
            )
            db.add(rc)

            citations.append(Citation(
                source_id=UUID(str(chunk.source_id)),
                source_title=chunk.source.title if chunk.source else "",
                source_type=chunk.source.source_type.value if chunk.source else "",
                page_numbers=chunk.page_numbers,
                similarity_score=round(score, 3),
            ))

        await db.commit()
        await db.refresh(rag_response)

        # ── 5. RETURN ──
        return QueryResponse(
            id=UUID(str(rag_response.id)),
            answer=answer,
            citations=citations,
            is_fallback=is_fallback,
            total_latency_ms=total_latency,
            created_at=rag_response.created_at,
        )
