# Geometry reasoning research

**Branch:** `research/geometry-reasoner`  
**Stable base:** `b578c7893136fcdea5cd1805296243089e7039ce` (`main`)  
**Status:** research prototype; no learner, educator, estimator or production integration

## Question answered

OpenPath can extend a shared mathematical assessment contract to geometry, but geometry needs machinery algebra alone does not: an explicit construction model, nondegeneracy obligations, theorem-dependent proof graphs, and a distinction between **unproved by this engine** and **mathematically false**. A hybrid is the strongest production direction:

1. a synthetic theorem engine supplies step-level premises, alternative proof routes and learner-readable reasons;
2. an exact algebraic engine independently discharges selected obligations and detects counterexamples;
3. a small proof kernel checks each derived fact and its side conditions before it becomes evidence;
4. the existing OpenPath evidence layer records the verifier result and assistance provenance without treating it as mastery by itself.

An olympiad solver should not be placed directly in the learner loop. Search systems optimize for finding one proof; student assessment must accept many proofs, identify the first unsupported transition, expose missing assumptions, and preserve the distinction between proof validity and proof completeness.

## Stable architecture audit

The stable branch contains the subject-neutral OpenPath principles in `docs/PLATFORM_ARCHITECTURE.md`, `docs/CAPABILITY_MODEL.md`, `packages/english-core/src/types.ts`, and the assessment/evidence code:

- raw learner actions are stored before derived judgements;
- judgements carry rule and provenance and can be replayed;
- capability prerequisites guide support rather than silently proving facts;
- assisted and provisional outcomes remain distinct from independently verified evidence;
- educator decisions and learner UI are outside the mathematical verifier.

The stable branch has no mathematical-core assessment contract and no geometry IR. The prototype therefore defines a standalone contract and proposes an adapter. It does not import or copy PR #81.

## Existing geometry approaches

