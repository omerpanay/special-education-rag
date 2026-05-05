"""API v1 Router — Tüm endpoint gruplarını birleştirir.

Neden ayrı router dosyası?
Her modül (auth, students, query, sources...) kendi router'ını tanımlar.
Bu dosya hepsini tek bir yerde toplar ve main.py'ye sunar.

Ekleme sırası: auth → students → sources → query → sessions → analytics
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router

api_v1_router = APIRouter()

# Authentication — /api/v1/auth/*
api_v1_router.include_router(auth_router)

# ── Phase 3: RAG Router'ları ──
from app.api.v1.sources import router as sources_router
api_v1_router.include_router(sources_router)

from app.api.v1.query import router as query_router
api_v1_router.include_router(query_router)

# ── Phase 4: Student, Feedback, Analytics Router'ları ──
from app.api.v1.students import router as students_router
api_v1_router.include_router(students_router)

from app.api.v1.feedback import router as feedback_router
api_v1_router.include_router(feedback_router)

from app.api.v1.analytics import router as analytics_router
api_v1_router.include_router(analytics_router)

# ── Phase 5: IEP/BEP Generator ──
from app.api.v1.iep import router as iep_router
api_v1_router.include_router(iep_router)

# ── Phase 5: Multi-Turn Conversations ──
from app.api.v1.conversations import router as conversations_router
api_v1_router.include_router(conversations_router)

# ── Phase 5: KVKK Consent ──
from app.api.v1.consent import router as consent_router
api_v1_router.include_router(consent_router)
