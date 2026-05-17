"""RAG Core Service — Question-Answering Orchestrator (Adaptive RAG).

Coordinates 5 systems:
1. Retrieval: Hybrid search in the vector database
2. Adaptive Router: Is local sufficient? Web needed?
3. Context Building: Student profile + conversation history + web results
4. Generation: Send unified context to LLM, generate response
5. Observability: Measure latency at each step
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
from app.rag.adaptive_router import RouteType, route_query
from app.rag.chain import create_rag_chain
from app.rag.context_builder import ContextBuilder
from app.rag.retrieval import retrieve_hybrid_chunks
from app.rag.web_search import (
    WebSearchResult,
    format_web_results_as_context,
    search_web,
)
from app.schemas.query import Citation, QueryRequest, QueryResponse, WebCitation

logger = logging.getLogger("edurag.rag")


class RagService:
    """RAG question-answering business logic."""

    @staticmethod
    async def ask_question(
        db: AsyncSession,
        request: QueryRequest,
        teacher_id: UUID,
        conversation_id: Optional[UUID] = None,
    ) -> QueryResponse:
        """Generate an answer using Adaptive RAG.

        Flow:
        1. Local hybrid search → Find top 5 relevant chunks
        2. Adaptive Router → Is local sufficient? Web needed?
        3. Web search (if needed) → Tavily online sources
        4. Build unified context (local + web + student + history)
        5. LCEL chain → Ask LLM
        6. Persist interaction to DB (observability)
        7. Return response
        """
        t0 = time.time()

        # ── 1. YEREL RETRIEVAL ──
        chunks_with_scores = await retrieve_hybrid_chunks(
            db=db, query_text=request.query, limit=5
        )
        t1 = time.time()
        retrieval_latency = (t1 - t0) * 1000  # ms

        # ── 2. ADAPTIVE ROUTER ──
        # Yerel sonuçların kalitesini değerlendir ve yönlendirme kararı al
        best_local_score = (
            max(score for _, score in chunks_with_scores)
            if chunks_with_scores else 0.0
        )
        route_decision = await route_query(
            query=request.query,
            local_result_count=len(chunks_with_scores),
            best_local_score=best_local_score,
        )

        logger.info(
            f"adaptive_router_karari route={route_decision.route.value} "
            f"reasoning={route_decision.reasoning} yerel_sonuc={len(chunks_with_scores)}"
        )

        # ── 2.1 WEB SEARCH (Router kararına göre) ──
        web_results: list[WebSearchResult] = []
        web_context = ""
        if route_decision.route in (RouteType.WEB, RouteType.HYBRID):
            search_query = route_decision.search_query or request.query
            web_results = await search_web(query=search_query, max_results=3)
            web_context = format_web_results_as_context(web_results)

        # ── 3. CONTEXT FORMATTING ──
        # Build a clear block for each chunk so the LLM can cite it
        context_parts = []
        for rank, (chunk, score) in enumerate(chunks_with_scores, 1):
            source_title = chunk.source.title if chunk.source else "Unknown Source"
            page = chunk.page_numbers[0] if chunk.page_numbers else 0
            context_parts.append(
                f"[ACADEMIC SOURCE {rank}] "
                f"Source: {source_title} | Page: {page}\n"
                f"{chunk.content}\n"
            )

        formatted_context = (
            "\n".join(context_parts) if context_parts
            else "No relevant content found in local academic sources."
        )

        # Web sonuçlarını bağlama ekle — net [WEB] etiketi ile
        if web_context:
            formatted_context += "\n\n" + web_context

        # ── 3.5 ADAPTIVE CONTEXT (Personalization) ──
        student_context = ""
        if request.student_id:
            student_context = await ContextBuilder.build_student_context(
                db=db,
                student_id=request.student_id,
                teacher_id=teacher_id,
            )
            if student_context:
                student_context = (
                    "\nStudent Profile Context:\n"
                    + student_context
                )

        # ── 3.7 CONVERSATION HISTORY (Multi-Turn) ──
        conversation_context = ""
        conversation = None
        if conversation_id:
            conversation = await _get_conversation(db, conversation_id, teacher_id)
            if conversation and conversation.messages:
                history_parts = []
                recent = conversation.messages[-10:]  # Last 5 pairs (user+assistant)
                for msg in recent:
                    role_label = "Teacher" if msg.role == "user" else "Assistant"
                    history_parts.append(f"{role_label}: {msg.content}")
                if history_parts:
                    conversation_context = (
                        "\n### CONVERSATION HISTORY ###\n"
                        + "\n".join(history_parts)
                        + "\n### HISTORY END ###\n"
                    )

        # ── 4. GENERATION ──
        # If no local or web results → fallback
        has_any_context = bool(chunks_with_scores) or bool(web_results)

        if not has_any_context:
            answer = (
                "No sufficient information was found on this topic in either local "
                "academic sources or current web results. I recommend consulting "
                "MEB's Special Education Directorate or a relevant specialist."
            )
        else:
            # Notify LLM if web search was performed
            web_hint = ""
            if route_decision.route in (RouteType.WEB, RouteType.HYBRID) and web_results:
                web_hint = (
                    "\n[NOTE: Tavily web search was also performed for this query. "
                    "Mark information from web sources using the [Web: <title>] format.]\n"
                )
            chain = create_rag_chain()
            answer = await chain.ainvoke({
                "context": formatted_context,
                "question": request.query,
                "disability_type": request.disability_type or "Not specified",
                "grade_level": (
                    str(request.grade_level) if request.grade_level
                    else "Not specified"
                ),
                "student_context": student_context + conversation_context + web_hint,
            })

        t2 = time.time()
        llm_latency = (t2 - t1) * 1000
        total_latency = (t2 - t0) * 1000

        is_fallback = "no sufficient" in answer.lower() or not has_any_context

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

        # Web citation'ları oluştur
        web_citations = [
            WebCitation(
                title=wr.title,
                url=wr.url,
                score=round(wr.score, 3),
            )
            for wr in web_results
        ]

        await db.commit()
        await db.refresh(rag_response)

        # ── 6. CONVERSATION PERSISTENCE ──
        response_uuid = UUID(str(rag_response.id))

        # Auto-create conversation if none provided (first message)
        if not conversation:
            title = request.query[:80] if len(request.query) > 0 else "New Conversation"
            conversation = Conversation(
                teacher_id=teacher_id,
                student_id=request.student_id,
                title=title,
            )
            db.add(conversation)
            await db.flush()  # Get conversation.id

        # Always save user + assistant messages to conversation
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

        # ── 7. RETURN ──
        return QueryResponse(
            id=response_uuid,
            answer=answer,
            citations=citations,
            web_citations=web_citations,
            is_fallback=is_fallback,
            route_decision=route_decision.route.value,
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
