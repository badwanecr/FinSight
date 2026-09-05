from __future__ import annotations

from django.db.models import Count
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from common.permissions import IsOwner

from .models import Account
from .serializers import AccountSerializer


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsOwner]
    filterset_fields = ["account_type", "is_active", "currency"]
    search_fields = ["account_name"]
    ordering_fields = ["account_name", "balance", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Account.objects.none()
        return (
            Account.objects.filter(user=self.request.user)
            .annotate(transaction_count=Count("transactions"))
        )

    def perform_destroy(self, instance):
        if instance.transactions.exists():
            raise ValidationError(
                "This account has transactions. Deactivate it instead of deleting."
            )
        instance.delete()
