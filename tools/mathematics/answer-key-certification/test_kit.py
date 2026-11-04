"""Self-tests of the certification harness: it must flag wrong keys, incomplete sets and wrong forms, and must not pass a lying reference silently."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402


def q(typ, ans, prompt='', **k):
    return {'id': 'gen:t:1', 'params': [1], 'prompt': prompt, 'type': typ, 'answer': ans, **k}


class KitTests(unittest.TestCase):
    def test_equal_values_pass_in_any_notation(self):
        self.assertEqual(kit.compare(q('fraction', '3/4'), kit.Expect('0.75'))[0], 'ok')
        self.assertEqual(kit.compare(q('integer', '12'), kit.Expect('24/2'))[0], 'ok')

    def test_wrong_key_is_a_mismatch(self):
        self.assertEqual(kit.compare(q('integer', '13'), kit.Expect('12'))[0], 'mismatch')
        self.assertEqual(kit.compare(q('fraction', '2/3'), kit.Expect('3/2'))[0], 'mismatch')

    def test_incomplete_solution_set(self):
        self.assertEqual(kit.compare(q('set', '2'), kit.Expect('2, 3'))[0], 'incomplete')
        self.assertEqual(kit.compare(q('set', '2, 3'), kit.Expect('3, 2'))[0], 'ok')
        self.assertEqual(kit.compare(q('set', '2, 3, 4'), kit.Expect('2, 3'))[0], 'mismatch')

    def test_required_form(self):
        self.assertEqual(kit.compare(q('fraction', '2/4'), kit.Expect('1/2', form=True))[0], 'form')
        self.assertEqual(kit.compare(q('fraction', '1/2'), kit.Expect('1/2', form=True))[0], 'ok')

    def test_expressions_and_antiderivatives(self):
        self.assertEqual(kit.compare(q('expression', 'x^2+2x+1'), kit.Expect('(x+1)^2'))[0], 'ok')
        self.assertEqual(kit.compare(q('expression', 'x^2+2x+2'), kit.Expect('(x+1)^2'))[0], 'mismatch')
        self.assertEqual(kit.compare(q('antiderivative', 'x^3/3 + C'), kit.Expect('x^3/3'))[0], 'ok')
        self.assertEqual(kit.compare(q('antiderivative', 'x^3/3 + x + C'), kit.Expect('x^3/3'))[0], 'mismatch')

    def test_sample_is_deterministic_and_covers_extremes(self):
        items = [{'params': [i, 100 - i]} for i in range(1000)]
        a, b = kit.sample_indices(items, 50), kit.sample_indices(items, 50)
        self.assertEqual(a, b)
        self.assertTrue({0, 999} <= set(a))

    def test_runner_flags_a_lying_reference(self):
        import certify
        import tempfile
        d = tempfile.mkdtemp()
        os.makedirs(f'{d}/q')
        with open(f'{d}/q/fake.jsonl', 'w') as f:
            for n in range(5):
                f.write(json.dumps(q('integer', str(n * 2), params=[n], id=f'gen:fake:{n}')) + '\n')

        @kit.ref('fake', method='test')
        def fake(item):  # deliberately wrong for n == 3
            n = item['params'][0]
            return kit.Expect(str(n * 2 + (1 if n == 3 else 0)))
        res = certify.run_family(d, 'fake', 60)
        self.assertEqual((res['ok'], res['mismatch']), (4, 1))
        self.assertEqual(res['mismatchIds'], ['gen:fake:3'])
        del kit.REFS['fake']


if __name__ == '__main__':
    unittest.main()
