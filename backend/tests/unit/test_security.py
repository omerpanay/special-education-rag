"""Unit Tests — Security Module (JWT + Password Hashing)"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from jose import jwt

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

settings = get_settings()


class TestPasswordHashing:
    """Şifre hash'leme testleri."""

    def test_hash_password_produces_bcrypt_hash(self):
        hashed = hash_password("mypassword")
        assert hashed.startswith("$2b$")
        assert len(hashed) == 60

    def test_same_password_different_hashes(self):
        """Aynı şifre her seferinde farklı hash üretmeli (salt)."""
        h1 = hash_password("same_pass")
        h2 = hash_password("same_pass")
        assert h1 != h2

    def test_verify_correct_password(self):
        hashed = hash_password("correct_horse_battery")
        assert verify_password("correct_horse_battery", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_verify_empty_password(self):
        hashed = hash_password("real_password")
        assert verify_password("", hashed) is False


class TestJWTTokens:
    """JWT token oluşturma ve doğrulama testleri."""

    def test_access_token_contains_correct_claims(self):
        teacher_id = str(uuid4())
        token = create_access_token({"sub": teacher_id})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

        assert payload["sub"] == teacher_id
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_refresh_token_contains_correct_claims(self):
        teacher_id = str(uuid4())
        token = create_refresh_token({"sub": teacher_id})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

        assert payload["sub"] == teacher_id
        assert payload["type"] == "refresh"

    def test_access_token_expires_in_correct_timeframe(self):
        token = create_access_token({"sub": "test"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

        exp = datetime.fromtimestamp(payload["exp"], tz=UTC)
        now = datetime.now(UTC)
        diff = exp - now

        # 15 dakika ± 10 saniye tolerans
        assert timedelta(minutes=14, seconds=50) < diff < timedelta(minutes=15, seconds=10)

    def test_decode_expired_token_raises(self):
        """Süresi dolmuş token hata vermeli."""
        expired_payload = {
            "sub": "test",
            "exp": datetime.now(UTC) - timedelta(hours=1),
            "type": "access",
        }
        expired_token = jwt.encode(expired_payload, settings.secret_key, algorithm=settings.algorithm)

        with pytest.raises(Exception):
            decode_token(expired_token)

    def test_decode_invalid_token_raises(self):
        """Geçersiz token hata vermeli."""
        with pytest.raises(Exception):
            decode_token("this.is.not.a.valid.token")

    def test_decode_token_with_wrong_secret_raises(self):
        """Yanlış secret ile imzalanan token reddedilmeli."""
        token = jwt.encode({"sub": "test", "type": "access"}, "wrong_secret", algorithm="HS256")
        with pytest.raises(Exception):
            decode_token(token)
