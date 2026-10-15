"""Developer diagnostics: explicit authorisation, scope, read-only guarantees, audit, telemetry and error capture."""

import json
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ApiMetric, ClientMetric, DeveloperAccess, DeveloperClaim, DiagnosticAccessLog, Pupil, PupilEvent, ServerError
from .tests import PASSWORD, event

DEV = ["/api/developer/overview/", "/api/developer/pupils/", "/api/developer/audit/"]


class DevTestCase(TestCase):
    def setUp(self):
        cache.clear()

    def parent(self, email):
        c = APIClient()
        self.assertEqual(c.post("/api/account/register/", {"email": email, "password": PASSWORD, "consent": True}, format="json").status_code, 201)
        return c

    def pupil(self, c, name="Arun", events=3):
        pid = c.post("/api/pupils/", {"display_name": name, "consent": True}, format="json").json()["id"]
        for n in range(events):
            c.post(f"/api/pupils/{pid}/events/", {"subject": "english", "seq": n, "event": event(n, "evidence" if n else "profile", name=name)}, format="json")
        return pid

    def code(self, **kw):
        out = StringIO()
        call_command("developer", "issue-claim", stdout=out, **kw)
        return out.getvalue().strip()

    def developer(self, email="founder@example.org"):
        c = self.parent(email)
        self.assertEqual(c.post("/api/developer/claim/", {"code": self.code()}, format="json").status_code, 200)
        return c


