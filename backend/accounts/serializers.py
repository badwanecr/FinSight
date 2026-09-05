from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    transaction_count = serializers.IntegerField(read_only=True)
    opening_balance = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, write_only=True,
        help_text="Starting balance; only honoured on create.",
    )

    class Meta:
        model = Account
        fields = (
            "id",
            "account_name",
            "account_type",
            "balance",
            "opening_balance",
            "currency",
            "is_active",
            "transaction_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "balance", "created_at", "updated_at")

    def create(self, validated_data):
        opening = validated_data.pop("opening_balance", Decimal("0.00"))
        validated_data["balance"] = opening
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("opening_balance", None)  # never mutate balance directly
        return super().update(instance, validated_data)
