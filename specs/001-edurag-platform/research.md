# Research: EduRAG Platform

**Date**: 2026-04-26
**Feature**: 001-edurag-platform

## R1: Embedding Model Seçimi (Türkçe Desteği)

**Decision**: `intfloat/multilingual-e5-large`
**Rationale**:
- 1024 boyutlu vektör, yüksek doğruluk
- Türkçe + İngilizce dahil 100+ dilde eğitilmiş — veritabanında hem Türkçe MEB/YÖK kaynakları hem İngilizce akademik makaleler olacağı için çoklu dil desteği kritik
- Aynı embedding modeli ile Türkçe sorgu ↔ İngilizce chunk eşleştirmesi yapılabilir (cross-lingual retrieval)
- MTEB benchmark'ta multilingual kategoride lider
- sentence-transformers kütüphanesi ile doğrudan uyumlu
- Alternatiflere göre Türkçe+İngilizce retrieval görevlerinde tutarlı performans

**Alternatives Considered**:
- `all-MiniLM-L6-v2`: 384 boyut, hızlı ama yalnızca İngilizce odaklı. Türkçe performansı düşük.
- `paraphrase-multilingual-MiniLM-L12-v2`: 384 boyut, multilingual ama accuracy düşük.
- OpenAI `text-embedding-3-large`: Yüksek kalite ama her istek ücretli, vendor lock-in riski.

## R2: Chunking Stratejisi

**Decision**: `RecursiveCharacterTextSplitter` — chunk_size=1000, chunk_overlap=200
**Rationale**:
- Türkçe akademik metinler ortalama 1 paragraf = 800-1200 karakter
- 1000 karakter, anlam bütünlüğünü koruyacak kadar büyük
- 200 karakter overlap, paragraflar arası bağlam kaybını önler
- RecursiveCharacterTextSplitter, önce paragraf sonra cümle sınırlarından böler → anlam korunur

**Alternatives Considered**:
- `TokenTextSplitter`: Token bazlı bölme, dil-agnostik ama Türkçe'de anlamsal sınırları kaçırır.
- `SemanticChunker`: Anlam bazlı bölme, ileri düzey ama yavaş ve embedding model bağımlı.
- Sabit karakter bölme: Basit ama cümle ortasından keser.

## R3: Hibrit Arama Stratejisi

**Decision**: pgvector cosine similarity + PostgreSQL tsvector FTS, ağırlıklı skor birleştirme (0.7 semantic + 0.3 keyword)
**Rationale**:
- Tek veritabanında hem vektör hem FTS → ek altyapı yok
- Ağırlık oranı (70/30) akademik RAG literatüründeki yaygın başlangıç noktası
- MMR (Maximal Marginal Relevance) ile sonuç çeşitlendirme eklenir
- PostgreSQL'in `to_tsvector('turkish', ...)` Türkçe dil desteği mevcut

**Alternatives Considered**:
- Elasticsearch + pgvector: Daha güçlü FTS ama ek altyapı karmaşıklığı.
- Sadece vektör arama: Terim kesinliği kaybolur (ör. "KVKK" gibi spesifik terimlerde zayıf).
- BM25 + vektör (ayrı indeksler): Karmaşık orkestrasyon, MVP için gereksiz.

## R4: LLM Provider Stratejisi

**Decision**: Groq API — `llama-3.3-70b-versatile` (birincil), konfigürasyonla değiştirilebilir
**Rationale**:
- Ücretsiz tier mevcut (rate limit'li ama MVP için yeterli)
- Groq'un LPU (Language Processing Unit) donanımı ile çok düşük latency (~500ms)
- LangChain `ChatGroq` (`langchain-groq` paketi) ile tam entegrasyon
- `with_structured_output()` ✅ — Pydantic model çıktısı destekli (method="json_schema")
- Tool calling ✅, native async ✅, token-level streaming ✅
- `llama-3.3-70b-versatile`: Türkçe'de güçlü, structured output uyumlu
- Model değişimi sadece config değişikliği gerektirir (LangChain abstraction)

**Alternatives Considered**:
- GLM-4 (ChatGLM): Çin menşeli açık kaynak model, ancak LangChain entegrasyonu olgunlaşmamış. Resmi `langchain-glm` paketi yok; community-driven çözümler güvenilirlik riski taşıyor.
- OpenAI GPT-4o-mini: Yüksek kalite ama ücretli; Groq ücretsiz tier ile aynı model ailesi (Llama) çalıştırılabiliyor.
- Yerel model (Ollama + Llama): Sıfır maliyet ama GPU gerekir, deployment karmaşıklığı.

## R5: Authentication Stratejisi

**Decision**: JWT (JSON Web Token) tabanlı stateless authentication
**Rationale**:
- FastAPI ile native entegrasyon (`fastapi-jwt-auth` veya `python-jose`)
- Stateless: Session storage gerektirmez, ölçeklenebilir
- Access token (kısa ömürlü, 15dk) + Refresh token (uzun ömürlü, 7 gün) pattern

**Alternatives Considered**:
- Session-based (cookie): Stateful, sunucu tarafı session store gerekir.
- OAuth2 (Google/Microsoft): Dış sağlayıcı bağımlılığı; okul ağlarında engellenebilir.

## R6: Frontend Framework

**Decision**: React (Vite ile)
**Rationale**:
- En geniş ekosistem ve topluluk desteği
- Vite ile hızlı HMR (Hot Module Replacement)
- Unity WebGL embed için community çözümleri mevcut (`react-unity-webgl`)
- Chart kütüphaneleri (Recharts, Chart.js) ile dashboard grafikleri
- WCAG 2.1 AA uyumlu component library'ler mevcut (Radix UI, React Aria)

**Alternatives Considered**:
- Vue.js: Daha kolay öğrenme eğrisi ama Unity WebGL entegrasyonu için daha az community resource.
- Next.js: SSR gereksiz; bu proje SPA olarak yeterli.

## R7: Graceful Degradation Stratejisi (LLM Failure)

**Decision**: Retry queue + exponential backoff + feature-level circuit breaker
**Rationale**:
- LLM API çökerse sadece RAG özelliği etkilenir
- Profil yönetimi, dashboard, oyun modülü bağımsız çalışır
- Başarısız sorgular kuyruğa alınır, 3 deneme (1s, 4s, 16s aralarla)
- 3 denemeden sonra kullanıcıya kalıcı hata mesajı gösterilir

## R8: Structured Logging

**Decision**: Python `structlog` + JSON formatter
**Rationale**:
- Yapılandırılmış JSON log çıktısı (constitution FR-021)
- FastAPI middleware ile otomatik request/response loglama
- RAG pipeline gecikme metrikleri: embedding süresi, retrieval süresi, LLM süresi
- Correlation ID ile request izlenebilirliği
