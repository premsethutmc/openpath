"""A minimal, provider-neutral LLM client for the essay evaluator (Essay Intelligence v2).

No third-party SDK: the standard library sends one HTTPS request per call, so the provider stays interchangeable
(owner decision, Oct 2026) and nothing new is installed. Two wire formats are supported:

    anthropic           POST {base_url}/v1/messages           (x-api-key, anthropic-version headers)
    openai_compatible   POST {base_url}/chat/completions       (Authorization: Bearer …)

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
import re
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Callable

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
    temperature: float = 0.0
    anthropic_version: str = "2023-06-01"

    def problems(self) -> list[str]:
        p = []
        if self.provider not in PROVIDERS:
            p.append(f"provider must be one of {', '.join(PROVIDERS)}")
        if not self.model:
            p.append("a model name is required")
        if not self.base_url.startswith("https://"):
            p.append("base_url must be an https:// URL")
        if not self.api_key:
            p.append("an API key is required (set it in the server environment, never in code)")
        if not (1 <= self.max_output_tokens <= 16_000):
            p.append("max_output_tokens must be between 1 and 16000")
        if not (1 <= self.timeout_s <= 300):
            p.append("timeout_s must be between 1 and 300 seconds")
        return p


@dataclass(frozen=True)
class Completion:
    text: str
    input_tokens: int
    output_tokens: int


# (url, headers, body bytes, timeout) -> (status, body bytes). Replaced in tests; never logs anything.
Transport = Callable[[str, dict, bytes, float], tuple[int, bytes]]


def urllib_transport(url: str, headers: dict, body: bytes, timeout: float) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 (https enforced by LLMConfig)
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as e:
        raise LLMError(f"the model provider could not be reached ({type(e).__name__})") from None


def complete(config: LLMConfig, system: str, user: str, transport: Transport = urllib_transport) -> Completion:
    """One request to the configured provider. Returns its text and token usage, or raises LLMError."""
    bad = config.problems()
    if bad:
        raise LLMError("the LLM evaluator is not configured: " + "; ".join(bad))
    if len(system) + len(user) > config.max_input_chars:
        raise LLMError("the request is larger than the configured input limit")
    base = config.base_url.rstrip("/")
    if config.provider == "anthropic":
        url = f"{base}/v1/messages"
        headers = {"content-type": "application/json", "x-api-key": config.api_key, "anthropic-version": config.anthropic_version}
        body = {
            "model": config.model,
            "max_tokens": config.max_output_tokens,
            "temperature": config.temperature,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
    else:
        url = f"{base}/chat/completions"
        headers = {"content-type": "application/json", "authorization": f"Bearer {config.api_key}"}
        body = {
            "model": config.model,
            "max_tokens": config.max_output_tokens,
            "temperature": config.temperature,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
    status, raw = transport(url, headers, json.dumps(body).encode("utf-8"), config.timeout_s)
    if status != 200:
        raise LLMError(f"the model provider answered with status {status}")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise LLMError("the model provider's reply was not JSON") from None
    try:
        if config.provider == "anthropic":
            if data.get("stop_reason") == "max_tokens":
                raise LLMError("the model's answer was cut off at the output limit")
            text = "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text")
            usage = data.get("usage") or {}
            return Completion(text, int(usage.get("input_tokens", 0)), int(usage.get("output_tokens", 0)))
        choice = data["choices"][0]
        if choice.get("finish_reason") == "length":
            raise LLMError("the model's answer was cut off at the output limit")
        usage = data.get("usage") or {}
        return Completion(choice["message"]["content"] or "", int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0)))
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
