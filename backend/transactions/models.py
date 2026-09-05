from __future__ import annotations

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from common.models import TimeStampedModel


class TransactionType(models.TextChoices):
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"


class Transaction(TimeStampedModel):
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    description = models.CharField(max_length=255, blank=True, default="")
    merchant = models.CharField(max_length=120, blank=True, default="")
    transaction_date = models.DateField()

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        indexes = [
            models.Index(fields=["account", "transaction_date"]),
            models.Index(fields=["transaction_type", "transaction_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.transaction_type} {self.amount} @ {self.merchant or self.category}"

    @property
    def signed_amount(self) -> Decimal:
        """Effect on the account balance: expenses subtract, income adds."""
        sign = Decimal("1") if self.transaction_type == TransactionType.INCOME else Decimal("-1")
        return sign * self.amount
