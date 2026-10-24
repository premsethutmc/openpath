"""The benchmark runner (no Django, no network): dry run by default, approval and cap required, the cap stops the run,
failures are recorded, the key is never written, rewrite consistency is measured.

Runs with plain unittest (python -m unittest evaluation.test_benchmark_run) and under Django's test runner."""

import json
import tempfile
import unittest
from pathlib import Path

from evaluation import benchmark_run as br

KEY = "sk-test-SECRET-456"
ENV = {"OPENPATH_LLM_PROVIDER": "anthropic", "OPENPATH_LLM_MODEL": "test-model", "OPENPATH_LLM_BASE_URL": "https://llm.example.test", "OPENPATH_LLM_API_KEY": KEY}
REQUESTS = {
    "observe": [{"protocol": "essay-observe.v2", "essay": {"id": f"e{i}", "text": "My sister walk to school."}} for i in range(3)],
    "rewrite": [{"protocol": "essay-rewrite.v2", "rewrite": {"id": "r1", "text": "My sister walks."}}],
}


class Fake:
    """Answers each call in turn from a list of (status, payload); the last entry repeats."""

    def __init__(self, answers):
        self.answers, self.calls = answers, []

    def __call__(self, url, headers, body, timeout):
        self.calls.append(json.loads(body))
        status, payload = self.answers[min(len(self.calls) - 1, len(self.answers) - 1)]
        return status, json.dumps(payload).encode()


def ok(obj, i=1000, o=200):
    return 200, {"content": [{"type": "text", "text": json.dumps(obj)}], "usage": {"input_tokens": i, "output_tokens": o}, "stop_reason": "end_turn"}


class BenchmarkRunTests(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        (self.dir / "req.json").write_text(json.dumps(REQUESTS))

    def args(self, *extra):
        return br.parser().parse_args(["--requests", str(self.dir / "req.json"), "--out-dir", str(self.dir / "out"), *extra])

    def test_dry_run_sends_nothing_and_estimates_cost(self):
        t = Fake([ok({})])
        r = br.run(self.args("--price-input", "2", "--price-output", "10"), transport=t, env=ENV)
        self.assertEqual((r["mode"], t.calls), ("dry-run", []))
        self.assertEqual(r["estimate"]["calls"], 3 + 3)  # three essays once, one rewrite three times
        self.assertGreater(r["estimate"]["cost_worst_case_usd"], r["estimate"]["cost_expected_usd"])
        self.assertFalse((self.dir / "out").exists())

    def test_live_run_is_refused_without_approval_prices_cap_or_key(self):
        for extra, env, why in [
            (["--live", "--price-input", "2", "--price-output", "10", "--max-cost-usd", "1"], ENV, "approved-by"),
            (["--live", "--approved-by", "owner", "--max-cost-usd", "1"], ENV, "price"),
            (["--live", "--approved-by", "owner", "--price-input", "2", "--price-output", "10"], ENV, "max-cost"),
            (["--live", "--approved-by", "owner", "--price-input", "2", "--price-output", "10", "--max-cost-usd", "1"], {**ENV, "OPENPATH_LLM_API_KEY": ""}, "key"),
        ]:
            t = Fake([ok({})])
            with self.assertRaises(SystemExit) as e:
                br.run(self.args(*extra), transport=t, env=env)
            self.assertIn(why, str(e.exception))
            self.assertEqual(t.calls, [])

    def test_live_run_records_answers_failures_usage_and_consistency_without_the_key(self):
        dims = lambda rating: {"dimensions": [{"dimension": "meaning_preservation", "rating": "mostly"}, {"dimension": "concision", "rating": rating}]}  # noqa: E731
        t = Fake([ok({"observations": []}), (400, {"type": "error", "error": {"type": "invalid_request_error", "message": "secret detail"}}), ok({"observations": []}), ok(dims("fully")), ok(dims("fully")), ok(dims("partly"))])
        r = br.run(self.args("--live", "--approved-by", "owner 2026-10-18", "--price-input", "2", "--price-output", "10", "--max-cost-usd", "5", "--retries", "0"), transport=t, sleep=lambda s: None, env=ENV)
        self.assertEqual((r["calls_made"], r["answered"], r["failed"]), (6, 5, 1))
        self.assertEqual((r["input_tokens"], r["output_tokens"]), (5000, 1000))
        self.assertAlmostEqual(r["cost_usd"], (5000 * 2 + 1000 * 10) / 1e6)
        self.assertEqual(r["rewrite_consistency"]["per_rewrite"]["r1"], {"repeats": 3, "dimensions": 2, "identical": 1, "share_identical": 0.5})
        rec = json.loads((self.dir / "out" / "recorded.json").read_text())
        self.assertEqual(sorted(rec["observations"]), ["e0", "e2"], "the failed essay is missing, so the scorer counts it")
        self.assertEqual(list(rec["rewrites"]), ["r1"])
        self.assertEqual(rec["evaluator"]["model"], "test-model")
        for f in (self.dir / "out").iterdir():
            text = f.read_text()
            self.assertNotIn(KEY, text, f.name)
            self.assertNotIn("secret detail", text, f.name)
        # the essay text itself is sent, exactly as the server's evaluator sends it
        self.assertEqual(json.loads(t.calls[0]["messages"][0]["content"])["essay"]["id"], "e0")
        self.assertTrue(t.calls[0]["system"].strip())
        self.assertNotIn("temperature", t.calls[0])

    def test_the_cap_stops_the_run_before_it_can_be_exceeded(self):
        t = Fake([ok({"observations": []}, i=1000, o=4000)])
        # each call's worst case is about (input + 4000 output tokens) at 10 USD/MTok output: ~0.04 USD; cap 0.1
        r = br.run(self.args("--live", "--approved-by", "owner", "--price-input", "2", "--price-output", "10", "--max-cost-usd", "0.1"), transport=t, sleep=lambda s: None, env=ENV)
        self.assertLess(r["calls_made"], 6)
        self.assertLessEqual(r["cost_usd"], 0.1)
        self.assertIn("stopped before", r["stopped"])

    def test_prompts_are_the_versioned_instructions(self):
        s = br.system_prompt("essay-observe.v2")
        self.assertTrue(s)
        self.assertNotIn("\nRequest:", s)


if __name__ == "__main__":
    unittest.main()
