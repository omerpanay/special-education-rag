# Quickstart: EduRAG Platform

## Gereksinimler

- Python 3.11+
- PostgreSQL 16+ (pgvector extension)
- Node.js 20+ (frontend)
- Docker & Docker Compose (önerilen)

## 1. Repository Kurulumu

```bash
git clone <repo-url>
cd Capstone-PROJECT
```

## 2. Backend Kurulumu

```bash
cd backend

# Virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Bağımlılıklar
pip install -e ".[dev]"

# Ortam değişkenleri
cp .env.example .env
# .env dosyasını düzenle:
#   DATABASE_URL=postgresql+asyncpg://postgres:sifrem123@localhost:5433/edurag
#   GROQ_API_KEY=<groq-api-key>
#   SECRET_KEY=<random-secret>

# Veritabanı
# Mevcut omer_proje_db container'ı kullanılıyor (port 5433, pgvector 0.8.1 mevcut)
# edurag veritabanını oluştur:
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE edurag;"
psql -h localhost -p 5433 -U postgres -d edurag -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Migration
alembic upgrade head

# Sunucu başlat
uvicorn app.main:app --reload --port 8000
```

## 3. Frontend Kurulumu

```bash
cd frontend

npm install
cp .env.example .env.local
# VITE_API_URL=http://localhost:8000/api/v1

npm run dev
# → http://localhost:5173
```

## 4. İlk Kaynak Yükleme

```bash
# Backend çalışıyor iken:
curl -X POST http://localhost:8000/api/v1/sources/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@Sources/Disleksi_Kitabi_V1.pdf" \
  -F "title=Disleksi Kitabı V1" \
  -F "source_type=MEB"
```

## 5. İlk RAG Sorgusu

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Disleksili öğrencilere okuma nasıl öğretilir?",
    "disability_type": "disleksi",
    "grade_level": 3
  }'
```

## Doğrulama

- [ ] Backend: `http://localhost:8000/docs` → Swagger UI açılıyor
- [ ] Frontend: `http://localhost:5173` → Login sayfası görünüyor
- [ ] DB: pgvector extension aktif (`SELECT * FROM pg_extension WHERE extname = 'vector';`)
- [ ] RAG: Kaynak yüklenip sorgu yapılabiliyor, kaynak atfı dönüyor
- [ ] Fallback: Kapsamdışı soruda "İlgili akademik kaynak bulunamadı" mesajı dönüyor
