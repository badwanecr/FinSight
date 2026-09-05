from __future__ import annotations

import django_filters as filters

from .models import Transaction


class TransactionFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name="transaction_date", lookup_expr="gte")
    end_date = filters.DateFilter(field_name="transaction_date", lookup_expr="lte")
    min_amount = filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = filters.NumberFilter(field_name="amount", lookup_expr="lte")

    account = filters.NumberFilter(field_name="account_id")
    category = filters.NumberFilter(field_name="category_id")
    # Allow filtering by human-readable category name too (dashboard drill-downs).
    category_name = filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    type = filters.ChoiceFilter(
        field_name="transaction_type", choices=Transaction._meta.get_field("transaction_type").choices
    )

    class Meta:
        model = Transaction
        fields = [
            "account",
            "category",
            "category_name",
            "type",
            "start_date",
            "end_date",
            "min_amount",
            "max_amount",
        ]
