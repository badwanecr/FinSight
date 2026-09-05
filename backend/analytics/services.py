"""
Analytics orchestration layer.

Django gathers the authenticated user's transactions, builds a compact payload,
delegates the maths to FastAPI, and caches the result in Redis keyed by
``analytics:user:{id}:...``. Dashboard summary cards are also computed locally so
the dashboard keeps working when the analytics engine is unavailable.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Sum

from transactions.models import Transaction, TransactionType

from .client import AnalyticsUnavailable, call_analytics

logger = logging.getLogger("finsight.analytics")

ZERO = Decimal("0.00")


# ─────────────────────────────────────────────────────────────
# Payload helpers
# ─────────────────────────────────────────────────────────────
def user_transactions(user, start: date | None = None, end: date | None = None):
    qs = Transaction.objects.filter(account__user=user).select_related("account", "category")
    if start:
        qs = qs.filter(transaction_date__gte=start)
    if end:
        qs = qs.filter(transaction_date__lte=end)
    return qs


def serialize_for_engine(qs) -> list[dict]:
    return [
        {
            "id": t.id,
            "amount": float(t.amount),
            "category": t.category.name,
            "type": t.transaction_type,
            "account": t.account.account_name,
            "merchant": t.merchant or "",
            "date": t.transaction_date.isoformat(),
        }
        for t in qs
    ]


def _digest(payload: list[dict]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha1(raw).hexdigest()[:12]


def _cache_key(user_id: int, kind: str, payload: list[dict], extra: str = "") -> str:
    return f"analytics:user:{user_id}:{kind}:{extra}:{_digest(payload)}"


def _cached_call(user_id: int, kind: str, path: str, txns: list[dict], extra: str = "", **body):
    key = _cache_key(user_id, kind, txns, extra)
    hit = cache.get(key)
    if hit is not None:
        return hit
    result = call_analytics(path, {"user_id": user_id, "transactions": txns, **body})
    cache.set(key, result, settings.ANALYTICS_CACHE_TTL_SECONDS)
    return result


def invalidate_user(user_id: int) -> None:
    """Best-effort cache clear when a user's transactions change."""
    try:
        cache.delete_pattern(f"analytics:user:{user_id}:*")  # redis backend
    except (AttributeError, NotImplementedError):
        cache.clear()


# ─────────────────────────────────────────────────────────────
# Public analytics functions (each returns the engine's payload)
# ─────────────────────────────────────────────────────────────
def summary(user, start=None, end=None) -> dict:
    txns = serialize_for_engine(user_transactions(user, start, end))
    return _cached_call(user.id, "summary", "/analytics/summary", txns, extra=f"{start}_{end}")


def trends(user, start=None, end=None, granularity="monthly") -> dict:
    txns = serialize_for_engine(user_transactions(user, start, end))
    return _cached_call(
        user.id, "trends", "/analytics/trends", txns, extra=f"{start}_{end}_{granularity}",
        granularity=granularity,
    )


def categories(user, start=None, end=None) -> dict:
    txns = serialize_for_engine(user_transactions(user, start, end))
    return _cached_call(user.id, "categories", "/analytics/categories", txns, extra=f"{start}_{end}")


def anomalies(user, method="ALL", start=None, end=None) -> dict:
    txns = serialize_for_engine(user_transactions(user, start, end))
    return _cached_call(
        user.id, "anomalies", "/analytics/anomalies", txns, extra=f"{method}_{start}_{end}",
        method=method,
    )


def analyze(user, start=None, end=None) -> dict:
    txns = serialize_for_engine(user_transactions(user, start, end))
    return _cached_call(user.id, "analyze", "/analytics/analyze", txns, extra=f"{start}_{end}")


