"""Material Endpoints — Eğitim Materyali API'si.

Endpoint'ler:
- POST /api/v1/materials/generate           → Materyal üretimi başlat
- GET  /api/v1/materials/{material_id}       → Materyal detayı
- GET  /api/v1/materials/{material_id}/download → PDF indir
- GET  /api/v1/materials/student/{student_id}   → Öğrencinin materyalleri
"""

import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.teacher import Teacher
from app.schemas.material import (
    MaterialCreateRequest,
    MaterialListResponse,
    MaterialOut,
)
from app.services.material_service import MaterialService

logger = logging.getLogger("edurag.api.materials")

router = APIRouter(prefix="/materials", tags=["materials"])


@router.post(
    "/generate",
    response_model=MaterialOut,
    status_code=status.HTTP_201_CREATED,
    summary="Materyal üretimi başlat",
    description=(
        "LangGraph multi-agent pipeline ile sosyal öykü veya PECS kartı üretir. "
        "Writer → Prompt Engineer → Image Generator → PDF Builder sırasıyla çalışır."
    ),
)
async def generate_material(
    request: MaterialCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> MaterialOut:
    """Yeni eğitim materyali üret."""
    try:
        result = await MaterialService.generate_material(
            db=db,
            student_id=request.student_id,
            teacher_id=current_teacher.id,
            interest_topic=request.interest_topic,
            material_type=request.material_type,
            title=request.title,
            scene_count=request.scene_count,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/{material_id}",
    response_model=MaterialOut,
    summary="Materyal detayı",
)
async def get_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> MaterialOut:
    """Belirtilen materyalin detaylarını döner."""
    try:
        material = await MaterialService.get_material(
            db=db,
            material_id=material_id,
            teacher_id=current_teacher.id,
        )
        return MaterialOut.model_validate(material)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/{material_id}/download",
    summary="PDF indir",
    response_class=FileResponse,
)
async def download_material_pdf(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    """Üretilen materyalin PDF'ini indirir."""
    try:
        material = await MaterialService.get_material(
            db=db,
            material_id=material_id,
            teacher_id=current_teacher.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    if not material.pdf_path or not Path(material.pdf_path).exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF henüz oluşturulmamış veya dosya bulunamadı",
        )

    return FileResponse(
        path=material.pdf_path,
        media_type="application/pdf",
        filename=f"{material.title}.pdf",
    )


@router.get(
    "/student/{student_id}",
    response_model=MaterialListResponse,
    summary="Öğrencinin materyalleri",
)
async def get_student_materials(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> MaterialListResponse:
    """Belirtilen öğrencinin tüm materyallerini döner."""
    try:
        materials = await MaterialService.get_student_materials(
            db=db,
            student_id=student_id,
            teacher_id=current_teacher.id,
        )
        return MaterialListResponse(
            student_id=student_id,
            total=len(materials),
            materials=[
                MaterialOut.model_validate(m) for m in materials
            ],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
