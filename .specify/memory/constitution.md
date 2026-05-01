<!--
  SYNC IMPACT REPORT
  Version change: 0.0.0 → 1.0.0
  Bump rationale: MAJOR — Initial constitution ratification
  Added sections: Core Principles (6), Tech Stack & Standards,
                  AI System Guardrails, Development Workflow, Governance
  Removed sections: None (initial creation)
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ reviewed
    - .specify/templates/spec-template.md ✅ reviewed
    - .specify/templates/tasks-template.md ✅ reviewed
  Follow-up TODOs: None
-->

# EduRAG Constitution

**Mission**: Özel gereksinimli (disleksi, zihin yetersizliği,
otizm spektrum bozukluğu vb.) öğrencilerin eğitimini
desteklemek için öğretmenlere yönelik RAG tabanlı, tamamen
kanıta dayalı ve kişiselleştirilmiş bir öğrenme platformu
geliştirmek.

## Core Principles

### I. Zero-Hallucination Policy (NON-NEGOTIABLE)

- Sistem SADECE pgvector veritabanından retrieve edilen
  akademik kaynaklara dayalı yanıt üretmek ZORUNDADIR.
- Vektör cosine similarity skoru **0.70 eşiğinin** altında
  kalan sonuçlar kullanılMAMALIDIR. Eşik altında kalan
  sorgularda sistem şu standart yanıtı DÖNMEK ZORUNDADIR:
  `"İlgili akademik kaynak bulunamadı. Lütfen sorunuzu
  farklı şekilde ifade edin veya konu kapsamını daraltın."`
- LLM'nin kendi eğitim verisinden serbest üretim (free
  generation) yapması KESİNLİKLE YASAKLANMIŞTIR.
- LLM system prompt'unda `"Sadece sana verilen context
  bilgisine dayalı yanıt üret. Context dışı bilgi kullanma."`
  talimatı her zaman bulunmak ZORUNDADIR.
- Bu ilke hiçbir koşulda, hiçbir geliştirici tarafından
  gevşetilemez, bypass edilemez veya "geçici olarak"
  devre dışı bırakılAMAZ.
- **Doğrulama**: Her PR'da RAG chain'in fallback davranışı
  integration test ile kontrol edilmek ZORUNDADIR.

### II. Evidence-Based Only (Zorunlu Kanıt ve Atıf)

- Üretilen HER eğitim önerisi, dayandığı akademik kaynağı
  açıkça belirtmek ZORUNDADIR. Atıf formatı:
  `[Kaynak Başlığı, Sayfa/Bölüm, Benzerlik Skoru]`
- Kabul edilen kaynak türleri (whitelist):
  - MEB (Milli Eğitim Bakanlığı) resmî dokümanları
  - YÖK Ulusal Tez Merkezi'nden erişilen tezler
  - Hakemli (peer-reviewed) akademik makaleler
  - Sağlık Bakanlığı resmî rehberleri
- Whitelist dışı kaynaklar sisteme yüklenMEMELİDİR.
  Yükleme pipeline'ı kaynak türü doğrulaması içermek
  ZORUNDADIR.
- Kaynak atfı olmayan hiçbir öneri son kullanıcıya (öğretmene)
  sunulMAMALIDIR. Bu kural API response serialization
  katmanında enforce edilmek ZORUNDADIR.
- **Doğrulama**: Response schema'da `sources` alanı required
  olarak tanımlanmalı; boş sources dizisi 400 hatası DÖNMELIDIR.

### III. Async-First Architecture

- Tüm FastAPI endpoint'leri `async def` olarak tanımlanmak
  ZORUNDADIR. Senkron `def` endpoint'ler code review'da
  REDDEDİLMELİDİR (threadpool overhead nedeniyle).
- Veritabanı operasyonları asenkron driver üzerinden
  yürütülmek ZORUNDADIR:
  - SQLAlchemy 2.0+ AsyncSession veya asyncpg doğrudan kullanımı
  - Senkron `psycopg2` kullanımı YASAKLANMIŞTIR
- LangChain zincir çağrıları `ainvoke()`, `astream()`,
  `abatch()` asenkron metodları ile yapılmak ZORUNDADIR.
  Senkron `invoke()` sadece CLI script'lerinde ve tek seferlik
  migration araçlarında kullanılabilir.
- Harici servis çağrıları (embedding API, LLM API) `httpx.AsyncClient`
  veya `aiohttp` üzerinden yapılmak ZORUNDADIR.
- Event loop'u bloklayan herhangi bir çağrı (`time.sleep()`,
  senkron dosya I/O, senkron HTTP) tespit edildiğinde
  ilgili PR REDDEDİLMELİDİR.
- **Doğrulama**: CI pipeline'da `ruff` veya özel lint kuralı
  ile senkron blocking pattern'ler otomatik tespit edilmek
  ZORUNDADIR.

### IV. Strict Type Safety

- Tüm API request/response modelleri `pydantic.BaseModel`
  ile tanımlanmak ZORUNDADIR. Raw `dict` kabul eden
  endpoint YASAKLANMIŞTIR.
