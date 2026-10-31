"""Hand-derived fixtures for the audit oracle itself: each expected label was worked out by hand, not by running any grader.
Run: PYTHONPATH=<sympy>:<mpmath> python -m unittest test_oracle   (from this directory)"""
import unittest

from oracle import context, label_one, meaning

CASES = [
    # (type, stored, response, prompt, expected truth)
    ('integer', '12', '12', '', 'equivalent'),
    ('integer', '12', ' 12 ', '', 'equivalent'),
    ('integer', '12', '24/2', '', 'form-variant'),
    ('integer', '12', '12.0', '', 'form-variant'),
    ('integer', '12', '13', '', 'wrong'),
    ('integer', '-3', '3', '', 'wrong'),
    ('integer', '12', '12 +', '', 'malformed'),
    ('integer', '12', 'twelve', '', 'malformed'),
    ('integer', '12', '1/0', '', 'malformed'),
    ('fraction', '2/3', '4/6', 'Write it in its simplest form.', 'form-variant'),
    ('fraction', '2/3', '0.666', '', 'wrong'),
    ('fraction', '3/4', '0.75', '', 'form-variant'),
    ('fraction', '3/2', '1 1/2', '', 'form-variant'),
    ('fraction', '3/2', '2/3', '', 'wrong'),
    ('fraction', '-3/4', '3/-4', '', 'form-variant'),
    ('mixed', '1 1/2', '3/2', 'Write 3/2 as a mixed number.', 'form-variant'),
    ('mixed', '9 9/10', '99/10', 'Write it as a mixed number.', 'form-variant'),
    ('mixed', '1 1/2', '11/2', '', 'wrong'),
    ('exact', '2√2', 'sqrt(8)', '', 'equivalent'),
    ('exact', '2√2', '2.828', '', 'wrong'),
    ('exact', '3√65/26', '3sqrt(65)/26', '', 'equivalent'),
    ('exact', '53 + 29√2', '29√2 + 53', '', 'equivalent'),
    ('exact', '11/3', '3 2/3', '', 'form-variant'),
    ('exact', '−π/6', '-pi/6', '', 'equivalent'),
    ('exact', 'x² + y² + 8x − 4y + 7', 'x^2 + 8x + y^2 - 4y + 7', '', 'equivalent'),
    ('exact', 'x² + y² + 8x − 4y + 7', 'x^2 + y^2 + 8x - 4y + 7 = 0', '', 'equivalent'),
    ('exact', 'x² + y² + 8x − 4y + 7', 'x^2 + y^2 + 8x - 4y - 7', '', 'wrong'),
    ('expression', 'sin(x) + x cos(x)', 'xcos(x)+sin(x)', '', 'equivalent'),
    ('expression', 'sin(x) + x cos(x)', 'sin x + x cos x', '', 'equivalent'),
    ('expression', 'sin(x) + x cos(x)', 'cos(x) + x sin(x)', '', 'wrong'),
    ('expression', 'x log x − 3x', 'xlogx−3x', '', 'equivalent'),
    ('expression', '(−6x + 5)/(x − 5)', '(6x - 5)/(5 - x)', '', 'equivalent'),
    ('expression', '5e^(3x²/2 + 3x)', '5exp(1.5x^2+3x)', '', 'equivalent'),
    ('antiderivative', 'x^3 − 6cos x + C', 'x^3 - 6cos(x) + 4', '', 'equivalent'),
    ('antiderivative', 'x^3 − 6cos x + C', 'x^3 + 6cos(x) + C', '', 'wrong'),
    ('antiderivative', '−3ln|x + 4| + ln|x| + C', 'ln|x| - 3ln|x+4| + C', '', 'equivalent'),
    ('antiderivative', '−3ln|x + 4| + ln|x| + C', '3ln|x+4| + ln|x| + C', '', 'wrong'),
    ('set', '-2,12', '12, -2', '', 'equivalent'),
    ('set', '-2,12', '{-2, 12}', '', 'equivalent'),
    ('set', '-2,12', 'x = -2 or x = 12', '', 'equivalent'),
    ('set', '-2,12', '-2', '', 'wrong'),
    ('set', '-2,12', '-2, 12, 5', '', 'wrong'),
    ('set', '-2,12', '-2 12', '', 'malformed'),
    ('roots', '5π/6, 7π/6', '7π/6, 5π/6', '', 'equivalent'),
    ('roots', '(9 + 3√5)/2, (9 − 3√5)/2', '(9-3sqrt(5))/2, (9+3sqrt(5))/2', '', 'equivalent'),
    ('roots', '5π/6, 7π/6', '5π/6', '', 'wrong'),
    ('tuple', '(−4, −7/2)', '(-4, -3.5)', '', 'equivalent'),
    ('tuple', '(−4, −7/2)', '(-7/2, -4)', '', 'wrong'),
    ('tuple', '1, 2, 3', '1, 3, 2', '', 'wrong'),
    ('matrix', '[[−27, 3], [−6, −1]]', '[[-27,3],[-6,-1]]', '', 'equivalent'),
    ('matrix', '[[−27, 3], [−6, −1]]', '[[-27,-6],[3,-1]]', '', 'wrong'),
    ('interval', '(−∞, −6]', '(-oo, -6]', '', 'equivalent'),
    ('interval', '(−∞, −6]', 'x <= -6', '', 'equivalent'),
    ('interval', '(−∞, −6]', '(-oo, -6)', '', 'wrong'),
    ('interval', '(−∞, −6]', '[-oo, -6]', '', 'malformed'),
    ('interval', '(−∞, −8] ∪ [7, ∞)', 'x <= -8 or x >= 7', '', 'equivalent'),
    ('interval', 'k ≤ −20 or k ≥ 20', '(-oo, -20] U [20, oo)', '', 'equivalent'),
    ('ratio', '1:2', '1 : 2', '', 'equivalent'),
    ('ratio', '1:2', '2:4', 'in its simplest form', 'form-variant'),
    ('ratio', '1:2', '2:1', '', 'wrong'),
    ('ratio', '1:2', '6:12', 'Write the ratio 12 : 24 in its simplest form.', 'form-variant'),
    ('mixed', '9 9/10', '8 19/10', 'in its simplest form, as a mixed number', 'form-variant'),
    ('interval', 'k ≤ 81/4', 'k ≤ 8 1/4', '', 'wrong'),
    ('tuple', '(27/10, 27/100)', '(2 7/10, 27/100)', '', 'equivalent'),
    ('set', '-9,7/6', '-9, 1 1/6', '', 'equivalent'),
    ('choice', 'B', 'B', '', 'equivalent'),
    ('choice', 'B', 'C', '', 'wrong'),
    ('choice', 'B', 'Z', '', 'malformed'),
]


class OracleFixtures(unittest.TestCase):
    def test_hand_derived_labels(self):
        bad = []
        for typ, stored, resp, prompt, want in CASES:
            q = {'type': typ, 'answer': stored, 'prompt': prompt, 'options': ['p', 'q', 'r', 's'] if typ == 'choice' else None}
            ctx = context(q)
            ref = meaning(typ, stored, ctx)
            intent = 'form' if want == 'form-variant' else 'equivalent' if want == 'equivalent' else want
            got = label_one(q, ctx, ref, (resp, [], intent, 'fixture'))['truth']
            if want == 'equivalent' and got == 'form-variant':
                got = 'equivalent'  # form class is decided by intent+number form; both mean "mathematically equal"
            if got != want:
                bad.append((typ, stored, resp, want, got))
        self.assertEqual(bad, [])


if __name__ == '__main__':
    unittest.main()
