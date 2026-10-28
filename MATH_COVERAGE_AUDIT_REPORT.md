# OpenPath — Mathematical Coverage Audit (all 1,080 generated families)

Baseline `2093d1b`, branch `feat/math-generalization-core-e7`. Evidence-gathering only: no engine, parser, CAS, planner or LLM was added; nothing merged or deployed. Artifacts: `tools/mathematics/coverage-audit/` (scripts + `data/inv-final.json`, the per-family inventory; `data/probe-r1..r4.json`, raw probe outputs; `authored-inventory.ts`).

## How to read the numbers (evidence tiers)

Three tiers are kept apart throughout. Only the first two are measured.

| Tier | Meaning | Families | Released questions |
|---|---|---|---|
| **Integrated (A)** | decided by the exact checker on the student path (`mul, pow, lin, quad, meet, linev`) | 6 | 3,735 (1.1%) |
| **Demonstrated (B, measured)** | real generated samples verified by an existing kernel through a mechanical prompt→statement or prompt→typed-problem adapter: stored answer reproduced, known-wrong answers rejected (probe R1: 44 families, R3: 10 families) | 54 | 23,657 (6.9%) |
| **Candidate (estimated)** | an existing kernel handles this *kind* of topic; not shown for this family | 809 | 254,567 (74.6%) |
| **No structured kernel (E)** | answer is a label / logical or pattern judgement | 211 | 59,488 (17.4%) |

Precision of the candidate tier is **low**: hand-reviewing 76 sampled candidate prompts against the kernel task catalogues gave ~43% clean fit, ~33% partial (needs a bounded extension), ~24% no fit. Applied to the 254,567 candidate questions that is roughly **109k adapter-only / 84k bounded extension / 61k new capability**, with an uncertainty of at least ±10 points (n = 76). These are planning estimates, not coverage claims.

Student-attempt coverage: **no attempt data exists in the repository** (no database, no math telemetry; the only "attempt" files are synthetic simulations). Percentages of attempts cannot be given and are not inferred from question counts.

## 1. Inventory (Deliverable 1)

`data/inv-final.json`: 1,080 records with id, title, strand/topic/competency, representative generated prompt and stored answer, 5 examples, answer type and form, student input format, multiple-answer flag, domain restrictions, legacy grading method, probe results, verification route, status and evidence. 341,483 released typed questions; 876 families also have an `:mc` form (an MC option is a stored label whose correctness reduces to the underlying typed answer).

Answer types (families): integer 411, fraction 151, choice 169, exact (radicals/π) 128, tuple 110, set 27, expression 31, interval 16, matrix 12, antiderivative 10, mixed 7, roots 5, ratio 3. No generated family is human-marked.

**Authored questions (separate from the 1,080):** 221 in `content/learning` (integer 105, choice 101, fraction 9, set 6; geometry 48, number 90, reasoning 25, statistics 16, algebra 13, calculus 11, coordinate 9, measurement 9) and 140 in `content/mathematics/programs` (integer 41, choice 40, values 53, fraction 6), graded by `scoreCode`/`isCorrect`. None has an independent check.

## 2–3. Coverage matrix (Deliverable 2): invariants and status

Families merge into 13 verification routes, which collapse to **five answer invariants** (the comparator, i.e. the answer *form*, is already one shared layer and works for all types — see §5).

