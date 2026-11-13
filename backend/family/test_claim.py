"""keep-safe@1: a name-only (guest) account is claimed with a real email and password."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

GUEST = "guest-0123456789abcdef01234567@guest.openpath.example"
KEY = "0123456789abcdef0123456789abcdef0123456789abcdef"
PASSWORD = "a-parents-own-password-9"


@override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"account": "1000/hour", "account-register": "1000/hour", "account-login": "1000/hour", "account-password": "1000/hour", "account-reset": "1000/hour", "word-problem": "1000/hour", "enrol": "1000/hour"}})
class ClaimTests(TestCase):
    def guest(self):
        c = APIClient()
        self.assertEqual(c.post("/api/account/register/", {"email": GUEST, "password": KEY, "consent": True}, format="json").status_code, 201)
        pupil = c.post("/api/pupils/", {"display_name": "Synthetic learner", "consent": True}, format="json")
        self.assertEqual(pupil.status_code, 201)
        return c, pupil.data["id"]

    def test_claim_keeps_the_learner_and_the_session_and_changes_how_to_sign_in(self):
        c, pupil = self.guest()
        r = c.post("/api/account/claim/", {"email": "Parent@Example.org", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["email"], "parent@example.org")
        # this browser is still signed in and still has the learner
        self.assertEqual([p["id"] for p in c.get("/api/pupils/").data["pupils"]], [pupil])
        # another device: the new email and password open the same records; the old key opens nothing
        other = APIClient()
        self.assertEqual(other.post("/api/account/login/", {"email": "parent@example.org", "password": PASSWORD}, format="json").status_code, 200)
        self.assertEqual([p["id"] for p in other.get("/api/pupils/").data["pupils"]], [pupil])
        self.assertNotEqual(APIClient().post("/api/account/login/", {"email": GUEST, "password": KEY}, format="json").status_code, 200)

    def test_refusals(self):
        c, _ = self.guest()
        self.assertEqual(c.post("/api/account/claim/", {"email": "not an email", "password": PASSWORD}, format="json").status_code, 400)
        self.assertEqual(c.post("/api/account/claim/", {"email": "x@guest.openpath.example", "password": PASSWORD}, format="json").status_code, 400)
        self.assertEqual(c.post("/api/account/claim/", {"email": "parent@example.org", "password": "short"}, format="json").status_code, 400)
        # an email that already has an account
        APIClient().post("/api/account/register/", {"email": "taken@example.org", "password": PASSWORD, "consent": True}, format="json")
        self.assertEqual(c.post("/api/account/claim/", {"email": "taken@example.org", "password": PASSWORD}, format="json").status_code, 400)
        # signed out
        self.assertIn(APIClient().post("/api/account/claim/", {"email": "a@example.org", "password": PASSWORD}, format="json").status_code, (401, 403))

    def test_an_ordinary_account_cannot_change_its_email_here(self):
        c = APIClient()
        c.post("/api/account/register/", {"email": "real@example.org", "password": PASSWORD, "consent": True}, format="json")
        self.assertEqual(c.post("/api/account/claim/", {"email": "other@example.org", "password": PASSWORD}, format="json").status_code, 400)
        self.assertEqual(c.get("/api/account/").data["email"], "real@example.org")
