from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from accounts.models import Account
from categories.models import Category
from common.tests import AuthenticatedAPITestCase
from transactions.models import Transaction


class TransactionRuleTests(AuthenticatedAPITestCase):
    def test_expense_decreases_balance(self):
        resp = self.make_txn(amount="1200.00")
        self.assertEqual(resp.status_code, 201)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("8800.00"))

    def test_income_increases_balance(self):
        resp = self.make_txn(
            amount="5000.00",
            transaction_type="INCOME",
            category=self.income_category.id,
        )
        self.assertEqual(resp.status_code, 201)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("15000.00"))

    def test_amount_must_be_positive(self):
        self.assertEqual(self.make_txn(amount="-10").status_code, 400)
        self.assertEqual(self.make_txn(amount="0").status_code, 400)

    def test_expense_must_use_expense_category(self):
        resp = self.make_txn(category=self.income_category.id)
        self.assertEqual(resp.status_code, 400)

    def test_cannot_use_another_users_account(self):
        foreign = Account.objects.create(user=self.other, account_name="F", account_type="BANK")
        resp = self.make_txn(account=foreign.id)
        self.assertEqual(resp.status_code, 400)

    def test_future_date_rejected(self):
        resp = self.make_txn(transaction_date=(date.today() + timedelta(days=10)).isoformat())
        self.assertEqual(resp.status_code, 400)

    def test_update_reverses_previous_balance_impact(self):
        txn_id = self.make_txn(amount="1000.00").json()["data"]["id"]
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("9000.00"))

        resp = self.client.patch(
            f"/api/transactions/{txn_id}/", {"amount": "300.00"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("9700.00"))

    def test_changing_type_recomputes_balance(self):
        txn_id = self.make_txn(amount="1000.00").json()["data"]["id"]  # -1000 -> 9000
        resp = self.client.patch(
            f"/api/transactions/{txn_id}/",
            {"transaction_type": "INCOME", "category": self.income_category.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("11000.00"))

    def test_move_transaction_between_accounts(self):
        other_acc = Account.objects.create(
            user=self.user, account_name="Second", account_type="CASH", balance=Decimal("0.00")
        )
        txn_id = self.make_txn(amount="500.00").json()["data"]["id"]
        self.client.patch(
            f"/api/transactions/{txn_id}/", {"account": other_acc.id}, format="json"
        )
        self.account.refresh_from_db()
        other_acc.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("10000.00"))
        self.assertEqual(other_acc.balance, Decimal("-500.00"))

    def test_delete_reverses_balance(self):
        txn_id = self.make_txn(amount="2000.00").json()["data"]["id"]
        self.client.delete(f"/api/transactions/{txn_id}/")
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("10000.00"))

    def test_user_isolation_on_detail(self):
        foreign_acc = Account.objects.create(user=self.other, account_name="F", account_type="BANK")
        foreign_cat = Category.objects.get(user=self.other, name="Food", type="EXPENSE")
        txn = Transaction.objects.create(
            account=foreign_acc, category=foreign_cat, amount=Decimal("100"),
            transaction_type="EXPENSE", transaction_date=date.today(),
        )
        self.assertEqual(self.client.get(f"/api/transactions/{txn.id}/").status_code, 404)


class TransactionQueryTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        for i, amt in enumerate([100, 2500, 4000, 250]):
            self.make_txn(
                amount=str(amt),
                transaction_date=(date.today() - timedelta(days=i)).isoformat(),
                merchant=f"M{i}",
            )

    def test_pagination_envelope(self):
        body = self.client.get("/api/transactions/").json()["data"]
        self.assertEqual(body["count"], 4)
        self.assertIn("results", body)

    def test_amount_range_filter(self):
        body = self.client.get("/api/transactions/?min_amount=1000&max_amount=3000").json()["data"]
        self.assertEqual(body["count"], 1)

    def test_search(self):
        body = self.client.get("/api/transactions/?search=M2").json()["data"]
        self.assertEqual(body["count"], 1)

    def test_ordering_by_amount_desc(self):
        body = self.client.get("/api/transactions/?ordering=-amount").json()["data"]
        amounts = [Decimal(r["amount"]) for r in body["results"]]
        self.assertEqual(amounts, sorted(amounts, reverse=True))
