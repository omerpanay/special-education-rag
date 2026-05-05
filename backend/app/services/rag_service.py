"""RAG Core Servisi — Soru Cevaplama Orkestratörü.

─── MİMARİ KARAR: Bu servis neden en karmaşık? ───
Çünkü 4 farklı sistemi koordine eder:
1. Retrieval: Veritabanında hibrit arama yap
2. Context Building: Öğrenci profili + konuşma geçmişi
3. Generation: Bulunan bağlamı LLM'e gönder, yanıt al
4. Observability: Her adımın süresini ölç ve kaydet
"""

import logging
import time
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationMessage
from app.models.rag_response import RagResponse
from app.models.response_chunk import ResponseChunk
from app.rag.chain import create_rag_chain
from app.rag.context_builder import ContextBuilder
from app.rag.retrieval import retrieve_hybrid_chunks
from app.schemas.query import Citation, QueryRequest, QueryResponse

logger = logging.getLogger("edurag.rag")


class RagService:
    """RAG soru-cevap iş mantığı."""

    @staticmethod
    async def ask_question(
        db: AsyncSession,
        request: QueryRequest,
        teacher_id: UUID,
        conversation_id: Optional[UUID] = None,
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

        # ── 2.5 ADAPTIVE CONTEXT (Kişiselleştirme) ──
        # student_id verilmişse öğrenci bağlamını oluştur
        student_context = ""
        if request.student_id:
            student_context = await ContextBuilder.build_student_context(
                db=db,
                student_id=request.student_id,
                teacher_id=teacher_id,
            )
            if student_context:
                student_context = (
                    "\nÖğrenci Profil Bağlamı:\n"
                    + student_context
                )

        # ── 2.7 CONVERSATION HISTORY (Multi-Turn) ──
        conversation_context = ""
        conversation = None
        if conversation_id:
            conversation = await _get_conversation(db, conversation_id, teacher_id)
            if conversation and conversation.messages:
                history_parts = []
                # Son 5 mesajı al
                recent = conversation.messages[-10:]  # 5 çift (user+assistant)
                for msg in recent:
                    role_label = "Öğretmen" if msg.role == "user" else "Asistan"
                    history_parts.append(f"{role_label}: {msg.content}")
                if history_parts:
                    conversation_context = (
                        "\n### KONUŞMA GEÇMİŞİ ###\n"
                        + "\n".join(history_parts)
                        + "\n### GEÇMİŞ BİTİŞİ ###\n"
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
                "student_context": student_context + conversation_context,
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

        # ── 5. CONVERSATION PERSISTENCE ──
        response_uuid = UUID(str(rag_response.id))
        if conversation_id and conversation:
            # Mevcut konuşmaya mesaj ekle
            db.add(ConversationMessage(
                conversation_id=conversation.id,
                role="user",
                content=request.query,
            ))
            db.add(ConversationMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=answer,
                rag_response_id=str(response_uuid),
            ))
            await db.commit()

        # ── 6. RETURN ──
        return QueryResponse(
            id=response_uuid,
            answer=answer,
            citations=citations,
            is_fallback=is_fallback,
            total_latency_ms=total_latency,
            created_at=rag_response.created_at,
            conversation_id=str(conversation.id) if conversation else None,
        )

    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        teacher_id: UUID,
        title: str,
        student_id: Optional[UUID] = None,
    ) -> Conversation:
        """Yeni konuşma oluştur."""
        conv = Conversation(
            teacher_id=teacher_id,
            student_id=student_id,
            title=title[:100],  # Başlık max 100 karakter
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv


async def _get_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    teacher_id: UUID,
) -> Optional[Conversation]:
    """Konuşmayı mesajlarıyla birlikte getir."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.teacher_id == teacher_id,
        )
    )
    return result.scalar_one_or_none()
