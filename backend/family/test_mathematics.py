"""Math ownership, atomic append and server-timed retention through existing accounts."""
from datetime import timedelta
from unittest import mock
from django.utils import timezone
from rest_framework.test import APIClient
from .tests import FamilyTestCase
from .mathematics import lesson, program
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


class JeeChapterTests(FamilyTestCase):
    """The JEE Main Quadratic Equations chapter: its own fixed program in the same mathematics record."""

    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic JEE learner'))
        self.seq = 0
        self.serial = 0

    def activity(self, action='complete', stage='class', **extra):
        self.serial += 1
        return {'kind': 'math_activity', 'program': 'jee-quadratics', 'id': f'jee-{self.serial}', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'math:{self.pupil_id}:jee-visit', 'journey': 'jee-main', 'lessonVersion': program('jee-quadratics')['version'], 'action': action, 'stage': stage, 'elapsedMs': 20, **extra}

    save = MathematicsAccountTests.save
    record = MathematicsAccountTests.record

    def test_formats_order_timed_and_revision(self):
        from .mathematics import program
        spec = program('jee-quadratics')
        self.assertEqual(self.save(self.activity(journey='school')).status_code, 400, 'the chapter belongs to the JEE Main track')
        self.assertEqual(self.save(self.activity(stage='worked')).status_code, 400, 'steps in order')
        self.assertEqual(self.save(self.activity('complete', 'class')).status_code, 400, 'each lesson check first')
        for qid in spec['stages'][0]['questions']:
            q = next(x for x in spec['questions'] if x['id'] == qid)
            self.assertEqual(self.save(self.activity('answer', 'class', questionId=qid, response=q['answer'])).status_code, 201)
        for stage in ['class', 'worked']:
            self.assertEqual(self.save(self.activity(stage=stage)).status_code, 201)
        self.assertEqual(self.save(self.activity('answer', 'practice', questionId='p1', response='1/2')).status_code, 400, 'numerical value: an integer')
        self.assertEqual(self.save(self.activity('answer', 'practice', questionId='p2', response='E')).status_code, 400, 'a choice: A to D')
        self.assertEqual(self.save(self.activity('complete', 'practice')).status_code, 400, 'each practice question first')
        for stage in ['practice', 'check']:
            for qid in next(s for s in spec['stages'] if s['id'] == stage)['questions']:
                q = next(x for x in spec['questions'] if x['id'] == qid)
                self.assertEqual(self.save(self.activity('answer', stage, questionId=qid, response=q['answer'])).status_code, 201)
            self.assertEqual(self.save(self.activity('complete', stage)).status_code, 201)
        now = timezone.now()
        with mock.patch('family.mathematics.timezone.now', return_value=now):
            self.assertEqual(self.save(self.activity('open', 'timed')).status_code, 201)
            self.assertEqual(self.save(self.activity('answer', 'timed', questionId='t1', response='C')).status_code, 201)
            # the timed section may end with questions unanswered (they score 0)
            self.assertEqual(self.save(self.activity('complete', 'timed')).status_code, 201)
            due = timezone.datetime.fromisoformat(self.record()[-1]['retentionDueAt'])
            self.assertEqual(due, now + timedelta(days=7))
            self.assertEqual(self.save(self.activity('answer', 'revision', questionId='r1', response='29')).status_code, 400, 'not before a week')
        with mock.patch('family.mathematics.timezone.now', return_value=now + timedelta(days=7, seconds=1)):
            self.assertEqual(self.save(self.activity('answer', 'revision', questionId='r1', response='29')).status_code, 201)
            self.assertEqual(self.save(self.activity('answer', 'revision', questionId='r2', response='B')).status_code, 201)
            self.assertEqual(self.save(self.activity('complete', 'revision')).status_code, 201)

    def test_programs_keep_their_own_sequences_in_one_record(self):
        fractions = MathematicsAccountTests.activity(self, 'complete', 'concept')
        self.assertEqual(self.save(fractions).status_code, 201, 'the fractions program, as before')
        self.assertEqual(self.save(self.activity('open')).status_code, 201, 'the chapter starts at its own first step')
        self.assertEqual(self.save(self.activity(program='unknown')).status_code, 400)
        self.assertEqual(len(self.record()), 2)


