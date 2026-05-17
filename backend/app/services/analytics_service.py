"""Analytics Service — Dashboard ve öğrenci gelişim verileri.

Production-grade: Real conversation/IEP/observation counts per student.
"""

import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.iep_draft import IEPDraft
from app.models.observation import Observation
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

logger = logging.getLogger("sensei.analytics")


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

        # Real session count
        sessions = (
            await db.execute(
                select(func.count()).where(
                    Conversation.student_id == student_id,
                    Conversation.teacher_id == teacher_id,
                )
            )
        ).scalar() or 0

        logger.info(
            "student_analytics_fetched",
            extra={"student_id": str(student_id), "sessions": sessions},
        )

        return StudentAnalyticsResponse(
            student_id=student.id,
            student_name=student.name,
            disability_type=student.disability_type,
            total_sessions=sessions,
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

        # Toplam konuşma (session) sayısı
        total_sessions = (
            await db.execute(
                select(func.count()).where(
                    Conversation.teacher_id == teacher_id
                )
            )
        ).scalar() or 0

        # Öğrenci özetleri — gerçek session/IEP/observation sayıları
        students = (
            await db.execute(
                select(Student)
                .where(Student.teacher_id == teacher_id)
                .order_by(Student.created_at.desc())
                .limit(20)
            )
        ).scalars().all()

        summaries = []
        for s in students:
            # Öğrenciye ait konuşma sayısı
            conv_count = (
                await db.execute(
                    select(func.count()).where(
                        Conversation.student_id == s.id,
                        Conversation.teacher_id == teacher_id,
                    )
                )
            ).scalar() or 0

            # IEP sayısı
            iep_count = (
                await db.execute(
                    select(func.count()).where(IEPDraft.student_id == s.id)
                )
            ).scalar() or 0

            # Observation sayısı
            obs_count = (
                await db.execute(
                    select(func.count()).where(Observation.student_id == s.id)
                )
            ).scalar() or 0

            summaries.append(
                StudentSummary(
                    id=s.id,
                    name=s.name,
                    disability_type=s.disability_type,
                    sessions_count=conv_count,
                    iep_count=iep_count,
                    observation_count=obs_count,
                    accuracy_trend="stable",
                )
            )

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

        logger.info(
            "dashboard_fetched",
            extra={
                "teacher_id": str(teacher_id),
                "students": student_count,
                "sessions": total_sessions,
                "queries": total_queries,
            },
        )

        return DashboardResponse(
            total_students=student_count,
            total_sessions=total_sessions,
            avg_accuracy_all=0.0,
            students_summary=summaries,
            source_stats=SourceStats(
                total_sources=total_sources,
                total_chunks=total_chunks,
                total_queries=total_queries,
            ),
        )
