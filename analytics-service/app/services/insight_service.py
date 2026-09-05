from __future__ import annotations

from app.schemas.analytics import (
    CategoryResponse,
    SummaryResponse,
    TrendResponse,
    AnomalyResponse,
)


def _money(value: float) -> str:
    return f"₹{value:,.0f}"


def build_insights(
    summary: SummaryResponse,
    trends: TrendResponse,
    categories: CategoryResponse,
    anomalies: AnomalyResponse,
) -> list[str]:
    """Human-readable takeaways for the Analytics page."""
    out: list[str] = []

    if trends.month_over_month_growth_pct is not None:
        pct = trends.month_over_month_growth_pct
        if pct > 1:
            out.append(f"Your spending increased by {pct:.0f}% compared with last month.")
        elif pct < -1:
            out.append(f"Your spending decreased by {abs(pct):.0f}% compared with last month.")
        else:
            out.append("Your spending is roughly flat compared with last month.")

    if categories.largest_category:
        top = categories.categories[0]
        out.append(
            f"{top.category} is your largest expense category at {_money(top.total)} "
            f"({top.percentage:.0f}% of spending)."
        )

    if summary.savings_rate:
        if summary.savings_rate >= 20:
            out.append(f"You saved {summary.savings_rate:.0f}% of your income — a healthy rate.")
        elif summary.savings_rate > 0:
            out.append(f"Your savings rate is {summary.savings_rate:.0f}%. Aim for 20% or more.")
        else:
            out.append("You spent more than you earned this period.")

    if summary.largest_transaction:
        out.append(f"Your largest single expense was {_money(summary.largest_transaction)}.")

    if anomalies.anomaly_count:
        out.append(
            f"{anomalies.anomaly_count} transaction(s) look unusual compared with your history."
        )
    else:
        out.append("No unusual spending detected this period.")

    return out
