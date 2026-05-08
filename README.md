# EduRAG — Özel Eğitim AI Asistanı

> **Geliştirme Aşamasında** | Kapstone Projesi | 2025-2026

EduRAG, özel gereksinimli öğrencilerle çalışan öğretmenlere yönelik **kanıta dayalı, agentic bir AI asistan platformudur**. Öğretmenler akademik PDF kaynaklarına soru sorabilir, öğrenci davranışlarını AI ile analiz edebilir ve kişiselleştirilmiş sosyal öykü materyalleri üretebilir.

---

## 🎯 Temel Özellikler

| Özellik | Açıklama | Teknoloji |
|---|---|---|
| **Hibrit RAG** | Akademik kaynaklara dayalı soru-cevap, kaynak ataması ile | LangChain + pgvector + FTS |
| **Voice-to-Action** | Sesli gözlem → otomatik ABC davranış analizi | Groq Whisper + LLM |
| **Materyal Üretimi** | Öğrencinin ilgi alanına göre kişisel sosyal öykü + görsel | LangGraph + HuggingFace FLUX.1 |
| **Agentic Pipeline** | Çok-ajanlı materyal üretim grafiği | LangGraph (Writer→Prompt→Image→PDF) |
| **Zero-Hallucination** | Cosine similarity eşiği, alan dışı soru reddi | pgvector + guardrail |

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                        │
│   Dashboard │ RAG Chat │ Gözlem │ Materyal │ BEP Üretici │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JWT Auth)
┌───────────────────────▼─────────────────────────────────┐
│                  FastAPI Backend                          │
│  Auth │ Students │ Sources │ Query │ Observations │ Mats  │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
┌──────▼──────┐                    ┌──────────▼──────────┐
│  PostgreSQL  │                    │    External APIs     │
│  + pgvector  │                    │  Groq (LLM+Whisper) │
│  14 tablo    │                    │  HuggingFace FLUX.1  │
└─────────────┘                    └─────────────────────┘
```

---

## 🛠️ Teknoloji Yığını

**Backend**
- Python 3.13, FastAPI 0.115, SQLAlchemy 2.0 (async)
- LangChain 0.3, LangGraph (agentic pipeline)
- PostgreSQL 16 + pgvector 0.8 (hibrit arama)
- Groq API (Llama 3.1, Whisper Large v3)
- HuggingFace Inference Router (FLUX.1-schnell görsel üretimi)
- Pydantic v2, structlog, JWT auth

**Frontend**
- React 19, TypeScript, Vite
- React Router v7

**Geliştirme Araçları**
- Docker (PostgreSQL container)
- Spec-Kit (AI destekli özellik planlama ve görev yönetimi)
- Alembic (veritabanı migration)

---

## 📁 Proje Yapısı

```
Capstone-PROJECT/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoint'leri
│   │   ├── core/            # Config, Security, Logging
│   │   ├── models/          # SQLAlchemy ORM modelleri
│   │   ├── schemas/         # Pydantic şemaları
│   │   ├── services/        # İş mantığı katmanı
│   │   └── rag/             # RAG pipeline (LangChain + LangGraph)
│   ├── scripts/             # Entegrasyon testleri, araçlar
│   └── Sources/             # İndekslenmiş akademik PDF'ler
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Query, Observations, Materials...
│       └── services/        # API client (JWT interceptor)
└── specs/                   # Spec-Kit ile üretilen tasarım dokümanları
    └── 001-edurag-platform/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

---

## 🚀 Yerel Kurulum

### Gereksinimler
- Python 3.13+
- Node.js 20+
- Docker Desktop

### Backend

```bash
# PostgreSQL container başlat
docker run -d --name edurag-db \
  -e POSTGRES_PASSWORD=sifrem123 \
  -p 5433:5432 \
  ankane/pgvector

# Bağımlılıkları yükle
cd backend
pip install -r requirements.txt

# .env dosyasını oluştur (.env.example'dan)
cp .env.example .env

# Migration
alembic upgrade head

# Sunucuyu başlat
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### API Dokümantasyonu
`http://localhost:8000/docs` (Swagger UI)

---

## 📊 Veritabanı Şeması (14 Tablo)

`teachers` · `students` · `consents` · `academic_sources` · `source_chunks` (pgvector) · `rag_responses` · `response_chunks` · `observations` · `materials` · `iep_drafts` · `feedbacks` · `conversations` · `conversation_messages` · `alembic_version`

---

## 🔬 Entegrasyon Testi

```bash
cd backend
python scripts/integration_test.py

# Beklenen çıktı:
# PASS  GET /health
# PASS  POST /auth/login
# PASS  GET /students/
# PASS  POST /query (alan ici)     ← RAG
# PASS  POST /query (alan disi)    ← Guardrail
# PASS  POST /observations/        ← ABC Analizi
# PASS  POST /materials/generate   ← FLUX.1 görseli
# PASS  Gorsel uretimi  2/2
# PASS  PDF olusturuldu
# Toplam: 9/9
```

---

## 📌 Geliştirme Süreci

Bu proje **Spec-Kit** metodolojisi ile yönetildi:
- `specs/001-edurag-platform/spec.md` → Özellik tanımı
- `specs/001-edurag-platform/plan.md` → Teknik implementasyon planı
- `specs/001-edurag-platform/tasks.md` → Görev listesi

Geliştirme aşamalarına git branch geçmişinden ulaşılabilir.

---

## ⚠️ Geliştirme Durumu

> Bu proje aktif geliştirme aşamasındadır.

**Tamamlanan:**
- [x] Backend API (tüm endpoint'ler)
- [x] Hibrit RAG pipeline
- [x] Agentic materyal üretim pipeline (LangGraph)
- [x] ABC davranış analizi (Voice-to-Action)
- [x] Frontend temel sayfalar
- [x] 9/9 entegrasyon testi geçti

**Devam Eden:**
- [ ] Ses kaydı ile gözlem (tarayıcı mikrofon entegrasyonu)
- [ ] BEP otomatik üretimi (RAG destekli)
- [ ] Deployment (Docker Compose + Nginx)
- [ ] Kapsamlı unit testler

---

## 👨‍💻 Geliştirici

**Ömer Panay** — Backend & AI Pipeline geliştirme  
Capstone Projesi, 2025-2026
