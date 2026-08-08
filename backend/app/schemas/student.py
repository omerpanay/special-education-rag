"""Student Pydantic Şemaları."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    disability_type: str = Field(..., description="disleksi | ogrenme_yetersizligi | otizm")
    grade_level: int = Field(..., ge=1, le=12)
    competency_notes: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    disability_type: Optional[str] = None
    grade_level: Optional[int] = Field(None, ge=1, le=12)
    competency_notes: Optional[str] = None
    is_active: Optional[bool] = None


class StudentResponse(BaseModel):
    id: UUID
    teacher_id: UUID
    name: str
    disability_type: str
    grade_level: int
    competency_notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentListResponse(BaseModel):
    items: List[StudentResponse]
    total: int
