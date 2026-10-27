from __future__ import annotations
import hashlib,json,unittest
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).parents[1]
class ExternalCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/"benchmark/external_geometry_proofs_v1.json").read_text())
        cls.results=json.loads((ROOT/"benchmark/external_proof_results.json").read_text())
    def test_licensed_distinct_external_proofs(self):
        cases=self.data["cases"]
        self.assertEqual(len(cases),173);self.assertEqual(len({x["source_path"] for x in cases}),173)
        self.assertEqual(self.data["source"]["license"],"MIT");self.assertIn("Copyright (c) 2024 Logan Murphy",self.data["source"]["license_text"])
        self.assertEqual(Counter(x["source_kind"] for x in cases),Counter({"UniGeo held-out proof":100,"Euclid Elements formalization":48,"UniGeo few-shot formalization":25}))
        for x in cases:
            raw=(x["statement"]+"\n"+"\n".join(x["proof_steps"])).encode()
            self.assertEqual(hashlib.sha256(raw).hexdigest(),x["source_sha256"])
            self.assertTrue(x["oracle"]["valid"] and x["oracle"]["complete"])
    def test_unsupported_is_not_counted_as_false_rejection(self):
        self.assertEqual(self.results["proofs"],173);self.assertEqual(self.results["unsupported"],173)
        self.assertEqual(self.results["false_acceptance"],0);self.assertEqual(self.results["false_rejection"],0)

if __name__=="__main__":unittest.main()
