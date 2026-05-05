"""Integration Tests — Source Upload + List API"""

import pytest


class TestSourcesAPI:
    """GET /api/v1/sources"""

    @pytest.mark.asyncio
    async def test_list_sources_success(self, auth_client):
        res = await auth_client.get("/api/v1/sources")
        assert res.status_code == 200
        data = res.json()
        # API `items` veya `sources` anahtarıyla dönebilir
        assert "items" in data or "sources" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_list_sources_requires_auth(self, client):
        res = await client.get("/api/v1/sources")
        assert res.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_upload_requires_auth(self, client):
        res = await client.post("/api/v1/sources/upload")
        assert res.status_code in (401, 403)