| Mathematical invariant (route) | Families | Released q | Existing support (grounded in code) | Missing work |
|---|---|---|---|---|
| Exact rational/integer equality, closed arithmetic (`closed-arithmetic`) | 42 | 17,290 (5.1%) | A for `mul`; 38 more **demonstrated** by prompt statement → `assessAnswerFirst` | B: add statements |
| Equation / solution-set equivalence (`equation-solution-set`) | 41 | 16,253 (4.8%) | A for `lin, quad, meet, linev` (+`pow` under trig/seq route); 4 more demonstrated | B: statements for ~34 |
| Counting/probability/statistics (`prob-stat-comb`) | 67 | 21,031 (6.2%) | B1 kernel, 400-case corpus; 5 families verified via typed adapter | B: one adapter per task type; some C |
| Linear algebra (`linear-algebra`) | 60 | 24,708 (7.2%) | B2 kernel, 400 cases; 2 families verified; determinant `|AB|` prompts unmappable (3/5) | B/C |
| Coordinate, function, inequality (`coordinate-function`) | 51 | 18,122 (5.3%) | M1 kernel, 400 cases; 1 verified | B/C |
| Trig, exp/log, sequences, radicals (`trig-explog-sequence-radical`) | 79 | 24,841 (7.3%) | M2 kernel, 480 cases; 4 verified; `pow` integrated | B/C |
| Calculus (`calculus`) | 80 | 21,776 (6.4%) | calculus-core/methods; definite integral claim rejected without an antiderivative step | C (bare final-value claim), B |
| Symbolic expression equivalence (`symbolic-expression`) | 57 | 17,883 (5.2%) | `symbolic-equivalence.ts`; legacy path is **sampled numeric**, not symbolic | B (route to kernel), C (domains) |
| Complex numbers / polynomials (`complex`) | 12 | 3,169 (0.9%) | complex-polynomial / complex-kernel | B |
| Geometry/measure formula (`geometry-measure-formula`) | 136 | 35,788 (10.5%) | geometry binder (E5) exists; prompts rarely carry a typed figure | C/D |
| Word problems / model → number (`word-or-model-numeric`) | 244 | 81,134 (23.8%) | none generally; arithmetic solver only after the statement is modelled | C/D (largest block) |
| Logic / pattern judgement (`logic-pattern`) | 42 | 12,610 (3.7%) | none | E |
| Categorical labels (`categorical-label`) | 169 | 46,878 (13.7%) | none (stored label) | E (or re-express as typed claim) |

Status totals by route-level classification (not by evidence): A 6 (1.1%), B 347 (36.1%), C 516 (45.4%), E 211 (17.4%). Because the B/C split above is topic-based it **over-states** B; use the evidence tier table in the top section for coverage.

## 4. Verified reuse (Deliverable 3)

* One verifier, many unrelated families: `assessAnswerFirst` reproduced stored answers from mechanically extracted prompt statements in 44 families beyond the six integrated ones (e.g. `fadd`/`faddu` fraction addition, `mmul`, `ldiv`, `agbod` order of operations, `ajimul`/`ajidiv` integer products, `ahone`/`ahboth` equations, `aoabseq` |ax+b|=c, `lineq` inequalities, `avzero` zero exponent; see `probe-r1.json`).
* One typed kernel per task, shared across families: B1 statistics reproduced `akmed` (median) and `akmode` (mode); B1 combinatorics `aonpr`/`aoncr`; B1 probability `anbag`; B2 matrix `apmmul`; M2 sequence `apn`/`aogp`. Each: 5/5 stored answers verified, 5/5 wrong answers rejected (`probe-r3.json`).
* The answer-form layer is one reusable comparator across 13 answer types; 170 families have worked solution traces that adapt end-to-end to kernel ops (self-consistency only, `probe-r2.json`).

## 5. Representative tests per invariant (Gate 5)

`probe-r4.json` pushes the actual `session.decide` path with ~8 unrelated families per answer type: stored, alternative form, wrong, boundary, unreadable. Failure layer is named.

| Finding | Layer |
|---|---|
| Stored, spaced, reordered, `sqrt()`/`pi` spellings, explicit `*`: credited, 0 false accepts of plain wrong answers | none |
| Integer `5.0` rejected 30/40 on a legacy-path family | legacy grading (comparator) |
| Set `{a, b}` braces rejected 30/40 (accepted for `roots`) | legacy grading |
| Interval closure flipped accepted 3/40; `[−∞,…]` accepted | normalisation / legacy grading (false accept) |
| Antiderivative without `+C`, other constant accepted (policy); expression/antiderivative equivalence is **sampled** | legacy grading |
| Unreadable input: 60–80 of 80 rejected as wrong on legacy paths, 0 undecided | assessment integration (legacy never returns "unresolved") |
| Reversed ratio rejected 14/15, slash ratio rejected (policy) | none / policy |
| Mixed-number and inline-fraction notation unread by kernel answer reader | parsing |
| Definite integral claimed as a final value → `invalid` | kernel verification (needs antiderivative step) |
| Determinant prompts (`|AB|`) unmappable | prompt adapter |
| Medians as decimals need rationals; mode needs raw value list | answer contract / adapter |

## 6. Genuine gaps (Deliverable 4)

