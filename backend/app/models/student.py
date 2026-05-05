"""Student (Öğrenci) Modeli.

Öğretmenin tanımladığı öğrenci profili.
Her öğrenci bir öğretmene aittir (teacher_id FK).
Benzersizlik: (teacher_id, name) kombinasyonu.
"""

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Student(Base, TimestampMixin):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("teacher_id", "name", name="uq_student_teacher_name"),
    )

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    disability_type: Mapped[str] = mapped_column(String(30), nullable=False)
    grade_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    competency_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # İlişkiler
    teacher = relationship("Teacher", backref="students")
