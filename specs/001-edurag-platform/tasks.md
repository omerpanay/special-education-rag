# Tasks: EduRAG Platform

**Input**: Design documents from `specs/001-edurag-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` (Python/FastAPI), `frontend/` (React/Vite)
- Paths follow `plan.md` project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency management, basic configuration

- [x] T001 Create backend project structure with directories: `backend/app/{api/v1,core,models,schemas,services,rag}`, `backend/tests/{unit,integration,contract}`, `backend/alembic/versions/`
- [x] T002 Create `backend/pyproject.toml` with dependencies: fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, pydantic, pydantic-settings, langchain, langchain-groq, langchain-community, sentence-transformers, pgvector, python-jose, passlib[bcrypt], python-multipart, structlog, alembic, httpx
- [x] T003 [P] Create `backend/.env.example` with environment variables: DATABASE_URL, GROQ_API_KEY, SECRET_KEY, EMBEDDING_MODEL, LLM_MODEL, COSINE_THRESHOLD
- [ ] T004 [P] Create frontend project with Vite + React + TypeScript in `frontend/` using `npx -y create-vite@latest`
- [x] T005 Initialize Alembic configuration in `backend/alembic.ini` and `backend/alembic/env.py` with async SQLAlchemy support

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create application config with Pydantic Settings in `backend/app/core/config.py` — DATABASE_URL, GROQ_API_KEY, SECRET_KEY, EMBEDDING_MODEL, LLM_MODEL, COSINE_THRESHOLD (0.70 default), JWT settings
- [x] T007 Create async database engine and session factory in `backend/app/core/database.py` — asyncpg engine, async sessionmaker, get_db dependency
- [x] T008 [P] Create SQLAlchemy Base model with common mixins (id UUID, created_at, updated_at) in `backend/app/models/base.py`
- [x] T009 [P] Create structured JSON logging configuration with structlog in `backend/app/core/logging.py` — correlation ID middleware, request/response logging
- [x] T010 [P] Create security utilities in `backend/app/core/security.py` — JWT token creation/verification, password hashing with bcrypt, get_current_teacher dependency
- [x] T011 Create FastAPI application factory in `backend/app/main.py` — CORS middleware, lifespan handler, v1 router mount, logging middleware
- [x] T012 Create Teacher model in `backend/app/models/teacher.py` — fields: id, email, hashed_password, full_name, institution, branch, is_active, timestamps
- [x] T013 [P] Create Teacher Pydantic schemas in `backend/app/schemas/auth.py` — TeacherRegister, TeacherLogin, TokenResponse, TeacherResponse
- [x] T014 Create auth service in `backend/app/services/auth_service.py` — register, login, refresh token logic with async DB operations
- [x] T015 Create auth API endpoints in `backend/app/api/v1/auth.py` — POST /register, POST /login, POST /refresh per contracts/auth.md
- [x] T016 Create API v1 router aggregator in `backend/app/api/v1/router.py` — include all sub-routers with proper prefixes
- [x] T017 Create initial Alembic migration for teachers table in `backend/alembic/versions/`
- [x] T018 Create `edurag` database in existing PostgreSQL container and enable pgvector extension

**Checkpoint**: Backend runs, teacher registration/login works, JWT auth functional

---

## Phase 3: User Story 1 — Akademik Kaynaklara Soru Sorma (Priority: P1) 🎯 MVP

**Goal**: Öğretmen, doğal dilde soru sorar ve yalnızca akademik kaynaklara dayalı, kaynak atıflı yanıt alır. Kaynak bulunamazsa fallback mesajı döner.

**Independent Test**: POST /api/v1/query ile soru gönder → kaynak atıflı yanıt al. Kapsamdışı soruda fallback mesajı dön.

### Implementation for User Story 1

