from __future__ import annotations

from datetime import date

import pandas as pd

from app.analytics.statistics import iqr_bounds, modified_zscores, zscores
from app.ml import isolation_forest
from app.schemas.analytics import AnomalyRequest, DetectionMethod
from app.services.anomaly_service import detect_anomalies
from app.utils.preprocessing import expenses_only, to_dataframe


def _food(i, amt, day=1):
    return {"id": i, "amount": amt, "category": "Food", "type": "EXPENSE",
            "date": date(2026, 6, day).isoformat()}


# ── pure stat helpers ────────────────────────────────────────
def test_zscore_flags_strong_outlier():
    import numpy as np

    values = np.array([500, 700, 800, 900, 1000, 8000], dtype="float64")
    assert abs(zscores(values)[-1]) > 2
    assert abs(modified_zscores(values)[-1]) > 3


def test_iqr_bounds_formula():
    import numpy as np

    values = np.array([10, 12, 14, 16, 18, 20, 22, 24], dtype="float64")
    q1, q3, lower, upper = iqr_bounds(values, 1.5)
    iqr = q3 - q1
    assert lower == round(q1 - 1.5 * iqr, 2)
    assert upper == round(q3 + 1.5 * iqr, 2)


# ── z-score detector ─────────────────────────────────────────
def test_zscore_detector_catches_8000_food():
    txns = [_food(i, amt, day=i) for i, amt in enumerate([500, 700, 800, 900, 1000, 600, 750], start=1)]
    txns.append(_food(99, 8000, day=20))
    res = detect_anomalies(AnomalyRequest(user_id=1, transactions=txns, method=DetectionMethod.ZSCORE))
    flagged = {a.transaction_id for a in res.anomalies}
    assert 99 in flagged
    item = next(a for a in res.anomalies if a.transaction_id == 99)
    assert item.detection_method == DetectionMethod.ZSCORE
    assert "higher than your average Food" in item.reason
    assert item.severity in {"HIGH", "CRITICAL", "MEDIUM"}


def test_zscore_skips_small_groups():
    txns = [_food(1, 500), _food(2, 20000)]  # only 2 → below min_group_size
    res = detect_anomalies(AnomalyRequest(user_id=1, transactions=txns, method=DetectionMethod.ZSCORE))
    assert res.anomaly_count == 0


# ── IQR detector ─────────────────────────────────────────────
def test_iqr_detector_flags_high_value():
    txns = [_food(i, amt, day=i) for i, amt in enumerate([100, 120, 130, 140, 150, 160, 170], start=1)]
    txns.append(_food(50, 5000, day=25))
    res = detect_anomalies(AnomalyRequest(user_id=1, transactions=txns, method=DetectionMethod.IQR))
    assert 50 in {a.transaction_id for a in res.anomalies}


# ── isolation forest ─────────────────────────────────────────
def test_isolation_forest_returns_predictions():
    txns = [_food(i, 500 + (i % 5) * 20, day=(i % 27) + 1) for i in range(1, 30)]
    txns.append(_food(500, 40000, day=15))
    df = expenses_only(to_dataframe([_to_model(t) for t in txns]))
    result = isolation_forest.detect(df, contamination=0.1)
    assert not result.empty
    assert set(result["prediction"].unique()).issubset({-1, 1})


def test_isolation_forest_too_few_rows():
    txns = [_food(i, 500) for i in range(1, 5)]
    df = expenses_only(to_dataframe([_to_model(t) for t in txns]))
    assert isolation_forest.detect(df).empty


# ── combined / API ───────────────────────────────────────────
def test_all_methods_merge_to_one_row_per_txn(client):
    txns = [_food(i, amt, day=i) for i, amt in enumerate([500, 700, 800, 900, 1000, 600, 750, 650], start=1)]
    txns.append(_food(77, 9000, day=20))
    resp = client.post("/analytics/anomalies", json={"user_id": 1, "transactions": txns, "method": "ALL"})
    assert resp.status_code == 200
    body = resp.json()
    ids = [a["transaction_id"] for a in body["anomalies"]]
    assert ids.count(77) == 1
    assert 77 in ids


def test_empty_dataset_no_anomalies():
    res = detect_anomalies(AnomalyRequest(user_id=1, transactions=[], method=DetectionMethod.ALL))
    assert res.anomaly_count == 0
    assert res.analysed_count == 0


def _to_model(d):
    from app.schemas.analytics import TransactionIn

    return TransactionIn(**d)
