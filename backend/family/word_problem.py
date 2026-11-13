"""word-reader@1: a typed word problem is read into ONE calculation by a language model; OpenPath's own solver (in the
app) then works it out and checks every line. The model never supplies an answer that is shown.

Owner decisions (13 Nov 2026): a paid model may be used for this, with a daily limit per account; the API key lives only
in the server environment; nothing is sent unless the feature is switched on.

What is sent to the provider: the typed problem text and the fixed prompt. Never the learner's name, the account, or any
record. What is kept: a count of requests and tokens per account per day (no problem text).

Fails safely: off, misconfigured, over a limit, a provider error, or a reply that is not exactly the expected shape all
give a short refusal; the app then says word problems are not read, as before.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from evaluation import llm

from .models import WordProblemUse
from .views import AccountBase

PROMPT = json.loads((Path(settings.BASE_DIR).parent / "content" / "learning" / "word-problem-prompt.v1.json").read_text(encoding="utf-8"))
MAX_TEXT = 600
# what the app's solver reads: numbers, the four operations, brackets, percent, powers, one letter and an equals sign
_CALC = re.compile(r"^[0-9x+\-*/().,%^= ]{1,160}$")
_PLAIN = re.compile(r"^[^<>{}\[\]\\]{1,400}$")


class Unreadable(Exception):
    """The reply was not usable; the message is safe to show and never contains provider text."""


def enabled() -> str | None:
    """None when the reader can be used, else why not (for the developer's eyes; the app shows its own words)."""
    if settings.OPENPATH_WORD_PROBLEMS != "on":
        return "switched off"
    problems = _config().problems()
    return "; ".join(problems) if problems else None


def _config() -> llm.LLMConfig:
    return llm.LLMConfig(
        provider=settings.OPENPATH_WORD_PROBLEM_PROVIDER,
        model=settings.OPENPATH_WORD_PROBLEM_MODEL,
        base_url=settings.OPENPATH_WORD_PROBLEM_BASE_URL,
        api_key=settings.OPENPATH_WORD_PROBLEM_API_KEY,
        max_output_tokens=300,
        max_input_chars=8_000,
        timeout_s=20.0,
        retries=1,
    )


def parse(reply: str) -> dict:
    """The model's reply → {"calculation", "reading", "unit"} or {"cannot"}; anything else is Unreadable."""
    try:
        data = llm.extract_json(reply)
    except Exception:
        raise Unreadable("the reply was not in the expected form")
    if not isinstance(data, dict):
        raise Unreadable("the reply was not in the expected form")
    cannot = data.get("cannot")
    if isinstance(cannot, str) and cannot.strip():
        text = " ".join(cannot.split())[:200]
        return {"cannot": text if _PLAIN.match(text) else "OpenPath could not turn this into one calculation."}
    calc, reading, unit = data.get("calculation"), data.get("reading"), data.get("unit", "")
    if not isinstance(calc, str) or not isinstance(reading, str) or not isinstance(unit, str):
        raise Unreadable("the reply was not in the expected form")
    calc, reading, unit = " ".join(calc.split()), " ".join(reading.split()), " ".join(unit.split())
    if not _CALC.match(calc) or not any(c.isdigit() for c in calc) or calc.count("=") > 1:
        raise Unreadable("the calculation was not one OpenPath can check")
    if not _PLAIN.match(reading):
        raise Unreadable("the reading was not plain text")
    if unit and not re.match(r"^[A-Za-z₹ ]{1,30}$", unit):
        unit = ""
    return {"calculation": calc, "reading": reading, "unit": unit}


def read(text: str, transport: llm.Transport = llm.urllib_transport) -> tuple[dict, int, int]:
    """(result, input tokens, output tokens). Raises llm.LLMError or Unreadable."""
    done = llm.complete(_config(), PROMPT["system"], f"{PROMPT['userPrefix']}{text}{PROMPT['userSuffix']}", transport=transport)
    return parse(done.text), done.input_tokens, done.output_tokens


class WordProblemView(AccountBase):
    """POST {text} → {calculation, reading, unit, left} or {cannot, left}. Signed-in accounts only; limited per account
    per day and across the whole site per day, so a bill cannot run away."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "word-problem"
    # replaced in tests: no test ever calls a provider
    transport = staticmethod(llm.urllib_transport)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request):
        """Whether word problems are read here, and how many of today's are left (so the app can say so before asking)."""
        used = WordProblemUse.objects.filter(user=request.user, day=timezone.localdate()).values_list("requests", flat=True).first() or 0
        return Response({"available": enabled() is None, "limit": settings.OPENPATH_WORD_PROBLEM_DAILY, "left": max(0, settings.OPENPATH_WORD_PROBLEM_DAILY - used)})

    def post(self, request):
        if enabled() is not None:
            return Response({"detail": "Word problems are not read here."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        text = request.data.get("text")
        if not isinstance(text, str) or not text.strip():
            return Response({"detail": "Type the problem."}, status=status.HTTP_400_BAD_REQUEST)
        text = " ".join(text.split())
        if len(text) > MAX_TEXT:
            return Response({"detail": "That is too long. Type one problem."}, status=status.HTTP_400_BAD_REQUEST)
        today = timezone.localdate()
        # the request is counted before the provider is called: a slow or failed call still uses one of today's turns
        with transaction.atomic():
            use, _ = WordProblemUse.objects.select_for_update().get_or_create(user=request.user, day=today)
            site = WordProblemUse.objects.filter(day=today).aggregate(n=Sum("requests"))["n"] or 0
            if use.requests >= settings.OPENPATH_WORD_PROBLEM_DAILY:
                return Response({"detail": f"Today's {settings.OPENPATH_WORD_PROBLEM_DAILY} word problems are used. Typed calculations still work, and word problems come back tomorrow.", "left": 0}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            if site >= settings.OPENPATH_WORD_PROBLEM_SITE_DAILY:
                return Response({"detail": "Word problems are resting for today. Typed calculations still work.", "left": 0}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            WordProblemUse.objects.filter(pk=use.pk).update(requests=F("requests") + 1)
        left = max(0, settings.OPENPATH_WORD_PROBLEM_DAILY - use.requests - 1)
        try:
            result, tokens_in, tokens_out = read(text, transport=self.transport)
        except (llm.LLMError, Unreadable):
            # no provider text and no reason that could carry it: the app shows its usual refusal
            return Response({"cannot": "OpenPath could not read this one. Try typing just the calculation.", "left": left})
        WordProblemUse.objects.filter(pk=use.pk).update(input_tokens=F("input_tokens") + tokens_in, output_tokens=F("output_tokens") + tokens_out)
        return Response({**result, "left": left})