| Approach | Coverage and proof style | Student-step and alternative-proof suitability | Missing assumptions and explanations | Cost | Licence/integration conclusion |
| --- | --- | --- | --- | --- | --- |
| **AlphaGeometry (DDAR + neural auxiliary construction)** | Broad olympiad-style Euclidean angle, ratio, incidence and circle deduction. DDAR is a deductive database plus algebraic rule system; a language model proposes auxiliary constructions. | DDAR proof dependencies can justify individual formal predicates and multiple found proofs. It does not parse ordinary student language or judge omitted school-level reasons. Neural search targets a successful proof, not faithful assessment of a submitted proof. | Formal constructions expose premises; nondegeneracy and translation from a student's notation still need a front end. DDAR traces are formal and require pedagogical rewriting. | DDAR can run alone; published AlphaGeometry search used large beam/depth and substantial GPU/CPU resources. | Apache-2.0 at upstream commit `6777cb5`. Useful as a rule-language and proof-graph reference. The model/search stack is too heavy for the default school step checker. |
| **AlphaGeometry 2** | Stronger DDAR language and olympiad performance; released repository demonstrates the logical core, sometimes with manually supplied auxiliary points. | Better proof search does not itself solve student-step interpretation. Its symbolic trace is relevant; full learner explanations and arbitrary submitted proof verification remain separate work. | Formal premises are explicit. The released README says difficult examples may need manually provided auxiliary points, which must never be inferred from a picture. | Released DDAR demo needs NumPy; full system results include components beyond the released logical-core demonstration. | Software Apache-2.0, other materials CC-BY, upstream commit `251e7e1`. Candidate reference or isolated service experiment, not an immediate dependency. |
| **GeoGebra automated theorem proving** | Dynamic-geometry constructions translated to symbolic methods, including Botana polynomial methods, exact checks and nondegeneracy-condition detection. Strong for construction-generated incidence/metric claims. | Good at verifying a final construction property. Its boolean/prover interface is less suited to a student's ordered proof; alternative proofs and classroom reasons need a separate proof layer. | `NDGDetector` and prover results are valuable references. Polynomial certificates are not naturally learner-readable. | Mature Java/CAS stack; web embedding is materially heavier than the prototype. | Individual prover files state EUPL-1.2 while the overall package has non-commercial terms; upstream directs users to its licence page. Commercial/product integration requires a specific legal/licensing decision. Studied at commit `a4b7c9e`; do not vendor by default. |
| **Wu's method** | Converts geometric hypotheses/conclusions to polynomial systems and uses characteristic sets/pseudo-division. Strong for many equality theorems in coordinate geometry. | Can verify a conclusion but normally does not mirror a student's synthetic step or enumerate natural alternative proofs. | Degenerate factors expose some missing conditions, but translating them into named geometry assumptions is essential. Raw algebra is poor feedback. | Deterministic but expression swell can be high. | The algorithm is not a licensed component. GCLC provides an MIT implementation alongside other provers (commit `a2ee7bf`). Feasible as an isolated exact verifier. |
| **Gröbner-basis proving** | Ideal-membership/radical reasoning over polynomial encodings; broad equality coverage and a standard CAS foundation. | Excellent independent check for supported polynomial claims; weak as the sole source of proof order and school explanations. Different bases are not meaningful alternative student proofs. | Saturation/nonzero constraints must encode nondegeneracy. A failed proof is usually “not established”, not a counterexample. | Can be expensive; ordering strongly affects performance. | Implement through a permissive CAS or isolated service after benchmarking. GCLC's MIT implementation is an option; SymPy is BSD-licensed if selected later. |
| **Area method** | Synthetic-algebraic invariant method for affine/metric Euclidean theorems. Produces structured proof steps closer to textbook geometry than raw polynomials. | Strong candidate for explainable verification and alternative proof obligations within its supported vocabulary. Less general than unrestricted polynomial proving. | Side conditions can be explicit and explanations can name area/ratio lemmas. Formalisation still needs mapping to the learner's objects. | Generally practical for school-size problems. | GCLC implements area, Wu and Gröbner methods and emits LaTeX proofs under MIT. Most promising external prototype for a future comparison. |
| **Deductive database / forward chaining** | Encodes construction facts and theorem rules; derives closure with dependencies. Coverage grows with the rule library. | Best direct fit for checking each proposed student step, finding several routes, attributing skills and giving theorem names. | Missing premises and side conditions are first-class. A closed-world implementation would be unsound, so unknown stays unsupported. | Cheap and predictable for a bounded school rule set; needs indexing and loop control as the rule base grows. | No external runtime needed. This is the prototype's primary strategy and the recommended first production layer. |
| **Lean + mathlib Euclidean geometry** | Kernel-checked definitions and proofs over affine Euclidean spaces; mathlib includes angle, triangle, congruence, similarity, circle and related theories. | Highest assurance once a statement and proof are formalized. Accepts alternative formal proofs. Translating a child's notation and incomplete steps to Lean terms is a substantial elaboration problem. | Every assumption is explicit; kernel errors are exact but not learner-facing. Explanations require theorem metadata and source mapping. | Proof elaboration is reasonable; authoring and translation cost dominate. | Lean/mathlib is Apache-2.0 at inspected commit `8000f01`. Valuable as an offline oracle and proof-kernel research track, not the first interactive parser. |

Primary sources inspected on 27 October 2026:

- AlphaGeometry repository and Nature paper link: <https://github.com/google-deepmind/alphageometry>
- AlphaGeometry 2 repository and JMLR paper link: <https://github.com/google-deepmind/alphageometry2>
- GeoGebra source/prover and licensing notice: <https://github.com/geogebra/geogebra>, <https://www.geogebra.org/license>
- GCLC, its three prover modes and MIT licence: <https://github.com/janicicpredrag/gclc>
- Lean mathlib Euclidean geometry and Apache-2.0 licence: <https://github.com/leanprover-community/mathlib4/tree/master/Mathlib/Geometry/Euclidean>
- Chou, Gao and Zhang, *Machine Proofs in Geometry* (deductive database and algebraic methods), World Scientific, 1994.
- Janičić, Narboux and Quaresma, “The Area Method: a Recapitulation,” *Journal of Automated Reasoning* 48, 2012.

