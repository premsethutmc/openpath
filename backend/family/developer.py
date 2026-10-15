"""Developer diagnostics: an explicitly granted, read-only, audited view of the application and of test pupils.

Who is a developer: an account with an active DeveloperAccess grant. A grant comes only from a one-time claim code
(issued by `manage.py developer issue-claim`, printed in the Codespace's own log) or from `manage.py developer grant`.
Knowing the URL, or registering with some email, grants nothing.

What a developer can read: aggregate counts and performance for the whole application, and the full record of the
pupils in their own account plus any pupil whose parent has explicitly shared it for diagnostics. Every read is
written to the audit log. Nothing here writes to a pupil's record; the only writes are the claim itself and the audit.

The engine runs in the browser, so the diagnostics themselves (the Learner Vector, decision traces, anomalies) are
computed there from these events by the existing engine; the server never re-scores anything.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import timedelta
from statistics import median

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import ApiMetric, ClientMetric, DeveloperAccess, DeveloperClaim, DiagnosticAccessLog, Pupil, PupilEvent, ServerError
from .views import AccountBase

User = get_user_model()
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I
ASSESSMENT_SESSIONS = ["placement", "check", "spelling_check", "spelling_assess", "spelling_transfer"]


def is_developer(user) -> bool:
    if user is None or not user.is_authenticated:
        return False
    access = DeveloperAccess.objects.filter(user=user).first()
    return bool(access and access.active)


def audit(user, action: str, pupil=None, detail: str = "") -> None:
    DiagnosticAccessLog.objects.create(user=user, action=action[:40], pupil=pupil, detail=detail[:200])


def hash_code(code: str) -> str:
    return hashlib.sha256(re.sub(r"[^A-Z0-9]", "", code.upper()).encode()).hexdigest()


def expire_unused_claims() -> int:
    return DeveloperClaim.objects.filter(used_at__isnull=True, expires_at__gt=timezone.now()).update(expires_at=timezone.now())


def issue_claim(hours: int | None = None) -> str:
    """A new one-time code, e.g. 'K7QX-M2PA-9RTD' (60 bits). Only its hash is stored. Earlier unused codes stop working."""
    expire_unused_claims()
    raw = "".join(secrets.choice(ALPHABET) for _ in range(12))
    DeveloperClaim.objects.create(code_hash=hash_code(raw), expires_at=timezone.now() + timedelta(hours=hours or settings.OPENPATH_CLAIM_TTL_HOURS))
    return "-".join(raw[i : i + 4] for i in range(0, 12, 4))


class IsDeveloper(BasePermission):
    message = "Developer diagnostics need an explicit developer grant for this account."

    def has_permission(self, request, view):
        return is_developer(request.user)


class DeveloperBase(AccountBase):
    permission_classes = [IsAuthenticated, IsDeveloper]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["X-Robots-Tag"] = "noindex"
        return response


def redact_parent_content(body: dict) -> dict:
    """A parent's own material in another family's shared record, as a developer sees it: its shape, not its words.

    My Words lists (and, with My Books, book text) are the parent's own content, saved in the pupil's record so the
    parent can use them on any device. Sharing a pupil for diagnostics shares how the app behaved, not that content:
    list words, and the spellings asked from a list and the answers to them, are blanked. Counts, times, ids and
    right/wrong stay, so the diagnostics still work. A developer's own pupils are shown in full.
    """
    kind = body.get("kind")
    if kind == "word_list" and isinstance(body.get("list"), dict):
        words = body["list"].get("words")
        n = len(words) if isinstance(words, list) else 0
        return {**body, "list": {**body["list"], "name": "(a parent's list)", "words": []}, "redacted": f"a parent's word list of {n} words"}
    source = body.get("source")
    if isinstance(source, dict) and source.get("type") in PARENT_SOURCES:
        # a parent's words are their own ids (the word in lower case): replace each with a stable pseudonym, so the
        # same word is still the same word, without saying which word it is
        if kind == "spell_answer":
            word = body.get("word") if isinstance(body.get("word"), dict) else {}
            return {**body, "word": {**word, "id": _pseudonym(word.get("id")), "text": ""}, "response": "", "redacted": "a word from a parent's own material"}
        if kind == "spell_session" and isinstance(body.get("words"), list):
            return {**body, "words": [_pseudonym(w) for w in body["words"]], "redacted": "words from a parent's own material"}
    return body


def _pseudonym(word_id) -> str:
    return "w-" + hashlib.sha256(f"openpath-parent-word:{word_id}".encode()).hexdigest()[:12]


PARENT_SOURCES = {"list"}


def visible_pupils(user):
    """The pupils a developer may inspect: their own, and pupils their parents chose to share for diagnostics."""
    return Pupil.objects.filter(Q(parent=user) | Q(shared_for_diagnostics=True))


class DeveloperStatusView(AccountBase):
    """Is this account a developer? (Signed-in parents only; says nothing about other accounts.)"""

    def get(self, request):
        return Response({"developer": is_developer(request.user), "commit": settings.OPENPATH_COMMIT})


class DeveloperClaimView(AccountBase):
    """Turn the signed-in account into a developer with a one-time code from the Codespace's log."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "developer-claim"

    def post(self, request):
        code = request.data.get("code") if isinstance(request.data, dict) else None
        if not isinstance(code, str) or not code.strip():
            raise ValidationError({"code": "Enter the code from the Codespace log."})
        with transaction.atomic():
            claim = DeveloperClaim.objects.select_for_update().filter(code_hash=hash_code(code)).first()
            valid = claim is not None and claim.used_at is None and claim.expires_at >= timezone.now()
            if valid:
                self._grant(request, claim)
        if not valid:
            audit(request.user, "claim_refused")  # outside the transaction, so the refusal is kept
            raise ValidationError({"code": "That code is not valid (wrong, already used, or expired). Ask for a new one."})
        audit(request.user, "claim_granted")
        return Response({"developer": True})

    @staticmethod
    def _grant(request, claim):
        claim.used_at = timezone.now()
        claim.used_by = request.user
        claim.save(update_fields=["used_at", "used_by"])
        access, _ = DeveloperAccess.objects.get_or_create(user=request.user, defaults={"granted_via": "claim code"})
        if access.revoked_at:
            access.revoked_at = None
            access.granted_via = "claim code"
            access.save(update_fields=["revoked_at", "granted_via"])


