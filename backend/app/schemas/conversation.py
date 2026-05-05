"""Conversation (Konuşma) Pydantic Şemaları."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConversationMessageOut(BaseModel):
    """Tek bir konuşma mesajı."""
    id: UUID
    role: str  # user | assistant
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationOut(BaseModel):
    """Konuşma özeti (mesajsız)."""
    id: UUID
    title: str
    student_id: Optional[UUID] = None
    student_name: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailOut(BaseModel):
    """Konuşma detayı (mesajlarla birlikte)."""
    id: UUID
    title: str
    student_id: Optional[UUID] = None
    student_name: Optional[str] = None
    messages: List[ConversationMessageOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationListOut(BaseModel):
    """Konuşma listesi."""
    items: List[ConversationOut]
    total: int
