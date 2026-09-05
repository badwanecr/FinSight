"""
Persisting engine-detected anomalies.

FastAPI returns detection results; Django decides what to keep. Results are
upserted on ``(user, transaction, detection_method)`` so re-running detection
refreshes scores without creating duplicates and without clobbering the user's
review status.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

from django.utils.dateparse import parse_date

from analytics import services as analytics_services
from transactions.models import Transaction

from .models import Anomaly

logger = logging.getLogger("finsight.anomalies")


def detect_and_store(user, method: str = "ALL", lookback_days: int = 180) -> list[Anomaly]:
    start = date.today() - timedelta(days=lookback_days)
    engine_result = analytics_services.anomalies(user, method=method, start=start)
    items = engine_result.get("anomalies", []) if isinstance(engine_result, dict) else []

    valid_txn_ids = set(
        Transaction.objects.filter(account__user=user).values_list("id", flat=True)
    )

    stored: list[Anomaly] = []
    seen: set[tuple[int, str]] = set()
    for item in items:
        txn_id = item.get("transaction_id")
        if txn_id not in valid_txn_ids:
            continue
        detection_method = item.get("detection_method", "ZSCORE")
        obj, _ = Anomaly.objects.update_or_create(
            user=user,
            transaction_id=txn_id,
            detection_method=detection_method,
            defaults={
                "anomaly_score": float(item.get("anomaly_score", 0.0)),
                "severity": item.get("severity", "LOW"),
                "reason": item.get("reason", ""),
                "amount": item.get("amount", 0),
                "category": item.get("category", "") or "",
                "merchant": item.get("merchant", "") or "",
                "transaction_date": parse_date(item["date"]) if item.get("date") else None,
            },
        )
        stored.append(obj)
        seen.add((txn_id, detection_method))

    # Drop still-OPEN findings the engine no longer reports (e.g. after a model
    # change). Keep anything the user has already reviewed/ignored for the audit
    # trail. Only prune the methods that were actually re-run.
    methods_run = (
        ["ZSCORE", "IQR", "ISOLATION_FOREST"] if method == "ALL" else [method]
    )
    stale = Anomaly.objects.filter(
        user=user, status="OPEN", detection_method__in=methods_run
    ).exclude(
        transaction_id__in=[t for t, _ in seen]
    )
    removed = stale.count()
    stale.delete()

    logger.info(
        "anomalies_persisted user_id=%s method=%s stored=%s pruned=%s",
        user.id, method, len(stored), removed,
    )
    return stored
