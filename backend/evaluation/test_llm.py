"""The LLM client on its own (no Django, no network): wire formats, limits, failures and secrecy of the key.

Runs with plain unittest (python -m unittest evaluation.test_llm) and under Django's test runner."""

import json
import unittest

from evaluation.llm import Completion, LLMConfig, LLMError, complete, extract_json

KEY = "sk-test-SECRET-123"


def cfg(**kw):
    base = dict(provider="anthropic", model="test-model", base_url="https://llm.example.test", api_key=KEY)
    base.update(kw)
    return LLMConfig(**base)


class Recorder:
    def __init__(self, status=200, body=None):
        self.status, self.body, self.calls = status, body, []

    def __call__(self, url, headers, body, timeout):
        self.calls.append((url, headers, json.loads(body), timeout))
        return self.status, json.dumps(self.body).encode() if self.body is not None else b""


class LLMClientTests(unittest.TestCase):
    def test_anthropic_wire_format_and_usage(self):
        t = Recorder(body={"content": [{"type": "text", "text": '{"ok": true}'}], "usage": {"input_tokens": 11, "output_tokens": 7}, "stop_reason": "end_turn"})
        out = complete(cfg(max_output_tokens=900, timeout_s=20), "SYSTEM", "USER", transport=t)
        self.assertEqual(out, Completion('{"ok": true}', 11, 7))
        url, headers, body, timeout = t.calls[0]
        self.assertEqual(url, "https://llm.example.test/v1/messages")
        self.assertEqual(headers["x-api-key"], KEY)
        self.assertIn("anthropic-version", headers)
        self.assertEqual(body["system"], "SYSTEM")
        self.assertEqual(body["messages"], [{"role": "user", "content": "USER"}])
        self.assertEqual((body["max_tokens"], body["temperature"], timeout), (900, 0.0, 20))

    def test_openai_compatible_wire_format(self):
        t = Recorder(body={"choices": [{"message": {"content": "{}"}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 3, "completion_tokens": 2}})
        out = complete(cfg(provider="openai_compatible"), "S", "U", transport=t)
        self.assertEqual(out.output_tokens, 2)
        url, headers, body, _ = t.calls[0]
        self.assertEqual(url, "https://llm.example.test/chat/completions")
        self.assertEqual(headers["authorization"], f"Bearer {KEY}")
        self.assertEqual(body["response_format"], {"type": "json_object"})

    def test_failures_raise_text_free_errors_without_the_key(self):
        cases = [
            Recorder(status=500),
            Recorder(status=401),
            Recorder(body={"unexpected": 1}),
            Recorder(body={"content": [{"type": "text", "text": "x"}], "stop_reason": "max_tokens"}),
        ]
        for t in cases:
            with self.assertRaises(LLMError) as e:
                complete(cfg(), "S", "an essay about my school", transport=t)
            self.assertNotIn(KEY, str(e.exception))
            self.assertNotIn("essay about my school", str(e.exception))

        def broken(*a):
            raise LLMError("the model provider could not be reached (TimeoutError)")

        with self.assertRaises(LLMError):
            complete(cfg(), "S", "U", transport=broken)

    def test_configuration_and_limits(self):
        for bad in [cfg(provider="other"), cfg(model=""), cfg(base_url="http://insecure.test"), cfg(api_key=""), cfg(max_output_tokens=0), cfg(timeout_s=0)]:
            with self.assertRaises(LLMError):
                complete(bad, "S", "U", transport=Recorder(body={}))
        with self.assertRaises(LLMError):
            complete(cfg(max_input_chars=10), "S", "U" * 20, transport=Recorder(body={}))
        self.assertNotIn(KEY, repr(cfg()))

    def test_extract_json(self):
        self.assertEqual(extract_json('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(extract_json('Here it is: {"a": [1, 2]}'), {"a": [1, 2]})
        for bad in ["no json", "{not json}", "[1, 2]"]:
            with self.assertRaises(LLMError):
                extract_json(bad)


if __name__ == "__main__":
    unittest.main()
