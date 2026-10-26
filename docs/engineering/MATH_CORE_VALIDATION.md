# Mathematical core: final validation report (PR #81, `feat/math-core`)

Scope: the symbolic / multivariate / symbolic-exponent engines, the derivation harness (`core/derivation.ts`), the educator adapter (`core/educator-evidence.ts`, shadow mode only) and the resource limits (`core/budget.ts`). No new mathematical capability was added during validation; every code change below is a fix for a confirmed defect. PR #81 stays a draft; nothing is merged or deployed. The adapter produces evidence only (`markingEffect: "none"`); a written answer is still marked by an educator.

## 1. What is proved and what is only tested

**Proved (exact algebra, independent of sampling).** (a) "Identity with the previous line" is decided by the exact cross-product difference being the zero polynomial over Q (BigInt rationals). (b) "Not an identity" is claimed only from an exact witness point, evaluated in exact rationals. (c) "The new line is undefined where the previous line was defined" is decided by exact polynomial division / gcd (square-free parts), and one exact point where the original is defined and the new line is not is a proof (see `symbolic-validation/fixtures/sympy_witnesses.py` and `ORACLE_CORRECTIONS.md` C1). (d) The non-decision paths (`unsupported`, `ambiguous`, resource limit) make no claim.

**Supported only by finite testing.** The oracle (`oracle.py`) is a pointwise grid over exact rationals; it discovers counterexamples and corroborates verdicts, it does not prove universal identity or domain equivalence. Agreement counts below are evidence about the engine on the generated distribution, not a proof over all inputs. Symbolic-exponent results rest on one stated reading (section 7).

## 2. Evidence table

| Gate | Result (denominators are actual counts) |
|---|---|
| Full suite `bun test packages/learning` | **770 pass, 0 fail** (30 files; 725 at the start of the cycle, 763 at `b2c035b`) |
| Oracle, seed 1 / 2 / 3: valid cases | 1000/1000, 1000/1000, 1000/1000 agree; 0 false rejections |
| Oracle: invalid cases | 966/1000, 960/1000, 970/1000 agree; **0 false acceptances**; rest not decided by the engine (refused whole case 33/34/25, step unsupported 1/6/5): counted separately, never as agreement |
| Oracle: domain-sensitive | 527/527, 524/524, 526/526 agree (0 disagreements) |
| Oracle: symbolic exponent | 520/520 in each seed (0 disagreements) |
| Oracle: multistep | 520/520 in each seed (0 disagreements) |
| Oracle disagreements, final code | **0 / 0 / 0** (3,567 / 3,564 / 3,566 cases) |
| Distinct coverage (unique exact cases across seeds; duplicates removed) | valid 2,796 · invalid 2,216 · domain 956 · symexp 1,009 · multistep 1,281; transformation families 17 / 23 / 11 / 15 / 10; distinct structural shapes 2,222 / 1,610 / 232 / 749 / 859 (domain-sensitive is the narrowest family set) |
| Derivation harness vs oracle | decided cases agree 3,526/3,526 (seed 1), 3,513/3,513 (seed 2), 3,524/3,524 (seed 3); undetermined 41 / 51 / 42 (engine refusals, restriction-only working); silent-unconditional 0; later-line-repairs-invalid 0 |
| SymPy differential (valid, invalid, symexp single steps) | **7,194 agree · 12 SymPy-undecided (kept separate) · 3 disagree** (7,210 compared in the earlier run: one input is now `ambiguous` and excluded) |
| Educator shadow, 17 existing teacher cases (unchanged) | 17/17 agree with the independently derived expectation; production class differs 0/17; unknown→definite-wrong 0; marks produced 0 |
| Hand-labelled shadow (27 cases, labels written before running) | correctness 27/27 · first invalid step 6/6 · completeness category 19/19 · domain status 19/19 · skill evidence 2/2 |
| Adapter over the oracle-labelled corpus (10,697 cases) | correctness 10,563 agree, 134 undecided, **0 false accept, 0 false reject**; domain obligation 6,096/6,096; narrowing 6,096/6,096; first invalid step 4,467/4,467; marks produced 0 |
| Frozen K05.1 sets (smoke20, seeded500, edge50, holdout-b, constructed) | all five **byte-identical** to the committed traces; checker: 20 + 500 + 56 + 500 + 360 items, 0 problems; unit tests 5/5 |
| Frozen student corpus (700 tasks) and 2,884-transition set | output **identical to the 0cb80a4 baseline** (corpus: 35/40 in family F, the same 5 pre-existing `unsupported→invalid`; transitions: 2,668/2,884, the same 216 pre-existing) |
| Resource-limit invariant | 3 seeds x 1,189 cases x 3 tiny budgets (ops 50/400/3,000) = 10,701 assessments: **0 changed verdicts**; every change is decided→`unsupported` |
| Resource-state isolation | 8 tests (sequential budgets, direct engine calls after exhaustion, repeated and interleaved assessments, exceptional exit, nested scope) pass |