- [x] T019 [P] [US1] Create AcademicSource model in `backend/app/models/academic_source.py` — fields per data-model.md: id, title, source_type (enum: MEB/YOK_TEZ/MAKALE/SAGLIK_BAK), file_name, file_hash, page_count, upload_date, uploaded_by FK, is_indexed
- [x] T020 [P] [US1] Create SourceChunk model in `backend/app/models/source_chunk.py` — fields: id, source_id FK, content, embedding VECTOR(1024), fts_vector TSVECTOR, page_numbers ARRAY, chunk_index, chunk_size, chunk_overlap, embedding_model, ingestion_date, negative_feedback_count. Indexes: ivfflat on embedding, gin on fts_vector
- [x] T021 [P] [US1] Create RagResponse model in `backend/app/models/rag_response.py` — fields: id, teacher_id FK, student_id FK (nullable), query_text, disability_type, grade_level, response_text, is_fallback, latency fields, created_at
- [x] T022 [P] [US1] Create ResponseChunk junction model in `backend/app/models/response_chunk.py` — fields: response_id FK, chunk_id FK, similarity_score, rank_position (composite PK)
- [x] T023 [P] [US1] Create Source Pydantic schemas in `backend/app/schemas/source.py` — SourceUploadResponse, SourceStatusResponse, SourceListResponse per contracts/sources.md
- [x] T024 [P] [US1] Create Query Pydantic schemas in `backend/app/schemas/query.py` — QueryRequest (question, disability_type enum, grade_level 1-12, student_id optional), QueryResponse (answer, sources list, is_fallback, metadata) per contracts/rag.md
- [ ] T025 [US1] Create data ingestion pipeline in `backend/app/rag/ingestion.py` — PyPDFLoader for PDF parsing, RecursiveCharacterTextSplitter (chunk_size=1000, overlap=200), sentence-transformers embedding with multilingual-e5-large, batch insert to pgvector, FTS tsvector generation with Turkish config
- [ ] T026 [US1] Create hybrid retrieval engine in `backend/app/rag/retrieval.py` — pgvector cosine similarity search + PostgreSQL FTS, weighted score fusion (0.7 semantic + 0.3 keyword), MMR diversity filter, cosine threshold ≥0.70 enforcement
- [ ] T027 [US1] Create prompt templates in `backend/app/rag/prompts.py` — system prompt enforcing evidence-only responses, Türkçe output, citation format, delimiter-based prompt injection protection
- [ ] T028 [US1] Create RAG chain orchestrator in `backend/app/rag/chain.py` — LangChain ChatGroq with with_structured_output(), async invoke, fallback detection (no chunks above threshold → fallback response), latency tracking per stage
- [ ] T029 [US1] Create source service in `backend/app/services/source_service.py` — upload validation (PDF only, source_type whitelist, SHA-256 hash dedup), trigger ingestion pipeline, status tracking
- [ ] T030 [US1] Create source API endpoints in `backend/app/api/v1/sources.py` — POST /upload (multipart), GET /, GET /{id}, GET /{id}/status, DELETE /{id} per contracts/sources.md
- [ ] T031 [US1] Create query API endpoint in `backend/app/api/v1/query.py` — POST /query with input sanitization (prompt injection protection), disability_type + grade_level validation, RAG chain invocation, response persistence, graceful LLM degradation (FR-020) per contracts/rag.md
- [ ] T032 [US1] Create Alembic migration for academic_sources, source_chunks, rag_responses, response_chunks tables

**Checkpoint**: Öğretmen PDF yükler → indekslenir → soru sorar → kaynak atıflı yanıt alır. Fallback çalışır.

---

## Phase 4: User Story 2 — Öğrenci Profili & Gelişim İzleme (Priority: P2)

**Goal**: Öğretmen öğrenci profili oluşturur, RAG yanıtlarına geri bildirim verir, dashboard'da gelişim grafiklerini görür.

**Independent Test**: Öğrenci profili oluştur → geri bildirim ver → dashboard'da istatistikleri gör.

### Implementation for User Story 2

- [ ] T033 [P] [US2] Create Student model in `backend/app/models/student.py` — fields per data-model.md: id, teacher_id FK, name, disability_type enum, grade_level, competency_notes, is_active, timestamps. Unique constraint: (teacher_id, name)
- [ ] T034 [P] [US2] Create Feedback model in `backend/app/models/feedback.py` — fields: id, response_id FK, teacher_id FK, is_helpful boolean, created_at. Unique constraint: (response_id, teacher_id)
- [ ] T035 [P] [US2] Create Consent model in `backend/app/models/consent.py` — fields per data-model.md: id, teacher_id FK, student_id FK, consent_type, granted_at, revoked_at, consent_text
- [ ] T036 [P] [US2] Create Student Pydantic schemas in `backend/app/schemas/student.py` — StudentCreate, StudentUpdate, StudentResponse, StudentListResponse per contracts/students.md
- [ ] T037 [P] [US2] Create Feedback Pydantic schemas in `backend/app/schemas/feedback.py` — FeedbackCreate (response_id, is_helpful), FeedbackResponse
- [ ] T038 [US2] Create student service in `backend/app/services/student_service.py` — CRUD operations, teacher ownership validation, KVKK cascade delete (profile + sessions + metrics + feedbacks)
- [ ] T039 [US2] Create feedback service in `backend/app/services/feedback_service.py` — create feedback, update source_chunk negative_feedback_count when is_helpful=false (FR-013)
- [ ] T040 [US2] Create student API endpoints in `backend/app/api/v1/students.py` — POST /, GET /, GET /{id}, PATCH /{id}, DELETE /{id} (KVKK) per contracts/students.md
- [ ] T041 [US2] Create feedback API endpoint in `backend/app/api/v1/feedback.py` — POST /feedback per contracts/analytics.md
- [ ] T042 [US2] Create analytics service in `backend/app/services/analytics_service.py` — student progress aggregation (accuracy trend, avg response time, session count), dashboard summary
- [ ] T043 [US2] Create analytics API endpoints in `backend/app/api/v1/analytics.py` — GET /analytics/student/{id}, GET /analytics/dashboard per contracts/analytics.md
- [ ] T044 [US2] Create Alembic migration for students, feedbacks, consents tables

