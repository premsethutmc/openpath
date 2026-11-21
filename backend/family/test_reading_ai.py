"""reading-ai@1. No test calls a provider: the transport is replaced."""

import json

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from . import reading_ai as ra
from . import writing_feedback as wf
from .test_writing_feedback import PASSWORD, reply

ON = dict(OPENPATH_READING_AI="on", OPENPATH_WRITING_FEEDBACK_MODEL="test-small-model", OPENPATH_WRITING_FEEDBACK_API_KEY="test-key-never-real", OPENPATH_READING_AI_DAILY=3, OPENPATH_READING_AI_SITE_DAILY=50)
ITEM = "wa.L1.P1.1"


class ReadingAiTests(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.assertEqual(self.c.post("/api/account/register/", {"email": "ra@example.org", "password": PASSWORD, "consent": True}, format="json").status_code, 201)
        self.pupil = self.c.post("/api/pupils/", {"display_name": "Meena", "consent": True}, format="json").json()["id"]
        self.url = f"/api/pupils/{self.pupil}/reading-ai/"
        self.addCleanup(setattr, ra.ReadingAiView, "transport", ra.ReadingAiView.transport)

    def use(self, transport):
        ra.ReadingAiView.transport = staticmethod(transport)
        return transport

    def ask(self, answer="The wheel had no air in it.", item=ITEM):
        return self.c.post(self.url, {"item": item, "answer": answer}, format="json")

    def test_off_by_default_and_nothing_sent_without_the_parents_own_yes(self):
        t = self.use(reply({"right": True}))
        self.assertEqual(self.c.get(self.url).json(), {"available": False, "consent": False})
        self.assertEqual(self.ask().status_code, 503)
        with override_settings(**ON):
            self.assertEqual(self.ask().status_code, 403)
            # the writing-feedback yes is not this yes, and this yes is not the writing-feedback yes
            self.c.post(f"/api/pupils/{self.pupil}/writing-feedback/consent/", {"granted": True}, format="json")
            self.assertEqual(self.ask().status_code, 403)
            self.c.post(f"/api/pupils/{self.pupil}/writing-feedback/consent/", {"granted": False}, format="json")
            self.c.post(f"{self.url}consent/", {"granted": True}, format="json")
            from .models import Pupil
            self.assertFalse(wf.has_consent(Pupil.objects.get(pk=self.pupil)))
            r = self.ask()
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json(), {"right": True})
        self.assertEqual(len(t.seen), 1)

    @override_settings(**ON)
    def test_only_a_known_question_and_a_short_answer_the_server_builds_the_prompt_and_nothing_is_kept(self):
        t = self.use(reply({"right": False}))
        self.c.post(f"{self.url}consent/", {"granted": True}, format="json")
        self.assertEqual(self.ask(item="no.such.item").status_code, 400)
        self.assertEqual(self.ask(answer="x" * 301).status_code, 400)
        self.assertEqual(self.ask(answer="  ").status_code, 400)
        self.assertEqual(self.ask("It was flat. Call 98765 43210.").json(), {"right": False})
        sent = json.loads(t.seen[0][2]["messages"][0]["content"])
        self.assertEqual(sent["question"], "Why was the bus late?")
        self.assertNotIn("98765", sent["child_answer"])
        self.assertIn("one tyre was flat", sent["passage"])

    @override_settings(**ON)
    def test_limits_and_an_unusable_reply(self):
        self.c.post(f"{self.url}consent/", {"granted": True}, format="json")
        self.use(reply("I think it is right"))
        self.assertEqual(self.ask().status_code, 502)
        self.use(reply({"right": True}))
        self.assertEqual(self.ask().status_code, 200)
        self.assertEqual(self.ask().status_code, 200)
        self.assertEqual(self.ask().status_code, 429)  # three a day for this account (the failed one counted)
