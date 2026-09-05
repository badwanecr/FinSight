from __future__ import annotations

import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .client import AnalyticsUnavailable
from .serializers import (
    AnomalyQuerySerializer,
    DashboardQuerySerializer,
    DateRangeSerializer,
    TrendQuerySerializer,
)

logger = logging.getLogger("finsight.analytics")

UNAVAILABLE_PAYLOAD = {
    "success": False,
    "data": None,
    "message": "Analytics are temporarily unavailable. Your transactions are safe.",
    "error_code": "ANALYTICS_UNAVAILABLE",
}

_UNAVAILABLE_RESPONSE = OpenApiResponse(
    response=OpenApiTypes.OBJECT,
    description="Analytics engine unreachable — transactions are unaffected.",
)


class _AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "analytics"
    query_serializer = DateRangeSerializer
    service_fn = None

    def get(self, request):
        params = self.query_serializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        try:
            result = self.run(request.user, params.validated_data)
        except AnalyticsUnavailable as exc:
            logger.warning("analytics_view_unavailable view=%s user_id=%s", self.__class__.__name__, request.user.id)
            payload = dict(UNAVAILABLE_PAYLOAD)
            payload["message"] = exc.message or payload["message"]
            return Response(payload, status=503)
        return Response(result)

    def run(self, user, data):  # pragma: no cover - overridden
        raise NotImplementedError


@extend_schema(
    tags=["analytics"],
    summary="Spending summary",
    description="Totals, averages, median, min/max, savings and savings rate for the "
    "authenticated user (optionally date-bounded). Computed by the FastAPI engine.",
    parameters=[DateRangeSerializer],
    responses={200: OpenApiTypes.OBJECT, 503: _UNAVAILABLE_RESPONSE},
)
class SummaryView(_AnalyticsView):
    def run(self, user, data):
        return services.summary(user, data.get("start_date"), data.get("end_date"))


@extend_schema(
    tags=["analytics"],
    summary="Spending trends",
    description="Daily / weekly / monthly spending buckets plus month-over-month growth.",
    parameters=[TrendQuerySerializer],
    responses={200: OpenApiTypes.OBJECT, 503: _UNAVAILABLE_RESPONSE},
)
class TrendsView(_AnalyticsView):
    query_serializer = TrendQuerySerializer

    def run(self, user, data):
        return services.trends(
            user, data.get("start_date"), data.get("end_date"), data["granularity"]
        )


@extend_schema(
    tags=["analytics"],
    summary="Category analytics",
    description="Per-category total, percentage of spending, count, average and max.",
    parameters=[DateRangeSerializer],
    responses={200: OpenApiTypes.OBJECT, 503: _UNAVAILABLE_RESPONSE},
)
class CategoriesView(_AnalyticsView):
    def run(self, user, data):
        return services.categories(user, data.get("start_date"), data.get("end_date"))


@extend_schema(
    tags=["analytics"],
    summary="Anomaly detection",
    description="Runs the requested detector(s) — ZSCORE / IQR / ISOLATION_FOREST / ALL — "
    "and returns unusual transactions with a plain-language reason. Detection only; "
    "persistence is handled by POST /api/anomalies/detect/.",
    parameters=[AnomalyQuerySerializer],
    responses={200: OpenApiTypes.OBJECT, 503: _UNAVAILABLE_RESPONSE},
)
class AnomaliesView(_AnalyticsView):
    query_serializer = AnomalyQuerySerializer

    def run(self, user, data):
        return services.anomalies(
            user, data["method"], data.get("start_date"), data.get("end_date")
        )


@extend_schema(
    tags=["analytics"],
    summary="Full analysis",
    description="One call returning summary + trends + categories + anomalies + insights.",
    parameters=[DateRangeSerializer],
    responses={200: OpenApiTypes.OBJECT, 503: _UNAVAILABLE_RESPONSE},
)
class AnalyzeView(_AnalyticsView):
    def run(self, user, data):
        return services.analyze(user, data.get("start_date"), data.get("end_date"))


@extend_schema(
    tags=["analytics"],
    summary="Dashboard payload",
    description="Everything the dashboard needs: summary cards, spending trend, category "
    "breakdown, top expenses, recent transactions and anomaly alerts. Resilient — the "
    "cards are computed locally so this endpoint still succeeds when the analytics "
    "engine is down (`analytics_available: false`).",
    parameters=[DashboardQuerySerializer],
    responses={200: OpenApiTypes.OBJECT},
)
class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "analytics"

    def get(self, request):
        params = DashboardQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = services.build_dashboard(
            request.user, params.validated_data["year"], params.validated_data["month"]
        )
        return Response(data)
