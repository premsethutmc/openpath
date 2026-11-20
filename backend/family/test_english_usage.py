from datetime import datetime, timedelta, timezone as tz

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from io import StringIO

from family.english_usage import usage
from family.models import Pupil, PupilEvent


class EnglishUsageTests(TestCase):
    def test_counts_by_activity_without_names_or_text(self):
        user = get_user_model().objects.create_user(username="p@example.com", email="p@example.com", password="x-long-password")
        pupil = Pupil.objects.create(parent=user, display_name="Secretname", consent_policy="guardian")
        now = datetime(2026, 11, 20, 10, 0, tzinfo=tz.utc)
        seq = iter(range(1, 100))

        def add(kind, at, **body):
            PupilEvent.objects.create(pupil=pupil, subject="english", seq=next(seq), kind=kind, occurred_at=at, body={"kind": kind, **body})

        t = now - timedelta(days=1)
        add("dictation", t, record={"type": "start", "sitting": "d1", "level": 2})
        add("dictation", t + timedelta(minutes=1), record={"type": "answer", "sitting": "d1", "perfectFirst": True, "typed": "The cat sat."})
        add("dictation", t + timedelta(minutes=2), record={"type": "answer", "sitting": "d1", "perfectFirst": False, "typed": "the dog"})
        add("dictation", t + timedelta(minutes=4), record={"type": "end", "sitting": "d1", "asked": 2, "perfectFirst": 1})
        add("grammar_use", t, record={"type": "start", "sitting": "g1", "level": 3})
        add("spell_session", t, session="sp:1")
        add("spell_answer", t + timedelta(minutes=1), session="sp:1", correct=True, response="garden")
        add("spell_end", t + timedelta(minutes=2), session="sp:1", reason="finished")
        add("dictation", now - timedelta(days=40), record={"type": "start", "sitting": "old", "level": 1})
        u = usage(30, now=now)
        rows = {a["activity"]: a for a in u["activities"]}
        d = rows["Listen and write"]
        self.assertEqual([d["children"], d["started"], d["finished"], d["answers"], d["right_pct"], d["median_minutes"]], [1, 1, 1, 2, 50, 4.0])
        g = rows["Grammar"]
        self.assertEqual([g["started"], g["finished"]], [1, 0], "a sitting started and not finished shows as such")
        s = rows["Spelling"]
        self.assertEqual([s["started"], s["finished"], s["right_pct"]], [1, 1, 100])
        self.assertEqual([u["children_active"], u["children_active_last_7_days"]], [1, 1])
        out = StringIO()
        call_command("english_usage", stdout=out)
        text = out.getvalue()
        for private in ("Secretname", "garden", "The cat sat", "p@example.com"):
            self.assertNotIn(private, text)
        self.assertIn("Listen and write | 1 | 1 | 1 | 1 | 2 | 50 | 4.0", text)
