from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class CategoryType(models.TextChoices):
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"


class Category(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=10, choices=CategoryType.choices)
    icon = models.CharField(max_length=60, blank=True, default="category")
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["type", "name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name", "type"], name="uniq_category_per_user_type"
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"

    @classmethod
    def create_defaults_for(cls, user) -> None:
        from .constants import DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES

        rows = [
            cls(user=user, name=name, type=CategoryType.EXPENSE, icon=icon, is_default=True)
            for name, icon in DEFAULT_EXPENSE_CATEGORIES
        ] + [
            cls(user=user, name=name, type=CategoryType.INCOME, icon=icon, is_default=True)
            for name, icon in DEFAULT_INCOME_CATEGORIES
        ]
        cls.objects.bulk_create(rows, ignore_conflicts=True)
