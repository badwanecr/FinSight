from __future__ import annotations

from datetime import date
from decimal import Decimal

from common.tests import AuthenticatedAPITestCase


class StatementTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        today = date.today()
        self.year, self.month = today.year, today.month
        first = today.replace(day=1)
        self.make_txn(amount="20000.00", transaction_type="INCOME",
                      category=self.income_category.id, transaction_date=first.isoformat())
        self.make_txn(amount="5000.00", transaction_date=first.isoformat())
        self.make_txn(amount="3000.00", transaction_date=first.isoformat())

    def test_statement_totals(self):
        resp = self.client.get(
            f"/api/statements/?year={self.year}&month={self.month}&account={self.account.id}"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(Decimal(data["total_income"]), Decimal("20000.00"))
        self.assertEqual(Decimal(data["total_expenses"]), Decimal("8000.00"))
        self.assertEqual(Decimal(data["net_savings"]), Decimal("12000.00"))
        # opening + net == closing
        self.assertEqual(
            Decimal(data["opening_balance"]) + Decimal(data["net_savings"]),
            Decimal(data["closing_balance"]),
        )
        self.assertEqual(data["transaction_count"], 3)

    def test_csv_export(self):
        resp = self.client.get(
            f"/api/statements/?year={self.year}&month={self.month}&format=csv"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "text/csv")
        self.assertIn(b"FinSight statement", resp.content)

    def test_invalid_month_rejected(self):
        self.assertEqual(
            self.client.get(f"/api/statements/?year={self.year}&month=13").status_code, 400
        )
