from __future__ import annotations


def test_rejects_negative_amount(client):
    resp = client.post(
        "/analytics/summary",
        json={"user_id": 1, "transactions": [
            {"id": 1, "amount": -50, "category": "Food", "type": "EXPENSE", "date": "2026-06-01"}
        ]},
    )
    assert resp.status_code == 422
    assert resp.json()["success"] is False


def test_rejects_bad_date(client):
    resp = client.post(
        "/analytics/summary",
        json={"user_id": 1, "transactions": [
            {"id": 1, "amount": 50, "category": "Food", "type": "EXPENSE", "date": "not-a-date"}
        ]},
    )
    assert resp.status_code == 422


def test_rejects_unknown_type(client):
    resp = client.post(
        "/analytics/anomalies",
        json={"user_id": 1, "transactions": [
            {"id": 1, "amount": 50, "category": "Food", "type": "REFUND", "date": "2026-06-01"}
        ], "method": "ALL"},
    )
    assert resp.status_code == 422


def test_missing_user_id(client):
    resp = client.post("/analytics/summary", json={"transactions": []})
    assert resp.status_code == 422


def test_health_ok(client):
    assert client.get("/health").json()["status"] == "ok"


def test_large_dataset_performs(client):
    from datetime import date, timedelta

    base = date(2025, 1, 1)
    txns = [
        {
            "id": i,
            "amount": 100 + (i % 900),
            "category": ["Food", "Shopping", "Bills", "Travel"][i % 4],
            "type": "EXPENSE",
            "date": (base + timedelta(days=i % 500)).isoformat(),
        }
        for i in range(1, 5001)
    ]
    resp = client.post("/analytics/analyze", json={"user_id": 1, "transactions": txns})
    assert resp.status_code == 200
    body = resp.json()
    assert body["summary"]["transaction_count"] == 5000
    assert "insights" in body