def _percentiles(values: list[float]) -> dict:
    if not values:
        return {"count": 0}
    v = sorted(values)
    pick = lambda q: round(v[min(len(v) - 1, int(q * (len(v) - 1) + 0.5))], 1)  # noqa: E731
    return {"count": len(v), "p50": pick(0.5), "p95": pick(0.95), "max": round(v[-1], 1)}


class DeveloperOverviewView(DeveloperBase):
    """Application health: counts, performance, errors and versions. Aggregates only: no pupil records."""

    def get(self, request):
        now = timezone.now()
        week = now - timedelta(days=7)
        audit(request.user, "overview")
        events = PupilEvent.objects
        sessions = events.filter(kind="session")
        api = {}
        for route, method, status_code, ms in ApiMetric.objects.filter(at__gte=week).order_by("-at").values_list("route", "method", "status", "ms")[:5000]:
            row = api.setdefault(f"{method} {route}", {"ms": [], "client_errors": 0, "server_errors": 0})
            row["ms"].append(ms)
            row["client_errors"] += 400 <= status_code < 500
            row["server_errors"] += status_code >= 500
        client = {}
        for name, ms, ok in ClientMetric.objects.filter(at__gte=week).values_list("name", "ms", "ok")[:20000]:
            row = client.setdefault(name, {"ms": [], "failures": 0, "count": 0})
            row["count"] += 1
            row["failures"] += not ok
            if ms is not None:
                row["ms"].append(ms)
        return Response(
            {
                "generated_at": now.isoformat(),
                "server": {"commit": settings.OPENPATH_COMMIT, "debug": settings.DEBUG, "database": settings.DATABASES["default"]["ENGINE"].rsplit(".", 1)[-1]},
                "app_versions_seen": sorted(ClientMetric.objects.filter(at__gte=week).exclude(app_version="").values_list("app_version", flat=True).distinct().order_by()[:20]),
                "counts": {
                    "accounts": User.objects.count(),
                    "developers": DeveloperAccess.objects.filter(revoked_at__isnull=True).count(),
                    "pupils": Pupil.objects.count(),
                    "pupils_shared_for_diagnostics": Pupil.objects.filter(shared_for_diagnostics=True).count(),
                    "events": events.count(),
                    "events_by_kind": dict(events.values_list("kind").annotate(n=Count("id")).order_by("-n")[:15]),
                    "sessions": sessions.count(),
                    "assessment_sessions": sessions.filter(body__type__in=ASSESSMENT_SESSIONS).count(),
                    "answers_recorded": events.filter(kind="evidence").count(),
                    "events_last_24h": events.filter(received_at__gte=now - timedelta(days=1)).count(),
                },
                "api_last_7_days": {k: {**_percentiles(v["ms"]), "client_errors": v["client_errors"], "server_errors": v["server_errors"]} for k, v in sorted(api.items())},
                "app_last_7_days": {k: {**_percentiles(v["ms"]), "count": v["count"], "failures": v["failures"]} for k, v in sorted(client.items())},
                "recent_server_errors": list(ServerError.objects.order_by("-at").values("at", "route", "method", "error")[:20]),
                "recent_app_errors": list(ClientMetric.objects.filter(Q(ok=False) | Q(name__in=["runtime_error", "engine_error", "save_failed"])).order_by("-at").values("at", "name", "detail", "app_version")[:20]),
            }
        )


