"""My Learning Year records: ownership, references, server clock, delayed checks, coexistence. Synthetic pupils only."""
import json
import os
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from .learning import content, hash_of
from .tests import PASSWORD, FamilyTestCase

ROOT = Path(settings.BASE_DIR).parent / 'content/learning'
G4 = json.loads((ROOT / 'curricula/openpath-sample-mathematics-grade-4.v1.0.0.json').read_text())


class LearningBase(FamilyTestCase):
    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic learning-year pupil'))
        self.seq = 0
        self.serial = 0

    def rec(self, record, **extra):
        self.serial += 1
        return {'kind': 'learning_record', 'id': f'lr-{self.serial}', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'learn:{self.pupil_id}:visit', 'record': record, **extra}

    def save(self, event):
        r = self.append(self.client, self.pupil_id, self.seq, event, subject='mathematics')
        if r.status_code == 201:
            self.seq += 1
        return r

    def records(self, client=None):
        return (client or self.client).get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']

    def enrol(self, grade=4, release=G4):
        return self.rec('enrol', grade=grade, academicYear='2026-27', curriculum={'id': release['id'], 'version': release['version'], 'hash': release['hash']})

    def attempt(self, qid, response, activity='diagnostic', **extra):
        q = content()['questions'][qid]
        return self.rec('attempt', questionId=qid, response=response, activity=activity, hints=0, solution=False, competency=q['competency'], **extra)


