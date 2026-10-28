"""The trusted grader as the server uses it, with no Django: real Node, the real bundle, real generated questions."""
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from . import kernel_grader as kg

HAVE = kg.enabled()
DET = 'gen:det2:-3,1,1,1'      # |[[-3, 1], [1, 1]]| = -4
MEAN = 'gen:mean4:1,2,3,6'      # the mean of 1, 2, 3, 6 = 3
INV = 'gen:apinv2:-4,-4,-2,0'   # the inverse of [[-4, -4], [-2, 0]]


@unittest.skipUnless(HAVE, 'needs Node and the grader bundle')
class KernelGraderTests(unittest.TestCase):
    def test_the_bundle_is_the_one_recorded(self):
        self.assertTrue(kg.bundle_intact())

    def test_correct_equivalent_incorrect_and_unreadable(self):
        d = lambda q, r, s: kg.kernel_decision(q, r, s)
        self.assertEqual(d(DET, '-4', '-4')['credit'], True)
        self.assertEqual(d(DET, ' -4.0 ', '-4')['credit'], True)
        self.assertEqual(d(MEAN, '6/2', '3')['credit'], True)          # equal in value; not the integer 3 as written
        self.assertEqual(d(DET, '-5', '-4')['credit'], False)
        self.assertEqual(d(DET, '4', '-4')['credit'], False)           # the sign matters
        for text in ('abc', '1/0', '', '2..3', '(1,'):
            self.assertIsNone(d(DET, text, '-4')['credit'], text)      # undecided, never wrong
        stored = '[[0, −1/2], [−1/4, 1/2]]'
        self.assertEqual(d(INV, '[[0, -1/2], [-1/4, 1/2]]', stored)['credit'], True)
        self.assertEqual(d(INV, '((0,-0.5),(-0.25,0.5))', stored)['credit'], True)
        self.assertEqual(d(INV, '[[0, 1/2], [-1/4, 1/2]]', stored)['credit'], False)
        self.assertIsNone(d(INV, '[[0, -1/2], [-1/4]]', stored)['credit'])

    def test_working_does_not_change_the_credit(self):
        out = kg.run([{'id': DET, 'response': '-4', 'working': ['-3 + 1 = 99']}, {'id': DET, 'response': '-5', 'working': ['-3 - 1 = -4']}])
        self.assertEqual([x['credit'] for x in out], [True, False])

    def test_the_client_cannot_supply_the_contract_or_a_verdict(self):
        out = kg.run([{'id': DET, 'response': '-5', 'expected': '-5', 'credit': True, 'verification': 'verified', 'contract': {'x': 1}}])
        self.assertEqual((out[0]['credit'], out[0]['expected']), (False, '-4'))

    def test_a_stored_answer_that_differs_from_the_graders_expected_answer_is_refused(self):
        self.assertIsNone(kg.kernel_decision(DET, '-4', '-5'))       # the server's stored answer does not match: tampered or stale
        self.assertIsNotNone(kg.kernel_decision(DET, '-4', '-4'))

    def test_only_verified_generated_questions_are_answered(self):
        self.assertIsNone(kg.kernel_decision('gen:rect:3,4', '12', '12'))          # legacy family
        self.assertIsNone(kg.kernel_decision('q-not-generated', '12', '12'))
        self.assertIsNone(kg.kernel_decision('gen:nosuchfamily:1,2', '3', '3'))
        self.assertIsNone(kg.kernel_decision('gen:det2:1,1,1', '0', '0'))          # wrong parameter count
        self.assertIsNone(kg.kernel_decision('gen:det2:1;2', '0', '0'))
        self.assertIsNone(kg.kernel_decision(DET, 4, '-4'))

    def test_a_multiple_choice_form_is_graded_by_the_option(self):
        out = kg.run([{'id': 'gen:det2:-3,1,1,1:mc', 'response': 'A'}, {'id': 'gen:det2:-3,1,1,1:mc', 'response': 'B'}, {'id': 'gen:det2:-3,1,1,1:mc', 'response': 'Z'}])
        self.assertEqual({x['verification'] for x in out}, {'verified'})
        self.assertEqual(sum(1 for x in out[:2] if x['credit'] is True), 1)   # exactly one of A and B is the right option
        self.assertIsNone(out[2]['credit'])

    def test_a_tampered_bundle_is_never_run(self):
        with tempfile.TemporaryDirectory() as d:
            bad = Path(d) / 'grader.mjs'
            shutil.copy(kg.BUNDLE, bad)
            shutil.copy(kg.MANIFEST, Path(d) / 'grader.manifest.json')
            bad.write_text(bad.read_text() + '\nprocess.stdout.write("[]")\n')
            kg.bundle_intact.cache_clear()
            try:
                with mock.patch.object(kg, 'BUNDLE', bad), mock.patch.object(kg, 'MANIFEST', Path(d) / 'grader.manifest.json'):
                    self.assertFalse(kg.bundle_intact())
                    self.assertIsNone(kg.kernel_decision(DET, '-4', '-4'))
            finally:
                kg.bundle_intact.cache_clear()
        self.assertTrue(kg.bundle_intact())

    def test_switched_off_or_broken_graders_fall_back_to_the_caller(self):
        with mock.patch.dict(os.environ, {'OPENPATH_GRADER': 'off'}):
            self.assertIsNone(kg.kernel_decision(DET, '-4', '-4'))
        with mock.patch.object(kg, 'run', return_value=[{'v': 1, 'id': DET, 'verification': 'verified', 'credit': 'yes', 'expected': '-4', 'capability': 'x'}]):
            self.assertIsNone(kg.kernel_decision(DET, '-4', '-4'))     # a credit that is not true/false/null is refused
        with mock.patch.object(kg, 'run', return_value=None):
            self.assertIsNone(kg.kernel_decision(DET, '-4', '-4'))

    def test_the_stored_answers_of_every_verified_question_match_the_generated_table(self):
        table = json.loads((Path(__file__).resolve().parents[2] / 'content/learning/generated.v1.json').read_text())['families']
        ids = [('det2', '-3,1,1,1'), ('apinv2', '-4,-4,-2,0'), ('mean4', '1,2,3,6')]
        for fam, key in ids:
            reply = kg.run([{'id': f'gen:{fam}:{key}', 'response': '0'}])[0]
            self.assertEqual(reply['expected'], table[fam]['items'][key])


if __name__ == '__main__':
    unittest.main()
