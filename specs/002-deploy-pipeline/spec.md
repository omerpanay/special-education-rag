# Feature Specification: EduRAG Production Deployment Pipeline

**Feature Branch**: `002-deploy-pipeline`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "Uygulama geliştirildi, deploy edilmesi lazım. Detaylı yol haritası."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend API Canlıya Alınır (Priority: P1)

Bir sistem yöneticisi veya geliştirici, EduRAG FastAPI backend'ini
üretim ortamına deploy eder. Öğretmenler bu andan itibaren gerçek
internet üzerinden `/api/v1/` endpoint'lerine erişir, login olur,
öğrenci ekler ve SENSEI'a soru sorar.

**Why this priority**: Tüm diğer katmanlar (frontend, AI pipeline)
backend'e bağlıdır. Backend olmadan sistem çalışmaz.

**Independent Test**: Backend container ayağa kalktığında
`GET /health` → `{"status": "healthy"}` döner. Swagger UI `/docs`
üzerinden login ve query endpoint'leri manuel test edilebilir.

**Acceptance Scenarios**:

1. **Given** backend Docker image build edilmiş ve registry'de, **When** `docker compose up` çalıştırılır, **Then** 60 saniye içinde `/health` 200 döner.
2. **Given** backend çalışıyor, **When** geçersiz JWT ile istek atılır, **Then** 401 Unauthorized döner.
3. **Given** `.env` dosyasında `GROQ_API_KEY` eksik, **When** container başlar, **Then** uygulama hata loglar ve başlamaz (fail-fast).

---

### User Story 2 - Veritabanı ve pgvector Hazırlanır (Priority: P1)

Sistem yöneticisi, PostgreSQL + pgvector veritabanını üretim
ortamında kurar, Alembic migration'larını çalıştırır ve akademik
PDF kaynakları yüklenerek RAG pipeline'ı hazır hâle getirilir.

**Why this priority**: pgvector olmadan RAG retrieval çalışmaz;
tüm sorular fallback döner.

**Independent Test**: Migration sonrası `SELECT * FROM alembic_version`
ile son revision doğrulanır. Bir test PDF yüklenerek
`GET /api/v1/sources` listede görünür.

**Acceptance Scenarios**:

1. **Given** boş PostgreSQL container, **When** `alembic upgrade head` çalıştırılır, **Then** tüm tablolar ve pgvector extension hatasız oluşur.
2. **Given** migration tamamlanmış, **When** bir PDF yüklenir, **Then** `/api/v1/sources` listesinde görünür ve chunk sayısı > 0'dır.
3. **Given** pgvector extension yüklü değil, **When** migration çalışır, **Then** açıklayıcı hata mesajı ile durur.

---

### User Story 3 - Frontend Statik Olarak Serve Edilir (Priority: P2)

Öğretmenler, tarayıcılarından EduRAG React arayüzüne erişir.
Uygulama CDN veya Nginx üzerinden serve edilir; backend API
ile CORS sorunu yaşanmaz.

**Why this priority**: Backend çalışsa bile öğretmenler
arayüz olmadan sistemi kullanamaz.

**Independent Test**: Tarayıcıdan frontend URL'e gidildiğinde
login sayfası yüklenir. Login sonrası dashboard görünür.

**Acceptance Scenarios**:

1. **Given** frontend build yapılmış, **When** Nginx ile serve edilir, **Then** tarayıcıda hiç CORS hatası olmadan API çağrıları başarılı olur.
2. **Given** kullanıcı `/dashboard` URL'ine doğrudan gider, **Then** 404 yerine React app yüklenir (SPA fallback).
3. **Given** backend down ise, **When** frontend yüklenir, **Then** kullanıcıya anlamlı "bağlantı kurulamıyor" mesajı görünür.

---

### User Story 4 - Secret ve Ortam Değişkenleri Güvenle Yönetilir (Priority: P1)

