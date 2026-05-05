"""Integration Tests — Auth Flow (Register → Login → Token → Refresh)"""

import pytest
from uuid import uuid4


class TestAuthRegister:
    """POST /api/v1/auth/register"""

    @pytest.mark.asyncio
    async def test_register_success(self, client):
        email = f"new_{uuid4().hex[:8]}@school.edu.tr"
        res = await client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "securepass123",
            "full_name": "Yeni Öğretmen",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == email
        assert data["full_name"] == "Yeni Öğretmen"
        assert "id" in data
        assert "hashed_password" not in data  # Şifre açığa çıkmamalı

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client):
        email = f"dup_{uuid4().hex[:8]}@school.edu.tr"
        # İlk kayıt
        await client.post("/api/v1/auth/register", json={
            "email": email, "password": "pass123", "full_name": "Birinci",
        })
        # Tekrar aynı email
        res = await client.post("/api/v1/auth/register", json={
            "email": email, "password": "pass456", "full_name": "İkinci",
        })
        assert res.status_code in (409, 422)  # DB veya Pydantic'te yakalanabilir

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        res = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email", "password": "pass123", "full_name": "Test",
        })
        assert res.status_code == 422  # Pydantic validation

    @pytest.mark.asyncio
    async def test_register_short_password(self, client):
        res = await client.post("/api/v1/auth/register", json={
            "email": f"short_{uuid4().hex[:6]}@t.com", "password": "12", "full_name": "Test",
        })
        assert res.status_code == 422


class TestAuthLogin:
    """POST /api/v1/auth/login"""

    @pytest.mark.asyncio
    async def test_login_success(self, client):
        email = f"login_{uuid4().hex[:8]}@school.edu.tr"
        # Önce kayıt
        await client.post("/api/v1/auth/register", json={
            "email": email, "password": "mypassword", "full_name": "Login Test",
        })
        # Login
        res = await client.post("/api/v1/auth/login", json={
            "email": email, "password": "mypassword",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client):
        email = f"wp_{uuid4().hex[:8]}@school.edu.tr"
        await client.post("/api/v1/auth/register", json={
            "email": email, "password": "correct_pass", "full_name": "WP Test",
        })
        res = await client.post("/api/v1/auth/login", json={
            "email": email, "password": "wrong_pass",
        })
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        res = await client.post("/api/v1/auth/login", json={
            "email": "ghost@nowhere.com", "password": "anything",
        })
        assert res.status_code == 401


class TestAuthProtectedEndpoints:
    """Korumalı endpoint'lere erişim testleri."""

    @pytest.mark.asyncio
    async def test_access_without_token_returns_403(self, client):
        res = await client.get("/api/v1/sources")
        assert res.status_code in (401, 403)  # HTTPBearer davranışı

    @pytest.mark.asyncio
    async def test_access_with_invalid_token_returns_401(self, client):
        res = await client.get(
            "/api/v1/sources",
            headers={"Authorization": "Bearer invalid_token_here"},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_access_with_valid_token_succeeds(self, auth_client):
        res = await auth_client.get("/api/v1/sources")
        assert res.status_code == 200
