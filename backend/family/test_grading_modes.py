"""Phase C stage 8: OPENPATH_GRADING modes (UNIFIED_GRADING_ARCHITECTURE.md §13). shadow (the production default until an approved
switch): the earlier policy decides and the unified decision is recorded beside it, never used; legacy: the earlier policy only;
unified: grading-policy@1 decides. Quarantine applies in every mode. Real endpoint tests with the real Node grader."""
import io
import json
import tempfile

from django.core.management import call_command
from django.test import override_settings

from .learning import credited, generated
from .test_learning import LearningBase

MEAN = ('gen:mean4:1,2,3,6', 'MATH.statistics.averages-intro', '3')   # kernel family (validated contract)
RECT = ('gen:rect:3,4', None, '12')                                    # non-kernel family


class GradingModeTests(LearningBase):
    def go(self, spec, response, rid):
        qid, comp, _ = spec
        comp = comp or generated(qid)['competency']
        return self.save(self.rec('attempt', questionId=qid, response=response, activity='diagnostic', hints=0, solution=False, competency=comp, id=rid))

    def body(self, rid):
        return next(e for e in self.records() if e['id'] == rid)

    @override_settings(OPENPATH_GRADING='shadow')
    def test_shadow_keeps_the_earlier_policy_authoritative_and_records_the_unified_decision_beside_it(self):
        self.save(self.enrol())
        self.go(RECT, '12.0', 's1')      # both policies: 12.0 is 12 -> correct
        self.go(RECT, 'twelve', 's2')    # earlier policy: unreadable -> unresolved; unified: unresolved (invalid response)
        self.go(MEAN, '3', 's3')
        b1, b2, b3 = self.body('s1'), self.body('s2'), self.body('s3')
        self.assertEqual((b1['decision']['policy'], b1['decision']['verdict'], b1['shadowDecision']['decidedBy']), ('legacy-policy@0', 'correct', 'shadow'))
        self.assertEqual(b1['shadowDecision']['policy'], 'grading-policy@1')
        self.assertEqual(b2['decision']['verdict'], 'unresolved')
        self.assertEqual((b3['decision']['verifier'], b3['decision']['verdict']), ('kernel-v1', 'correct'))
        self.assertTrue(credited(generated(RECT[0]), b1))   # replay uses the authoritative (earlier-policy) decision, never the shadow

    @override_settings(OPENPATH_GRADING='legacy')
    def test_legacy_records_no_shadow(self):
        self.save(self.enrol())
        self.go(RECT, '12', 'l1')
        b = self.body('l1')
        self.assertNotIn('shadowDecision', b)
        self.assertEqual((b['decision']['policy'], b['decision']['verdict']), ('legacy-policy@0', 'correct'))

    @override_settings(OPENPATH_GRADING='unified')
    def test_unified_records_grading_policy_1(self):
        self.save(self.enrol())
        self.go(RECT, '12', 'u1')
        b = self.body('u1')
        self.assertNotIn('shadowDecision', b)
        self.assertEqual((b['decision']['policy'], b['decision']['verdict']), ('grading-policy@1', 'correct'))

    @override_settings(OPENPATH_GRADING='shadow')
    def test_quarantine_applies_in_shadow_mode(self):
        self.save(self.enrol())
        q = 'gen:adexp:9,8,5,7:w'
        self.save(self.rec('attempt', questionId=q, response=generated(q)['answer'], activity='transfer', hints=0, solution=False, competency=generated(q)['competency'], id='q1'))
        self.assertEqual(self.body('q1')['decision']['reason'], 'unresolved.quarantined')

    @override_settings(OPENPATH_GRADING='shadow')
    def test_the_shadow_comparison_report_classifies_every_difference(self):
        self.save(self.enrol())
        for rid, r in [('a', '12'), ('b', '24/2'), ('c', '13'), ('d', 'twelve')]:
            self.go(RECT, r, rid)
        with tempfile.NamedTemporaryFile(suffix='.json') as f:
            call_command('compare_shadow', '--out', f.name, stdout=io.StringIO())
            rep = json.load(open(f.name))
        self.assertEqual(rep['summary']['compared'], 4)
        self.assertEqual(sum(rep['summary']['differences'].values()), rep['summary']['different'])
        self.assertNotIn('unclassified', rep['summary']['differences'])


class UnifiedNeverUsesLegacyComparison(LearningBase):
    """stage 10: grading-policy@1 never calls the retired Python comparison (family/legacy_grading.py) on any route"""

    @override_settings(OPENPATH_GRADING='unified')
    def test_no_call_on_the_unified_path(self):
        from unittest import mock
        from . import learning
        boom = mock.Mock(side_effect=AssertionError('the retired comparison was called on the unified path'))
        with mock.patch.object(learning, 'right', boom), mock.patch.object(learning, '_answer_ok', boom), mock.patch.object(learning, 'canonical', boom):
            self.save(self.enrol())
            cases = [(MEAN, '3'), (MEAN, '4'), (MEAN, 'three'), (RECT, '12'), (RECT, '1/0'), (('gen:aeeven:0', None, ''), '12, 28, 194, 310'), (('gen:rect:3,4:mc', None, ''), 'B')]
            for i, ((qid, comp, _), response) in enumerate(cases):
                comp = comp or generated(qid)['competency']
                r = self.save(self.rec('attempt', questionId=qid, response=response, activity='diagnostic', hints=0, solution=False, competency=comp, id=f'n{i}'))
                self.assertEqual(r.status_code, 201, (qid, response, r.content[:200]))
            got = [e for e in self.records() if e.get('record') == 'attempt']
            self.assertEqual(len(got), len(cases))
            self.assertTrue(all(e['decision']['policy'] == 'grading-policy@1' for e in got))
            self.assertEqual(boom.call_count, 0)
