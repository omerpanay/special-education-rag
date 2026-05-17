"""IEP/BEP API Endpoint'leri.

MEB formatına uygun Bireyselleştirilmiş Eğitim Programı taslağı
üretme, listeleme ve güncelleme.

Endpoints:
  POST   /api/v1/iep/generate          → BEP taslağı üret
  GET    /api/v1/iep/student/{id}      → Öğrencinin BEP'lerini listele
  GET    /api/v1/iep/{id}              → Belirli BEP'i getir
  PATCH  /api/v1/iep/{id}              → BEP'i güncelle
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.teacher import Teacher
from app.schemas.iep import (
    IEPGenerateRequest,
    IEPListResponse,
    IEPResponse,
    IEPUpdateRequest,
)
from app.services.iep_service import IEPService

router = APIRouter(prefix="/iep", tags=["IEP / BEP"])


def _draft_to_response(draft, student_name: str = "") -> IEPResponse:
    """IEPDraft modelini IEPResponse schema'sına dönüştür.

    NOT: Async session'da draft.student lazy-load yapılamaz (MissingGreenlet).
    student_name parametresi ya endpoint'ten verilir ya da content JSON'dan alınır.
    """
    # Content JSON'dan student name fallback
    resolved_name = student_name
    if not resolved_name and draft.content:
        student_info = draft.content.get("student_info", {})
        resolved_name = student_info.get("name", "")

    return IEPResponse(
        id=draft.id,
        student_id=draft.student_id,
        student_name=resolved_name,
        content=draft.content,
        version=draft.version,
        status=draft.status,
        teacher_notes=draft.teacher_notes,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.post("/generate", response_model=IEPResponse, status_code=201)
async def generate_iep(
    request: IEPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> IEPResponse:
    """AI destekli MEB formatında BEP taslağı üret.

    Akış:
    1. Öğrenci profilini yükle
    2. RAG ile engel türüne uygun akademik stratejiler bul
    3. LLM ile 5 bölümlü BEP taslağı oluştur
    4. Veritabanına kaydet ve döndür
    """
    draft = await IEPService.generate(
        db=db,
        teacher_id=current_teacher.id,
        request=request,
    )
    # Fetch student name for response
    from app.models.student import Student
    from sqlalchemy import select as sa_select
    student_res = await db.execute(
        sa_select(Student).where(Student.id == request.student_id)
    )
    student = student_res.scalar_one_or_none()
    student_name = student.name if student else ""
    return _draft_to_response(draft, student_name)


@router.get("/student/{student_id}", response_model=IEPListResponse)
async def list_student_ieps(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> IEPListResponse:
    """Öğrencinin tüm BEP taslaklarını listele."""
    from app.models.student import Student
    from sqlalchemy import select as sa_select
    # Fetch student name for response
    student_res = await db.execute(
        sa_select(Student).where(Student.id == student_id, Student.teacher_id == current_teacher.id)
    )
    student = student_res.scalar_one_or_none()
    student_name = student.name if student else ""

    drafts = await IEPService.list_by_student(
        db=db,
        student_id=student_id,
        teacher_id=current_teacher.id,
    )
    items = [_draft_to_response(d, student_name) for d in drafts]
    return IEPListResponse(items=items, total=len(items))


@router.get("/{iep_id}", response_model=IEPResponse)
async def get_iep(
    iep_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> IEPResponse:
    """Belirli bir BEP taslağını getir."""
    draft = await IEPService.get_by_id(
        db=db,
        iep_id=iep_id,
        teacher_id=current_teacher.id,
    )
    return _draft_to_response(draft)


@router.patch("/{iep_id}", response_model=IEPResponse)
async def update_iep(
    iep_id: UUID,
    request: IEPUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> IEPResponse:
    """BEP taslağını güncelle (öğretmen düzeltmeleri)."""
    draft = await IEPService.update(
        db=db,
        iep_id=iep_id,
        teacher_id=current_teacher.id,
        request=request,
    )
    return _draft_to_response(draft)
