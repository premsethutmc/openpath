"""No provider calls or keys; fail-closed controls and source topology only."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import subprocess

path = Path(__file__).with_name('isolated_evaluator.py')
spec = importlib.util.spec_from_file_location('isolated', path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class Guards(unittest.TestCase):
    def setUp(self):
        self.env = dict(GITHUB_ACTIONS='true', GITHUB_REPOSITORY='premsethutmc/openpath',
                        GITHUB_REF='refs/heads/main', GITHUB_ACTOR='premsethutmc',
                        GITHUB_RUN_ATTEMPT='1', TEST_MODEL='test-model',
                        TEST_INPUT_PRICE='1', TEST_OUTPUT_PRICE='2',
                        OPENPATH_LLM_API_KEY='fake-test-only')
    def test_valid(self):
        self.assertEqual(mod.validate(self.env), ('test-model', [1.0, 2.0]))
    def test_identity_guards(self):
        for key in ('GITHUB_ACTIONS','GITHUB_REPOSITORY','GITHUB_REF','GITHUB_ACTOR','GITHUB_RUN_ATTEMPT'):
            with self.subTest(key=key), self.assertRaises(ValueError):
                mod.validate(dict(self.env, **{key:'unapproved'}))
    def test_prices(self):
        for value in ('nan','inf','0','-1','1001','not-a-price'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                mod.validate(dict(self.env, TEST_INPUT_PRICE=value))
    def test_no_shell_model(self):
        with self.assertRaises(ValueError):
            mod.validate(dict(self.env, TEST_MODEL='x;echo secret'))
    def test_no_key(self):
        with self.assertRaises(ValueError):
            mod.validate(dict(self.env, OPENPATH_LLM_API_KEY=''))
    def test_subprocess_error_does_not_echo_output(self):
        output = subprocess.CompletedProcess([], 1, b"fake-secret", b"fake-secret")
        with patch.object(mod.subprocess, "run", return_value=output), self.assertRaises(RuntimeError) as caught:
            mod.command(["never-run"], Path("."), {})
        self.assertNotIn("fake-secret", str(caught.exception))

    def test_topology(self):
        workflow = path.parents[2] / '.github/workflows/english-isolated-evaluator.yml'
        text = workflow.read_text()
        self.assertIn('workflow_dispatch:', text)
        self.assertNotIn('pull_request', text)
        self.assertNotIn('  push:', text)
        self.assertNotIn('uses:', text)  # no mutable third-party actions
        self.assertEqual(text.count('${{ secrets.'), 1)
        self.assertIn('contents: read', text)
        self.assertIn('environment: english-isolated-evaluation', text)
        source = path.read_text()
        self.assertIn("'--max-calls', '16', '--max-cost-usd', '0.25'", source)
        self.assertIn("OPENPATH_LLM_BASE_URL='https://api.openai.com/v1'", source)
        self.assertNotIn('shell=True', source)
        self.assertNotIn('upload-artifact', text)

if __name__ == '__main__':
    unittest.main()
