"""Analytics Service — Dashboard ve öğrenci gelişim verileri."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.academic_source import AcademicSource
from app.models.source_chunk import SourceChunk
from app.models.rag_response import RagResponse
from app.schemas.analytics import (
    DashboardResponse,
    SourceStats,
    StudentAnalyticsResponse,
    StudentSummary,
)


class AnalyticsService:

    @staticmethod
    async def get_student_analytics(
        db: AsyncSession, student_id: UUID, teacher_id: UUID
    ) -> StudentAnalyticsResponse:
        student_result = await db.execute(
            select(Student).where(
                Student.id == student_id, Student.teacher_id == teacher_id
            )
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError("Öğrenci bulunamadı")

        return StudentAnalyticsResponse(
            student_id=student.id,
            student_name=student.name,
            disability_type=student.disability_type,
            total_sessions=0,
            overall_accuracy=0.0,
            trend="stable",
            time_series=[],
        )

    @staticmethod
    async def get_dashboard(
        db: AsyncSession, teacher_id: UUID
    ) -> DashboardResponse:
        # Öğrenci sayısı
        student_count = (
            await db.execute(
                select(func.count()).where(Student.teacher_id == teacher_id)
            )
        ).scalar() or 0

        # Öğrenci özetleri
        students = (
            await db.execute(
                select(Student)
                .where(Student.teacher_id == teacher_id)
                .order_by(Student.created_at.desc())
                .limit(20)
            )
        ).scalars().all()

        summaries = [
            StudentSummary(
                id=s.id,
                name=s.name,
                disability_type=s.disability_type,
                sessions_count=0,
                accuracy_trend="stable",
            )
            for s in students
        ]

        # Kaynak istatistikleri
        total_sources = (
            await db.execute(select(func.count()).select_from(AcademicSource))
        ).scalar() or 0

        total_chunks = (
            await db.execute(select(func.count()).select_from(SourceChunk))
        ).scalar() or 0

        total_queries = (
            await db.execute(
                select(func.count()).where(RagResponse.teacher_id == teacher_id)
            )
        ).scalar() or 0

        return DashboardResponse(
            total_students=student_count,
            total_sessions=0,
            avg_accuracy_all=0.0,
            students_summary=summaries,
            source_stats=SourceStats(
                total_sources=total_sources,
                total_chunks=total_chunks,
                total_queries=total_queries,
            ),
        )
