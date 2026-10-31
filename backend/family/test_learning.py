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
from .learning_families import generated
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
            self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='invented', rule='x'),
            self.enrol(grade=13),
            self.rec('enrol', grade=4, academicYear='2026-27', curriculum={'id': G4['id'], 'version': G4['version'], 'hash': '00000000'}),
        ]
        for e in bad:
            self.assertEqual(self.save(e).status_code, 400, e)
        self.assertEqual(self.records(), [])

    def test_unreadable_answers_are_kept_unresolved_and_are_not_attempts(self):
        # approved policy P1 (2026-10-29), replacing the earlier "refused with 400": an unreadable answer is saved, unresolved, never
        # incorrect, never credited and never an attempt, however many are sent (abuse is limited by request throttling, not by assessment)
        self.save(self.enrol())
        for qid, response in [('eq-d1', 'two'), ('eq-p2', 'E'), ('fa-d1', '5/0'), ('eq-d1', 'two'), ('eq-d1', 'two')]:
            self.assertEqual(self.save(self.attempt(qid, response)).status_code, 201, (qid, response))
        saved = [e for e in self.records() if e.get('record') == 'attempt']
        self.assertEqual(len(saved), 5)
        for e in saved:
            self.assertEqual((e['assessment']['unresolved'], e['assessment']['answerCorrect']), (True, None), e['response'])
        from .learning import independent_at
        self.assertIsNone(independent_at([e for e in self.records()], 'MATH.number.equivalent-fractions'))

    def test_repeated_submissions_are_limited_by_request_rate_not_by_assessment(self):
        from django.core.cache import cache
        from unittest import mock
        cache.clear()
        self.save(self.enrol())
        with mock.patch('family.views.PupilEventWriteThrottle.get_rate', return_value='3/hour'):
            codes = [self.save(self.attempt('eq-d1', 'two')).status_code for _ in range(3)]
        cache.clear()
        self.assertEqual(codes, [201, 201, 429])  # the enrolment was the first write of the hour

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
                if 'options' in r:
                    if 'options' in g:
                        self.assertEqual(g['options'], r['options'], r['id'])
                    self.assertEqual(g['answer'], r['answer'], r['id'])

    def test_every_question_of_every_release_pool_is_known_to_the_server_in_its_answer_format(self):
        from .learning import _answer_ok
        from .learning_families import _table, generated
        n = 0
        for fam, t in _table().items():
            for key, answer in t['items'].items():
                g = generated(f'gen:{fam}:{key}')
                self.assertIsNotNone(g, (fam, key))
                self.assertTrue(_answer_ok(g['type'], answer), (fam, key, answer))
                n += 1
        self.assertGreater(n, 30000)

    def test_a_generated_question_is_saved_with_its_competency_and_checked(self):
        self.save(self.enrol())
        ok = self.rec('attempt', questionId='gen:cint:2,9,6', response='54', activity='diagnostic', hints=0, solution=False, competency='MATH.calculus.definite-integrals', context='investigate:gen:cint:2,9,6')
        self.assertEqual(self.save(ok).status_code, 201)
        for bad in [ok | {'questionId': 'gen:cint:9,2,6'}, ok | {'competency': 'MATH.number.multiplication-tables'}, ok | {'questionId': 'gen:mul:7,8,9'}]:
            self.assertEqual(self.save(bad | {'id': f'x{self.serial}'}).status_code, 400, bad)
            self.serial += 1


