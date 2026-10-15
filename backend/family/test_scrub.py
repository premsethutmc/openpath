"""Deleting a parent's word list for real: the content leaves the stored record, the learning history stays without
it, nothing else changes, other families get nothing, and a stale device cannot bring it back."""

import json
from pathlib import Path

from .scrub import scrub_events
from .test_developer import DevTestCase

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "scrub-fixture.json").read_text())
SECRETS = ["castle", "colour", "color", "island", "casle", "Week 3"]


class ScrubRulesTests(DevTestCase):
    def test_the_server_rules_match_the_apps_on_the_shared_fixture_and_are_idempotent(self):
        after, changed = scrub_events(FIXTURE["before"], FIXTURE["source"])
        self.assertEqual(after, FIXTURE["after"])
        self.assertEqual(changed, FIXTURE["changed"])
        self.assertEqual(scrub_events(after, FIXTURE["source"]), (after, 0))


class ScrubApiTests(DevTestCase):
    def record(self, c):
        pid = c.post("/api/pupils/", {"display_name": "Zoe", "consent": True}, format="json").json()["id"]
        for n, e in enumerate(FIXTURE["before"]):
            r = c.post(f"/api/pupils/{pid}/events/", {"subject": "english", "seq": n, "event": e}, format="json")
            self.assertEqual(r.status_code, 201, r.content)
        return pid

    def events(self, c, pid):
        return c.get(f"/api/pupils/{pid}/events/?subject=english").json()["events"]

    def test_deleting_removes_the_list_everywhere_in_the_record_and_keeps_everything_else(self):
        asha = self.parent("asha.scrub@example.org")
        zoe = self.record(asha)
        stranger = self.parent("stranger.scrub@example.org")
        # only the pupil's own parent can do it
        self.assertEqual(stranger.post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "list", "id": "list:3"}}, format="json").status_code, 404)
        self.assertEqual(asha.post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "bank", "id": "spelling-bee"}}, format="json").status_code, 400)
        r = asha.post(f"/api/pupils/{zoe}/events/scrub/", {"subject": "english", "source": {"type": "list", "id": "list:3"}}, format="json")
        self.assertEqual(r.json(), {"scrubbed": 7})
        stored = self.events(asha, zoe)
        self.assertEqual(stored, FIXTURE["after"], "exactly the app's rules: the other list and the Spelling Bee untouched")
        self.assertEqual(len(stored), len(FIXTURE["before"]), "no event added or removed: other devices stay in order")
        # not in the export, not for a developer looking at a shared pupil
        export = json.dumps(asha.get(f"/api/pupils/{zoe}/export/").json())
        dev = self.developer()
        asha.patch(f"/api/pupils/{zoe}/", {"shared_for_diagnostics": True}, format="json")
        diagnostics = json.dumps(dev.get(f"/api/developer/pupils/{zoe}/events/").json())
        for secret in SECRETS:
            self.assertNotIn(secret, json.dumps(stored))
            self.assertNotIn(secret, export)
            self.assertNotIn(secret, diagnostics)
        self.assertIn("because", json.dumps(stored), "the other list is kept for its parent")
        # doing it again changes nothing
        self.assertEqual(asha.post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "list", "id": "list:3"}}, format="json").json(), {"scrubbed": 0})

    def test_a_stale_device_cannot_bring_a_deleted_list_back(self):
        asha = self.parent("asha.stale@example.org")
        zoe = self.record(asha)  # the fixture's record already ends with the deletion of list:3
        asha.post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "list", "id": "list:3"}}, format="json")
        n = len(FIXTURE["before"])

        def post(event):
            return asha.post(f"/api/pupils/{zoe}/events/", {"subject": "english", "seq": n, "event": {"id": f"stale:{n}", "at": "2026-10-15T11:00:00Z", **event}}, format="json")

        answer = {"kind": "spell_answer", "session": "sp:13", "word": {"id": "castle", "text": "castle"}, "response": "castle", "correct": True, "plays": 1, "review": False}
        r = post({**answer, "source": {"type": "list", "id": "list:3"}})
        self.assertEqual(r.status_code, 409)
        self.assertIn("deleted on another device", r.json()["detail"])
        self.assertEqual(post({"kind": "word_list", "list": {"id": "list:3", "name": "Week 3", "words": [{"id": "castle", "word": "castle", "variants": []}]}}).status_code, 409)
        self.assertEqual(post({"kind": "spell_session", "session": "sp:20", "source": {"type": "list", "id": "list:3"}, "words": ["castle"], "delivery": "device_voice"}).status_code, 409)
        self.assertNotIn("castle", json.dumps(self.events(asha, zoe)))
        # practice on another list carries on as normal
        self.assertEqual(post({**answer, "source": {"type": "list", "id": "list:4"}, "word": {"id": "because", "text": "because"}, "response": "because"}).status_code, 201)


