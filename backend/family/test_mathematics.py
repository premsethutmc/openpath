"""Math ownership, atomic append and server-timed retention through existing accounts."""
from datetime import timedelta
from unittest import mock
from django.utils import timezone
from rest_framework.test import APIClient
from .tests import FamilyTestCase
from .mathematics import lesson
from .models import PupilEvent

class MathematicsAccountTests(FamilyTestCase):

    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic fractions learner'))
        self.seq = 0
        self.serial = 0

    def activity(self, action='complete', stage='concept', **extra):
        self.serial += 1
        return {'kind': 'math_activity', 'id': f'math-{self.serial}', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'math:{self.pupil_id}:test-visit', 'journey': 'school', 'lessonVersion': '2.0.0', 'action': action, 'stage': stage, 'elapsedMs': 20, **extra}

    def save(self, event):
        r = self.append(self.client, self.pupil_id, self.seq, event, subject='mathematics')
        if r.status_code == 201:
            self.seq += 1
        return r

    def record(self):
        return self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']

    def core(self):
        for stage in lesson()['stages'][:6]:
            for qid in stage['questions']:
                answer = next((q['answer'] for q in lesson()['questions'] if q['id'] == qid))
                self.assertEqual(self.save(self.activity('answer', stage['id'], questionId=qid, response=answer)).status_code, 201)
            self.assertEqual(self.save(self.activity('complete', stage['id'])).status_code, 201)

    def test_authenticated_same_pupil_and_parent_isolation(self):
        url = f'/api/pupils/{self.pupil_id}/events/?subject=mathematics'
        self.assertEqual(APIClient().get(url).status_code, 403)
        other = self.parent('other.math@example.org')
        self.assertEqual(other.get(url).status_code, 404)
        self.assertEqual(self.save(self.activity()).status_code, 201)
        self.assertEqual(len(self.record()), 1)
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/events/').json()['events'], [])
        self.assertEqual(other.post(f'/api/pupils/{self.pupil_id}/events/', {'subject': 'mathematics', 'seq': 1, 'event': self.activity()}, format='json').status_code, 404)

    def test_arbitrary_evidence_or_eligibility_cannot_be_imported(self):
        for bad in [self.activity(admissible=True), self.activity(retentionDueAt='2000-01-01T00:00:00Z'), self.activity(learnerId='other'), self.activity(kind='evidence'), self.activity(lessonVersion='future'), self.activity(elapsedMs=-1), self.activity(journey='unknown')]:
            self.assertEqual(self.save(bad).status_code, 400)
        self.assertEqual(len(self.record()), 0)
        self.assertEqual(self.client.put(f'/api/pupils/{self.pupil_id}/events/', {'subject': 'mathematics', 'events': [self.activity()]}, format='json').status_code, 400)

    def test_conflicts_duplicate_receipts_and_stage_order(self):
        self.assertEqual(self.save(self.activity(stage='worked')).status_code, 400)
        event = self.activity()
        self.assertEqual(self.save(event).status_code, 201)
        self.assertEqual(self.save(event).status_code, 400)
        self.assertEqual(self.append(self.client, self.pupil_id, 0, self.activity(), subject='mathematics').status_code, 409)
        self.assertEqual(self.save(self.activity('answer', 'concept', questionId='guided-1', response='2')).status_code, 400)
        self.assertEqual(PupilEvent.objects.filter(subject='mathematics').count(), 1)

    def test_undefined_or_unsupported_answers_rejected(self):
        for response in ['1/0', 'x', '1e5', '', 'NaN', '௨', '٢']:
            self.assertEqual(self.save(self.activity('answer', 'guided', questionId='guided-1', response=response)).status_code, 400)
        self.assertEqual(self.save(self.activity('answer', 'guided', questionId='guided-1', response='2.0')).status_code, 201)

    def test_server_clock_delayed_retention_and_separate_journeys(self):
        now = timezone.now()
        with mock.patch('family.mathematics.timezone.now', return_value=now):
            self.core()
            first = self.record()
            self.assertEqual(timezone.datetime.fromisoformat(first[-1]['retentionDueAt']), now + timedelta(days=1))
            self.assertNotEqual(first[0]['at'], '2000-01-01T00:00:00Z')
            self.assertEqual(self.save(self.activity('answer', 'retention', questionId='retention-1', response='12')).status_code, 400)
            self.assertEqual(self.save(self.activity('complete', 'retention')).status_code, 400)
            self.assertEqual(self.save(self.activity(journey='gre-quant')).status_code, 201)
            self.assertEqual(len([e for e in self.record() if e['action'] == 'complete' and e['journey'] == 'school']), 6)
        with mock.patch('family.mathematics.timezone.now', return_value=now + timedelta(days=1, seconds=1)):
            for q in ['retention-1', 'retention-2']:
                answer = next((qn['answer'] for qn in lesson()['questions'] if qn['id'] == q))
                self.assertEqual(self.save(self.activity('answer', 'retention', questionId=q, response=answer)).status_code, 201)
            self.assertEqual(self.save(self.activity('complete', 'retention')).status_code, 201)
            self.assertEqual(len([e for e in self.record() if e['action'] == 'complete' and e['journey'] == 'school']), 7)
            self.assertEqual(len([e for e in self.record() if e['action'] == 'complete' and e['journey'] == 'gre-quant']), 1)


class CrossSubjectIdentityTests(FamilyTestCase):
    """English and mathematics: one account, one pupil identity, one event store, separate ordered subject records."""

    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic cross-subject learner'))
        self.seq = 0
        self.serial = 0

    activity = MathematicsAccountTests.activity
    save = MathematicsAccountTests.save
    record = MathematicsAccountTests.record

    def test_one_pupil_both_subjects_survive_logout_and_login(self):
        from .tests import PASSWORD, event
        # English: the existing record, unchanged protocol
        for n in range(3):
            self.assertEqual(self.append(self.client, self.pupil_id, n, event(n)).status_code, 201)
        # Mathematics: the same pupil, its own ordered subject record
        self.assertEqual(self.save(self.activity()).status_code, 201)
        english = self.client.get(f'/api/pupils/{self.pupil_id}/events/').json()['events']
        maths = self.record()
        self.assertEqual(english, [event(n) for n in range(3)])
        self.assertEqual([e['kind'] for e in maths], ['math_activity'])
        # sign out: nothing is readable; sign in again: both records are exactly as they were, for the same pupil
        self.client.post('/api/account/logout/', {}, format='json')
        self.assertIn(self.client.get(f'/api/pupils/{self.pupil_id}/events/').status_code, (401, 403))
        r = self.client.post('/api/account/login/', {'email': 'asha.parent@example.org', 'password': PASSWORD}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/events/').json()['events'], english)
        self.assertEqual(self.record(), maths)
        # one export holds both subjects of the one pupil; the mathematics append keeps the English sequence untouched
        out = self.client.get(f'/api/pupils/{self.pupil_id}/export/').json()
        self.assertEqual(out['subjects']['english'], english)
        self.assertEqual(out['subjects']['mathematics'], maths)
        self.assertEqual(self.append(self.client, self.pupil_id, 3, event(3)).status_code, 201)
        self.assertEqual(PupilEvent.objects.filter(pupil_id=self.pupil_id).values('pupil_id').distinct().count(), 1)
