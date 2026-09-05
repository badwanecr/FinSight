"""
Isolation-Forest anomaly detector.

Stateless: a fresh model is fitted on the transactions supplied with the request
(historical + current), then used to score the same rows. The feature set is the
one described in the FinSight spec.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

from app.analytics.statistics import safe_float, severity_from_isolation_score

FEATURE_COLUMNS = [
    "transaction_amount",
    "category_encoded",
    "day_of_week",
    "day_of_month",
    "month",
    "average_category_spending",
    "transaction_frequency",
    "deviation_from_category_average",
]


def _engineer_features(expenses: pd.DataFrame) -> pd.DataFrame:
    df = expenses.copy()

    cat_avg = df.groupby("category")["amount"].transform("mean")
    cat_freq = df.groupby("category")["id"].transform("count")

    features = pd.DataFrame(index=df.index)
    features["transaction_amount"] = df["amount"].astype("float64")
    features["category_encoded"] = OrdinalEncoder(
        handle_unknown="use_encoded_value", unknown_value=-1
    ).fit_transform(df[["category"]])
    features["day_of_week"] = df["day_of_week"].astype("float64")
    features["day_of_month"] = df["day_of_month"].astype("float64")
    features["month"] = df["month"].astype("float64")
    features["average_category_spending"] = cat_avg.astype("float64")
    features["transaction_frequency"] = cat_freq.astype("float64")
    features["deviation_from_category_average"] = (df["amount"] - cat_avg).astype("float64")
    return features


def detect(expenses: pd.DataFrame, contamination: float = 0.05, random_state: int = 42) -> pd.DataFrame:
    """Return a frame indexed like ``expenses`` with ``prediction`` / ``score`` / ``severity``.

    Needs at least 8 rows to be meaningful; fewer → empty result.
    """
    if len(expenses) < 8:
        return pd.DataFrame(columns=["prediction", "score", "severity"])

    features = _engineer_features(expenses)
    X = StandardScaler().fit_transform(features[FEATURE_COLUMNS].to_numpy(dtype="float64"))

    model = IsolationForest(
        n_estimators=200,
        contamination=min(max(contamination, 0.01), 0.5),
        random_state=random_state,
    )
    model.fit(X)

    predictions = model.predict(X)              # -1 anomaly, 1 normal
    scores = model.score_samples(X)            # lower = more anomalous

    out = pd.DataFrame(index=expenses.index)
    out["prediction"] = predictions
    out["score"] = [safe_float(s) for s in scores]
    out["severity"] = [severity_from_isolation_score(s).value for s in scores]
    return out