class DeveloperPupilsView(DeveloperBase):
    def get(self, request):
        audit(request.user, "pupils")
        rows = visible_pupils(request.user).annotate(n=Count("events", filter=Q(events__subject="english"))).order_by("created_at")
        return Response(
            {
                "pupils": [
                    {"id": str(p.pk), "display_name": p.display_name, "own": p.parent_id == request.user.pk, "created_at": p.created_at.isoformat(), "events": p.n}
                    for p in rows
                ]
            }
        )


class DeveloperPupilEventsView(DeveloperBase):
    """One pupil's whole English record, read-only. Audited."""

    def get(self, request, pupil_id):
        pupil = get_object_or_404(visible_pupils(request.user), pk=pupil_id)
        audit(request.user, "pupil_events", pupil=pupil.pk)
        bodies = list(PupilEvent.objects.filter(pupil=pupil, subject="english").order_by("seq").values_list("body", flat=True))
        own = pupil.parent_id == request.user.pk
        if not own:
            bodies = [redact_parent_content(b) for b in bodies]
        return Response({"pupil": {"id": str(pupil.pk), "display_name": pupil.display_name, "own": own}, "count": len(bodies), "events": bodies})


class DeveloperAuditView(DeveloperBase):
    def get(self, request):
        rows = DiagnosticAccessLog.objects.filter(user=request.user).values("at", "action", "pupil", "detail")[:100]
        return Response({"entries": list(rows)})


# ---------------------------------------------------------------- telemetry from the app

METRICS = {"answer_ms", "save_ms", "rebuild_ms", "select_ms", "load_ms", "save_failed", "runtime_error", "engine_error"}
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}")  # version keys such as en@0.2.0 are kept
VERSION = re.compile(r"^(?:[0-9a-f]{7,40}|dev|unknown)$")
DAILY_METRICS_PER_ACCOUNT = 5000


class TelemetryView(AccountBase):
    """Measurements from the app of a signed-in parent: names from a fixed list, numbers, and a short scrubbed detail."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "telemetry"

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        metrics = data.get("metrics")
        if not isinstance(metrics, list) or not metrics or len(metrics) > 50:
            raise ValidationError({"metrics": "Send 1 to 50 measurements."})
        version = str(data.get("app_version") or "")[:40]
        version = version if VERSION.match(version) else "other"
        if ClientMetric.objects.filter(user=request.user, at__gte=timezone.now() - timedelta(days=1)).count() >= DAILY_METRICS_PER_ACCOUNT:
            return Response({"stored": 0}, status=status.HTTP_202_ACCEPTED)  # enough from this account today
        rows = []
        for m in metrics:
            if not isinstance(m, dict) or m.get("name") not in METRICS:
                continue
            ms = m.get("ms")
            ms = float(ms) if isinstance(ms, (int, float)) and not isinstance(ms, bool) and 0 <= ms < 600_000 else None
            detail = EMAIL.sub("[email]", str(m.get("detail") or ""))[:200]
            rows.append(ClientMetric(user=request.user, name=m["name"], ms=ms, ok=m.get("ok") is not False, app_version=version, detail=detail))
        ClientMetric.objects.bulk_create(rows)
        return Response({"stored": len(rows)}, status=status.HTTP_202_ACCEPTED)

