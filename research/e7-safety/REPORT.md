# E7 post-audit safety repairs — report

Branch: `fix/math-e7-safety-invariants`. Base engine: `837c79c` (unchanged audit baseline). Nothing has been merged or deployed.
Diagnosis: `DIAGNOSIS.md`. Coverage proposal: `PHASE4_COVERAGE_PROPOSAL.md`. Raw data: `results/`, `holdout/`, `repro.{before,after}.*`.

## Changed components

| File | Finding | Change |
|---|---|---|
| `natural-working.ts` | F1 | A `(` after a function name requires its `)`. A stray `)` is no longer swallowed. Unknown or unsupported function names (sec, csc, cot, cbrt, arcsin, sinh, made-up names, also in `f(x)`-style notation) are refused as `unsupported`. `atan`/`arctan` map to the existing `atan` node. `sin x^2` is refused as `ambiguous`, with both readings given. |
| `symbolic-domain.ts` (new) | F4, F5 | Semantic nonzero-domain comparison by polynomial radical/divisibility (`core/multivariate/poly.ts`). Composed assumption entailment: products, powers, sums, constants, \|·\|, and linear order (x>1 ⇒ x>0). Only ever reports "follows"; never "does not follow". |
| `symbolic-equivalence.ts` | F3, F4, F5 | Differing normal forms refute only when every sin/cos argument is a bare variable. Otherwise the result is `unsupported`, not `invalid`. Domain changes and assumptions now go through `symbolic-domain.ts`. |
| `proof-kernel.ts` | F5 | Uses the same entailment, so certificates that rely on composed assumptions replay. |
| `unified-math-engine.ts` | F2, F7 | The E5 natural route applies `typedCalculusDomainGap` to an antiderivative (as the typed and E6 routes already do). The E2 loss refinements respect the policy switch. |
| `independent-checker.ts` | F6, F7, F8b | A `≠` line that only restates an exclusion the problem imposes is an annotation (answer-first status `restriction`, a compatible new literal). Stated conditions apply to both sides of every transition. A false closed line derived from an empty-set line is a valid contradiction. `SolutionLossPolicy` switch, default `incomplete` (E2 contract unchanged). |
| `backend/family/grader/*` | — | Server grader bundle rebuilt so the manifest test passes. Not deployed. |

AST, rules and verification contracts are preserved. The only extensions are the answer-first status literal `restriction` and the policy exports.

## Tests

`bun test packages/learning/src`: **1325 pass / 0 fail** (baseline 1296; +29 in `e7-safety-invariants.test.ts`). Every invariant has a minimal case, a valid/invalid contrast, a notation variant and a composition case. Minimal reproductions: 6/30 ok before, 26/30 ok after. The 4 remaining are F7 under the default policy, and all pass under `invalid`.

## Frozen benchmark (r1, 2,382 cases, SHA-256 a4ece4bf…, labels untouched)

| Outcome | Before | After (default) | After (loss = invalid) |
|---|---|---|---|
| correct | 866 | 921 | 936 |
| false acceptance | 27 | 25 | 25 |
| — of which mathematically wrong | 2 | **0** | 0 |
| false rejection | 85 | **24** | 24 |
| misgrade | 68 | 62 | 47 |
| safe abstention | 1329 | 1343 | 1343 |

Confusion matrices (expected × E7) and per-case transitions: `results/compare.after.md`, `results/compare.after-lossinvalid.md`. The 25 remaining false acceptances are all policy F8: unstated restrictions, engine-checked candidates, wrong cited rule. Form sensitivity (canonical-notation rerun) dropped from 19 changed outcomes to 8, all of which are abstention → correct.

**Changes in detail.** 69 cases changed. Of these:
- 44 false rejections → correct;
- 14 false rejections → safe abstention (trig identities, `sec`/`cbrt`, EQN-0221 "empty" wording);
- 6 misgrades → correct;
- 2 abstentions → correct;
- ADV-0327 and CAL-0131 → safe.

**Regression:** 1. DOM-0215 is now a safe abstention. It was previously "correct" only because `cbrt` was read as a variable.

## Holdout (78 new cases by an independent agent with no access to engine code or tests; SymPy-checked labels)

| Engine | Agree | False accept | False reject | Misgrade | Abstain |
|---|---|---|---|---|---|
| baseline | 41 | 6 | 4 | 8 | 19 |
| repaired, blind first run | 56 | 1 | 0 | 1 | 20 |
| repaired, after fixing H-004 | 57 | 0 | 0 | 1 | 20 |
| repaired, loss = invalid | 58 | 0 | 0 | 0 | 20 |

**H-004 (`arcsin(x/3)`)** exposed a gap in F1: unsupported names on a bare function-notation line. It was fixed in the parser and covered by a test. The blind run is reported as the generalization figure.

**H-030** ("no solution" for an identity) is the F7 policy.

**Abstentions** are coverage gaps:
- trig identities: 11;
- symbolic exponents and `sinh`, in the adapter: 3;
- `x − 1 = 4 or x − 1 = −4` branches: 2;
- `ln(x² − 9)`, where the domain is not stateable: 1;
- others: 3.

None of them is an acceptance.

## Remaining limitations

- **Trig:** true trig identities with related arguments now abstain instead of being refuted. Proving them is Phase 4 item 2.
- **Order reasoning:** interval assumptions (`0 < x < π/2`) are not expressible. Order reasoning is linear and single-assumption only. Log nonzero-ness (`ln x ≠ 0` from x>1) is not derived.
- **Antiderivative domains:** a domain that cannot be stated (`ln(x² − 1)`) is graded `unsupported`, not `missing-assumption`, consistent with the typed route.
- **Policy questions:** F7 (lost solutions), F8 (restrictions, candidates, cited rules) and bare `log` are owner decisions. Defaults are unchanged.
- **Policy switch:** the switch is module state, safe for sequential use only.

## Recommended next step

Decide F7 and F8. Then implement Phase 4 items 1 (notation mapping) and 3 (limit value reader), which carry the lowest soundness risk per abstention removed.
