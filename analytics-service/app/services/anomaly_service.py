"""
Unified anomaly detection.

Three replaceable detectors, all operating on **expense** transactions and,
crucially, computing their statistics *within meaningful groups* (category) rather
than one global mean:

1. ``ZSCORE`` – robust (MAD-based) standard score inside each category.
2. ``IQR``    – Tukey fences inside each category.
3. ``ISOLATION_FOREST`` – multivariate ML detector (see ``app.ml``).

Every result is normalised to an :class:`AnomalyItem` with a plain-language
``reason``. When ``method == ALL`` the detectors are merged to one row per
transaction, keeping the most severe finding.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.analytics.statistics import (
    iqr_bounds,
    modified_zscores,
    safe_float,
    severity_from_isolation_score,
    severity_from_ratio,
)
from app.config import settings
from app.ml import isolation_forest
from app.schemas.analytics import (
    AnomalyItem,
    AnomalyRequest,
    AnomalyResponse,
    DetectionMethod,
    Severity,
)
from app.utils.preprocessing import expenses_only, to_dataframe

_SEVERITY_RANK = {
    Severity.LOW: 0,
    Severity.MEDIUM: 1,
    Severity.HIGH: 2,
    Severity.CRITICAL: 3,
}
_METHOD_RANK = {
    DetectionMethod.IQR: 0,
    DetectionMethod.ZSCORE: 1,
    DetectionMethod.ISOLATION_FOREST: 2,
}


def _money(value: float) -> str:
    return f"₹{value:,.0f}"


def _row_item(row, method: DetectionMethod, score: float, severity: Severity, reason: str) -> AnomalyItem:
    return AnomalyItem(
        transaction_id=int(row["id"]),
        amount=safe_float(row["amount"]),
        category=str(row["category"]),
        merchant=str(row.get("merchant") or ""),
        date=row["date"].date() if hasattr(row["date"], "date") else row["date"],
        detection_method=method,
        anomaly_score=safe_float(score),
        severity=severity,
        reason=reason,
    )


# ─────────────────────────────────────────────────────────────
# Detector: Z-score (per category)
# ─────────────────────────────────────────────────────────────
def _zscore_anomalies(expenses: pd.DataFrame, threshold: float) -> list[AnomalyItem]:
    items: list[AnomalyItem] = []
    for category, group in expenses.groupby("category"):
        if len(group) < settings.min_group_size:
            continue
        amounts = group["amount"].to_numpy(dtype="float64")
        z = modified_zscores(amounts)
        mean = float(amounts.mean())
        for (_, row), zi in zip(group.iterrows(), z):
            if abs(zi) <= threshold:
                continue
            ratio = row["amount"] / mean if mean else float("inf")
            severity = severity_from_ratio(ratio)
            if row["amount"] > mean:
                reason = (
                    f"{_money(row['amount'])} is about {ratio:.1f}x higher than your "
                    f"average {category} expense ({_money(mean)})."
                )
            else:
                reason = (
                    f"{_money(row['amount'])} is unusually low for {category} "
                    f"(you normally spend around {_money(mean)})."
                )
            items.append(_row_item(row, DetectionMethod.ZSCORE, safe_float(-abs(zi)), severity, reason))
    return items


# ─────────────────────────────────────────────────────────────
# Detector: IQR (per category)
# ─────────────────────────────────────────────────────────────
def _iqr_anomalies(expenses: pd.DataFrame, multiplier: float) -> list[AnomalyItem]:
    items: list[AnomalyItem] = []
    for category, group in expenses.groupby("category"):
        if len(group) < settings.min_group_size:
            continue
        amounts = group["amount"].to_numpy(dtype="float64")
        q1, q3, lower, upper = iqr_bounds(amounts, multiplier)
        iqr = max(q3 - q1, 1e-9)
        median = float(np.median(amounts))
        for _, row in group.iterrows():
            amt = row["amount"]
            if lower <= amt <= upper:
                continue
            distance = (amt - upper) / iqr if amt > upper else (lower - amt) / iqr
            severity = (
                Severity.CRITICAL if distance >= 3
                else Severity.HIGH if distance >= 2
                else Severity.MEDIUM if distance >= 1
                else Severity.LOW
            )
            side = "above" if amt > upper else "below"
            reason = (
                f"{_money(amt)} is well {side} your typical {category} range "
                f"({_money(max(lower, 0))}–{_money(upper)}, median {_money(median)})."
            )
            items.append(_row_item(row, DetectionMethod.IQR, safe_float(-distance), severity, reason))
    return items


# ─────────────────────────────────────────────────────────────
# Detector: Isolation Forest (multivariate)
# ─────────────────────────────────────────────────────────────
def _isolation_forest_anomalies(expenses: pd.DataFrame, contamination: float) -> list[AnomalyItem]:
    result = isolation_forest.detect(expenses, contamination=contamination)
    if result.empty:
        return []

    items: list[AnomalyItem] = []
    cat_avg = expenses.groupby("category")["amount"].transform("mean")
    cat_std = expenses.groupby("category")["amount"].transform("std").fillna(0.0)
    for idx, res in result.iterrows():
        if res["prediction"] != -1:
            continue
        row = expenses.loc[idx]
        avg = float(cat_avg.loc[idx]) or 1.0
        ratio = row["amount"] / avg
        # Suppress noise: the forest always isolates ~contamination% of rows. Keep
        # only findings that are also strongly scored or materially off the
        # category norm, so a perfectly consistent bill is not "unusual".
        near_constant = float(cat_std.loc[idx]) <= 0.01 * avg
        if near_constant or (res["score"] > -0.12 and 0.7 <= ratio <= 1.5):
            continue
        severity = severity_from_isolation_score(res["score"])
        if ratio >= 1.5:
            reason = (
                f"This {row['category']} transaction of {_money(row['amount'])} is "
                f"unusual compared with your historical spending pattern "
                f"(~{ratio:.1f}x your {row['category']} average)."
            )
        else:
            reason = (
                f"This {row['category']} transaction stands out from your usual "
                f"spending pattern (timing and amount combined)."
            )
        items.append(
            _row_item(row, DetectionMethod.ISOLATION_FOREST, res["score"], severity, reason)
        )
    return items


# ─────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────
def _merge_strongest(items: list[AnomalyItem]) -> list[AnomalyItem]:
    best: dict[int, AnomalyItem] = {}
    for item in items:
        current = best.get(item.transaction_id)
        if current is None:
            best[item.transaction_id] = item
            continue
        key_new = (_SEVERITY_RANK[item.severity], _METHOD_RANK[item.detection_method])
        key_cur = (_SEVERITY_RANK[current.severity], _METHOD_RANK[current.detection_method])
        if key_new > key_cur:
            best[item.transaction_id] = item
    return list(best.values())


def detect_anomalies(request: AnomalyRequest) -> AnomalyResponse:
    df = to_dataframe(request.transactions)
    expenses = expenses_only(df)
    method = request.method

    items: list[AnomalyItem] = []
    if method in (DetectionMethod.ZSCORE, DetectionMethod.ALL):
        items += _zscore_anomalies(expenses, settings.zscore_threshold)
    if method in (DetectionMethod.IQR, DetectionMethod.ALL):
        items += _iqr_anomalies(expenses, settings.iqr_multiplier)
    if method in (DetectionMethod.ISOLATION_FOREST, DetectionMethod.ALL):
        items += _isolation_forest_anomalies(expenses, settings.isolation_forest_contamination)

    if method == DetectionMethod.ALL:
        items = _merge_strongest(items)
        # In the combined view, only surface findings worth a user's attention.
        items = [i for i in items if i.severity != Severity.LOW]

    items.sort(key=lambda i: (i.anomaly_score, -_SEVERITY_RANK[i.severity]))

    return AnomalyResponse(
        user_id=request.user_id,
        method=method,
        analysed_count=int(len(expenses)),
        anomaly_count=len(items),
        anomalies=items,
    )
