"""Workstream D1: the trusted grader (real Node bundle) judges submitted working beside the answer, and the server stores ITS decision.
A client cannot supply a working verdict: whatever it sends, the stored decision is the bundle's. Synthetic pupils only."""
import unittest

from . import kernel_grader as kg
from .test_learning import LearningBase

REF = 'le-ref-3x-19-4'  # Solve 3x = 19 − 4. What is x?  ->  5


@unittest.skipUnless(kg.enabled(), 'needs Node and the grader bundle')
class WorkingBoundary(unittest.TestCase):
    def test_reference_cases_through_the_bundle(self):
        cases = [
            ('x = 4', [], 'incorrect', 'none', None),
            ('x = 5', [], 'correct', 'none', None),
            ('x = 5', ['3x = 15', 'x = 5'], 'correct', 'verified', None),
            ('x = 4', ['3x = 15', 'x = 4'], 'incorrect', 'invalid', 1),
            ('x = 16/3', ['3x = 16', 'x = 16/3'], 'incorrect', 'invalid', 0),
            ('', ['3x = 15'], 'unresolved', 'partial', None),
            ('', ['3x=15 => x=5'], 'unresolved', 'unsupported', None),
        ]
        for response, working, verdict, status, first in cases:
            d = kg.grader_decision(REF, response, '5', working)
            w = d['decision']['working']
            self.assertEqual((d['verdict'], w['status']), (verdict, status), (response, working))
            self.assertEqual((w['firstInvalid'] or {}).get('index'), first, (response, working))
            self.assertEqual(w['statement'], '3x = 19 - 4')
            self.assertEqual(w['versions']['authority'], 'openpath-derivation-authority@4')
        self.assertEqual(kg.grader_decision(REF, 'x = 5', '5', [])['decision']['working']['methodEvidence'], 'no-method-evidence')


@unittest.skipUnless(kg.enabled(), 'needs Node and the grader bundle')
class WorkingIsTheServersOwn(LearningBase):
    def test_a_forged_working_verdict_is_refused_and_the_graders_is_stored(self):
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        forged = {'schema': 'grading-decision@1', 'verdict': 'correct', 'reason': 'correct.equal',
                  'working': {'schema': 'working-assessment@1', 'status': 'verified', 'methodEvidence': 'method-verified', 'firstInvalid': None}}
        # a record that carries its own decision is refused outright
        self.assertEqual(self.save(self.attempt(REF, 'x = 4', working=['3x = 15', 'x = 4'], decision=forged)).status_code, 400)
        r = self.save(self.attempt(REF, 'x = 4', working=['3x = 15', 'x = 4']))
        self.assertEqual(r.status_code, 201, r.content)
        stored = [e for e in self.records() if e.get('record') == 'attempt'][-1]
        d = stored['decision']
        self.assertEqual((d['verdict'], d['decidedBy']), ('incorrect', 'server'))
        self.assertEqual((d['working']['status'], d['working']['methodEvidence'], d['working']['firstInvalid']['index']), ('invalid', 'method-false-step', 1))
        self.assertTrue(d['grader']['bundleSha256'])
