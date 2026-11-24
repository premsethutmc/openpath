from datetime import datetime, timedelta, timezone as tz

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from family.models import DiagnosticAccessLog, Pupil, PupilEvent
from family.placements import log_lines, placements

NOW = datetime.now(tz.utc)  # the page reads the last sixty days from the real clock


def sit(pupil, start=1):
    """A word check (three answers, level 3) and a spelling part of Find my level."""
    seq = iter(range(start, start + 50))
    t = NOW - timedelta(hours=2)

    def add(kind, minute, record):
        PupilEvent.objects.create(pupil=pupil, subject="english", seq=next(seq), kind=kind, occurred_at=t + timedelta(minutes=minute), body={"kind": kind, "record": record})

    add("vocab", 0, {"type": "start", "check": "6", "band": 4})
    add("vocab", 1, {"type": "answer", "check": "6", "word": "glad", "band": 1, "outcome": "yes", "kind": "know"})
    add("vocab", 2, {"type": "answer", "check": "6", "word": "blenfor", "band": 0, "outcome": "no", "kind": "know"})
    add("vocab", 3, {"type": "answer", "check": "6", "word": "abhor", "band": 6, "outcome": "wrong", "kind": "pick"})
    add("vocab", 4, {"type": "result", "check": "6", "band": 3, "answered": 3, "low": 2, "high": 4})
    add("level_check", 5, {"type": "start", "mode": "full"})
    add("level_check", 6, {"type": "spelling", "level": 2, "check": 2, "steps": [{"word": "bridge", "level": 2, "correct": True, "typed": "bridge"}, {"word": "rhythm", "level": 4, "correct": False, "typed": "rithm"}]})
    add("level_check", 7, {"type": "reading", "passed": 2, "check": 2, "steps": [{"level": 2, "right": 5, "asked": 6}]})
    add("level_check", 8, {"type": "done"})


class PlacementsTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.parent = U.objects.create_user(username="p@example.com", email="p@example.com", password="x-long-password")
        self.other = U.objects.create_user(username="o@example.com", email="o@example.com", password="x-long-password")
        self.owner = U.objects.create_user(username="owner@example.com", email="owner@example.com", password="x-long-password")
        self.mine = Pupil.objects.create(parent=self.parent, display_name="Friendname", consent_policy="guardian")
        self.theirs = Pupil.objects.create(parent=self.other, display_name="Secretname", consent_policy="guardian")
        sit(self.mine)
        sit(self.theirs)

    def test_an_account_sees_its_own_learners_with_the_words_asked(self):
        d = placements(self.parent, now=NOW)
        self.assertEqual([x["learner"] for x in d["placements"]], ["Friendname"])
        words, spelling, reading = d["placements"][0]["sittings"]
        self.assertEqual([words["part"], words["start"], words["level"], words["low"], words["high"]], ["words", 4, 3, 2, 4])
        self.assertEqual(words["answers"], [
            {"level": 1, "kind": "know", "outcome": "yes", "asked": "glad"},
            {"level": 0, "kind": "know", "outcome": "no", "asked": "blenfor"},
            {"level": 6, "kind": "pick", "outcome": "wrong", "asked": "abhor"},
        ])
        self.assertEqual([spelling["part"], spelling["level"], spelling["mode"]], ["spelling", 2, "full"])
        self.assertEqual(spelling["answers"], [{"level": 2, "right": True, "asked": "bridge"}, {"level": 4, "right": False, "asked": "rhythm"}])
        self.assertEqual([reading["level"], reading["answers"]], [2, [{"level": 2, "right": 5, "asked": 6}]])
        self.assertNotIn("rithm", str(d), "nothing a learner typed is included")
        self.assertNotIn("Secretname", str(d))

    @override_settings(OWNER_EMAILS={"owner@example.com"})
    def test_the_owner_sees_other_learners_without_names_or_words(self):
        d = placements(self.owner, now=NOW)
        self.assertEqual(sorted(x["learner"] for x in d["placements"]), ["Learner 1", "Learner 2"])
        text = str(d)
        for hidden in ["Secretname", "Friendname", "glad", "abhor", "bridge", "rithm"]:
            self.assertNotIn(hidden, text)
        words = d["placements"][0]["sittings"][0]
        self.assertEqual(words["answers"][2], {"level": 6, "kind": "pick", "outcome": "wrong"})
        # a learner a parent shared for diagnostics is shown in full
        self.theirs.shared_for_diagnostics = True
        self.theirs.save()
        shared = [x for x in placements(self.owner, now=NOW)["placements"] if x["shared"]]
        self.assertEqual([shared[0]["learner"], shared[0]["sittings"][0]["answers"][0]["asked"]], ["Secretname", "glad"])

    @override_settings(OWNER_EMAILS={"owner@example.com"})
    def test_the_page_needs_an_account_and_an_owner_read_is_logged(self):
        self.assertIn(APIClient().get("/api/placements/").status_code, (401, 403))
        c = APIClient()
        c.force_authenticate(self.parent)
        r = c.get("/api/placements/")
        self.assertEqual([r.status_code, r.json()["everyone"], len(r.json()["placements"])], [200, False, 1])
        self.assertEqual(DiagnosticAccessLog.objects.count(), 0)
        c.force_authenticate(self.owner)
        self.assertEqual(len(c.get("/api/placements/").json()["placements"]), 2)
        self.assertEqual(DiagnosticAccessLog.objects.filter(action="placements").count(), 1)

    def test_old_sittings_are_left_out(self):
        self.assertEqual(placements(self.parent, days=60, now=NOW + timedelta(days=90))["placements"], [])

    @override_settings(OWNER_EMAILS={"p@example.com"})
    def test_the_server_log_has_no_names_and_words_only_for_the_owners_own_learners(self):
        from io import StringIO
        from django.core.management import call_command

        lines = log_lines(now=NOW)
        text = "\n".join(lines)
        self.assertTrue(all(line.startswith("placements@1 |") for line in lines))
        for hidden in ["Friendname", "Secretname", "rithm", "example.com"]:
            self.assertNotIn(hidden, text)
        self.assertIn("Learner 1 (owner account)", text)
        self.assertIn("Word check", text)
        self.assertRegex(text, r"level 3 \(2-4\) start 4 answers 3 invented-claimed 0/1 \| L1 Y L6 n")
        self.assertIn("glad(1)said-knows blenfor(inv)said-not abhor(6)wrong", text)
        self.assertRegex(text, r"Reading \S+ level 2 answers 1 \| L2 5/6")
        other = text.split("Learner 2")[1]
        self.assertNotIn("glad", other)
        self.assertIn("L1 Y L6 n", other)
        out = StringIO()
        call_command("placements_log", stdout=out)
        self.assertIn("Learner 1 (owner account)", out.getvalue())
