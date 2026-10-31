# Generator-Contract Coverage Report

Branch `feat/math-generalization-core-e7`, baseline `364230b`. Nothing merged or deployed.

## 1. Generation-to-grading data flow
- `FAMILIES` (families.ts) holds one `Def` per family: `arity`, `type`, `domain`, `prompt(params)`, `solve(params) -> {steps, answer}`, `validate`. `pool(fam).items` enumerates released ids (`gen:<fam>:<params>`, plus `:mc` variants). `problemOf(id)` rebuilds the `Problem` (params, answer, prompt, steps).
- Parameters and the exact answer exist only inside the generator. `prompt()` turns them into a display string (unicode operators, `^` exponents, glyphs), and that is where structure is lost.
- `contractOfProblem` (assessment.ts) builds the `AssessmentContract`. Before this task it built the checker statement from a per-family table plus a prompt-text rule (`closed-arithmetic.ts`).
- `assessSubmission` -> `assessAnswerFirst` (independent-checker kernel) judges the final answer. `grade.decide`/`creditOf` give the credit, and `records.ts`/`evidence.ts` consume that credit for mastery.
- Server (`backend/family/learning.py`, `_authoritative`) overwrites `answerCorrect`/`unresolved` from the stored answer with a Python mirror. It never runs the TS kernel.

## 2. Minimal generator contract
One optional field on the existing `Def` (family-kit.ts):
```ts
contract?: { kind: "value"|"var"|"set"; statement: (p:number[]) => string|null;
             variable?: string; assumptions?: string[]; numbers?: (p:number[]) => number[] }
```
- The generator supplies the checker statement from its own parameters. `null` means "no statement for these parameters", which is an explicit unsupported status.
- No prompt text is read. `shapeOfProblem` reads `FAMILIES.get(family).contract`. The per-family `STATEMENTS` table and the prompt-parsing `closed-arithmetic.ts` (plus its test) were removed.
- Adapter: one function (`shapeOfProblem` -> `contractOfProblem`) serves every family. Verifier capability = existing answer-first kernel.
- Policy: no contract, no statement, unreadable stored answer, or checker unable to handle the statement -> `legacy`. A genuine kernel/stored-answer disagreement -> `held`. Only agreement -> `verified`. A generic digit guard requires the statement's numbers to appear in the prompt.
- `assessment-fallback.ts` now takes `kind` from the contract instead of the deleted table.

## 3. Grouped inventory (1,080 families, 341,483 questions; `data/inv-final.json`)
Counts are for families **without** a contract after this task (1,034 families). Groups map the audit's `verificationRoute`.

| Group | Families | Questions | Status |
|---|---|---|---|
| 1 numeric (closed arithmetic) | 5 | 1,700 | candidates: adfbuild, aecol4, aifdiv, aiwdiv, avfas; none tested here |
| 2 symbolic expression | 57 | 17,883 | candidate; needs answer-first expression route, not tested |
| 3 equation / solution set | 35 | 13,285 | candidate (lineq, lneg, disc, dist, ...) |
| 4 sets, tuples, intervals / coordinates | 51 | 18,122 | candidate; coordinate-function route |
| 5 other kernels (typed B1/B2/M1/M2, calculus, linear algebra, trig, prob/stat, complex, geometry formulas) | 60+77+80+67+12+136 = 432 | 119,000 approx. | candidate; needs a second adapter (`assessMathematicalWorking`) |
| 6 bounded extension (word/model numeric) | 243 | 79,622 | needs model-to-statement step |
| 7 conceptual / categorical / logic-pattern | 211 | 59,488 | unsupported by exact grading |

Confirmed (tested, integrated): the 46 contract families below. Everything in the table is a candidate and is **not** counted as coverage.

## 4. Selected group and rationale
Selected: closed-form numeric `value` families plus linear `var` and `set` families that the existing answer-first kernel already reads. This is the largest group verifiable with one existing verifier and no new solver: 39 value, 4 var and 3 set families. The 31 previously integrated families moved from a prompt-text rule to generator-owned statements; 15 further families were added.
Rejected as larger but unsafe: symbolic expression (17,883) and the typed-kernel groups (about 119k). They need a different adapter and per-family answer-form tests, which is beyond "one adapter, no new solver".

## 5. Families integrated and excluded
- Integrated (46): original six (mul, pow, linev, lin, quad, meet); previous 25 (fadd, mmul, ldiv, addr, aazero, aamul01, acsub2/3/n, adcol3, adcolx, aep10, aemult, aediv0, aeaddn, aeadd3, agdec, agbod, aidmul, aiddiv, aidp10, aiint, aiintx, ajimul, ajidiv); new 15 (faddu, fmulw, ahone, ahboth, ahfrac, aoabseq, ajbrk, acaddten, acpart, aasub, aaadd, avzero, adexp, ajrq, aifmul).
- Partly legacy inside integrated families: aamul01 100 of 300 (box-style kinds have no statement), adexp 40 (exponent 0 -> `null`), aiintx 11.
- Excluded after inspection: lineq (inequality answers not read by answer-first), amnline (prompt depends on mode), avfas (mixed-number answers unreadable by the kernel), adfbuild, aecol4, aifdiv, aiwdiv (no verified statement form; not attempted beyond inspection).
- Two real defects found and fixed in new contracts: ajrq display "-7/8 ÷ 3/5" parses left-to-right differently (37 held) -> statement parenthesises the fractions; avzero superscript glyphs were outside the checker's scope (328 held) -> ASCII statement.