## Geometry intermediate representation

`geometry_reasoner/model.py` defines immutable, serializable objects and facts.

Objects: point, line, segment, ray, angle, triangle, polygon and circle. Object data may name defining points, corresponding sides/angles, or exact rational coordinates. A diagram renderer is not a source of facts.

Relations include collinearity, parallelism, perpendicularity, length/angle equality, congruence, similarity, incidence, intersections, angle measures, construction pairs and explicit negations. Each `Fact` is marked `given`, `derived`, `assumed`, `unsupported` or `contradicted` and can carry its source.

Conditions are explicit strings with stable forms such as `distinct:A:B` and `nondegenerate:T`. Rules cannot use triangle angle sum, isosceles properties, congruence or similarity unless required nondegeneracy conditions are present. Coordinate verification also refuses zero direction vectors and collapsed angle rays.

Every derived fact has a `Proof`: theorem identifier, premises, dependency keys, side conditions and explanation. Facts are canonicalized only for mathematically symmetric relations. The IR never mines visual coordinates unless coordinates are part of the formal problem construction.

## Prototype strategies

### A. Synthetic deduction

`geometry_reasoner/synthetic.py` is a bounded forward-chaining database. The theorem table declares required relations, side conditions, conclusion relations, justification and a general application function. It implements:

- vertically opposite angles;
- angles on a straight line;
- corresponding and alternate angles on parallel lines;
- triangle angle sum;
- isosceles base angles;
- SSS, SAS and ASA congruence;
- AA similarity;
- corresponding parts of congruent triangles.

Rules operate over arbitrary object identifiers and correspondence data. No benchmark question ID or expected solution path appears in the engine. Closure records proof dependencies, which lets a direct student conclusion and a multistep proof converge on the same established fact.

### B. Algebraic verification

`geometry_reasoner/algebraic.py` uses exact `Fraction` arithmetic over supplied coordinates. It checks determinant, cross-product, dot-product, squared-length, squared-cosine, SSS and proportional-side invariants for collinearity, parallelism, perpendicularity, incidence, equal lengths/angles, congruence and similarity.

It does not choose coordinates or infer them from a picture. Missing coordinates and degenerate vectors produce unsupported or missing-assumption results. A polynomial Wu/Gröbner back end is feasible behind the same interface; this prototype deliberately stops before building a CAS.

Twenty shared obligations compare the two strategies: 15 valid angle/congruence/similarity claims and five false parallel claims. Both strategies agreed on all 20. Synthetic proofs were better explanations; exact coordinates were a useful independent check.

## Student-step contract

```text
verify_geometry_step(problem, known_facts, student_step) -> VerificationResult
```

The result contains:

- verdict: `verified`, `invalid`, `missing_assumption`, or `unsupported`;
- theorem/rule;
- exact premises and dependency keys;
- missing assumptions and unsupported conditions;
- learner-readable mathematical explanation;
- a candidate misconception only when contradiction evidence justifies it;
- strategy: synthetic, algebraic or hybrid.

`invalid` is reserved for a contradiction with established facts or an exact false invariant. Failure to find a proof returns `unsupported`. `verify_student_proof` adds steps only after verification and reports validity independently from completeness. This accepts alternative routes and identifies the first unverified transition without requiring a memorized solution.

## Benchmark

`benchmark/school_geometry_v1.json` contains 180 deterministic cases with independent oracle explanations:

