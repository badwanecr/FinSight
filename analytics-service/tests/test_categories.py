from __future__ import annotations

from app.schemas.analytics import AnalyticsRequest
from app.services.category_service import build_categories


def test_category_breakdown_endpoint(client, payload):
    resp = client.post("/analytics/categories", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    names = [c["category"] for c in body["categories"]]
    assert "Food" in names and "Shopping" in names
    assert "Salary" not in names  # income excluded from spending breakdown
    assert abs(sum(c["percentage"] for c in body["categories"]) - 100.0) < 0.5
    assert body["largest_category"] == body["categories"][0]["category"]


def test_per_category_math():
    txns = [
        {"id": 1, "amount": 100, "category": "Food", "type": "EXPENSE", "date": "2026-06-01"},
        {"id": 2, "amount": 300, "category": "Food", "type": "EXPENSE", "date": "2026-06-02"},
        {"id": 3, "amount": 600, "category": "Bills", "type": "EXPENSE", "date": "2026-06-03"},
    ]
    res = build_categories(AnalyticsRequest(user_id=1, transactions=txns))
    food = next(c for c in res.categories if c.category == "Food")
    assert food.total == 400.0
    assert food.count == 2
    assert food.average == 200.0
    assert food.maximum == 300.0
    assert food.percentage == 40.0


def test_empty_dataset():
    res = build_categories(AnalyticsRequest(user_id=1, transactions=[]))
    assert res.categories == []
    assert res.largest_category is None
