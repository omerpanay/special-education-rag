# Phase 0 Research: EduRAG Deploy Pipeline

**Date**: 2026-05-17 | **Plan**: [plan.md](./plan.md)

---

## 1. Platform Kararı: Render vs Railway

### Decision
**Render.com** — Primary seçim.

### Rationale
- **pgvector desteği**: Render Managed PostgreSQL, pgvector extension'ı built-in destekler.
- **Docker-native**: `Dockerfile` push edilince otomatik build + deploy.
- **Free tier**: 750 saat/ay backend, 100GB bandwidth, Static Site ücretsiz.
- **render.yaml Blueprint**: Tek dosyada tüm servisleri (backend + db + static) tanımlama.
- **HTTPS otomatik**: Her servis için `.onrender.com` domain + SSL.

### Alternatives Considered
- **Railway**: Benzer özellikler ama pgvector desteği daha az belgelenmiş; fiyatlandırma kullanım bazlı.
- **Fly.io**: Güçlü ama learning curve yüksek; persistent volume yönetimi ek karmaşıklık.
- **VPS (DigitalOcean)**: Tam kontrol ama nginx, certbot, firewall, OS update yönetimi gerekir.

---

## 2. LangSmith Entegrasyonu

### Decision
LangSmith SDK — `langsmith` Python paketi + ortam değişkenleri ile otomatik tracing.

### Rationale
- LangChain/LangGraph chain'leri **sıfır kod değişikliği** ile izlenir.
- Sadece 3 env var gerekli:
  ```env
  LANGCHAIN_TRACING_V2=true
  LANGCHAIN_API_KEY=ls__...
  LANGCHAIN_PROJECT=edurag-production
  ```
- LangSmith ücretsiz tier: 10.000 trace/ay — 50 öğretmen × günlük 5 sorgu × 30 gün = ~7.500 trace → yeterli.
- Render'da bu env var'lar Environment Variables panelinden eklenir.

### Neler İzlenir?
| Bileşen | LangSmith'te Görünen |
|---------|----------------------|
| `create_rag_chain()` | Prompt → LLM → Parser latency |
| `route_query()` | Router kararı, reasoning |
| `material_graph` | Her LangGraph node ayrı span |
| `IEPService` chain | BEP üretim adımları |

### Alternatives Considered
- **LangFuse**: Self-hosted seçenek, ama ek infra gerekir.
- **Datadog / New Relic**: Ücretli, kurumsal; overkill bu ölçek için.
- **Sadece structlog**: Mevcut logging var ama chain-level span izleme yok.

---

## 3. Managed PostgreSQL + pgvector

### Decision
**Render Managed PostgreSQL** (pgvector 0.7+ built-in).

### Rationale
- Render PostgreSQL 16 + pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;` migration'da çalışır.
- Otomatik backup (günlük), point-in-time recovery.
- Bağlantı string: `postgresql+asyncpg://user:pass@host/dbname` — SQLAlchemy async uyumlu.
- **Önemli**: Render internal network üzerinden backend → db bağlantısı (no egress cost).

### Alternatives Considered
- **Supabase**: pgvector destekli ama Render ile aynı network'te değil → latency artar.
- **Neon**: Serverless PostgreSQL, pgvector var ama cold start sorunları.
- **Docker volume DB**: Render'da persistent disk ücretli; managed daha ekonomik.

---

## 4. Migration Stratejisi: Entrypoint Script

### Decision
`entrypoint.sh` — Container başlarken `alembic upgrade head` → uvicorn.

### Rationale
```bash
#!/bin/bash
set -e
echo "Running migrations..."
alembic upgrade head
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```
- `set -e`: Migration başarısız → container başlamaz → platform "unhealthy" görür.
- `exec`: Shell process yerine uvicorn'u PID 1 yapar → signal handling doğru çalışır.
- Render'da `$PORT` env var otomatik atanır.

### Alternatives Considered
- **Alembic CLI ayrı job**: Render'da "pre-deploy job" özelliği var ama free tier'da sınırlı.
- **Startup'ta Python ile**: `subprocess.run(["alembic", "upgrade", "head"])` — daha az okunabilir.

---

## 5. Frontend Deploy: Render Static Site

### Decision
**Render Static Site** — `npm run build` → `dist/` → CDN.

### Rationale
- Render Static Site tamamen ücretsiz, CDN ile global dağıtım.
- `Build Command`: `npm run build`
- `Publish Directory`: `dist`
- `.env.production` ile `VITE_API_URL=https://edurag-backend.onrender.com` enjekte edilir.

### Alternatives Considered
- **Vercel**: Mükemmel ama ayrı platform → farklı dashboard.
- **Netlify**: Benzer ama Render'da tek platform yönetimi daha temiz.
- **Nginx container + backend**: Gereksiz karmaşıklık; static site yeterli.

---

## 6. render.yaml Blueprint (Tek Dosya Deploy)

```yaml
services:
  - type: web
    name: edurag-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: edurag-db
          property: connectionString
      - key: LANGCHAIN_TRACING_V2
        value: "true"
      - key: LANGCHAIN_PROJECT
        value: edurag-production
      - key: LANGCHAIN_API_KEY
        sync: false      # Dashboard'dan elle girilir (secret)
      - key: GROQ_API_KEY
        sync: false
      - key: HUGGINGFACE_API_TOKEN
        sync: false
      - key: TAVILY_API_KEY
        sync: false
      - key: SECRET_KEY
        generateValue: true   # Render otomatik üretir
      - key: DEBUG
        value: "false"

  - type: static
    name: edurag-frontend
    buildCommand: npm run build
    staticPublishPath: ./frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://edurag-backend.onrender.com/api/v1

databases:
  - name: edurag-db
    databaseName: edurag_db
    user: edurag
    plan: free
```
