# Data Model: EduRAG Platform

**Date**: 2026-04-26
**Feature**: 001-edurag-platform

## Entity Relationship Diagram

```
teachers 1──N students 1──N game_sessions
    │                            │
    │                            N
    │                     session_events
    │
    1──N rag_responses N──M source_chunks (via response_chunks)
              │
              1──N feedbacks

academic_sources 1──N source_chunks

teachers 1──N consents
students 1──N consents
```

## Tables

### teachers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| email | VARCHAR(255) | UNIQUE, NOT NULL | E-posta (login) |
| hashed_password | VARCHAR(255) | NOT NULL | Bcrypt hash |
| full_name | VARCHAR(100) | NOT NULL | Ad soyad |
| institution | VARCHAR(200) | NULL | Kurum adı |
| branch | VARCHAR(100) | NULL | Branş (ör. Sınıf Öğretmeni) |
| is_active | BOOLEAN | DEFAULT true | Hesap aktif mi |
| created_at | TIMESTAMPTZ | DEFAULT now() | Oluşturma tarihi |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Son güncelleme |

**Index**: `idx_teachers_email` ON email

---

### students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| teacher_id | UUID | FK → teachers.id, NOT NULL | Sahip öğretmen |
| name | VARCHAR(100) | NOT NULL | Öğrenci adı |
| disability_type | VARCHAR(30) | NOT NULL, CHECK IN ('disleksi', 'zihin_yetersizligi', 'otizm') | Engel türü (enum) |
| grade_level | SMALLINT | NOT NULL, CHECK 1-12 | Sınıf seviyesi |
| competency_notes | TEXT | NULL | Yetkinlik notları |
| is_active | BOOLEAN | DEFAULT true | Aktif/arşiv durumu |
| created_at | TIMESTAMPTZ | DEFAULT now() | Oluşturma tarihi |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Son güncelleme |

**Unique Constraint**: `uq_student_teacher_name` ON (teacher_id, name)
**Index**: `idx_students_teacher` ON teacher_id

---

### academic_sources

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| title | VARCHAR(500) | NOT NULL | Kaynak başlığı |
| source_type | VARCHAR(20) | NOT NULL, CHECK IN ('MEB', 'YOK_TEZ', 'MAKALE', 'SAGLIK_BAK') | Kaynak türü (enum) |
| file_name | VARCHAR(255) | NOT NULL | Orijinal dosya adı |
| file_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 hash (duplikasyon önleme) |
| page_count | INTEGER | NULL | Sayfa sayısı |
| upload_date | TIMESTAMPTZ | DEFAULT now() | Yükleme tarihi |
| uploaded_by | UUID | FK → teachers.id | Yükleyen öğretmen |
| is_indexed | BOOLEAN | DEFAULT false | İndeksleme tamamlandı mı |

**Index**: `idx_sources_type` ON source_type

---

### source_chunks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| source_id | UUID | FK → academic_sources.id, NOT NULL, ON DELETE CASCADE | Ait olduğu kaynak |
| content | TEXT | NOT NULL | Chunk metin içeriği |
| embedding | VECTOR(1024) | NOT NULL | multilingual-e5-large vektörü |
| fts_vector | TSVECTOR | NOT NULL | PostgreSQL full text search vektörü |
| page_numbers | INTEGER[] | NOT NULL | Ait olduğu sayfalar |
| chunk_index | INTEGER | NOT NULL | Dosya içi sıra numarası |
| chunk_size | INTEGER | NOT NULL | Karakter sayısı |
| chunk_overlap | INTEGER | NOT NULL | Önceki chunk ile örtüşme |
| embedding_model | VARCHAR(100) | NOT NULL | Kullanılan model adı+versiyonu |
| ingestion_date | TIMESTAMPTZ | DEFAULT now() | İndeksleme tarihi |
| negative_feedback_count | INTEGER | DEFAULT 0 | Olumsuz geri bildirim sayısı |

**Index**: `idx_chunks_embedding` USING ivfflat ON embedding vector_cosine_ops (lists=100)
**Index**: `idx_chunks_fts` USING gin ON fts_vector
**Index**: `idx_chunks_source` ON source_id
**Constraint**: CHECK chunk_size > 0 AND chunk_overlap >= 0

---

