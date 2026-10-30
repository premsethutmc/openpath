"""Release check B (shadow deployment): decision-record and mastery-replay invariants, as real endpoint tests with the real Node grader.

  1 historical decisions and events are immutable (save, queryset update and bulk update all refused)
  2 shadow decisions never affect credit or mastery
  3 the authoritative decision is distinguishable from the shadow evaluation
  4 grader-failure retries cannot create two authoritative outcomes (one original per attempt, one successor per decision)
  5 replay is deterministic and uses the latest non-superseded recorded decision
  6 switching mode (rollback) never reinterprets a recorded outcome
"""
import io
import os
from unittest import mock

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.utils import timezone

from . import decisions
from .learning import credited, generated, independent_at
from .models import GradingDecisionRecord, Pupil, PupilEvent
from .test_learning import LearningBase

MEAN = ('gen:mean4:1,2,3,6', 'MATH.statistics.averages-intro', '3')


class ReleaseInvariantTests(LearningBase):
    def go(self, qid, response, rid, activity='diagnostic'):
        q = generated(qid)
        return self.save(self.rec('attempt', questionId=qid, response=response, activity=activity, hints=0, solution=False, competency=q['competency'], id=rid))

    def body(self, rid):
        return next(e for e in self.records() if e['id'] == rid)

    def test_1_events_and_decisions_are_immutable(self):
        self.save(self.enrol())
        self.go(MEAN[0], '3', 'a')
        ev = next(e for e in PupilEvent.objects.all() if e.body.get('id') == 'a')
        row = GradingDecisionRecord.objects.get(attempt_id='a')
        # PupilEvent bodies can be rewritten only by the parent-requested privacy scrub (bulk_update in views.PupilScrubView, its own tests)
        for attempt in (lambda: ev.save(), lambda: row.save(), lambda: GradingDecisionRecord.objects.filter(pk=row.pk).update(verdict='incorrect'),
                        lambda: GradingDecisionRecord.objects.bulk_update([row], ['verdict'])):
            with self.assertRaises(ValueError):
                attempt()
        self.assertEqual(GradingDecisionRecord.objects.get(pk=row.pk).verdict, 'correct')

    @override_settings(OPENPATH_GRADING='shadow')
    def test_2_and_3_shadow_decisions_never_count_and_are_distinguishable(self):
        self.save(self.enrol())
        # a case where the policies differ: 6/2 for 3 — earlier policy (kernel family, kernel verdict) and unified agree here, so use a
        # response the earlier stored-answer comparison cannot read but the unified grader credits
        q = 'gen:rect:3,4'
        self.go(q, '24/2', 's')
        b = self.body('s')
        self.assertEqual((b['decision']['policy'], b['decision']['decidedBy']), ('legacy-policy@0', 'server'))
        self.assertEqual((b['shadowDecision']['policy'], b['shadowDecision']['decidedBy']), ('grading-policy@1', 'shadow'))
        self.assertNotEqual(b['decision']['verdict'], b['shadowDecision']['verdict'])
        self.assertEqual(b['shadowDecision']['verdict'], 'correct')
        self.assertFalse(credited(generated(q), b))                              # the shadow "correct" does not count
        self.assertEqual(GradingDecisionRecord.objects.filter(attempt_id='s').count(), 1)
        self.assertEqual(GradingDecisionRecord.objects.get(attempt_id='s').body['policy'], 'legacy-policy@0')   # only the authoritative one is logged
        self.assertIsNone(independent_at(self.records(), generated(q)['competency']))

    @override_settings(OPENPATH_GRADING='unified')  # the grader-failure decision exists in unified mode; shadow keeps the earlier fallback
    def test_4_retries_never_create_two_authoritative_outcomes(self):
        self.save(self.enrol())
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.go(MEAN[0], '3', 'a')
        first = GradingDecisionRecord.objects.get(attempt_id='a')
        pupil = Pupil.objects.get(pk=self.pupil_id)
        # a second original decision for the same attempt is refused by the database
        dup = {**first.body, 'decisionId': 'dup-1'}
        with self.assertRaises(IntegrityError), transaction.atomic():
            decisions.record(pupil, 'mathematics', dup, timezone.now())
        # two regrades racing on the same decision: only one successor can exist
        call_command('regrade_unresolved', stdout=io.StringIO())
        second = {**GradingDecisionRecord.objects.exclude(pk=first.pk).get(attempt_id='a').body, 'decisionId': 'dup-2'}
        with self.assertRaises(IntegrityError), transaction.atomic():
            decisions.record(pupil, 'mathematics', second, timezone.now())
        out = io.StringIO()
        call_command('regrade_unresolved', stdout=out)
        self.assertEqual(GradingDecisionRecord.objects.filter(attempt_id='a').count(), 2)
        # the same attempt id cannot be submitted twice either
        self.assertEqual(self.go(MEAN[0], '3', 'a').status_code, 400)

    @override_settings(OPENPATH_GRADING='unified')
    def test_5_replay_is_deterministic_and_uses_the_latest_recorded_decision(self):
        self.save(self.enrol())
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.go(MEAN[0], '3', 'a')
        pupil = Pupil.objects.get(pk=self.pupil_id)
        bodies = list(PupilEvent.objects.filter(pupil=pupil, subject='mathematics').order_by('seq').values_list('body', flat=True))
        before = [credited(generated(MEAN[0]), e) for e in decisions.effective(pupil, bodies) if e.get('record') == 'attempt']
        call_command('regrade_unresolved', stdout=io.StringIO())
        runs = [[credited(generated(MEAN[0]), e) for e in decisions.effective(pupil, bodies) if e.get('record') == 'attempt'] for _ in range(3)]
        self.assertEqual(before, [False])
        self.assertEqual(runs, [[True]] * 3)

    @override_settings(OPENPATH_GRADING='shadow')
    def test_5b_in_shadow_mode_a_grader_failure_keeps_the_earlier_policys_fallback(self):
        # the earlier policy stays authoritative in shadow mode, including its stored-answer fallback when the grader cannot run; the
        # unified failure decision is only recorded beside it
        self.save(self.enrol())
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.go(MEAN[0], '3', 'a')
        b = self.body('a')
        self.assertEqual((b['decision']['policy'], b['decision']['verdict']), ('legacy-policy@0', 'correct'))
        self.assertEqual(b['shadowDecision']['reason'], 'unresolved.infrastructure')
        self.assertTrue(credited(generated(MEAN[0]), b))

    def test_6_switching_mode_never_reinterprets_a_recorded_outcome(self):
        self.save(self.enrol())
        q = 'gen:rect:3,4'
        with override_settings(OPENPATH_GRADING='unified'):
            self.go(q, '24/2', 'u')                 # unified: correct
        with override_settings(OPENPATH_GRADING='shadow'):
            self.go(q, '24/2', 's')                 # earlier policy: unresolved (shadow: correct)
        u, s = self.body('u'), self.body('s')
        for mode in ('unified', 'shadow', 'legacy'):
            with override_settings(OPENPATH_GRADING=mode):
                self.assertEqual((credited(generated(q), u), credited(generated(q), s)), (True, False), mode)
                self.assertEqual(self.body('u')['decision']['policy'], 'grading-policy@1')
        # a historical record (no decision, recorded assessment) keeps its recorded verdict in every mode
        hist = {**{k: v for k, v in u.items() if k not in ('decision', 'shadowDecision')}, 'assessment': {**u['assessment'], 'answerCorrect': False}}
        for mode in ('unified', 'shadow', 'legacy'):
            with override_settings(OPENPATH_GRADING=mode):
                self.assertFalse(credited(generated(q), hist), mode)
