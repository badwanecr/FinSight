from __future__ import annotations

import numpy as np
import pandas as pd

from app.analytics.statistics import linear_trend, pct_growth, safe_float
from app.schemas.analytics import Granularity, TrendRequest, TrendPoint, TrendResponse
from app.utils.preprocessing import to_dataframe

_PERIOD_COLUMN = {
    Granularity.DAILY: "day",
    Granularity.WEEKLY: "iso_week",
    Granularity.MONTHLY: "year_month",
}


def build_trends(request: TrendRequest) -> TrendResponse:
    df = to_dataframe(request.transactions)
    granularity = request.granularity
    col = _PERIOD_COLUMN[granularity]

    if df.empty:
        return TrendResponse(
            user_id=request.user_id,
            granularity=granularity,
            points=[],
            average_monthly_spending=0.0,
            month_over_month_growth_pct=None,
            trend="stable",
        )

    df["_spend"] = np.where(df["type"] == "EXPENSE", df["amount"], 0.0)
    df["_income"] = np.where(df["type"] == "INCOME", df["amount"], 0.0)

    grouped = (
        df.groupby(col)
        .agg(spending=("_spend", "sum"), income=("_income", "sum"), transaction_count=("id", "count"))
        .reset_index()
        .sort_values(col)
    )

    points = [
        TrendPoint(
            period=str(row[col]),
            spending=safe_float(row["spending"]),
            income=safe_float(row["income"]),
            net=safe_float(row["income"] - row["spending"]),
            transaction_count=int(row["transaction_count"]),
        )
        for _, row in grouped.iterrows()
    ]

    # Month-level view for the headline numbers, regardless of requested granularity.
    monthly = (
        df.groupby("year_month")["_spend"].sum().sort_index()
    )
    avg_monthly = safe_float(monthly.mean()) if not monthly.empty else 0.0
    mom = pct_growth(monthly.iloc[-2], monthly.iloc[-1]) if monthly.size >= 2 else None

    slope = linear_trend(np.array([p.spending for p in points]))
    spend_scale = max(avg_monthly, 1.0)
    if slope > 0.05 * spend_scale:
        trend = "increasing"
    elif slope < -0.05 * spend_scale:
        trend = "decreasing"
    else:
        trend = "stable"

    return TrendResponse(
        user_id=request.user_id,
        granularity=granularity,
        points=points,
        average_monthly_spending=avg_monthly,
        month_over_month_growth_pct=mom,
        trend=trend,
    )
