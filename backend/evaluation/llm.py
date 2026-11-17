"""A minimal, provider-neutral LLM client for the essay evaluator (Essay Intelligence v2).

No third-party SDK: the standard library sends one HTTPS request per call, so the provider stays interchangeable
(owner decision, Oct 2026) and nothing new is installed. Two wire formats are supported:

    anthropic           POST {base_url}/v1/messages           (x-api-key, anthropic-version headers)
    openai_compatible   POST {base_url}/chat/completions       (Authorization: Bearer …)

Checked against the provider's published documentation on 18 October 2026 (platform.claude.com/docs: API overview,
Messages, Errors): POST /v1/messages with x-api-key (still supported; Authorization: Bearer is the newer form),
anthropic-version 2023-06-01 and content-type application/json; system is a top-level field; the reply has text content
blocks, stop_reason (end_turn, max_tokens, refusal, model_context_window_exceeded, …) and usage.input_tokens /
usage.output_tokens; errors are JSON {"type": "error", "error": {"type", "message"}}. Current models (Claude 4.7 and
later) reject a non-default temperature with 400, so temperature is sent only when explicitly configured.

Safety properties, all tested:
  - the API key is never logged, never returned and never part of an exception message;
  - every call has a timeout, an output-token cap and an input-size cap;
  - any transport error, non-200 reply, refusal or unparseable output raises LLMError with a short, text-free
    reason, so the caller fails safely;
  - this module never sees learner identity: it receives a system prompt and an already-scrubbed request.

This file does not import Django, so it can be tested on its own.
"""

from __future__ import annotations

import json
import math
import http.client
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Callable

MAX_RESPONSE_BYTES = 2_000_000

PROVIDERS = ("anthropic", "openai_compatible")


class LLMError(Exception):
    """The model could not give a usable answer. The message never contains essay text or credentials."""


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    model: str
    base_url: str
    api_key: str = field(repr=False)
    max_output_tokens: int = 4000
    max_input_chars: int = 60_000
    timeout_s: float = 60.0
    # None: not sent (current Anthropic models reject a non-default temperature with 400)
    temperature: float | None = None
    anthropic_version: str = "2023-06-01"
    # transient failures (connection, 429, 500, 504, 529) are retried this many times, with backoff
    retries: int = 1

    def problems(self) -> list[str]:
        p = []
        if self.provider not in PROVIDERS:
            p.append(f"provider must be one of {', '.join(PROVIDERS)}")
        if not isinstance(self.model, str) or not self.model.strip() or len(self.model) > 200:
            p.append("a model name of at most 200 characters is required")
        if not _valid_url(self.base_url):
            p.append("base_url must be HTTPS (or loopback HTTP), without credentials, query or fragment")
        if not isinstance(self.api_key, str) or not self.api_key or len(self.api_key) > 4096 or any(ord(c) < 32 or ord(c) > 126 for c in self.api_key):
            p.append("a valid API key is required in the server environment")
        for name, value, low, high in (("max_output_tokens", self.max_output_tokens, 1, 16000), ("max_input_chars", self.max_input_chars, 1, 1_000_000), ("retries", self.retries, 0, 3)):
            if type(value) is not int or not low <= value <= high:
                p.append(f"{name} must be an integer between {low} and {high}")
        if type(self.timeout_s) not in (int, float) or not math.isfinite(self.timeout_s) or not 1 <= self.timeout_s <= 300:
            p.append("timeout_s must be between 1 and 300 seconds")
        if self.temperature is not None and (type(self.temperature) not in (int, float) or not math.isfinite(self.temperature) or not 0 <= self.temperature <= 2):
            p.append("temperature must be finite and between 0 and 2")
        if not isinstance(self.anthropic_version, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", self.anthropic_version):
            p.append("anthropic_version must use YYYY-MM-DD")
        return p


def _valid_url(url: str) -> bool:
    from urllib.parse import urlsplit
    if not isinstance(url, str) or not url or any(c.isspace() or ord(c) < 32 for c in url) or "\\" in url:
        return False
    try:
        u = urlsplit(url)
        port = u.port
        return bool(u.hostname and not u.username and not u.password and "@" not in u.netloc
                    and "?" not in url and "#" not in url
                    and (port is None or 1 <= port <= 65535)
                    and (u.scheme == "https" or (u.scheme == "http" and u.hostname in ("127.0.0.1", "localhost", "::1"))))
    except ValueError:
        return False


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _bounded_read(response) -> bytes:
    raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise LLMError("the model provider's reply exceeded the size limit")
    return raw


@dataclass(frozen=True)
class Completion:
    text: str
    input_tokens: int
    output_tokens: int


def _completion(text, input_tokens, output_tokens) -> Completion:
    if not isinstance(text, str) or not text.strip() or any(type(n) is not int or n < 0 or n > 100_000_000 for n in (input_tokens, output_tokens)):
        raise LLMError("the model provider's reply had an unexpected shape")
    return Completion(text, input_tokens, output_tokens)


# (url, headers, body bytes, timeout) -> (status, body bytes). Replaced in tests; never logs anything.
Transport = Callable[[str, dict, bytes, float], tuple[int, bytes]]


def urllib_transport(url: str, headers: dict, body: bytes, timeout: float) -> tuple[int, bytes]:
    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.build_opener(_NoRedirect()).open(req, timeout=timeout) as r:  # noqa: S310 (https enforced by LLMConfig)
            return r.status, _bounded_read(r)
    except urllib.error.HTTPError as e:
        try:
            # Never read a redirect body or forward any authentication headers.
            return e.code, b"" if 300 <= e.code < 400 else _bounded_read(e)
        except LLMError:
            raise
        except Exception:
            raise LLMError("the model provider reply could not be read") from None
        finally:
            e.close()
    except LLMError:
        raise
    except (urllib.error.URLError, OSError, ValueError, http.client.HTTPException):
        raise LLMError("the model provider could not be reached") from None


TRANSIENT = {429, 500, 504, 529}


def _error_type(raw: bytes) -> str:
    """The provider's error type (for example rate_limit_error), never its message: messages could echo input."""
    try:
        t = json.loads(raw.decode("utf-8")).get("error", {}).get("type", "")
        return t if t in ("invalid_request_error", "authentication_error", "permission_error", "not_found_error", "request_too_large", "rate_limit_error", "api_error", "overloaded_error") else ""
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError, TypeError, RecursionError):
        return ""


