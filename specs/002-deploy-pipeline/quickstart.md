# EduRAG — Render Deploy Quickstart

**Platform**: Render.com | **LangSmith**: Tracing aktif | **Süre**: ~30 dakika

---

## ÖN GEREKSINIMLER

- [ ] [render.com](https://render.com) hesabı oluşturuldu (GitHub ile giriş önerilir)
- [ ] [smith.langchain.com](https://smith.langchain.com) hesabı oluşturuldu
- [ ] Groq, HuggingFace, Tavily API anahtarları hazır
- [ ] Repo GitHub'da public veya private (Render GitHub erişimi var)

---

## ADIM 1 — LangSmith API Key Al

1. [smith.langchain.com](https://smith.langchain.com) → **Settings** → **API Keys**
2. **Create API Key** → kopyala → güvenli yere kaydet
3. **Projects** → **New Project** → İsim: `edurag-production`

---

## ADIM 2 — Render'da Veritabanı Oluştur

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Ayarlar:
   - Name: `edurag-db`
   - Database: `edurag_db`
   - User: `edurag`
   - Region: **Frankfurt (EU)**
   - Plan: **Free**
3. **Create Database** → Oluşana kadar bekle (~1-2 dk)
4. **Info** sekmesinden `Internal Database URL` kopyala

---

## ADIM 3 — Backend için Dosyaları Hazırla

### 3a. `backend/entrypoint.sh` oluştur

```bash
#!/bin/bash
set -e
echo "[EduRAG] Running migrations..."
alembic upgrade head
echo "[EduRAG] Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
```

```bash
chmod +x backend/entrypoint.sh
```

### 3b. `backend/Dockerfile` oluştur/güncelle

Kontrat: `specs/002-deploy-pipeline/contracts/deploy-config.md` — Dockerfile bölümüne bak.

### 3c. `backend/.env.example` güncelle — LangSmith ekle

```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__your-key-here
LANGCHAIN_PROJECT=edurag-production
```

### 3d. `backend/app/main.py` CORS güncelle

```python
allow_origins=[
    "https://edurag-frontend.onrender.com",  # Render static site URL
    # "http://localhost:5173",  # Sadece dev için — production'da kaldır veya DEBUG flag ile koru
],
```

---

## ADIM 4 — render.yaml Blueprint

Repo kökünde `render.yaml` oluştur — tam içerik için:
`specs/002-deploy-pipeline/research.md` → Bölüm 6.

```bash
# Hızlı kontrol:
cat render.yaml | grep "name:"
# Beklenen: edurag-backend, edurag-frontend, edurag-db
```

---

## ADIM 5 — Render'a Deploy

1. Render Dashboard → **New** → **Blueprint**
2. GitHub repo'nu bağla → `render.yaml` otomatik algılanır
3. **Secret env var'ları elle gir** (Dashboard → Backend Service → Environment):
   - `GROQ_API_KEY`
   - `HUGGINGFACE_API_TOKEN`
   - `TAVILY_API_KEY`
   - `LANGCHAIN_API_KEY`
4. **Apply** → Build başlar

### Build Log İzle

```
Dashboard → edurag-backend → Logs
Beklenen:
  [EduRAG] Running migrations...
  Running upgrade ... -> <hash>
  [EduRAG] Starting server...
  Application startup complete.
```

---

## ADIM 6 — Frontend Build

1. Dashboard → `edurag-frontend` servisi → **Environment**
2. `VITE_API_URL` = `https://edurag-backend.onrender.com/api/v1` (Backend URL'in)
3. **Manual Deploy** → Build tamamlanana kadar bekle

---

## ADIM 7 — Doğrulama

```bash
# Backend health
curl https://edurag-backend.onrender.com/health
# Beklenen: {"status": "healthy", "app": "EduRAG"}

# Frontend
# Tarayıcı: https://edurag-frontend.onrender.com
# Login sayfası yüklenmeli
```

### LangSmith Doğrulama

1. [smith.langchain.com](https://smith.langchain.com) → `edurag-production` projesi
2. Bir soru sor (Swagger UI veya frontend aracılığıyla)
3. LangSmith'te trace görünmeli — RAG chain adımları, latency, token count

---

## SORUN GİDERME

| Belirti | Olası Neden | Çözüm |
|---------|-------------|-------|
| Build failed | Pip install hatası | `pyproject.toml` bağımlılıklarını kontrol et |
| Migration failed | DB bağlantısı yok | `DATABASE_URL` doğru mu? Internal URL kullanıldı mı? |
| 500 Internal Error | Env var eksik | Render Dashboard → Environment → eksik key ekle |
| CORS hatası | Frontend URL `allow_origins`'te yok | `main.py` CORS listesini güncelle |
| LangSmith trace yok | `LANGCHAIN_TRACING_V2` eksik | Env var ekle → servisi yeniden deploy et |
| pgvector not found | Extension yok | Render Postgres → Extensions → `vector` ekle |

---

## ÜCRETSİZ TİER SINIRLAMALARI

| Render Free Tier | Limit |
|------------------|-------|
| Backend sleep | 15 dk hareketsizlik sonrası uyur, ilk istek ~30s sürer |
| DB depolama | 1 GB |
| Static site | Sınırsız |
| **LangSmith Free** | 10.000 trace/ay |

> **Not**: Backend uyuma sorunu için Render'da "Health check" yeterli değil.
> UptimeRobot (ücretsiz) ile 14 dakikada bir `/health` ping → servis uyanık kalır.
