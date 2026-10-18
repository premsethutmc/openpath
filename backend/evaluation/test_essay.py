"""The essay evaluator gateway (Essay Intelligence v2): who may call it, synthetic-only, fail-safe, bounded, and
that nothing about the essay or the credentials is stored or returned."""

import json
import tempfile
from unittest import mock

from django.forms.models import model_to_dict
from django.test import override_settings
from rest_framework.test import APIClient

from family.test_developer import DevTestCase

from . import essay
from .hashing import fnv1a
from .models import EssayEvaluationRecord

URL = "/api/evaluation/essays/"
STATUS = "/api/evaluation/essays/status/"
ESSAY = "My school have a big library. Every day my friend go there after lunch and read comics. It help us learn."
KEY = "sk-live-NEVER-SHOWN"
LLM = dict(
    OPENPATH_ESSAY_EVALUATOR="llm",
    OPENPATH_LLM_PROVIDER="anthropic",
    OPENPATH_LLM_MODEL="test-model",
    OPENPATH_LLM_BASE_URL="https://llm.example.test",
    OPENPATH_LLM_API_KEY=KEY,
    OPENPATH_LLM_RETRIES=0,
)


def observe_request(text=ESSAY, **extra):
    req = {
        "protocol": "essay-observe.v2",
        "rubric": "openpath.g8-writing@1",
        "request_id": "obs:essay:1",
        "essay": {"id": "essay:1", "text": text, "words": len(text.split())},
        "grade": 8,
        "competencies": [{"id": "EN.GRM.VERB.sva", "name": "Subject–verb agreement", "area": "grammar", "bands": {}, "misconceptions": []}],
        "max_observations": 40,
    }
    req.update(extra)
    return {"task": "observe", "request": req, "data_use": "synthetic_test"}


MODEL_OUTPUT = {
    "essay_id": "essay:1",
    "rubric": "openpath.g8-writing@1",
    "observations": [
        {
            "competency": "EN.GRM.VERB.sva",
            "kind": "error",
            "quote": "My school have",
            "explanation": "A singular subject needs has.",
            "correction": "My school has",
            "confidence": "high",
            "verification": "required",
        }
    ],
    "not_observable": [],
}


def anthropic_reply(text, status=200):
    def transport(url, headers, body, timeout):
        transport.calls.append((url, headers, json.loads(body)))
        return status, json.dumps({"content": [{"type": "text", "text": text}], "usage": {"input_tokens": 1200, "output_tokens": 300}, "stop_reason": "end_turn"}).encode()

    transport.calls = []
    return transport


