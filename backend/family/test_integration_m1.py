"""Integration M1 boundary: the Django server's grader (the real Node bundle) decides the slice question exactly as the in-page slice's
gradeRequest does (frontend/src/journey/slice.test.ts asserts the same pairs). No scripted outcomes: real Node, real bundle."""
import json
import os
import unittest
from pathlib import Path

from rest_framework.test import APIClient

from . import kernel_grader as kg
from .tests import PASSWORD, FamilyTestCase

Q = 'gen:lin:2,17,11'  # Solve 2x + 17 = 39. What is x?  ->  11


@unittest.skipUnless(kg.enabled(), 'needs Node and the grader bundle')
class SliceBoundary(unittest.TestCase):
    def test_modelled_wrong_answer_is_incorrect_with_a_server_decision(self):
        d = kg.grader_decision(Q, '22', '11')
        self.assertEqual((d['credit'], d['verdict']), (False, 'incorrect'))
        self.assertEqual(d['decision']['schema'], 'grading-decision@1')

    def test_right_answer_is_correct(self):
        d = kg.grader_decision(Q, '11', '11')
        self.assertEqual((d['credit'], d['verdict']), (True, 'correct'))

    def test_a_mismatched_stored_answer_is_not_decided(self):
        self.assertIsNone(kg.grader_decision(Q, '11', '12'))

    def test_the_bundle_is_the_recorded_one(self):
        self.assertTrue(kg.bundle_intact())


@unittest.skipUnless(os.environ.get('M1_EVENTS') and os.environ.get('M1_STORED'), 'run by frontend/scripts/m1-persistence.sh')
class PersistenceRoundTrip(FamilyTestCase):
    """The slice's real record events -> this server's event store (checked_learning re-decides every attempt with the trusted grader) ->
    a NEW client that logs in again reads them back. Nothing is in memory between the two requests but the database."""

    def test_round_trip(self):
        events = json.loads(Path(os.environ['M1_EVENTS']).read_text())
        parent = self.parent()
        pupil = self.pupil(parent, 'Synthetic slice pupil')
        for seq, e in enumerate(events):
            e = {**e, 'learnerId': pupil, 'sessionId': f'learn:{pupil}:slice', 'at': '2000-01-01T00:00:00Z'}
            r = self.append(parent, pupil, seq, e, subject='mathematics')
            self.assertEqual(r.status_code, 201, (seq, e.get('record'), r.content))
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/account/login/', {'email': 'asha.parent@example.org', 'password': PASSWORD}, format='json').status_code, 200)
        got = fresh.get(f'/api/pupils/{pupil}/events/?subject=mathematics').json()
        self.assertEqual(len(got['events']), len(events))
        Path(os.environ['M1_STORED']).write_text(json.dumps({'learnerId': pupil, **got}))