class AssessmentEvidenceTests(LearningBase):
    """assessment@1: the separate results of one submission are stored with the attempt, and cannot overstate the learner's standing."""
    KEYS = dict(policy='assessment@1', methodExamined=False, derivationVerified=False, firstError=None, clarificationRequired=False, aiFallbackUsed=False)

    def attempt_with(self, response, assessment):
        if assessment is None:
            return {k: v for k, v in self.attempt_with(response, {}).items() if k != 'assessment'}
        return self.rec('attempt', questionId='gen:lin:3,5,4', response=response, activity='diagnostic', hints=0, solution=False, competency='MATH.algebra.linear-equations', assessment=assessment)

    def stored(self, rid):
        return next(e for e in self.records() if e['id'] == rid)

    def test_malformed_or_overstated_evidence_is_refused(self):
        self.save(self.enrol())
        right = dict(self.KEYS, answerCorrect=True, unresolved=False, source='kernel')
        for bad in [dict(right, aiFallbackUsed=True), dict(right, derivationVerified=True), dict(right, extra=1), dict(right, source='guess'), dict(right, answerCorrect='yes')]:
            self.serial += 1
            self.assertEqual(self.save(self.attempt_with('4', bad) | {'id': f'b{self.serial}'}).status_code, 400, bad)

    def test_the_server_decides_correctness_whatever_the_browser_claims(self):
        self.save(self.enrol())
        right = dict(self.KEYS, answerCorrect=True, unresolved=False, source='kernel')
        self.assertEqual(self.save(self.attempt_with('4', right) | {'id': 'ok'}).status_code, 201)
        self.assertIs(self.stored('ok')['assessment']['answerCorrect'], True)
        # a wrong answer that claims "correct" is stored as incorrect, not refused and not credited
        self.assertEqual(self.save(self.attempt_with('5', right) | {'id': 'forged'}).status_code, 201)
        self.assertIs(self.stored('forged')['assessment']['answerCorrect'], False)
        # a wrong, readable answer parked as "unresolved" is decided by the server
        parked = dict(self.KEYS, answerCorrect=None, unresolved=True, source='kernel', clarificationRequired=True)
        self.assertEqual(self.save(self.attempt_with('5', parked) | {'id': 'parked'}).status_code, 201)
        self.assertEqual((self.stored('parked')['assessment']['answerCorrect'], self.stored('parked')['assessment']['unresolved']), (False, False))
        # a right answer claimed "incorrect" is stored as correct
        self.assertEqual(self.save(self.attempt_with('4', dict(right, answerCorrect=False)) | {'id': 'denied'}).status_code, 201)
        self.assertIs(self.stored('denied')['assessment']['answerCorrect'], True)

    def test_an_unreadable_answer_is_saved_undecided_never_wrong(self):
        self.save(self.enrol())
        for rid, text in [('u1', 'four-ish'), ('u2', 'x = ?')]:
            r = self.save(self.attempt_with(text, None) | {'id': rid})   # even with no evidence attached
            self.assertEqual(r.status_code, 201, text)
            a = self.stored(rid)['assessment']
            self.assertEqual((a['unresolved'], a['answerCorrect'], a['clarificationRequired']), (True, None, True), text)
        self.assertEqual(self.save(self.attempt_with('4.0', None) | {'id': 'dec'}).status_code, 201)   # "4.0" is the number 4: readable

