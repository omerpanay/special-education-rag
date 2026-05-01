"""FastAPI Application Factory.

Bu dosya uygulamanın giriş noktasıdır:
  uvicorn app.main:app --reload

Mimari Kararlar:
- lifespan: Uygulama yaşam döngüsü yönetimi (startup/shutdown)
- CORS: Frontend (localhost:5173) ile iletişim için izin
- v1 prefix: API versiyonlama — gelecekte v2 eklenebilir
"""

import uuid
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Uygulama yaşam döngüsü.

    yield öncesi: Uygulama başlarken çalışır (startup)
    yield sonrası: Uygulama kapanırken çalışır (shutdown)

    Neden @asynccontextmanager?
    - Eski yöntem: @app.on_event("startup") → deprecated
    - Yeni yöntem: lifespan context manager → kaynakları düzgün temizler
    """
    # ── Startup ──
    setup_logging(debug=settings.debug)
    logger.info("uygulama_baslatiliyor", app_name=settings.app_name, debug=settings.debug)
    yield
    # ── Shutdown ──
    logger.info("uygulama_kapatiliyor")


app = FastAPI(
    title=settings.app_name,
    description="Özel Eğitim için Akademik RAG Platformu",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
)

# ── CORS Middleware ──
# Frontend (React) farklı port'ta çalışır (5173).
# Tarayıcı güvenlik kuralı (Same-Origin Policy) bunu engeller.
# CORS middleware ile "bu origin'e izin ver" diyoruz.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite dev server
        "http://localhost:3000",     # Alternatif
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Her isteğe benzersiz correlation ID ata.

    Bu ID tüm log satırlarına eklenir — bir isteğin tüm
    log'larını filtrelemek için kullanılır.

    Akış:
    1. İstek gelir → UUID üret
    2. structlog context'e ekle
    3. Response header'ına ekle (frontend debug için)
    """
    correlation_id = str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(correlation_id=correlation_id)

    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


# ── API Router'ları ──
# Circular import'u önlemek için burada import
from app.api.v1.router import api_v1_router  # noqa: E402

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Sağlık kontrolü — load balancer ve monitoring için."""
    return {"status": "healthy", "app": settings.app_name}
