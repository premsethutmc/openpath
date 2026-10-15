"""Parent accounts, pupils and the pupil ledger: authentication, authorisation, persistence and deletion."""

import re
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from .models import Pupil, PupilEvent

User = get_user_model()
PASSWORD = "a-long-family-passphrase"


def event(n: int, kind: str = "attempt", **extra) -> dict:
    return {"kind": kind, "id": f"p:{n}", "at": f"2026-10-14T09:{n % 60:02d}:00.000Z", **extra}


class FamilyTestCase(TestCase):
    def setUp(self):
        cache.clear()  # the throttle counts live in the cache

    def parent(self, email="asha.parent@example.org", password=PASSWORD) -> APIClient:
        client = APIClient()
        r = client.post("/api/account/register/", {"email": email, "password": password, "consent": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return client

    def pupil(self, client: APIClient, name="Arun") -> str:
        r = client.post("/api/pupils/", {"display_name": name, "consent": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.data["id"]

    def append(self, client: APIClient, pupil: str, seq: int, ev: dict, subject="english"):
        return client.post(f"/api/pupils/{pupil}/events/", {"subject": subject, "seq": seq, "event": ev}, format="json")


class AccountTests(FamilyTestCase):
    def test_register_signs_in_and_hashes_the_password_with_django(self):
        client = self.parent()
        me = client.get("/api/account/").json()
        self.assertEqual(me, {"authenticated": True, "email": "asha.parent@example.org", "pupils": 0})
        user = User.objects.get(username="asha.parent@example.org")
        self.assertNotIn(PASSWORD, user.password)
        self.assertTrue(user.password.startswith("pbkdf2_sha256$"), "Django's configured hasher, not a home-made one")
        self.assertTrue(user.check_password(PASSWORD))

    def test_register_needs_consent_a_valid_email_and_a_strong_password(self):
        client = APIClient()
        self.assertEqual(client.post("/api/account/register/", {"email": "x@example.org", "password": PASSWORD}, format="json").status_code, 400)
        self.assertEqual(client.post("/api/account/register/", {"email": "not-an-email", "password": PASSWORD, "consent": True}, format="json").status_code, 400)
        weak = client.post("/api/account/register/", {"email": "x@example.org", "password": "password1", "consent": True}, format="json")
        self.assertEqual(weak.status_code, 400)
        self.assertIn("password", weak.json())
        self.assertFalse(User.objects.exists())

    def test_the_same_email_cannot_register_twice(self):
        self.parent()
        again = APIClient().post("/api/account/register/", {"email": "ASHA.parent@example.org", "password": PASSWORD, "consent": True}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(User.objects.count(), 1)

    def test_logout_then_login_with_the_same_password(self):
        client = self.parent()
        self.assertEqual(client.post("/api/account/logout/").status_code, 204)
        self.assertEqual(client.get("/api/account/").json(), {"authenticated": False, "accounts": True})
        self.assertIn(client.get("/api/pupils/").status_code, (401, 403))
        wrong = client.post("/api/account/login/", {"email": "asha.parent@example.org", "password": "wrong-password-here"}, format="json")
        self.assertEqual(wrong.status_code, 400)
        ok = client.post("/api/account/login/", {"email": "Asha.Parent@example.org", "password": PASSWORD}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertTrue(client.get("/api/account/").json()["authenticated"])

    def test_session_cookie_is_http_only(self):
        client = self.parent()
        cookie = client.cookies["sessionid"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")

    def test_csrf_is_enforced_on_sign_in_and_on_changes(self):
        client = APIClient(enforce_csrf_checks=True)
        refused = client.post("/api/account/register/", {"email": "c@example.org", "password": PASSWORD, "consent": True}, format="json")
        self.assertEqual(refused.status_code, 403)
        self.assertIn("CSRF", refused.json()["detail"])
        token = client.get("/api/account/").cookies["csrftoken"].value
        ok = client.post("/api/account/register/", {"email": "c@example.org", "password": PASSWORD, "consent": True}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(ok.status_code, 201, ok.content)
        # signed in: a change without the token is refused, with it accepted
        token = client.cookies["csrftoken"].value
        self.assertEqual(client.post("/api/pupils/", {"display_name": "Arun", "consent": True}, format="json").status_code, 403)
        self.assertEqual(client.post("/api/pupils/", {"display_name": "Arun", "consent": True}, format="json", HTTP_X_CSRFTOKEN=token).status_code, 201)

    @override_settings(OPENPATH_PASSWORD_RESET_URL="https://app.example.org/#reset")
    def test_password_recovery_by_email(self):
        client = self.parent()
        client.post("/api/account/logout/")
        # the answer is the same whether or not the email has an account
        unknown = APIClient().post("/api/account/password-reset/", {"email": "nobody@example.org"}, format="json")
        known = APIClient().post("/api/account/password-reset/", {"email": "asha.parent@example.org"}, format="json")
        self.assertEqual((unknown.status_code, unknown.json()), (known.status_code, known.json()))
        self.assertEqual(len(mail.outbox), 1)
        link = re.search(r"https://app\.example\.org/#reset\?uid=(\S+)&token=(\S+)", mail.outbox[0].body)
        self.assertIsNotNone(link)
        uid, token = link.groups()
        bad = APIClient().post("/api/account/password-reset/confirm/", {"uid": uid, "token": "x" + token, "password": "a-new-family-passphrase"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = APIClient().post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "a-new-family-passphrase"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        # the token works once; the old password no longer does
        again = APIClient().post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "another-family-passphrase"}, format="json")
        self.assertEqual(again.status_code, 400)
        fresh = APIClient()
        self.assertEqual(fresh.post("/api/account/login/", {"email": "asha.parent@example.org", "password": PASSWORD}, format="json").status_code, 400)
        self.assertEqual(fresh.post("/api/account/login/", {"email": "asha.parent@example.org", "password": "a-new-family-passphrase"}, format="json").status_code, 200)

    def test_a_password_reset_signs_out_existing_sessions(self):
        other_device = self.parent()
        uid_token = APIClient().post("/api/account/password-reset/", {"email": "asha.parent@example.org"}, format="json")
        self.assertEqual(uid_token.status_code, 202)
        uid, token = re.search(r"uid=(\S+)&token=(\S+)", mail.outbox[0].body).groups()
        APIClient().post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "a-new-family-passphrase"}, format="json")
        self.assertFalse(other_device.get("/api/account/").json()["authenticated"])

    def test_sign_in_attempts_are_rate_limited(self):
        client = APIClient()
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"account-login": "3/hour"}):
            codes = [client.post("/api/account/login/", {"email": "x@example.org", "password": "guess-number-%d" % i}, format="json").status_code for i in range(5)]
        self.assertEqual(codes[:3], [400, 400, 400])
        self.assertEqual(codes[3:], [429, 429])

    def test_failed_sign_ins_are_limited_per_email_whatever_the_address(self):
        self.parent()
        codes = []
        for i in range(12):
            client = APIClient(REMOTE_ADDR=f"10.0.0.{i}", HTTP_X_FORWARDED_FOR=f"203.0.113.{i}")
            codes.append(client.post("/api/account/login/", {"email": "asha.parent@example.org", "password": "guess-number-%d" % i}, format="json").status_code)
        self.assertEqual(codes[:10], [400] * 10)
        self.assertEqual(codes[10:], [429, 429])

    def test_oversized_requests_are_refused_before_reading_and_responses_are_not_cached(self):
        client = self.parent()
        arun = self.pupil(client)
        with self.settings(OPENPATH_MAX_REQUEST_BYTES=1000):
            r = client.put(f"/api/pupils/{arun}/events/", {"subject": "english", "events": [event(n) for n in range(50)]}, format="json")
        self.assertEqual(r.status_code, 413)
        self.assertEqual(client.get("/api/pupils/")["Cache-Control"], "no-store")
        self.assertEqual(self.append(client, arun, True, event(0)).status_code, 400, "a boolean is not a position")

    def test_changing_the_password_keeps_this_session_and_signs_out_others(self):
        here = self.parent()
        there = APIClient()
        there.post("/api/account/login/", {"email": "asha.parent@example.org", "password": PASSWORD}, format="json")
        self.assertEqual(here.post("/api/account/password/", {"current_password": "wrong-password-here", "password": "a-new-family-passphrase"}, format="json").status_code, 400)
        self.assertEqual(here.post("/api/account/password/", {"current_password": PASSWORD, "password": "a-new-family-passphrase"}, format="json").status_code, 200)
        self.assertTrue(here.get("/api/account/").json()["authenticated"])
        self.assertFalse(there.get("/api/account/").json()["authenticated"])

    def test_deleting_the_account_removes_every_pupil_and_record(self):
        client = self.parent()
        a, b = self.pupil(client, "Arun"), self.pupil(client, "Meera")
        self.append(client, a, 0, event(0, "profile", name="Arun"))
        self.append(client, b, 0, event(0, "profile", name="Meera"))
        self.assertEqual(client.post("/api/account/delete/", {"password": "wrong-password-here"}, format="json").status_code, 400)
        self.assertEqual(PupilEvent.objects.count(), 2)
        self.assertEqual(client.post("/api/account/delete/", {"password": PASSWORD}, format="json").status_code, 204)
        self.assertEqual((User.objects.count(), Pupil.objects.count(), PupilEvent.objects.count()), (0, 0, 0))
        self.assertFalse(client.get("/api/account/").json()["authenticated"])


class PupilTests(FamilyTestCase):
    def test_a_parent_creates_lists_renames_and_deletes_pupils(self):
        client = self.parent()
        arun = self.pupil(client, "Arun")
        meera = self.pupil(client, "Meera")
        rows = client.get("/api/pupils/").json()["pupils"]
        self.assertEqual([r["display_name"] for r in rows], ["Arun", "Meera"])
        self.assertEqual(rows[0]["events"], 0)
        self.assertEqual(client.patch(f"/api/pupils/{meera}/", {"display_name": "Meera K"}, format="json").json()["display_name"], "Meera K")
        self.assertEqual(client.delete(f"/api/pupils/{meera}/").status_code, 204)
        self.assertEqual([r["id"] for r in client.get("/api/pupils/").json()["pupils"]], [arun])

    def test_a_pupil_needs_consent_and_a_name(self):
        client = self.parent()
        self.assertEqual(client.post("/api/pupils/", {"display_name": "Arun"}, format="json").status_code, 400)
        self.assertEqual(client.post("/api/pupils/", {"display_name": " ", "consent": True}, format="json").status_code, 400)
        self.assertEqual(Pupil.objects.count(), 0)

    def test_signed_out_requests_see_nothing(self):
        client = self.parent()
        arun = self.pupil(client)
        anon = APIClient()
        for method, url in [("get", "/api/pupils/"), ("get", f"/api/pupils/{arun}/"), ("get", f"/api/pupils/{arun}/events/"), ("post", f"/api/pupils/{arun}/events/"), ("delete", f"/api/pupils/{arun}/")]:
            self.assertIn(getattr(anon, method)(url).status_code, (401, 403), f"{method} {url}")


class IsolationTests(FamilyTestCase):
    """One parent can never see, change or delete another parent's pupils."""

    def test_another_parents_pupil_does_not_exist_for_you(self):
        asha = self.parent("asha.parent@example.org")
        ravi = self.parent("ravi.parent@example.org")
        arun = self.pupil(asha, "Arun")
        self.append(asha, arun, 0, event(0, "profile", name="Arun"))
        self.assertEqual(ravi.get("/api/pupils/").json()["pupils"], [])
        self.assertEqual(ravi.get(f"/api/pupils/{arun}/").status_code, 404)
        self.assertEqual(ravi.get(f"/api/pupils/{arun}/events/").status_code, 404)
        self.assertEqual(ravi.get(f"/api/pupils/{arun}/export/").status_code, 404)
        self.assertEqual(self.append(ravi, arun, 1, event(1)).status_code, 404)
        self.assertEqual(ravi.put(f"/api/pupils/{arun}/events/", {"subject": "english", "events": [event(9)]}, format="json").status_code, 404)
        self.assertEqual(ravi.patch(f"/api/pupils/{arun}/", {"display_name": "Mine"}, format="json").status_code, 404)
        self.assertEqual(ravi.delete(f"/api/pupils/{arun}/").status_code, 404)
        # nothing changed
        self.assertEqual(Pupil.objects.get(pk=arun).display_name, "Arun")
        self.assertEqual(PupilEvent.objects.filter(pupil_id=arun).count(), 1)

    def test_two_pupils_of_one_parent_keep_separate_records(self):
        client = self.parent()
        arun, meera = self.pupil(client, "Arun"), self.pupil(client, "Meera")
        for n in range(3):
            self.append(client, arun, n, event(n, note="arun"))
        self.append(client, meera, 0, event(0, note="meera"))
        self.assertEqual([e["note"] for e in client.get(f"/api/pupils/{arun}/events/").json()["events"]], ["arun"] * 3)
        self.assertEqual([e["note"] for e in client.get(f"/api/pupils/{meera}/events/").json()["events"]], ["meera"])


class LedgerTests(FamilyTestCase):
    def test_events_come_back_exactly_in_order(self):
        client = self.parent()
        arun = self.pupil(client)
        sent = [event(0, "profile", name="Arun", consent={"by": "guardian", "scope": "parent_account"})] + [
            event(n, "evidence", session="s:1", item={"id": "grm.sva.01", "version": 1}, response={"kind": "typed", "text": "likes"}, provenance={"schema": "provenance@1", "attempt": 1, "hints": [], "afterFeedback": False, "policies": ["passage@1"]})
            for n in range(1, 6)
        ]
        for n, e in enumerate(sent):
            r = self.append(client, arun, n, e)
            self.assertEqual((r.status_code, r.json()["count"]), (201, n + 1))
        got = client.get(f"/api/pupils/{arun}/events/").json()
        self.assertEqual(got["count"], 6)
        self.assertEqual(got["events"], sent, "stored verbatim, byte for byte as JSON")
        listed = client.get("/api/pupils/").json()["pupils"][0]
        self.assertEqual(listed["events"], 6)
        self.assertTrue(listed["last_at"].startswith("2026-10-14T09:05"))

    def test_an_append_out_of_order_is_refused_so_two_devices_cannot_interleave(self):
        client = self.parent()
        arun = self.pupil(client)
        self.append(client, arun, 0, event(0))
        stale = self.append(client, arun, 0, event(1))
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["count"], 1)
        self.assertEqual(self.append(client, arun, 5, event(1)).status_code, 409)
        self.assertEqual(PupilEvent.objects.count(), 1)

    def test_history_is_never_overwritten(self):
        client = self.parent()
        arun = self.pupil(client)
        self.append(client, arun, 0, event(0))
        refused = client.put(f"/api/pupils/{arun}/events/", {"subject": "english", "events": [event(5), event(6)]}, format="json")
        self.assertEqual(refused.status_code, 409)
        self.assertEqual(list(PupilEvent.objects.values_list("body__id", flat=True)), ["p:0"])
        stored = PupilEvent.objects.get()
        with self.assertRaises(ValueError):
            stored.save()

    def test_an_empty_pupil_can_import_a_device_backup(self):
        client = self.parent()
        arun = self.pupil(client)
        events = [event(n) for n in range(4)]
        r = client.put(f"/api/pupils/{arun}/events/", {"subject": "english", "events": events}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(client.get(f"/api/pupils/{arun}/events/").json()["events"], events)
        self.assertEqual(self.append(client, arun, 4, event(4)).status_code, 201)

    def test_malformed_events_are_refused(self):
        client = self.parent()
        arun = self.pupil(client)
        for bad in [{"id": "x", "at": "2026-10-14T09:00:00Z"}, {"kind": "attempt", "at": "2026-10-14T09:00:00Z"}, {"kind": "attempt", "id": "x", "at": "yesterday"}, "text", {"kind": "attempt", "id": "x", "at": "2026-10-14T09:00:00Z", "pad": "x" * 40_000}]:
            self.assertEqual(self.append(client, arun, 0, bad).status_code, 400, bad if isinstance(bad, str) else list(bad))
        self.assertEqual(self.append(client, arun, 0, event(0), subject="mathematics").status_code, 400, "mathematics is reserved, not active yet")
        self.assertEqual(PupilEvent.objects.count(), 0)

    def test_export_holds_the_whole_record(self):
        client = self.parent()
        arun = self.pupil(client)
        for n in range(3):
            self.append(client, arun, n, event(n))
        out = client.get(f"/api/pupils/{arun}/export/")
        self.assertEqual(out.status_code, 200)
        self.assertIn("attachment", out["Content-Disposition"])
        self.assertEqual(out.json()["subjects"]["english"], [event(n) for n in range(3)])

    def test_deleting_a_pupil_deletes_their_record_only(self):
        client = self.parent()
        arun, meera = self.pupil(client, "Arun"), self.pupil(client, "Meera")
        self.append(client, arun, 0, event(0))
        self.append(client, meera, 0, event(0))
        client.delete(f"/api/pupils/{arun}/")
        self.assertEqual(list(PupilEvent.objects.values_list("pupil_id", flat=True)), [Pupil.objects.get().pk])
