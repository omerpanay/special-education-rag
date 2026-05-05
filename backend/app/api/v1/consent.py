"""KVKK Consent API Endpoints.

POST   /api/v1/consent/grant    → Rıza ver
POST   /api/v1/consent/revoke   → Rıza iptal et
GET    /api/v1/consent/{student_id} → Öğrencinin rıza durumu
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.consent import Consent
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.consent import ConsentGrantRequest, ConsentRevokeRequest, ConsentStatusOut

router = APIRouter(prefix="/consent", tags=["KVKK Consent"])

VALID_TYPES = {"data_processing", "ai_analysis", "game_participation"}


@router.post("/grant", response_model=ConsentStatusOut)
async def grant_consent(
    request: ConsentGrantRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConsentStatusOut:
    """Öğrenci için KVKK rızası ver."""
    student = await _verify_student(db, request.student_id, current_teacher.id)

    now = datetime.now(timezone.utc)
    for consent_type in request.consent_types:
        if consent_type not in VALID_TYPES:
            raise HTTPException(status_code=400, detail=f"Geçersiz rıza türü: {consent_type}")

        # Mevcut kayıt var mı?
        result = await db.execute(
            select(Consent).where(
                Consent.student_id == request.student_id,
                Consent.teacher_id == current_teacher.id,
                Consent.consent_type == consent_type,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.is_granted = True
            existing.granted_at = now
            existing.revoked_at = None
        else:
            db.add(Consent(
                student_id=request.student_id,
                teacher_id=current_teacher.id,
                consent_type=consent_type,
                is_granted=True,
                granted_at=now,
            ))

    await db.commit()
    return await _get_consent_status(db, request.student_id, current_teacher.id, student.name)


@router.post("/revoke", response_model=ConsentStatusOut)
async def revoke_consent(
    request: ConsentRevokeRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConsentStatusOut:
    """Öğrenci için KVKK rızasını iptal et."""
    student = await _verify_student(db, request.student_id, current_teacher.id)

    now = datetime.now(timezone.utc)
    for consent_type in request.consent_types:
        result = await db.execute(
            select(Consent).where(
                Consent.student_id == request.student_id,
                Consent.teacher_id == current_teacher.id,
                Consent.consent_type == consent_type,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.is_granted = False
            existing.revoked_at = now

    await db.commit()
    return await _get_consent_status(db, request.student_id, current_teacher.id, student.name)


@router.get("/{student_id}", response_model=ConsentStatusOut)
async def get_consent_status(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ConsentStatusOut:
    """Öğrencinin KVKK rıza durumunu getir."""
    student = await _verify_student(db, student_id, current_teacher.id)
    return await _get_consent_status(db, student_id, current_teacher.id, student.name)


async def _verify_student(db: AsyncSession, student_id: UUID, teacher_id: UUID) -> Student:
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == teacher_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
    return student


async def _get_consent_status(
    db: AsyncSession, student_id: UUID, teacher_id: UUID, student_name: str
) -> ConsentStatusOut:
    result = await db.execute(
        select(Consent).where(
            Consent.student_id == student_id,
            Consent.teacher_id == teacher_id,
        )
    )
    consents = result.scalars().all()

    status = ConsentStatusOut(
        student_id=student_id,
        student_name=student_name,
    )
    for c in consents:
        if c.is_granted:
            setattr(status, c.consent_type, True)
            if c.granted_at and (status.granted_at is None or c.granted_at > status.granted_at):
                status.granted_at = c.granted_at

    return status
