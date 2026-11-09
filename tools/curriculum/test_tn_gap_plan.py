import json, pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
class GapPlanTest(unittest.TestCase):
 def test_exact_gaps_and_hashes(self):
  p=ROOT/'content/learning/ingestion'
  baseline={x['outcomeId']:x for x in json.loads((p/'tn-primary-mapping-review.json').read_text())['outcomes'] if x['fit']!='aligned'}
  plan=json.loads((p/'tn-primary-gap-plan.json').read_text()); rows=plan['outcomes']
  self.assertEqual(len(rows),48);self.assertEqual({x['outcomeId'] for x in rows},set(baseline));self.assertFalse(plan['educatorReviewed'])
  self.assertEqual(sum(x['status']=='draft-prototype-partial' for x in rows),2)
  for x in rows:
   self.assertEqual(x['statementSha256'],baseline[x['outcomeId']]['statementSha256'])
   self.assertEqual(x['baselineFit'],baseline[x['outcomeId']]['fit'])
   for field in ['skill','teachingNeeded','questionsNeeded','visualsNeeded','acceptance']:self.assertTrue(x[field])
if __name__=='__main__':unittest.main()