class PlatformTests(LearningBase):
    """The platform directive: synthesised modules, multiple-choice generated questions, nested curricula."""

    def test_a_synthesised_module_is_known_to_the_server_and_its_strategy_can_be_taught(self):
        self.save(self.enrol())
        library = json.loads((ROOT / 'library.v1.json').read_text())['modules']
        self.assertGreaterEqual(len(library), 7)
        m = next(x for x in library if x['competency'] == 'MATH.calculus.integration-methods')
        self.assertEqual(self.save(self.rec('teach', competency=m['competency'], strategy=m['strategies'][0]['id'], rule='procedural')).status_code, 201)
        self.assertEqual(self.save(self.rec('teach', competency=m['competency'], strategy='invented', rule='procedural')).status_code, 400)

    def test_a_multiple_choice_generated_question_is_checked_by_letter(self):
        self.save(self.enrol())
        ok = self.rec('attempt', questionId='gen:subst:0,2,1,2:mc', response='C', activity='practice', hints=0, solution=False, competency='MATH.calculus.integration-methods')
        self.assertEqual(self.save(ok).status_code, 201)
        for bad in [ok | {'questionId': 'gen:mul:7,8:mc'}, ok | {'competency': 'MATH.calculus.definite-integrals'}]:
            self.assertEqual(self.save(bad | {'id': f'x{self.serial}'}).status_code, 400, bad)
            self.serial += 1

    def test_a_release_with_sections_is_checked_at_every_depth(self):
        release = json.loads((ROOT / 'curricula/openpath-sample-mathematics-grade-12.v1.1.0.json').read_text())
        self.assertEqual(hash_of({**release, 'hash': ''}), release['hash'])
        self.assertEqual(self.save(self.rec('curriculum', release=release)).status_code, 201)
        self.assertEqual(self.save(self.enrol(12, release)).status_code, 201)
        # an unknown competency hidden in a section is found
        bad = json.loads(json.dumps(release))
        sec = next(s for ch in bad['subjects'][0]['chapters'] for s in ch.get('sections', []) if s['outcomes'])
        sec['outcomes'][0]['mapping']['competencies'][0] |= {'id': 'MATH.invented', 'status': 'accepted'}
        bad['id'] = 'tampered'
        bad['hash'] = hash_of({**bad, 'hash': ''})
        self.assertEqual(self.save(self.rec('curriculum', release=bad)).status_code, 400)
        # an outcome of an unsupported subject cannot be mapped
        sci = json.loads(json.dumps(release))
        o = sci['subjects'][0]['chapters'][0]['outcomes'][0]
        o['mapping'] |= {'verdict': 'unsupported'}
        sci['id'] = 'unsupported-mapped'
        sci['hash'] = hash_of({**sci, 'hash': ''})
        self.assertEqual(self.save(self.rec('curriculum', release=sci)).status_code, 400)


