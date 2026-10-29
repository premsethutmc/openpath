"""Phase C stage 7: immutable grading decisions, replay from recorded verdicts (D11), automatic regrade of grader failures only, and the
read-only reconstruction dry run (approved decision 3). Real Django endpoint tests; the trusted grader is the real Node bundle."""
import io
import json
import os
import tempfile
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError

from . import decisions
from .learning import credited, generated
from .models import GradingDecisionRecord, Pupil, PupilEvent
from .test_learning import LearningBase


class DecisionRecordTests(LearningBase):
    MEAN = ('gen:mean4:1,2,3,6', 'MATH.statistics.averages-intro', '3')     # the mean of 1, 2, 3 and 6

    def go(self, spec, response, rid):
        qid, comp, _ = spec
        return self.save(self.rec('attempt', questionId=qid, response=response, activity='diagnostic', hints=0, solution=False, competency=comp, id=rid))

    def body(self, rid):
        return next(e for e in self.records() if e['id'] == rid)

    def test_every_attempt_records_one_server_decision_in_the_event_and_the_log(self):
        self.save(self.enrol())
        for rid, response, verdict in [('c', '3', 'correct'), ('w', '4', 'incorrect'), ('u', 'three-ish', 'unresolved')]:
            self.assertEqual(self.go(self.MEAN, response, rid=rid).status_code, 201)
            d = self.body(rid)['decision']
            self.assertEqual((d['schema'], d['decidedBy'], d['attemptId'], d['verdict']), ('grading-decision@1', 'server', rid, verdict))
            self.assertTrue(d['decisionId'] and d['grader']['bundleSha256'] and d['contract']['hash'])
            row = GradingDecisionRecord.objects.get(attempt_id=rid)
            self.assertEqual((row.decision_id, row.verdict, row.body), (d['decisionId'], verdict, d))
        self.assertEqual(self.body('u')['decision']['reason'], 'unresolved.invalid-response')

    def test_a_browser_cannot_send_a_decision(self):
        self.save(self.enrol())
        qid, comp, _ = self.MEAN
        forged = {'schema': 'grading-decision@1', 'decidedBy': 'server', 'verdict': 'correct'}
        r = self.save(self.rec('attempt', questionId=qid, response='4', activity='diagnostic', hints=0, solution=False, competency=comp, decision=forged))
        self.assertEqual(r.status_code, 400)

    def test_decisions_are_append_only(self):
        self.save(self.enrol())
        self.go(self.MEAN, '3', rid='a')
        row = GradingDecisionRecord.objects.get(attempt_id='a')
        row.verdict = 'incorrect'
        with self.assertRaises(ValueError):
            row.save()

    def test_replay_uses_the_recorded_verdict_not_the_current_grader(self):
        # G8: a later grader that would decide differently changes nothing already recorded
        self.save(self.enrol())
        self.go(self.MEAN, '3', rid='a')
        self.go(self.MEAN, '4', rid='b')
        q = generated(self.MEAN[0])
        a, b = self.body('a'), self.body('b')
        flipped = lambda qid, response, stored, working=None: {'credit': response != '3', 'source': 'kernel', 'reason': 'x', 'verdict': 'correct' if response != '3' else 'incorrect'}
        with mock.patch('family.learning.kernel_decision', side_effect=flipped):
            self.assertEqual((credited(q, a), credited(q, b)), (True, False))

    def test_a_grader_failure_is_regraded_only_by_appending_a_superseding_decision(self):
        self.save(self.enrol())
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.go(self.MEAN, '3', rid='a')
        before = self.body('a')
        self.assertEqual(before['decision']['reason'], 'unresolved.infrastructure')
        self.assertFalse(credited(generated(self.MEAN[0]), before))
        out = io.StringIO()
        call_command('regrade_unresolved', '--dry-run', stdout=out)
        self.assertIn('would append 1', out.getvalue())
        self.assertEqual(GradingDecisionRecord.objects.filter(attempt_id='a').count(), 1)
        call_command('regrade_unresolved', stdout=io.StringIO())
        rows = list(GradingDecisionRecord.objects.filter(attempt_id='a').order_by('decided_at', 'id'))
        self.assertEqual([r.verdict for r in rows], ['unresolved', 'correct'])
        self.assertEqual(rows[1].supersedes, rows[0].decision_id)
        self.assertEqual(self.body('a'), before, 'the stored event is never changed')
        got = self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()
        self.assertEqual(got['decisions']['a']['verdict'], 'correct')
        pupil = Pupil.objects.get(pk=self.pupil_id)
        cur = decisions.effective(pupil, [before])
        self.assertTrue(credited(generated(self.MEAN[0]), cur[0]))
        call_command('regrade_unresolved', stdout=io.StringIO())   # idempotent: nothing left to regrade
        self.assertEqual(GradingDecisionRecord.objects.filter(attempt_id='a').count(), 2)

    def test_the_reconstruction_dry_run_reports_and_writes_nothing(self):
        self.save(self.enrol())
        self.go(self.MEAN, '3', rid='new')
        pupil = Pupil.objects.get(pk=self.pupil_id)
        qid, comp, _ = self.MEAN
        seq = PupilEvent.objects.filter(pupil=pupil).count()
        old = {'kind': 'learning_record', 'id': 'old', 'at': '2026-09-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'learn:{self.pupil_id}:visit',
               'record': 'attempt', 'questionId': qid, 'response': '6/2', 'activity': 'diagnostic', 'hints': 0, 'solution': False, 'competency': comp}
        from datetime import datetime, timezone as tz
        PupilEvent.objects.create(pupil=pupil, subject='mathematics', seq=seq, kind='learning_record', occurred_at=datetime(2026, 9, 1, tzinfo=tz.utc), body=old)
        n_events, n_dec = PupilEvent.objects.count(), GradingDecisionRecord.objects.count()
        with self.assertRaises(CommandError):
            call_command('reconstruct_decisions', stdout=io.StringIO())
        with tempfile.NamedTemporaryFile(suffix='.json') as f:
            call_command('reconstruct_decisions', '--dry-run', '--out', f.name, '--pupil', self.pupil_id, stdout=io.StringIO())
            rep = json.load(open(f.name))
        self.assertEqual((PupilEvent.objects.count(), GradingDecisionRecord.objects.count()), (n_events, n_dec))
        self.assertEqual(rep['summary']['historical'], 1)
        self.assertEqual(rep['summary']['already-decided'], 1)
        row = rep['records'][0]
        self.assertEqual((row['attemptId'], row['original'], row['reconstructed']), ('old', 'none-recorded', 'correct'))
        self.assertIn('no recorded assessment', row['missingContext'])


