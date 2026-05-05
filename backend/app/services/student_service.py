"""Student Service — Öğrenci CRUD iş mantığı."""

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


class StudentService:

    @staticmethod
    async def create(
        db: AsyncSession, data: StudentCreate, teacher_id: UUID
    ) -> Student:
        existing = await db.execute(
            select(Student).where(
                Student.teacher_id == teacher_id, Student.name == data.name
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Bu isimde bir öğrenci zaten mevcut")

        student = Student(
            teacher_id=str(teacher_id),
            name=data.name,
            disability_type=data.disability_type,
            grade_level=data.grade_level,
            competency_notes=data.competency_notes,
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)
        return student

    @staticmethod
    async def get_list(
        db: AsyncSession,
        teacher_id: UUID,
        disability_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ):
        query = select(Student).where(Student.teacher_id == teacher_id)
        if disability_type:
            query = query.where(Student.disability_type == disability_type)

        total_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(total_q)).scalar() or 0

        items = (
            await db.execute(query.offset(skip).limit(limit).order_by(Student.created_at.desc()))
        ).scalars().all()

        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, student_id: UUID, teacher_id: UUID) -> Student:
        result = await db.execute(
            select(Student).where(
                Student.id == student_id, Student.teacher_id == teacher_id
            )
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError("Öğrenci bulunamadı")
        return student

    @staticmethod
    async def update(
        db: AsyncSession, student_id: UUID, teacher_id: UUID, data: StudentUpdate
    ) -> Student:
        student = await StudentService.get_by_id(db, student_id, teacher_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(student, key, value)
        await db.commit()
        await db.refresh(student)
        return student

    @staticmethod
    async def delete(db: AsyncSession, student_id: UUID, teacher_id: UUID) -> None:
        student = await StudentService.get_by_id(db, student_id, teacher_id)
        await db.delete(student)
        await db.commit()