**Checkpoint**: Öğrenci CRUD çalışır, geri bildirim kaydedilir, analytics endpoint'leri veri döner.

---

## Phase 5: User Story 3 — Eğitici Oyun Etkileşimi (Priority: P3)

**Goal**: Öğrenci WebGL oyun oynar, performansına göre zorluk ayarlanır, veriler backend'e kaydedilir.

**Independent Test**: Oyun oturumu başlat → event gönder → zorluk ayarlansın → oturum bitir → performans raporu dön.

### Implementation for User Story 3

- [ ] T045 [P] [US3] Create GameSession model in `backend/app/models/game_session.py` — fields per data-model.md: id, student_id FK, started_at, ended_at, total_questions, correct/wrong_answers, initial/final_difficulty, avg_response_time_ms
- [ ] T046 [P] [US3] Create SessionEvent model in `backend/app/models/session_event.py` — fields: id, session_id FK (cascade delete), event_type enum (answer/difficulty_change/hint_shown), event_data JSONB, timestamp
- [ ] T047 [P] [US3] Create Session Pydantic schemas in `backend/app/schemas/session.py` — SessionCreate, SessionEventBatch, SessionEndResponse, SessionListResponse per contracts/game.md
- [ ] T048 [US3] Create session service in `backend/app/services/session_service.py` — start session (calibrate initial difficulty from last 3 sessions), batch event recording, difficulty adjustment algorithm (3-soru penceresi), end session summary
- [ ] T049 [US3] Create session API endpoints in `backend/app/api/v1/sessions.py` — POST /, POST /{id}/events, PATCH /{id}/end, GET /student/{student_id} per contracts/game.md
- [ ] T050 [US3] Create Alembic migration for game_sessions, session_events tables

**Checkpoint**: Oturum lifecycle çalışır, zorluk ayarlama algoritması doğru çıktı verir.

---

## Phase 6: User Story 4 — Adaptif Öğrenme Döngüsü (Priority: P4)

**Goal**: Öğrenci performans verileri RAG sorgusuna bağlam olarak eklenir, olumsuz geri bildirim retrieval sıralamasını etkiler, oyun kalibrasyonu performans geçmişine göre yapılır.

**Independent Test**: Öğrenci performans verisi biriktikten sonra aynı soru farklılaşmış yanıt üretir. Olumsuz geri bildirimli chunk düşürülür.

### Implementation for User Story 4

- [ ] T051 [US4] Create adaptive context builder in `backend/app/rag/context_builder.py` — collect student performance summary (last N sessions, accuracy trend, common error types), format as prompt context, inject into RAG chain
- [ ] T052 [US4] Update hybrid retrieval in `backend/app/rag/retrieval.py` — apply negative feedback penalty (FR-013: reduce score for chunks with high negative_feedback_count), re-rank results considering feedback history
- [ ] T053 [US4] Update RAG chain in `backend/app/rag/chain.py` — integrate context_builder output into prompt when student_id is provided, add performance-aware response generation
- [ ] T054 [US4] Update session service difficulty calibration in `backend/app/services/session_service.py` — use last 3 sessions average accuracy for initial difficulty, factor in disability_type-specific adjustments

**Checkpoint**: Kapalı döngü çalışır — performans verisi RAG yanıtını etkiler, geri bildirim retrieval'ı etkiler, oyun kalibrasyonu doğru.

---

## Phase 7: Frontend (React SPA)

**Purpose**: Tüm backend API'lerini tüketen kullanıcı arayüzü

