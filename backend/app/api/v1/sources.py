"""Kaynak Yükleme ve Listeleme Endpoint'leri.

POST /api/v1/sources/upload → PDF yükle ve vektörleştir
GET  /api/v1/sources        → Yüklenmiş kaynakları listele

Not: Dosya yükleme için standart JSON body yerine multipart/form-data
kullanılır çünkü binary dosya (PDF) gönderiliyor.
FastAPI'de bu File() ve Form() ile yapılır.
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.academic_source import SourceType
from app.models.teacher import Teacher
from app.schemas.source import SourceListResponse, SourceUploadResponse
from app.services.source_service import SourceService

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.post(
    "/upload",
    response_model=SourceUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_source(
    file: UploadFile = File(...),
    title: str = Form(...),
    source_type: SourceType = Form(...),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> SourceUploadResponse:
    """PDF yükle ve RAG pipeline'ına sok."""
    source_resp = await SourceService.upload_and_ingest(
        db=db,
        file=file,
        title=title,
        source_type=source_type,
        teacher_id=current_teacher.id,
    )
    return SourceUploadResponse(
        message="Dosya başarıyla yüklendi ve işlendi.",
        source=source_resp,
    )


@router.get("", response_model=SourceListResponse)
async def list_sources(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> SourceListResponse:
    """Yüklenmiş kaynakları listele."""
    return await SourceService.get_sources(db=db, skip=skip, limit=limit)
