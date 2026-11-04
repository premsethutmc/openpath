# Geometry Core G2 hardening report

**Branch:** `feat/geometry-core`  
**Base:** `2538fb84a3cd387e5b47f5e64a9b40035d265dc8` (`research/geometry-reasoner`)  
**Scope:** independent research core; no algebra-stack, UI, educator-marking, or production changes

## Recommendation: REVISE

The core is suitable for continued research and controlled fixture evaluation. It is not ready to decide marks for arbitrary student geometry. The supported theorem rules are sound within the explicit IR conventions and tested conditions, but coverage, construction semantics, proof search, and independent benchmark authorship are still too narrow for production assessment.

## Independent soundness review

The review found and corrected these risks:

1. **Coordinate-instance overclaim.** Exact coordinates can verify or refute one configured problem instance; they do not prove a theorem universally. `AlgebraicCheck` now reports `verified_for_instance`, `exact_counterexample`, `conditional`, or `unsupported`. The assessment result carries `verification_scope`.
2. **Inconsistent-premise explosion.** A positive and explicit negative fact, conflicting numeric measures, negative measures, or impossible triangle side lengths now makes the state inconsistent. Deduction stops and returns `unsupported`; arbitrary conclusions are never inferred.
3. **Unbounded closure.** Both rounds and rule applications are bounded. Exhaustion returns `unsupported` with `resource_limit_reached`, never a guessed conclusion.
4. **Degenerate use of theorems.** New rules require explicit nondegeneracy. Polygon angle sum additionally requires an explicit simple-polygon condition. Coordinate checks reject zero direction vectors and coincident defining points conditionally.
5. **Proof repair.** Proof assessment preserves the first nonverified step. A later true conclusion cannot make the submitted proof valid or complete.
6. **Dependency opacity.** Every derived fact records its theorem, immediate premises, conditions, and dependency keys. The dependency graph has a cycle check and retains alternate derivations when found.

IR conventions that remain material: an angle object's ordered point triple defines its rays; triangle side/angle tuples define vertex correspondence. The engine does not infer either from a picture. Incorrect tuple construction upstream can still encode the wrong mathematical problem, so a future construction validator is required.

## Strengthened proof verification

`verify_student_proof` now reports verdict and dependency evidence per step, the first nonverified step, unsupported step indices, unresolved obligations, the submitted theorem route, and validity separately from goal completeness. Only verified steps enter the knowledge state. An invalid early step remains visible even when a later step equals the goal.

## Expanded supported boundary

| Family | Exact applicability conditions | Result |
|---|---|---|
| Circle centre/inscribed angle | Explicit same-arc pair; nondegenerate circle | Angle at centre is twice circumference angle |
| Same-segment circle angles | Explicit same-segment pair; nondegenerate circle | Equal angles |
| Parallelogram | Explicit parallelogram fact; nondegenerate ordered polygon | Opposite sides and angles equal |
| Polygon angle sum | Ordered simple, nondegenerate polygon; all but one measures known | Missing interior angle |
| Pythagorean | Explicit right triangle, hypotenuse, positive/nondegenerate sides | Missing squared length |
| Triangle inequality | Explicit nondegenerate triangle and lengths | Three side inequalities |
| Coordinate geometry | Exact rational points | Collinearity, incidence, midpoint, distance squared, slope, parallel/perpendicular, selected congruence/similarity instance checks |

Earlier vertical-angle, linear-pair, parallel-line angle, triangle-sum, isosceles, congruence, similarity, and CPCTC rules remain supported. These are declarative rules, not stored question solutions.

## Algebraic checker boundary

All arithmetic uses `Fraction`; there are no tolerances or floating-point samples. The checker evaluates exact invariants for a fully specified coordinate model. A false invariant is an exact counterexample for that instance. A true invariant is only an instance verification unless a separate symbolic proof establishes universality. Gröbner-basis elimination, quantified polynomial implications, locus reasoning, and universal coordinate proofs remain unsupported.

## Benchmark and performance

The committed `school_geometry_hardening_v2.json` contains **540** deterministic cases: the original 180-case corpus plus 360 newly authored hardening cases (40 each for two circle families, parallelograms, polygons, Pythagoras, inequalities, coordinate midpoint, inconsistent premises, and incomplete multistep proof behavior). Cases have independent formula/theorem oracles, but many are parameterized variations; they are not 540 independently sourced textbook problems.

Reproducible result (`benchmark/hardening_results.json`): 540 cases, 0 false acceptances, 0 false rejections, 0 verdict mismatches, about 0.048 seconds (11,310 cases/second in the recorded run) in this container. This measures small in-memory school cases, not worst-case theorem proving. Adversarial tests separately cover inconsistent premises, degenerate objects, exact counterexamples, proof-order preservation, dependency acyclicity, and forced resource exhaustion.

## Shared assessment contract

`assessment_contract.py` now defines a versioned, domain-neutral boundary for arithmetic, algebra, geometry, trigonometry, and calculus: semantic statements; assumptions and conditions; resource budgets; verdicts, rules, dependencies, unresolved obligations, verification scope and exhaustion; and step evidence with skills, assistance, input method, and provisional status. It contains no geometry UI or educator-mark logic and does not import the unmerged algebra core.

## Unsupported classes and risks

- arbitrary Euclidean constructions and diagram recognition;
- directed/reflex angles and full point-order/betweenness reasoning;
- circle tangent, chord, power-of-a-point, and cyclic-quadrilateral converse chains;
- general quadrilateral classification and converse theorems;
- transformations, loci, solid geometry, and construction proofs;
- inequality chains beyond the basic triangle inequality;
- universal algebraic theorem proving;
- natural-language proof parsing;
- minimal-proof selection and robust misconception attribution;
- maliciously large object graphs beyond fail-closed resource limits.

Candidate misconceptions remain conservative. `unsupported` is never converted to mathematically false.

## Estimated path to broader coverage

- 3–5 engineer-weeks: construction/type validator, ordered incidence and betweenness, directed-angle semantics, stronger contradiction detection.
- 4–8 engineer-weeks: curriculum-prioritized circle/quadrilateral rules with independently authored proof fixtures.
- 4–6 engineer-weeks: symbolic polynomial implication service and proof-certificate boundary.
- 3–5 engineer-weeks: educator-reviewed explanations and controlled integration trials.

These estimates exclude diagram recognition, formal Lean certification, and curriculum content review.

## Commands

```bash
cd research/geometry-reasoner
python3 benchmark/generate_hardening.py
PYTHONPATH=. python3 benchmark/evaluate.py
PYTHONPATH=. python3 -m unittest discover -s tests -v
python3 -m compileall -q geometry_reasoner benchmark tests
```

All 19 tests passed. The benchmark's zero measured error applies only to its declared supported cases and oracles; it is not a claim of general geometry correctness.