- [ ] T055 [P] Create API client service in `frontend/src/services/api.ts` — Axios/fetch wrapper with JWT auth interceptor, base URL config, error handling
- [ ] T056 [P] Create auth pages in `frontend/src/pages/Login.tsx` and `frontend/src/pages/Register.tsx` — form validation, token storage
- [ ] T057 [P] Create routing and layout in `frontend/src/App.tsx` — React Router, auth guard, sidebar navigation, responsive layout
- [ ] T058 Create student management page in `frontend/src/pages/Students.tsx` — CRUD list/detail with disability type filter, WCAG 2.1 AA compliance
- [ ] T059 Create RAG query interface in `frontend/src/pages/Query.tsx` — question form with disability_type and grade_level selectors, response display with source citations, feedback buttons (helpful/not helpful)
- [ ] T060 Create student dashboard in `frontend/src/pages/StudentDashboard.tsx` — time series charts (accuracy, response time), session history, progress trend indicator
- [ ] T061 Create source management page in `frontend/src/pages/Sources.tsx` — PDF upload with drag-drop, source list, indexing status polling
- [ ] T062 Create game embed component in `frontend/src/components/GameEmbed/GameEmbed.tsx` — Unity WebGL loader, jslib bridge for event communication, fallback error message if WebGL unavailable
- [ ] T063 Create main dashboard in `frontend/src/pages/Dashboard.tsx` — overview stats, student summary cards, source stats per contracts/analytics.md

**Checkpoint**: Frontend tüm backend endpoint'lerini kullanır, WCAG 2.1 AA uyumlu.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, güvenlik, dokümantasyon

- [ ] T064 [P] Add KVKK consent flow in `backend/app/api/v1/students.py` — require consent before student data creation, consent revocation triggers cascade delete (FR-017, FR-018)
- [ ] T065 [P] Add input sanitization middleware in `backend/app/core/security.py` — prompt injection detection, special character stripping, delimiter enforcement (FR-015)
- [ ] T066 [P] Add structured logging for RAG pipeline in `backend/app/rag/chain.py` — log embedding_latency_ms, retrieval_latency_ms, llm_latency_ms, total_latency_ms per request (FR-021)
- [ ] T067 [P] Add error handling and retry logic in `backend/app/rag/chain.py` — exponential backoff for LLM API failures (1s, 4s, 16s), circuit breaker pattern (FR-020)
- [ ] T068 Add embedding model version check in `backend/app/rag/ingestion.py` — compare stored embedding_model with current config, flag mismatch for re-indexing
- [ ] T069 Run quickstart.md validation — verify all setup steps, test full flow end-to-end
- [ ] T070 API documentation review — verify Swagger UI at /docs matches contracts/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — core RAG functionality
- **US2 (Phase 4)**: Depends on Foundational — can run in parallel with US1
- **US3 (Phase 5)**: Depends on Foundational — can run in parallel with US1, US2
- **US4 (Phase 6)**: Depends on US1 + US2 + US3 — integrates all layers
- **Frontend (Phase 7)**: Depends on US1 at minimum — can start after Phase 3
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         Phase 3     Phase 4     Phase 5
         (US1:RAG)   (US2:Prof)  (US3:Game)
              │          │          │
              └──────────┼──────────┘
                         ▼
                    Phase 6 (US4: Adaptif Döngü)
                         │
                         ▼
                    Phase 7 (Frontend)
                         │
                         ▼
                    Phase 8 (Polish)
```

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1**: T003, T004 can run in parallel
**Phase 2**: T008, T009, T010 can run in parallel after T006+T007
**Phase 3 (US1)**: T019-T024 (all models + schemas) can run in parallel
**Phase 4 (US2)**: T033-T037 (all models + schemas) can run in parallel
**Phase 5 (US3)**: T045-T047 (all models + schemas) can run in parallel
**Phase 7**: T055-T057 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all models for US1 together:
Task: "Create AcademicSource model in backend/app/models/academic_source.py"
Task: "Create SourceChunk model in backend/app/models/source_chunk.py"
Task: "Create RagResponse model in backend/app/models/rag_response.py"
Task: "Create ResponseChunk model in backend/app/models/response_chunk.py"

# Launch all schemas for US1 together:
Task: "Create Source schemas in backend/app/schemas/source.py"
Task: "Create Query schemas in backend/app/schemas/query.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (RAG sorgusu + kaynak yükleme)
4. **STOP and VALIDATE**: PDF yükle → soru sor → kaynak atıflı yanıt al
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (RAG) → Test → **MVP teslimi!**
3. Add US2 (Profil + Feedback) → Test → İkinci iterasyon
4. Add US3 (Oyun) → Test → Üçüncü iterasyon
5. Add US4 (Adaptif) → Test → Tam platform
6. Add Frontend → Test → Kullanıcıya açık platform
7. Polish → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
