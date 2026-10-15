"""E3a gateway: consent, identifier removal, validation, adapters (no live provider), records."""

import json
import socket
import tempfile
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from evaluation.adapters import ALLOWED, check_configuration
from evaluation.hashing import fingerprint, fnv1a
from evaluation.models import EvaluationRecord, PurposeConsent
from evaluation.scrub import scrub_for_evaluation
from learners.models import Learner

CASES = json.loads((Path(settings.BASE_DIR).parent / "content" / "english" / "signals" / "scrub-cases.json").read_text())


def short_request(text="The two dogs bark at the postman every morning.", **extra):
    return {
        "request_id": "req:e1",
        "prompt_version": "short.v1",
        "item": {"id": "sht.sva.01", "version": 1, "format": "short:rewrite", "prompt": "Rewrite…", "max_words": 15},
        "target": {"capability": "EN.GRM.VERB.sva", "name": "Subject–verb agreement", "misconceptions": []},
        "key_points": [{"id": "kp1", "text": "plural subject"}, {"id": "kp2", "text": "plural verb"}],
        "model_answers": ["The dogs bark at the postman every morning."],
        "anchor_set": "candidates",
        "anchors": [],
        "response": {"text": text},
        **extra,
    }


def writing_request(text):
    return {
        "request_id": "req:e2",
        "prompt_version": "evaluate.v2",
        "anchor_set": "candidates",
        "task": {"id": "wr.notice.quiz", "version": 1, "genre": "notice", "prompt": "…", "min_words": 40, "max_words": 60, "band_window": [2, 6]},
        "targets": [
            {
                "capability": "EN.WRT.GEN.functional",
                "name": "Functional writing",
                "band_descriptors": {},
                "criteria": [{"id": "EN.WRT.GEN.functional#1", "text": "layout"}],
                "misconceptions": [],
            }
        ],
        "anchors": [],
        "response": {"text": text},
    }


class GatewayTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        r = APIClient().post("/api/learners/", {"consent": {"given_by": "guardian", "confirmed": True}}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.learner_id, token = r.data["learner_id"], r.data["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.url = f"/api/learners/{self.learner_id}/evaluations/"

    def consent(self, granted=True):
        r = self.client.post(
            f"/api/learners/{self.learner_id}/consents/",
            {"purpose": "ai_evaluation_of_writing", "granted": granted, "given_by": "guardian"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)

    def evaluate(self, req):
        return self.client.post(self.url, {"request": req}, format="json")


class ConsentTests(GatewayTestCase):
    def test_no_consent_no_evaluation_and_nothing_stored(self):
        r = self.evaluate(short_request())
        self.assertEqual(r.status_code, 403)
        self.assertIn("fallback", r.data)
        self.assertEqual(EvaluationRecord.objects.count(), 0)

    def test_consent_can_be_withdrawn(self):
        self.consent(True)
        self.consent(False)
        self.assertEqual(self.evaluate(short_request()).status_code, 403)
        r = self.client.get(f"/api/learners/{self.learner_id}/consents/")
        self.assertFalse(r.data["ai_evaluation"])
        self.assertEqual(len(r.data["consents"]), 2)

    def test_enrolment_consent_is_not_consent_for_ai_evaluation(self):
        # enrolment records a general consent; AI evaluation needs its own purpose record
        self.assertEqual(self.evaluate(short_request()).status_code, 403)


class AdapterTests(GatewayTestCase):
    def setUp(self):
        super().setUp()
        self.consent(True)

    def test_default_adapter_is_disabled_and_refuses(self):
        self.assertEqual(settings.OPENPATH_EVALUATION_ADAPTER, "disabled")
        r = self.evaluate(short_request())
        self.assertEqual(r.status_code, 503)
        rec = EvaluationRecord.objects.get()
        self.assertEqual((rec.status, rec.adapter), ("refused", "disabled"))

    @override_settings(OPENPATH_EVALUATION_ADAPTER="mock")
    def test_mock_adapter_returns_a_proposal_with_provenance(self):
        r = self.evaluate(short_request())
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["evaluator"], {"id": "gateway:mock", "model": "mock", "prompt": "short.v1"})
        self.assertEqual([k["present"] for k in r.data["proposal"]["key_points"]], [False, False])
        rec = EvaluationRecord.objects.get()
        self.assertEqual((rec.status, rec.protocol, rec.item_id, rec.item_version), ("answered", "short.v1", "sht.sva.01", 1))
        self.assertEqual(rec.fingerprint, fingerprint(rec.request))

    @override_settings(OPENPATH_EVALUATION_ADAPTER="mock")
    def test_mock_writing_proposal_scores_every_criterion(self):
        r = self.evaluate(writing_request("NOTICE. The English Club will hold a quiz on Friday."))
        self.assertEqual(r.status_code, 200, r.content)
        j = r.data["proposal"]["judgements"][0]
        self.assertEqual([c["id"] for c in j["criteria"]], ["EN.WRT.GEN.functional#1"])

    @override_settings(OPENPATH_EVALUATION_ADAPTER="mock")
    def test_no_network_is_used(self):
        with mock.patch.object(socket.socket, "connect", side_effect=AssertionError("network used")):
            self.assertEqual(self.evaluate(short_request()).status_code, 200)

    def test_replay_returns_recordings_and_fails_loudly_without_one(self):
        req = short_request()
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump({fingerprint(req): {"recorded": True}}, f)
        with override_settings(OPENPATH_EVALUATION_ADAPTER="replay", OPENPATH_EVALUATION_REPLAY_FILE=f.name):
            self.assertEqual(self.evaluate(req).data["proposal"], {"recorded": True})
            r = self.evaluate(short_request("Something never recorded."))
            self.assertEqual(r.status_code, 502)
            self.assertEqual(EvaluationRecord.objects.filter(status="failed").count(), 1)

    def test_only_offline_adapters_exist(self):
        self.assertEqual(ALLOWED, ("disabled", "mock", "replay"))
        for name in ["live", "http", "provider"]:
            with override_settings(OPENPATH_EVALUATION_ADAPTER=name):
                with self.assertRaises(ImproperlyConfigured):
                    check_configuration()


class ValidationAndScrubbingTests(GatewayTestCase):
    def setUp(self):
        super().setUp()
        self.consent(True)

    @override_settings(OPENPATH_EVALUATION_ADAPTER="mock")
    def test_identifiers_are_removed_before_anything_is_stored_or_forwarded(self):
        text = "My name is Ravi Kumar. Call me on 98765 43210 or ravi@example.com.\nYours sincerely,\nRavi"
        r = self.evaluate(writing_request(text))
        self.assertEqual(r.status_code, 200, r.content)
        stored = EvaluationRecord.objects.get().request["response"]["text"]
        self.assertNotIn("Ravi", stored)
        self.assertNotIn("98765", stored)
        self.assertNotIn("@example", stored)
        self.assertNotIn("Ravi", json.dumps(r.data["proposal"]))

    def test_a_capability_name_is_allowed_but_a_name_anywhere_else_is_refused(self):
        # the core sends each target's capability name; that is content, not a learner's name
        self.assertEqual(self.evaluate(short_request()).status_code, 503)  # accepted, then refused by the disabled adapter
        for req in (
            {**short_request(), "item": {**short_request()["item"], "name": "Asha"}},
            {**short_request(), "response": {"text": "x", "name": "Asha"}},
            {**short_request(), "target": {**short_request()["target"], "learner": {"name": "Asha"}}},
            {**short_request(), "anchors": [{"name": "Asha"}]},
        ):
            r = self.evaluate(req)
            self.assertEqual(r.status_code, 400, req)
            self.assertIn("identifying", str(r.data))

    def test_requests_are_checked_strictly(self):
        bad = [
            {**short_request(), "prompt_version": "evaluate.v1"},
            {**short_request(), "estimate": 7},
            {**short_request(), "item": {"id": "x", "version": 1, "learner_id": "abc"}},
            short_request("x" * 3001),
            short_request("   "),
            "not an object",
        ]
        for req in bad:
            self.assertEqual(self.evaluate(req).status_code, 400, req if isinstance(req, str) else list(req))
        self.assertEqual(EvaluationRecord.objects.count(), 0)

    def test_scrubbing_and_hashing_agree_with_the_core(self):
        for c in CASES["scrub"]:
            self.assertEqual(scrub_for_evaluation(c["input"]), c["expected"], c["input"])
        for h in CASES["hashes"]:
            self.assertEqual(fnv1a(h["text"]), h["fnv1a"], h["text"])


class ExportAndDeleteTests(GatewayTestCase):
    @override_settings(OPENPATH_EVALUATION_ADAPTER="mock")
    def test_export_includes_consents_and_evaluations_and_delete_removes_them(self):
        self.consent(True)
        self.evaluate(short_request())
        export = self.client.get(f"/api/learners/{self.learner_id}/export/").json()
        self.assertEqual(export["purpose_consents"][0]["purpose"], "ai_evaluation_of_writing")
        self.assertEqual(export["evaluations"][0]["item_id"], "sht.sva.01")
        self.assertEqual(self.client.delete(f"/api/learners/{self.learner_id}/").status_code, 204)
        self.assertEqual(Learner.objects.count(), 0)
        self.assertEqual(EvaluationRecord.objects.count(), 0)
        self.assertEqual(PurposeConsent.objects.count(), 0)
