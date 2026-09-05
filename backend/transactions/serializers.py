from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from accounts.models import Account
from categories.models import Category

from .models import Transaction, TransactionType
from . import services


class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.none())
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.none())

    # Read-only expansions for tables / dashboards.
    account_name = serializers.CharField(source="account.account_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    currency = serializers.CharField(source="account.currency", read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "category_icon",
            "amount",
            "transaction_type",
            "description",
            "merchant",
            "transaction_date",
            "currency",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            self.fields["account"].queryset = Account.objects.filter(user=user)
            self.fields["category"].queryset = Category.objects.filter(user=user)

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate_transaction_date(self, value):
        if value > (timezone.localdate() + timedelta(days=1)):
            raise serializers.ValidationError("Transaction date cannot be in the future.")
        return value

    def validate(self, attrs):
        txn_type = attrs.get("transaction_type") or getattr(self.instance, "transaction_type", None)
        category = attrs.get("category") or getattr(self.instance, "category", None)
        if category and txn_type and category.type != txn_type:
            raise serializers.ValidationError(
                {
                    "category": (
                        f"An {txn_type} transaction must use an {txn_type} category "
                        f"(got a {category.type} category)."
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        return services.create_transaction(**validated_data)

    def update(self, instance, validated_data):
        return services.update_transaction(instance, **validated_data)