def complete(config: LLMConfig, system: str, user: str, transport: Transport = urllib_transport, sleep: Callable[[float], None] = time.sleep) -> Completion:
    """One request to the configured provider. Returns its text and token usage, or raises LLMError."""
    bad = config.problems()
    if bad:
        raise LLMError("the LLM evaluator is not configured: " + "; ".join(bad))
    if not isinstance(system, str) or not isinstance(user, str):
        raise LLMError("the request must contain text")
    if len(system) + len(user) > config.max_input_chars:
        raise LLMError("the request is larger than the configured input limit")
    base = config.base_url.rstrip("/")
    if config.provider == "anthropic":
        url = f"{base}/v1/messages"
        headers = {"content-type": "application/json", "x-api-key": config.api_key, "anthropic-version": config.anthropic_version}
        body = {
            "model": config.model,
            "max_tokens": config.max_output_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
        if config.temperature is not None:
            body["temperature"] = config.temperature
    else:
        url = f"{base}/chat/completions"
        headers = {"content-type": "application/json", "authorization": f"Bearer {config.api_key}"}
        body = {
            "model": config.model,
            "max_tokens": config.max_output_tokens,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        if config.temperature is not None:
            body["temperature"] = config.temperature
    payload = json.dumps(body).encode("utf-8")
    attempt = 0
    while True:
        try:
            status, raw = transport(url, headers, payload, config.timeout_s)
        except Exception:
            if attempt >= config.retries:
                raise LLMError("the model provider could not be reached") from None
            status, raw = -1, b""
        if type(status) is not int or not isinstance(raw, bytes):
            raise LLMError("the model provider returned an invalid response")
        if len(raw) > MAX_RESPONSE_BYTES:
            raise LLMError("the model provider reply exceeded the size limit")
        if status == 200:
            break
        if (status in TRANSIENT or status == -1) and attempt < config.retries:
            attempt += 1
            sleep(2.0 * attempt)
            continue
        if status == -1:
            raise LLMError("the model provider could not be reached")
        if status != -1 and not 100 <= status <= 599:
            raise LLMError("the model provider returned an invalid status")
        kind = _error_type(raw)
        raise LLMError(f"the model provider answered with status {status}{f' ({kind})' if kind else ''}")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, RecursionError):
        raise LLMError("the model provider's reply was not JSON") from None
    try:
        if config.provider == "anthropic":
            stop = data.get("stop_reason")
            if stop == "max_tokens":
                raise LLMError("the model's answer was cut off at the output limit")
            if stop == "refusal":
                raise LLMError("the model declined to answer (refusal)")
            if stop == "model_context_window_exceeded":
                raise LLMError("the request was larger than the model's context window")
            text = "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text")
            usage = data.get("usage") or {}
            return _completion(text, usage.get("input_tokens", 0), usage.get("output_tokens", 0))
        choice = data["choices"][0]
        if choice.get("finish_reason") == "content_filter" or choice.get("message", {}).get("refusal"):
            raise LLMError("the model declined to answer (refusal)")
        if choice.get("finish_reason") == "length":
            raise LLMError("the model's answer was cut off at the output limit")
        usage = data.get("usage") or {}
        return _completion(choice["message"]["content"], usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
    except LLMError:
        raise
    except (KeyError, IndexError, TypeError, ValueError, AttributeError):
        raise LLMError("the model provider's reply had an unexpected shape") from None


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def extract_json(text: str) -> dict:
    """The JSON object in a model's answer (a code fence around it is tolerated). Anything else raises LLMError."""
    s = _FENCE.sub("", text.strip())
    start, end = s.find("{"), s.rfind("}")
    if start < 0 or end <= start:
        raise LLMError("the model's answer contained no JSON object")
    try:
        obj = json.loads(s[start : end + 1])
    except json.JSONDecodeError:
        raise LLMError("the model's answer was not valid JSON") from None
    if not isinstance(obj, dict):
        raise LLMError("the model's answer was not a JSON object")
    return obj
