from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends

from app.schemas.analytics import (
    AnalyticsRequest,
    AnalyzeResponse,
    AnomalyRequest,
    AnomalyResponse,
    CategoryResponse,
    SummaryResponse,
    TrendRequest,
    TrendResponse,
)
from app.security import require_service_token
from app.services.anomaly_service import detect_anomalies
from app.services.category_service import build_categories
from app.services.insight_service import build_insights
from app.services.spending_service import build_summary
from app.services.trend_service import build_trends

logger = logging.getLogger("finsight.analytics")

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_service_token)],
)


def _log_duration(kind: str, user_id: int, count: int, started: float) -> None:
    logger.info(
        "analytics_processed kind=%s user_id=%s transactions=%s duration_ms=%.1f",
        kind, user_id, count, (time.perf_counter() - started) * 1000,
    )


@router.post("/summary", response_model=SummaryResponse)
def summary(request: AnalyticsRequest) -> SummaryResponse:
    started = time.perf_counter()
    result = build_summary(request)
    _log_duration("summary", request.user_id, len(request.transactions), started)
    return result


@router.post("/trends", response_model=TrendResponse)
def trends(request: TrendRequest) -> TrendResponse:
    started = time.perf_counter()
    result = build_trends(request)
    _log_duration("trends", request.user_id, len(request.transactions), started)
    return result


@router.post("/categories", response_model=CategoryResponse)
def categories(request: AnalyticsRequest) -> CategoryResponse:
    started = time.perf_counter()
    result = build_categories(request)
    _log_duration("categories", request.user_id, len(request.transactions), started)
    return result


@router.post("/anomalies", response_model=AnomalyResponse)
def anomalies(request: AnomalyRequest) -> AnomalyResponse:
    started = time.perf_counter()
    result = detect_anomalies(request)
    _log_duration("anomalies", request.user_id, len(request.transactions), started)
    return result


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyticsRequest) -> AnalyzeResponse:
    """One-shot: everything the Analytics page needs in a single call."""
    started = time.perf_counter()
    summary_res = build_summary(request)
    trends_res = build_trends(TrendRequest(**request.model_dump()))
    categories_res = build_categories(request)
    anomalies_res = detect_anomalies(AnomalyRequest(**request.model_dump()))
    insights = build_insights(summary_res, trends_res, categories_res, anomalies_res)
    _log_duration("analyze", request.user_id, len(request.transactions), started)
    return AnalyzeResponse(
        user_id=request.user_id,
        summary=summary_res,
        trends=trends_res,
        categories=categories_res,
        anomalies=anomalies_res,
        insights=insights,
    )
