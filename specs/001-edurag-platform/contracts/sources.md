# API Contract: Sources (Kaynak Yönetimi)

**Base**: `/api/v1/sources`
**Auth**: Bearer token required

---

## POST /upload

Multipart file upload. PDF dosyasını alır, doğrular, chunk'lar ve indeksler.

**Request**: `multipart/form-data`
- `file`: PDF dosyası (max 50MB)
- `title`: Kaynak başlığı
- `source_type`: `MEB | YOK_TEZ | MAKALE | SAGLIK_BAK`

**Response 202** (Accepted — async processing):
```json
{
  "id": "uuid",
  "title": "Disleksi Kitabı V1",
  "source_type": "MEB",
  "file_name": "Disleksi_Kitabi_V1.pdf",
  "status": "PROCESSING",
  "page_count": null,
  "chunk_count": null
}
```

**Response 409**: `{ "detail": "Bu dosya zaten yüklenmiş (hash eşleşmesi)" }`
**Response 415**: `{ "detail": "Yalnızca PDF formatı kabul edilmektedir" }`
**Response 422**: `{ "detail": "Geçersiz kaynak türü" }`

---

## GET /

**Query Params**: `?source_type=MEB&is_indexed=true&page=1&size=20`

**Response 200**: Sayfalanmış kaynak listesi

---

## GET /{source_id}

**Response 200**: Kaynak detayı + chunk istatistikleri

---

## GET /{source_id}/status

İndeksleme durumunu sorgulama.

**Response 200**:
```json
{
  "id": "uuid",
  "status": "INDEXED",
  "page_count": 85,
  "chunk_count": 142,
  "processing_time_ms": 45000
}
```

---

## DELETE /{source_id}

Kaynağı ve tüm ilişkili chunk'ları siler (cascade).

**Response 204**: No Content
