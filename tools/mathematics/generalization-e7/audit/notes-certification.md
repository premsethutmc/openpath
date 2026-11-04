# cert notes (scripts in this dir: run.ts var.ts prov.ts adj.ts typed.ts e6.ts notes.ts assume.ts)
Traces (all executed against engine 5d0a7b4, no repo files modified):
- geo-012 / geo-013: e5 verified (labels e5-independent-geocalc), base unsupported abstains; conversion.checks = ["geometry-reasoner: no relational step to cross-check"]; ledger claim for geo-013 L1 = "+ B = 120°" (A dropped by claim-ledger.ts:95).
- algA-048: single-route base; evidence u4+exact-solution-set "equivalent" for 4x=8 -> x=8-6 -> x=2; "x=5-3" and "x=2" alone also verified.
- typed-045: gateStructured evidence label = step.reasoner (calculus:exact); ln x verified, ln|x| malformed; domainRestrictions ["nonzero x"] recorded only.
- typed-033: rule "power rule" for chain-rule result: verified. typed-005: correct e^{x^2}/2+C with rule substitution/standard integral/anything: invalid (rule-form kernel).
- prov.ts: buildObligations with evidence {line:1, claim:"x=1", checker:"u4-kernel"} for claim "sum of angles is 100 degrees" on route adapter-converted -> derivation proven, answer proven, standsOnObligations ok. Evidence on other line -> unsupported. Unregistered / wrong-route / missing-reasoner label -> unsupported.
- adj.ts synthetic: S1 incomplete(answer-only open) vs verified -> verified; S2 no V + rule-form invalid -> invalid (disproven-claim, no ruleFormOnly check); S3 V + rule-form invalid same line -> scope-only; S5 base ambiguous -> abstains; S5b e5 ambiguous -> ambiguous.
- calcI-011 / dom-013: e6 reads "3 = 27/3 - 0 = 9" (prefix lost) / "0 != 210" -> trusted disproof -> final invalid.
- assume.ts: "x>0" assumption on statement problem classified "student-introduced quantity, unrelated" (proof-context.ts: variables from problem.variable only) -> proven.