class DryRunReadOnlyTests(LearningBase):
    """release check E: reconstruct_decisions --dry-run cannot write, even if something it calls tries to"""

    def test_a_write_attempted_during_the_dry_run_is_refused_and_nothing_changes(self):
        from datetime import datetime, timezone as tz
        from .management.commands import reconstruct_decisions as rd
        self.save(self.enrol())
        pupil = Pupil.objects.get(pk=self.pupil_id)
        seq = PupilEvent.objects.filter(pupil=pupil).count()
        old = {'kind': 'learning_record', 'id': 'old', 'at': '2026-09-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'learn:{self.pupil_id}:visit',
               'record': 'attempt', 'questionId': 'gen:mean4:1,2,3,6', 'response': '3', 'activity': 'diagnostic', 'hints': 0, 'solution': False, 'competency': 'MATH.statistics.averages-intro'}
        PupilEvent.objects.create(pupil=pupil, subject='mathematics', seq=seq, kind='learning_record', occurred_at=datetime(2026, 9, 1, tzinfo=tz.utc), body=old)
        counts = (PupilEvent.objects.count(), GradingDecisionRecord.objects.count())
        real = rd._decide

        def writing_decide(e, q, now=None):
            decisions.record(pupil, 'mathematics', {**real(e, q, now)[1], 'decisionId': 'sneaky', 'attemptId': 'old'}, datetime(2026, 9, 1, tzinfo=tz.utc))
            return real(e, q, now)
        from unittest import mock
        with mock.patch.object(rd, '_decide', writing_decide), self.assertRaises(rd.ReadOnlyViolation):
            call_command('reconstruct_decisions', '--dry-run', '--pupil', self.pupil_id, stdout=io.StringIO())
        self.assertEqual((PupilEvent.objects.count(), GradingDecisionRecord.objects.count()), counts)
        # and the normal dry run reports with its guards on
        with tempfile.NamedTemporaryFile(suffix='.json') as f:
            call_command('reconstruct_decisions', '--dry-run', '--pupil', self.pupil_id, '--out', f.name, stdout=io.StringIO())
            rep = json.load(open(f.name))
        self.assertEqual(rep['readOnlyGuards'], {'session': 'sqlite', 'statementFilter': True, 'rollback': True})
        self.assertEqual((PupilEvent.objects.count(), GradingDecisionRecord.objects.count()), counts)