class CompletingSquareUnitTests(FamilyTestCase):
    """The Completing the square reference unit: its own fixed program, new answer formats and extra practice."""

    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic unit learner'))
        self.seq = 0
        self.serial = 0
        self.spec = program('completing-the-square')

    def activity(self, action='complete', stage='prereq', **extra):
        self.serial += 1
        return {'kind': 'math_activity', 'program': 'completing-the-square', 'id': f'cts-{self.serial}', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'math:{self.pupil_id}:cts-visit', 'journey': 'jee-main', 'lessonVersion': self.spec['version'], 'action': action, 'stage': stage, 'elapsedMs': 20, **extra}

    save = MathematicsAccountTests.save
    record = MathematicsAccountTests.record

    def stage(self, stage_id):
        return next(s for s in self.spec['stages'] if s['id'] == stage_id)

    def answer_all(self, stage_id):
        for qid in self.stage(stage_id)['questions']:
            q = next(x for x in self.spec['questions'] if x['id'] == qid)
            self.assertEqual(self.save(self.activity('answer', stage_id, questionId=qid, response=q['answer'])).status_code, 201, qid)

    def test_formats_extra_practice_order_and_revision(self):
        self.assertEqual(self.save(self.activity(stage='picture')).status_code, 400, 'steps in order')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='d2', response='1')).status_code, 400, 'two values for two fields')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='d2', response='1,x')).status_code, 400, 'numbers only')
        self.assertEqual(self.save(self.activity('answer', 'picture', questionId='e4', response='25/0')).status_code, 400, 'a nonzero denominator')
        self.assertEqual(self.save(self.activity('answer', 'picture', questionId='e4', response='2.5')).status_code, 400, 'a fraction, not a decimal')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='es1', response='36')).status_code, 400, "another step's extra practice")
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='d2', response='1, −9')).status_code, 201, 'either order, the minus sign accepted')
        self.assertEqual(self.save(self.activity('complete', 'prereq')).status_code, 400, 'each prediction and check first')
        self.answer_all('prereq')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='ds1', response='49')).status_code, 201, "the step's own extra practice")
        self.assertEqual(self.save(self.activity('complete', 'prereq')).status_code, 201, 'extra practice is never needed to finish')
        for stage_id in ['picture', 'worked', 'formula', 'guided', 'independent', 'apply']:
            self.answer_all(stage_id)
            self.assertEqual(self.save(self.activity('complete', stage_id)).status_code, 201, stage_id)
        self.answer_all('transfer')
        now = timezone.now()
        with mock.patch('family.mathematics.timezone.now', return_value=now):
            self.assertEqual(self.save(self.activity('complete', 'transfer')).status_code, 201)
            due = timezone.datetime.fromisoformat(self.record()[-1]['retentionDueAt'])
            self.assertEqual(due, now + timedelta(days=7))
            self.assertEqual(self.save(self.activity('answer', 'retention', questionId='r1', response='4,8')).status_code, 400, 'not before a week')
        with mock.patch('family.mathematics.timezone.now', return_value=now + timedelta(days=7, seconds=1)):
            self.answer_all('retention')
            self.assertEqual(self.save(self.activity('complete', 'retention')).status_code, 201)

    def test_the_unit_and_the_chapter_keep_their_own_sequences(self):
        chapter = {'kind': 'math_activity', 'program': 'jee-quadratics', 'id': 'jee-1', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'math:{self.pupil_id}:jee', 'journey': 'jee-main', 'lessonVersion': program('jee-quadratics')['version'], 'action': 'open', 'stage': 'class', 'elapsedMs': 1}
        self.assertEqual(self.save(chapter).status_code, 201)
        self.assertEqual(self.save(self.activity('open')).status_code, 201, 'the unit starts at its own first step')
        self.assertEqual(self.save(self.activity('open', journey='school')).status_code, 400, 'the unit belongs to the JEE Main track')
        self.assertEqual(len(self.record()), 2)


class CompletingSquareHelpTests(FamilyTestCase):
    """The reference unit's help branch (v1.1.0): teaching blocks, set-aside help and help questions."""

    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic help learner'))
        self.seq = 0
        self.serial = 0
        self.spec = program('completing-the-square')

    activity = CompletingSquareUnitTests.activity
    save = MathematicsAccountTests.save
    record = MathematicsAccountTests.record

    def test_teach_skip_and_help_questions(self):
        self.assertEqual(self.save(self.activity('teach', 'prereq', response='expand:area_model')).status_code, 201, 'a teaching block')
        self.assertEqual(self.save(self.activity('teach', 'prereq', response='expand:invented')).status_code, 400, 'unknown strategy')
        self.assertEqual(self.save(self.activity('teach', 'prereq')).status_code, 400, 'which block')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='px1', response='4,4')).status_code, 201, 'a help question, in the step the learner is in')
        self.assertEqual(self.save(self.activity('answer', 'prereq', questionId='px1', response='4')).status_code, 400, 'its format is checked')
        self.assertEqual(self.save(self.activity('skip', 'prereq', response='roots')).status_code, 201, 'help set aside')
        self.assertEqual(self.save(self.activity('skip', 'prereq', response='transfer:t1')).status_code, 201)
        self.assertEqual(self.save(self.activity('skip', 'prereq', response='nothing')).status_code, 400)
        self.assertEqual(self.save(self.activity('complete', 'prereq')).status_code, 400, 'help questions never finish a step')
        self.assertEqual(self.save(self.activity('answer', 'retention', questionId='prc1', response='3,7')).status_code, 201, 'help is not the revision: no date rule')
        self.assertEqual(self.save(self.activity('answer', 'retention', questionId='r1', response='4,8')).status_code, 400, 'the revision itself still waits')
        old = self.activity('open', 'prereq')
        old['lessonVersion'] = '1.0.0'
        self.assertEqual(self.save(old).status_code, 400, 'new records use the current version; 1.0.0 records already saved still replay')

    def test_other_programs_have_no_help_branch(self):
        chapter = {'kind': 'math_activity', 'program': 'jee-quadratics', 'id': 'jee-h', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'math:{self.pupil_id}:jee', 'journey': 'jee-main', 'lessonVersion': program('jee-quadratics')['version'], 'action': 'skip', 'stage': 'class', 'elapsedMs': 1, 'response': 'expand'}
        self.assertEqual(self.save(chapter).status_code, 400)