# ─────────────────────────────────────────────────────────────
# Local (Django-only) computations for the dashboard cards
# ─────────────────────────────────────────────────────────────
def local_month_summary(user, year: int, month: int) -> dict:
    import calendar

    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    period = user_transactions(user, start, end)

    income = period.filter(transaction_type=TransactionType.INCOME).aggregate(s=Sum("amount"))["s"] or ZERO
    expenses = period.filter(transaction_type=TransactionType.EXPENSE).aggregate(s=Sum("amount"))["s"] or ZERO
    savings = income - expenses
    savings_rate = float(round((savings / income * 100), 1)) if income > 0 else 0.0

    from accounts.models import Account

    total_balance = Account.objects.filter(user=user, is_active=True).aggregate(s=Sum("balance"))["s"] or ZERO

    return {
        "period": {"year": year, "month": month, "start": start.isoformat(), "end": end.isoformat()},
        "currency": user.currency,
        "total_balance": float(total_balance),
        "monthly_income": float(income),
        "monthly_expenses": float(expenses),
        "monthly_savings": float(savings),
        "savings_rate": savings_rate,
        "transaction_count": period.count(),
    }


def top_expenses(user, year: int, month: int, limit: int = 5) -> list[dict]:
    import calendar

    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    rows = (
        user_transactions(user, start, end)
        .filter(transaction_type=TransactionType.EXPENSE)
        .order_by("-amount")[:limit]
    )
    return [
        {
            "id": t.id,
            "merchant": t.merchant or t.category.name,
            "category": t.category.name,
            "amount": float(t.amount),
            "date": t.transaction_date.isoformat(),
            "account": t.account.account_name,
        }
        for t in rows
    ]


def recent_transactions(user, limit: int = 8) -> list[dict]:
    rows = user_transactions(user).order_by("-transaction_date", "-created_at")[:limit]
    return [
        {
            "id": t.id,
            "date": t.transaction_date.isoformat(),
            "merchant": t.merchant or t.category.name,
            "category": t.category.name,
            "account": t.account.account_name,
            "type": t.transaction_type,
            "amount": float(t.amount),
        }
        for t in rows
    ]


def local_category_breakdown(user, year: int, month: int) -> list[dict]:
    import calendar

    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    rows = (
        user_transactions(user, start, end)
        .filter(transaction_type=TransactionType.EXPENSE)
        .values("category__name", "category_id")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    grand_total = sum((r["total"] for r in rows), ZERO) or ZERO
    return [
        {
            "category_id": r["category_id"],
            "category": r["category__name"],
            "total": float(r["total"]),
            "count": r["count"],
            "percentage": float(round(r["total"] / grand_total * 100, 1)) if grand_total else 0.0,
        }
        for r in rows
    ]


def local_spending_trend(user, months: int = 6) -> list[dict]:
    today = date.today()
    buckets: list[dict] = []
    for i in range(months - 1, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        import calendar

        start = date(y, m, 1)
        end = date(y, m, calendar.monthrange(y, m)[1])
        spent = (
            user_transactions(user, start, end)
            .filter(transaction_type=TransactionType.EXPENSE)
            .aggregate(s=Sum("amount"))["s"]
            or ZERO
        )
        earned = (
            user_transactions(user, start, end)
            .filter(transaction_type=TransactionType.INCOME)
            .aggregate(s=Sum("amount"))["s"]
            or ZERO
        )
        buckets.append(
            {
                "label": start.strftime("%b %Y"),
                "month": start.isoformat(),
                "expense": float(spent),
                "income": float(earned),
            }
        )
    return buckets


def build_dashboard(user, year: int, month: int) -> dict:
    """Assemble the full dashboard payload. Resilient to analytics downtime."""
    data = {
        "summary": local_month_summary(user, year, month),
        "spending_trend": local_spending_trend(user, months=6),
        "category_breakdown": local_category_breakdown(user, year, month),
        "top_expenses": top_expenses(user, year, month),
        "recent_transactions": recent_transactions(user),
        "analytics_available": True,
        "anomaly_alerts": [],
    }

    # Enrich with engine-computed anomaly alerts if the service is up.
    try:
        start = date(year, month, 1)
        engine = anomalies(user, method="ALL", start=start - timedelta(days=180))
        alerts = engine.get("anomalies", []) if isinstance(engine, dict) else []
        data["anomaly_alerts"] = alerts[:5]
    except AnalyticsUnavailable:
        data["analytics_available"] = False
        logger.info("dashboard_served_without_analytics user_id=%s", user.id)

    return data
