from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_date",
        "merchant",
        "category",
        "account",
        "transaction_type",
        "amount",
    )
    list_filter = ("transaction_type", "transaction_date", "category")
    search_fields = ("merchant", "description", "account__account_name")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "transaction_date"