class LearningRecordTests(LearningBase):
    def test_the_server_hash_matches_the_app_for_every_sample_release(self):
        for f in (ROOT / 'curricula').glob('openpath-*.json'):
            r = json.loads(f.read_text())
            self.assertEqual(hash_of({**r, 'hash': ''}), r['hash'], f.name)

    def test_enrol_goal_attempt_and_teach_are_saved_with_the_server_time(self):
        now = timezone.now()
        with mock.patch('family.learning.timezone.now', return_value=now):
            self.assertEqual(self.save(self.enrol()).status_code, 201)
            self.assertEqual(self.save(self.rec('goal', pathway='jee-advanced', active=True)).status_code, 201)
            r = self.save(self.attempt('eq-d1', '2'))
            self.assertEqual(r.status_code, 201)
            self.assertEqual(r.json()['at'], now.isoformat().replace('+00:00', 'Z'), 'the app is told the saved time')
            self.assertEqual(self.save(self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='strip_model', rule='conceptual')).status_code, 201)
        saved = self.records()
        self.assertEqual(len(saved), 4)
        self.assertTrue(all(e['at'] != '2000-01-01T00:00:00Z' for e in saved), 'never the client clock')

    def test_ownership_unknown_fields_and_claimed_status_are_refused(self):
        bad = [
            self.enrol() | {'learnerId': 'someone-else'},
            self.enrol() | {'sessionId': 'learn:other:visit'},
            self.enrol() | {'verified': True},
            self.attempt('eq-d1', '2') | {'status': 'verified'},
            self.attempt('eq-d1', '2') | {'mastery': 1},
            self.rec('goal', pathway='invented-exam', active=True),
            self.rec('attempt', questionId='invented', response='1', activity='practice', hints=0, solution=False, competency='MATH.number.equivalent-fractions'),
            self.attempt('eq-d1', '2') | {'competency': 'MATH.calculus.area-integrals'},
            self.attempt('eq-d1', '2', activity='graded'),
            self.attempt('eq-d1', '2') | {'hints': -1},
            self.attempt('eq-d1', 'x' * 81),
            self.attempt('eq-d1', 'two'),
            self.attempt('eq-p2', 'E'),
            self.attempt('fa-d1', '5/0'),
            self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='invented', rule='x'),
            self.enrol(grade=13),
            self.rec('enrol', grade=4, academicYear='2026-27', curriculum={'id': G4['id'], 'version': G4['version'], 'hash': '00000000'}),
        ]
        for e in bad:
            self.assertEqual(self.save(e).status_code, 400, e)
        self.assertEqual(self.records(), [])

    def test_answers_in_each_form(self):
        self.save(self.enrol())
        for qid, response in [('eq-p2', 'b'), ('fa-d1', '10/16'), ('qd-c1', '3, −2'), ('mt-d1', '54'), ('area-parabola-line.full', '9/2')]:
            self.assertEqual(self.save(self.attempt(qid, response)).status_code, 201, qid)

    def test_a_reviewed_textbook_release_is_kept_and_referenced_by_hash(self):
        own = {**G4, 'id': 'my-school-grade-4', 'title': 'My school Grade 4'}
        own['hash'] = hash_of({**own, 'hash': ''})
        self.assertEqual(self.save(self.enrol(release=own)).status_code, 400, 'not before the release is saved')
        self.assertEqual(self.save(self.rec('curriculum', release=own)).status_code, 201)
        self.assertEqual(self.save(self.enrol(release=own)).status_code, 201)
        tampered = {**own, 'title': 'changed'}
        self.assertEqual(self.save(self.rec('curriculum', release=tampered)).status_code, 400, 'content must match its hash')
        claims = {**own, 'review': {**own['review'], 'educatorReviewed': True}}
        claims['hash'] = hash_of({**claims, 'hash': ''})
        self.assertEqual(self.save(self.rec('curriculum', release=claims)).status_code, 400, 'no educator review from the app')
        draft = {**own, 'status': 'draft'}
        draft['hash'] = hash_of({**draft, 'hash': ''})
        self.assertEqual(self.save(self.rec('curriculum', release=draft)).status_code, 400, 'a draft is never assigned')
        unknown = json.loads(json.dumps(own))
        unknown['subjects'][0]['chapters'][0]['outcomes'][0]['mapping']['competencies'][0]['id'] = 'MATH.invented'
        unknown['hash'] = hash_of({**unknown, 'hash': ''})
        self.assertEqual(self.save(self.rec('curriculum', release=unknown)).status_code, 400)

    def test_delayed_check_waits_seven_full_days_after_independent_success(self):
        now = timezone.now()
        with mock.patch('family.learning.timezone.now', return_value=now):
            self.save(self.enrol())
            self.assertEqual(self.save(self.attempt('eq-r1', '6', activity='retention')).status_code, 400, 'no earlier work')
            self.assertEqual(self.save(self.attempt('eq-d1', '2')).status_code, 201)
            self.assertEqual(self.save(self.attempt('eq-d2', '3')).status_code, 201, 'wrong: not yet independent')
            self.assertEqual(self.save(self.attempt('eq-s1g', '4', activity='guided')).status_code, 201, 'with help: never independent')
        with mock.patch('family.learning.timezone.now', return_value=now + timedelta(days=1)):
            self.assertEqual(self.save(self.attempt('eq-r1', '6', activity='retention')).status_code, 400, 'one right answer is not independent success')
        start = now + timedelta(days=1, seconds=1)
        with mock.patch('family.learning.timezone.now', return_value=start):
            self.assertEqual(self.save(self.attempt('eq-p1', '9', activity='practice')).status_code, 201, 'second distinct right answer: independent now')
        for days, ok in [(6.5, False), (6.99, False), (7, True)]:
            with mock.patch('family.learning.timezone.now', return_value=start + timedelta(days=days)):
                code = self.save(self.attempt('eq-r1' if ok else 'eq-r2', '6' if ok else '15', activity='retention')).status_code
                self.assertEqual(code, 201 if ok else 400, f'{days} days after independent success')

    def test_duplicates_conflicts_and_coexistence_with_fixed_programs(self):
        e = self.enrol()
        self.assertEqual(self.save(e).status_code, 201)
        self.assertEqual(self.save(e).status_code, 400, 'the same id twice')
        self.assertEqual(self.append(self.client, self.pupil_id, 0, self.attempt('eq-d1', '2'), subject='mathematics').status_code, 409, 'stale position')
        from .mathematics import lesson
        spec = lesson()
        fixed = {'kind': 'math_activity', 'id': 'fixed-1', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'journey': 'school', 'lessonVersion': spec['version'], 'action': 'open', 'stage': spec['stages'][0]['id'], 'elapsedMs': 1, 'sessionId': f'math:{self.pupil_id}:v'}
        self.assertEqual(self.save(fixed).status_code, 201, 'a fixed program still works beside learning records')
        self.assertEqual(self.save(self.attempt('eq-d1', '2')).status_code, 201)
        kinds = [x['kind'] for x in self.records()]
        self.assertEqual(kinds, ['learning_record', 'math_activity', 'learning_record'])

    def test_records_survive_logout_and_login_and_are_private(self):
        self.save(self.enrol())
        self.save(self.attempt('eq-d1', '2'))
        self.client.post('/api/account/logout/')
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').status_code, 403)
        again = APIClient()
        self.assertEqual(again.post('/api/account/login/', {'email': 'asha.parent@example.org', 'password': PASSWORD}, format='json').status_code, 200)
        self.assertEqual(len(self.records(again)), 2)
        other = self.parent('other.parent@example.org')
        self.assertEqual(other.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').status_code, 404)

    def test_test_clock_is_test_only_synthetic_only_and_changes_no_record(self):
        import tempfile
        self.save(self.enrol())
        self.save(self.attempt('eq-d1', '2'))
        self.save(self.attempt('eq-d2', '2'))
        before = self.records()
        real = str(self.pupil(self.client, 'Arun'))
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump({self.pupil_id: 8, real: 8}, f)
        os.environ.pop('OPENPATH_TEST_CLOCK_FILE', None)
        self.assertEqual(self.save(self.attempt('eq-r1', '6', activity='retention')).status_code, 400, 'no test clock without the variable')
        with mock.patch.dict(os.environ, {'OPENPATH_TEST_CLOCK_FILE': f.name}):
            self.assertEqual(self.records()[:3], before, 'no stored record changes')
            self.assertEqual(self.save(self.attempt('eq-r1', '6', activity='retention')).status_code, 201, 'due by the test clock')
            from .learning import server_now
            from .models import Pupil
            self.assertLess(server_now(Pupil.objects.get(pk=real)), timezone.now() + timedelta(days=1), 'a real pupil never gets the test clock')


class GeneratedQuestionTests(LearningBase):
    def test_server_agrees_with_the_app_on_every_generated_question(self):
        from .learning_families import generated
        rows = json.loads((ROOT / 'families-parity.v1.json').read_text())['rows']
        self.assertGreater(len(rows), 150)
        for r in rows:
            g = generated(r['id'])
            self.assertEqual(g is not None, r['supported'], r['id'])
            if g:
                self.assertEqual((g['competency'], g['type']), (r['competency'], r['type']), r['id'])
                from .learning import right
                self.assertTrue(right(g, r['answer']), f"{r['id']}: the app's answer {r['answer']} is right on the server ({g['answer']})")

    def test_a_generated_question_is_saved_with_its_competency_and_checked(self):
        self.save(self.enrol())
        ok = self.rec('attempt', questionId='gen:cint:2,9,6', response='54', activity='diagnostic', hints=0, solution=False, competency='MATH.calculus.definite-integrals', context='investigate:gen:cint:2,9,6')
        self.assertEqual(self.save(ok).status_code, 201)
        for bad in [ok | {'questionId': 'gen:cint:9,2,6'}, ok | {'competency': 'MATH.number.multiplication-tables'}, ok | {'questionId': 'gen:mul:7,8,9'}, ok | {'response': 'fifty'}]:
            self.assertEqual(self.save(bad | {'id': f'x{self.serial}'}).status_code, 400, bad)
            self.serial += 1
