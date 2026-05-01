# API Contract: Authentication

**Base**: `/api/v1/auth`

---

## POST /register

**Request**:
```json
{
  "email": "teacher@school.edu.tr",
  "password": "securePassword123!",
  "full_name": "Ayşe Yılmaz",
  "institution": "Atatürk İlkokulu",
  "branch": "Sınıf Öğretmeni"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "email": "teacher@school.edu.tr",
  "full_name": "Ayşe Yılmaz",
  "created_at": "2026-04-26T12:00:00Z"
}
```

**Response 409**: `{ "detail": "Bu e-posta adresi zaten kayıtlı" }`

---

## POST /login

**Request**:
```json
{
  "email": "teacher@school.edu.tr",
  "password": "securePassword123!"
}
```

**Response 200**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Response 401**: `{ "detail": "E-posta veya şifre hatalı" }`

---

## POST /refresh

**Request**: `Authorization: Bearer <refresh_token>`

**Response 200**: Yeni access + refresh token çifti

**Response 401**: `{ "detail": "Geçersiz veya süresi dolmuş token" }`
