from __future__ import annotations

from django.conf import settings
from django.db import models


class DetectionMethod(models.TextChoices):
    ZSCORE = "ZSCORE", "Z-Score"
    IQR = "IQR", "Interquartile Range"
    ISOLATION_FOREST = "ISOLATION_FOREST", "Isolation Forest"


class Severity(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class AnomalyStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    REVIEWED = "REVIEWED", "Reviewed"
    IGNORED = "IGNORED", "Ignored"


class Anomaly(models.Model):
    """A flagged transaction. Django is the source of truth; FastAPI only detects.

    ``transaction`` is nullable so an anomaly survives if the underlying
    transaction is later deleted (the snapshot columns keep it displayable).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="anomalies"
    )
    transaction = models.ForeignKey(
        "transactions.Transaction",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="anomalies",
    )

    detection_method = models.CharField(max_length=20, choices=DetectionMethod.choices)
    anomaly_score = models.FloatField(help_text="Lower = more anomalous (engine convention).")
    severity = models.CharField(max_length=10, choices=Severity.choices)
    reason = models.TextField()

    # Display snapshot (independent of the live transaction row).
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.CharField(max_length=80, blank=True, default="")
    merchant = models.CharField(max_length=120, blank=True, default="")
    transaction_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=10, choices=AnomalyStatus.choices, default=AnomalyStatus.OPEN
    )
    reviewed = models.BooleanField(default=False)
    detected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["anomaly_score", "-detected_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "transaction", "detection_method"],
                name="uniq_anomaly_per_txn_method",
            )
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "severity"]),
        ]

    def __str__(self) -> str:
        return f"{self.severity} {self.detection_method} txn={self.transaction_id} score={self.anomaly_score}"
