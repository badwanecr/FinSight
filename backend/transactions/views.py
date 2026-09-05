from __future__ import annotations

from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from common.permissions import IsOwner

from .filters import TransactionFilter
from .models import Transaction
from .serializers import TransactionSerializer
from . import services


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TransactionFilter
    search_fields = ["merchant", "description", "category__name"]
    ordering_fields = ["transaction_date", "amount", "created_at"]
    ordering = ["-transaction_date", "-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Transaction.objects.none()
        return (
            Transaction.objects.filter(account__user=self.request.user)
            .select_related("account", "category")
        )

    def perform_destroy(self, instance):
        services.delete_transaction(instance)
