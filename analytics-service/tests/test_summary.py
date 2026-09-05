from __future__ import annotations

from app.schemas.analytics import AnalyticsRequest
from app.services.spending_service import build_summary


def test_summary_endpoint(client, payload):
    resp = client.post("/analytics/summary", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == 123
    assert body["transaction_count"] == len(payload["transactions"])
    assert body["total_income"] == 480000.0  # 6 × 80,000
    assert body["total_spending"] > 0
    assert body["smallest_transaction"] <= body["median_transaction"] <= body["largest_transaction"]
    assert body["largest_transaction"] == 8000.0
    assert body["savings"] == round(body["total_income"] - body["total_spending"], 2)


def test_summary_savings_rate_matches_formula(payload):
    res = build_summary(AnalyticsRequest(**payload))
    expected = round(res.savings / res.total_income * 100, 2)
    assert res.savings_rate == expected


def test_summary_empty_dataset():
    res = build_summary(AnalyticsRequest(user_id=1, transactions=[]))
    assert res.total_spending == 0.0
    assert res.transaction_count == 0
    assert res.savings_rate == 0.0
    assert res.median_transaction == 0.0


def test_monthly_average_uses_month_span(payload):
    res = build_summary(AnalyticsRequest(**payload))
    # 6 distinct months in the fixture.
    assert res.monthly_average_spending == round(res.total_spending / 6, 2)
