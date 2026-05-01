# API Contract: Analytics & Feedback

**Base**: `/api/v1`
**Auth**: Bearer token required

---

## POST /feedback

**Request**:
```json
{
  "response_id": "uuid",
  "is_helpful": false
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "response_id": "uuid",
  "is_helpful": false,
  "created_at": "2026-04-26T14:30:00Z"
}
```

**Response 409**: `{ "detail": "Bu yanıt için zaten geri bildirim verilmiş" }`

---

## GET /analytics/student/{student_id}

Dashboard için öğrenci gelişim verileri.

**Response 200**:
```json
{
  "student_id": "uuid",
  "student_name": "Ali",
  "disability_type": "disleksi",
  "total_sessions": 12,
  "overall_accuracy": 0.68,
  "trend": "improving",
  "time_series": [
    {
      "date": "2026-04-20",
      "session_count": 2,
      "accuracy_rate": 0.55,
      "avg_response_time_ms": 4200
    },
    {
      "date": "2026-04-23",
      "session_count": 3,
      "accuracy_rate": 0.65,
      "avg_response_time_ms": 3800
    },
    {
      "date": "2026-04-26",
      "session_count": 2,
      "accuracy_rate": 0.75,
      "avg_response_time_ms": 3200
    }
  ],
  "difficulty_progression": ["easy", "medium", "medium", "medium-hard"],
  "recent_feedback_summary": {
    "total": 8,
    "helpful": 6,
    "not_helpful": 2
  }
}
```

---

## GET /analytics/dashboard

Öğretmenin tüm öğrencilerine genel bakış.

**Response 200**:
```json
{
  "total_students": 5,
  "total_sessions": 45,
  "avg_accuracy_all": 0.62,
  "students_summary": [
    {
      "id": "uuid",
      "name": "Ali",
      "disability_type": "disleksi",
      "last_session": "2026-04-26T14:00:00Z",
      "accuracy_trend": "improving",
      "sessions_count": 12
    }
  ],
  "source_stats": {
    "total_sources": 8,
    "total_chunks": 450,
    "total_queries": 120,
    "avg_satisfaction_rate": 0.78
  }
}
```