BOOK = json.loads((Path(__file__).parent / "fixtures" / "scrub-fixture-book.json").read_text())
BOOK_SECRETS = ["Lantern", "narrow house", "steep", "narow", "c:who:1:Mia", "s:narrow", "v:through", "371a85c4"]


class BookScrubTests(DevTestCase):
    def events(self, c, pid):
        return c.get(f"/api/pupils/{pid}/events/?subject=english").json()["events"]

    def test_the_server_rules_match_the_apps_for_a_book(self):
        after, changed = scrub_events(BOOK["before"], BOOK["source"])
        self.assertEqual(after, BOOK["after"])
        self.assertEqual(changed, BOOK["changed"])
        self.assertEqual(scrub_events(after, BOOK["source"]), (after, 0))

    def test_deleting_a_book_removes_its_text_and_approvals_keeps_answers_and_cannot_be_revived(self):
        asha = self.parent("asha.book@example.org")
        zoe = asha.post("/api/pupils/", {"display_name": "Zoe", "consent": True}, format="json").json()["id"]
        for n, e in enumerate(BOOK["before"]):
            self.assertEqual(asha.post(f"/api/pupils/{zoe}/events/", {"subject": "english", "seq": n, "event": e}, format="json").status_code, 201)
        self.assertEqual(self.parent("other.book@example.org").post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "book", "id": "book:2"}}, format="json").status_code, 404)
        self.assertEqual(asha.post(f"/api/pupils/{zoe}/events/scrub/", {"source": {"type": "book", "id": "book:2"}}, format="json").json(), {"scrubbed": 8})
        stored = self.events(asha, zoe)
        self.assertEqual(stored, BOOK["after"])
        export = json.dumps(asha.get(f"/api/pupils/{zoe}/export/").json())
        for secret in BOOK_SECRETS:
            self.assertNotIn(secret, json.dumps(stored))
            self.assertNotIn(secret, export)
        self.assertIn("colourful poster", json.dumps(stored), "the other book is kept")
        self.assertEqual([e["correct"] for e in stored if e["kind"] == "book_answer"], [True, False, True], "answers kept, right/wrong intact")
        # a stale device: no new version, review, answer or practice for the deleted book
        n = len(BOOK["before"])

        def post(event):
            return asha.post(f"/api/pupils/{zoe}/events/", {"subject": "english", "seq": n, "event": {"id": f"stale:{n}", "at": "2026-10-15T12:00:00Z", **event}}, format="json")

        self.assertEqual(post({"kind": "book", "book": {"id": "book:2", "title": "The Lantern", "text": "Mia lived in a narrow house."}}).status_code, 409)
        self.assertEqual(post({"kind": "book_review", "book": "book:2", "fingerprint": "x", "approved": ["s:narrow"]}).status_code, 409)
        self.assertEqual(post({"kind": "book_answer", "book": "book:2", "question": "c:who:1:Mia", "response": "Mia", "correct": True}).status_code, 409)
        self.assertEqual(post({"kind": "spell_answer", "session": "sp:7", "source": {"type": "book", "id": "book:2"}, "word": {"id": "narrow", "text": "narrow"}, "response": "narrow", "correct": True, "plays": 1, "review": False}).status_code, 409)
        self.assertEqual(post({"kind": "book_answer", "book": "book:9", "question": "v:colourful", "response": "colourful", "correct": True}).status_code, 201)