## 6. Question-level coverage (of 341,483)
| Metric | Before | After |
|---|---|---|
| Exact-kernel families | 31 | 46 |
| Exact-kernel questions | 14,265 (4.18%) | 20,311 (5.95%) |
| Newly covered families | | 15 |
| Newly covered questions | | +6,046 (5,796 in the 15 new families, 250 recovered in earlier families) |
Per capability (verified / released in contract families): value 16,943 / 17,094; var 2,928 / 2,928; set 440 / 440. Contract families with no hold: 0 held in all 20,462 questions; 151 legacy (0.74%).
The absolute gain is 6,046 questions (+1.77 points). 94.05% of the curriculum still has no exact-kernel grading.

## 7. Verification evidence
`tools/mathematics/coverage-audit/contract-proof.ts` runs 40 sampled real questions per family (1,813; 1,797 verified, 16 legacy) through `decide` (answer-first entry point):

| Case | Checks | Passed |
|---|---|---|
| correct (stored answer) | 1,797 | 1,797 |
| equivalent (spacing, `+`, `.0`, `2n/2d`, trailing-zero decimal, `x = ..`, reordered/braced sets, `or`) | 5,231 | 5,231 |
| incorrect (shifted, off by one unit, sign flip, wrong set) | 6,723 | 6,723 |
| boundary (negated value, zero, incomplete set, extra root) | 1,890 | 1,890 |
| unreadable (`abc`, `1/0`, `2/`, `1..2`, `one`) -> no credit, unresolved | 8,985 | 8,985 |

False accepts 0, false rejects 0. Latency per decision p50 0.05 ms, p95 0.31 ms, p99 0.98 ms. Unresolved rate on unreadable input 100% (never credited).
The first proof run reported 5 false accepts and ahboth mismatches; all were defects in my test generator (an "extra" root that already belonged to the set, and `x = --n` strings), not in grading. The generator was fixed and the run repeated. Whole-pool check (`contract-pools.ts`): 20,311 verified, 151 legacy, 0 held, 6 s. Optional working never changes answer credit; this was covered by existing answer-first tests.
Also added `generator-contracts.test.ts` (whole pool: no held, stored answer credited, garbage unresolved, non-contract family stays legacy).

## 8. Regression
- `bun test packages/learning` (repo root): 1,290 pass, 0 fail. The baseline was 1,292; the difference is the removed `closed-arithmetic.test.ts` (its prompt-parsing rule no longer exists) offset by 3 new tests in `generator-contracts.test.ts`.
- E7 gate (`gate.sh contracts`): identical to stage 5: 678 cases, exact 236, false acceptances 0, false rejections 212, p50 1.87 ms.
- Frontend (node + tsx, run from `frontend/` for suites that read `../content`): unit 9, remediation 12, mathematics 26, engine 19+20, dashboard 12, mapping 6, topic-session 3, study-time 8, foundation 7, prerequisites 4, canonical 12, chapter 6, journey 5: all pass. `mathematics-completion.test.ts` (not in the required list) did not finish within a 140 s cap and was not run to completion.
- Browser bundle: esbuild of `frontend/src/year/Main.tsx` succeeds (with font/asset loaders) and contains no `node:crypto`.
- Content-system full suite not rerun (known >30 min; last bounded run passed 10/10).
- Django: `family.test_learning`/`test_answer_types` NOT run; Django is not installed and the package index is unreachable. Not claimed as passing.

## 9. Server-side authority limitations
The browser kernel verdict is advisory. The server still decides credit from the stored-answer comparison (Python mirror) and ignores browser correctness. It does not run the kernel, so the equivalences added here (e.g. `x = 3`, reordered sets, `2/4` for `1/2` where the mirror accepts them) are enforced end to end only to the extent the Python mirror already accepts them. For these 46 families the claim is: client-side exact grading is verified; server authority is unchanged and not independently exact-kernel. Authoritative exact grading would need the server to hold the same statement (contract) and a port or call of the checker; not done.

## 10. Next largest compatible group (not implemented)
The typed-kernel families (B1/B2/M1/M2/calculus/linear algebra/trig/prob/stat, about 119k questions) via a second adapter that builds a typed problem from the generator's `params` and calls `assessMathematicalWorking`; second is symbolic-expression (57 families, 17,883). Each needs the same cross-family proof first.
