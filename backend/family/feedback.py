"""feedback@1: testers (family and friends) tick what is wrong with a question or lesson; developers read the list."""

import json
import logging
import re
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .developer import IsDeveloper
from .models import Feedback
from .views import AccountBase

log = logging.getLogger("openpath.feedback")
KINDS = {"wrong", "lesson", "cluttered", "broken"}
WHERE = re.compile(r"^[A-Za-z0-9:_.,\-/ ]{1,160}$")
EMAIL = re.compile(r"[^\s@]+@[^\s@]+")
DAILY = 60


class FeedbackView(AccountBase):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "telemetry"

    def get_permissions(self):
        # anyone signed in may send; only a developer may read the list
        return [IsAuthenticated(), IsDeveloper()] if self.request.method == "GET" else [IsAuthenticated()]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        kinds = [k for k in (data.get("kinds") or []) if k in KINDS] if isinstance(data.get("kinds"), list) else []
        where = str(data.get("where") or "")
        if not kinds or not WHERE.match(where):
            raise ValidationError({"kinds": "Tick at least one box.", "where": "Say which question or lesson."})
        if Feedback.objects.filter(user=request.user, at__gte=timezone.now() - timedelta(days=1)).count() >= DAILY:
            return Response({"stored": 0}, status=status.HTTP_202_ACCEPTED)
        note = EMAIL.sub("[email]", str(data.get("note") or ""))[:300]
        width = data.get("width")
        width = int(width) if isinstance(width, int) and not isinstance(width, bool) and 0 < width < 10000 else None
        f = Feedback.objects.create(user=request.user, where=where, kinds=",".join(sorted(set(kinds))), note=note, app_version=str(data.get("app_version") or "")[:40], width=width)
        log.info("feedback %s", json.dumps({"where": f.where, "kinds": f.kinds, "note": f.note, "width": f.width}))
        return Response({"stored": 1}, status=status.HTTP_201_CREATED)

    def get(self, request):
        rows = Feedback.objects.order_by("-at")[:500]
        return Response({"feedback": [{"at": r.at.isoformat(), "where": r.where, "kinds": r.kinds.split(","), "note": r.note, "app_version": r.app_version, "width": r.width} for r in rows]})
