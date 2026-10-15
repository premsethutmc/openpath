"""What the gateway accepts and forwards (E3 protocols only)."""

from rest_framework.exceptions import ValidationError

from .hashing import fingerprint  # noqa: F401 (re-exported)
from .scrub import scrub_for_evaluation

WRITING_V2 = "evaluate.v2"
SHORT_V1 = "short.v1"
MAX_RESPONSE_CHARS = 3000

_WRITING_KEYS = {"request_id", "prompt_version", "anchor_set", "task", "targets", "anchors", "response"}
_SHORT_KEYS = {"request_id", "prompt_version", "item", "target", "key_points", "model_answers", "anchor_set", "anchors", "response"}
# Nothing that identifies a learner may appear anywhere in a request.
_FORBIDDEN = {"learner", "learner_id", "name", "email", "phone", "school", "token"}


# The one place "name" is content, not identity: the capability's name in `target` (short.v1) and in each of
# `targets` (evaluate.v2), which the core always sends (english-core evaluation.ts). Everywhere else it is refused.
_CAPABILITY_NAME_PATHS = {("target",), ("targets", "*")}


def _walk_keys(value, path=()):
    if isinstance(value, dict):
        for k, v in value.items():
            if not (k == "name" and path in _CAPABILITY_NAME_PATHS and isinstance(v, str)):
                yield k
            yield from _walk_keys(v, path + (k,))
    elif isinstance(value, list):
        for v in value:
            yield from _walk_keys(v, path + ("*",))


def validate_request(req) -> dict:
    """Check the shape, refuse anything identifying, and remove identifiers from the response again."""
    if not isinstance(req, dict):
        raise ValidationError("request must be an object")
    protocol = req.get("prompt_version")
    if protocol == WRITING_V2:
        allowed, item_key = _WRITING_KEYS, "task"
    elif protocol == SHORT_V1:
        allowed, item_key = _SHORT_KEYS, "item"
    else:
        raise ValidationError(f"the gateway accepts only {WRITING_V2} and {SHORT_V1} requests")
    extra = set(req) - allowed
    if extra:
        raise ValidationError(f"unexpected fields: {sorted(extra)}")
    missing = allowed - set(req)
    if missing:
        raise ValidationError(f"missing fields: {sorted(missing)}")
    bad = _FORBIDDEN & set(_walk_keys(req))
    if bad:
        raise ValidationError(f"requests must not carry identifying fields: {sorted(bad)}")
    item = req[item_key]
    if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not isinstance(item.get("version"), int):
        raise ValidationError(f"{item_key} must name an id and a version")
    text = (req.get("response") or {}).get("text")
    if not isinstance(text, str) or not text.strip():
        raise ValidationError("response.text must be a non-empty string")
    if len(text) > MAX_RESPONSE_CHARS:
        raise ValidationError(f"response is longer than {MAX_RESPONSE_CHARS} characters")
    cleaned = {**req, "response": {"text": scrub_for_evaluation(text)}}
    return cleaned
