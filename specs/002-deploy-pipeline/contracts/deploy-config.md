# Deploy Config Contract

**Feature**: 002-deploy-pipeline | **Phase 1** | **Date**: 2026-05-17

---

## Ortam Değişkeni Kontratı (Environment Variables)

Tüm servisler için zorunlu ve isteğe bağlı env var'lar:

### Backend (Zorunlu)

| Değişken | Kaynak | Açıklama |
|----------|--------|----------|
| `DATABASE_URL` | Render DB (otomatik) | `postgresql+asyncpg://...` |
| `SECRET_KEY` | Render (generateValue) | JWT imza anahtarı, min 32 char |
| `GROQ_API_KEY` | Dashboard — elle gir | Groq LLM API |
| `HUGGINGFACE_API_TOKEN` | Dashboard — elle gir | HF embedding/image model |
| `TAVILY_API_KEY` | Dashboard — elle gir | Web search (Adaptive RAG) |
| `LANGCHAIN_TRACING_V2` | render.yaml: `"true"` | LangSmith aktif |
| `LANGCHAIN_API_KEY` | Dashboard — elle gir | LangSmith auth |
| `LANGCHAIN_PROJECT` | render.yaml: `edurag-production` | LangSmith proje adı |

### Backend (Opsiyonel, Varsayılan Var)

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `DEBUG` | `false` | Üretimde false zorunlu |
| `APP_NAME` | `EduRAG` | Swagger başlığı |
| `ALGORITHM` | `HS256` | JWT algoritması |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token süresi |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token süresi |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Groq model |
| `WHISPER_MODEL` | `whisper-large-v3-turbo` | Ses transkripsiyon modeli |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-large` | Vektör embedding modeli |

### Frontend (Build-time)

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `VITE_API_URL` | `https://edurag-backend.onrender.com/api/v1` | Backend API base URL |

---

## Render Service Definitions

### Backend Web Service

```
Type:             web (Docker)
Name:             edurag-backend
Region:           Frankfurt (EU) — KVKK uyumu için
Dockerfile:       ./backend/Dockerfile
Health Check:     GET /health → 200
Auto-Deploy:      Yes (main branch push)
Instance Type:    Free (0.1 CPU, 512MB RAM)
```

### Frontend Static Site

```
Type:             static
Name:             edurag-frontend
Build Command:    cd frontend && npm ci && npm run build
Publish Dir:      frontend/dist
Auto-Deploy:      Yes (main branch push)
```

### Managed Database

```
Type:             PostgreSQL
Name:             edurag-db
Plan:             Free (1GB storage, 97 connections)
Version:          PostgreSQL 16
Extensions:       pgvector (built-in)
Region:           Frankfurt (backend ile aynı bölge)
```

---

## Dockerfile Kontratı

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[prod]"

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
RUN mkdir -p /app/static/materials /app/uploads
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
```

## Entrypoint Script Kontratı

```bash
#!/bin/bash
set -e
echo "[EduRAG] Running Alembic migrations..."
alembic upgrade head
echo "[EduRAG] Migrations complete. Starting uvicorn..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 1 \
  --log-level info
```

**Kural**: `set -e` — migration hatası → container başlamaz → Render "deploy failed" gösterir.