- Pydantic model konfigürasyonunda strict mode aktif
  olmak ZORUNDADIR:
  ```python
  model_config = ConfigDict(strict=True, frozen=True)
  ```
- Tüm fonksiyon imzalarında (public ve private) Python
  type hints kullanılmak ZORUNDADIR. `Any` tipi sadece
  gerekçeli istisnalarda kabul edilir.
- Engel türleri, sınıf seviyeleri ve kaynak kategorileri
  gibi sabit değer kümeleri `str` yerine `enum.Enum`
  veya `typing.Literal` ile tanımlanmak ZORUNDADIR.
- LangChain chain çıktıları Pydantic `with_structured_output()`
  ile tiplendirilmek ZORUNDADIR. Parse edilmemiş string
  çıktılar son kullanıcıya iletilMEMELİDİR.
- **Doğrulama**: CI pipeline'da `mypy --strict` veya `pyright`
  ile statik tip kontrolü çalıştırılmak ZORUNDADIR.
  Tip hatası olan PR merge edilMEMELİDİR.

### V. Modular Separation

- Sistem üç bağımsız modülden oluşmak ZORUNDADIR:
  1. **Backend** (Python/FastAPI) — RAG pipeline, API, veritabanı
  2. **Frontend** (React veya Vue.js) — Öğretmen arayüzü
  3. **Game Module** (Unity/C#) — WebGL oyun motoru
- Modüller arası iletişim SADECE tanımlı kontratlar
  üzerinden yapılmak ZORUNDADIR:
  - Backend ↔ Frontend: REST API (OpenAPI 3.0 spec)
  - Frontend ↔ Game: JavaScript Bridge (`postMessage` API
    veya Unity `SendMessage` / `jslib` köprülemesi)
- Hiçbir modül diğerinin iç implementasyonuna (internal
  fonksiyon, private state, veritabanı tablosu) doğrudan
  erişMEMELİDİR.
- Her modül kendi bağımsız test suite'ine sahip olmak
  ZORUNDADIR. Bir modülün testi, diğer modülün çalışıyor
  olmasına bağımlı olMAMALIDIR (mock/stub kullanılmalı).
- Modül sürümleri birbirinden bağımsız yönetilebilmek
  ZORUNDADIR. Backend v2'ye geçerken Frontend v1'de
  kalabilmelidir (API versiyonlama ile).
- **Doğrulama**: Her modülün CI pipeline'ı diğer modüllerden
  bağımsız olarak çalışabilmek ZORUNDADIR.

### VI. Academic Source Traceability (Veri Soyu İzlenebilirliği)

- pgvector'e eklenen HER chunk şu metadata alanlarını
  taşımak ZORUNDADIR:
  - `source_file`: Orijinal dosya adı (ör. `Disleksi_Kitabi_V1.pdf`)
  - `source_type`: Kaynak türü enum (`MEB | YOK_TEZ | MAKALE | SAGLIK_BAK`)
  - `page_numbers`: Chunk'ın ait olduğu sayfa aralığı
  - `chunk_index`: Dosya içindeki sıralı chunk numarası
  - `chunk_size`: Karakter cinsinden chunk boyutu
  - `chunk_overlap`: Önceki chunk ile örtüşme miktarı
  - `ingestion_date`: Sisteme yüklenme tarihi (ISO 8601)
  - `embedding_model`: Kullanılan embedding model adı ve versiyonu
- Metadata alanlarından herhangi biri eksik olan chunk
  veritabanına yazılMAMALIDIR. Ingestion pipeline validation
  hatası fırlatmak ZORUNDADIR.
- Herhangi bir LLM yanıtı, kullanılan chunk'ların
  `chunk_id`'lerine referans vermek ZORUNDADIR; böylece
  yanıt → chunk → kaynak dosya zinciri tam olarak
  izlenebilir olur.
- Kaynak dosyaları silindiğinde veya güncellendiğinde,
  ilişkili chunk'lar da güncellenmek veya invalidate
  edilmek ZORUNDADIR (orphan chunk yasağı).
- **Doğrulama**: Ingestion pipeline'da metadata completeness
  kontrolü unit test ile doğrulanmak ZORUNDADIR.

## Tech Stack & Standards

### Zorunlu Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Gerekçe |
|--------|-----------|----------|---------|
| Runtime | Python | 3.11+ | TaskGroup, ExceptionGroup desteği |
| Web Framework | FastAPI | 0.110+ | Native async, OpenAPI auto-gen |
| AI Orchestration | LangChain | 0.3+ | Chain composition, tool calling |
| Embedding | sentence-transformers | Latest stable | Türkçe uyumlu multilingual modeller |
| Vector DB | PostgreSQL + pgvector | PG 16+ / pgvector 0.7+ | SQL + vektör arama tek veritabanında |
| ORM | SQLAlchemy | 2.0+ (async) | AsyncSession, type-safe queries |
| Validation | Pydantic | 2.0+ | Strict mode, ConfigDict |
| Text Splitting | LangChain RecursiveCharacterTextSplitter | — | Dil-agnostik, örtüşme destekli |
| Frontend | React veya Vue.js | Latest LTS | Modüler bileşen mimarisi |
| Game Engine | Unity | 2022 LTS+ | WebGL export, C# scripting |
| HTTP Client | httpx | Latest stable | Async-native, HTTP/2 desteği |
| Testing | pytest + pytest-asyncio | Latest stable | Async test desteği |

### Yasaklanmış Teknolojiler

| Teknoloji | Neden Yasaklandı |
|-----------|-----------------|
| Flask / Django | Async-first ilkesi ile uyumsuz |
| psycopg2 (sync) | Blocking I/O, event loop'u dondurur |
| ChromaDB / Pinecone | pgvector ile tek DB standardı; harici vektör DB dağınıklık yaratır |
| requests (sync) | httpx async tercih edilmek ZORUNDADIR |
| LangChain Legacy (0.1.x) | Deprecated API'ler, güvenlik açıkları |

## AI System Guardrails

### LLM Prompt Güvenliği

- System prompt'u her zaman şu minimum talimatları
  içermek ZORUNDADIR:
  1. "Sadece sana verilen context bilgisine dayalı yanıt üret."
  2. "Context dışında bilgi kullanma, tahmin yapma, varsayımda bulunma."
  3. "Eğer verilen context soruyu yanıtlamaya yeterli değilse,
     bunu açıkça belirt."
  4. "Yanıtını Türkçe olarak ver."
  5. "Her önerinle birlikte kaynak referansı belirt."
- System prompt değişiklikleri versiyon kontrol altında
  tutulmak ZORUNDADIR ve review gerektirir.

### Prompt Injection Koruması

- Kullanıcı girdisi (öğretmen sorusu) LLM'ye gönderilmeden
  önce sanitize edilmek ZORUNDADIR.
- System prompt ile user prompt arasında açık ayrım
  (delimiter/tag) kullanılmak ZORUNDADIR.
- Kullanıcının system prompt'u override etmesine yol
  açabilecek pattern'ler (ör. "Ignore previous instructions")
  tespit edilip filtrelenmek ZORUNDADIR.

### Dinamik Zorluk Ayarlama (Oyun Modülü)

- Unity oyun modülü, öğrenci performans verisine göre
  zorluk seviyesini dinamik olarak ayarlamak ZORUNDADIR.
- Performans metrikleri (doğru cevap oranı, yanıt süresi,
  tekrar sayısı) Backend API üzerinden alınmak ZORUNDADIR.
- Zorluk algoritması şeffaf ve kayıt altında olmak
  ZORUNDADIR; hangi metriğin hangi zorluk değişikliğine
  yol açtığı izlenebilir olmalıdır.
- Zorluk seviyeleri aşırı uçlara (çok kolay/çok zor)
  sabitlenmeyi önleyen sınır değerlere sahip olmak
  ZORUNDADIR.

## Development Workflow

### Branching Stratejisi

- `main` branch her zaman deploy edilebilir durumda
  olmak ZORUNDADIR.
- Feature geliştirme `feature/<kısa-açıklama>` branch'larında
  yapılmak ZORUNDADIR.
- Her feature branch merge öncesi en az 1 code review
  almak ZORUNDADIR.

### Kod Kalitesi Kapıları (Quality Gates)

Her PR merge edilmeden önce şu kontroller geçmek ZORUNDADIR:
1. `mypy --strict` — Tip kontrolü başarılı
2. `ruff check` — Linting hatasız
3. `ruff format --check` — Kod formatlama standartlarına uygun
4. `pytest` — Tüm testler geçiyor
5. RAG fallback integration testi geçiyor
6. API response schema validation testi geçiyor

### Dokümantasyon

- Her public API endpoint'i docstring ile belgelenmek
  ZORUNDADIR.
- Her Pydantic model'in `Field(description=...)` ile
  alan açıklaması bulunmak ZORUNDADIR.
- RAG pipeline konfigürasyon değişiklikleri (chunk size,
  overlap, similarity threshold) CHANGELOG'a eklenmek
  ZORUNDADIR.

## Governance

- Bu constitution, proje genelindeki TÜM geliştirme
  kararlarının üzerinde otoriteye sahiptir.
- Constitution değişiklikleri şu süreci takip etmek
  ZORUNDADIR:
  1. Değişiklik önerisi yazılı olarak sunulmalı
  2. Etki analizi yapılmalı (hangi modüller etkilenir?)
  3. Semantic versioning ile versiyon güncellenmeli
  4. Tüm bağımlı template'ler senkronize edilmeli
- Versiyon yöneti:
  - **MAJOR**: İlke kaldırma veya köklü yeniden tanımlama
  - **MINOR**: Yeni ilke/bölüm ekleme veya genişletme
  - **PATCH**: İfade düzeltmeleri, typo, açıklama ekleme
- Compliance review: Her sprint sonunda constitution
  uyumluluğu retrospektif toplantısında değerlendirilmek
  ZORUNDADIR.
- Runtime geliştirme rehberi `AGENTS.md` dosyasında
  tutulmak ZORUNDADIR.

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
