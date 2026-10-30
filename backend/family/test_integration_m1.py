"""Integration M1 boundary: the Django server's grader (the real Node bundle) decides the slice question exactly as the in-page slice's
gradeRequest does (frontend/src/journey/slice.test.ts asserts the same pairs). No scripted outcomes: real Node, real bundle."""
import unittest

from . import kernel_grader as kg

Q = 'gen:lin:2,17,11'  # Solve 2x + 17 = 39. What is x?  ->  11


@unittest.skipUnless(kg.enabled(), 'needs Node and the grader bundle')
class SliceBoundary(unittest.TestCase):
    def test_modelled_wrong_answer_is_incorrect_with_a_server_decision(self):
        d = kg.grader_decision(Q, '22', '11')
        self.assertEqual((d['credit'], d['verdict']), (False, 'incorrect'))
        self.assertEqual(d['decision']['schema'], 'grading-decision@1')

    def test_right_answer_is_correct(self):
        d = kg.grader_decision(Q, '11', '11')
        self.assertEqual((d['credit'], d['verdict']), (True, 'correct'))

    def test_a_mismatched_stored_answer_is_not_decided(self):
        self.assertIsNone(kg.grader_decision(Q, '11', '12'))

    def test_the_bundle_is_the_recorded_one(self):
        self.assertTrue(kg.bundle_intact())
