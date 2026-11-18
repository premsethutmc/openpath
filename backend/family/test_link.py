"""link@1: a short code signs another phone in to the same family account."""

from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import FamilyLinkCode

GUEST = "guest-0123456789abcdef01234567@guest.openpath.example"
KEY = "0123456789abcdef0123456789abcdef0123456789abcdef"
RATES = {"account": "1000/hour", "account-register": "1000/hour", "account-login": "1000/hour", "account-password": "1000/hour", "account-reset": "1000/hour"}


@override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": RATES})
class LinkTests(TestCase):
    def child_phone(self, email=GUEST):
        c = APIClient()
        self.assertEqual(c.post("/api/account/register/", {"email": email, "password": KEY, "consent": True}, format="json").status_code, 201)
        pupil = c.post("/api/pupils/", {"display_name": "Synthetic learner", "consent": True}, format="json")
        self.assertEqual(pupil.status_code, 201)
        return c, pupil.data["id"]

    def code(self, c):
        r = c.post("/api/account/link-code/", {}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertRegex(r.data["code"], r"^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")
        self.assertEqual(r.data["expires_in"], 900)
        return r.data["code"]

    def test_a_code_signs_another_phone_in_to_the_same_children(self):
        child, pupil = self.child_phone()
        code = self.code(child)
        parent = APIClient()
        self.assertFalse(parent.get("/api/account/").data["authenticated"])
        r = parent.post("/api/account/link/", {"code": code.lower().replace("-", " ")}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["pupils"], 1)
        self.assertEqual([p["id"] for p in parent.get("/api/pupils/").data["pupils"]], [pupil])
        # the parent's phone writes to the same record the child's phone reads
        event = {"kind": "note", "id": "n1", "at": "2026-11-18T10:00:00Z", "screen": "t", "text": "x"}
        self.assertEqual(parent.post(f"/api/pupils/{pupil}/events/", {"subject": "english", "seq": 0, "event": event}, format="json").status_code, 201)
        self.assertEqual([e["id"] for e in child.get(f"/api/pupils/{pupil}/events/?subject=english").data["events"]], ["n1"])
        # the child's phone is still signed in
        self.assertTrue(child.get("/api/account/").data["authenticated"])

    def test_a_code_works_once_and_only_the_latest_code_works(self):
        child, _ = self.child_phone()
        first = self.code(child)
        second = self.code(child)
        self.assertEqual(APIClient().post("/api/account/link/", {"code": first}, format="json").status_code, 400, "replaced by a newer code")
        self.assertEqual(APIClient().post("/api/account/link/", {"code": second}, format="json").status_code, 200)
        self.assertEqual(APIClient().post("/api/account/link/", {"code": second}, format="json").status_code, 400, "used up")
        self.assertEqual(FamilyLinkCode.objects.filter(used_at__isnull=True).count(), 0)

    def test_refusals(self):
        child, _ = self.child_phone()
        self.assertIn(APIClient().post("/api/account/link-code/", {}, format="json").status_code, (401, 403), "a code needs a signed-in phone")
        code = self.code(child)
        for bad in ("", "ABCD", "ABCD-EFGH-JKLM", "ZZZZ-ZZZZ"):
            r = APIClient().post("/api/account/link/", {"code": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        # expired
        FamilyLinkCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(APIClient().post("/api/account/link/", {"code": code}, format="json").status_code, 400)
        # the code itself is not stored
        self.assertFalse(FamilyLinkCode.objects.filter(code_hash__icontains=code.replace("-", "")).exists())

    def test_a_phone_with_its_own_account_moves_to_the_other_account_and_keeps_its_own_untouched(self):
        child, pupil = self.child_phone()
        parent, own = self.child_phone("guest-ffffffffffffffffffffffff@guest.openpath.example")
        self.assertEqual(parent.post("/api/account/link/", {"code": self.code(child)}, format="json").status_code, 200)
        self.assertEqual([p["id"] for p in parent.get("/api/pupils/").data["pupils"]], [pupil])
        # the parent's earlier account still exists and still holds its learner
        back = APIClient()
        self.assertEqual(back.post("/api/account/login/", {"email": "guest-ffffffffffffffffffffffff@guest.openpath.example", "password": KEY}, format="json").status_code, 200)
        self.assertEqual([p["id"] for p in back.get("/api/pupils/").data["pupils"]], [own])
