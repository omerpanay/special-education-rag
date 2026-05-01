"""Güvenlik Modülü — JWT Auth & Password Hashing.

Constitution İlkesi I (Zero-Hallucination) ile doğrudan ilişkili değil
ama Constitution IV (Strict Type Safety) burada Pydantic ile enforced.

JWT (JSON Web Token) Nasıl Çalışır:
1. Öğretmen email + şifre ile login olur
2. Sunucu şifreyi doğrular → access_token + refresh_token üretir
3. Frontend her istekte Authorization: Bearer <access_token> gönderir
4. Sunucu token'ı doğrular → öğretmenin kim olduğunu anlar

Neden Access + Refresh Token?
- Access token kısa ömürlü (15dk): Çalınsa bile kısa süre geçerli
- Refresh token uzun ömürlü (7 gün): Yeni access token almak için
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

settings = get_settings()

# ── JWT Bearer Scheme ──
# FastAPI'nin security dependency'si — Authorization header'ını okur
bearer_scheme = HTTPBearer()

# Bcrypt kaç round kullanacak?
# 12 = ~250ms hash süresi → saldırgana saniyede ~4 deneme hakkı verir
# 10 olsaydı ~60ms → çok hızlı. 14 olsaydı ~1sn → kullanıcı bekler
_BCRYPT_ROUNDS = 12


def hash_password(password: str) -> str:
    """Duz metin sifreyi bcrypt hash'e cevir.

    Ornek: 'sifre12345' -> '$2b$12$LJ3m4x...' (60 karakter hash)
    Ayni sifre her seferinde FARKLI hash uretir — neden?
    bcrypt her hash isleminde rastgele bir 'salt' ekler.
    Bu sayede rainbow table saldirilari engellenir.

    passlib yerine direkt bcrypt: passlib 2020'den beri guncellenmedi,
    bcrypt 5.x ile uyumsuz. Direkt bcrypt daha guvenli.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kullanicinin girdigi sifreyi hash ile karsilastir.

    bcrypt.checkpw() — sabit zamanli karsilastirma yapar.
    Neden onemli? Normal '==' karsilastirmasi ilk farkli karakterde
    durur. Bu 'timing attack' acigindir. bcrypt bunu onler.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(data: dict[str, Any]) -> str:
    """Kısa ömürlü access token oluştur (15 dk).

    Token payload: {"sub": "teacher-uuid", "exp": 1234567890}
    "sub" = subject (kim), "exp" = expiration (ne zaman biter)
    """
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Uzun ömürlü refresh token oluştur (7 gün)."""
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Token'ı çöz ve payload'ı döndür.

    Hata durumları:
    - Süresi dolmuş → JWTError
    - Geçersiz imza → JWTError
    - Bozuk format → JWTError
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """FastAPI Dependency — her korumalı endpoint'te çağrılır.

    Kullanım:
        @router.get("/profile")
        async def get_profile(teacher = Depends(get_current_teacher)):
            return teacher

    Akış:
    1. Authorization header'dan token'ı al
    2. Token'ı decode et → teacher UUID'yi çıkar
    3. Veritabanından teacher'ı bul
    4. Bulunamazsa 401 hatası
    """
    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz token türü",
        )

    teacher_id = payload.get("sub")
    if teacher_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token'da kullanıcı bilgisi bulunamadı",
        )

    # Circular import'u önlemek için burada import
    from app.models.teacher import Teacher

    result = await db.execute(select(Teacher).where(Teacher.id == UUID(teacher_id)))
    teacher = result.scalar_one_or_none()

    if teacher is None or not teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya hesap deaktif",
        )

    return teacher
