"""Unit Tests — Student Service"""

import pytest
import pytest_asyncio
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.student import StudentCreate, StudentUpdate
from app.services.student_service import StudentService
from app.core.security import hash_password

settings = get_settings()

# NullPool — her istek yeni bağlantı
_engine = create_async_engine(str(settings.database_url), echo=False, poolclass=NullPool)
_Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


async def _create_teacher(session: AsyncSession) -> Teacher:
    teacher = Teacher(
        email=f"s_test_{uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("testpass"),
        full_name="Öğrenci Test Öğretmeni",
    )
    session.add(teacher)
    await session.commit()
    await session.refresh(teacher)
    return teacher


class TestStudentService:

    @pytest.mark.asyncio
    async def test_create_student_success(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            data = StudentCreate(
                name=f"Ali_{uuid4().hex[:6]}",
                disability_type="disleksi",
                grade_level=3,
                competency_notes="Harf-ses ilişkisinde zorluk",
            )
            student = await StudentService.create(session, data, teacher.id)
            assert student.name.startswith("Ali_")
            assert student.disability_type == "disleksi"
            assert student.grade_level == 3
            assert student.teacher_id == teacher.id

    @pytest.mark.asyncio
    async def test_create_duplicate_student_raises(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            name = f"Tekrar_{uuid4().hex[:6]}"
            data = StudentCreate(name=name, disability_type="otizm", grade_level=5)
            await StudentService.create(session, data, teacher.id)

            with pytest.raises(ValueError, match="zaten mevcut"):
                await StudentService.create(session, data, teacher.id)

    @pytest.mark.asyncio
    async def test_get_list_returns_teacher_students(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            nameA = f"ÖğrA_{uuid4().hex[:6]}"
            nameB = f"ÖğrB_{uuid4().hex[:6]}"
            for name in [nameA, nameB]:
                await StudentService.create(
                    session, StudentCreate(name=name, disability_type="disleksi", grade_level=3), teacher.id
                )

            items, total = await StudentService.get_list(session, teacher.id)
            assert total >= 2
            names = [s.name for s in items]
            assert nameA in names
            assert nameB in names

    @pytest.mark.asyncio
    async def test_get_list_filter_by_disability(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            await StudentService.create(
                session, StudentCreate(name=f"FA_{uuid4().hex[:6]}", disability_type="otizm", grade_level=2), teacher.id,
            )
            await StudentService.create(
                session, StudentCreate(name=f"FB_{uuid4().hex[:6]}", disability_type="disleksi", grade_level=4), teacher.id,
            )

            items, _ = await StudentService.get_list(session, teacher.id, disability_type="otizm")
            assert all(s.disability_type == "otizm" for s in items)

    @pytest.mark.asyncio
    async def test_get_by_id_not_found_raises(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            with pytest.raises(ValueError, match="bulunamadı"):
                await StudentService.get_by_id(session, uuid4(), teacher.id)

    @pytest.mark.asyncio
    async def test_update_student(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            data = StudentCreate(name=f"Güncelle_{uuid4().hex[:6]}", disability_type="disleksi", grade_level=3)
            student = await StudentService.create(session, data, teacher.id)

            update_data = StudentUpdate(grade_level=5, competency_notes="Gelişme gösteriyor")
            updated = await StudentService.update(session, student.id, teacher.id, update_data)

            assert updated.grade_level == 5
            assert updated.competency_notes == "Gelişme gösteriyor"

    @pytest.mark.asyncio
    async def test_delete_student(self):
        async with _Session() as session:
            teacher = await _create_teacher(session)
            data = StudentCreate(name=f"Sil_{uuid4().hex[:6]}", disability_type="otizm", grade_level=1)
            student = await StudentService.create(session, data, teacher.id)
            sid = student.id

            await StudentService.delete(session, sid, teacher.id)

            with pytest.raises(ValueError, match="bulunamadı"):
                await StudentService.get_by_id(session, sid, teacher.id)

    @pytest.mark.asyncio
    async def test_teacher_isolation(self):
        """Bir öğretmenin öğrencisi başka öğretmen tarafından görünmemeli."""
        async with _Session() as session:
            t1 = await _create_teacher(session)
            t2 = await _create_teacher(session)

            name = f"Gizli_{uuid4().hex[:6]}"
            await StudentService.create(
                session, StudentCreate(name=name, disability_type="otizm", grade_level=1), t1.id
            )

            items, total = await StudentService.get_list(session, t2.id)
            names = [s.name for s in items]
            assert name not in names
