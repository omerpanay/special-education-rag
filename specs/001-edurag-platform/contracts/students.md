# API Contract: Students

**Base**: `/api/v1/students`
**Auth**: Bearer token required

---

## POST /

**Request**:
```json
{
  "name": "Ali",
  "disability_type": "disleksi",
  "grade_level": 3,
  "competency_notes": "Harf-ses ilişkisinde zorluk yaşıyor"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "teacher_id": "uuid",
  "name": "Ali",
  "disability_type": "disleksi",
  "grade_level": 3,
  "competency_notes": "Harf-ses ilişkisinde zorluk yaşıyor",
  "created_at": "2026-04-26T12:00:00Z"
}
```

**Response 409**: `{ "detail": "Bu isimde bir öğrenci zaten mevcut" }`

---

## GET /

**Query Params**: `?disability_type=disleksi&grade_level=3&page=1&size=20`

**Response 200**:
```json
{
  "items": [ { "id": "...", "name": "Ali", ... } ],
  "total": 15,
  "page": 1,
  "size": 20
}
```

---

## GET /{student_id}

**Response 200**: Tek öğrenci detayı (profil + son performans özeti)

---

## PATCH /{student_id}

**Request**: Güncellenecek alanlar (partial update)

---

## DELETE /{student_id}

KVKK veri silme hakkı. İlişkili tüm verileri (oturumlar, metrikler, rızalar) kalıcı siler.

**Response 204**: No Content