### rag_responses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| teacher_id | UUID | FK → teachers.id, NOT NULL | Soru soran öğretmen |
| student_id | UUID | FK → students.id, NULL | İlgili öğrenci (opsiyonel) |
| query_text | TEXT | NOT NULL | Öğretmenin sorusu |
| disability_type | VARCHAR(30) | NOT NULL | Sorgu bağlamındaki engel türü |
| grade_level | SMALLINT | NOT NULL | Sorgu bağlamındaki sınıf |
| response_text | TEXT | NOT NULL | Üretilen yanıt |
| is_fallback | BOOLEAN | DEFAULT false | Fallback yanıt mı? |
| total_latency_ms | INTEGER | NULL | Toplam yanıt süresi (ms) |
| embedding_latency_ms | INTEGER | NULL | Embedding süresi (ms) |
| retrieval_latency_ms | INTEGER | NULL | Retrieval süresi (ms) |
| llm_latency_ms | INTEGER | NULL | LLM süresi (ms) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Oluşturma tarihi |

**Index**: `idx_responses_teacher` ON teacher_id
**Index**: `idx_responses_student` ON student_id

---

### response_chunks (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| response_id | UUID | FK → rag_responses.id, NOT NULL | Yanıt referansı |
| chunk_id | UUID | FK → source_chunks.id, NOT NULL | Kullanılan chunk |
| similarity_score | FLOAT | NOT NULL | Cosine similarity skoru |
| rank_position | SMALLINT | NOT NULL | Sıralama pozisyonu |

**PK**: (response_id, chunk_id)

---

### feedbacks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| response_id | UUID | FK → rag_responses.id, NOT NULL | İlgili yanıt |
| teacher_id | UUID | FK → teachers.id, NOT NULL | Geri bildirim veren |
| is_helpful | BOOLEAN | NOT NULL | Faydalı mı? |
| created_at | TIMESTAMPTZ | DEFAULT now() | Geri bildirim tarihi |

**Unique Constraint**: `uq_feedback_response_teacher` ON (response_id, teacher_id)

---

### game_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| student_id | UUID | FK → students.id, NOT NULL | Oyuncu öğrenci |
| started_at | TIMESTAMPTZ | NOT NULL | Oturum başlangıcı |
| ended_at | TIMESTAMPTZ | NULL | Oturum bitişi |
| total_questions | INTEGER | DEFAULT 0 | Toplam soru sayısı |
| correct_answers | INTEGER | DEFAULT 0 | Doğru cevap sayısı |
| wrong_answers | INTEGER | DEFAULT 0 | Yanlış cevap sayısı |
| initial_difficulty | VARCHAR(20) | NOT NULL | Başlangıç zorluk seviyesi |
| final_difficulty | VARCHAR(20) | NULL | Bitiş zorluk seviyesi |
| avg_response_time_ms | INTEGER | NULL | Ortalama yanıt süresi |

**Index**: `idx_sessions_student` ON student_id
**Index**: `idx_sessions_started` ON started_at DESC

---

### session_events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| session_id | UUID | FK → game_sessions.id, NOT NULL, ON DELETE CASCADE | Ait olduğu oturum |
| event_type | VARCHAR(30) | NOT NULL, CHECK IN ('answer', 'difficulty_change', 'hint_shown') | Olay türü |
| event_data | JSONB | NOT NULL | Olay detayları |
| timestamp | TIMESTAMPTZ | DEFAULT now() | Olay zamanı |

**Index**: `idx_events_session` ON session_id

---

### consents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Benzersiz tanımlayıcı |
| teacher_id | UUID | FK → teachers.id, NOT NULL | İlgili öğretmen |
| student_id | UUID | FK → students.id, NOT NULL | İlgili öğrenci |
| consent_type | VARCHAR(50) | NOT NULL | Rıza türü (ör. 'veri_toplama') |
| granted_at | TIMESTAMPTZ | DEFAULT now() | Rıza verilme tarihi |
| revoked_at | TIMESTAMPTZ | NULL | Rıza iptal tarihi (NULL = aktif) |
| consent_text | TEXT | NOT NULL | Onaylanan rıza metni |

**Unique Constraint**: `uq_consent_active` ON (teacher_id, student_id, consent_type) WHERE revoked_at IS NULL

## State Transitions

### Academic Source Lifecycle

```
UPLOADED → PROCESSING → INDEXED → ACTIVE
                │
                └→ FAILED (re-try possible)
```

### Game Session Lifecycle

```
STARTED → IN_PROGRESS → COMPLETED
                │
                └→ ABANDONED (timeout after 30min inactivity)
```

### Consent Lifecycle

```
GRANTED → ACTIVE (revoked_at IS NULL)
              │
              └→ REVOKED (revoked_at IS NOT NULL → trigger data deletion)
```
