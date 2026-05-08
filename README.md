# EduRAG — AI Assistant for Special Education

> **Active Development** | Capstone Project | 2025–2026

EduRAG is an **evidence-based, agentic AI assistant platform** for teachers working with students who have special educational needs. Teachers can query academic PDF sources, analyze student behavior automatically with AI, and generate personalized social story materials.

---

## 🎯 Core Features

| Feature | Description | Technology |
|---|---|---|
| **Hybrid RAG** | Q&A grounded in academic sources, with citation per answer | LangChain + pgvector + FTS |
| **ABC Behavior Analysis** | Free-text observation → automatic A/B/C structuring via LLM | Groq LLM (Llama 3.1) |
| **Material Generation** | Personalized social story + illustrations based on student interests | LangGraph + HuggingFace FLUX.1 |
| **Agentic Pipeline** | Multi-agent material generation graph | LangGraph (Writer → Prompt → Image → PDF) |
| **Zero-Hallucination** | Cosine similarity threshold, out-of-domain query rejection | pgvector + domain guardrail |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                        │
│  Dashboard │ RAG Chat │ Observations │ Materials │ IEP   │
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
│  14 tables   │                    │  HuggingFace FLUX.1  │
└─────────────┘                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend**
- Python 3.13, FastAPI 0.115, SQLAlchemy 2.0 (async)
- LangChain 0.3, LangGraph (agentic pipeline)
- PostgreSQL 16 + pgvector 0.8 (hybrid search)
- Groq API (Llama 3.1, Whisper Large v3)
- HuggingFace Inference Router (FLUX.1-schnell image generation)
- Pydantic v2, structlog, JWT authentication

**Frontend**
- React 19, TypeScript, Vite
- React Router v7

**Tooling**
- Docker (PostgreSQL container)
- Spec-Kit (AI-assisted feature planning and task management)
- Alembic (database migrations)

---

## 📁 Project Structure

```
Capstone-PROJECT/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoints
│   │   ├── core/            # Config, Security, Logging
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic layer
│   │   └── rag/             # RAG pipeline (LangChain + LangGraph)
│   ├── scripts/             # Integration tests, utilities
│   └── Sources/             # Indexed academic PDFs
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Query, Observations, Materials...
│       └── services/        # API client (JWT interceptor)
└── specs/                   # Spec-Kit design documents
    └── 001-edurag-platform/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.13+
- Node.js 20+
- Docker Desktop

### Backend

```bash
# Start PostgreSQL + pgvector container
docker run -d --name edurag-db \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5433:5432 \
  ankane/pgvector

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### API Documentation
Swagger UI: `http://localhost:8000/docs`

---

## 📊 Database Schema (14 Tables)

`teachers` · `students` · `consents` · `academic_sources` · `source_chunks` (pgvector) · `rag_responses` · `response_chunks` · `observations` · `materials` · `iep_drafts` · `feedbacks` · `conversations` · `conversation_messages` · `alembic_version`

---

## 🔬 Integration Test

```bash
cd backend
python scripts/integration_test.py

# Expected output:
# PASS  GET /health
# PASS  POST /auth/login
# PASS  GET /students/
# PASS  POST /query (in-domain)      ← RAG with citations
# PASS  POST /query (out-of-domain)  ← Guardrail active
# PASS  POST /observations/          ← ABC auto-structuring
# PASS  POST /materials/generate     ← FLUX.1 image generation
# PASS  Image generation  2/2
# PASS  PDF created
# Total: 9/9
```

---

## 📌 Development Process

This project was managed using the **Spec-Kit** methodology:
- `specs/001-edurag-platform/spec.md` → Feature specification
- `specs/001-edurag-platform/plan.md` → Technical implementation plan
- `specs/001-edurag-platform/tasks.md` → Task breakdown

Development phases are traceable through Git branch history.

---

## ⚠️ Development Status

> This project is under active development.

**Completed:**
- [x] Full backend API (all endpoints)
- [x] Hybrid RAG pipeline (pgvector + full-text search)
- [x] Agentic material generation pipeline (LangGraph)
- [x] ABC behavior analysis (Text-to-Action)
- [x] Frontend core pages
- [x] 9/9 integration tests passing

**In Progress:**
- [ ] Voice recording for observations (browser microphone)
- [ ] AI-assisted IEP generation (RAG-powered)
- [ ] Deployment (Docker Compose + Nginx)
- [ ] Comprehensive unit test coverage

---

## 👨‍💻 Developer

**Ömer Panay** — Backend & AI Pipeline development  
Capstone Project, 2025–2026
