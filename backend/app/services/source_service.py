"""Akademik Kaynak Servisi.

Dosya yükleme, diske kaydetme ve ingestion pipeline'ı tetikleme.

─── MİMARİ KARAR: Neden ayrı servis? ───
Endpoint (router) sadece HTTP bilir. Servis iş mantığını bilir.
Yarın aynı yükleme mantığını CLI'dan veya Celery task'ından
çağırmak istersen, service'i doğrudan import edersin.
HTTP'ye bağımlılık yok.
"""

from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic_source import AcademicSource, SourceType
from app.rag.ingestion import ingest_pdf
from app.schemas.source import SourceListResponse, SourceResponse

# Yüklenen PDF'lerin saklanacağı klasör
UPLOAD_DIR = Path("C:/new/Capstone-PROJECT/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class SourceService:
    """Kaynak yükleme ve listeleme iş mantığı."""

    @staticmethod
    async def upload_and_ingest(
        db: AsyncSession,
        file: UploadFile,
        title: str,
        source_type: SourceType,
        teacher_id: UUID,
    ) -> SourceResponse:
        """Dosyayı diske kaydet ve RAG pipeline'a sok.

        Akış:
        1. Dosyayı uploads/ klasörüne yaz
        2. ingest_pdf() çağır → parse + chunk + embed + DB
        3. SourceResponse döndür
        """
        safe_filename = file.filename or "unknown.pdf"
        file_path = UPLOAD_DIR / safe_filename

        # Dosyayı diske kaydet
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Ingestion pipeline'ı tetikle
        source = await ingest_pdf(
            file_path=str(file_path),
            title=title,
            source_type=source_type,
            teacher_id=teacher_id,
            db=db,
        )

        return SourceResponse.model_validate(source)

    @staticmethod
    async def get_sources(
        db: AsyncSession, skip: int = 0, limit: int = 20
    ) -> SourceListResponse:
        """Kaynakları listele (pagination destekli)."""
        total_stmt = select(func.count()).select_from(AcademicSource)
        total_result = await db.execute(total_stmt)
        total = total_result.scalar_one()

        stmt = (
            select(AcademicSource)
            .order_by(AcademicSource.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        sources = result.scalars().all()

        return SourceListResponse(
            total=total,
            items=[SourceResponse.model_validate(s) for s in sources],
        )