Tüm API anahtarları (Groq, HuggingFace, Tavily), DB şifresi ve
JWT secret key kaynak koda girmeden, güvenli şekilde üretim
ortamına aktarılır.

**Why this priority**: Hardcoded secret → Güvenlik ihlali,
repo'da gizli bilgi → CVSS kritik bulgu.

**Independent Test**: Repo'da `grep -r "GROQ_API_KEY" --include="*.py"`
hiçbir hardcoded değer döndürmez. Container env'de key mevcutsa
servis çalışır.

**Acceptance Scenarios**:

1. **Given** `.env.example` şablonu mevcut, **When** ops ekibi `.env` oluşturur ve docker compose çalıştırır, **Then** tüm servisler ayağa kalkar.
2. **Given** `SECRET_KEY` env var eksik, **When** backend başlar, **Then** Pydantic Settings ValidationError ile açık hata verir.
3. **Given** `.gitignore`'da `.env` var, **When** `git status` kontrol edilir, **Then** `.env` dosyası tracked olarak görünmez.

---

### User Story 5 - Sistem İzlenir ve Log'lar Erişilebilir (Priority: P3)

DevOps ekibi veya geliştirici, canlı sistemin sağlığını izler;
hata durumunda log'lara erişerek root cause analizi yapar.

**Why this priority**: İzleme olmadan üretim sorunları kör
noktada kalır; ancak önce sistem çalışır hâlde olmalıdır.

**Independent Test**: `docker compose logs backend` çalıştırıldığında
JSON formatlı log satırları görünür. `/health` 200 döner.

**Acceptance Scenarios**:

1. **Given** bir öğretmen soru sorar, **When** log akışı izlenir, **Then** correlation_id ile retrieval + LLM latency logları görünür.
2. **Given** Groq API yanıt vermez, **When** endpoint çağrılır, **Then** hata log'da exception stack trace ile kayıtlıdır.

---

### Edge Cases

- `.env` dosyası eksikken sistem başlarsa ne olur? → Fail-fast, açık hata.
- pgvector extension PostgreSQL'de kurulu değilse migration ne yapar? → Hata fırlatır, tablo oluşturulmaz.
- Frontend build sırasında `VITE_API_URL` eksikse → Build zamanı uyarı, runtime API çağrısı başarısız olur.
- Docker image build sırasında Python paketi kurulumu başarısız olursa → Build hata ile durur, bozuk image push edilmez.
- Disk dolduğunda PDF upload ne yapar? → 507 Insufficient Storage veya OS hatası — graceful handling gerekli.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem Docker Compose ile tek komutla (`docker compose up -d`) başlatılabilmek ZORUNDADIR.
- **FR-002**: Tüm hassas bilgiler (API key, DB şifresi, JWT secret) ortam değişkeni olarak alınmak ZORUNDADIR; kaynak kodda hardcoded OLAMAZ.
- **FR-003**: Alembic migration'ları container başlangıcında otomatik veya tek komutla çalıştırılabilmek ZORUNDADIR.
- **FR-004**: Backend `/health` endpoint'i load balancer ve monitoring araçları için 200 döndürmek ZORUNDADIR.
- **FR-005**: Frontend production build'i Nginx veya eşdeğer statik sunucu ile serve edilmek ZORUNDADIR; SPA fallback yapılandırılmış olmak ZORUNDADIR.
- **FR-006**: CORS yapılandırması production domain'ini kapsayacak şekilde güncellenmiş olmak ZORUNDADIR; `localhost` izinleri production'da kapatılmak ZORUNDADIR.
- **FR-007**: Tüm servis log'ları JSON formatında ve correlation_id ile üretilmek ZORUNDADIR.
- **FR-008**: Sistem `.env.example` şablon dosyası ile belgelenmiş olmak ZORUNDADIR; ops ekibi bu şablondan `.env` oluşturabilmek ZORUNDADIR.
- **FR-009**: PDF upload dosyaları kalıcı depolama (Docker volume veya object storage) üzerinde saklanmak ZORUNDADIR; container yeniden başlatıldığında veri kaybolmamalıdır.
- **FR-010**: Static materyal dosyaları (PDF, görseller) Nginx üzerinden erişilebilir olmak ZORUNDADIR.

