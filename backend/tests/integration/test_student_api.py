"""Integration Tests — Student CRUD API"""

import pytest
from uuid import uuid4


class TestStudentCRUD:
    """POST/GET/PATCH/DELETE /api/v1/students"""

    @pytest.mark.asyncio
    async def test_create_student(self, auth_client):
        res = await auth_client.post("/api/v1/students", json={
            "name": "API Test Öğrenci",
            "disability_type": "disleksi",
            "grade_level": 4,
            "competency_notes": "Hece ayrıştırmada zorluk",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "API Test Öğrenci"
        assert data["disability_type"] == "disleksi"
        assert data["grade_level"] == 4
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_list_students(self, auth_client):
        # Öğrenci oluştur
        await auth_client.post("/api/v1/students", json={
            "name": f"List_{uuid4().hex[:6]}", "disability_type": "otizm", "grade_level": 2,
        })

        res = await auth_client.get("/api/v1/students")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_students_filter_disability(self, auth_client):
        await auth_client.post("/api/v1/students", json={
            "name": f"Filtre_{uuid4().hex[:6]}", "disability_type": "otizm", "grade_level": 3,
        })

        res = await auth_client.get("/api/v1/students?disability_type=otizm")
        assert res.status_code == 200
        data = res.json()
        for item in data["items"]:
            assert item["disability_type"] == "otizm"

    @pytest.mark.asyncio
    async def test_get_student_by_id(self, auth_client):
        create_res = await auth_client.post("/api/v1/students", json={
            "name": f"ByID_{uuid4().hex[:6]}", "disability_type": "disleksi", "grade_level": 5,
        })
        student_id = create_res.json()["id"]

        res = await auth_client.get(f"/api/v1/students/{student_id}")
        assert res.status_code == 200
        assert res.json()["id"] == student_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_student(self, auth_client):
        fake_id = str(uuid4())
        res = await auth_client.get(f"/api/v1/students/{fake_id}")
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_update_student(self, auth_client):
        create_res = await auth_client.post("/api/v1/students", json={
            "name": f"Update_{uuid4().hex[:6]}", "disability_type": "disleksi", "grade_level": 3,
        })
        student_id = create_res.json()["id"]

        res = await auth_client.patch(f"/api/v1/students/{student_id}", json={
            "grade_level": 6,
            "competency_notes": "Gelişme kaydetti",
        })
        assert res.status_code == 200
        assert res.json()["grade_level"] == 6
        assert res.json()["competency_notes"] == "Gelişme kaydetti"

    @pytest.mark.asyncio
    async def test_delete_student(self, auth_client):
        create_res = await auth_client.post("/api/v1/students", json={
            "name": f"Delete_{uuid4().hex[:6]}", "disability_type": "otizm", "grade_level": 1,
        })
        student_id = create_res.json()["id"]

        res = await auth_client.delete(f"/api/v1/students/{student_id}")
        assert res.status_code == 204

        # Silinen öğrenci artık bulunamaz
        get_res = await auth_client.get(f"/api/v1/students/{student_id}")
        assert get_res.status_code == 404

    @pytest.mark.asyncio
    async def test_create_duplicate_student(self, auth_client):
        name = f"Dup_{uuid4().hex[:6]}"
        await auth_client.post("/api/v1/students", json={
            "name": name, "disability_type": "disleksi", "grade_level": 3,
        })
        res = await auth_client.post("/api/v1/students", json={
            "name": name, "disability_type": "disleksi", "grade_level": 3,
        })
        assert res.status_code == 409
