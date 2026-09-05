from __future__ import annotations

from decimal import Decimal

from accounts.models import Account
from common.tests import AuthenticatedAPITestCase


class AccountTests(AuthenticatedAPITestCase):
    def test_create_account_with_opening_balance(self):
        resp = self.client.post(
            "/api/accounts/",
            {"account_name": "Cash Wallet", "account_type": "CASH", "opening_balance": "1500.00"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(resp.json()["data"]["balance"]), Decimal("1500.00"))

    def test_user_only_sees_own_accounts(self):
        Account.objects.create(user=self.other, account_name="Hidden", account_type="BANK")
        resp = self.client.get("/api/accounts/")
        names = [a["account_name"] for a in resp.json()["data"]["results"]]
        self.assertIn("Main", names)
        self.assertNotIn("Hidden", names)

    def test_cannot_access_other_users_account(self):
        acc = Account.objects.create(user=self.other, account_name="Hidden", account_type="BANK")
        self.assertEqual(self.client.get(f"/api/accounts/{acc.id}/").status_code, 404)

    def test_cannot_delete_account_with_transactions(self):
        self.make_txn()
        resp = self.client.delete(f"/api/accounts/{self.account.id}/")
        self.assertEqual(resp.status_code, 400)

    def test_balance_is_read_only_on_update(self):
        resp = self.client.patch(
            f"/api/accounts/{self.account.id}/", {"balance": "999999.00"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("10000.00"))
