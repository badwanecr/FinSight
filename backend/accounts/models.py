from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class AccountType(models.TextChoices):
    BANK = "BANK", "Bank"
    CASH = "CASH", "Cash"
    CREDIT_CARD = "CREDIT_CARD", "Credit Card"
    WALLET = "WALLET", "Wallet"
    INVESTMENT = "INVESTMENT", "Investment"
    OTHER = "OTHER", "Other"


class Account(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    account_name = models.CharField(max_length=120)
    account_type = models.CharField(
        max_length=20, choices=AccountType.choices, default=AccountType.BANK
    )
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="INR")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["account_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "account_name"], name="uniq_account_name_per_user"
            )
        ]

    def __str__(self) -> str:
        return f"{self.account_name} ({self.get_account_type_display()})"

    def apply_delta(self, delta: Decimal) -> None:
        """Adjust the cached balance by ``delta`` and persist just that column."""
        self.balance = (self.balance or Decimal("0.00")) + Decimal(delta)
        self.save(update_fields=["balance", "updated_at"])