Timing-only artifacts were not committed; result JSONs under `symbolic-validation/data/` have per-case timings stripped.

## 3. SymPy disagreements (3 of 7,210) — final disposition

All three are `invalid` in the engine and `identity` in SymPy; they are an **assumption mismatch**, not engine defects. SymPy cancels `E/E` to 1 and ignores the domain; the contract compares domains (a line undefined where the previous line was defined and the original was not, with no restriction stated, is not a valid transformation). Resolved by an exact witness, not by "unsupported" (fixtures: `fixtures/sympy-disagreements.json`, `fixtures/sympy_witnesses.py`):

| Input | Engine | SymPy | Exact witness (original defined, new line undefined) |
|---|---|---|---|
| `(-2a+3b)/(-2a+3b)` → `(3b)/(3b)` | invalid | identity | a=1, b=0: original −2/−2 = 1; new 0/0 |
| `(2a+3z+3)/(2a+3z+3)` → `(2a+3)/(2a+3)` | invalid | identity | a=−3/2, z=1: original 3/3 = 1; new 0/0 |
| `(6y+3)/(6y+3)` → `(3y)/(3y)` | invalid | identity | y=0: original 3/3 = 1; new 0/0 |

If the student states the new restriction (e.g. `a ≠ −3/2`) the same step is `valid-with-obligation`. No corrective action needed. The 12 SymPy-undecided cases (SymPy timeout or no answer) are not counted either way.

## 4. Defects found and fixed in this cycle (with fixtures)

Engine defects found by the oracle (permanent fixtures `fixtures/regressions.json`, tests `validation-regression.test.ts`): leading minus eaten by verb stripping (false rejects and one false accept); polynomial restriction statements (`b-2 ≠ 0`) unread; letters outside a one-letter problem refused; symbolic-exponent obligations mis-flagged (exponent written with a variable that cancels; square-free bases). Oracle defects: grid lacked a=−3/2 and statement constants (`ORACLE_CORRECTIONS.md`).

