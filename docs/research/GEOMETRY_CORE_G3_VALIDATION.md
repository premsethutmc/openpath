# Geometry G3 validation report

**Branch:** `feat/geometry-core`  
**G3 base:** `2f795b2807a810fe7107da299f14013fbbd9ca88`  
**Decision:** **REVISE**

The supported subset is deterministic, bounded, and substantially safer for evaluating structured student proofs. It remains a research core, not a production marker for arbitrary geometry, because construction semantics and curriculum coverage are deliberately incomplete and the proof corpus is independently labelled but still template-balanced rather than externally authored.

## 1. Every G2 revision finding

| Category | G2 finding | Priority | G3 disposition |
|---|---|---:|---|
| Mathematical soundness | Coordinate truth might be mistaken for universal proof | Blocker | **Closed for the API boundary.** Exact checks say `problem_instance`; only declarative theorems say `universal`. Exact false instances are counterexamples. No sampling establishes a theorem. |
| Mathematical soundness | Inconsistent premises could entail arbitrary facts | Blocker | **Closed for covered contradictions.** Explicit positive/negative conflicts, conflicting numeric values, negative measures, and impossible triangle lengths stop deduction as unsupported. Full geometric consistency remains incomplete. |
| Mathematical soundness | Degenerate theorem applications | Blocker | **Closed for declared families.** Explicit nondegeneracy and theorem-specific conditions are tested. Malformed rule input now fails closed. |
| Proof completeness | Later correct statement might repair an earlier invalid step | Blocker | **Closed.** First nonverified step is retained; subsequent truth cannot make the proof valid or complete. |
| Proof completeness | No submitted dependency/citation graph | Blocker | **Closed for structured proofs.** `SubmittedProofStep` captures IDs, citations and theorem; forward, self, unknown, duplicate and irrelevant citations are rejected. |
| Proof completeness | Alternative proof routes and incomplete proofs | Blocker | **Closed within coverage.** SSS/SAS alternatives, redundant valid steps, unsupported steps and valid-but-incomplete proofs have independent labels. Minimal-proof ranking remains deferred. |
| Missing geometric semantics | Ordered rays, point order and triangle correspondence depend on IR tuple conventions | Blocker for arbitrary input | **Open.** Conventions are explicit and safe for trusted structured items, but there is no general construction/type validator or betweenness/directed-angle model. |
| Missing geometric semantics | Diagram recognition, natural-language parsing, broader theorem classes | Outside G3 | **Open by scope.** No misleading fallback was added. |
| Resource safety | Closure limits did not validate malformed and large graphs comprehensively | Blocker | **Closed for tested failure modes.** Malformed rules, repetition, deep chains, large graphs, contradictions and forced exhaustion terminate deterministically and fail closed. |
| Benchmark independence | 540 cases were mostly parameterized | Blocker for readiness claim | **Partially closed.** Added 90 separately labelled complete proof sequences with theorem-based written oracles. They remain balanced templates, not an external educator/textbook corpus. |
| Integration compatibility | Contract lacked an explicit complete/incomplete proof outcome | Blocker | **Closed.** Contract now carries proof status and first invalid step, alongside dependencies, obligations, scope, skills and evidence metadata. |
| Integration compatibility | Compatibility with unmerged algebra stack unknown | Integration risk | **Adapter identified; open until joint branch.** No algebra code was read as a dependency or modified. |

Speculative G2 expansion items—additional circle theorems, transformations, loci, solid geometry, natural-language parsing, diagram recognition and formal certification—were not treated as G3 blockers and were not implemented.

## 2. Complete student-proof evaluation

Corpus: `benchmark/student_complete_proofs_v1.json`.

| Class | Proofs |
|---|---:|
| Correct proofs | 10 |
| Alternative valid SSS/SAS routes | 10 |
| Incorrect intermediate deductions | 10 |
| Missing assumptions | 10 |
| Circular/forward-reference proofs | 10 |
| Redundant but valid proofs | 10 |
| Valid but incomplete proofs | 10 |
| Degenerate configurations | 10 |
| Unsupported theorem applications | 10 |
| **Total** | **90** |

Results:

- final `(valid, complete)` classification: **90/90**;
- first-invalid-step location: **90/90**;
- false acceptances: **0**;
- false rejections: **0**;
- evaluation time: **0.011496 seconds** in the recorded run.

Labels and written oracles are committed before evaluation and are not generated from engine output. Many cases are parameter variations of nine proof patterns, so these figures establish regression behavior within the declared scope rather than general proof accuracy.

## 3. Theorem-precondition audit

