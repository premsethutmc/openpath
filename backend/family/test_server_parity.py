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


if __name__ == '__main__':
    unittest.main()
