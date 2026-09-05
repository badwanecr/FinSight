from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

import httpx

from common.tests import AuthenticatedAPITestCase


class _FakeResponse:
    def __init__(self, status_code=200, json_data=None, text=""):
        self.status_code = status_code
        self._json = json_data if json_data is not None else {}
        self.text = text

    def json(self):
        if isinstance(self._json, Exception):
            raise self._json
        return self._json


def _client_returning(response=None, exc=None):
    """Build a context-manager mock mimicking httpx.Client."""
    cm = MagicMock()
    inner = MagicMock()
    if exc is not None:
        inner.post.side_effect = exc
    else:
        inner.post.return_value = response
    cm.return_value.__enter__.return_value = inner
    return cm


class DjangoToFastAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.make_txn(amount="500.00", transaction_date=date.today().isoformat())

    def test_successful_summary_proxied_and_cached(self):
        payload = {"total_spending": 500, "transaction_count": 1}
        fake = _client_returning(response=_FakeResponse(200, payload))
        with patch("analytics.client.httpx.Client", fake):
            resp = self.client.get("/api/analytics/summary/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["total_spending"], 500)

        # Second call served from cache — no HTTP client constructed.
        with patch("analytics.client.httpx.Client") as should_not_call:
            resp2 = self.client.get("/api/analytics/summary/")
            should_not_call.assert_not_called()
        self.assertEqual(resp2.json()["data"]["total_spending"], 500)

    def test_timeout_returns_friendly_503(self):
        fake = _client_returning(exc=httpx.TimeoutException("boom"))
        with patch("analytics.client.httpx.Client", fake):
            resp = self.client.get("/api/analytics/trends/")
        self.assertEqual(resp.status_code, 503)
        body = resp.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error_code"], "ANALYTICS_UNAVAILABLE")
        self.assertIn("temporarily unavailable", body["message"])

    def test_upstream_5xx_returns_503(self):
        fake = _client_returning(response=_FakeResponse(500, text="server error"))
        with patch("analytics.client.httpx.Client", fake):
            resp = self.client.get("/api/analytics/categories/")
        self.assertEqual(resp.status_code, 503)

    def test_invalid_json_returns_503(self):
        bad = _FakeResponse(200)
        bad._json = ValueError("no json")
        fake = _client_returning(response=bad)
        with patch("analytics.client.httpx.Client", fake):
            resp = self.client.get("/api/analytics/analyze/")
        self.assertEqual(resp.status_code, 503)

    def test_dashboard_survives_analytics_outage(self):
        fake = _client_returning(exc=httpx.ConnectError("down"))
        with patch("analytics.client.httpx.Client", fake):
            resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertFalse(data["analytics_available"])
        # Local cards still computed.
        self.assertIn("summary", data)
        self.assertEqual(data["summary"]["monthly_expenses"], 500.0)
        self.assertEqual(data["anomaly_alerts"], [])
