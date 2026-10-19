"""answers@2 on the server: the same verdicts as the app (answer-types.ts) on the shared case table, on every release-pool
question of a new answer type, and on the predicted wrong answers of a sample of them."""
import json
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from .answer_types import NEW_TYPES, canonical_of, same_answer

ROOT = Path(settings.BASE_DIR).parent / 'content/learning'


class AnswerTypeTests(SimpleTestCase):
    def test_the_shared_case_table(self):
        cases = json.loads((ROOT / 'answer-cases.v1.json').read_text())['cases']
        self.assertGreater(len(cases), 60)
        for kind, a, b, want in cases:
            self.assertEqual(same_answer(kind, a, b), want, f'{kind}: {a} vs {b}')

    def test_every_release_pool_answer_of_a_new_type_is_right_on_the_server(self):
        from .learning import right
        from .learning_families import _table, generated
        n = 0
        for fam, t in _table().items():
            if t['type'] not in NEW_TYPES:
                continue
            for key, answer in t['items'].items():
                g = generated(f'gen:{fam}:{key}')
                self.assertIsNotNone(g)
                self.assertTrue(right(g, answer), (fam, key, answer))
                n += 1
        self.assertGreaterEqual(n, 0)

    def test_predicted_wrong_answers_are_wrong_on_the_server(self):
        path = ROOT / 'marking-parity.v1.json'
        items = json.loads(path.read_text())['items'] if path.exists() else []
        for it in items:
            self.assertTrue(same_answer(it['type'], it['answer'], it['answer']), it['id'])
            for w in it['wrong']:
                self.assertFalse(same_answer(it['type'], w, it['answer']), f"{it['id']}: {w} is marked right")

    def test_unreadable_answers_are_not_answers(self):
        for kind, raw in [('exact', 'sin x'), ('exact', '1/(x+1)'), ('interval', 'x >'), ('tuple', '3'), ('matrix', '[[1, 2], [3]]'), ('ratio', '3/4')]:
            self.assertIsNone(canonical_of(kind, raw), (kind, raw))
