#!/usr/bin/env python3
import json,collections
from pathlib import Path
root=Path(__file__).parents[3];src=root/"tools/mathematics/natural-working-d4/frozen-natural-working-cases.v1.json";data=json.loads(src.read_text());rows=[]
for c in data["cases"]:
 if c["expectedMathematicalVerdict"]!="unsupported":continue
 i=int(c["id"][-3:]);cat=c["category"]
 if cat=="trigonometry-functions":blocker="missing-parser-to-domain-adapter";detail="function definition/application is recognized but not converted to M1 FunctionDef/value"
 elif cat=="calculus":blocker="missing-typed-ir-conversion";detail="derivative/integral notation is recognized but no CalculusStep is emitted"
 elif cat=="geometry-vectors" and i%2: blocker="missing-typed-ir-conversion";detail="vector literals and addition are recognized but no B2 LAStep is emitted"
 elif cat=="geometry-vectors":blocker="missing-mathematical-assumptions";detail="AB is not bound to a declared geometric segment measurement and must not be inferred"
 elif cat=="matrices-complex" and i%2==0:blocker="missing-typed-ir-conversion";detail="matrix literal/determinant are recognized but no B2 LAStep is emitted"
 elif cat=="matrices-complex":blocker="missing-typed-ir-conversion";detail="complex Cartesian value/modulus are recognized but no B3 ComplexStep is emitted"
 elif cat=="probability-statistics":blocker="missing-parser-to-domain-adapter";detail="probability/statistical notation is recognized but no B1 step is emitted"
 else:blocker="missing-proof-certificate";detail="multi-line substitution needs D3 bindings and proof dependencies rather than textual assignment"
 rows.append({"id":c["id"],"category":cat,"blocker":blocker,"detail":detail})
assert len(rows)==190
summary=dict(collections.Counter(x["blocker"] for x in rows));out={"schema":"openpath-natural-working-d5-baseline-inventory@1","sourceBenchmarkSha256":"3dad06d2fa23b9f0fe56e04a0b1ebcce28b449ef82d99bbcf559a09a500f14e5","total":190,"summary":summary,"cases":rows};Path(__file__).with_name("d4-unsupported-inventory.v1.json").write_text(json.dumps(out,indent=2)+"\n");print(summary)
