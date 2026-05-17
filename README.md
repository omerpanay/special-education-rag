# EduRAG — AI Assistant for Special Education

> **Active Development** | Capstone Project | 2025–2026

EduRAG is an **evidence-based, agentic AI assistant platform** for teachers working with students who have special educational needs. Teachers can query academic PDF sources, analyze student behavior automatically with AI, and generate personalized social story materials.

---

## 🎯 Core Features

| Feature | Description | Technology |
|---|---|---|
| **Hybrid RAG** | Q&A grounded in academic sources, with citation per answer | LangChain + pgvector + FTS |
| **Adaptive Router** | Smart query routing: local retrieval, web search, or hybrid | LangChain + Tavily |
| **ABC Behavior Analysis** | Free-text/voice observation → automatic A/B/C structuring via LLM | Groq LLM + Whisper |
| **Material Generation** | Personalized social story + illustrations based on student interests | LangGraph + HuggingFace FLUX.1 |
| **IEP Draft Generation** | AI-powered individualized education program drafts with RAG context | Groq LLM + RAG |
| **RLHF Feedback Loop** | Teacher feedback directly improves future retrieval quality | Penalty scoring on chunks |
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
└─────────────┘                    │  Tavily (Web Search) │
                                   │  LangSmith (Tracing) │
                                   └─────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend**
- Python 3.11+, FastAPI 0.115, SQLAlchemy 2.0 (async)
- LangChain 0.3, LangGraph (agentic pipeline)
- PostgreSQL 16 + pgvector 0.8 (hybrid search)
- Groq API (Llama 3.3-70B, Whisper Large v3 Turbo)
- HuggingFace Inference Router (FLUX.1-schnell image generation)
- Pydantic v2, structlog, JWT authentication

**Frontend**
- React 19, TypeScript, Vite
- React Router v7

**DevOps & Observability**
- Docker (multi-stage build) + Docker Compose
- Render.com (PaaS deployment — backend, frontend, managed PostgreSQL)
- LangSmith (AI pipeline tracing — chain latency, token usage)
- GitHub Actions (CI/CD pipeline)
- Alembic (database migrations with entrypoint automation)

**Tooling**
- Spec-Kit (AI-assisted feature planning and task management)

---

## 📁 Project Structure

```
Capstone-PROJECT/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoints (12 routers)
│   │   ├── core/            # Config, Security, Logging, Database
│   │   ├── models/          # SQLAlchemy ORM models (14 tables)
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic layer (12 services)
│   │   └── rag/             # RAG pipeline (LangChain + LangGraph)
│   │       ├── ingestion.py     # PDF → chunks → embeddings → pgvector
│   │       ├── retrieval.py     # Hybrid search (vector + FTS + MMR)
│   │       ├── chain.py         # LCEL RAG chain
│   │       ├── router.py        # Adaptive query router (3-tier)
│   │       ├── search.py        # Tavily web search
│   │       ├── context_builder.py
│   │       ├── prompts.py       # System prompt templates
│   │       ├── iep_chain.py     # IEP generation chain
│   │       └── material_graph.py  # LangGraph 4-node pipeline
│   ├── alembic/             # Database migrations
│   ├── Dockerfile           # Multi-stage production image
│   ├── entrypoint.sh        # Migration + uvicorn startup
│   ├── docker-compose.yml   # Local dev (DB + backend)
│   └── .env.example         # Environment variable template
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Query, Observations, Materials...
│       └── services/        # API client (JWT interceptor)
├── render.yaml              # Render Blueprint (one-click deploy)
├── specs/
│   ├── 001-edurag-platform/ # Platform feature spec & plan
│   └── 002-deploy-pipeline/ # Deployment pipeline spec & plan
└── Sources/                 # Academic PDF sources for RAG
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker Desktop

### Option A: Docker Compose (Recommended)

```bash
# Clone and configure
cd backend
cp .env.example .env
# Edit .env with your API keys (Groq, HuggingFace, Tavily, LangSmith)

# Start everything (DB + Backend)
docker compose up -d

# Wait for healthy status
docker compose ps
# edurag_db       → healthy
# edurag_backend  → healthy

# Verify
curl http://localhost:8000/health
# {"status": "healthy", "app": "EduRAG"}
```

### Option B: Manual Setup

```bash
# Start PostgreSQL + pgvector container
docker run -d --name edurag-db \
  -e POSTGRES_USER=edurag \
  -e POSTGRES_PASSWORD=edurag123 \
  -e POSTGRES_DB=edurag_db \
  -p 5433:5432 \
  pgvector/pgvector:pg16

# Install dependencies
cd backend
pip install -e "."

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

## ☁️ Production Deployment (Render.com)

This project uses **Render.com** for cloud deployment with a Blueprint configuration.

```bash
# One-click deploy:
# 1. Push repo to GitHub
# 2. Render Dashboard → New → Blueprint → Select repo
# 3. render.yaml auto-detected → Apply
# 4. Add secret env vars in Dashboard (Groq, HuggingFace, Tavily, LangSmith keys)
# 5. Deploy completes → https://edurag-backend.onrender.com/health
```

**Services deployed:**
| Service | Type | URL |
|---------|------|-----|
| Backend | Docker Web Service | `https://edurag-backend.onrender.com` |
| Frontend | Static Site (CDN) | `https://edurag-frontend.onrender.com` |
| Database | Managed PostgreSQL + pgvector | Internal connection |

**Observability:** LangSmith tracing enabled — all LangChain/LangGraph chains automatically traced with zero code changes.

See `specs/002-deploy-pipeline/quickstart.md` for step-by-step deployment guide.

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

| Phase | Spec Directory | Content |
|-------|---------------|---------|
| Platform Development | `specs/001-edurag-platform/` | Feature spec, implementation plan, task breakdown |
| Deployment Pipeline | `specs/002-deploy-pipeline/` | Deploy spec, research, contracts, quickstart |

Development phases are traceable through Git branch history.

---

## ⚠️ Development Status

> This project is under active development.

**Completed:**
- [x] Full backend API (all endpoints)
- [x] Hybrid RAG pipeline (pgvector + full-text search + MMR diversity)
- [x] Adaptive query router (local/web/hybrid)
- [x] Agentic material generation pipeline (LangGraph 4-node)
- [x] ABC behavior analysis (Text-to-Action + Voice-to-Action)
- [x] AI-assisted IEP draft generation
- [x] RLHF feedback loop (teacher feedback → retrieval improvement)
- [x] Frontend core pages
- [x] 9/9 integration tests passing
- [x] Docker multi-stage build (Dockerfile)
- [x] Docker Compose local dev environment
- [x] Render.com deployment blueprint (render.yaml)
- [x] LangSmith tracing integration

**In Progress:**
- [ ] GitHub Actions CI/CD pipeline
- [ ] Grafana Cloud metrics integration
- [ ] Comprehensive unit test coverage

---

## 👨‍💻 Developer

**Ömer Panay** — Backend & AI Pipeline development
Capstone Project, 2025–2026
