"""Evaluator adapters behind the gateway.

E3a has no live provider adapter, by decision (12 October): no provider is chosen, no API is called and
no learner answer leaves OpenPath. The only adapters are:

    disabled   refuses every request (the default); the device falls back to code-scored work
    mock       a deterministic stand-in for testing the plumbing; it judges nothing
    replay     returns recorded outputs by request fingerprint (for repeatable tests)

Configuring any other adapter is an error at start-up.
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .protocol import SHORT_V1, fingerprint

ALLOWED = ("disabled", "mock", "replay")


class AdapterUnavailable(Exception):
    """No evaluator may be used right now; the learner gets the code-scored fallback."""


class AdapterFailed(Exception):
    pass


def check_configuration():
    name = getattr(settings, "OPENPATH_EVALUATION_ADAPTER", "disabled")
    if name not in ALLOWED:
        raise ImproperlyConfigured(
            f"OPENPATH_EVALUATION_ADAPTER={name!r}: only {', '.join(ALLOWED)} exist in E3a. "
            "Live providers need a separate approval (E3b)."
        )


def _first_sentence(text: str) -> str:
    for end in (".", "!", "?", "\n"):
        i = text.find(end)
        if i > 0:
            text = text[:i]
    return text.strip()[:60]


class MockAdapter:
    """Answers with a fixed, well-formed proposal so the full path can be tested. It judges nothing:
    writing gets the centre of the task's band window on every criterion; short answers get every key
    point marked absent."""

    name = "mock"

    def evaluate(self, req: dict) -> dict:
        evidence_id = req["request_id"].removeprefix("req:")
        flags = {"off_task": False, "too_short": False, "possibly_copied": False, "safeguarding": False}
        text = req["response"]["text"]
        if req["prompt_version"] == SHORT_V1:
            return {
                "evidence_id": evidence_id,
                "item": {"id": req["item"]["id"], "version": req["item"]["version"]},
                "key_points": [{"id": k["id"], "present": False, "quote": None} for k in req["key_points"]],
                "misconceptions": [],
                "flags": flags,
                "rationale": "Gateway mock: judges nothing.",
            }
        lo, hi = req["task"]["band_window"]
        centre = round((lo + hi) / 2 * 2) / 2
        quote = _first_sentence(text)
        return {
            "evidence_id": evidence_id,
            "item": {"id": req["task"]["id"], "version": req["task"]["version"]},
            "judgements": [
                {
                    "capability": t["capability"],
                    "band": centre,
                    "confidence": "low",
                    "criteria": [{"id": c["id"], "band": centre, "quote": quote} for c in t["criteria"]],
                    "quotes": [quote],
                    "misconceptions": [],
                    "rationale": "Gateway mock: judges nothing.",
                }
                for t in req["targets"]
            ],
            "not_observable": [],
            "flags": flags,
        }


class ReplayAdapter:
    name = "replay"

    def __init__(self, path):
        self.recordings = json.loads(Path(path).read_text()) if path else {}

    def evaluate(self, req: dict) -> dict:
        key = fingerprint(req)
        if key not in self.recordings:
            raise AdapterFailed(f"no recording for {key}")
        return self.recordings[key]


def get_adapter():
    check_configuration()
    name = getattr(settings, "OPENPATH_EVALUATION_ADAPTER", "disabled")
    if name == "disabled":
        raise AdapterUnavailable("AI evaluation is switched off on this server")
    if name == "mock":
        return MockAdapter()
    return ReplayAdapter(getattr(settings, "OPENPATH_EVALUATION_REPLAY_FILE", None))
