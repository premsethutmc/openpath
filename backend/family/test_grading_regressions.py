"""Permanent regression fixtures from the curriculum grading audit (MATH_CURRICULUM_GRADING_AUDIT_REPORT.md) for the server route.
An open defect is an expectedFailure: when it is fixed the runner reports an unexpected success, and the decorator is removed in
the same change. Verdicts follow the unified policy: an invalid submission is unresolved (never incorrect), and the server agrees
with the app on the same submission."""
import unittest

from django.test import SimpleTestCase

from . import learning
from .learning_families import generated

NEUTRAL = {'policy': 'assessment@1', 'answerCorrect': None, 'methodExamined': False, 'derivationVerified': False, 'firstError': None,
           'clarificationRequired': False, 'aiFallbackUsed': False, 'unresolved': False, 'source': 'legacy'}


def verdict(qid, response):
    """the server's decision on one attempt, as checked_learning makes it: True / False / None (unresolved)"""
    q = generated(qid)
    readable = learning._answer_ok(q['type'], response)
    event = {'questionId': qid, 'response': response, 'working': [], 'assessment': dict(NEUTRAL)}
    a = learning._authoritative(event, q, readable)
    if a and a.get('unresolved'):
        return None
    return learning.credited(q, {**event, 'assessment': a} if a else event)


class Controls(SimpleTestCase):
    def test_stored_and_wrong_answers(self):
        self.assertIs(verdict('gen:aeeven:0', '12,28,194,310'), True)
        self.assertIs(verdict('gen:aeeven:0', '12, 28, 194'), False)
        self.assertIs(verdict('gen:aeeven:0', 'twelve'), None)


class OpenDefects(SimpleTestCase):
    def test_D01_division_by_zero_in_a_set_is_unresolved(self):  # fixed in stage 4 (the server runs the strict parser)
        self.assertIsNone(verdict('gen:aeeven:0', '1/0'))  # the app leaves it unresolved; the server marks it incorrect

    def test_D01_a_repeated_element_is_decided_as_the_app_decides(self):
        # fixed in stage 4. Expected value revised from None (the app's Phase A verdict) to True: under approved policy P2 a set written with a
        # repeated element is the same set, and no form rule of this question forbids it; the server and the app now give that one verdict
        self.assertIs(verdict('gen:aeeven:0', '12, 28, 194, 310, 12'), True)

    def test_D09_a_held_question_is_not_credited_by_the_legacy_fallback(self):  # fixed in Phase C stage 1 (question-status@1)
        self.assertIsNone(verdict('gen:adexp:9,8,5,7:w', '9857'))  # the app never decides a held question; the server credits it
