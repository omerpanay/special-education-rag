"""Contract Tests — API response schema doğrulama.

Backend response'larının contracts/ dosyalarındaki
şemalara uygunluğunu kontrol eder.
"""

import pytest
from uuid import uuid4


class TestAuthContract:
    """contracts/auth.md uyumu"""

    @pytest.mark.asyncio
    async def test_register_response_schema(self, client):
        res = await client.post("/api/v1/auth/register", json={
            "email": f"contract_{uuid4().hex[:8]}@test.com",
            "password": "contractpass",
            "full_name": "Contract Test",
        })
        data = res.json()
        # contracts/auth.md: id, email, full_name, created_at
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "created_at" in data
        # Şifre kesinlikle döndürülmemeli
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_login_response_schema(self, client):
        email = f"lcontract_{uuid4().hex[:8]}@test.com"
        await client.post("/api/v1/auth/register", json={
            "email": email, "password": "contractpass", "full_name": "Contract",
        })
        res = await client.post("/api/v1/auth/login", json={
            "email": email, "password": "contractpass",
        })
        data = res.json()
        # contracts/auth.md: access_token, refresh_token, token_type, expires_in
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data


class TestSourceContract:
    """contracts/sources.md uyumu"""

    @pytest.mark.asyncio
    async def test_source_list_response_schema(self, auth_client):
        res = await auth_client.get("/api/v1/sources")
        data = res.json()
        # contracts/sources.md: items/sources array, total count
        sources = data.get("items") or data.get("sources", [])
        assert isinstance(sources, list)
        if sources:
            source = sources[0]
            assert "id" in source
            assert "title" in source
            assert "source_type" in source
            assert "is_indexed" in source


class TestStudentContract:
    """contracts/students.md uyumu"""

    @pytest.mark.asyncio
    async def test_student_create_response_schema(self, auth_client):
        res = await auth_client.post("/api/v1/students", json={
            "name": f"Schema_{uuid4().hex[:6]}",
            "disability_type": "disleksi",
            "grade_level": 3,
        })
        data = res.json()
        # contracts/students.md: id, teacher_id, name, disability_type, grade_level, is_active
        assert "id" in data
        assert "teacher_id" in data
        assert "name" in data
        assert "disability_type" in data
        assert "grade_level" in data
        assert "is_active" in data

    @pytest.mark.asyncio
    async def test_student_list_response_schema(self, auth_client):
        res = await auth_client.get("/api/v1/students")
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)


class TestAnalyticsContract:
    """contracts/analytics.md uyumu"""

    @pytest.mark.asyncio
    async def test_dashboard_response_schema(self, auth_client):
        res = await auth_client.get("/api/v1/analytics/dashboard")
        data = res.json()
        # contracts/analytics.md
        assert "total_students" in data
        assert "total_sessions" in data
        assert "source_stats" in data
        assert "students_summary" in data
        assert isinstance(data["students_summary"], list)
