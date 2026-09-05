"""
Populate the database with a realistic demo user so the dashboard has something
to show. Idempotent-ish: it recreates the demo user each run.

    python manage.py seed_demo
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from accounts.models import Account, AccountType
from categories.models import Category
from transactions.models import Transaction, TransactionType
from transactions.services import create_transaction

User = get_user_model()

DEMO_EMAIL = "demo@finsight.app"
DEMO_PASSWORD = "DemoPass123"

MERCHANTS = {
    "Food": ["Reliance Fresh", "Swiggy", "Zomato", "Dominos", "Cafe Coffee Day"],
    "Groceries": ["BigBasket", "DMart", "More Supermarket"],
    "Shopping": ["Amazon", "Flipkart", "Myntra", "Croma", "Electronics Store"],
    "Travel": ["IndiGo", "MakeMyTrip", "IRCTC", "Flight Booking"],
    "Transportation": ["Uber", "Ola", "HP Petrol Pump", "Metro Card"],
    "Entertainment": ["BookMyShow", "Netflix", "PVR Cinemas"],
    "Bills": ["Airtel", "ACT Fibernet", "Jio"],
    "Utilities": ["BESCOM", "Water Board", "Gas Agency"],
    "Rent": ["Landlord Transfer"],
    "Healthcare": ["Apollo Pharmacy", "Practo", "1mg"],
    "Subscriptions": ["Spotify", "YouTube Premium", "iCloud"],
}

TYPICAL_RANGE = {
    "Food": (150, 1200),
    "Groceries": (600, 3500),
    "Shopping": (500, 6000),
    "Travel": (1500, 9000),
    "Transportation": (80, 900),
    "Entertainment": (200, 1500),
    "Bills": (400, 1600),
    "Utilities": (300, 2200),
    "Rent": (18000, 18000),
    "Healthcare": (200, 2500),
    "Subscriptions": (129, 999),
}


class Command(BaseCommand):
    help = "Seed a demo user with accounts, categories and ~6 months of transactions."

    @db_transaction.atomic
    def handle(self, *args, **options):
        existing = User.objects.filter(email=DEMO_EMAIL).first()
        if existing:
            # Transaction.category is PROTECT, so clear the ledger before the
            # user delete cascades away the categories.
            Transaction.objects.filter(account__user=existing).delete()
            existing.delete()

        user = User.objects.create_user(
            email=DEMO_EMAIL, password=DEMO_PASSWORD, name="Chandrakant"
        )
        self.stdout.write(self.style.SUCCESS(f"Created demo user {DEMO_EMAIL}"))

        hdfc = Account.objects.create(
            user=user, account_name="HDFC Savings", account_type=AccountType.BANK,
            balance=Decimal("0.00"), currency="INR",
        )
        cash = Account.objects.create(
            user=user, account_name="Cash", account_type=AccountType.CASH,
            balance=Decimal("0.00"), currency="INR",
        )
        card = Account.objects.create(
            user=user, account_name="HDFC Credit Card", account_type=AccountType.CREDIT_CARD,
            balance=Decimal("0.00"), currency="INR",
        )
        user.default_account = hdfc
        user.save(update_fields=["default_account"])

        cats = {c.name: c for c in Category.objects.filter(user=user)}
        expense_cats = {k: v for k, v in cats.items() if v.type == TransactionType.EXPENSE}
        salary_cat = cats["Salary"]

        rng = random.Random(42)
        today = date.today()
        start = (today.replace(day=1) - timedelta(days=175)).replace(day=1)

        month_cursor = start
        n_txn = 0
        while month_cursor <= today:
            # Monthly salary on the 1st.
            create_transaction(
                account=hdfc,
                category=salary_cat,
                amount=Decimal("85000.00"),
                transaction_type=TransactionType.INCOME,
                description="Monthly salary",
                merchant="Acme Corp Payroll",
                transaction_date=month_cursor,
            )
            n_txn += 1

            # Rent on the 3rd.
            create_transaction(
                account=hdfc,
                category=expense_cats["Rent"],
                amount=Decimal("18000.00"),
                transaction_type=TransactionType.EXPENSE,
                description="House rent",
                merchant="Landlord Transfer",
                transaction_date=month_cursor + timedelta(days=2),
            )
            n_txn += 1

            # 20-35 random expenses spread across the month.
            for _ in range(rng.randint(20, 35)):
                cat_name = rng.choice([c for c in MERCHANTS if c in expense_cats and c != "Rent"])
                lo, hi = TYPICAL_RANGE[cat_name]
                amount = Decimal(str(rng.randint(lo, hi)))
                day_offset = rng.randint(0, 27)
                acct = rng.choice([hdfc, cash, card])
                create_transaction(
                    account=acct,
                    category=expense_cats[cat_name],
                    amount=amount,
                    transaction_type=TransactionType.EXPENSE,
                    description="",
                    merchant=rng.choice(MERCHANTS[cat_name]),
                    transaction_date=month_cursor + timedelta(days=day_offset),
                )
                n_txn += 1

            # advance one month
            y, m = month_cursor.year, month_cursor.month
            month_cursor = date(y + (m == 12), 1 if m == 12 else m + 1, 1)

        # A couple of deliberate outliers so anomaly detection has something to find.
        create_transaction(
            account=card,
            category=expense_cats["Shopping"],
            amount=Decimal("45000.00"),
            transaction_type=TransactionType.EXPENSE,
            description="New laptop",
            merchant="Apple Store",
            transaction_date=today - timedelta(days=6),
        )
        create_transaction(
            account=hdfc,
            category=expense_cats["Food"],
            amount=Decimal("8000.00"),
            transaction_type=TransactionType.EXPENSE,
            description="Team dinner",
            merchant="Fine Dining Co",
            transaction_date=today - timedelta(days=3),
        )
        n_txn += 2

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {n_txn} transactions across 3 accounts.\n"
                f"Login:  {DEMO_EMAIL} / {DEMO_PASSWORD}"
            )
        )
