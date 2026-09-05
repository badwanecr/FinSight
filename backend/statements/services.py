"""
Monthly statement computation.

Balances are derived from the immutable transaction ledger so the numbers stay
correct regardless of the cached ``Account.balance`` column:

    opening_balance  = current_balance − Σ signed_amount(date ≥ period_start)
    closing_balance  = opening_balance + net_savings(period)

The output structure is deliberately serialisable so it can later be rendered to
PDF / Excel / CSV without touching this module.
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional

from django.db.models import Sum

from accounts.models import Account
from transactions.models import Transaction, TransactionType

ZERO = Decimal("0.00")


@dataclass
class StatementLine:
    id: int
    transaction_date: str
    merchant: str
    description: str
    category: str
    account: str
    transaction_type: str
    amount: Decimal


@dataclass
class Statement:
    month: int
    year: int
    period_start: str
    period_end: str
    account_id: Optional[int]
    account_name: str
    currency: str
    opening_balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    net_savings: Decimal
    closing_balance: Decimal
    transaction_count: int
    transactions: list = field(default_factory=list)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _signed_sum(qs) -> Decimal:
    income = qs.filter(transaction_type=TransactionType.INCOME).aggregate(s=Sum("amount"))["s"] or ZERO
    expense = qs.filter(transaction_type=TransactionType.EXPENSE).aggregate(s=Sum("amount"))["s"] or ZERO
    return income - expense


def build_statement(user, year: int, month: int, account_id: Optional[int] = None) -> Statement:
    start, end = _month_bounds(year, month)

    accounts = Account.objects.filter(user=user)
    if account_id:
        accounts = accounts.filter(pk=account_id)
    account_ids = list(accounts.values_list("id", flat=True))

    if account_id:
        acc = accounts.first()
        account_name = acc.account_name if acc else "Unknown account"
        currency = acc.currency if acc else user.currency
        current_balance = acc.balance if acc else ZERO
    else:
        account_name = "All accounts"
        currency = user.currency
        current_balance = accounts.aggregate(s=Sum("balance"))["s"] or ZERO

    ledger = Transaction.objects.filter(account_id__in=account_ids)

    since_start = _signed_sum(ledger.filter(transaction_date__gte=start))
    opening_balance = (current_balance or ZERO) - since_start

    period = ledger.filter(transaction_date__gte=start, transaction_date__lte=end)
    total_income = period.filter(transaction_type=TransactionType.INCOME).aggregate(s=Sum("amount"))["s"] or ZERO
    total_expenses = period.filter(transaction_type=TransactionType.EXPENSE).aggregate(s=Sum("amount"))["s"] or ZERO
    net_savings = total_income - total_expenses
    closing_balance = opening_balance + net_savings

    lines = [
        StatementLine(
            id=t.id,
            transaction_date=t.transaction_date.isoformat(),
            merchant=t.merchant,
            description=t.description,
            category=t.category.name,
            account=t.account.account_name,
            transaction_type=t.transaction_type,
            amount=t.amount,
        )
        for t in period.select_related("account", "category").order_by("transaction_date", "id")
    ]

    return Statement(
        month=month,
        year=year,
        period_start=start.isoformat(),
        period_end=end.isoformat(),
        account_id=account_id,
        account_name=account_name,
        currency=currency,
        opening_balance=opening_balance,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        closing_balance=closing_balance,
        transaction_count=len(lines),
        transactions=lines,
    )