class KernelAuthorityTests(LearningBase):
    """The server decides with the trusted exact grader (kernel_grader) where it has verified the question, from the question id and the response alone;
    elsewhere the stored answer decides and the result is labelled legacy. Needs Node and grader/grader.mjs (otherwise every case below is the legacy route)."""
    KEYS = dict(policy='assessment@1', methodExamined=False, derivationVerified=False, firstError=None, clarificationRequired=False, aiFallbackUsed=False)
    DET = ('gen:det2:-3,1,1,1', 'MATH.algebra.determinants', '-4')          # the determinant of [[-3, 1], [1, 1]]
    MEAN = ('gen:mean4:1,2,3,6', 'MATH.statistics.averages-intro', '3')     # the mean of 1, 2, 3 and 6

    def go(self, spec, response, assessment=None, rid=None, working=None):
        qid, comp, _ = spec
        self.serial += 1
        extra = {} if assessment is None else {'assessment': assessment}
        if working is not None:
            extra['working'] = working
        r = self.save(self.rec('attempt', questionId=qid, response=response, activity='diagnostic', hints=0, solution=False, competency=comp, id=rid or f'k{self.serial}', **extra))
        return r

    def stored(self, rid):
        return next(e for e in self.records() if e['id'] == rid)['assessment']

    def test_the_kernel_decides_correct_equivalent_and_incorrect(self):
        self.save(self.enrol())
        self.assertEqual(self.go(self.DET, '-4', rid='c').status_code, 201)
        self.assertEqual((self.stored('c')['answerCorrect'], self.stored('c')['source']), (True, 'kernel'))
        self.go(self.MEAN, '6/2', rid='eq')     # equal to 3, a form the stored-answer comparison does not read as the integer 3
        self.assertEqual((self.stored('eq')['answerCorrect'], self.stored('eq')['source']), (True, 'kernel'))
        self.go(self.DET, '-5', rid='w')
        self.assertEqual((self.stored('w')['answerCorrect'], self.stored('w')['unresolved'], self.stored('w')['source']), (False, False, 'kernel'))

    def test_working_never_changes_the_answers_credit(self):
        self.save(self.enrol())
        self.go(self.DET, '-4', rid='a', working=['-3 + 1 = 7', 'so -4'])
        self.go(self.DET, '-5', rid='b', working=['-3 - 1 = -4'])
        self.assertIs(self.stored('a')['answerCorrect'], True)
        self.assertIs(self.stored('b')['answerCorrect'], False)

    def test_forged_browser_verdicts_change_nothing(self):
        self.save(self.enrol())
        claim = dict(self.KEYS, answerCorrect=True, unresolved=False, source='kernel')
        self.go(self.DET, '-5', claim, rid='f1')                                              # wrong answer claimed correct
        self.go(self.DET, '-4', dict(claim, answerCorrect=False), rid='f2')                   # right answer claimed wrong
        self.go(self.DET, '-5', dict(claim, answerCorrect=None, unresolved=True, clarificationRequired=True), rid='f3')   # wrong answer parked as unresolved
        self.go(self.DET, '-4', dict(claim, answerCorrect=None, unresolved=True, clarificationRequired=True), rid='f4')   # right answer parked
        self.assertEqual([self.stored(i)['answerCorrect'] for i in ('f1', 'f2', 'f3', 'f4')], [False, True, False, True])
        self.assertEqual([self.stored(i)['unresolved'] for i in ('f1', 'f2', 'f3', 'f4')], [False, False, False, False])

    def test_unreadable_and_unsupported_answers_are_undecided_not_wrong(self):
        self.save(self.enrol())
        for rid, text in [('u1', 'abc'), ('u2', '1/0'), ('u3', '[[1,2],[3]]'), ('u4', '2..3')]:
            self.assertEqual(self.go(self.DET, text, rid=rid).status_code, 201, text)
            a = self.stored(rid)
            self.assertEqual((a['answerCorrect'], a['unresolved']), (None, True), text)

    def test_repeated_submissions_each_get_the_same_verdict(self):
        self.save(self.enrol())
        for i in range(3):
            self.go(self.MEAN, '6/2', rid=f'r{i}')
        self.assertEqual([self.stored(f'r{i}')['answerCorrect'] for i in range(3)], [True, True, True])

    def test_mastery_replay_uses_the_servers_verdict(self):
        from .learning import credited
        self.save(self.enrol())
        self.go(self.MEAN, '6/2', rid='m1')
        ev = next(e for e in self.records() if e['id'] == 'm1')
        q = generated(self.MEAN[0])
        self.assertIs(credited(q, ev), True)                                    # replay agrees with the stored kernel verdict
        # stage 7 (D11): replay reads the recorded decision; relabelling the assessment changes nothing
        self.assertIs(credited(q, {**ev, 'assessment': {**ev['assessment'], 'source': 'legacy'}}), True)
        # only a historical record with no recorded verdict at all is compared again (the stored-answer comparison refuses "6/2")
        self.assertIs(credited(q, {k: v for k, v in ev.items() if k not in ('decision', 'assessment')}), False)

    def test_a_refused_grader_reply_is_a_contract_inconsistency_not_a_verdict(self):
        # the grader runs but its reply is refused (e.g. its stored answer differs from this server's): unresolved, source "held"
        from unittest import mock
        self.save(self.enrol())
        with mock.patch('family.learning.kernel_decision', return_value=None):
            self.go(self.MEAN, '3', rid='par')
        self.assertEqual((self.stored('par')['answerCorrect'], self.stored('par')['unresolved'], self.stored('par')['source']), (None, True, 'held'))

    def test_a_missing_or_tampered_grader_leaves_the_answer_unresolved(self):
        # updated for the approved failure semantics (UNIFIED_GRADING_ARCHITECTURE.md §11, D12): no comparison is substituted when the trusted
        # grader cannot run; the answer is kept unresolved (source "infrastructure"), never incorrect, never an attempt
        import os
        import shutil
        import tempfile
        from unittest import mock
        from . import kernel_grader
        self.save(self.enrol())
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.go(self.MEAN, '6/2', rid='off')
        self.assertEqual((self.stored('off')['answerCorrect'], self.stored('off')['unresolved'], self.stored('off')['source']), (None, True, 'infrastructure'))
        with tempfile.TemporaryDirectory() as d:
            bad = shutil.copy(kernel_grader.BUNDLE, os.path.join(d, 'grader.mjs'))
            shutil.copy(kernel_grader.MANIFEST, os.path.join(d, 'grader.manifest.json'))
            with open(bad, 'a') as f:
                f.write('\n// tampered\n')
            kernel_grader.bundle_intact.cache_clear()
            with mock.patch.object(kernel_grader, 'BUNDLE', type(kernel_grader.BUNDLE)(bad)), mock.patch.object(kernel_grader, 'MANIFEST', type(kernel_grader.MANIFEST)(os.path.join(d, 'grader.manifest.json'))):
                self.go(self.MEAN, '6/2', rid='bad')
        kernel_grader.bundle_intact.cache_clear()
        self.assertEqual((self.stored('bad')['answerCorrect'], self.stored('bad')['unresolved'], self.stored('bad')['source']), (None, True, 'infrastructure'))
        from .learning import independent_at
        self.assertIsNone(independent_at(self.records(), generated(self.MEAN[0])['competency']))  # neither is evidence

    def test_a_family_without_a_verified_contract_is_labelled_legacy_whatever_the_browser_says(self):
        self.save(self.enrol())
        claim = dict(self.KEYS, answerCorrect=True, unresolved=False, source='kernel')
        r = self.save(self.rec('attempt', questionId='gen:rect:3,4', response='12', activity='diagnostic', hints=0, solution=False, competency=generated('gen:rect:3,4')['competency'], assessment=claim, id='lg'))
        self.assertEqual(r.status_code, 201)
        a = self.stored('lg')
        # grading-policy@1 (stage 4): decided by the trusted grader's value verifier, never labelled with the browser's "kernel" claim
        self.assertEqual((a['answerCorrect'], a['source']), (True, 'verifier'))


