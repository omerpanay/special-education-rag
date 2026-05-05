"""Conversations API — Multi-Turn RAG Diyaloğu.

Endpoints:
  POST   /api/v1/conversations              → Yeni konuşma başlat
  GET    /api/v1/conversations               → Konuşma listesi
  GET    /api/v1/conversations/{id}          → Konuşma mesajları
  DELETE /api/v1/conversations/{id}          → Konuşmayı sil
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.conversation import Conversation, ConversationMessage
from app.models.teacher import Teacher
from app.schemas.conversation import (
    ConversationDetailOut,
    ConversationListOut,
    ConversationMessageOut,
    ConversationOut,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class ConversationCreateRequest:
    """Inline request model for conversation creation."""
    pass


from pydantic import BaseModel, Field
from typing import Optional


class CreateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    student_id: Optional[UUID] = None


@router.post("", response_model=ConversationOut, status_code=201)
async def create_conversation(
    request: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConversationOut:
    """Yeni konuşma oturumu başlat."""
    from app.services.rag_service import RagService

    conv = await RagService.create_conversation(
        db=db,
        teacher_id=current_teacher.id,
        title=request.title,
        student_id=request.student_id,
    )
    return ConversationOut(
        id=conv.id,
        title=conv.title,
        student_id=conv.student_id,
        message_count=0,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("", response_model=ConversationListOut)
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConversationListOut:
    """Öğretmenin konuşma listesini getir."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.student))
        .where(Conversation.teacher_id == current_teacher.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    items = []
    for conv in conversations:
        # Mesaj sayısını al
        count_result = await db.execute(
            select(func.count()).where(
                ConversationMessage.conversation_id == conv.id
            )
        )
        msg_count = count_result.scalar() or 0

        student_name = None
        if conv.student:
            student_name = conv.student.name

        items.append(ConversationOut(
            id=conv.id,
            title=conv.title,
            student_id=conv.student_id,
            student_name=student_name,
            message_count=msg_count,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ))

    return ConversationListOut(items=items, total=len(items))


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConversationDetailOut:
    """Konuşma detayını mesajlarla birlikte getir."""
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.messages),
            selectinload(Conversation.student)
        )
        .where(
            Conversation.id == conversation_id,
            Conversation.teacher_id == current_teacher.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")

    student_name = None
    if conv.student:
        student_name = conv.student.name

    messages = [
        ConversationMessageOut(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
        )
        for msg in conv.messages
    ]

    return ConversationDetailOut(
        id=conv.id,
        title=conv.title,
        student_id=conv.student_id,
        student_name=student_name,
        messages=messages,
        created_at=conv.created_at,
    )


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    """Konuşmayı sil (cascade ile mesajlar da silinir)."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.teacher_id == current_teacher.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")

    await db.delete(conv)
    await db.commit()
