"""Integration Tests — Feedback API"""

import pytest
from uuid import uuid4


class TestFeedbackAPI:
    """POST /api/v1/feedback"""

    @pytest.mark.asyncio
    async def test_feedback_without_valid_response_id(self, auth_client):
        """Olmayan response_id ile feedback vermek hata döner."""
        fake_id = str(uuid4())
        res = await auth_client.post("/api/v1/feedback", json={
            "response_id": fake_id,
            "is_helpful": True,
        })
        assert res.status_code == 409  # "Yanıt bulunamadı"

    @pytest.mark.asyncio
    async def test_feedback_requires_auth(self, client):
        """Auth olmadan feedback gönderilemez."""
        res = await client.post("/api/v1/feedback", json={
            "response_id": str(uuid4()),
            "is_helpful": True,
        })
        assert res.status_code in (401, 403)