* **D/E – 244 word-problem families (23.8% of questions):** the prompt models a situation; no kernel receives the model. Needs the family's own parameters exposed as a typed statement (a generator-side contract), not a solver.
* **D – geometry from a described figure (136 families):** the geometry binder needs a typed figure; most prompts are text. Bounded work if the generator already holds the dimensions.
* **E – 211 families (17.4%):** `categorical-label` (169) and `logic-pattern` (42) have no structured answer invariant; their correctness is a label.
* **C – definite integral final-value claim, mixed-number / inline-fraction answers, closure-sensitive intervals, `{…}` braces for sets.**

## 7. Integration defects (Deliverable 5)

1. **Build regression (mine):** `session.ts` now imports `assessment.ts` → `independent-checker.ts`/`proof-kernel.ts`, which use `node:crypto` (`createHash`, lines 19/506/512 and 17). The year browser bundle (`frontend/scripts/build-year.mjs`, esbuild, browser platform) **fails to resolve `node:crypto`**. Learn.tsx therefore does not build for the browser.
2. `evidence.ts:157,225` mastery replay and `StudySession.tsx:43` finish-item decision still call `isCorrect` on the stored response.
3. `Learn.tsx:407` display feedback uses `isCorrect(question(qid), done.response)`, not the assessment result.
4. `review/Main.tsx`, `curriculum/preview.tsx`, `PreviewExperience.tsx` (educator screens) use `isCorrect`.
5. `mathematics/unit/Unit.tsx` + `packages/mathematics/src/unit.ts`: `normalise` returns null for unreadable input and the answer is silently skipped (no attempt, no feedback); correctness is client-side `scoreCode`; the server (`backend/family/mathematics.py`) validates only format.
6. Server trusts client-supplied correctness evidence shape: it cannot re-run TypeScript; `UNRESOLVED_CAP = 2` bounds parking wrong answers as unresolved. Credit/mastery on the server (`independent_at`, retention gate) rely on `right()` over the stored answer plus the client's assessment fields.
7. Legacy path never produces "unresolved": unreadable input is recorded as wrong (`probe-r4`).

Smallest safe changes (**not implemented**): (a) inject a hash function (or `crypto.subtle`/pure-JS digest) so the kernel modules have no `node:crypto` import; (b) make `Learn.tsx:407`, `StudySession.tsx:43`, `evidence.ts` read `attempt.assessment` first; (c) route Unit.tsx unreadable input to "saved, not marked"; (d) server: recompute `right()` from the stored answer for credit and treat client `answerCorrect` as advisory.

## 8. Prioritised implementation plan (Deliverable 6)

Ranked by released questions unlocked per unit effort and false-accept risk; all reuse existing kernels, none is a per-family checker.

1. **Fix the browser build** (hash injection): blocks everything on the student path. Effort: small. Risk: none.
2. **Generator-side statement for closed arithmetic + equation families (B, ~75 families, ~33k q):** reuse `assessAnswerFirst`; 38+4 already demonstrated. Low risk.
3. **Typed adapters for B1/B2/M1/M2 (prob-stat, linear-algebra, coordinate, trig/seq) (B, est. ~100 families, ~60k q):** one adapter per kernel task, not per family; kernels have 400+ case corpora. Medium effort.
4. **Comparator hardening (C, all 1,080 via shared layer):** `5.0`, `{…}`, interval closure, mixed numbers, bare definite-integral claim. Small effort, removes the false accept/reject seen in `probe-r4`.
5. **Route sampled expression/antiderivative equivalence to the symbolic kernel (C, 41 families, 11k q).**
6. **Geometry and word-problem typed statements (C/D, 380 families, ~117k q):** largest unlock but needs generator-side contracts; do after 1–5 prove the pattern.
7. **E (211 families):** leave on stored-answer with an explicit "unverified" label, or re-express as typed claims; defer.

## 9. Regression status (Deliverable 7)

Status at this commit (frontend run and E7 gate still in progress; a follow-up commit records final results):

* Frontend, ran and passed (0 fail): grade7-board 1, study-time 8, topic-session 3, dashboard 12, engine 20, generalisation 13, mapping 6.
* Frontend, not yet complete: content-system, mathematics-completion, platform (15-minute cap each); remaining non-learning files not yet run.
* E7 regression/integrity gate: not yet run.
* Learn.tsx build: FAILS (esbuild cannot resolve `node:crypto`, see defect 1). Full type-check impossible: no `@types/react`, registries unreachable.
* Django backend tests: NOT run (Django not installable here).
