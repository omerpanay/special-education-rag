"""RAG Soru-Cevap Endpoint'i.

POST /api/v1/query → Soru sor, kaynak atıflı yanıt al

Bu endpoint projenin ana değer önerisi (value proposition):
Öğretmen soru sorar → Sistem akademik kaynaklardan cevap üretir.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_teacher
from app.models.teacher import Teacher
from app.schemas.query import QueryRequest, QueryResponse
from app.services.rag_service import RagService

router = APIRouter(prefix="/query", tags=["RAG"])


@router.post("", response_model=QueryResponse)
async def ask_question(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> QueryResponse:
    """EduRAG asistanına soru sor.

    Akış:
    1. Pydantic ile soruyu validate et (min 3 karakter)
    2. JWT ile öğretmeni doğrula
    3. RagService.ask_question() çağır
    4. Kaynak atıflı yanıt döndür
    """
    return await RagService.ask_question(
        db=db,
        request=request,
        teacher_id=current_teacher.id,
    )
