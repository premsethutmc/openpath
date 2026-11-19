"""The one-off selftest command, against a stand-in OpenAI-style provider: it reports, it never stores writing."""

import io
import json
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from evaluation import llm

GOOD = {"points": [{"met": "yes", "note": "a"}, {"met": "partly", "note": "b"}, {"met": "no", "note": "c"}], "strength": "s", "next": "n"}
ON = dict(OPENPATH_WRITING_FEEDBACK="on", OPENPATH_WRITING_FEEDBACK_PROVIDER="openai_compatible", OPENPATH_WRITING_FEEDBACK_BASE_URL="https://api.openai.com/v1", OPENPATH_WRITING_FEEDBACK_MODEL="gpt-4.1-mini", OPENPATH_WRITING_FEEDBACK_API_KEY="test-key-never-real")


class SelftestTests(TestCase):
    def test_off_it_sends_nothing(self):
        out = io.StringIO()
        call_command("writing_feedback_selftest", stdout=out)
        self.assertIn("not run (switched off)", out.getvalue())

    @override_settings(**ON)
    def test_six_pieces_reach_an_openai_style_provider_and_are_reported(self):
        seen = []

        def transport(url, headers, body, timeout):
            seen.append((url, headers, json.loads(body)))
            return 200, json.dumps({"choices": [{"message": {"content": json.dumps(GOOD)}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 700, "completion_tokens": 120}}).encode()

        out = io.StringIO()
        with mock.patch.object(llm, "urllib_transport", transport):
            call_command("writing_feedback_selftest", stdout=out)
        self.assertEqual(len(seen), 6)
        url, headers, body = seen[0]
        self.assertEqual(url, "https://api.openai.com/v1/chat/completions")
        self.assertEqual(headers["authorization"], "Bearer test-key-never-real")
        self.assertEqual((body["model"], body["max_tokens"], body["response_format"]), ("gpt-4.1-mini", 400, {"type": "json_object"}))
        self.assertIn("6 of 6 usable; tokens in 4200 out 720", out.getvalue())
