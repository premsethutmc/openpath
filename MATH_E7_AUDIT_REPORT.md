# E7 Mathematical Generalization & Integrity Audit (read-only)

Engine `5d0a7b4`; holdout frozen `c186724`, results `196d0b8`. No engine, label, parser or architecture change; no holdout re-execution (a diagnostic per-step trace of the frozen inputs was taken to read the engine's own messages; it is not a scored run). Probe scripts and notes: `tools/mathematics/generalization-e7/audit/`. Sources: five code-and-execution audits (algebra, calculus, geometry/other domains, certification, risk probes, several hundred executed traces) plus my own re-execution of the key defects (`audit/verify.ts`, all reproduced).

## 0. The five questions

1. **Are we building a genuinely general verifier within a defined scope?** Not yet. General mechanisms exist and are sound where they are used (exact solution-set relations for algebra, exact CAS identity for natural-text calculus, step-wise symbolic equivalence in M3, a congruence-criteria table, exact rational/surd arithmetic everywhere). But (a) no scope contract is declared or enforced: outside the supported notation the system says `unsupported` for the whole submission; (b) most families verify a line by **a true statement or a matching final value**, not by a checked derivation; (c) typed and natural routes of the same mathematics have different semantics. Of 24 family rows, **1 is class A (symbolic M3, typed) and 1 is A/B (polynomial identities)**, 8 are B, 11 are C, 3 are D (matrix in §1).
2. **What actually enforces invariants?** (i) Algebra: a line is accepted iff its real solution set equals the previous line's (loss, gain, extraneous roots, inequality direction are enforced, exactly). (ii) Natural calculus (e6): exact CAS identity with derived domain requirements (`ln` needs a stated domain, cancelled factors need a stated restriction). (iii) Symbolic M3: step equivalence with a replayed certificate. (iv) Geometry congruence/theorem-citation checks (a wrong citation is `invalid`). (v) The obligation/claim-ledger layer: it can **withdraw** an acceptance (unparsed lines, ungrounded free literals, unproven dependencies, disproofs) but never **grants** one and never re-verifies the mathematics.
3. **Where is recognition or coincidence substituting for proof?** Five demonstrated places: (a) step validity = same solution set as the previous line (algebra) or "true given the premises" (geometry), never "follows from" (S1); (b) `numericGrounding` accepts any number that is one `+ − × ÷` of *any* two task numbers, and counts the **goal value itself** as a task number (S2); (c) later members of a probability/complex/linear-algebra chain are never grounded or derivation-checked (S3); (d) structured kernels compare **every** step's result with the final answer and ignore rule names (S4); (e) the typed route skips domain/context entirely and accepts a divergent integral (S5).
4. **What other foundational failures could invalidate confidence?** Demonstrated and not previously reported: stated premises written after an equation do not restrict the solution set (`2x=6, x<0` / `x=3` verified); a decimal-leading line has its integer part stripped (`1.5y=10` read as `5y=10`, verified); a divergent definite integral `∫_{-1}^{1}x⁻²dx=-2` is verified on the typed route; evidence is bound to a claim by **line number only**, so provenance does not show that any kernel verified *this* claim; a parse misread can become a trusted disproof (valid `[x³/3] from 0 to 3 = 9` is `invalid`). Details §3.
5. **Minimum corrective work before independent testing is meaningful:** five shared-mechanism corrections (§5): derivation-not-coincidence justification, typed/natural semantic parity (domain & context), parse fidelity and line-level failure isolation, premise/assumption binding, evidence-to-claim binding with explicit semantics for rule labels. Until then a fresh holdout measures mostly the parser.

## 1. A. Capability-contract matrix

Class: A general+enforced · B general, incompletely integrated · C pattern/coincidence-dependent · D unsupported. "Evidence path" = what reaches the certifier. File refs are `packages/learning/src/`.

| Family | Class | Invariant actually checked | Enforcing kernel | Evidence path / principal limitation |
|---|---|---|---|---|
| Arithmetic (natural) | B | exact rational/surd value | `core` BigInt Q; `independent-checker` Q | `u4-kernel`; decimal-leading-line parse bug (`natural-working.ts:79`), decimals as answers `invalid`, surds unsupported |
| Linear equations | C | final solution set exact; intermediate lines = same solution set | `core/student.ts:209`, `independent-checker.ts:1041` `relate()` | `u4+exact-solution-set`; `2x+3=11 / 3x=12 / x=4` verified; derivation search exists but `route:false` (`working-assessment.ts:87`) |
| Quadratic equations | C | solution-set tracking (loss ⇒ incomplete) | same | `x-2=0 or x-3=0` malformed (`natural-working.ts:71`); same coincidence acceptance |
| Polynomial identities, factoring, expansion | A/B | identity exact (U4 certificate replayed); domain of cancellation **recorded only** (`core/symbolic.ts:209` `requireDomain` off) | `proof-kernel` via `independent-checker.ts:519` | `simplify (x²-1)/(x-1)` → `x+1` verified with outstanding obligation not enforced |
| Rational expr./equations | B | restrictions and extraneous roots enforced | `independent-checker` partition at rational critical points | `x != 1, so …` prose malformed; irrational critical points abstain |
| Radical equations | B | extraneous roots enforced; "check each candidate" policy is dead code (`candidatePolicy=implicit`, `:34`) | checker only | dropped candidate accepted without student check |
| Absolute value, inequalities, systems | B | exact relation per cell / direction | checker only (native `unsupported`) | independence claimed but only one implementation reaches these; `or`-branches, chained inequalities, `x=3, y=2` w/ premises malformed |
| Premise-bearing statements (`..., x>0`) | **C (unsound)** | none: premise parsed as conjunction, not binding | `linearSystemMode` `independent-checker.ts:~977` | `2x=6, x<0 / x=3` verified |
| Logs/exponentials in algebra text | D | — | — | all unsupported/malformed |
| Derivative/indefinite/definite integral, limit — **natural (e6)** | B | exact CAS identity; derived domain requirements; Laurent-series limits | `e6-cas.ts:542`, `e6-calc.ts:614`, `e6-series.ts` | bare-answer, `[F] from a to b`, prose connectors, `let u=…, so du` unsupported/malformed; `D`-operator lines auto-anchored (`:500`); `3x²=3x²` verified |
| Same — **typed** (`calculus:exact`) | C | derivative(claim)=integrand structurally; `constantIncluded` flag; restrictions of the claim never computed | `calculus-core.ts` | `ln x` for ∫1/x, ∫₋₁¹x⁻²=-2 verified; `s.rule` never read; non-simplified shapes (`x⁴·4⁻¹`) `invalid` |
| Substitution, parts, partial fractions, L'Hôpital (typed methods) | B | `verifySymbolicTransformation` step equivalence | `calculus-methods.ts` | `conditional` CAS outcome → `invalid` (`:3`); correct `∫ln x` by parts rejected |
| Implicit/piecewise (typed) | C | circle template / piecewise antiderivatives | `calculus-core` | template-bound; no continuity check |
| ODE, series, improper, FTC-derivative, double integral, trig substitution | D | — | — | typed returns `malformed`; statement tasks have no route |
| Geometry angle chasing | C | line entailed by premises (rank test); grounding by number pool | `geometry-binder-e5.ts:163`, `natural-geocalc-e5.ts:161` | `C = 35+75−40 = 70°` and bare `C=70°` verified; Python prover only vetoes, skips `angle_measure`, fails open |
| Geometry coordinates/lengths | C | exact compare to typed points | `judgeCoordinate :229` | bare `AB²=169` verified; textbook `(7−2)²+(15−3)²=…` unsupported |
| Congruence / theorem citation | B | criterion table (SSS/SAS/ASA, SSA rejected); wrong citation ⇒ invalid | `judgeCongruence :256` | `△`, "Hence", comma lists unparsed |
| Probability (finite, distributions) | C | assumptions required (task- or student-supplied); chain value | `e6-numbers.ts:506`, `probability-statistics.ts` | only first chain member grounded (`:628`); `rule` names mapped to the same target; student "Assume…" discharges the need |
| Linear algebra | C | exact value match per step | `linear-algebra-kernel.ts` | natural `det(A)=2+4−1 / det(A)=5` verified (no grounding); intermediate result ≠ final ⇒ `invalid` |
| Complex numbers, polynomial remainder | C | exact value | `complex-kernel.ts` | `|z|²=100+69=169` verified |
| Trig, exp-log, sequences, radicals (structured) | C | result == final answer; `method` string unread | `domains-m2.ts:31` | `method:"I guessed"` verified |
| Same — natural text | D | — | — | "no lossless natural adapter" |
| Symbolic M3 | A (typed) / B (natural) | step equivalence certificate replayed by a kernel | `symbolic-equivalence.ts` | typed `2 sin x cos x = sin 2x` unsupported |
| Mixed / cross-domain (M2, D3) | B | type, scope, dependency binding enforced | `unified:*` | stage content inherits the above |
| Certification layer | B (gating) / C (justification) / D (typed conditional) | withdrawal of acceptance on unproven obligations | `proof-obligations.ts`, `certification-authority.ts` | label-level provenance (§4) |

## 2. B. Root-cause map of the 678 holdout outcomes

Computed from the engine's own per-step messages for the 446 outcomes that are neither exact nor an author-listed alternative (`audit/rootcause.py`); primary cause = first match; 137 outcomes have two causes, 5 have three, 27 have no engine message (class-only differences).

| Root cause | expected-valid | expected-non-valid | Notes |
|---|---|---|---|
| N1 Input notation/syntax (character whitelist; `or`/comma branches; trailing prose; `°`, `:`; bare expressions; `,du`) | 132 | 113 | one root cause, 245 cases. Whole-submission all-or-nothing interpretation (143 step messages "parses on its own but the submission as a whole was not interpreted") makes a single unreadable line hide every other line |
| B Binder/IR coverage ("outside the exact E5/E6 binders", "no lossless natural adapter for trig/exp-log/linear-algebra/sequences", `abs` in limits, bound/unbound symbols) | 48 | 74 | genuine unsupported scope (partly), partly missing natural routes for existing structured kernels |
| K Rule-form kernel judgement / representation sensitivity (typed claims `invalid`) | 9 | 1 | not rule labels (never read); unsimplified `2⁻¹` shapes, no expansion, bare `value` claim |
| V Kernel judged valid work `invalid` (parse misread of `[F] from a to b`, `10C4`, evaluation lines, `d/dx 1/x` binding) | 7 | 2 | parse misread promoted to a trusted disproof |
| G Task grounding/binding (symbol "u" not bound, line "not connected", right value "nothing in it comes from…") | 8 | 12 | grounding refuses honest but differently-phrased work |
| S Solution-set completeness | 1 | 8 | mostly correct detections where the label policy differs |
| X class-only / label-policy differences | 9 | 18 | incomplete vs invalid vs missing-assumption |
| False acceptances | — | 5 (4 confirmed) | independent mechanisms, §3 |

Independent roots: N1 (parsing), B (coverage), the four acceptance mechanisms in §3. **Shared root:** N1+B account for 367 of 446 mismatches (82%). 18 expected-non-valid cases came back `unsupported/malformed` rather than a diagnosis; those are safe but uninformative.

The shortfall (33.6% exact, decisive on only 289/678) is overwhelmingly a coverage/parse problem; the more serious finding is that **`verified` is backed by checks weaker than its evidence labels suggest** (4 confirmed false acceptances among 88 verified; §3, §4).

## 3. C. Soundness-risk register (ranked)

Severity = breadth × consequence. All "demonstrated" items were executed (agent traces + my `verify.ts` for S1, S5, S6, S7, S9).

| # | Defect | Status | Breadth |
|---|---|---|---|
| S1 | **Step justification = solution-set equality / entailment, not derivation.** `4x-8=0 / 4x=8 / x=8−6 / x=2`, `2x+3=11 / 3x=12 / x=4` (a different problem with the same root), bare `x=4`, `x(x-4)=0 / x=4` all verified; `route:false` hard-wired (`working-assessment.ts:87`); the route search that exists finds no route for these. | demonstrated (holdout algA-048 + probes) | every algebra equation chain; also the geometry, probability, complex, linear-algebra chain checks |
| S2 | **Numeric grounding by coincidence.** `numericGrounding` (`natural-geocalc-e5.ts:161-178`) skips constants 180/360/90, treats the goal value as a task number, and accepts any number that is one `+−×÷` of any two pool numbers regardless of the operation written. `C=35+75−40=70`, `A+B=120 / 120÷2=60 / C=60`, bare `C=65° (by symmetry)` verified. Line dependency is only "previous line" (`Builder.add`), so line 3 need not use line 2. The destination cross-check drops `angle_measure` steps and fails open. | demonstrated (geo-012, geo-013) | all E5/E6 numeric chains |
| S3 | **Ungrounded chains in other routes.** `P(A∩B)=P(A)P(B)=100/300=1/3`, `20/60−0=1/3`, `|z|²=100+69=169`, `det(A)=2+4−1 / det(A)=5` verified: only the first member is grounded (`e6-numbers.ts:628`); linear-algebra route has no grounding layer. | demonstrated | probability, complex, linear algebra |
| S4 | **Structured kernels match results, not reasoning**: every step compared with the final answer, rule names whitelisted but semantically unused (`domains-m2.ts:31` `method` unread; probability maps `bayes`, `direct`, `claim` to one target). `method:"I guessed"` verified; a correct intermediate result is `invalid`. | demonstrated | all typed structured domains |
| S5 | **Typed calculus skips domain/context** (`certifyClaims :503` returns before any context; `restrictions()` computed from the problem only). `ln x` for ∫1/x and `ln(x-1)` for ∫1/(x-1) verified (natural twin: `missing-assumption`); **divergent `∫_{-1}^{1}x⁻²dx=-2` verified**; `1/x²→-x⁻¹`, `sec²→tan`, `sin/cos→-ln cos` verified with no domain; `d/dx|x|` etc. verified with empty restrictions. Typed vs natural route disagree on identical mathematics. | demonstrated (typed-045; divergent integral new) | all typed derivative/integral/definite tasks |
| S6 | **Task premises after the equation are ignored** (`2x=6, x<0 / x=3`; `x²=16, x>0 / x=4 or x=-4`; `√x=2, x>4 / x=4` verified); the same premise phrased "where/for/given" is `unsupported`. | demonstrated (new) | algebra statements with premises |
| S7 | **Parser fidelity**: list-number stripper removes the integer part of decimal-leading lines/statements (`1.5y=10`→`5y=10`: `5y=10 / 1.5y=10 / y=2` **verified**; `2.5x=5 / x=2` rejected) (`natural-working.ts:79`). | demonstrated (new) | any line beginning with a decimal |
| S8 | **Provenance does not bind evidence to claim.** `attribute()` checks registry membership, producer route and a self-declared reasoner id; evidence is matched to a claim by line number (`proof-obligations.ts:89`); typed evidence label = the step's own `reasoner` field; e5 hard-codes `e5-independent-geocalc` on every "valid" judgement, incl. plain fact lookup (`:122-128, :226`). Synthetic run: evidence "x=1" with checker `u4-kernel` proves the claim "sum of angles is 100 degrees". The recorded provenance is real for trusted routes, but it is not proof that a kernel verified the claim. | demonstrated with synthetic input; no end-to-end exploit | certification layer |
| S9 | **Parse misread becomes trusted disproof**; unsupported/malformed reports abstain (`DEFINITE` excludes them, `certification-authority.ts:99`) while a misread parse yields `invalid` (`[x³/3] from 0 to 3` read as `[x³/3]·f·r·o·m·0·t·o·3`; `d/dx 1/x` read as `(d/dx 1)/x`). | demonstrated (false rejections of valid work as *false*) | calculus natural lines, evaluation notation |
| S10 | **Adjudication asymmetries**: rule-form `invalid` is only relativised when some route accepts (`:129`), so with no accepter it is final `invalid`; an objector's `incomplete` answer obligation is always "covered" (`:145`) so a pure incomplete objection is scope-only; base-route ambiguity abstains by route name (`:141`). | demonstrated on synthetic envelopes; no holdout instance of the false-acceptance direction | certification |
| S11 | e5 geometry prover independence: Python prover only vetoes, never supplies; `geometryRoot` defaults to `process.cwd()/research/geometry-reasoner` so typed geometry returns `unsupported` when run from another directory (**my holdout run was executed from the holdout directory: typed-087…090 were `unsupported` for this harness reason; from the repo root they match their labels**). The scored results are left as run; corrected exact would be 232/678 (34.2%). | demonstrated (harness defect, mine; plus fragile default) | typed geometry |
| S12 | Student-supplied "Assume independent / x>0" discharges task assumptions; `ctx.variables` empty on statement problems so "assume x>0" is classed "unrelated quantity" and proven. | demonstrated (`assume.ts`) | conditional semantics |
| S13 | **Contested**: rule labels are never read (`s.rule`), so a wrong label (typed-033) cannot affect any verdict. This is a contract gap, not a soundness bug, unless "justified by the named rule" is promised. | contract decision | typed calculus |
| H1 | Module-global resource counters (`e6-cas`), irrational critical points abstain in the checker partition, `numericDisagree` sampling can set `different`, `verifySymbolicTransformation` general soundness. | hypothetical / unestablished | — |

## 4. Completeness distinctions (what is enforced)

| Distinction | Algebra | Natural calculus | Geometry/prob./others | Typed |
|---|---|---|---|---|
| Intermediate calc vs complete solution | ENFORCED (solved form + final set) | ENFORCED (answer line) | SUBSTITUTED: a line matching `goal.value` | route flag |
| One solution vs entire set | ENFORCED | n/a | n/a | n/a |
| Conditional vs unconditional | extraneous roots ENFORCED; domain of cancelled factor RECORDED only | ENFORCED (needs stated domain) | probability assumptions ENFORCED but student-dischargeable | ABSENT |
| Necessary vs sufficient / equivalence vs implication | ENFORCED (subset/superset/equal) | identity only | "entailed" only, no direction | ABSENT |
| Relevance to requested quantity | RECORDED (premises ignored) | ENFORCED by anchoring (`D`-operator lines auto-anchored) | SUBSTITUTED by number pool | structural |
| Correct answer vs justified derivation | **ABSENT** (S1) | partial (chain checked line to line; `3x²=3x²` accepted) | **ABSENT** (S2, S3) | **ABSENT** (S4) |

## 5. Independence and provenance

- Code paths are separate, but the *criteria* are the same: `u4-kernel` and the `exact-solution-set` family are both "same solution set / scalar multiple of the difference polynomial" through `independent-checker.ts` (own parser/Q/`proof-kernel`), and both depend on `natural-working.ts` parsing; `independent-polynomial-identity`, `e5-independent-geocalc` (calculus part) and `calculus-binder-e5.ts:50` call the same `independent-checker.certify`; e5 and e6 share `exact-e5.ts`, `claim-grounding.assessRelevance`, `digestOf` and the line account; `independent-ir-evaluator` compares one parse with itself. For inequalities, radicals, absolute value, systems and any non-`x` variable the native route is `unsupported`, so a single implementation carries `independentlyVerified:true`.
- Two agreeing routes are therefore not evidence of independent proof. Real independence is limited to: math-core native vs checker on polynomial/rational equations; e6 CAS vs base calculus for natural calculus.
- `canonical-math-ir.ts` records ("does not prove algebraic equivalence"); the `.canonical` obligation field is never consulted by any decision.

## 6. Testing strategy: why E1–E6 looked strong

| Factor | Evidence |
|---|---|
| Exposure/contamination | 1725 natural cases were developed, tuned on (dev/validation scored repeatedly) and reused as regression; sealed sets are single-use only once. E6 report discloses "family names are exposed to the author; corpus not family-disjoint from the engine design". |
| Narrow, templated inputs | E3–E6 cases are produced by Python oracle generators (`e6_oracle.py`, `kit.py`, `auth_*.py`). Line-template diversity: 1958 distinct templates in 4164 old lines; only **19%** of the 1230 holdout line templates occur in the old corpus; prose words appear in 4.1% of old cases vs 33.4%, colons 1.2% vs 11.5%, inequalities 5.2% vs 15.7%, comma lists 11.2% vs 22.6%. |
| Shared assumptions | Labels share the engine's equivalence notion ("every line true at the solution set"), so S1-style acceptance cannot show up as a failure; goal values appear in the task, so coincidence goes unpunished. |
| Injection battery blind spot | 0/4474 false verified, but mutations are applied to cases that already parse; it cannot measure parse coverage, and it mutates values, not derivation structure (value-preserving rewrites such as `40 = 75−35` are not mutations). |
| Unsupported notation/domains | N1+B = 367/446 mismatches. |
| Genuine unsoundness | S1–S7, S9 above; none was visible in prior suites. |

**Sustainable strategy (all local, compact summaries, no per-case output in agent context):**
1. Metamorphic relations, each with an independent exact oracle: (a) *notation-preserving rewrites* (prefix "so/therefore", trailing period, ✓, `:` labels, `×`/`*`, unicode minus, `°`) must not change the verdict class; (b) *value-preserving laundering* (replace a derived number with an equal-valued unrelated expression, e.g. 40 → 75−35, 60 → 120÷2) must never move non-verified → verified; (c) *route twins* (typed vs natural of identical content) must agree; (d) *premise* addition/removal and domain extension must change `missing-assumption`/`verified` as the mathematics dictates; (e) *line deletion* from a verified derivation may yield `incomplete`, never `invalid`; (f) *alpha-renaming* of variables; (g) *scaling/commuting* of equations; (h) *adding an irrelevant true line* must not change the verdict.
2. Property-based generators from exact oracles for each family (random polynomials, rational functions with singularities, angle configurations) with *guaranteed-falsifying* mutations (sign, dropped factor, branch) and *guaranteed-preserving* rewrites, reporting FA rate, FR rate and **decisive rate** separately, per invariant.
3. A **refusal-aware score**: report coverage (decisive/total) as the primary metric and FA as a hard gate; never "accuracy" alone.
4. Rotating sealed pools generated by independent authors from a notation corpus not used for development, scored once each; development corpora retired after exposure.

## 7. D. Architectural reuse assessment

- **Sound and reusable as is:** exact rational/surd arithmetic (`core`, `Q`); algebra solution-set relation and extraneous-root/loss detection (`relate()`); e6 CAS identity with derived requirements and Laurent-series limits; symbolic M3 certificate replay; congruence criteria table; claim ledger and obligation propagation (as a *withdrawal* gate); the `adjudicate` structure (minus S10 asymmetries).
- **Need integration corrections (mechanism exists):** derivation route search in math-core (exists, switched off); domain-requirement derivation (exists for natural, not typed); structured kernels' rule/method fields; parser normalisation and error isolation; provenance binding; the e5 Python prover (exists, only vetoes, cwd-dependent); natural adapters for the structured trig/exp-log/sequences/linear-algebra kernels (kernels exist, natural routes do not).
- **Lack general mathematical semantics:** geometry numeric chains (arithmetic distance as justification), probability/complex/linear-algebra chain grounding, typed calculus domain semantics, statement-problem premise handling, ODE/series/improper/FTC/double-integral families, logs/exponentials in algebra text.

## 8. E. Minimal corrective plan (no rewrite; five shared mechanisms)

| # | Shared mechanism | Invariant restored | Independent test |
|---|---|---|---|
| 1 | Make *derivation* the acceptance criterion where a derivation search already exists: enable the math-core route search (`route:true`) as enforcement for algebra lines; for numeric chains require the written operation, not the number pool, to be built from established quantities (drop the goal value from the pool; check operands actually used) and make each line depend on the lines it cites | every accepted line follows from earlier lines/givens by a licensed operation | laundering mutations (b) and coincidence generator must never reach `verified`; adding a justified line must not lose acceptance; run on all 11 C-class families |
| 2 | Run typed claims through the same context/domain derivation as natural input (claim domain ∩ problem domain, per connected component; continuity for definite integrals) and make `unsupported`, not `invalid`, the verdict for unrecognised rule-form shapes | `F′=f` on the stated domain; ∫ over a singularity needs convergence; typed ≡ natural | route-twin metamorphic test over a generated set of singular/non-singular antiderivatives |
| 3 | Parse fidelity and line-level isolation: round-trip (parse→print→compare) before any refutation; unreadable line ⇒ that line `unsupported`, not the whole submission; fix the decimal-strip; define the notation scope as a published contract with a refusal message naming the construct | a refutation is issued only for a claim proven to be the student's claim; one unreadable line does not hide the rest | notation-preserving rewrites (a); decimal-leading line tests; round-trip property over generated expressions |
| 4 | Bind premises and assumptions: problem premises (`, x>0`) restrict the admissible set; student statements may state but not discharge task assumptions | admissible set = solutions ∩ stated premises; assumptions are task-given or conditional | premise add/remove metamorphic (d) |
| 5 | Bind evidence to the claim (claim digest in the evidence, matching by content not line index) and state explicitly whether rule/method labels are semantic; if semantic, check them, if not, document and ignore them | evidence.claimDigest = obligation.claimDigest; labels never silently affect or fail to affect | synthetic-evidence tests (mismatched claim, unregistered kernel) plus label-permutation test (verdict invariant or documented) |

Secondary (same mechanisms): relativise rule-form `invalid` when no route accepts (mechanism 2), make base-ambiguity abstention depend on the specialised route actually having read the same text, require per-step grounding for later chain members (mechanism 1), and set geometry root from the module location rather than `process.cwd()`.

## 9. F. Explicit uncertainty

- Not established by static inspection or tests: soundness of `verifySymbolicTransformation` beyond the probes; correctness of the checker's partition at irrational critical points; `numericDisagree` sampling behaviour; the Python prover's rule completeness; `calculus-binder-e5.ts`/`exact-e5.ts` internals; math-core `working-assessment` internals (why it also accepted `x=8−6`); polynomial remainder, sequences, radicals beyond structure; whether the side-claim rerun has an exploit.
- Probes cover several hundred inputs; absence of a failure anywhere is not a soundness claim. Limits, singular definite integrals and most geometry probes were mostly `malformed`/`unsupported`, which *hides* soundness (the unsupported rate masks unexamined acceptance behaviour).
- My holdout labels are one author's policy on borderline cases (21 contested); the cwd defect S11 affected 4 typed-geometry results of my own run.
- Classification A–D is assessed against the stated rubric from code reading and executed traces; boundaries between B and C are judgement.

## 10. Stop condition
This report is the deliverable. No implementation, no new holdout, no merge or deployment; E7 is not complete.
