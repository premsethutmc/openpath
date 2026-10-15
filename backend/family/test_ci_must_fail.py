"""TEMPORARY (branch tmp/ci-must-fail-proof only, never merged): proves a failing backend test fails CI."""
from django.test import SimpleTestCase


class DeliberateFailure(SimpleTestCase):
    def test_deliberately_fails(self):
        self.assertEqual(1, 2, "deliberate failure: CI must report this job as failed")
