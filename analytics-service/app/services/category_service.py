from __future__ import annotations

from app.analytics.statistics import safe_float
from app.schemas.analytics import AnalyticsRequest, CategoryResponse, CategoryStat
from app.utils.preprocessing import expenses_only, to_dataframe


def build_categories(request: AnalyticsRequest) -> CategoryResponse:
    df = expenses_only(to_dataframe(request.transactions))

    if df.empty:
        return CategoryResponse(
            user_id=request.user_id, total_spending=0.0, categories=[], largest_category=None
        )

    total = float(df["amount"].sum())
    grouped = (
        df.groupby("category")["amount"]
        .agg(total="sum", count="count", average="mean", maximum="max")
        .reset_index()
        .sort_values("total", ascending=False)
    )

    categories = [
        CategoryStat(
            category=row["category"],
            total=safe_float(row["total"]),
            percentage=safe_float(row["total"] / total * 100) if total else 0.0,
            count=int(row["count"]),
            average=safe_float(row["average"]),
            maximum=safe_float(row["maximum"]),
        )
        for _, row in grouped.iterrows()
    ]

    return CategoryResponse(
        user_id=request.user_id,
        total_spending=safe_float(total),
        categories=categories,
        largest_category=categories[0].category if categories else None,
    )
