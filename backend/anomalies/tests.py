from __future__ import annotations

from datetime import date
from unittest.mock import patch

from anomalies.models import Anomaly
from common.tests import AuthenticatedAPITestCase


class AnomalyPersistenceTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.txn_id = self.make_txn(amount="45000.00").json()["data"]["id"]

    def _engine_payload(self):
        return {
            "anomalies": [
                {
                    "transaction_id": self.txn_id,
                    "amount": 45000,
                    "category": "Food",
                    "merchant": "Test Merchant",
                    "date": date.today().isoformat(),
                    "detection_method": "ISOLATION_FOREST",
                    "anomaly_score": -0.82,
                    "severity": "HIGH",
                    "reason": "Much higher than your usual food spending.",
                }
            ]
        }

    def test_detect_persists_anomalies(self):
        with patch("anomalies.services.analytics_services.anomalies", return_value=self._engine_payload()):
            resp = self.client.post("/api/anomalies/detect/", {"method": "ALL"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["detected"], 1)
        self.assertEqual(Anomaly.objects.filter(user=self.user).count(), 1)

    def test_detect_is_idempotent_and_preserves_review_state(self):
        with patch("anomalies.services.analytics_services.anomalies", return_value=self._engine_payload()):
            self.client.post("/api/anomalies/detect/", {}, format="json")
            anomaly = Anomaly.objects.get(user=self.user)
            self.client.post(f"/api/anomalies/{anomaly.id}/review/")
            self.client.post("/api/anomalies/detect/", {}, format="json")
        anomaly.refresh_from_db()
        self.assertEqual(Anomaly.objects.filter(user=self.user).count(), 1)
        self.assertEqual(anomaly.status, "REVIEWED")

    def test_ignore_and_filter_by_severity(self):
        with patch("anomalies.services.analytics_services.anomalies", return_value=self._engine_payload()):
            self.client.post("/api/anomalies/detect/", {}, format="json")
        anomaly = Anomaly.objects.get(user=self.user)
        self.client.post(f"/api/anomalies/{anomaly.id}/ignore/")
        anomaly.refresh_from_db()
        self.assertEqual(anomaly.status, "IGNORED")
        self.assertTrue(anomaly.reviewed)

        body = self.client.get("/api/anomalies/?severity=HIGH").json()["data"]
        self.assertEqual(body["count"], 1)
        body = self.client.get("/api/anomalies/?severity=LOW").json()["data"]
        self.assertEqual(body["count"], 0)

    def test_user_isolation(self):
        with patch("anomalies.services.analytics_services.anomalies", return_value=self._engine_payload()):
            self.client.post("/api/anomalies/detect/", {}, format="json")
        self.client.force_authenticate(self.other)
        body = self.client.get("/api/anomalies/").json()["data"]
        self.assertEqual(body["count"], 0)
