"""Server stored-answer route vs the application, with no Django: the real `_answer_ok` and `right` of learning.py (Django/DRF imports are stubbed ONLY so the module loads).
The corpus holds every client/server disagreement the grading audit confirmed; each must now agree. This is not a Django endpoint test."""
import importlib
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

STUBS = ['django', 'django.conf', 'django.utils', 'django.utils.timezone', 'rest_framework', 'rest_framework.exceptions', 'family.models']
CORPUS = Path(__file__).resolve().parents[2] / 'tools' / 'mathematics' / 'grading-audit' / 'data' / 'server-parity-corpus.json'


class ServerParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = {m: sys.modules.get(m) for m in STUBS}
        for m in STUBS:
            sys.modules[m] = MagicMock()
        sys.modules['rest_framework.exceptions'].ValidationError = Exception
        sys.modules.pop('family.learning', None)
        cls.L = importlib.import_module('family.learning')

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop('family.learning', None)
        for m, v in cls.saved.items():
            if v is None:
                sys.modules.pop(m, None)
            else:
                sys.modules[m] = v

    def test_every_confirmed_disagreement_now_agrees(self):
        for c in json.loads(CORPUS.read_text()):
            q = {'type': c['type'], 'answer': c['stored']}
            self.assertTrue(self.L._answer_ok(c['type'], c['response']), c)
            self.assertEqual(bool(self.L.right(q, c['response'])), c['expect'], c)

    def test_wrong_and_unreadable_answers_are_still_refused(self):
        q = {'type': 'fraction', 'answer': '93/256'}
        self.assertFalse(self.L.right(q, '0.36328126'))
        self.assertFalse(self.L._answer_ok('fraction', '1/0'))
        self.assertFalse(self.L._answer_ok('fraction', '1' * 31))
        self.assertFalse(self.L._answer_ok('integer', 'abc'))

    def test_integer_answers_keep_the_apps_nine_digit_grammar(self):
        # integration gate: G2 widens fraction/set parts only; an integer answer is read exactly as the app's canonicalInteger reads it
        # (answer-core.ts, 9 digits + 9 decimals), so the server never credits an integer form the app refuses ("0000000005" for 5)
        q = {'type': 'integer', 'answer': '5'}
        for t in ['5', '+5', '-5', '5.0', '5.', '05', '000000005', '5.000000000']:
            self.assertTrue(self.L._answer_ok('integer', t), t)
        for t in ['0000000005', '5.0000000000', '1000000000', '1e3', '0x5', '--5', '5 5', '', '.5']:
            self.assertFalse(self.L._answer_ok('integer', t), t)
        self.assertTrue(self.L.right(q, '5.000000000'))
        self.assertFalse(self.L.right(q, '0000000005'))

    def test_fraction_and_set_parts_read_up_to_thirty_digits_and_no_more(self):
        d = lambda n: '1' + '0' * (n - 1)
        for t in [d(30), '-' + d(30), d(30) + '/2', '1/' + d(30), '0.' + '5' * 30, d(30) + ' 1/2']:
            self.assertTrue(self.L._answer_ok('fraction', t), t)
        for t in [d(31), '1/' + d(31), '0.' + '5' * 31, '1/0', '1/-0', '1e3', 'abc', '']:
            self.assertFalse(self.L._answer_ok('fraction', t), t)
        self.assertTrue(self.L.right({'type': 'fraction', 'answer': d(30) + '/2'}, '5' + '0' * 28))  # 10^29 / 2 = 5 x 10^28
        self.assertFalse(self.L.right({'type': 'fraction', 'answer': '1/2'}, '0.' + '5' * 30))  # close is not equal: exact rationals
        self.assertTrue(self.L._answer_ok('set', ','.join([d(30)] * 2)))
        self.assertFalse(self.L._answer_ok('set', ','.join([d(31)] * 2)))


if __name__ == '__main__':
    unittest.main()
