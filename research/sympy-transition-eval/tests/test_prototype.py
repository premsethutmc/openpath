"""Prototype tests. Run from the repo root:
    python3 -m unittest discover -s research/sympy-transition-eval/tests -v
Requires SymPy 1.14.0 (pinned in tools/mathematics/engine-trial/requirements.txt)."""
import os, sys, unittest, json, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "verifier"))
from transition import verify_transition as vt  # noqa: E402
from safe_parse import parse_statement, Unreadable, Ambiguous  # noqa: E402
import cases  # noqa: E402
from service import VerifierClient  # noqa: E402


class MandatedExamples(unittest.TestCase):
    def test_square_root_loses_solution(self):
        r = vt("x^2 = 9", "x = 3", task="solve")
        self.assertEqual(r.verdict, "invalid")
        self.assertEqual(r.counterexample, {"x": "-3"})

    def test_rational_cancellation_needs_restriction(self):
        r = vt("(x^2-1)/(x-1)", "x+1", task="expression")
        self.assertEqual(r.verdict, "implication")
        self.assertTrue(r.required_restrictions)
        self.assertEqual(vt("(x^2-1)/(x-1)", "x+1", task="expression", assumptions=["x != 1"]).verdict, "equivalent")

    def test_scaling_an_equation_is_equivalent(self):
        self.assertEqual(vt("x+2 = 5", "2x+4 = 10", task="solve").verdict, "equivalent")


class Soundness(unittest.TestCase):
    def test_squaring_is_one_way(self):
        self.assertEqual(vt("sqrt(x+2)=x", "x+2=x^2", task="solve").verdict, "implication")

    def test_inequality_sign(self):
        self.assertEqual(vt("-2x<6", "x<-3", task="solve").verdict, "invalid")
        self.assertEqual(vt("-2x<6", "x>-3", task="solve").verdict, "equivalent")

    def test_domain_narrowing_is_caught(self):
        self.assertEqual(vt("ln(x^2)", "2ln(x)", task="expression").verdict, "invalid")
        self.assertEqual(vt("ln(x^2)", "2ln(x)", task="expression", assumptions=["x > 0"]).verdict, "equivalent")

    def test_no_silent_assumptions(self):
        self.assertEqual(vt("sqrt(x^2)", "x", task="expression").verdict, "invalid")

    def test_agreement_at_sample_points_is_not_equivalence(self):
        # differs from 0 everywhere except at every point the counterexample search tries
        from transition import CANDIDATES
        pts = sorted({str(c) for c in CANDIDATES})
        poly = "*".join(f"(x-({p}))" for p in pts)
        r = vt("x", f"x + {poly}", task="expression")
        self.assertNotEqual(r.verdict, "equivalent")

    def test_failure_to_simplify_is_not_invalidity(self):
        r = vt("sin(x)^2 + cos(x)^2 + exp(sin(x)^7*cos(x)^9)", "1 + exp(sin(x)^7*cos(x)^9)", task="expression")
        self.assertIn(r.verdict, ("equivalent", "unresolved"))

    def test_ambiguous_notation_refused(self):
        for t in ("1/2x = 4", "6/2(1+2)", "log 100 = 2"):
            with self.assertRaises(Ambiguous):
                parse_statement(t)


class HostileInput(unittest.TestCase):
    def test_no_code_execution(self):
        marker = os.path.join(tempfile.gettempdir(), "sympy_eval_marker")
        if os.path.exists(marker):
            os.remove(marker)
        for t in [f"__import__('os').system('touch {marker}')", "x.__class__", "().__class__.__bases__", "lambda: 1", "exec('1')"]:
            r = vt("x=1", t, task="solve")
            self.assertEqual(r.verdict, "unresolved", t)
        self.assertFalse(os.path.exists(marker))

    def test_resource_bounds(self):
        for t in ("x = 9^9^9^9", "x = " + "9" * 60, "x" + "+x" * 400):
            with self.assertRaises(Unreadable):
                parse_statement(t)

    def test_client_timeout_is_unresolved(self):
        c = VerifierClient(timeout_s=0.001)
        r = c.call("transition", {"prev": "x^2-5x+6=0", "next": "x=2 or x=3", "task": "solve"})
        c.close()
        self.assertEqual(r["result"]["verdict"], "unresolved")


class CaseAdapter(unittest.TestCase):
    def run_case(self, statement, text):
        return cases.assess_case({"domain": "algebra", "statement": statement}, {"format": "natural", "text": text})["verdict"]

    def test_verified_and_invalid(self):
        self.assertEqual(self.run_case("x^2-5x+6=0", "(x-2)(x-3)=0\nx=2 or x=3"), "verified")
        self.assertEqual(self.run_case("x^2=9", "x=3"), "invalid")

    def test_extraneous_root_needs_check(self):
        self.assertEqual(self.run_case("sqrt(x+2)=x", "x+2=x^2\n(x-2)(x+1)=0\nx=2"), "missing-assumption")
        self.assertEqual(self.run_case("sqrt(x+2)=x", "x+2=x^2\n(x-2)(x+1)=0\nx=2 or x=-1\ncheck x=-1: sqrt(1)=1, rejected\nx=2"), "verified")

    def test_cleared_denominator_needs_restriction(self):
        self.assertEqual(self.run_case("1/x+1/(x+1)=1", "2x+1=x^2+x\nx^2-x-1=0\nx=(1±sqrt(5))/2"), "missing-assumption")

    def test_right_value_from_unrelated_arithmetic_not_credited(self):
        self.assertNotEqual(self.run_case("4x-8=0", "4x=8\nx=8-6\nx=2"), "verified")

    def test_determinism(self):
        a = [self.run_case("|2x-1|=5", "2x-1=5 or 2x-1=-5\nx=3 or x=-2") for _ in range(3)]
        self.assertEqual(len(set(a)), 1)


if __name__ == "__main__":
    unittest.main()
