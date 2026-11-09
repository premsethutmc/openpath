import json
import unittest
from audit_tn_mappings import REVIEW, FAMILIES, audit, load_outcomes
from validate_tn_primary import INTAKE, validate

class MappingTests(unittest.TestCase):
    def setUp(self):
        self.review = json.loads(REVIEW.read_text())
        self.outcomes = load_outcomes()
        self.families = {f['id']: f for f in json.loads(FAMILIES.read_text())['families']}

    def run_audit(self):
        return audit(self.review, self.outcomes, self.families)

    def test_every_observed_outcome_reviewed(self):
        self.assertEqual(self.run_audit(), {'aligned': 96, 'partial': 43, 'unmatched': 5})

    def test_unknown_family_rejected(self):
        self.review['outcomes'][0]['familyIds'] = ['invented-family']
        with self.assertRaisesRegex(ValueError, 'unknown or duplicate family'):
            self.run_audit()

    def test_stale_statement_rejected(self):
        next(iter(self.outcomes.values()))['statement'] += ' Changed scope.'
        with self.assertRaisesRegex(ValueError, 'stale statement'):
            self.run_audit()

    def test_wrong_competency_rejected(self):
        self.review['outcomes'][0]['competencyIds'] = ['MATH.number.addition']
        with self.assertRaisesRegex(ValueError, 'family/competency mismatch'):
            self.run_audit()

    def test_missing_review_rejected(self):
        self.review['outcomes'].pop()
        with self.assertRaisesRegex(ValueError, 'omits observed'):
            self.run_audit()

    def test_accepted_mapping_rejected(self):
        self.review['outcomes'][0]['status'] = 'accepted'
        with self.assertRaisesRegex(ValueError, 'provisional'):
            self.run_audit()

    def test_changed_catalogue_rejected(self):
        self.review['capabilitySourceSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'catalogue changed'):
            self.run_audit()

    def test_term2_count_and_offset(self):
        data = json.loads(INTAKE.with_name('tn-primary-2026-term2.json').read_text())
        self.assertEqual(validate(data), {1: 20, 2: 20, 3: 24})
        data['books'][0]['source']['printedToPdfOffset'] = 7
        with self.assertRaisesRegex(ValueError, 'page offset'):
            validate(data)

if __name__ == '__main__':
    unittest.main()
