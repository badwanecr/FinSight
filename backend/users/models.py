from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """FinSight user. Email is the unique login identifier."""

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Lightweight per-user preferences (surfaced on the Settings page).
    currency = models.CharField(max_length=3, default="INR")
    default_account = models.ForeignKey(
        "accounts.Account",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    notify_anomalies = models.BooleanField(default=True)
    notify_weekly_summary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"

    def get_full_name(self) -> str:
        return self.name

    def get_short_name(self) -> str:
        return self.name.split(" ")[0] if self.name else self.email
