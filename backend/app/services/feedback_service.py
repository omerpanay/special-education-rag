"""Feedback Service — Geri bildirim iş mantığı.

Olumsuz geri bildirim geldiğinde ilgili chunk'ların
negative_feedback_count'unu artırır (FR-013).
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.models.rag_response import RagResponse
from app.models.response_chunk import ResponseChunk
from app.models.source_chunk import SourceChunk
from app.schemas.feedback import FeedbackCreate


class FeedbackService:

    @staticmethod
    async def create(
        db: AsyncSession, data: FeedbackCreate, teacher_id: UUID
    ) -> Feedback:
        # Tekrar kontrolü
        existing = await db.execute(
            select(Feedback).where(
                Feedback.response_id == data.response_id,
                Feedback.teacher_id == teacher_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Bu yanıt için zaten geri bildirim verilmiş")

        # Yanıtın varlık kontrolü
        response = await db.execute(
            select(RagResponse).where(RagResponse.id == data.response_id)
        )
        if not response.scalar_one_or_none():
            raise ValueError("Yanıt bulunamadı")

        feedback = Feedback(
            response_id=str(data.response_id),
            teacher_id=str(teacher_id),
            is_helpful=data.is_helpful,
        )
        db.add(feedback)

        # FR-013: Olumsuz geri bildirimde chunk'ların negatif sayacını artır
        if not data.is_helpful:
            rc_result = await db.execute(
                select(ResponseChunk.chunk_id).where(
                    ResponseChunk.response_id == data.response_id
                )
            )
            chunk_ids = [row[0] for row in rc_result.all()]
            for cid in chunk_ids:
                chunk = await db.get(SourceChunk, cid)
                if chunk:
                    chunk.negative_feedback_count = (
                        chunk.negative_feedback_count or 0
                    ) + 1

        await db.commit()
        await db.refresh(feedback)
        return feedback
