from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Account, AccountType
from categories.models import Category

User = get_user_model()


class AuthenticatedAPITestCase(APITestCase):
    """Base class: a logged-in user plus one account and its default categories."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email="a@example.com", password="StrongPass123", name="Ann"
        )
        self.other = User.objects.create_user(
            email="b@example.com", password="StrongPass123", name="Bob"
        )
        self.client.force_authenticate(self.user)
        self.account = Account.objects.create(
            user=self.user,
            account_name="Main",
            account_type=AccountType.BANK,
            balance=Decimal("10000.00"),
        )
        self.expense_category = Category.objects.get(
            user=self.user, name="Food", type="EXPENSE"
        )
        self.income_category = Category.objects.get(
            user=self.user, name="Salary", type="INCOME"
        )

    def make_txn(self, **overrides):
        payload = {
            "account": self.account.id,
            "category": self.expense_category.id,
            "amount": "500.00",
            "transaction_type": "EXPENSE",
            "merchant": "Test Merchant",
            "transaction_date": date.today().isoformat(),
        }
        payload.update(overrides)
        return self.client.post("/api/transactions/", payload, format="json")
