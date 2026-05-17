# Data Model: Deploy Pipeline Entities

**Feature**: 002-deploy-pipeline | **Phase 1** | **Date**: 2026-05-17

---

## Deploy Pipeline Varlıkları

Bu feature'ın "data model"i kaynak kod dosyaları ve yapılandırma entityleridir.

---

### Varlık 1: Environment Configuration

**Dosya**: `backend/.env.example`

```
Alanlar:
  DATABASE_URL          string  zorunlu  asyncpg bağlantı string'i
  SECRET_KEY            string  zorunlu  min 32 char, JWT imza
  GROQ_API_KEY          string  zorunlu  gsk_... formatı
  HUGGINGFACE_API_TOKEN string  zorunlu  hf_... formatı
  TAVILY_API_KEY        string  zorunlu  tvly-... formatı
  LANGCHAIN_TRACING_V2  bool    zorunlu  "true" | "false"
  LANGCHAIN_API_KEY     string  zorunlu  ls__... formatı
  LANGCHAIN_PROJECT     string  varsayılan: "edurag-production"
  DEBUG                 bool    varsayılan: false
  APP_NAME              string  varsayılan: "EduRAG"
  ALGORITHM             string  varsayılan: "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES int varsayılan: 15
  REFRESH_TOKEN_EXPIRE_DAYS   int varsayılan: 7
  LLM_MODEL            string  varsayılan: llama-3.3-70b-versatile
  EMBEDDING_MODEL      string  varsayılan: intfloat/multilingual-e5-large
  WHISPER_MODEL        string  varsayılan: whisper-large-v3-turbo
```

**Validasyon**: `app/core/config.py` Pydantic Settings — eksik zorunlu alan → startup ValidationError.

---

### Varlık 2: Dockerfile (Backend Image)

**Dosya**: `backend/Dockerfile`

```
Aşamalar:
  builder:  python:3.11-slim + gcc + libpq-dev + pip install
  runtime:  python:3.11-slim + builder artifacts + app code + entrypoint

Expose: 8000
Entrypoint: /entrypoint.sh

Dizinler (oluşturulur):
  /app/static/materials/   → materyal PDF ve görseller
  /app/uploads/            → öğretmen PDF yüklemeleri
```

---

### Varlık 3: Entrypoint Script

**Dosya**: `backend/entrypoint.sh`

```
Adımlar (sıralı, hata → dur):
  1. alembic upgrade head    → DB şeması güncel
  2. uvicorn app.main:app    → API sunucusu başlar

Ortam değişkeni:
  PORT  → Render tarafından atanır, varsayılan 8000
```

---

### Varlık 4: Render Blueprint

**Dosya**: `render.yaml` (repo kökünde)

```
Servisler:
  edurag-backend   → web (Docker), /health healthcheck
  edurag-frontend  → static, dist/ CDN
  
Veritabanları:
  edurag-db        → PostgreSQL 16, pgvector, Frankfurt

Bağımlılıklar:
  backend.DATABASE_URL ← db.connectionString (otomatik enjekte)
```

---

### Varlık 5: Frontend Build Config

**Dosya**: `frontend/.env.production`

```
VITE_API_URL = https://edurag-backend.onrender.com/api/v1
```

**Build çıktısı**: `frontend/dist/` — Render Static Site tarafından CDN'e yüklenir.

---

## State Transitions: Deployment Lifecycle

```
[Kod push edilir]
      ↓
[Render build tetiklenir]
      ↓
[Docker image build] ──HATA──→ [Build Failed — log incele]
      ↓ BAŞARILI
[Container başlar → entrypoint.sh]
      ↓
[alembic upgrade head] ──HATA──→ [Deploy Failed — migration hatası]
      ↓ BAŞARILI
[uvicorn başlar]
      ↓
[/health → 200] ──BAŞARISIZ──→ [Deploy Failed — unhealthy]
      ↓ BAŞARILI
[Render: "Live" durumu]
      ↓
[LangSmith trace'ler akmaya başlar]
```
