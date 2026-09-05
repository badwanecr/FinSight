from django.contrib import admin

from .models import Account


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("account_name", "user", "account_type", "balance", "currency", "is_active")
    list_filter = ("account_type", "is_active", "currency")
    search_fields = ("account_name", "user__email")
    readonly_fields = ("created_at", "updated_at")
