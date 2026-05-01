# API Contract: Game Sessions

**Base**: `/api/v1/sessions`
**Auth**: Bearer token required

---

## POST /

Yeni oyun oturumu başlatır. Öğrencinin mevcut performansına göre başlangıç zorluk seviyesini hesaplar.

**Request**:
```json
{
  "student_id": "uuid"
}
```

**Response 201**:
```json
{
  "session_id": "uuid",
  "student_id": "uuid",
  "initial_difficulty": "medium",
  "calibration_source": "last_3_sessions_average",
  "started_at": "2026-04-26T14:00:00Z"
}
```

---

## POST /{session_id}/events

Oyun sırasında event gönderimi (batch destekli).

**Request**:
```json
{
  "events": [
    {
      "event_type": "answer",
      "event_data": {
        "question_id": 1,
        "is_correct": true,
        "response_time_ms": 3200
      },
      "timestamp": "2026-04-26T14:01:05Z"
    },
    {
      "event_type": "difficulty_change",
      "event_data": {
        "from": "medium",
        "to": "medium-hard",
        "reason": "4_of_5_correct"
      },
      "timestamp": "2026-04-26T14:02:30Z"
    }
  ]
}
```

**Response 200**:
```json
{
  "accepted": 2,
  "next_difficulty": "medium-hard"
}
```

---

## PATCH /{session_id}/end

Oturumu sonlandırır ve performans özetini hesaplar.

**Response 200**:
```json
{
  "session_id": "uuid",
  "total_questions": 20,
  "correct_answers": 14,
  "wrong_answers": 6,
  "accuracy_rate": 0.70,
  "avg_response_time_ms": 3500,
  "initial_difficulty": "medium",
  "final_difficulty": "medium-hard",
  "duration_seconds": 480
}
```

---

## GET /student/{student_id}

Öğrencinin tüm oturum geçmişi.

**Query Params**: `?page=1&size=10&sort=started_at:desc`

**Response 200**: Sayfalanmış oturum listesi
