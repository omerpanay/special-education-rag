"""Alembic Environment Configuration — Async SQLAlchemy Desteği.

Bu dosya Alembic'in veritabanıyla nasıl konuşacağını tanımlar.
Normalde Alembic senkron çalışır, ama biz asyncpg kullanıyoruz.
Bu yüzden run_async_migrations() fonksiyonu ile async engine kullanıyoruz.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Alembic Config nesnesi — alembic.ini'den gelir
config = context.config

# Loglama konfigürasyonu
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── KRİTİK: Tüm modelleri buraya import et ──
# Alembic --autogenerate kullanırken, hangi tabloları oluşturması
# gerektiğini bilmek için tüm modellerin yüklü olması lazım.
# Base.metadata tüm modelleri tarar.
from app.models.base import Base  # noqa: E402

# Tum modelleri import et — autogenerate icin KRITIK
# Her yeni model eklendiginde buraya eklenmeli
from app.models.teacher import Teacher  # noqa: F401
from app.models.academic_source import AcademicSource  # noqa: F401
from app.models.source_chunk import SourceChunk  # noqa: F401
from app.models.rag_response import RagResponse  # noqa: F401
from app.models.response_chunk import ResponseChunk  # noqa: F401
from app.models.student import Student  # noqa: F401
from app.models.feedback import Feedback  # noqa: F401
from app.models.iep_draft import IEPDraft  # noqa: F401
from app.models.conversation import Conversation, ConversationMessage  # noqa: F401
from app.models.consent import Consent  # noqa: F401

target_metadata = Base.metadata


def get_url() -> str:
    """Veritabani URL'sini .env'den al.

    Neden asyncpg URL? Cunku async_engine_from_config async driver bekler.
    Alembic run_sync() pattern ile async engine uzerinden senkron migration cagirir.
    Bu durumda URL'yi donusturmemize gerek yok — asyncpg olarak kalsin.
    """
    import os
    from pathlib import Path
    from dotenv import load_dotenv

    # .env dosyasi backend/ klasoründe
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:sifrem123@localhost:5433/edurag")
    # async_engine_from_config asyncpg driver gerektirir — donusturme yapma!
    return url


def run_migrations_offline() -> None:
    """Offline modda migration çalıştır (SQL script üretir)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:  # type: ignore[no-untyped-def]
    """Migration'ları verilen connection üzerinde çalıştır."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Async engine ile migration çalıştır.

    Neden async? Çünkü production'da asyncpg kullanıyoruz.
    Alembic doğrudan async desteklemiyor, bu yüzden burada
    async engine oluşturup run_sync() ile migration çalıştırıyoruz.
    """
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Online modda migration çalıştır (doğrudan DB'ye uygula)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
