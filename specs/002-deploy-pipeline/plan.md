# Implementation Plan: EduRAG Production Deployment Pipeline

**Branch**: `002-deploy-pipeline` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-deploy-pipeline/spec.md`

## Summary

EduRAG uygulamasını Render/Railway PaaS platformuna Docker tabanlı deploy etmek.
Backend (FastAPI + pgvector) managed PostgreSQL'e bağlanır; LangSmith ile tüm
LangChain/LangGraph chain'leri izlenir. Frontend Render Static Site üzerinden CDN
ile serve edilir. Entrypoint script migration'ları otomatik yönetir.

## Technical Context

**Language/Version**: Python 3.11+ (backend), Node 20 LTS (frontend build)
**Primary Dependencies**: FastAPI, SQLAlchemy async, Alembic, LangSmith SDK, Docker
**Storage**: Render Managed PostgreSQL (pgvector 0.8+ destekli) veya Supabase
**Testing**: Manuel uçtan uca test (Swagger UI + curl)
**Target Platform**: Render.com veya Railway.app (Docker-native PaaS, HTTPS otomatik)
**Project Type**: Web application (backend API + frontend SPA)
**Performance Goals**: Backend cold start < 60s, /health 200ms, API yanıt < 10s
**Constraints**: LangSmith free tier (10K trace/ay); pgvector extension managed DB'de aktif; HTTPS otomatik (platform sağlar)
**Scale/Scope**: 50 öğretmen, 200 öğrenci, tek backend instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | İlke | Durum | Kontrol |
|---|------|-------|---------|
| I | Zero-Hallucination | ✅ PASS | Deploy değişmez — cosine threshold, fallback mesajı kodda korunuyor. |
| II | Evidence-Based Only | ✅ PASS | Deploy pipeline kaynak whitelist'ini etkilemiyor. |
| III | Async-First | ✅ PASS | Uvicorn async, entrypoint migration senkron ama startup-only. |
| IV | Strict Type Safety | ✅ PASS | Pydantic Settings tüm env var'ları validate ediyor; eksik var → startup fail. |
| V | Modular Separation | ✅ PASS | Backend/Frontend/DB ayrı deploy birimleri olarak yapılandırılıyor. |
| VI | Source Traceability | ✅ PASS | LangSmith ile chain izlenebilirliği artıyor, azalmıyor. |

**Gate Result**: ALL PASS — Phase 0'a geçilebilir.

## Project Structure

### Documentation (this feature)

```text
specs/002-deploy-pipeline/
├── plan.md              # Bu dosya
├── research.md          # Phase 0: Platform ve LangSmith araştırması
├── data-model.md        # Phase 1: Deploy entity'leri (env config, volumes)
├── quickstart.md        # Phase 1: Adım adım deploy rehberi
├── contracts/
│   └── deploy-config.md # Env var kontratı, service definitions
└── tasks.md             # Phase 2: /speckit-tasks ile oluşturulacak
```

### Source Code (repository root)

```text
backend/
├── Dockerfile              # [YENİ] Multi-stage Python image
├── entrypoint.sh           # [YENİ] alembic upgrade head → uvicorn
├── .env.example            # [GÜNCELLEME] LangSmith env var'ları eklendi
├── app/
│   ├── main.py             # [GÜNCELLEME] CORS → production domain
│   └── core/
│       └── config.py       # [GÜNCELLEME] LangSmith Settings alanları

frontend/
├── .env.production         # [YENİ] VITE_API_URL=https://api.render.app
└── dist/                   # npm run build çıktısı (platform tarafından serve)

render.yaml                 # [YENİ] Render Blueprint — tüm servis tanımları
# VEYA
railway.toml               # [YENİ] Railway config (tercih edilen platforma göre)
```

**Structure Decision**: Web application (Option 2). Backend + Frontend ayrı
deploy birimleri. DB external managed service. Docker-native PaaS.

## Complexity Tracking

> Tüm constitution ilkeleri karşılandığı için ihlal yok.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
