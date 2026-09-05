from __future__ import annotations

from categories.models import Category
from common.tests import AuthenticatedAPITestCase


class CategoryTests(AuthenticatedAPITestCase):
    def test_default_categories_seeded(self):
        self.assertEqual(Category.objects.filter(user=self.user, is_default=True).count(), 19)

    def test_create_custom_category(self):
        resp = self.client.post(
            "/api/categories/", {"name": "Pets", "type": "EXPENSE", "icon": "pets"}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(resp.json()["data"]["is_default"])

    def test_duplicate_name_type_rejected(self):
        resp = self.client.post(
            "/api/categories/", {"name": "Food", "type": "EXPENSE"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_cannot_delete_default_category(self):
        cat = Category.objects.get(user=self.user, name="Food", type="EXPENSE")
        self.assertEqual(self.client.delete(f"/api/categories/{cat.id}/").status_code, 403)

    def test_delete_with_reassignment(self):
        src = Category.objects.create(user=self.user, name="Temp", type="EXPENSE")
        dst = Category.objects.create(user=self.user, name="Temp2", type="EXPENSE")
        self.make_txn(category=src.id)
        resp = self.client.delete(f"/api/categories/{src.id}/?reassign_to={dst.id}")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Category.objects.filter(id=src.id).exists())
        self.assertEqual(dst.transactions.count(), 1)
