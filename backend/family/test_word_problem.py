"""word-reader@1: the word-problem reader. No test calls a provider: the transport is replaced."""

import json

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from evaluation import llm

from . import word_problem
from .models import WordProblemUse

PASSWORD = "synthetic-testing-password-1"
ON = dict(OPENPATH_WORD_PROBLEMS="on", OPENPATH_WORD_PROBLEM_MODEL="test-model", OPENPATH_WORD_PROBLEM_API_KEY="test-key-never-real", OPENPATH_WORD_PROBLEM_DAILY=3, OPENPATH_WORD_PROBLEM_SITE_DAILY=5)


def reply(obj, status=200):
    """A transport that answers every call with this model output, and remembers what it was sent."""
    seen = []

    def transport(url, headers, body, timeout):
        seen.append((url, headers, json.loads(body)))
        text = obj if isinstance(obj, str) else json.dumps(obj)
        return status, json.dumps({"content": [{"type": "text", "text": text}], "stop_reason": "end_turn", "usage": {"input_tokens": 500, "output_tokens": 60}}).encode()

    transport.seen = seen
    return transport


class WordProblemTests(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.assertEqual(self.c.post("/api/account/register/", {"email": "wp@example.org", "password": PASSWORD, "consent": True}, format="json").status_code, 201)
        self.addCleanup(setattr, word_problem.WordProblemView, "transport", word_problem.WordProblemView.transport)

    def use(self, transport):
        word_problem.WordProblemView.transport = staticmethod(transport)
        return transport

    def ask(self, text="Ravi has 5 apples and eats 2. How many are left?"):
        return self.c.post("/api/solver/read/", {"text": text}, format="json")

    def test_off_by_default_and_nothing_is_sent(self):
        t = self.use(reply({"calculation": "5 - 2", "reading": "x", "unit": "apples"}))
        r = self.ask()
        self.assertEqual(r.status_code, 503)
        self.assertEqual(t.seen, [])
        with override_settings(OPENPATH_WORD_PROBLEMS="on"):  # switched on but no key or model: still off
            self.assertEqual(self.ask().status_code, 503)
        self.assertEqual(t.seen, [])

    @override_settings(**ON)
    def test_reads_a_problem_and_sends_only_the_text(self):
        t = self.use(reply({"calculation": "5 - 2", "reading": "Take the eaten apples away from the apples he had.", "unit": "apples"}))
        r = self.ask()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, {"calculation": "5 - 2", "reading": "Take the eaten apples away from the apples he had.", "unit": "apples", "left": 2})
        url, headers, body = t.seen[0]
        self.assertEqual(url, "https://api.anthropic.com/v1/messages")
        sent = json.dumps(body)
        self.assertIn("Ravi has 5 apples", sent)
        self.assertNotIn("wp@example.org", sent)
        self.assertLessEqual(body["max_tokens"], 300)
        use = WordProblemUse.objects.get()
        self.assertEqual((use.requests, use.input_tokens, use.output_tokens), (1, 500, 60))

    def test_the_app_can_ask_whether_word_problems_are_read(self):
        self.assertEqual(self.c.get("/api/solver/read/").data, {"available": False, "limit": 20, "left": 20})
        with override_settings(**ON):
            self.use(reply({"calculation": "1 + 1", "reading": "Add.", "unit": ""}))
            self.ask()
            self.assertEqual(self.c.get("/api/solver/read/").data, {"available": True, "limit": 3, "left": 2})

    @override_settings(**ON)
    def test_signed_out_is_refused(self):
        self.use(reply({"cannot": "no"}))
        self.assertIn(APIClient().post("/api/solver/read/", {"text": "2 + 2"}, format="json").status_code, (401, 403))

    @override_settings(**ON)
    def test_daily_limit_per_account_and_for_the_site(self):
        t = self.use(reply({"calculation": "1 + 1", "reading": "Add.", "unit": ""}))
        self.assertEqual([self.ask().status_code for _ in range(4)], [200, 200, 200, 429])
        self.assertEqual(len(t.seen), 3)
        other = APIClient()
        other.post("/api/account/register/", {"email": "wp2@example.org", "password": PASSWORD, "consent": True}, format="json")
        codes = [other.post("/api/solver/read/", {"text": "a problem"}, format="json").status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])  # the site's five for the day are used
        self.assertEqual(len(t.seen), 5)

    @override_settings(**ON)
    def test_a_reply_that_is_not_one_checkable_calculation_is_never_passed_on(self):
        bad = [
            "The answer is 3.",
            {"calculation": "import os", "reading": "x", "unit": ""},
            {"calculation": "5 - 2; DROP", "reading": "x", "unit": ""},
            {"calculation": "x + y = 3", "reading": "x", "unit": ""},
            {"calculation": "1 = 2 = 3", "reading": "x", "unit": ""},
            {"calculation": "5 - 2", "reading": "<script>alert(1)</script>", "unit": ""},
            {"calculation": "five minus two", "reading": "x", "unit": ""},
            {"calculation": 3, "reading": "x", "unit": ""},
            {"answer": 3},
        ]
        with override_settings(OPENPATH_WORD_PROBLEM_DAILY=50, OPENPATH_WORD_PROBLEM_SITE_DAILY=50):
            for b in bad:
                self.use(reply(b))
                r = self.ask()
                self.assertEqual(r.status_code, 200, b)
                self.assertNotIn("calculation", r.data, b)
                self.assertIn("cannot", r.data, b)

    @override_settings(**ON)
    def test_cannot_and_provider_errors_are_plain(self):
        self.use(reply({"cannot": "This needs the picture, which I cannot see."}))
        self.assertEqual(self.ask().data["cannot"], "This needs the picture, which I cannot see.")
        self.use(reply({"error": {"type": "overloaded_error", "message": "secret provider text"}}, status=529))
        r = self.ask()
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("secret", json.dumps(r.data))

    @override_settings(**ON)
    def test_input_limits(self):
        self.use(reply({"cannot": "no"}))
        self.assertEqual(self.ask("").status_code, 400)
        self.assertEqual(self.ask("x" * 601).status_code, 400)
        self.assertEqual(self.c.post("/api/solver/read/", {"text": 5}, format="json").status_code, 400)

    def test_the_key_is_never_in_what_the_reader_shows(self):
        with override_settings(**ON):
            self.assertIsNone(word_problem.enabled())
            self.assertNotIn("test-key-never-real", repr(word_problem._config()))