Independent review (separate agent, ~25,000 probes, no reliance on the code's claims). Findings and disposition (regression tests in `review-regression.test.ts`, `budget.test.ts`):

| # | Class / severity | Disposition |
|---|---|---|
| D1 | crash, high: `DOMAIN_UNRESOLVED` escaped the public API | fixed: every refusal is `unsupported` |
| D2 | time, high: `(x+1)^K/(x+2)^K` held the thread for minutes (unmetered verifier arithmetic) | fixed: verifier metered, size-weighted; worst reproducer ≈1.5 s → `unsupported` |
| D15 | time/memory, high: two-letter gcd coefficient blow-up (>120 s, ~1.9 GB) | fixed: coefficient-size limit; reproducer 0.6 s → `unsupported` |
| D3 | time, medium: derivation re-ran the assessment per prefix | fixed: one shared budget for the whole derivation (110 s → 0.4 s); `resourceLimit` now propagated |
| D4 | false reject, high: `x ≠ 1, 2`, `x, y ≠ 0` read as an expression | fixed: shorthand lists are `unsupported`; "letter, restriction on other letters" is `ambiguous` only when it would otherwise be invalid. **Correct working is not credited** (safe, not wrong) |
| D5 | false reject, medium: trailing words (`ok`, `QED`) read as variables | fixed: `unsupported` |
| D6 | contract, medium: chain `A=B=C` forgot an earlier link's unstated restriction | fixed: invalid |
| D7 | false accept, medium-high: irrational-root restriction lost, reported complete | fixed: stays an open obligation in ledger and adapter |
| D8 | ledger, low-medium | invalid step no longer forgives an obligation (fixed); relabelling when the engine switches between prefixes (statement about another letter) **remains, low** |
| D9 | false accept of form, medium: lowest terms ignored a common numeric factor | fixed (integer-coefficient parts only; fraction coefficients unchanged) |
| D10 | ambiguous text got definite verdicts | fixed: `1/2x`, `6/2(1+2)`, `1/x(x+1)`, `1/(x+1)(x+2)`, `x2` are `ambiguous` (problem and lines, every engine). `x^2n` is still read as x²·n (standard precedence) |
| D11 | single-step API ignored original domain | fixed for restored restrictions; the context-free API still cannot see restrictions a student stated on other lines (use `assessWorking`/`assessDerivation` for solution-wide judgements) |
| D12 | derivation harness details, ill-typed input threw | fixed (declarations must be restrictions, no expression line → undetermined, NaN caps ignored, non-text input → unsupported) |
| D13 | `verified` with an open obligation unless `requireDomain` | by design (documented); the adapter reports `valid-with-outstanding-obligations` |
| D14 | doc mismatches | fixed in `MATH_CORE_SYMBOLIC.md` (amendments section) |

The reviewer found **no false accept of wrong algebra** in ~11,700 differential cases (one-variable, two-letter linear, symbolic exponent) beyond D7 and D9, now fixed, and 0 false accepts/rejects in a 600-case nonlinear two-letter differential after D15 was fixed. It re-checked reproducers against commit `ecce4ca`; the later residual fixes (size-weighted metering, `x2`, ill-typed input, D11) are covered by regression tests and the gates above, but were not re-reviewed by a second agent.

## 5. Performance (1,400 assessments, 200 per category, final code, milliseconds)

| Category | median | p95 | p99 | max | max RSS (MB) |
|---|---|---|---|---|---|
| simple univariate | 0.41 | 4.6 | 6.9 | 9.7 | 126 |
| multivariate expansions | 4.14 | 14.4 | 28.8 | 37.9 | 134 |
| rational cancellations | 3.57 | 10.2 | 22.3 | 34.9 | 136 |
| symbolic exponents | 1.19 | 7.1 | 10.9 | 22.1 | 125 |
| long derivations (30 lines) | 29.19 | 50.5 | 69.1 | 140.9 | 156 |
| high degree / nested | 1.06 | 6.7 | 13.9 | 20.3 | 134 |
| adversarial (expression explosion, 25-char towers, 400-deep nesting, 14-factor products) | 20.54 | 919.8 | 1,024.9 | 1,114.3 | 274 |

Adversarial outcomes: 125 resource-limit `unsupported`, 25 `unsupported`, 50 `invalid`; none invented a verdict. Cost of the limits: some heavy but legitimate inputs that were previously decided (e.g. `((a+b+c)^9-1)/((a+b+c)^3-1)`, `(x+1)^30/(x+2)^30`) are now `unsupported`.

## 6. Known unsupported classes (refused, never a verdict)

Bracketed restrictions `(x-1) ≠ 0`; shorthand lists `x ≠ 1, 2`; `±`, `∉`, `∧`, `or`, inequality restrictions; irrational restrictions (flagged, not statable); functions, roots, fractional exponents, complex numbers; unary plus, `**`, superscripts beyond simple digits; words of ≥4 letters; juxtaposed repeats (`cc`), a subtraction sign inside a fraction without brackets (`/3c`); exponents above 1000; inputs above 40 lines / 400 characters / nesting 40; computation above the operation or coefficient-size budget; irreducibility certificate beyond its search bound (`Factorise` of such an expression is `incomplete`, never claimed complete).

## 7. Assumptions governing symbolic exponents

A power with a symbolic exponent is read as defined only for a non-zero base (the exponent's sign is unknown), on every line, as written. Bases are treated as positive or exponents as integers for the law checks. This reading is a **shared assumption of the engine and the oracle**, so agreement does not independently justify it; a course that wants `0^n` handled differently must change the contract, not the tests.

## 8. Marking-adapter contract and compatibility

`toEducatorEvidence` / `assessForEducator` return one of: `correct-and-complete`, `correct-but-incomplete`, `valid-with-outstanding-obligations`, `mathematically-invalid`, `unsupported-or-undecidable`; `markingEffect` is always `"none"`; it never emits `MARKED_RIGHT` / `MARKED_NOT`, never writes a record, is not wired into any production path, and a different valid route is never a different category. Unknown correctness never becomes `mathematically-invalid` (checked on 10,697 oracle cases and 3,000 junk lines by the reviewer). Existing skill identifiers are kept (`SYM_SKILLS`, number skills); `SKILL_COMPETENCIES` maps to existing `MATH.algebra.*` competencies; `index-laws` has **no mapped competency** (reported as unmapped); the written-task rubric ids in `written.v1.json` are task-local (`expand`, `factor`, …), so no rubric-to-skill mapping exists yet. No existing marking contract was changed. `assessWorking`'s outcome vocabulary is unchanged; `WorkingAssessment` gained the optional `resourceLimit` field.

## 9. Remaining risks

| Severity | Risk |
|---|---|
| Medium | Capability loss is real: bracketed or shorthand restrictions, repeated-letter products and heavy inputs are `unsupported`; an educator sees "not decided" for correct working that uses these notations. |
| Medium | The oracle is finite-grid and shares the symbolic-exponent reading with the engine; exponent results are not independent evidence of the reading. |
| Low-medium | Pre-existing, outside this PR: the legacy equation evaluator judges 216 of 2,884 frozen transitions valid where the oracle says invalid (identical to the 0cb80a4 baseline; family `divide-by-expression-no-restriction`). Not changed here; it is advisory and educator-controlled. |
| Low | Obligation ledger relabelling on an engine switch between prefixes (D8b); `verifyWorkingStep` cannot see restrictions stated on other lines; final residual fixes were not re-reviewed by a second agent. |

## 10. Second independent review (a8fcd27, b2c035b) and its disposition

A second agent reviewed only those commits (about 2,000 probes; no verdict drift found on 468 hand-checked domain cases, budgets did not leak, `(x+1)^K/(x+2)^K` for K up to 200 took at most 0.57 s). Findings and what was done:

| # | Class | Severity | Disposition |
|---|---|---|---|
| 1 | educator / ill-typed input | High | **Fixed**: `verifyWorkingStep`, null or non-object options, `requiredSkills: 5` and a throwing `eq` getter threw. Now `unsupported`, never an exception (test R1). |
| 2 | educator integration | Medium | **Fixed**: `declarations: null` is treated as absent again (R2). |
| 3 | resource limit | Medium | **Accepted, documented**: the shared 1x derivation budget makes a few decided derivations `undetermined` (`(x+9)^14/(x+9)^13`; cut-off k=14). Only decided to unsupported, never the opposite verdict; `assessWorking` still decides the same input. |
| 4 | domain semantics | Medium | **Fixed**: `verifyWorkingStep(.., "x2")` is now `unsupported` (ambiguous) like every other path (R3). `x 2` reads as `x2` and is ambiguous (previously 2x); `(Q2)` in problem text makes the problem ambiguous. Accepted. |
| 5 | domain semantics (pre-existing) | Medium | **Fixed**: restoring an irrational restriction that the original also has was `invalid`; it is now `unsupported` (no claim), a genuinely new irrational restriction stays `invalid` (R7). |
| 6 | test quality | Medium | **Fixed**: three tests did not exercise their fix. Rewritten and mutation-checked: shared derivation budget (reverting 1x to 4x fails R4), size-weighted metering (constant weight fails R6). The NaN-configuration guard in `assessDerivation` is defence in depth (the same limit is enforced inside `assessWorking`), so R5 cannot isolate it; stated, not hidden. |

Gate rerun after these changes: engine and derivation outputs for all 10,697 oracle cases (seeds 1 to 3) are identical to the previous run (0 differing cases); 770 tests pass. The fixes in this section were not reviewed by a third agent.

## 11. Recommendation

**MERGE READY** — no blocking correctness or compatibility finding remains open; all confirmed critical/high defects were fixed with regression fixtures and the affected gates re-run; limitations are listed above. This does not authorize merging or deployment: PR #81 stays a draft until the product owner approves.
