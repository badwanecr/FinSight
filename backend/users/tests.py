from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from categories.models import Category

User = get_user_model()


class AuthFlowTests(APITestCase):
    def test_registration_creates_user_default_categories_and_tokens(self):
        resp = self.client.post(
            "/api/auth/register/",
            {"name": "New User", "email": "New@Example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()["data"]
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        user = User.objects.get(email="new@example.com")  # normalised to lower-case
        self.assertNotEqual(user.password, "StrongPass123")  # hashed
        self.assertTrue(user.check_password("StrongPass123"))
        self.assertEqual(Category.objects.filter(user=user).count(), 19)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(email="dupe@example.com", password="StrongPass123", name="X")
        resp = self.client.post(
            "/api/auth/register/",
            {"name": "Y", "email": "dupe@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.json()["success"])

    def test_login_returns_profile_and_tokens(self):
        User.objects.create_user(email="log@example.com", password="StrongPass123", name="Log")
        resp = self.client.post(
            "/api/auth/login/",
            {"email": "log@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("access", data)
        self.assertEqual(data["user"]["email"], "log@example.com")

    def test_login_wrong_password_fails(self):
        User.objects.create_user(email="log2@example.com", password="StrongPass123", name="Log")
        resp = self.client.post(
            "/api/auth/login/",
            {"email": "log2@example.com", "password": "nope"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_change_password(self):
        user = User.objects.create_user(email="cp@example.com", password="StrongPass123", name="CP")
        self.client.force_authenticate(user)
        resp = self.client.post(
            "/api/auth/change-password/",
            {"current_password": "StrongPass123", "new_password": "EvenStronger456"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("EvenStronger456"))