class EssayGatewayTests(DevTestCase):
    def test_off_by_default_and_developers_only(self):
        dev = self.developer()
        self.assertEqual(dev.get(STATUS).json()["available"], False)
        self.assertEqual(dev.post(URL, observe_request(), format="json").status_code, 503)
        self.assertIn(APIClient().get(STATUS).status_code, (401, 403))
        parent = self.parent("someone@example.org")
        self.assertEqual(parent.get(STATUS).status_code, 403)
        self.assertEqual(parent.post(URL, observe_request(), format="json").status_code, 403)

    @override_settings(**LLM)
    def test_real_learner_essays_are_refused(self):
        dev = self.developer()
        for use in ["real_learner", None, "anything"]:
            body = {**observe_request(), "data_use": use}
            r = dev.post(URL, body, format="json")
            self.assertEqual(r.status_code, 403)
            self.assertIn("synthetic", r.json()["error"])

    @override_settings(**LLM)
    def test_llm_answer_is_returned_raw_with_its_provenance_and_nothing_is_stored_or_shown(self):
        dev = self.developer()
        t = anthropic_reply("```json\n" + json.dumps(MODEL_OUTPUT) + "\n```")
        with mock.patch.object(essay, "TRANSPORT", t):
            status = dev.get(STATUS).json()
            r = dev.post(URL, observe_request(), format="json")
        self.assertTrue(status["available"])
        self.assertEqual(status["protocols"], {"observe": "essay-observe.v2", "rewrite": "essay-rewrite.v2"})
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body["output"], MODEL_OUTPUT)
        self.assertEqual(body["evaluator"], {"id": "openpath-gateway:llm", "version": "essay-llm@1", "model": "test-model", "rubric": "openpath.g8-writing@1", "protocol": "essay-observe.v2"})
        # the provider got the prompt's instructions and the scrubbed request, with the key in a header only
        url, headers, sent = t.calls[0]
        self.assertTrue(url.endswith("/v1/messages"))
        self.assertEqual(headers["x-api-key"], KEY)
        self.assertIn("Grade 8", sent["system"])
        self.assertNotIn("Request:", sent["system"])
        self.assertNotIn("temperature", sent, "current models reject a non-default temperature")
        # nothing about the text, the output or the key is stored or returned
        rec = EssayEvaluationRecord.objects.get()
        stored = json.dumps(model_to_dict(rec), default=str)
        for secret in [ESSAY[:20], "My school have", "explanation", KEY]:
            self.assertNotIn(secret, stored)
        self.assertNotIn(KEY, r.content.decode())
        self.assertEqual((rec.status, rec.fingerprint, rec.text_chars, rec.input_tokens, rec.output_tokens), ("answered", fnv1a(ESSAY), len(ESSAY), 1200, 300))

    @override_settings(**LLM)
    def test_failures_are_safe_refusals(self):
        dev = self.developer()
        cases = [
            anthropic_reply("I cannot help with that."),  # no JSON
            anthropic_reply(json.dumps({**MODEL_OUTPUT, "essay_id": "essay:other"})),  # a different essay
            anthropic_reply("{}", status=500),  # provider error
        ]
        for t in cases:
            with mock.patch.object(essay, "TRANSPORT", t):
                r = dev.post(URL, observe_request(), format="json")
            self.assertEqual(r.status_code, 502, r.content)
            self.assertIn("fallback", r.json())

        def unreachable(*a):
            raise essay.llm.LLMError("the model provider could not be reached (TimeoutError)")

        with mock.patch.object(essay, "TRANSPORT", unreachable):
            self.assertEqual(dev.post(URL, observe_request(), format="json").status_code, 502)
        self.assertEqual(EssayEvaluationRecord.objects.filter(status="failed").count(), 4)
        for rec in EssayEvaluationRecord.objects.all():
            self.assertNotIn("library", rec.reason)

    @override_settings(**LLM, OPENPATH_ESSAY_DAILY_REQUESTS=2)
    def test_daily_request_limit_bounds_cost(self):
        dev = self.developer()
        with mock.patch.object(essay, "TRANSPORT", anthropic_reply(json.dumps(MODEL_OUTPUT))):
            codes = [dev.post(URL, observe_request(), format="json").status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])

    @override_settings(**LLM, OPENPATH_ESSAY_DAILY_TOKENS=1000)
    def test_daily_token_limit_bounds_cost(self):
        dev = self.developer()
        with mock.patch.object(essay, "TRANSPORT", anthropic_reply(json.dumps(MODEL_OUTPUT))):
            codes = [dev.post(URL, observe_request(), format="json").status_code for _ in range(2)]
        self.assertEqual(codes, [200, 429])

    @override_settings(OPENPATH_ESSAY_EVALUATOR="llm", OPENPATH_LLM_API_KEY="", OPENPATH_LLM_MODEL="m", OPENPATH_LLM_BASE_URL="https://llm.example.test")
    def test_missing_credentials_mean_unavailable(self):
        dev = self.developer()
        s = dev.get(STATUS).json()
        self.assertFalse(s["available"])
        self.assertIn("API key", s["reason"])
        self.assertEqual(dev.post(URL, observe_request(), format="json").status_code, 503)

    @override_settings(**LLM)
    def test_malformed_and_identifying_requests_are_refused(self):
        dev = self.developer()
        bad = [
            observe_request(protocol="essay-observe.v1"),
            observe_request(rubric="other@1"),
            observe_request(text="x" * 13_000),
            observe_request(learner="Asha"),
            {**observe_request(), "task": "grade"},
            observe_request(max_observations=500),
        ]
        for body in bad:
            self.assertEqual(dev.post(URL, body, format="json").status_code, 400, body["request"].keys() if isinstance(body.get("request"), dict) else body)

    def test_replay_adapter_for_repeatable_tests(self):
        dev = self.developer()
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump({f"observe:{fnv1a(ESSAY)}": MODEL_OUTPUT}, f)
        with override_settings(OPENPATH_ESSAY_EVALUATOR="replay", OPENPATH_ESSAY_REPLAY_FILE=f.name):
            r = dev.post(URL, observe_request(), format="json")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()["evaluator"]["id"], "openpath-gateway:replay")
            self.assertEqual(dev.post(URL, observe_request(text=ESSAY + " More."), format="json").status_code, 502)

    @override_settings(**LLM)
    def test_rewrite_task(self):
        dev = self.developer()
        out = {"rewrite_id": "rw:1", "rubric": "openpath.g8-writing@1", "dimensions": [], "key_ideas": []}
        req = {
            "protocol": "essay-rewrite.v2",
            "rubric": "openpath.g8-writing@1",
            "prompt": "Write about a place in your school.",
            "request_id": "rw:rw:1",
            "original": {"id": "essay:1", "text": ESSAY},
            "rewrite": {"id": "rw:1", "text": "Our library helps us learn.", "words": 5, "limit": 50},
            "dimensions": ["meaning_preservation", "clarity", "coherence", "grammar", "concision"],
        }
        with mock.patch.object(essay, "TRANSPORT", anthropic_reply(json.dumps(out))):
            r = dev.post(URL, {"task": "rewrite", "request": req, "data_use": "synthetic_test"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["evaluator"]["protocol"], "essay-rewrite.v2")