### Key Entities

- **Docker Compose Stack**: backend, db (PostgreSQL+pgvector), nginx servisleri.
- **Environment Config**: `.env` dosyası — Groq key, HF token, Tavily key, DB URL, JWT secret, debug flag.
- **Persistent Volumes**: `postgres_data` (DB), `uploads` (PDF'ler), `static` (görseller, PDF çıktıları).
- **Nginx Config**: Backend proxy_pass, frontend static serve, SPA fallback, `/static` mount.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tüm servisler `docker compose up -d` ile 90 saniye içinde sağlıklı (healthy) duruma geçer.
- **SC-002**: `/health` endpoint'i sürekli 200 döndürür; tek bir environment değişkeni eksikliği sistemi başlatmaz (fail-fast doğrulanmış).
- **SC-003**: Öğretmen, fresh deployment sonrası 5 dakika içinde kayıt olabilir, PDF yükleyebilir ve SENSEI'a soru sorabilir (uçtan uca test geçer).
- **SC-004**: Container yeniden başlatıldığında veritabanı ve yüklenen PDF'ler kaybolmaz (volume persistence doğrulanmış).
- **SC-005**: Kaynak kodda hiçbir secret hardcoded değildir (`git log` ve `grep` ile doğrulanmış).
- **SC-006**: Frontend, backend API'ye CORS hatası olmadan bağlanır; tarayıcı console'da CORS hatası görünmez.

---

## Assumptions

- Hedef platform **PaaS** (Render veya Railway) — Docker desteği olan cloud ortamı; manuel Linux sunucu yönetimi kapsam dışı.
- Veritabanı **managed PostgreSQL** (Render Postgres veya Supabase) olarak barındırılır; pgvector extension platform tarafından desteklenmektedir.
- İlk deploy için SSL sertifikası platform tarafından otomatik sağlanır (Render/Railway HTTPS default).
- Ölçek: 50 öğretmen, 200 öğrenci — tek backend instance yeterlidir; horizontal scaling bu aşamada kapsam dışı.
- Mevcut `omer_proje_db` geliştirme container'ı üretimde kullanılmaz; platform managed DB ile başlanır.
- CI/CD (GitHub Actions → otomatik deploy tetikleyici) ilk aşamada kapsam dışıdır; manual git push deploy yeterlidir.
- Frontend `npm run build` ile `dist/` klasörü üretilmekte ve mevcut durumdadır.
- Groq, HuggingFace, Tavily ve **LangSmith** API anahtarları geliştirici tarafından temin edilmiştir.
- LangSmith ücretsiz tier (10K trace/ay) bu ölçek için yeterlidir.

## Clarifications

### Session 2026-05-17

- Q: Deployment ortamı nerede? → A: PaaS (Render veya Railway) — cloud, Dockerfile push → otomatik deploy.
- Q: Observability/tracing için ne kullanılacak? → A: LangSmith — `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY` env var ile; tüm LangChain/LangGraph chain'leri otomatik izlenir.
- Q: Veritabanı nerede barındırılacak? → A: Managed PostgreSQL (Render Postgres veya Supabase) — pgvector extension destekli, volume yönetimi platform tarafından.
- Q: Migration ne zaman çalışacak? → A: Entrypoint script ile container startup'ta otomatik `alembic upgrade head`, ardından uvicorn başlar.
- Q: Frontend nasıl serve edilecek? → A: Render Static Site (veya Railway static deploy) — `npm run build` çıktısı `dist/` klasörü platform tarafından CDN'e dağıtılır.
