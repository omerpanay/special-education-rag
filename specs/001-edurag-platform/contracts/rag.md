# API Contract: RAG Query

**Base**: `/api/v1/query`
**Auth**: Bearer token required

---

## POST /

Ana RAG sorgu endpoint'i. Zero-hallucination ve evidence-based ilkelerine uygun.

**Request**:
```json
{
  "question": "Disleksili 3. sınıf öğrencisine okuma akıcılığı nasıl kazandırılır?",
  "disability_type": "disleksi",
  "grade_level": 3,
  "student_id": "uuid (opsiyonel — adaptif bağlam için)"
}
```

**Response 200** (kaynak bulundu):
```json
{
  "answer": "Fonolojik farkındalık eğitimi, disleksili öğrencilerde okuma akıcılığını artırmada en etkili yöntemlerden biridir...",
  "sources": [
    {
      "title": "Okuma Güçlüğü Olan Öğrencilerin Fonolojik Farkındalık Düzeylerinin Gelişmesinde Müzik Eğitiminin Etkisi",
      "source_type": "MAKALE",
      "page_numbers": [12, 13],
      "similarity_score": 0.87,
      "chunk_id": "uuid"
    },
    {
      "title": "ÖZEL ÖĞRENME GÜÇLÜĞÜ ÖĞRETMENLER İÇİN REHBER",
      "source_type": "MEB",
      "page_numbers": [45],
      "similarity_score": 0.82,
      "chunk_id": "uuid"
    }
  ],
  "is_fallback": false,
  "metadata": {
    "total_latency_ms": 3200,
    "chunks_retrieved": 5,
    "chunks_used": 2,
    "student_context_used": true
  }
}
```

**Response 200** (kaynak bulunamadı — fallback):
```json
{
  "answer": "İlgili akademik kaynak bulunamadı. Lütfen sorunuzu farklı şekilde ifade edin veya konu kapsamını daraltın.",
  "sources": [],
  "is_fallback": true,
  "metadata": {
    "total_latency_ms": 800,
    "chunks_retrieved": 0,
    "chunks_used": 0,
    "student_context_used": false
  }
}
```

**Response 422**: Validation hatası (disability_type veya grade_level eksik)

**Response 503**: LLM API erişilemez — `{ "detail": "Yapay zeka servisi geçici olarak kullanılamıyor, sorgunuz kuyruğa alındı", "retry_after": 30 }`
