"""The essay evaluator behind OpenPath's server (Essay Intelligence v2).

The browser never calls a model provider: it sends an essay-observe.v2 or essay-rewrite.v2 request here, and this
view forwards it to the configured adapter, which holds the provider credentials (server environment only). The
reply is returned raw; the core (packages/english-core/src/essay) validates it independently before anything is
recorded, and no observation can change an estimate or verified mastery.

Boundaries enforced here:
  - developer accounts only, and synthetic test essays only (real learners' essays are refused outright);
  - identifying fields refused, contact details removed from every text;
  - size limits, a timeout, an output-token cap, and daily request and token limits (bounded cost);
  - nothing about the text is stored or logged: the record keeps metadata only (fingerprint, sizes, tokens);
  - any failure (disabled, provider unreachable, invalid output, over budget) is a clear refusal, never a guess.
"""

from __future__ import annotations

import json
import time
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from family.developer import is_developer
from family.views import AccountBase

from . import llm
from .hashing import fnv1a
from .models import EssayEvaluationRecord
from .scrub import scrub_identifiers

OBSERVE_V2 = "essay-observe.v2"
REWRITE_V2 = "essay-rewrite.v2"
RUBRICS = {"openpath.g8-writing@1"}
ADAPTERS = ("disabled", "replay", "llm")
MAX_ESSAY_CHARS = 12_000
MAX_REWRITE_CHARS = 2_000
FALLBACK = "the essay studio uses its recorded samples or the pattern stand-in"
_FORBIDDEN = {"learner", "learner_id", "email", "phone", "school", "token", "user"}
_OBSERVE_KEYS = {"protocol", "rubric", "prompt", "request_id", "essay", "grade", "competencies", "max_observations"}
_REWRITE_KEYS = {"protocol", "rubric", "prompt", "request_id", "original", "rewrite", "dimensions"}

# replaced in tests; never logs anything
TRANSPORT = llm.urllib_transport


def _keys(value, path=()):
    if isinstance(value, dict):
        for k, v in value.items():
            # a competency's name is content, not identity
            if not (k == "name" and path[:1] == ("competencies",)):
                yield k
            yield from _keys(v, path + (k,))
    elif isinstance(value, list):
        for v in value:
            yield from _keys(v, path + ("*",))


def _text(obj, field, limit):
    t = obj.get(field) if isinstance(obj, dict) else None
    if not isinstance(t, str) or not t.strip():
        raise ValidationError(f"{field} must be non-empty text")
    if len(t) > limit:
        raise ValidationError(f"{field} is longer than {limit} characters")
    return t


def validate_essay_request(task: str, req) -> tuple[dict, str]:
    """Check the shape, refuse anything identifying, remove contact details. Returns (request, judged text)."""
    if task not in ("observe", "rewrite"):
        raise ValidationError("task must be observe or rewrite")
    if not isinstance(req, dict):
        raise ValidationError("request must be an object")
    allowed, protocol = (_OBSERVE_KEYS, OBSERVE_V2) if task == "observe" else (_REWRITE_KEYS, REWRITE_V2)
    extra = set(req) - allowed
    if extra:
        raise ValidationError(f"unexpected fields: {sorted(extra)}")
    if req.get("protocol") != protocol:
        raise ValidationError(f"the {task} task accepts only {protocol} requests")
    if req.get("rubric") not in RUBRICS:
        raise ValidationError(f"unknown rubric; known: {sorted(RUBRICS)}")
    if not isinstance(req.get("request_id"), str):
        raise ValidationError("request_id must be a string")
    bad = _FORBIDDEN & set(_keys(req))
    if bad:
        raise ValidationError(f"requests must not carry identifying fields: {sorted(bad)}")
    if task == "observe":
        essay = req.get("essay")
        text = _text(essay, "text", MAX_ESSAY_CHARS)
        if not isinstance(essay.get("id"), str):
            raise ValidationError("essay.id must be a string")
        comps = req.get("competencies")
        if not isinstance(comps, list) or not comps or not all(isinstance(c, dict) and isinstance(c.get("id"), str) for c in comps):
            raise ValidationError("competencies must be a non-empty list of competency objects")
        n = req.get("max_observations")
        if not isinstance(n, int) or not 1 <= n <= 60:
            raise ValidationError("max_observations must be between 1 and 60")
        cleaned = {**req, "essay": {**essay, "text": scrub_identifiers(text)}}
        return cleaned, text
    original = _text(req.get("original"), "text", MAX_ESSAY_CHARS)
    rewrite = _text(req.get("rewrite"), "text", MAX_REWRITE_CHARS)
    cleaned = {
        **req,
        "original": {**req["original"], "text": scrub_identifiers(original)},
        "rewrite": {**req["rewrite"], "text": scrub_identifiers(rewrite)},
    }
    return cleaned, rewrite


@lru_cache(maxsize=4)
def _prompt(protocol: str) -> str:
    """The versioned prompt's instructions (everything before its "Request:" line)."""
    text = (Path(settings.REPO_DIR) / "content" / "english" / "prompts" / f"{protocol}.md").read_text(encoding="utf-8")
    return text.split("\nRequest:", 1)[0].strip()


