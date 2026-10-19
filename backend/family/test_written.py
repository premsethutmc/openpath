"""Written answers marked by an educator (written@1): consent, pseudonyms, one append-only mark, evidence only when
marked correct. Synthetic accounts and pupils only."""
from django.core.management import call_command

from .learning import content, independent_at
from .models import WrittenMark
from .test_learning import LearningBase

TASK = 'wr:irr:sqrt2'


class WrittenMarkingTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.teacher = self.parent('teacher@example.org')
        self.other = self.parent('other-teacher@example.org')
        self.stranger = self.parent('not-an-educator@example.org')
        for e in ('teacher@example.org', 'other-teacher@example.org'):
            call_command('content_reviewer', 'grant', e, role='educator', stdout=open('/dev/null', 'w'))
        self.assertEqual(self.save(self.rec('enrol', grade=4, academicYear='2026-27', curriculum=self.release10())).status_code, 201)

    def release10(self):
        from .test_learning import G4
        return {'id': G4['id'], 'version': G4['version'], 'hash': G4['hash']}

    def written(self, text='Suppose √2 = a/b in lowest terms. Then a² = 2b², so a is even …'):
        r = self.save(self.attempt(TASK, text, activity='practice'))
        self.assertEqual(r.status_code, 201, r.content)
        return self.records()[-1]['id']

    def share(self, email='teacher@example.org', client=None):
        return (client or self.client).post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': email}, format='json')

    def mark(self, attempt, client=None, verdict='correct', score=4, feedback='A complete proof: each step has its reason.'):
        return (client or self.teacher).post('/api/written/marks/', {'pupil': self.pupil_id, 'attemptId': attempt, 'verdict': verdict, 'score': score, 'feedback': feedback}, format='json')

    def test_a_written_task_is_a_question_the_server_knows_and_never_marks_itself(self):
        q = content()['questions'][TASK]
        self.assertEqual(q['type'], 'written')
        attempt = self.written('anything at all, even the words written:marked-correct')
        self.assertIsNone(independent_at(self.records(), q['competency']), 'an unmarked written answer is not evidence')
        self.assertEqual(self.save(self.attempt(TASK, '', activity='practice')).status_code, 400, 'an empty written answer is refused')
        self.assertEqual(self.save(self.attempt(TASK, 'x' * 4001, activity='practice')).status_code, 400, 'at most 4000 characters')
        self.assertTrue(attempt)

    def test_nothing_is_shared_until_the_parent_chooses_and_only_with_an_educator(self):
        attempt = self.written()
        self.assertEqual(self.teacher.get('/api/written/queue/').json()['queue'], [], 'not shared yet: the educator sees nothing')
        self.assertEqual(self.mark(attempt).status_code, 403)
        self.assertEqual(self.share('not-an-educator@example.org').status_code, 400, 'only an educator can be chosen')
        self.assertEqual(self.share('nobody@example.org').status_code, 400, 'the same answer for an unknown address (no account discovery)')
        self.assertEqual(self.share(client=self.teacher).status_code, 404, 'only the parent can share their pupil')
        self.assertEqual(self.share().status_code, 201)
        q = self.teacher.get('/api/written/queue/').json()['queue']
        self.assertEqual(len(q), 1)
        self.assertTrue(q[0]['learner'].startswith('Learner '), 'a pseudonym, not the pupil\'s name')
        self.assertNotIn('Synthetic learning-year pupil', str(q))
        self.assertEqual(self.other.get('/api/written/queue/').json()['queue'], [], 'another educator sees nothing')
        self.assertEqual(self.stranger.get('/api/written/queue/').status_code, 403, 'no educator role, no queue')

    def test_one_mark_per_answer_append_only_and_consistent(self):
        attempt = self.written()
        self.share()
        self.assertEqual(self.mark(attempt, verdict='correct', score=3).status_code, 400, 'correct means full marks')
        self.assertEqual(self.mark(attempt, verdict='partial', score=4).status_code, 400, 'full marks means correct')
        self.assertEqual(self.mark(attempt, score=9).status_code, 400, 'no more than the rubric allows')
        self.assertEqual(self.mark(attempt, feedback='').status_code, 400, 'feedback is required')
        self.assertEqual(self.mark(attempt, client=self.other).status_code, 403, 'only an educator it is shared with')
        self.assertEqual(self.mark(attempt).status_code, 201)
        self.assertEqual(self.mark(attempt, verdict='incorrect', score=0).status_code, 409, 'a mark is never changed')
        m = WrittenMark.objects.get()
        with self.assertRaises(ValueError):
            m.save()
        with self.assertRaises(ValueError):
            WrittenMark.objects.all().delete()
        with self.assertRaises(ValueError):
            WrittenMark.objects.all().update(verdict='incorrect')
        marks = self.client.get(f'/api/pupils/{self.pupil_id}/written-marks/').json()['marks']
        self.assertEqual([(x['attemptId'], x['verdict'], x['role']) for x in marks], [(attempt, 'correct', 'educator')])
        self.assertNotIn('teacher@example.org', str(marks), 'the parent sees the role, not the marker\'s account')
        self.assertEqual(self.teacher.get(f'/api/pupils/{self.pupil_id}/written-marks/').status_code, 404, 'marks are read by the parent')

    def test_only_a_mark_of_correct_is_evidence(self):
        a1, a2 = self.written(), self.written('Another attempt at the same proof')
        self.share()
        comp = content()['questions'][TASK]['competency']
        self.assertEqual(self.mark(a1, verdict='incorrect', score=0, feedback='The last step is missing.').status_code, 201)
        marks = dict(WrittenMark.objects.values_list('attempt_id', 'verdict'))
        self.assertIsNone(independent_at(self.records(), comp, marks), 'not yet correct is not evidence')
        # a second sight of the same task is a repeat: never fresh independent evidence, even when marked correct
        self.assertEqual(self.mark(a2).status_code, 201)
        marks = dict(WrittenMark.objects.values_list('attempt_id', 'verdict'))
        self.assertIsNone(independent_at(self.records(), comp, marks))

    def test_revoking_stops_access_and_an_educator_cannot_mark_their_own_pupil(self):
        attempt = self.written()
        self.share()
        self.assertEqual(self.client.delete(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').json()['stopped'], 1)
        self.assertEqual(self.teacher.get('/api/written/queue/').json()['queue'], [])
        self.assertEqual(self.mark(attempt).status_code, 403)
        # a parent who is also an educator cannot choose themselves, so never marks their own child's work
        call_command('content_reviewer', 'grant', 'asha.parent@example.org', role='educator', stdout=open('/dev/null', 'w'))
        self.assertEqual(self.share('asha.parent@example.org').status_code, 400)
        self.assertEqual(self.client.get('/api/written/queue/').json()['queue'], [])
