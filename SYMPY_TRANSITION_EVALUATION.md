# SymPy transition verification — prototype, benchmark and recommendation (Agent 3)

Branch `feat/math-transition-sympy-evaluation`, baseline `837c79c`. All experimental code is under `research/sympy-transition-eval/`; no production file changed (`git diff 837c79c -- packages backend frontend tools` is empty). SymPy 1.14.0 (the version pinned in `tools/mathematics/engine-trial/requirements.txt`), mpmath 1.3.0. Nothing merged or deployed.

## 1. Answer

**Adding SymPy as an independent verifier materially improves recognition of valid transitions in specific categories without new false acceptances — but the largest lever for E7 is its natural-text front end, not symbolic power, and the student-facing path would not benefit today.**

| Exposed 678 holdout | exact | false acceptances | false rejections | correct work called *invalid* |
|---|---|---|---|---|
| A. E7 alone | 236 | 0 | 212 | 16 |
| B. SymPy prototype alone | 233 | 1 | 190 | 0 |
| **C1. E7, SymPy decides only when E7 cannot** | **323** | **0** | **159** | **7** (+10 *conflict → review*) |
| C2. as C1, SymPy may only add *verified* | 288 | 0 | 159 | 7 (+10 review) |

C1 recovers **53** of E7's 212 false rejections, keeps 235/236 of E7's exact decisions (the one change is `h7-typed-033`, moved from E7's correct *invalid* to *conflict → review*), and introduces no false acceptance. Recovery is concentrated: algebra 31 (of 59 algebra false rejections), calculus derivatives/integrals/limits 14, typed calculus 8; **geometry 0, other domains 0, proof-style calculus 0**.

Independent adversarial suites (authored for this evaluation, not drawn from the holdout): transitions (125) — E7 78 correct / 1 unsound, SymPy 123 correct / **0 unsound** / 2 safe abstentions; whole workings (40) — E7 exact 14 with **4 false acceptances**, SymPy exact 34 with 0 false acceptances.

## 2. Prototype (`research/sympy-transition-eval/verifier/`)

| File | Role |
|---|---|
| `safe_parse.py` | Tokenizer + Pratt parser that builds SymPy objects directly from a closed whitelist. **No eval / sympify / parse_expr.** Bounds: 600 chars, 400 tokens, depth 60, exponents ≤ 64, 40-digit numbers, ≤ 8 ± branches. Records natural-domain conditions (denominators ≠ 0, radicands ≥ 0, log arguments > 0, tan/sec/cot/csc poles) *before* SymPy auto-simplification, so `x/x` keeps x ≠ 0. Refuses ambiguous notation (`1/2x`, `6/2(1+2)`, bare `log`). |
| `transition.py` | `verify_transition(prev, next, variables, assumptions, task)` → `equivalent | implication | invalid | unresolved` with mode, counterexample, required restrictions, evidence, ms. |
| `cases.py` | Evaluation adapter: whole problem + working → E7 verdict vocabulary (algebra solve/systems/expressions, derivatives, integrals, limits, implicit/parametric, typed calculus claims, typed symbolic chains). Out of scope → `unsupported`. |
| `service.py` | Process-isolated worker (`python3 -I`, RLIMIT_AS 1.5 GB, RLIMIT_CPU, per-call CPU-time limits via ITIMER_PROF) + supervising client with a wall-clock timeout that kills/restarts the worker and returns `unresolved`. |

Semantics. *solve*: statements compared as real solution sets over the natural domain ∩ assumptions; equivalent = equal sets; implication = prev ⇒ next (next admits more: extraneous candidates reported); invalid = an exact point satisfying prev but not next (lost solution). *expression*: functions with natural domains; equivalent = exact identity on equal domains; implication = equal wherever prev is defined, next defined more widely (restriction reported, e.g. `x in (-oo,1) ∪ (1,oo)`); invalid = exact point where values differ or where prev is defined and next is not.

Soundness rules enforced in code: equivalence only from exact symbolic reasoning (zero test of the difference by cancel/expand/simplify/trigsimp/radsimp/log expansion, piecewise removal of |p(x)| by exact real roots, exact set equality, exact constant ratio between equations) — **never from agreement at sample points** (tested: an expression agreeing with `x` at every point the search tries stays `unresolved`); invalid only from a counterexample re-checked by exact substitution with certified-precision evaluation (`evalf(strict=True)`); every other outcome is `unresolved`; assumptions only from the caller (sign assumptions for SymPy are derived from the stated domain, never invented).

Mandated examples: `x² = 9 → x = 3` **invalid**, counterexample x = −3; `(x²−1)/(x−1) → x+1` **implication**, required restriction x ≠ 1, and **equivalent** once `x ≠ 1` is an assumption; `x+2 = 5 → 2x+4 = 10` **equivalent**.

Case-adapter guards added after the holdout exposed failure classes that pure semantic equivalence cannot see (each abstains or reports the obligation, never credits): written computation with an operand not grounded in earlier lines (`4x=8 → x=8−6`, right value via unrelated arithmetic); denominators cleared without stating excluded values (missing-assumption); extraneous candidates dropped with no visible check (missing-assumption); final derivative still containing `'`/`d/dx`; antiderivative without `+ C` or defined on less than the integrand's domain (missing-assumption); a common factor left in a "simplified" fraction (checked on the unevaluated written form); case-scoped calculus lines (unsupported).

Tests: `python3 -m unittest discover -s research/sympy-transition-eval/tests` — **18 pass / 0 fail** (mandated examples, soundness, hostile input: no code execution with injection strings, resource bounds, client timeout path, case adapter, determinism).

## 3. Holdout comparison by category

(exact / false acceptances / false rejections / correct work called invalid / E7 false rejections recovered)

| category (n) | A: E7 | B: SymPy | C1 |
|---|---|---|---|
| algebra-equations (85) | 38 / 0 / 27 / 0 | 63 / 0 / 12 / 0 / 15 | 61 / 0 / 12 / 0 / 15 |
| algebra-expressions (81) | 10 / 0 / 32 / 0 | 41 / 0 / 16 / 0 / 16 | 40 / 0 / 16 / 0 / 16 |
| calculus-derivative (81) | 48 / 0 / 15 / 1 | 50 / 0 / 9 / 0 / 6 | 58 / 0 / 9 / 1 / 6 |
| calculus-integral (78) | 13 / 0 / 28 / 0 | 11 / 0 / 28 / 0 / 5 | 23 / 0 / 23 / 0 / 5 |
| calculus-limits-series (70) | 7 / 0 / 29 / 0 | 8 / 0 / 27 / 0 / 3 | 11 / 0 / 26 / 0 / 3 |
| geometry (83) | 39 / 0 / 22 / 3 | 0 / 0 / 36 / 0 / 0 | 39 / 0 / 22 / 3 / 0 |
| other-domains (100) | 21 / 0 / 33 / 3 | 3 / 0 / 40 / 0 / 0 | 21 / 0 / 33 / 3 / 0 |
| typed-routes (100) | 60 / 0 / 26 / 9 | 57 / 1 / 22 / 0 / 17 | 70 / 0 / 18 / 0 / 8 |

Where each engine is best: E7 for geometry, other domains, rule/method-aware typed steps, and everything it parses in algebra (it already computes exact solution sets). SymPy for expression identities with domains, antiderivative checks by differentiation, exact limits, typed calculus claims, and natural algebra written in forms E7's parser refuses.

Recovered by root cause (`E7_FALSE_REJECTION_ANALYSIS.md`): parser/representation 35 of 123, equivalence not recognised 7 of 7, unsupported operation 11 of 50; rule contracts 0 of 18 (9 become *conflict → review*), side claims 0 of 7, domain handling 0 of 6.

**B's abstentions on the holdout** (435 undecided): out of prototype scope 274 (geometry, other domains, proof-style calculus, word problems), clause not parsed 99, undecided mathematics 16, grounding guard 7, other 39. **Domain-related outcomes**: B reported 9 domain/assumption obligations as missing-assumption (cleared denominators 3, unchecked extraneous drop 2, missing `+C` 2, cancelled factor 1, partial-domain antiderivative 1); no domain-related false acceptance in any suite.

**The one B false acceptance** (`h7-typed-033`) is a rule-citation error: the claimed derivative 2cos(2x) is right but cites the power rule. SymPy sees claims, not cited methods; in C this case is a conflict routed to review, not credited.

**Conflicts (10)**: E7 says *invalid*, SymPy proves the work exactly correct. Nine are E7 false-invalid verdicts on correct typed claims (`h7-typed-005/009/037/043/044/046/048/049/055`); one (`typed-033`) is the rule-citation case above. The proposed policy never auto-credits a conflict.

## 4. Independent adversarial suites

**Transitions** (`adversarial/transitions.py`, 125 cases, 13 categories incl. expansion/factorisation, rational cancellation, ÷ by possibly-zero expressions, squaring/extraneous roots, loss of solutions, inequalities × negatives, radicals real/complex, trig, log/exp, calculus operators, unfamiliar methods, malformed/hostile input). E7 run through its own entry points: `assessAnswerFirst` per-transition diagnosis (solve type — the student-facing kernel) and the unified engine's symbolic route on converted typed JSON (expression type).

| | correct | safe abstention | over-restrictive | unsound |
|---|---|---|---|---|
| A: E7 | 78 | 42 | 4 | **1** (`trig-07` cos 2x → 2cos²x − 1 called invalid) |
| B: SymPy | **123** | 2 (`rad-06` √(ab)→√a√b, `log-04` ln a + ln b → ln ab: multivariate domain) | 0 | **0** |
| C | 123 | 2 | 0 | 0 |

Solve-type transitions: E7 50/59 correct, 0 wrong; SymPy 59/59. Expression-type: E7 28/66 (19 of its misses are inputs that cannot be expressed in its typed JSON — d/dx, eˣ — the rest are refusals such as "removing an absolute value requires a nonnegative assumption" for √(x²) → x, which is a safe answer), SymPy 64/66. E7's 4 over-restrictive verdicts (`rat-06/10/12`, `rad-07`) demand a restriction where none is needed (e.g. (x²+1)/(x²+1) → 1). All 13 malformed/hostile inputs (injection strings, `9^9^9^9`, 400-term input, `1/2x`, `6/2(1+2)`, bare `log`, unbalanced brackets) are `unresolved` in both engines, and no code executes.

**Whole workings** (`adversarial/cases_suite.py`, 40 algebra workings, labels fixed before B/C were run):

| | exact | false acceptances | false rejections |
|---|---|---|---|
| A: E7 | 14 | **4**: `ca-03` (3x=18 → x=18−12 → x=6), `ca-13` (denominators cleared, no restriction), `ca-27` (excluded value −3 not stated — E7's own justification says so, yet verifies), `ca-11` (extraneous −2 dropped without a check; E7 deliberately accepts engine-proven elimination — a policy difference) | 15 |
| B: SymPy | **34** | **0** | 5 (prose `not -2` / `outside the domain`, `2^4` treated as ungrounded, restriction after a comma in an expression line, system answer split across lines) |
| C1 | 28 | 4 (inherited: C never overrides a decisive E7 verdict) | 5 |

The first three are consistent with the holdout's own labelling of the same patterns (`h7-algA-048` invalid, `h7-algA-065` missing-assumption, `h7-algB-073`-style restriction requirement). They are false acceptances by the unified engine on inputs outside the holdout and are reported for Agent 1/2's attention; this evaluation did not change E7.

## 5. Is the gain from SymPy or from parsing?

- **Front-end only experiment** (`harness/normalize_text.py`): E7 on syntactically normalised text (clauses split, labels/prose stripped) → exact 202, FR 227, 2 false acceptances; as a retry only when E7 is undecided → exact 252 (+16), FR 205, recovered 7, **1 new false acceptance** (`h7-algA-065`: once the prose "multiply both sides by x(x+1):" is removed, E7 accepts uncleared-denominator work without the restriction). A preprocessor in front of E7 is not a safe shortcut; parser work has to be done inside `natural-working.ts` with E7's obligation semantics.
- **Attribution of C1's 53 recoveries**: 35 have a parse/representation primary cause, 18 need mathematics E7 lacks (exact antiderivative/limit checks, factorisation identity, typed limit claims). For algebra equations E7's kernel already decides the same relations as SymPy (adversarial solve-type: 50/59 correct, 0 wrong); its losses there are parsing. For expression identities and calculus the CAS adds real capability.
- **Contamination caveat**: the case adapter was iterated with the exposed holdout and its labels visible (each guard in §2 was added after a holdout failure). Holdout B/C numbers are therefore optimistic; the adversarial suites are the unbiased check, and the case suite was not tuned after its first run (its 5 B misses are reported as found).

## 6. Performance and resources

| | p50 | p95 | p99 | max |
|---|---|---|---|---|
| A per case (holdout) | 1.23 ms | 10.6 ms | 22.7 ms | 70 ms |
| B per case (holdout, 1 worker, includes IPC) | 0.83 ms | 54.9 ms | 224 ms | 783 ms |
| C per case (A + B when invoked) | 2.64 ms | 53.7 ms | 215 ms | 785 ms |
| A per transition (adversarial) | 0.82 ms | 4.5 ms | 19.1 ms | 19.7 ms |
| B per transition (adversarial) | 14.7 ms | 101 ms | 296 ms | 298 ms |

Worker cold start 0.3 s; RSS 59 MB after 200 cases; 678 cases in 9.9 s on one worker; **0 timeouts, 0 crashes**. Determinism: identical verdicts with 1 and 4 concurrent workers after switching per-call limits from wall-clock (`SIGALRM`) to CPU time (`ITIMER_PROF`); with wall-clock limits one verdict (`h7-calcI-005`) flipped under load. A pathological 38-term trigonometric input returns `unresolved` in 63 ms.

## 7. Integration architecture

| Option | Assessment |
|---|---|
| A. Fallback when E7 cannot decide | Measured as C1: +87 exact, −53 FR, 0 FA, latency added only on fallback. Safe only with the conflict rule and restricted to categories where SymPy has an answer contract. |
| B. Independent verifier alongside E7 | Doubles cost on every case for little gain where E7 decides; useful offline as a cross-check (it found E7's false-invalid `trig-07` and 9 typed false-invalids, and the case-suite false acceptances are exactly what such a cross-check catches). |
| C. Service for particular operations | Best fit for: antiderivative-by-differentiation, exact limits, expression identity with domains, typed calculus claims. |
| D. Offline only | Correct **for now on the student path**: answer-first (the only student-facing engine) is algebra-only, and for algebra E7's kernel already matches SymPy once parsed. |

Assessment of the requested concerns: **TS↔Python** — reuse the `geometry-worker.ts` pattern (spawned pool, NDJSON, queue limit); the prototype's `service.py` protocol is a drop-in shape. **Serialisation** — send text plus explicit `variables`/`assumptions`/`task`; typed JSON `Expr` maps 1:1 (`cases.from_json`). **Parser security** — only the no-eval parser (`safe_parse.py`) is acceptable; every existing SymPy oracle uses `sympify`/`parse_expr`. **Limits** — RLIMIT_AS, CPU-time per call, wall-clock per request with kill/restart; resource failure is always `unresolved`. **Domain preservation** — conditions recorded pre-simplification; implication carries the restriction. **Determinism** — CPU-time limits (shown above); pin SymPy. **Hosting** — Render backend already runs Python; SymPy + mpmath ≈ 48 MB on disk, ~60 MB RSS per worker, p95 ≈ 55 ms per case. **Contracts** — map `equivalent` → proven derivation obligation, `implication` → proven with a domain obligation, `invalid` → disproven with witness, `unresolved` → unsupported; register as a `MECHANISMS` entry so `standsOnObligations` keeps applying.

## 8. Recommendation

1. **Next action: harden `L/natural-working.ts` (TypeScript, no SymPy)** — label prefixes with `:`, chained inequalities, `±` inside expressions, `x = a, b or c` lists, `x≠a and x≠b`, prose connectives (`so`, `hence`, `which is excluded`), per-line instead of all-or-nothing accounting (`proof-integrity.ts:151-166`), and case-scoped lines. Use `research/sympy-transition-eval/verifier/cases.py:split_clauses` and the 123 class-1 cases as the specification, measured with `repair/holdout-diag.ts` and both adversarial suites.
2. **Adopt the SymPy verifier now as an offline independent cross-check (option D, plus B in CI)** over corpora and generated items: flag E7 false-invalids (conflicts) and E7 acceptances SymPy can refute or for which it reports an unmet obligation. Fix the four case-suite acceptances (`ca-03/11/13/27`) and the 9 typed rule-contract false-invalids in E7 (Agents 1/2's scope).
3. **Runtime option A/C only if the unified engine becomes student-facing, and only for calculus answers and expression identities**, never overriding a decisive E7 verdict, conflicts to review. Files/interfaces that would change (proposal only, not implemented):
   - new `packages/learning/src/sympy-worker.ts` (pool modelled on `geometry-worker.ts`; protocol `openpath-sympy-transition@1`: `{op: transition|case, prev, next, task, variables, assumptions}` → `{verdict, mode, counterexample, required_restrictions, evidence}`), and the Python package moved from `research/sympy-transition-eval/verifier/` to `research/sympy-verifier/` with pinned requirements;
   - `L/evidence-provenance.ts` `MECHANISMS`: add `sympy-transition@1` (equivalence evidence = exact identity/set certificate; invalid evidence = re-checked witness);
   - `L/unified-math-engine.ts` `collectReports`: optional `sympy` route for calculus/symbolic when the base route is undecided;
   - `L/certification-authority.ts` `adjudicate`: explicit conflict rule (E7 invalid vs SymPy proven → `unsupported`/review, never verified);
   - `backend/requirements.txt` (sympy==1.14.0) and the grader manifest only if the engine enters the student path.
4. Do **not** pursue SymPy for geometry, proof-style calculus (series tests, squeeze, epsilon-delta, improper/FTC), or most other-domain tasks — they need rules and adapters. No test here showed a need for Maxima, Lean or Z3.

## 9. Limitations

Prototype scope is real-variable algebra, single-variable calculus answers and typed calculus claims; multivariate domain reasoning is shallow (two adversarial abstentions); trigonometric solution sets (periodic) are left unresolved; method citations are invisible to SymPy; the grounding guard is a heuristic that abstains; holdout numbers are optimistic (contamination, §5); the adversarial suites were written by the same author as the verifier (expected verdicts fixed before running). This is not universal mathematical verification.

## 10. Reproduce

```
# SymPy 1.14.0 + mpmath 1.3.0 on the Python path (pinned in tools/mathematics/engine-trial/requirements.txt)
bun research/sympy-transition-eval/e7-dump.ts research/sympy-transition-eval/out/e7-rows.json
python3 research/sympy-transition-eval/harness/run_holdout.py --workers 1
python3 research/sympy-transition-eval/harness/classify_fr.py
python3 research/sympy-transition-eval/adversarial/transitions.py && python3 research/sympy-transition-eval/adversarial/to_e7_json.py
bun research/sympy-transition-eval/adversarial/e7-transitions.ts && python3 research/sympy-transition-eval/adversarial/run_transitions.py
python3 research/sympy-transition-eval/adversarial/cases_suite.py
bun research/sympy-transition-eval/e7-dump.ts research/sympy-transition-eval/out/e7-rows-cases-suite.json research/sympy-transition-eval/adversarial/cases-suite.json
python3 research/sympy-transition-eval/adversarial/run_cases_suite.py
python3 -m unittest discover -s research/sympy-transition-eval/tests
```

Machine-readable results in `research/sympy-transition-eval/out/`: `holdout-results.json` (per case A/B/C1/C2, reasons, latency), `holdout-summary.json`, `e7-false-rejections.json`, `adversarial-transitions-results.json` / `-summary.json`, `adversarial-cases-results.json`, `parser-attribution.json`, `e7-rows*.json`, `baseline-holdout-diag.json`.
