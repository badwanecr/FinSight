from django.contrib import admin

from .models import Anomaly


@admin.register(Anomaly)
class AnomalyAdmin(admin.ModelAdmin):
    list_display = (
        "detected_at",
        "user",
        "detection_method",
        "severity",
        "amount",
        "category",
        "status",
    )
    list_filter = ("detection_method", "severity", "status", "reviewed")
    search_fields = ("user__email", "merchant", "category", "reason")
    readonly_fields = ("detected_at", "updated_at")
