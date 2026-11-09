"""Regression checks for provenance and false-completeness failures (stdlib only)."""
import copy
import json
import unittest
from validate_tn_primary import INTAKE, validate


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(INTAKE.read_text())
        self.book = self.data['books'][0]
        self.outcome = self.book['lessons'][0]['outcomes'][0]

    def test_actual_counts(self):
        self.assertEqual(validate(self.data), {1: 22, 2: 28, 3: 30})

    def test_wrong_pdf_offset_rejected(self):
        self.outcome['provenance']['pdfPages'][0] += 1
        with self.assertRaisesRegex(ValueError, 'PDF offset'):
            validate(self.data)

    def test_cross_source_evidence_rejected(self):
        self.outcome['provenance']['sourceId'] = 'different-edition'
        with self.assertRaisesRegex(ValueError, 'source reference'):
            validate(self.data)

    def test_outside_lesson_evidence_rejected(self):
        self.outcome['provenance']['printedPages'] = [100, 101]
        with self.assertRaisesRegex(ValueError, 'outside lesson'):
            validate(self.data)

    def test_duplicate_outcome_rejected(self):
        self.book['lessons'][0]['outcomes'].append(copy.deepcopy(self.outcome))
        with self.assertRaisesRegex(ValueError, 'duplicate outcome'):
            validate(self.data)

    def test_false_completeness_rejected(self):
        self.book['coverage']['status'] = 'complete'
        with self.assertRaisesRegex(ValueError, 'coverage'):
            validate(self.data)

    def test_silent_mapping_acceptance_rejected(self):
        self.outcome['mapped'] = ['MATH.number.addition']
        with self.assertRaisesRegex(ValueError, 'accept mappings'):
            validate(self.data)

    def test_false_educator_approval_rejected(self):
        self.outcome['educatorReviewed'] = True
        with self.assertRaisesRegex(ValueError, 'educator approval'):
            validate(self.data)

    def test_missing_lesson_rejected(self):
        self.book['lessons'].pop()
        with self.assertRaisesRegex(ValueError, 'contents inventory'):
            validate(self.data)


if __name__ == '__main__':
    unittest.main()
