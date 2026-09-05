from __future__ import annotations

from datetime import date

from app.schemas.analytics import Granularity, TrendRequest
from app.services.trend_service import build_trends


def _mk(amounts_by_month):
    txns, idx = [], 1
    for month, total in amounts_by_month.items():
        txns.append({
            "id": idx, "amount": total, "category": "Food", "type": "EXPENSE",
            "date": date(2026, month, 10).isoformat(),
        })
        idx += 1
    return TrendRequest(user_id=1, transactions=txns, granularity=Granularity.MONTHLY)


def test_monthly_points_and_growth():
    req = _mk({6: 40000, 7: 48000, 8: 55000})
    res = build_trends(req)
    assert [p.period for p in res.points] == ["2026-06", "2026-07", "2026-08"]
    assert [p.spending for p in res.points] == [40000.0, 48000.0, 55000.0]
    # MoM growth from July (48k) to August (55k) ≈ 14.6%
    assert round(res.month_over_month_growth_pct) == 15
    assert res.trend == "increasing"


def test_average_monthly_spending():
    res = build_trends(_mk({1: 10000, 2: 20000, 3: 30000}))
    assert res.average_monthly_spending == 20000.0


def test_decreasing_trend():
    res = build_trends(_mk({1: 50000, 2: 40000, 3: 25000}))
    assert res.trend == "decreasing"


def test_weekly_granularity(client):
    txns = [
        {"id": 1, "amount": 100, "category": "Food", "type": "EXPENSE", "date": "2026-06-01"},
        {"id": 2, "amount": 200, "category": "Food", "type": "EXPENSE", "date": "2026-06-09"},
    ]
    resp = client.post("/analytics/trends", json={"user_id": 1, "transactions": txns, "granularity": "weekly"})
    assert resp.status_code == 200
    assert len(resp.json()["points"]) == 2


def test_empty_dataset():
    res = build_trends(TrendRequest(user_id=1, transactions=[]))
    assert res.points == []
    assert res.trend == "stable"
    assert res.month_over_month_growth_pct is None
