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


@unittest.skipUnless(os.environ.get('M2_DIR'), 'run by frontend/scripts/m2-persistence.sh')
class MultiLearnerPersistence(FamilyTestCase):
    """Milestone 2: four learners, two sessions eight days apart. Session 1's records go into the store; a NEW client reads them back; a separate
    Node process rebuilds each learner ONLY from those records, finds the due review and takes it (session 2); its records go into the store; a third
    client reads everything back. The server's clock is set to each record's own time, so the stored dates are the learners' dates."""

    def post_all(self, client, pupil, events, seq0):
        from unittest import mock
        from django.utils import timezone as tz
        import datetime
        for i, e in enumerate(events):
            at = datetime.datetime.fromisoformat(e['at'].replace('Z', '+00:00'))
            with mock.patch('family.learning.timezone.now', return_value=at):
                r = self.append(client, pupil, seq0 + i, {**e, 'learnerId': pupil, 'sessionId': e['sessionId'] if e['sessionId'].startswith(f'learn:{pupil}:') else f'learn:{pupil}:s1'}, subject='mathematics')
            self.assertEqual(r.status_code, 201, (i, e.get('record'), r.content))
        return seq0 + len(events)

    def read(self, pupil):
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/account/login/', {'email': 'asha.parent@example.org', 'password': PASSWORD}, format='json').status_code, 200)
        return fresh.get(f'/api/pupils/{pupil}/events/?subject=mathematics').json()['events']

    def test_four_learners_two_sessions(self):
        import subprocess
        d = Path(os.environ['M2_DIR'])
        s1 = json.loads((d / 'session1.json').read_text())
        parent = self.parent()
        pupils, seqs, stored = {}, {}, {}
        for lid, run in s1.items():
            pupils[lid] = self.pupil(parent, f'Synthetic M2 {lid}')
            seqs[lid] = self.post_all(parent, pupils[lid], run['events'], 0)
            stored[lid] = {'pupil': pupils[lid], 'events': self.read(pupils[lid])}
            self.assertEqual(len(stored[lid]['events']), len(run['events']))
        (d / 'stored-1.json').write_text(json.dumps(stored))
        # a record sent twice is refused (the store does not duplicate history)
        dup = {**s1['2a']['events'][0], 'learnerId': pupils['2a'], 'sessionId': f"learn:{pupils['2a']}:s1"}
        self.assertNotEqual(self.append(parent, pupils['2a'], seqs['2a'], dup, subject='mathematics').status_code, 201)
        # repeated reads are identical
        self.assertEqual(self.read(pupils['2a']), self.read(pupils['2a']))
        # session 2, eight days later: a separate process, from the stored records only
        front = Path(__file__).resolve().parents[2] / 'frontend'
        p = subprocess.run(['node', '--import', 'tsx', 'scripts/m2-persistence.mts', 'act', str(d), '8'], cwd=front, capture_output=True, text=True, timeout=900)
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])
        s2 = json.loads((d / 'session2.json').read_text())
        final = {}
        for lid in s1:
            self.post_all(parent, pupils[lid], s2[lid]['added'], seqs[lid])
            final[lid] = {'pupil': pupils[lid], 'events': self.read(pupils[lid])}
        (d / 'stored-final.json').write_text(json.dumps(final))
