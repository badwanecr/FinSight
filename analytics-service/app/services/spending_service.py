from __future__ import annotations

import numpy as np
import pandas as pd

from app.analytics.statistics import describe, safe_float
from app.schemas.analytics import AnalyticsRequest, SummaryResponse
from app.utils.preprocessing import expenses_only, income_only, month_span, to_dataframe


def build_summary(request: AnalyticsRequest) -> SummaryResponse:
    df = to_dataframe(request.transactions)
    expenses = expenses_only(df)
    income = income_only(df)

    exp_amounts = expenses["amount"].to_numpy(dtype="float64")
    stats = describe(exp_amounts)

    total_spending = stats["sum"]
    total_income = safe_float(income["amount"].sum())
    months = month_span(df)
    savings = safe_float(total_income - total_spending)
    savings_rate = safe_float(savings / total_income * 100) if total_income > 0 else 0.0

    return SummaryResponse(
        user_id=request.user_id,
        total_spending=total_spending,
        total_income=total_income,
        average_transaction=stats["mean"],
        median_transaction=stats["median"],
        smallest_transaction=stats["min"],
        largest_transaction=stats["max"],
        transaction_count=int(len(df)),
        expense_count=int(len(expenses)),
        monthly_average_spending=safe_float(total_spending / months),
        savings=savings,
        savings_rate=savings_rate,
        period_start=(df["date"].min().date() if not df.empty else None),
        period_end=(df["date"].max().date() if not df.empty else None),
    )
