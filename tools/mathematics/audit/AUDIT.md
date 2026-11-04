# OpenPath Mathematical Intelligence Engine: independent architecture and generality audit

Branch `audit/math-engine-generality` (from PR #77 head `c95f0f9`). No production code, frozen data or acceptance criteria were changed. Defects are documented in section 5 and proposed fixes in section 10; none were applied.

Evidence labels: **[V]** verified by a command in section 11; **[P]** plausible concern, not demonstrated; **[U]** unresolved question.

Disclosure: the same assistant wrote the code under audit. To reduce anchoring, the challenge suite (145 equations) and the soundness hunt were done by two fresh agents that were told not to read the generators or frozen sets, and the soundness agent derived true answers by its own reasoning. My own contributions are the code measurements, the ablation, and the architecture analysis; the owner should weigh those with that in mind.

## 1. Executive conclusion

**Recommendation: Option B, refactor before expansion.** The mathematics inside the supported scope is sound and well verified. The architecture is not yet a shared reasoning engine, and two verified soundness defects sit just outside the tested distribution.

1. **K05.2 is built beside K05.1, not on it.** The PR #75 planner does not use the kernel rule registry at all [V]. K05.2 registers its own rules, uses none of the kernel's 14 default rules, and reuses only `Rational/Expr/evaluate`, `expr-text.ts`, and one function (`movesFrom`) of the planner [V]. Production core grew from 352 to 739 lines [V].
2. **The search is shallow.** A fixed pipeline over the same rules (restrict, cancel, clear, simplify, move-left, divide-by-restricted, then PR #75's linear planner) with no search at the K05.2 level scores 206/206 dev, 400/400 eval, 300/300 holdout, and 75/75 on the independent supported cases [V]. Search effort is real only in the linear sub-planner [V]. The rules compose, but the engine as written does not need composition to reach its score.
3. **Soundness defects** (section 5): negative exponents are not recorded as denominators, which yields a wrong "identity" answer [V]; the independent checker does not validate its own "from" state [V]; parse errors escape as crashes instead of reason-coded refusals [V].
4. **Verification is weaker than "independent" suggests** (section 7): the engine's per-rule verify *is* the internal checker [V], and the oracle, datasets and checker share author, spec and conventions.

Final question (section 12): with ten different capabilities, the current code leads toward several specialised solvers behind a common interface, but the parts that would prevent that (Poly/RatFun, DomainState with evidence, effect classification, exact substitution) exist and are reusable. Refactoring the planner and rule contract first changes the answer.

## 2. Source and commit inventory

| PR | Branch / commits | Production TS | Notes |
|---|---|---|---|
| #69 kernel spike | `spike/oss-math-engine`; `891ebed` exact bigint, `0cc05d3` engine trial | `math-kernel.ts` 1,325 lines | `Rational`, `MathExpr`, `MathState`, `MathRule`, `RuleRegistry`, 14 default rules |
| #75 K05.1 | `4d40455` freeze, `006f4d9` E1-E2, `f8e20fd` E3, `111a1eb` | `planner.ts` 269, `expr-text.ts` 83, `construct.ts` 141 | linear equations |
| #76 K05.2 proposal | `922dc0c` | none (docs, oracle, frozen data) | `domain_oracle.py`, `verify_datasets.py` |
| #77 K05.2 impl | `dc3f087` D0+D1, `a26ee73` D2, `578cfb2` D3, `57fbffc` D4, `c95f0f9` D5 | `poly.ts` 193, `domain-state.ts` 144, `domain-checker.ts` 11, `domain-rules.ts` 251, `domain-engine.ts` 140 | rational equations |

Reports reviewed against source, not trusted: PR bodies, both `REPORT.md` files.

## 3. Actual reasoning architecture

**Data.** `MathExpr` tree and `Rational` (kernel). K05.2 adds `Poly` and `RatFun` (exact univariate polynomials and rational functions) and `DomainState` (kernel `MathState` plus restrictions, candidates, evidence).

**Rules.** K05.1: moves are plain functions returning `{rule, explain, to}` (`planner.ts:151 movesFrom`), unrelated to `MathRule`. K05.2: 11 rules defined in a local `DEFS` map (`domain-rules.ts`) and adapted to kernel `MathRule` by `toMathRule`. The `effect` (equivalence or implication) and the `checks` list live in `DEFS`, outside the kernel type, because `MathRule` has no such fields [V].

**Discovery.** The kernel registry offers `register/get/applyRule/listRules` only [V]; `appliesTo` is never read by any reasoner code [V]. Applicable rules are found by hand-written enumeration: `movesOf` in `domain-engine.ts` branches on one test (does x occur in a denominator?) and lists rule/parameter pairs; each rule's preconditions then reject the unfit ones. Indices (`cancel-common-factor {index}`, `linear-step {index}`) couple rules to traversal order.

**Search.** K05.2 is breadth-first with deduplication, depth 14, 3,000-node cap. Median visited 23-29 states for a 6-7 step path. All its rules are equivalences, the implication rule is never selected, and the target is not known in advance (no stored answers; terminal test is `x = c`, a constant equation, or a false/true constant equation). K05.1 has the same BFS (duplicated) plus forced policies (simplify first, remove brackets first) that make some choices non-search.

**Verification.** Each rule's `verify` calls `checkTransition` (exact solution-set relation on polynomials), and `accept-candidate` substitutes into the original equation with the kernel's `evaluate`.

**Target knowledge.** The solution is not encoded. The solution *path* shape is: `movesOf` offers `clear-denominators` and `divide-both-sides` by restricted factors exactly when the proof of the macro pipeline needs them (section 4).

## 4. Is the reasoning compositional? Ablation [V]

`greedy-ablation.ts` replays a fixed priority policy using the same registered rules and no BFS. It was written after seeing the engine, so it embeds my knowledge of the domain; it measures how much the search contributes, not how well a naive solver would do.

| Policy | dev 206 | eval 400 | holdout 300 | independent supported 75 |
|---|---|---|---|---|
| Engine (BFS) | 206 | 400 | 300 | 75 |
| Fixed pipeline, linear stage by "first move" | 82 | 156 | 120 | 49 |
| Fixed pipeline, linear stage delegated to PR #75 planner | **206** | **400** | **300** | **75** |

Reading: search matters for choosing among linear moves (the K05.1 part), and not at the K05.2 level. That is an acceptable design if intended, but then K05.2 is a procedure with a sound rule vocabulary rather than state-space reasoning. Greedy-trap and rule-order categories in the independent suite did not separate them. [P] Harder, differently-shaped families (quadratics after clearing, systems) are where real search would matter, and nothing in this evidence shows the planner would scale there.

## 5. Mathematical soundness findings

| # | Severity | Status | Finding | Evidence |
|---|---|---|---|---|
| S1 | **High** | [V] | **Negative exponents are not denominators.** `x^-1` parses to `pow(x, neg(1))`; `denominatorsOf` has a negative-literal branch that cannot fire, and `RatFun.fromExpr` cancels `x^-1*x` to 1. `solve("1/(x-1)-1/(x-1)=x^-1*x-1")` returns `identity-on-domain` with restrictions `["1"]`, so x = 0 is wrongly counted as a solution (true set: all reals except 0 and 1). `checkStepText(x^-1*x=1 [] to 1=1 [])` returns valid. Unique-solution answers are protected by substitution, identity answers are not. | `soundness/verify-top.ts`, `soundness/FINDINGS.md` |
| S2 | **High** | [V] | **Checker never validates the "from" state.** Closure (I2) is enforced on `to` only; `original` is never passed from `checkStepText`. `(x^2-1)/(x-1)=2 [] to x+1=2 []` is accepted as valid (true sets: empty and {1}). The engine's own traces are unaffected because its states are closed by construction, but the "independent checker" claim (invariants I1-I3 at every step) holds only for the `to` side. | `verify-top.ts` |
| S3 | Medium | [V] | **Complex roots count as roots.** `solEquals` compares squarefree polynomials, so over the reals `x^2+1=0` and `x^2+4=0` (both empty) are reported as different. Errors are conservative (false rejection, never false accept). The engine gate refuses reduced degree >= 2, so `solve` never reaches it. Becomes live when quadratics are added. | `verify-top.ts` |
| S4 | Medium | [V] | **Crashes instead of refusals.** Parse errors (`2x`, `.5`, `1e0`, `+1/(x-1)`, a second `=`, unknown symbol `y`) throw from `solve`. 8 of 145 challenge cases. The acceptance criterion "every unsupported equation refused with a reason code" is met on the frozen set only because it contains no syntax errors. | `challenge/results.json` |
| S5 | Medium | [V] | **Unbounded runtime in `rationalRoots`.** The 1e12 coefficient limit does not bound work: a linear factor with leading coefficient 720720 takes 44 ms, 735134400 takes 1.2 s, 963761198400 over 100 s. | `soundness/probe_timing.ts` |
| S6 | Low | [V] | Parser strips whitespace first, so `1 0` reads as 10. `x/0=1` and `1/(x-x)=1` are refused with the wrong reason code (`numerator-outside-boundary`); `x^(x/x)=x` is accepted by the checker. | `challenge/results.json`, `FINDINGS.md` |
| S7 | Low | [V] | **The SymPy oracle reads decimals as floats**, so for `0.001/(x-1)=0.002/(x+1)` and `1/(0.25*x)=8` it reports "irrational excluded value" while the engine (exact) is right. The oracle is therefore not an exact authority on decimal input. | `challenge/trace-check.json` |
| S8 | Info | [V] | Held up under attack: repeated roots, exclusions, zero polynomial, `all` vs `set`, implication direction, division by zero, irrational/complex divisors in `zerosIn`, coefficient limit (beyond 1e12 always throws, never wrong). About 1,800 independent checks. | `soundness/findings.json` |

Computational shortcut treated as theorem: **polynomial equality of squarefree parts as "same real solution set"** (S3). It is a theorem for complex roots, not real roots; the code is correct in scope only because the gate keeps degree <= 1.

## 6. Independent adversarial and generalization results

Suite: 145 equations in `challenge/suite.json` (75 supported, 45 unsupported, 25 ambiguous), expected values from the agent's own `Fraction` reference (`reference.py`), 16 categories. SymPy was not used as authority. Engine run once, unmodified, nothing tuned (`run-challenge.ts`).

| Label | Result |
|---|---|
| Supported (75) | 75 correct, 0 refused, 0 wrong |
| Unsupported (45) | 35 correct refusals with matching reason; 3 refused with a non-matching code (safe); **7 crashed** (S4); 0 answered |
| Ambiguous (25) | 18 refused, 6 answered (all matched the independently computed truth), 1 crash |

Wrong answers on this suite: 0. Wrong answers anywhere in the audit: 1 (S1), found by direct inspection of code paths rather than by the suite, which shows the suite and the frozen sets share a blind spot on syntax forms a student could actually write. SymPy re-check of 289 engine steps: 0 invalid; 3 final claims the oracle could not confirm (S7 and an oracle syntax error on `1 0`).

Documented boundary gaps the suite exposed [U]: whether "each term" means as written or after reduction; products of fractions; nested fractions; negative exponent as denominator; `0^0`; literals >= 1e6; multiple `=`.

## 7. Independence of verification

| Component | Shares with the engine |
|---|---|
| Engine per-rule `verify` | **is** `checkTransition` (same function as the internal checker) [V] |
| Internal checker | `Poly`/`RatFun`, `Rational`, `expr-text` parser/printer, same spec of "solution set" |
| Engine gate | `Poly`/`RatFun`, same parser |
| `accept-candidate` | kernel `evaluate` only (independent of `Poly`): the strongest independent anchor [V] |
| SymPy oracle | independent arithmetic and parser; shares spec, author, scope conventions (excluded set from the unevaluated expression), and printed text [V] |
| Fraction-grid verifier | independent code; checks dataset labels, not engine steps; shares generator-recipe coverage |

Risks [V unless marked]: (1) a defect in `Poly`/`RatFun` that is also a defect in the checker would be invisible to both; the 5,000-case comparison against SymPy lowers this for polynomial arithmetic but not for conventions (S1, S2 are spec-level, and passed 1,353/1,353 adversarial cases because those recipes did not include them). (2) The adversarial and claims sets were authored by the same hand as the checker. (3) The oracle shares the written spec, so a shared misreading of "domain" would be shared [P]. (4) Feeding the oracle the engine's *printed* strings does catch print/parse divergence [V], a real independence benefit.

## 8. Reuse and marginal cost

Counted from git (`git diff --numstat`), added lines, data files excluded.

| | K05.1 (PR #75) | K05.2 (PR #76+#77) |
|---|---|---|
| Production TS, core (planner/engine/rules/state/poly/parse) | 352 | 739 |
| Production TS, incl. generator and runners | 520 | 813 |
| TS tests | 24 | 164 |
| Python tooling and oracles | 547 | 750 |
| Docs | 206 | 486 |
| New math primitives | parser/printer only | `Poly`, `RatFun`, `SolSet`, restriction/candidate/evidence types |
| New rules | ~7 move labels (not kernel rules) | 11 kernel-registered rules |
| New planner branches | BFS + 2 forced policies | second BFS + mode switch + refusal gate (4 codes) |

Reused unchanged by K05.2: `Rational`, `Expr`, `evaluate`, `MathState/MathConstraint`, `RuleRegistry`, `expr-text.ts`, `movesFrom` (for `linear-step`). Not reused: kernel default rules (including `algebra.divide-both-sides`, `algebra.multiply-both-sides`, `fraction-common-denominator`, which take JS numbers and have no domain notion) and the PR #75 BFS.

Duplicated: BFS loop, terminal test, equation printer (3 copies), term flattening (2), polynomial recognition (`linCoef` vs `Poly.fromExpr`), unsupported detection (`unsupportedReason` vs `gate`), divide/multiply/common-denominator rules vs kernel rules.

**Trend: cost per capability increased (about 2.1x core production lines for the second capability), mostly because K05.2 could not extend K05.1.** Reusable infrastructure: `Poly/RatFun` (~190), `DomainState` evidence/effect model, exact substitution acceptance. Rational-equation-specific: `movesOf`, `gate`, the scope boundary, the generators.

Estimated burden, **estimates only**: quadratics 400-600 core lines if `Poly` is extended (factoring, discriminant, real vs complex roots, S3 must be fixed); inequalities 600-900, because relation, direction reversal, intervals and sign conditions are new data; systems of equations 500-800 (multi-variable `Poly`); elementary geometry 800+ and mostly new representation. If the architecture stays as is, expect each estimate to be the upper end; with the refactor in section 10, the lower end.

## 9. Inequality design exercise (nothing implemented)

Examples: `3x + 2 < 11`, `-2x + 4 > 10`.

| Need | What exists | Gap |
|---|---|---|
| Order relation | `MathRelation` includes `<`, `>`, `≤`, `≥`, `≠` in the kernel type | The reasoner never reads `relation`: `withEq` hard-codes `"="`, `Eq` has no relation, `checkTransition` compares equations |
| Direction reversal | none | Rules need a relation transformer; multiply/divide preconditions need sign knowledge (`positive` exists as a `MathConstraint.kind`, unused) |
| Sign-dependent operations | `zerosIn` proves non-zero only | Needs sign analysis (interval arithmetic on `Poly`), so the equivalence/implication model needs a third case: conditional on sign |
| Solution sets | `SolSet = all | finite set` | Needs unions of intervals with open/closed ends |
| Conditional proof obligations | `Evidence.obligations` list is generic [V] | Reusable as-is; discharge procedures are new |

Assessment: the `Evidence` and effect model and `Poly` extend; `SolSet`, `checkTransition`, `solEquals`, the engine terminal tests, and the rule contract (`checks` with no sign facts) must change. This is a partial redesign of the verification core, not an add-on.

## 10. Capability classification

| Capability | Class | Basis |
|---|---|---|
| Bigint `Rational`, `MathExpr`, `evaluate` | A | `math-kernel.ts` |
| `MathState`, `RuleRegistry` envelope (register/apply/verify) | A, thin | no discovery, no effect type, `appliesTo` unused [V] |
| Parser/printer `expr-text.ts` | A | S4, S6 limits |
| `Poly` / `RatFun` exact arithmetic | B | univariate, rational coefficients, 5,000-case SymPy agreement [V] |
| `DomainState`, restrictions, evidence, effect classification | B | reusable pattern; real-line, one variable |
| Exact substitution into the original (`accept-candidate`) | A/B | uses kernel `evaluate` |
| `checkTransition`, `solSet`, `solEquals` | B, limited | finite real solution sets only (S3) |
| Rule vocabulary (cancel, clear, combine, multiply, divide, simplify) | B | rational equations; not shared with kernel rules |
| `movesOf`, `gate`, `terminal`, search parameters | C | rational-equation procedure |
| `movesFrom` linear planner, forced policies | C | linear only |
| Generators (`construct.ts`, `gen_domain_sets.py`) | C | recipes |
| SymPy oracle, `check_traces.py` | D | test-time only, not OpenPath reasoning |
| Inequalities, quadratics, systems, geometry | E | absent |
| Rule discovery from preconditions/registry, implication-side search, learned heuristics | E | absent |

No external library is used inside the engine itself. CortexJS/Compute Engine appears only in the PR #69 benchmark trial (`tools/mathematics/engine-trial`), not in reasoning.

## 11. Proposed fixes (not applied) and recommendations for the next milestone

1. **S1:** treat every non-polynomial or negative-exponent power as a denominator in `denominatorsOf`/`RatFun.fromExpr`, or make the gate refuse them. Add `x^-1` family to the adversarial recipes. (small)
2. **S2:** validate the `from` state in `checkStepText` (closure, original restrictions) and refuse irrational poles on both sides. (small)
3. **S4:** make `solve` total: parse and gate errors become refusals with codes (`syntax-rejected`, `undefined-expression`). (small)
4. **S5:** replace the coefficient-size limit by a work bound or a smarter rational-root search. (small)
5. **S3:** introduce a real-root test (Sturm sequence or squarefree-factor sign analysis) before any quadratic work. (medium)
6. **Rule contract refactor (the main item):** put `effect`, `checks`/obligations and a `relation`-aware state into the kernel `MathRule`/`MathState` types; give the registry a `discover(state)` API driven by `appliesTo` and preconditions so `movesOf` disappears; migrate the PR #75 moves into registered rules and delete the duplicate BFS, printers and term flatteners; extend `SolSet` to a sign-aware solution representation.
7. **Validation:** build a second challenge suite from sources the team did not write (textbook items, exam banks) and add a blind-test rule: nothing from it may be used for tuning.
8. Do not start inequalities or quadratics before 1-6 are done and re-measured with the section 4 ablation: the test of success is that the ablation's fixed pipeline *stops* matching the search on a new domain, which would show search is doing real work.

## 12. Decision and final question

**Option B.** Evidence for B and against A: the planner does not use the registry [V], K05.2 reuses little [V], cost rose [V], search is not load-bearing at the K05.2 level [V], two high soundness defects exist [V]. Evidence against C: rules are equivalence/implication-typed, restrictions and obligations are explicit and discharged per step [V], `Poly/RatFun`, exact substitution and the evidence model are reusable, and 3,000+ independently checked steps found no invalid transformation within scope [V].

**Will ten different capabilities yield a shared reasoning engine?** With the code as it is, probably not: each new domain would add its own `movesOf`-style procedure, gate and checker, beside a common-looking interface, as K05.2 did relative to K05.1. The shared pieces that would carry over are the exact arithmetic, the evidence model and acceptance by substitution, not the planner. After the section 11 refactor (a registry that discovers rules by preconditions, effect types in the kernel contract, relation-aware state, one search loop), the answer becomes defensible, and the measurable check is item 8.

## 13. Reproduce

From the repo root, with the project's TS loader (`ts-resolve.mjs`):
- Counts: `git diff --numstat 4d40455^..111a1eb` and `922dc0c^..c95f0f9`.
- Ablation: `node ... tools/mathematics/audit/greedy-ablation.ts macro+k051` (frozen sets) and `SUITE=challenge ...` (independent set); outputs `ablation-*.json`.
- Challenge suite: `python3 tools/mathematics/audit/challenge/reference.py --verify`; `node ... tools/mathematics/audit/run-challenge.ts`; `python3 tools/mathematics/audit/check_challenge_traces.py`.
- Soundness: `node ... tools/mathematics/audit/soundness/verify-top.ts` (top findings); full probes in `soundness/`.
- Suite hash: `b3d2e007560911ceb00b8cb3e1b124f3d2fc357c5edb410ebb13e1ce5e40b400`.
