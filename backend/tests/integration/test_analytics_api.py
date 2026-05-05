"""Integration Tests — Analytics Dashboard API"""

import pytest


class TestAnalyticsAPI:
    """GET /api/v1/analytics/dashboard"""

    @pytest.mark.asyncio
    async def test_dashboard_returns_stats(self, auth_client):
        res = await auth_client.get("/api/v1/analytics/dashboard")
        assert res.status_code == 200
        data = res.json()
        assert "total_students" in data
        assert "source_stats" in data
        assert "total_sources" in data["source_stats"]
        assert "total_chunks" in data["source_stats"]
        assert "total_queries" in data["source_stats"]

    @pytest.mark.asyncio
    async def test_dashboard_requires_auth(self, client):
        res = await client.get("/api/v1/analytics/dashboard")
        assert res.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_student_analytics_not_found(self, auth_client):
        from uuid import uuid4
        res = await auth_client.get(f"/api/v1/analytics/student/{uuid4()}")
        assert res.status_code == 404
