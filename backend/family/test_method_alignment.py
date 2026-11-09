"""New policy metadata round-trips; historical teaching and malformed policy are distinct."""
from .test_learning import LearningBase

class MethodAlignmentRecords(LearningBase):
    def test_new_legacy_and_invalid_policy(self):
        args = dict(competency='MATH.calculus.derivatives', strategy='expand_cancel', rule='procedural')
        self.assertEqual(self.save(self.rec('teach', **args)).status_code, 201)
        policy = 'method-alignment@1:' + 'a' * 64
        self.assertEqual(self.save(self.rec('teach', methodAlignment=policy, **args)).status_code, 201)
        self.assertEqual(self.records()[-1]['methodAlignment'], policy)
        self.assertNotIn('methodAlignment', self.records()[-2])
        for value in ['approved', 'method-alignment@2:' + 'a' * 64, {'approved': True}]:
            self.assertEqual(self.save(self.rec('teach', methodAlignment=value, **args)).status_code, 400)
