from __future__ import annotations

import random
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _txn(i, amount, category="Food", type_="EXPENSE", d=None):
    return {
        "id": i,
        "amount": amount,
        "category": category,
        "type": type_,
        "merchant": f"M{i}",
        "date": (d or date(2026, 6, 1)).isoformat(),
    }


@pytest.fixture
def sample_transactions():
    """~6 months of Food + Shopping expenses, one salary per month, one clear outlier."""
    rng = random.Random(7)
    txns = []
    idx = 1
    start = date(2026, 1, 1)
    for m in range(6):
        month_start = date(2026, 1 + m, 1)
        txns.append(_txn(idx, 80000, "Salary", "INCOME", month_start)); idx += 1
        for _ in range(12):
            day = month_start + timedelta(days=rng.randint(0, 27))
            txns.append(_txn(idx, rng.randint(400, 1100), "Food", "EXPENSE", day)); idx += 1
        for _ in range(6):
            day = month_start + timedelta(days=rng.randint(0, 27))
            txns.append(_txn(idx, rng.randint(1500, 4000), "Shopping", "EXPENSE", day)); idx += 1
    # The outlier — an ₹8,000 Food transaction against a ~₹750 norm.
    txns.append(_txn(999, 8000, "Food", "EXPENSE", date(2026, 6, 15)))
    return txns


@pytest.fixture
def payload(sample_transactions):
    return {"user_id": 123, "transactions": sample_transactions}