class AuthorisationTests(DevTestCase):
    def test_signed_out_and_ordinary_parents_get_nothing(self):
        anon = APIClient()
        for url in DEV:
            self.assertIn(anon.get(url).status_code, (401, 403), url)
        parent = self.parent("someone@example.org")
        self.assertEqual(parent.get("/api/developer/status/").json()["developer"], False)
        for url in DEV:
            self.assertEqual(parent.get(url).status_code, 403, url)

    def test_registering_a_likely_email_grants_nothing(self):
        for email in ["developer@openpath.org", "admin@example.org", "founder@openpath.org"]:
            c = self.parent(email)
            self.assertEqual(c.get("/api/developer/overview/").status_code, 403, email)
        self.assertEqual(DeveloperAccess.objects.count(), 0)

    def test_a_claim_code_works_once_is_stored_hashed_and_expires(self):
        code = self.code()
        self.assertRegex(code, r"^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$")
        self.assertFalse(DeveloperClaim.objects.filter(code_hash__icontains=code.replace("-", "")).exists())
        a = self.parent("a@example.org")
        self.assertEqual(a.post("/api/developer/claim/", {"code": "AAAA-BBBB-CCCC"}, format="json").status_code, 400)
        self.assertEqual(a.post("/api/developer/claim/", {"code": code.lower().replace("-", " ")}, format="json").status_code, 200, "case and separators do not matter")
        self.assertEqual(a.get("/api/developer/overview/").status_code, 200)
        b = self.parent("b@example.org")
        self.assertEqual(b.post("/api/developer/claim/", {"code": code}, format="json").status_code, 400, "used once")
        old = self.code(hours=1)
        DeveloperClaim.objects.filter(used_at__isnull=True).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(b.post("/api/developer/claim/", {"code": old}, format="json").status_code, 400, "expired")
        self.assertEqual(b.get("/api/developer/overview/").status_code, 403)
        self.assertEqual(DiagnosticAccessLog.objects.filter(action="claim_refused").count(), 3)

    def test_claiming_needs_a_signed_in_account_and_csrf(self):
        self.assertIn(APIClient().post("/api/developer/claim/", {"code": self.code()}, format="json").status_code, (401, 403))
        c = APIClient(enforce_csrf_checks=True)
        c.get("/api/account/")
        token = c.cookies["csrftoken"].value
        c.post("/api/account/register/", {"email": "x@example.org", "password": PASSWORD, "consent": True}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(c.post("/api/developer/claim/", {"code": self.code()}, format="json").status_code, 403)

    def test_revoking_ends_access(self):
        dev = self.developer()
        call_command("developer", "revoke", "founder@example.org", stdout=StringIO())
        self.assertEqual(dev.get("/api/developer/overview/").status_code, 403)
        call_command("developer", "grant", "founder@example.org", stdout=StringIO())
        self.assertEqual(dev.get("/api/developer/overview/").status_code, 200)


class ScopeAndReadOnlyTests(DevTestCase):
    def test_a_developer_sees_own_pupils_and_only_shared_ones_of_other_families(self):
        dev = self.developer()
        arun = self.pupil(dev, "Arun")
        other = self.parent("ravi@example.org")
        meera = self.pupil(other, "Meera")
        listed = [p["display_name"] for p in dev.get("/api/developer/pupils/").json()["pupils"]]
        self.assertEqual(listed, ["Arun"])
        self.assertEqual(dev.get(f"/api/developer/pupils/{meera}/events/").status_code, 404)
        # only Meera's parent can share her record, and can take it back
        self.assertEqual(dev.patch(f"/api/pupils/{meera}/", {"shared_for_diagnostics": True}, format="json").status_code, 404)
        self.assertEqual(other.patch(f"/api/pupils/{meera}/", {"shared_for_diagnostics": True}, format="json").json()["shared_for_diagnostics"], True)
        self.assertEqual(dev.get(f"/api/developer/pupils/{meera}/events/").json()["count"], 3)
        other.patch(f"/api/pupils/{meera}/", {"shared_for_diagnostics": False}, format="json")
        self.assertEqual(dev.get(f"/api/developer/pupils/{meera}/events/").status_code, 404)
        self.assertEqual(dev.get(f"/api/developer/pupils/{arun}/events/").json()["count"], 3)
        # being a developer never opens the parent API to other families
        self.assertEqual(dev.get(f"/api/pupils/{meera}/events/").status_code, 404)

    def test_developer_endpoints_are_read_only_and_change_nothing(self):
        dev = self.developer()
        arun = self.pupil(dev)
        before = list(PupilEvent.objects.order_by("id").values_list("id", "body"))
        url = f"/api/developer/pupils/{arun}/events/"
        for method in ("post", "put", "patch", "delete"):
            self.assertEqual(getattr(dev, method)(url, {"subject": "english", "seq": 3, "event": event(3)}, format="json").status_code, 405, method)
            self.assertEqual(getattr(dev, method)("/api/developer/overview/").status_code, 405, method)
        for _ in range(3):
            dev.get(url)
            dev.get("/api/developer/overview/")
        self.assertEqual(list(PupilEvent.objects.order_by("id").values_list("id", "body")), before)
        self.assertEqual(Pupil.objects.get(pk=arun).display_name, "Arun")

    def test_every_read_is_audited(self):
        dev = self.developer()
        arun = self.pupil(dev)
        dev.get("/api/developer/overview/")
        dev.get("/api/developer/pupils/")
        dev.get(f"/api/developer/pupils/{arun}/events/")
        actions = list(DiagnosticAccessLog.objects.order_by("id").values_list("action", "pupil"))
        self.assertIn(("claim_granted", None), actions)
        self.assertIn(("overview", None), actions)
        self.assertIn(("pupils", None), actions)
        self.assertIn(("pupil_events", Pupil.objects.get(pk=arun).pk), actions)
        self.assertEqual(len(dev.get("/api/developer/audit/").json()["entries"]), len(actions))

    def test_the_overview_has_counts_and_versions_but_no_contact_details_or_records(self):
        dev = self.developer()
        self.pupil(dev, "Arun", events=4)
        self.pupil(self.parent("ravi@example.org"), "Meera", events=2)
        o = dev.get("/api/developer/overview/").json()
        self.assertEqual(o["counts"]["pupils"], 2)
        self.assertEqual(o["counts"]["events"], 6)
        self.assertEqual(o["counts"]["answers_recorded"], 4)
        self.assertIn("commit", o["server"])
        text = json.dumps(o)
        for secret in ["@example.org", "Meera", "Arun", PASSWORD]:
            self.assertNotIn(secret, text)


class TelemetryAndErrorTests(DevTestCase):
    def test_the_app_reports_measurements_from_a_fixed_list_with_scrubbed_details(self):
        self.assertIn(APIClient().post("/api/telemetry/", {"metrics": [{"name": "save_ms", "ms": 12}]}, format="json").status_code, (401, 403))
        p = self.parent("asha@example.org")
        r = p.post("/api/telemetry/", {"app_version": "abc1234", "metrics": [{"name": "save_ms", "ms": 12.5}, {"name": "made_up", "ms": 1}, {"name": "runtime_error", "ok": False, "detail": "x is undefined near asha@example.org"}, {"name": "rebuild_ms", "ms": True}]}, format="json")
        self.assertEqual(r.json()["stored"], 3)
        self.assertEqual(sorted(ClientMetric.objects.values_list("name", flat=True)), ["rebuild_ms", "runtime_error", "save_ms"])
        self.assertEqual(ClientMetric.objects.get(name="runtime_error").detail, "x is undefined near [email]")
        self.assertIsNone(ClientMetric.objects.get(name="rebuild_ms").ms, "a boolean is not a duration")
        self.assertEqual(p.post("/api/telemetry/", {"metrics": [{"name": "save_ms"}] * 51}, format="json").status_code, 400)
        o = self.developer().get("/api/developer/overview/").json()
        self.assertEqual(o["app_last_7_days"]["save_ms"]["p50"], 12.5)
        self.assertEqual(o["app_versions_seen"], ["abc1234"])

    def test_api_requests_are_timed_by_route_name_never_by_path(self):
        c = self.parent("asha@example.org")
        pid = self.pupil(c)
        c.get(f"/api/pupils/{pid}/events/")
        routes = set(ApiMetric.objects.values_list("route", flat=True))
        self.assertIn("pupil-events", routes)
        self.assertFalse(any(pid in r for r in routes))

    def test_a_server_error_is_recorded_with_its_route_and_class_only(self):
        c = self.parent("asha@example.org")
        c.raise_request_exception = False
        with mock.patch("family.views.PupilsView.get", side_effect=RuntimeError("database went away\nsecret detail")):
            self.assertEqual(c.get("/api/pupils/").status_code, 500)
        err = ServerError.objects.get()
        self.assertEqual((err.route, err.method, err.error), ("pupils", "GET", "RuntimeError: database went away"))
        o = self.developer().get("/api/developer/overview/").json()
        self.assertEqual(o["recent_server_errors"][0]["route"], "pupils")
        self.assertEqual(o["api_last_7_days"]["GET pupils"]["server_errors"], 1)


class ReviewFixTests(DevTestCase):
    def test_a_new_code_or_a_revoke_ends_every_earlier_unused_code(self):
        first = self.code()
        second = self.code()
        a = self.parent("a@example.org")
        self.assertEqual(a.post("/api/developer/claim/", {"code": first}, format="json").status_code, 400, "replaced by the newer code")
        self.assertEqual(a.post("/api/developer/claim/", {"code": second}, format="json").status_code, 200)
        spare = self.code()
        call_command("developer", "revoke", "a@example.org", stdout=StringIO())
        self.assertEqual(a.post("/api/developer/claim/", {"code": spare}, format="json").status_code, 400, "an old code cannot undo a revoke")
        self.assertEqual(a.get("/api/developer/overview/").status_code, 403)
        self.assertEqual(DiagnosticAccessLog.objects.get(action="revoked_by_command").detail, "by a server operator (manage.py)")

    def test_telemetry_versions_are_checked_and_each_account_is_capped(self):
        p = self.parent("asha@example.org")
        p.post("/api/telemetry/", {"app_version": "<script>x</script>", "metrics": [{"name": "save_ms", "ms": 1}]}, format="json")
        p.post("/api/telemetry/", {"app_version": "8e1eaf7", "metrics": [{"name": "save_ms", "ms": 1}]}, format="json")
        self.assertEqual(sorted(ClientMetric.objects.values_list("app_version", flat=True)), ["8e1eaf7", "other"])
        with mock.patch("family.developer.DAILY_METRICS_PER_ACCOUNT", 2):
            self.assertEqual(p.post("/api/telemetry/", {"metrics": [{"name": "save_ms", "ms": 1}]}, format="json").json()["stored"], 0)
        self.assertEqual(ClientMetric.objects.count(), 2)

    def test_server_errors_keep_no_quoted_values_or_emails(self):
        c = self.parent("asha@example.org")
        c.raise_request_exception = False
        with mock.patch("family.views.PupilsView.get", side_effect=ValueError("invalid literal for int(): 'Arun Kumar' from a@b.org")):
            c.get("/api/pupils/")
        self.assertEqual(ServerError.objects.get().error, "ValueError: invalid literal for int(): '…' from [email]")
