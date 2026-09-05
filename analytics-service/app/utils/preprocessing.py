"""Turn the request payload into a tidy pandas DataFrame — done once per request."""
from __future__ import annotations

import pandas as pd

from app.schemas.analytics import TransactionIn

COLUMNS = ["id", "amount", "category", "type", "account", "merchant", "date"]


def to_dataframe(transactions: list[TransactionIn]) -> pd.DataFrame:
    if not transactions:
        return pd.DataFrame(columns=COLUMNS).astype({"amount": "float64"})

    df = pd.DataFrame([t.model_dump() for t in transactions])
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["type"] = df["type"].astype(str)
    df["category"] = df["category"].fillna("Other").replace("", "Other")
    df["merchant"] = df["merchant"].fillna("")

    # Derived time features reused by trends and the isolation forest.
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    df["iso_week"] = df["date"].dt.strftime("%G-W%V")
    df["day"] = df["date"].dt.strftime("%Y-%m-%d")
    return df


def expenses_only(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["type"] == "EXPENSE"].copy()


def income_only(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["type"] == "INCOME"].copy()


def month_span(df: pd.DataFrame) -> int:
    """Number of distinct calendar months covered (min 1)."""
    if df.empty:
        return 1
    return max(1, df["year_month"].nunique())