| Category | Cases | Result |
| --- | ---: | --- |
| Vertical opposite | 18 | 18 verified |
| Straight line | 18 | 18 verified |
| Parallel-line angles | 18 | 18 verified |
| Triangle sum | 22 | 22 verified |
| Isosceles properties | 18 | 18 verified |
| Congruence / CPCTC | 20 | 20 verified, including SSS/SAS alternatives |
| Similarity | 14 | 14 verified |
| Missing parallel assumption | 12 | 12 missing-assumption |
| Contradicted conclusions | 10 | 10 invalid |
| Degenerate triangle | 8 | 8 missing-assumption |
| Outside theorem coverage | 10 | 10 unsupported |
| Valid but incomplete submitted proof | 12 | 12 valid, 0 complete |
| **Total** | **180** | **140 verified steps; 20 missing assumptions; 10 invalid; 10 unsupported** |

The benchmark includes 20 cases with named alternative routes. It deliberately includes diagrams/constructions whose visual position cannot establish parallelism, equality or nondegeneracy. Generated parameters vary identifiers and angle measures, while each oracle states the theorem or contradiction independently of the engine implementation.

## Failure analysis and unsupported boundary

The prototype does not yet cover circle theorems, cyclic quadrilaterals, tangent/chord relationships, polygon angle sums, locus claims, transformations, 3D geometry, inequalities, betweenness, orientation, ratio arithmetic for synthetic similarity, or unrestricted coordinate/polynomial construction solving. It does not parse natural language, handwriting, diagrams or ambiguous student labels.

The rule engine currently assumes declared triangle correspondence. Congruence search does not try all vertex permutations. Algebraic verification checks a supplied coordinate model; one satisfying model does not prove a universal theorem unless the coordinates were derived symbolically from arbitrary variables and constraints. Accordingly, coordinate `verified` means “true in this exact formal construction,” not universal proof.

The benchmark is an engineering oracle set, not educator validation and not evidence of learning effectiveness. Its templated cases cover logic categories but not the full diversity of school textbooks.

## Proposed shared assessment abstraction

Geometry and algebra can share an outer contract without sharing their internal solvers:

```text
MathematicalStatement = typed domain statement + canonical object references
ProofObligation = assumptions + known statements + proposed statement + conditions
VerificationResult = verdict + rule + premises + dependencies + missing conditions + explanation
StepEvidence = learner/session/item IDs + statement + result + input/assistance provenance + skill attribution
```

Recommended mapping to OpenPath:

1. the domain verifier receives no learner mastery state;
2. it returns append-only mathematical evidence with a versioned verifier/rule-set ID;
3. the existing evidence gate decides whether the item, independence, assistance and retention make that evidence admissible;
4. `unsupported` records a capability gap and never becomes an incorrect learner answer;
5. replay rebuilds conclusions from the original problem, submitted steps and verifier version;
6. educator marks remain separate for constructions or proofs outside machine coverage.

## Production recommendation and effort

Proceed with a hybrid in stages:

| Stage | Scope | Estimate |
| --- | --- | ---: |
| Contract hardening | JSON schema, canonical names, proof dependency serialization, versioning, PR #81 adapter review | 2–3 engineer-weeks |
| School synthetic core | 40–60 theorem rules, correspondence search, ratios, circles, polygons, counterexample tests | 8–12 engineer-weeks plus mathematics review |
| Student notation | Structured proof-entry UI and deterministic parser for named objects/statements | 6–10 engineer-weeks |
| Algebraic oracle | Symbolic coordinates, NDG extraction, CAS/GCLC experiment, resource limits | 6–10 engineer-weeks |
| Curriculum mapping | Competency/theorem attribution, representative tasks, educator review | 8–12 weeks per major grade band, overlapping engineering |
| Formal oracle research | Lean translation for a bounded theorem subset | 8–16 research weeks; optional |

Start production work with the synthetic database and the shared verification envelope. Evaluate GCLC area method and exact polynomial checks as an isolated secondary verifier. Keep Lean as an offline assurance experiment. Do not adopt AlphaGeometry's neural search or GeoGebra's full runtime until a school-step benchmark shows a concrete advantage that justifies operational and licensing costs.
