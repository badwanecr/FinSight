from __future__ import annotations

import django_filters as filters
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from analytics.client import AnalyticsUnavailable
from analytics.views import UNAVAILABLE_PAYLOAD
from common.permissions import IsOwner

from .models import Anomaly
from .serializers import AnomalySerializer, AnomalyStatusUpdateSerializer
from .services import detect_and_store


class AnomalyFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name="transaction_date", lookup_expr="gte")
    end_date = filters.DateFilter(field_name="transaction_date", lookup_expr="lte")
    category = filters.CharFilter(field_name="category", lookup_expr="iexact")

    class Meta:
        model = Anomaly
        fields = ["severity", "detection_method", "status", "reviewed", "category"]


class AnomalyViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AnomalySerializer
    permission_classes = [IsOwner]
    filterset_class = AnomalyFilter
    ordering_fields = ["anomaly_score", "detected_at", "amount", "severity"]
    ordering = ["anomaly_score"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Anomaly.objects.none()
        return Anomaly.objects.filter(user=self.request.user).select_related(
            "transaction", "transaction__account"
        )

    @action(detail=False, methods=["post"])
    def detect(self, request):
        method = request.data.get("method", "ALL")
        try:
            stored = detect_and_store(request.user, method=method)
        except AnalyticsUnavailable:
            return Response(UNAVAILABLE_PAYLOAD, status=503)
        serializer = self.get_serializer(stored, many=True)
        return Response(
            {"detected": len(stored), "anomalies": serializer.data},
            status=status.HTTP_200_OK,
        )

    def _set_status(self, request, new_status):
        anomaly = self.get_object()
        serializer = AnomalyStatusUpdateSerializer(
            data={"status": new_status}, context={"anomaly": anomaly}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self.get_serializer(anomaly).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        return self._set_status(request, "REVIEWED")

    @action(detail=True, methods=["post"])
    def ignore(self, request, pk=None):
        return self._set_status(request, "IGNORED")

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        return self._set_status(request, "OPEN")
