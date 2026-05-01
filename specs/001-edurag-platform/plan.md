# Implementation Plan: EduRAG Platform

**Branch**: `001-edurag-platform` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-edurag-platform/spec.md`

## Summary

Özel gereksinimli öğrencilerin eğitimini desteklemek için öğretmenlere
yönelik RAG tabanlı, kanıta dayalı ve kişiselleştirilmiş öğrenme
platformu. Sistem 4 katmandan oluşur: (1) Öğretmen Dashboard & Veri
Yönetimi, (2) Hibrit RAG Hattı (pgvector + FTS), (3) Unity WebGL
Entegrasyonu, (4) Adaptif Mantık Katmanı. Tüm AI yanıtları akademik
kaynaklara dayalı olup zero-hallucination politikası uygulanır.

## Technical Context

**Language/Version**: Python 3.11+ (backend), JavaScript/TypeScript (frontend), C# (Unity)
**Primary Dependencies**: FastAPI 0.110+, LangChain 0.3+, langchain-groq, SQLAlchemy 2.0+ (async), Pydantic 2.0+, sentence-transformers, httpx
**Storage**: PostgreSQL 16.11 + pgvector 0.8.1 (mevcut `omer_proje_db` container, port 5433)
**Testing**: pytest + pytest-asyncio (backend), Vitest/Jest (frontend)
**Target Platform**: Linux server (backend), modern web browsers with WebGL (frontend + game)
**Project Type**: Web application (backend API + frontend SPA + embedded game module)
**Performance Goals**: RAG yanıt süresi <10s, 50 eş zamanlı öğretmen + 200 öğrenci, 100 sayfalık PDF indeksleme <60s
**Constraints**: Zero-hallucination (cosine similarity ≥0.70), KVKK uyumlu veri yönetimi, WCAG 2.1 AA erişilebilirlik
**Scale/Scope**: 50 öğretmen, 200 öğrenci, ~30 akademik kaynak (PDF), MVP'de tek oyun türü

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | İlke | Durum | Kontrol |
|---|------|-------|---------|
| I | Zero-Hallucination | ✅ PASS | Cosine similarity ≥0.70 eşiği spec'te tanımlı (SC-002, SC-003). Fallback mesajı belirlenmiş. |
| II | Evidence-Based Only | ✅ PASS | FR-004, FR-014 kaynak whitelist'i ve zorunlu atıf formatını tanımlıyor. |
| III | Async-First | ✅ PASS | FastAPI async endpoints, asyncpg/SQLAlchemy async, LangChain ainvoke planlanıyor. |
| IV | Strict Type Safety | ✅ PASS | Pydantic BaseModel strict mode, type hints, Enum kullanımı planlanıyor. |
| V | Modular Separation | ✅ PASS | Backend/Frontend/Game 3 bağımsız modül, REST API kontratı ile iletişim. |
| VI | Source Traceability | ✅ PASS | FR-003 chunk metadata, FR-014 kaynak doğrulama, data-model.md'de detaylandırılacak. |

**Gate Result**: ALL PASS — Phase 0'a geçilebilir.

## Project Structure

### Documentation (this feature)

```text
specs/001-edurag-platform/
├── plan.md              # Bu dosya
├── research.md          # Phase 0: Teknoloji araştırması
├── data-model.md        # Phase 1: Veritabanı şeması
├── quickstart.md        # Phase 1: Hızlı başlangıç rehberi
├── contracts/           # Phase 1: API kontratları
│   ├── auth.md
│   ├── students.md
│   ├── rag.md
│   ├── sources.md
│   ├── game.md
│   └── analytics.md
└── tasks.md             # Phase 2: /speckit-tasks ile oluşturulacak
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory
│   ├── core/
│   │   ├── config.py              # Pydantic Settings
│   │   ├── security.py            # Auth, JWT, password hashing
│   │   ├── dependencies.py        # Dependency injection
│   │   └── logging.py             # Structured JSON logging
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # API router aggregator
│   │       ├── auth.py            # POST /login, /register
│   │       ├── students.py        # CRUD öğrenci profilleri
│   │       ├── query.py           # POST /query (RAG endpoint)
│   │       ├── sources.py         # PDF yükleme + indeksleme
│   │       ├── feedback.py        # Geri bildirim
│   │       ├── sessions.py        # Oyun oturum verileri
│   │       └── analytics.py       # Dashboard verileri
│   ├── models/
│   │   ├── base.py                # SQLAlchemy Base, mixins
│   │   ├── teacher.py
│   │   ├── student.py
│   │   ├── academic_source.py
│   │   ├── source_chunk.py        # pgvector column
│   │   ├── rag_response.py
│   │   ├── feedback.py
│   │   ├── game_session.py
│   │   └── consent.py             # KVKK rıza kaydı
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── student.py
│   │   ├── query.py
│   │   ├── source.py
│   │   ├── feedback.py
│   │   ├── session.py
│   │   └── analytics.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── student_service.py
│   │   ├── source_service.py
│   │   ├── feedback_service.py
│   │   ├── session_service.py
│   │   └── analytics_service.py
│   └── rag/
│       ├── ingestion.py           # PDF → chunks → embeddings → pgvector
│       ├── retrieval.py           # Hybrid search (vector + FTS)
│       ├── chain.py               # LangChain RAG chain
│       ├── prompts.py             # System prompt templates
│       └── context_builder.py     # Adaptif bağlam zenginleştirme
├── alembic/
│   └── versions/                  # DB migration dosyaları
├── tests/
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   └── contract/
├── alembic.ini
├── pyproject.toml
└── Dockerfile

frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── StudentProfile/
│   │   ├── QueryInterface/
│   │   ├── GameEmbed/
│   │   └── common/
│   ├── pages/
│   ├── services/                  # API client
│   ├── hooks/
│   └── utils/
├── public/
├── tests/
└── package.json

game/
└── Build/                         # Unity WebGL export
    ├── game.data
    ├── game.framework.js
    ├── game.loader.js
    └── game.wasm
```

**Structure Decision**: Web application yapısı (Option 2) seçildi.
Backend ve Frontend ayrı modüller olarak geliştirilir. Game modülü
Unity'den WebGL olarak export edilip frontend'e embed edilir.

## Complexity Tracking

> Tüm constitution ilkeleri karşılandığı için ihlal yok.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