def _config() -> llm.LLMConfig:
    return llm.LLMConfig(
        provider=settings.OPENPATH_LLM_PROVIDER,
        model=settings.OPENPATH_LLM_MODEL,
        base_url=settings.OPENPATH_LLM_BASE_URL,
        api_key=settings.OPENPATH_LLM_API_KEY,
        max_output_tokens=settings.OPENPATH_LLM_MAX_OUTPUT_TOKENS,
        timeout_s=settings.OPENPATH_LLM_TIMEOUT_S,
        retries=getattr(settings, "OPENPATH_LLM_RETRIES", 1),
    )


def _adapter() -> tuple[str, str, str | None]:
    """(adapter, model, why unavailable)."""
    name = settings.OPENPATH_ESSAY_EVALUATOR
    if name not in ADAPTERS:
        return "disabled", "", f"OPENPATH_ESSAY_EVALUATOR={name!r} is not one of {', '.join(ADAPTERS)}"
    if name == "disabled":
        return name, "", "the essay evaluator is switched off on this server"
    if name == "replay":
        return name, "replay", None if settings.OPENPATH_ESSAY_REPLAY_FILE else "no replay file is configured"
    problems = _config().problems()
    return name, settings.OPENPATH_LLM_MODEL, "; ".join(problems) or None


def _over_budget() -> str | None:
    today = EssayEvaluationRecord.objects.filter(adapter="llm", created_at__date=timezone.localdate()).exclude(status="refused")
    if today.count() >= settings.OPENPATH_ESSAY_DAILY_REQUESTS:
        return "the daily request limit for the essay evaluator is reached"
    tokens = today.aggregate(i=Sum("input_tokens"), o=Sum("output_tokens"))
    if (tokens["i"] or 0) + (tokens["o"] or 0) >= settings.OPENPATH_ESSAY_DAILY_TOKENS:
        return "the daily token limit for the essay evaluator is reached"
    return None


def _evaluator(adapter: str, model: str, protocol: str, rubric: str) -> dict:
    return {"id": f"openpath-gateway:{adapter}", "version": settings.OPENPATH_ESSAY_EVALUATOR_VERSION, "model": model, "rubric": rubric, "protocol": protocol}


class DeveloperOnly(AccountBase):
    """Signed-in developer accounts only: the essay evaluator is for synthetic testing by the team."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not is_developer(request.user):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("the essay evaluator is available to developer accounts only, for synthetic test essays")


class EssayEvaluatorStatusView(DeveloperOnly):
    def get(self, request):
        adapter, model, why = _adapter()
        rubric = sorted(RUBRICS)[0]
        return Response(
            {
                "available": why is None,
                "reason": why or "",
                "adapter": adapter,
                "id": f"openpath-gateway:{adapter}",
                "version": settings.OPENPATH_ESSAY_EVALUATOR_VERSION,
                "model": model,
                "rubric": rubric,
                "protocols": {"observe": OBSERVE_V2, "rewrite": REWRITE_V2},
                "synthetic_only": True,
            }
        )


class EssayEvaluationView(DeveloperOnly):
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        task = data.get("task")
        record = EssayEvaluationRecord(user=request.user, task=str(task)[:12], protocol="", adapter="", status="refused")
        if data.get("data_use") != "synthetic_test":
            record.reason = "only synthetic test essays are accepted"
            record.save()
            return Response(
                {"error": "only synthetic test essays are accepted: real learners' essays need approved consent, retention and deletion policies"},
                status=status.HTTP_403_FORBIDDEN,
            )
        req, text = validate_essay_request(task, data.get("request"))
        record.protocol, record.rubric = req["protocol"], req["rubric"]
        record.fingerprint, record.text_chars = fnv1a(text), len(text)
        adapter, model, why = _adapter()
        record.adapter, record.model = adapter, model[:80]
        if why:
            record.reason = why[:200]
            record.save()
            return Response({"error": why, "fallback": FALLBACK}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if adapter == "llm":
            over = _over_budget()
            if over:
                record.reason = over
                record.save()
                return Response({"error": over, "fallback": FALLBACK}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        started = time.monotonic()
        try:
            if adapter == "replay":
                recordings = json.loads(Path(settings.OPENPATH_ESSAY_REPLAY_FILE).read_text(encoding="utf-8"))
                key = f"{task}:{fnv1a(text)}"
                if key not in recordings:
                    raise llm.LLMError("no recording for this text")
                output = recordings[key]
            else:
                completion = llm.complete(_config(), _prompt(req["protocol"]), json.dumps(req, ensure_ascii=False), transport=TRANSPORT)
                record.input_tokens, record.output_tokens = completion.input_tokens, completion.output_tokens
                output = llm.extract_json(completion.text)
            expected = req["essay"]["id"] if task == "observe" else req["rewrite"].get("id")
            if output.get("essay_id" if task == "observe" else "rewrite_id") != expected:
                raise llm.LLMError("the model's answer names a different essay or rewrite")
        except llm.LLMError as e:
            record.status, record.reason = "failed", str(e)[:200]
            record.latency_ms = int((time.monotonic() - started) * 1000)
            record.save()
            return Response({"error": str(e), "fallback": FALLBACK}, status=status.HTTP_502_BAD_GATEWAY)
        record.status = "answered"
        record.latency_ms = int((time.monotonic() - started) * 1000)
        record.save()
        return Response({"output": output, "evaluator": _evaluator(adapter, model, req["protocol"], req["rubric"]), "record": record.pk})
