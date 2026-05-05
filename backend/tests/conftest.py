"""Test Configuration — conftest.py

NullPool kullanarak asyncpg connection çakışmasını önler.
Her istek kendi bağlantısını açar/kapar.
"""

import uuid
from typing import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password, create_access_token
from app.main import app
from app.models.teacher import Teacher

settings = get_settings()

# NullPool — her istek yeni bağlantı, çakışma yok
_test_engine = create_async_engine(
    str(settings.database_url),
    echo=False,
    poolclass=NullPool,
)
_TestSession = async_sessionmaker(_test_engine, class_=AsyncSession, expire_on_commit=False)


# get_db override — test engine kullansın
async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """FastAPI ASGI test client — test DB override ile."""
    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_teacher() -> Teacher:
    """Benzersiz test öğretmen."""
    async with _TestSession() as session:
        teacher = Teacher(
            email=f"test_{uuid.uuid4().hex[:8]}@test.com",
            hashed_password=hash_password("testpassword123"),
            full_name="Test Öğretmen",
        )
        session.add(teacher)
        await session.commit()
        await session.refresh(teacher)
        return teacher


@pytest_asyncio.fixture
async def auth_headers(test_teacher: Teacher) -> dict:
    token = create_access_token({"sub": str(test_teacher.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient, auth_headers: dict) -> AsyncClient:
    client.headers.update(auth_headers)
    return client