| Rule family | Preconditions enforced | Counterexample/failure check |
|---|---|---|
| Vertical opposite | Explicit `vertical_pair` construction | No inference from appearance alone |
| Straight-line angles | Explicit `linear_pair` plus known measure | Malformed arity fails closed |
| Corresponding/alternate angles | Explicit angle-pair construction plus parallel lines | Missing parallelism reported as missing assumption |
| Triangle angle sum | Three ordered angles; nondegenerate triangle | Degenerate case cannot derive third angle |
| Isosceles base angles | Ordered side/angle correspondence; equal sides; nondegenerate triangle | Missing side equality does not prove angle equality |
| Congruence | Ordered triangle correspondence; nondegenerate triangles; exact SSS/SAS/ASA | Incomplete criterion remains unsupported/missing |
| Similarity | Ordered correspondence; two equal corresponding angles; nondegenerate triangles | One angle is insufficient |
| CPCTC | Established congruence and ordered corresponding parts | Cannot fire from similarity alone |
| Circle angle | Explicit central/inscribed same-arc relation; angle range; nondegenerate circle | Degenerate circle and out-of-range measure do not fire |
| Same-segment circle | Explicit same-segment relation; nondegenerate circle | Concyclic-looking points alone do not fire |
| Parallelogram | Explicit parallelogram; ordered sides/angles; nondegenerate polygon | Generic quadrilateral does not inherit properties |
| Polygon sum | Simple and nondegenerate ordered polygon; positive result; all but one angles | Nonsimple/degenerate polygon does not fire |
| Pythagorean | Explicit right triangle/hypotenuse; nondegenerate triangle; positive squared lengths | Zero/negative and non-right configurations do not fire |
| Triangle inequality | Nondegenerate triangle; three consistent positive lengths | Impossible lengths mark premises inconsistent |
| Coordinate invariants | Complete exact rational coordinates; distinct/nonzero defining objects | Exact counterexample separated from conditional/unsupported |

The central remaining precondition risk is upstream IR construction: labels such as `vertical_pair`, `same_segment_pair`, and ordered triangle correspondence are trusted structured facts. G3 verifies consequences, not whether an arbitrary author encoded the construction correctly.

## 4. Shared assessment contract

The contract represents verified, invalid, missing-assumption and unsupported reasoning; complete and incomplete proofs; outstanding obligations; proof dependencies; first invalid step; verification scope; resource exhaustion; competency and prerequisite skills; input method; assistance; and provisional evidence.

Conceptual algebra compatibility:

- both domains need a versioned statement, proof obligation, four-way verification outcome, rule identity, dependencies and skill evidence;
- algebra naturally carries expression ASTs and transformations, while geometry carries relation predicates and object IDs;
- geometry additionally needs construction/nondegeneracy conditions and instance-versus-universal scope;
- an adapter should map each domain statement into `MathematicalStatement.qualifiers`, keeping domain AST/IR payloads outside the shared verdict envelope;
- neither engine should translate its native statement into the other's representation or share solver internals.

The unmerged algebra stack was not modified or introduced as a dependency. A joint integration branch must confirm field names, serialization and version migration.

## 5. Performance and reliability

- 100 independent vertical-pair facts: verified in **0.83 ms**.
- 1,000 facts: verified in **9.63 ms**.
- 5,000 facts with a 1,000-application budget: safely unsupported in **12.40 ms**.
- deep synthetic chain: stops at the configured round limit.
- repeated facts: deterministic deduplication and identical proof result across 20 runs.
- circular/forward submitted dependencies: first offending step rejected.
- contradictory premises: unsupported; no explosion.
- malformed relation arity: unsupported; no exception escapes.

The reasoner remains an unindexed in-memory prototype. These measurements do not establish resistance to hostile distributed workloads.

## 6. Remaining limitations

1. No general construction validator, directed angles, betweenness or intersection-order semantics.
2. No external educator-authored proof corpus; the 90-proof corpus uses independently labelled templates.
3. No natural-language-to-IR conversion.
4. No universal symbolic polynomial prover or proof certificates.
5. No broad theorem coverage beyond the documented families.
6. Contradiction detection is deliberately partial.
7. No joint serialization test against the unmerged algebra contract.
8. No production learner-evidence or educator-mark integration.

## 7. Decision

**REVISE.** The supported structured subset passes G3 and is appropriate to merge into a research integration branch. It is not ready to act as a general learner-facing geometry marker. Production readiness requires, at minimum, a trusted construction validator, an external independently authored proof set, and a joint contract-adapter test with the algebra core.

## Reproduction

```bash
cd research/geometry-reasoner
python3 benchmark/generate_student_proofs.py
PYTHONPATH=. python3 benchmark/evaluate_student_proofs.py
PYTHONPATH=. python3 -m unittest discover -s tests -v
python3 -m compileall -q geometry_reasoner benchmark tests
```

All **27** automated tests pass, including the prior 540-case G2 benchmark.
