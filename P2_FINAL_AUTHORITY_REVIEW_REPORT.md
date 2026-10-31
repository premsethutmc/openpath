# P2 Final Authority Review

Branch `feat/math-answer-key-certification` (draft PR #83), base 99aea8e. Commit: the head of this branch (hash given in the hand-off message; a report cannot contain its own hash). **Nothing merged or deployed.** Adaptive engine, renderer and curriculum untouched.

## 1. Legacy authorization boundary closed
The older numeral-provenance check (`literalProvenance`) no longer authorizes anything the derivation authority cannot parse. The "outside-surface tier" is gone from every route it served.

| route | outcome now |
|---|---|
| algebra-text and arithmetic-statement text (`algebraGroundings`) | authority decides; a line it cannot parse is **refused as "unrecognized by the derivation authority"** and keeps its numerals free (nothing downstream can rest on it) |
| numeric chains, e6 (`members.length>1`, typed probability / complex / polynomial) | closed numeric chains: authority decides; non-closed chains (symbol formulas then substitution) are **unrecognized, never verified**. `invalid` / `missing-assumption` verdicts are preserved (`deferredIncomplete`), only *verified* is withdrawn |
| geometry calc lines (`natural-geocalc-e5`) | **unchanged, disclosed open boundary**: still the older task-fact provenance. It has no rewrite licence, so it is stricter than the authority, but it is not the authority |
| certification-authority consumer | consumes `groundedLines`, which now come only from the authority |
| independent answer-correctness grading (kernel / substitution) | untouched and separate: a true answer is still graded correct; it is just not *derivation-authorized* |

Three outcomes are kept apart: *true* (validity), *permitted derivation from the task* (authorized), *unrecognized* (outside the surface; neither valid nor invalid). Line-level counts through the engine on corpus 3 (bare statements, algebra-text route live): arithmetic 316 authorized / 142 refused-unjustified / 20 unrecognized; algebra 230 / 0 / 42 (`final-checks-heldout3.txt`). On the authored statements the engine's own problem parser stops algebra before the route (0 decisions; coverage gap, not a safety path).

### New unsupported cases after fallback removal
Measured before any authority extension: 49 existing tests failed, 48 distinct engine calls changed. After the one determined, justified extension below, **39 calls remain newly not-verified** (24 verified→unsupported, 15 verified→incomplete), frozen as a snapshot test (`p2-final-fallback-removal.test.ts`, data `FALLBACK-REMOVAL-changed-calls.json`). 8 calls were recovered by the solution-set conclusion move (`...-recovered-by-solution-set-move.json`); 2 changed only to a more accurate `invalid` / `missing-assumption`. They are single-line or substitution chains in typed probability / complex / polynomial domains (`c/a = 5/2`, `n*p = 12*(1/4) = 3`), radicals, systems, rational equations, inequalities, premise-bound roots. **44 old tests are skipped with `P2-FINAL` notes** (list in `P2_FINAL_SKIPPED_TESTS.md`); 4 expectations were changed explicitly (a sign-selected root is `not invalid` instead of verified; `ax+ab=c -> x=k` is not verified; E3 dev threshold 10→5; one seeded parse test guarded). No authorization was weakened to keep an old result.

Authority changes made in this pass (all determined or declared, none introduced to preserve old results):
- **Solution-set conclusion** `x = r1 or x = r2`: authorized only if it is exactly the complete rational root set of the previous equation (extra, missing or wrong roots refused).
- **Solved-form jump**: one visible inverse operation only; a bare first-line answer claim is a separate move (`answer-claim`); several hidden operations after a presented line are unsupported.
- **Balance by a variable** only when the task declares it nonzero (`x^2 = 4x, x ≠ 0`); `-45/9` read as `(-45)/9`; moving a monomial across the equals sign.
- **Circular compensation closed**: a compensation piece must be within the round neighbour of its source (`86 + 4 = 90`, never `86 + 104`); a round piece must be the source's round neighbour; a piece equal to another term of the line (non-partition) is refused; `t = 0` is no longer a free pass.
- Registry v3: `factor-common` (`ab + ac → a(b+c)`) and `difference-of-squares`, both determined.

## 2. Third independent corpus (frozen first)
Authored by an agent that had not seen the P2 implementation or earlier failures: 477 items, 10 categories, labels fixed before any P2 run. `HELDOUT3-corpus.json` sha256 `cb32bb06e55e1059cd63e6b54874d4f9e42efa1841a931742baa24315edeb1a6` (recorded before execution). A bare-statement variant (verbs stripped, 474 items changed) exercises the algebra-text route.

Engine, corpus as authored (labels: 186 verified / 114 invalid / 170 unsupported / 7 debatable):

| build | false mathematical acceptance | unjustified derivation authorized | legit verified | invalid detected |
|---|---|---|---|---|
| 5d6003e | 0 | 36 | 46/186 | 70/114 |
| 32c7f2c | 0 | 36 | 40/186 | 70/114 |
| 99aea8e | 0 | 17 | 52/186 | 70/114 |
| **final** | **0** | **3** | **57/186** | 70/114 |

Bare statements: 5d6003e 0 / 56 / 90; 32c7f2c 0 / 47 / 79; 99aea8e 0 / 33 / 99; **final 0 / 6 / 106/186**, invalid 82/114.

**The first run of this corpus found real defects (found before this commit, all fixed):** 14 unjustified authorizations (answer re-expressed through itself: `18 + 86 = (104 − 86) + 86`, `29 − 28 = 29 − (29 − 1)`, `58 + 91 = 58 + (69 + 22)`, three-term rebuilds) and 5 legitimate regressions vs the old builds (`19² − 11² = (19−11)(19+11)`, `51×9 + 51×5 = 51×(9+5)`). Corpus 3 therefore also is no longer unseen for the fixed rules.

**Remaining 6 "unjustified" items, reported separately and not hidden — I dispute the labels, the call is yours:** `tr-002/006/021` (`X = (X)` then `(X) = value`: a bracket restatement followed by a fully determined evaluation) and `rl-022/023/024` (factor the quadratic, then state the exact root set; the author expected "or" lists to be out of surface, but the conclusion is exactly the roots of the previous equation). Counting them as defects gives 3 (authored) / 6 (bare); counting them as correct gives 0. Mathematical truth was never in doubt. First-invalid location wrong in 1 bare item, identical in all four builds (pre-existing).

Authority API alone (no engine gates): 0 false mathematical acceptance; 131/186 legit; 48 "unjustified" are lines it authorizes individually but the engine withholds (27 truncated chains, 16+2 restatements, 3 disputed) — line authorization is not completeness, which the engine enforces.

Legitimate coverage: **0 regressions vs 5d6003e, 32c7f2c and 99aea8e** on both variants (gains 11/17/5 authored; 16/27/7 bare). Weak areas (unsupported, never wrong): valid multistep algebra (23/64 on bare statements, 0/64 as authored: engine parser), domain-manipulation positives 0/18 (engine statement parser and `or` / inequality forms), radicals / logs text syntax.

## 3. Permanent regression tests (`p2-final-regressions.test.ts`, 139 tests)
Every defect is checked on engine arithmetic (natural and list), engine algebra (natural and list) and the authority/replay API: `77+32 = 77+(109−77)` and variants; `log(xy)` / `ln(xy)` / phrases not read as letter products; dead-branch laundering (`9×8; 72 = 8×9; 8×9 = 72`); cross-task reuse (same lines under five other tasks, all routes); domain omissions (`x/x`, `(x²−9)/(x−3)`, `√(x²)`, wrong or missing exclusion, variable balance without `x ≠ 0`). Legitimate partition / compensation / conditioned cases stay verified.

## 4. Independent certificate replay
Replay re-normalizes the task, then **re-authorizes every line from scratch** and requires the identical certificate; a consistent digest alone is never enough. Tests forge certificates with the digest recomputed and the chain re-linked: changed rule id, embedded rewrite rule, replacement, source, injected assumption, dropped or invented domain condition, regrade (anchored↔determined), task digest, authority version, line index, self-dependency, swapped kernel evidence, missing / extra / reordered / duplicated certificates, edited lines — all refused. Corpus 3 (182 verified chains): own-task replay failures 0; cross-task 182/182 refused; truncated 147/147 refused; tampered 182/182 refused; **forged-but-self-consistent 182/182 refused**.

## 5. Regression and performance
Package `packages/learning`: 1,472 pass / 44 skipped (listed) / 0 fail (was 1,381 / 0; +91 new). Other packages: `english-core` 312 pass / 2 fail — the same 2 failures (frozen English simulation banks) occur at 99aea8e, unrelated. The all-repo `bun test` did not finish in 20+ minutes and was stopped; `packages/mathematics`, `packages/tamil`, `shared` and `backend` printed no test summary in a 250 s cap, so they are **not verified here**.
Per-call engine time on corpus 3 (sequential, p50 / p95 / p99 / max ms): 5d6003e 1.2 / 12.0 / 18.9 / 60.8; 32c7f2c 1.3 / 12.5 / 27.6 / 69.4; 99aea8e 1.6 / 12.3 / 18.7 / 56.0 (re-timed on a quiet machine); **final 1.5 / 11.4 / 22.1 / 54.8** (total 1.57 s vs 1.67 s for 99aea8e): no measurable slowdown.

## 6. Open items and readiness
- Geometry route still on the older provenance (disclosed above).
- 39 calls and 44 tests moved to unsupported (e6 formula-then-substitution needs a data-substitution rule, not built).
- 6 label disputes above; engine statement parser limits unchanged.
- Corpus 3 informed fixes: a fourth unseen corpus is needed before any generalization claim.
Ready for review; not for merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_017U7eMtFoCVSvJWNbZVNtYB
