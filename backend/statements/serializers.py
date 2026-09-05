from __future__ import annotations

from rest_framework import serializers


class StatementQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)
    account = serializers.IntegerField(required=False, allow_null=True)
    format = serializers.ChoiceField(choices=["json", "csv"], default="json")


class StatementLineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    transaction_date = serializers.CharField()
    merchant = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    account = serializers.CharField()
    transaction_type = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)


class StatementSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    period_start = serializers.CharField()
    period_end = serializers.CharField()
    account_id = serializers.IntegerField(allow_null=True)
    account_name = serializers.CharField()
    currency = serializers.CharField()
    opening_balance = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=16, decimal_places=2)
    net_savings = serializers.DecimalField(max_digits=16, decimal_places=2)
    closing_balance = serializers.DecimalField(max_digits=16, decimal_places=2)
    transaction_count = serializers.IntegerField()
    transactions = StatementLineSerializer(many=True)