class QuarantineTests(LearningBase):
    """question-status@1 (Phase C stage 1, D09): an answer to a quarantined question is accepted and stored, never credited, never an
    attempt or mastery evidence, whatever the browser claims; the question's definition and the records are kept."""
    Q = 'gen:adexp:9,8,5,7:w'
    KEYS = KernelAuthorityTests.KEYS
    go = KernelAuthorityTests.go
    stored = KernelAuthorityTests.stored

    def spec(self):
        from .learning_families import generated
        g = generated(self.Q)
        return (self.Q, g['competency'], g['answer'])

    def test_a_quarantined_question_is_stored_unresolved_and_never_credited(self):
        from .learning import credited, independent_at
        from .learning_families import generated
        from .question_status import quarantined
        self.assertTrue(quarantined(self.Q))
        self.save(self.enrol())
        spec = self.spec()
        claim = dict(self.KEYS, answerCorrect=True, unresolved=False, source='kernel')
        for i in range(5):
            self.assertEqual(self.go(spec, spec[2], claim if i % 2 else None, rid=f'q{i}').status_code, 201)
        for i in range(5):
            a = self.stored(f'q{i}')
            self.assertEqual((a['answerCorrect'], a['unresolved'], a['source']), (None, True, 'held'))
        recs = [e for e in self.records() if e.get('record') == 'attempt']
        self.assertEqual(len(recs), 5)                                              # every answer is kept
        self.assertTrue(all(credited(generated(self.Q), e) is False for e in recs))
        self.assertIsNone(independent_at(recs, spec[1]))                            # five "right" answers are no evidence
