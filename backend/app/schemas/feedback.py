"""Feedback Pydantic Şemaları."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FeedbackCreate(BaseModel):
    response_id: UUID
    is_helpful: bool


class FeedbackResponse(BaseModel):
    id: UUID
    response_id: UUID
    is_helpful: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
