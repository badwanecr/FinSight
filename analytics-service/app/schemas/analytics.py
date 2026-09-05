"""Pydantic request/response models for the analytics API.

These are the *only* contract between Django and the engine. They intentionally
mirror nothing in Django's ORM — the service is completely independent.
"""
from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class DetectionMethod(str, Enum):
    ZSCORE = "ZSCORE"
    IQR = "IQR"
    ISOLATION_FOREST = "ISOLATION_FOREST"
    ALL = "ALL"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Granularity(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


# ─────────────────────────────────────────────────────────────
# Input
# ─────────────────────────────────────────────────────────────
class TransactionIn(BaseModel):
    id: int
    amount: float = Field(gt=0, description="Positive magnitude of the transaction.")
    category: str = "Other"
    type: TransactionType = TransactionType.EXPENSE
    account: Optional[str] = None
    merchant: Optional[str] = ""
    date: date

    @field_validator("category", mode="before")
    @classmethod
    def _default_category(cls, v):
        return v or "Other"


class AnalyticsRequest(BaseModel):
    user_id: int
    transactions: list[TransactionIn] = Field(default_factory=list)


class TrendRequest(AnalyticsRequest):
    granularity: Granularity = Granularity.MONTHLY


class AnomalyRequest(AnalyticsRequest):
    method: DetectionMethod = DetectionMethod.ALL


# ─────────────────────────────────────────────────────────────
# Output
# ─────────────────────────────────────────────────────────────
class SummaryResponse(BaseModel):
    user_id: int
    currency_hint: str = "INR"
    total_spending: float
    total_income: float
    average_transaction: float
    median_transaction: float
    smallest_transaction: float
    largest_transaction: float
    transaction_count: int
    expense_count: int
    monthly_average_spending: float
    savings: float
    savings_rate: float
    period_start: Optional[date] = None
    period_end: Optional[date] = None


class TrendPoint(BaseModel):
    period: str
    spending: float
    income: float
    net: float
    transaction_count: int


class TrendResponse(BaseModel):
    user_id: int
    granularity: Granularity
    points: list[TrendPoint]
    average_monthly_spending: float
    month_over_month_growth_pct: Optional[float]
    trend: str  # "increasing" | "decreasing" | "stable"


class CategoryStat(BaseModel):
    category: str
    total: float
    percentage: float
    count: int
    average: float
    maximum: float


class CategoryResponse(BaseModel):
    user_id: int
    total_spending: float
    categories: list[CategoryStat]
    largest_category: Optional[str]


class AnomalyItem(BaseModel):
    transaction_id: int
    amount: float
    category: str
    merchant: Optional[str] = ""
    date: date
    detection_method: DetectionMethod
    anomaly_score: float
    severity: Severity
    reason: str


class AnomalyResponse(BaseModel):
    user_id: int
    method: DetectionMethod
    analysed_count: int
    anomaly_count: int
    anomalies: list[AnomalyItem]


class AnalyzeResponse(BaseModel):
    user_id: int
    summary: SummaryResponse
    trends: TrendResponse
    categories: CategoryResponse
    anomalies: AnomalyResponse
    insights: list[str]
