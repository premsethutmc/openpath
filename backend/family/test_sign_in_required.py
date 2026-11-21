"""sign-in-required@1: the account status tells the app whether device-only use may be offered."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class SignInRequiredTests(TestCase):
    def test_off_by_default_and_on_when_set(self):
        c = APIClient()
        self.assertEqual(c.get("/api/account/").json(), {"authenticated": False, "accounts": True, "sign_in_required": False})
        with override_settings(OPENPATH_SIGN_IN_REQUIRED="on"):
            self.assertTrue(c.get("/api/account/").json()["sign_in_required"])
