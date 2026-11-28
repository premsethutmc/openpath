# Class 10 prerequisite recovery — acceptance audit

Baseline: `20632de746f26896b1ea035c6430341e16671a10` (main, 27 Nov 2026). Audit only: no code, content, commit, merge or deploy.
**Status (27 Nov 2026):** corrections 1–3 below are implemented in `fix/step-operation-recovery` (`packages/learning/src/step-check.ts`, tests in `step-check.test.ts`). Re-run of the scenarios after them: 12 of 15 pass; S05, S08 and S13 wait for corrections 4–6. Part of correction 1 is deferred: signed steps tagged with the problem's own skill (inside factorising: `factor · product/box`, `ajfspl · product`, `alpsq`) keep their tag for now, because retagging them moved the research deep-recovery journeys; only steps already tagged with an arithmetic skill are retagged (31 families).

**Correction 5 (28 Nov 2026):** branch-parity@1: a prerequisite reached by the diagnosis whose explanations are used up goes through step 2 (deeper-support@1) first; at the retry limit, `uses` supports not checked since the first try are checked once (then one more try). Step checks and proof questions are bounded (three each). Lab S05 passes; S21 now repairs the sign slip but factorising is still shown too early.

**Correction 1, rest (28 Nov 2026):** operation-tags@2: a signed step inside a non-arithmetic skill (factorising) keeps its tag and records `uses: integer-multiply|integer-add`; recovery checks that as a support. Lab S21 (sign slip while factorising) is a known gap until correction 5 (diagnosis branch never looks below).

**Correction 4 (28 Nov 2026):** prove-repair@1 in `packages/learning/src/intervention.ts`: after help, two new questions answered alone (same kind, then another form) before "solved after help"; child lab 16/18 (S05, S13 remain).

**Child lab (28 Nov 2026):** the audit's operation-based learners are now a required check: `packages/learning/src/lab/` (slip catalogue, driver, 17 scenarios), run by `frontend/src/learning/child-lab.test.ts`; scorecard `content/owner/child-lab.v1.json`, shown at `/owner/#lab`; traces in `docs/audits/child-lab-traces.txt`. Regenerate with `node --import tsx packages/learning/scripts/child-lab.ts` (from `frontend/`).

**Child lab v2, harness integrity (28 Nov 2026):** the lab child now works every question from its words and picture only (`lab/work.ts`): no answer key, worked solution or generator parameters; each operand points at the step it came from. Every response carries its provenance (computed, unsupported, guessed, memorized, staged); an unsupported answer is "?" (graded unresolved), never the right answer. Each scenario states its learning policy (immediate, delayed, partial, unsuccessful, forgotten); S01, S02, S08, S15 and S16 have unsuccessful-learning controls. Checks read intermediate statuses and new events only; every scenario also carries harness checks (re-derived own working, no unsupported critical answer, a clear ending). Six mutants (`lab/mutants.ts`) break answer leakage, premature mastery, ignored recent errors, repeated transfer, failed retention and incomplete recovery; hand-written contracts (`content/owner/child-lab-contracts.v1.json`, tested by `child-lab-contracts.test.ts`) say which checks each scenario must carry and which mutants it must catch. Hand-worked fixtures: `child-lab-fixtures.test.ts`. Result: 16/24 scenarios pass; mutation runs caught 21/21; 34/106 scenario checks shown to catch a mutant. Regenerate with `node --import tsx ../packages/learning/scripts/child-lab.ts` (from `frontend/`; `--reset` only when the checks themselves change).

Everything in sections 1–4 is **engineering evidence** (shipped engine + simulated learners). Nothing here is evidence that a child learns; section 6 says how to get that.

## 0. Verdict

| Area | Result |
|---|---|
| Acceptance scenarios (15 run: 14 + one variant) | **5 pass, 10 fail** |
| Existing repo tests touching recovery (bun: deeper-support, question-supports; node: recovery-scope, recovery-context, deep-recovery-module, subskill-evidence) | 31/31 pass — they do not cover the failures below |
| Ready to claim "struggling Class 10 learner recovers from prerequisite gaps" | **No** |

The core problem is not stale history (that part works). It is that **recovery reasons at the level of whole competencies, while learners fail on specific operations**: the step that went wrong is often tagged with the wrong skill (sign errors are tagged "multiplication facts" or the problem's own skill), and a support skill counts as "shown" from two right answers on *other* items of that skill. So the operation that actually broke is never asked about, and the problem's own skill can be reported as shown while the learner still fails it.

## 1. Inventory: Class 10 algebra (TN Ch. 3 outcomes → graph → module → families)

Mapped from `content/learning/syllabus/tn-g10.json` (chapter 3 `outcomes[].mapped`). Every competency has a module with 3 diagnostics; families are the module's pools.

| Competency (graph id) | Grades | Module · diagnostics | Families (pool size) |
|---|---|---|---|
| algebra.linear-systems | 10–10 | yes · 3 | alsys (500), alsysw (300), alcons (360), almeth (450), alkcase (300), alsysx (400) |
| algebra.linear-systems-three-variables | 10–12 | yes · 3 | al3sys (300), al3cons (300) |
| algebra.polynomial-gcd-lcm | 9–10 | yes · 3 | algcd (300), allcm (300), algcd3 (300), alglp (300) |
| algebra.rational-expressions | 9–11 | yes · 3 | alratl (300), alratx (300), alrop (400) |
| algebra.polynomial-square-root | 10–10 | yes · 3 | alpsq (300) |
| algebra.quadratics | 10–10 | yes · 3 | quad (127), auqstd (400), auqsplit (400), auqf (400), auqcs (620), auqwp (400) |
| algebra.polynomial-zeros | 10–11 | yes · 3 | ahzk (400), ajzero (400), ajzchk (400), alsym (450), alform (456), aldisk (300), alzgr (244) |
| algebra.quadratic-discriminant | 10–10 | yes · 3 | disc (960), aodk (321), aodkr (190) |
| algebra.inverse-proportion | 8–8 | yes · 3 | ahinv (400), ahwork (171), ahvary (120), ahman (400), ahcomp (397) |
| algebra.quadratic-graphs | 10–11 | yes · 3 | alqline (300), alqtab (300) |
| number.proportion | 7–7 | yes · 3 | prop (980), avprop (360), avpmiss (400), avdirv (300) |
| algebra.matrices | 12–12 | yes · 3 | apmmul (400), apmlin (400), apmcost (300), apmcon (160), apmtype (279), apmeq (2171), apmmod (300), aprot (400), aporth (208), apcode (300) |
| matrices.transpose-symmetry | 12–12 | yes · 3 | aqsym (400), aqtrab (400) |
Graph defects found while tracing (source: `content/mathematics/curriculum.v1.json`):

- `MATH.algebra.matrices` (line 8942): prerequisite **inverse-functions**, grade range **12–12**. TN teaches matrices in Class 10 (Ch. 3 §3.9). Recovery for a wrong `gen:apmmul:-3,-3,1,-2,4,-1,5,0` (2×2 product, Class 10 learner) checks inverse-functions, then geometric-sequences. It never checks integer multiplication or addition, which is what the item uses.
- `MATH.algebra.linear-two-variables` (line 6480): mandatory prerequisite **factor-theorem**, which is unrelated. It appears in the support walk for every `alsys` item.
- Five other TN-10 outcomes map only to Grade 11–12 competencies: function types, function graphs, matrices, range and coefficient of variation. `questionSupports` drops any "used" skill whose `gradeRange[0]` is above the learner's grade (`intervention.ts:1105`). Generated questions carry no grade (`gradeOfQuestion` → null), so the questions themselves are still served.

## 2. Mismatch report (P0.2)

Method: every step of every pool item in the 65 families above (Ch. 3 + factorisation + identities), re-classified **by the operation it performs on its actual inputs** (e.g. `multiply(4, −20)` is signed multiplication), and compared with the competency the step is tagged with. Only steps with two numeric inputs and a numeric result can be classified, so this **undercounts** (symbolic steps such as "factorise" or "pair" are not checked).

17 step tags disagree with the operation:

| Family · step | Example (current id, operation) | Tagged competency | Operation actually performed | Items |
|---|---|---|---|---|
| factor · product | `gen:factor:-9,-8 divide(72, -9)=-8` | algebra.factorisation | number.integer-multiply (hidden in own skill)×216; number.multiplication-tables (hidden in own skill)×72 | 288/288 |
| factor · box | `gen:factor:-9,-8 subtract(-17, -9)=-8` | algebra.factorisation | number.integer-add (hidden in own skill)×216 | 216/288 |
| ajfcub · box | `gen:ajfcub:0,1,1,0 multiply(1, 1)=1` | algebra.factorisation | number.multiplication-tables (hidden in own skill)×130 | 130/130 |
| ajfspl · product | `gen:ajfspl:1,-7,3,1 multiply(3, -7)=-21` | algebra.factorisation | number.integer-multiply (hidden in own skill)×224; number.multi-multiplication (hidden in own skill)×195; number.multiplication-tables (hidden in own skill)×31 | 450/450 |
| alsplit · product | `gen:alsplit:0,2,-3,1,-6 multiply(2, 18)=36` | number.integer-multiply | number.multi-multiplication×114; number.multiplication-tables×102 | 216/400 |
| alsys · eliminate | `gen:alsys:1,-1,1,1,-1,2 subtract(-2, -4)=2` | algebra.linear-systems | number.integer-add (hidden in own skill)×1 | 1/500 |
| disc · four-q | `gen:disc:-12,-20 multiply(4, -20)=-80` | number.multiplication-tables | number.integer-multiply×480; number.multi-multiplication×240 | 720/960 |
| ahinv · product | `gen:ahinv:2,2,4 multiply(2, 2)=4` | algebra.inverse-proportion | number.multiplication-tables (hidden in own skill)×107; number.multi-multiplication (hidden in own skill)×293 | 400/400 |
| ahinv · share | `gen:ahinv:2,2,4 divide(4, 4)=1` | algebra.inverse-proportion | number.multiplication-tables (hidden in own skill)×90; number.long-division (hidden in own skill)×310 | 400/400 |
| ahman · total | `gen:ahman:0,2,6,6 multiply(2, 6)=12` | algebra.inverse-proportion | number.multiplication-tables (hidden in own skill)×41; number.multi-multiplication (hidden in own skill)×359 | 400/400 |
| ahman · share | `gen:ahman:0,2,6,6 divide(12, 6)=2` | algebra.inverse-proportion | number.multiplication-tables (hidden in own skill)×30; number.long-division (hidden in own skill)×370 | 400/400 |
| ahcomp · share | `gen:ahcomp:0,0 divide(2400, 75)=32` | algebra.inverse-proportion | number.long-division (hidden in own skill)×397 | 397/397 |
| prop · unit | `gen:prop:2,2,3 divide(4, 2)=2` | number.proportion | number.multiplication-tables (hidden in own skill)×630; number.long-division (hidden in own skill)×350 | 980/980 |
| prop · scale | `gen:prop:2,2,11 multiply(2, 11)=22` | number.multiplication-tables | number.multi-multiplication×476 | 476/980 |
| avprop · extremes | `gen:avprop:2,4,4,2 multiply(2, 17)=34` | number.multiplication-tables | number.multi-multiplication×313 | 313/360 |
| avprop · means | `gen:avprop:2,6,8,0 multiply(6, 16)=96` | number.multiplication-tables | number.multi-multiplication×315 | 315/360 |
| avpmiss · divide | `gen:avpmiss:2,3,6,0 divide(36, 18)=2` | number.proportion | number.long-division (hidden in own skill)×379; number.multiplication-tables (hidden in own skill)×21 | 400/400 |
Whether the destination genuinely assesses the operation:
- **multiplication-tables** diagnostics are `7 × 8`, `6 × 7` (positive single-digit). They cannot detect the sign error in `4 × (−20)` (disc · four-q, 480 of 960 items). They also cannot detect an error in `2 × 17` or `6 × 16` (prop/avprop, ~1,100 items).
- **integer-multiply** has good signed diagnostics (`(−8) × 4 − (−60) ÷ (−4)`). But no Class 10 algebra step routes there except `alsplit · product`, and 216 of that step's 400 items are positive products.
- Signed division and subtraction inside factorisation (`factor · product` `divide(72, −9)`, `factor · box` `subtract(−17, −9)`) are tagged as factorisation itself. A learner whose real gap is integer signs is taught factorisation again and again (S01, S09, S14).

**P0.3: historical long-division → multi-digit multiplication mismatch.** It **does not reproduce** on `gen:ldiv`: question-supports@1 now follows the step's "uses" edge to multiplication-tables, and the competency-level "plausible" edge to multi-multiplication is not followed (S02 criterion passes). **The same class of defect persists elsewhere**: multi-digit products are tagged as single-digit facts (`prop · scale`, `avprop · extremes/means`), and signed products are tagged as facts (`disc · four-q`).

## 3. Acceptance scenarios (P1.7)

The audit text listing the 14 scenarios was not in the repository or this conversation. I derived them from items 3–12 of the brief and kept them independent: each starts a new learner, and none reads another's state.

**Learner models (P1.8)** are operation-based. A learner carries faulty arithmetic operations, and every answer is computed by re-running the item's numeric step chain with those operations (or by evaluating a plain-arithmetic prompt). No model looks at competency IDs. Teaching repairs an operation only when the lesson's competency addresses that operation.
- `signMul`: drops the sign when exactly one factor is negative.
- `subNeg`: computes a − (−b) as a − b.
- `fact78`: 7 × 8 = 54.
- `tables78`: every ×7/×8 fact is off by 2.
- `powAsMul`: 7² = 14.

**Production path (P1.12)**: the default flags (`prerequisiteAfterOwn` on, easier-first on, together on); the production module wrapper `learnerState(...).module()`; `recovery()` driven the way `Learn.tsx` `Recovery` drives it, with investigate answers recorded as `diagnostic` and context `investigate:<original>`. No fixtures, no review registry, no research flags. Learners are enrolled on TN Class 10 (Class 5 for the long-division cases).

| # | Scenario | Result | What happened (trace file) |
|---|---|---|---|
| S01 | Sign error behind `gen:disc:-4,-20` (x² − 4x − 20) | **FAIL** | integer-multiply never checked; it is not in the support list. 10 supports explored (several Grade 3 skills), factorisation taught, escalated after 2 returns. Gap still present. |
| S02 | 126 ÷ 7 with a 7×8 fact gap (Class 5) | **FAIL** (2 of 4 criteria) | Not routed to multi-digit multiplication ✔. 7×8 asked (`mt-d1` → 54 ✗) ✔. But tables still ends **independent** from two other right facts, nothing is taught, and long division ends **transfer** while 126 ÷ 7 is still wrong ✘. |
| S03 | Tables shown in history, two recent wrong ×7/×8 answers | pass | status@2 demotes to guided; recovery re-checks tables |
| S03b | Same, history at **verified** | pass | verified also drops to guided after 3 recent wrong answers; re-checked |
| S04 | Tables already shown broadly (7×8 never asked); fails 126 ÷ 7 | **FAIL** | No 7×8 / 56÷7 question ever asked; escalated "no gap found" |
| S05 | Same failing prerequisite (exponents) reached by diagnosis vs by support walk | **FAIL** | Diagnosis branch: escalates as soon as the exponents module pauses and never looks below. Walk branch: goes below exponents (tables, equal groups, addition) first. Code: `intervention.ts:1203` vs `1221–1231`. |
| S06 | First answer right **with a hint** / **with the solution shown** | **FAIL** | Both return `solved`, "Solved on your own." (`intervention.ts:1135`, shown as the heading at `Learn.tsx:1073`) |
| S07 | Lesson given, no independent answer since | pass | status `exposure`; recovery still sends the learner to tables |
| S08 | Teachable 7/8-table gap: is recovery claimed only after a fresh independent original-level item? | **FAIL** | Ends `solved_after_help` on the **same** 126 ÷ 7. No unseen long-division item and no unfamiliar item is asked; long division stays `guided`. The wording is honest ("counts as help"), but no transfer is required. |
| S09 | Two gaps at once (sign of product + subtracting a negative) | **FAIL** | subNeg repaired via integer-add ✔; signMul never reached ✘; escalated |
| S10 | Restart mid-recovery (new session next day) | pass | no repeated exposures; same outcome as uninterrupted |
| S11 | Teaching does not take | **FAIL** | Stops (escalate, 33 steps) ✔, but tables is reported **independent** and long division **transfer** while the gap is untouched ✘ |
| S12 | Repaired gap returns after 5 days | pass | day-9 delayed check `mt-r1` fails → `review`, retention failed |
| S13 | TN Class 10 matrix product | **FAIL** | supports = inverse-functions, geometric-sequences (see §1) |
| S14 | Ordinary production path: learner opens the discriminant skill normally | **FAIL** | After 2 right of 3 explore answers the skill is treated as shown (`verify`). Later wrong answers open recovery, which walks 10 supports, teaches integer-add and factorisation, and escalates. The discriminant ends **independent** while the sign gap is untouched; integer-multiply is never checked. |

Other behaviour seen in the traces:
- **Support thrashing.** `byDoubt` (`intervention.ts:102`) re-ranks supports on every call, so recovery interleaves one question per support across about 10 skills. That means 20–25 questions before the first return, most of them Grade 3–7 items for a Class 10 learner (S01, S14).
- **Unasked-for lessons.** A lesson can be delivered on a support with no wrong answer on it (S14 rows 12–13: an integer-add lesson after no integer-add question).
- **My harness bug (fixed).** An earlier run recorded investigate answers without the `investigate:` context, which stalled every diagnosis. The production UI records them correctly. All results above are from the corrected run.

## 4. Proposed corrections, ranked by impact (not implemented; owner approval needed)

1. **Tag steps by the operation performed, and enforce it in CI.** Signed products, quotients and differences → integer-multiply / integer-add. Multi-digit → multi-multiplication / long-division. Factorisation's internal integer steps get their own tags. Add the classifier from §2 as a test so new families cannot regress. *Unblocks S01, S09, S14 and the factorisation-dependent families (quadratics, GCD/LCM, rational expressions, zeros).*
2. **Problem-specific support checks.** When recovery reaches a support that is already "shown", it should still ask one item that uses the failing step's exact operation (e.g. 56 ÷ 7, 4 × (−20)) before skipping the support. Same rule for a skill's own status: don't report independent/transfer while the learner's latest independent answer on the same operation is wrong. *Fixes S02, S04, S11 and the S14 overclaim.*
3. **Assisted first answer.** `recovery()` must use `independentAttempt(tries[0])`. A hinted or solution-shown first answer should become `solved_after_help`. *One-line fix (S06), high trust value.*
4. **Fresh-transfer gate.** After a repair, recovery is complete only after an unseen, independent item of the original family, plus one unfamiliar item at the original level (another family or format). The repeat stays recorded as help. *S08.*
5. **Branch parity.** Apply deeper-support@1 inside the diagnosis branch before escalating on a paused prerequisite. *S05.*
6. **Graph and grade fixes for TN Class 10.** Matrices prerequisites and grade range; linear-two-variables ← factor-theorem; review the five outcomes mapped only to Grade 11–12 competencies. *S13.*
7. **Bound and stabilise the support search.** Fix the order once per recovery. Prefer supports the failing step actually uses. Cap the background (≥3 grades below) checks. *Cuts S01/S14 time-to-return roughly in half.*

## 5. Exam objective (P2)

**Paper (TN SSLC Mathematics, 100 marks, 3 h, pass 35)**: Part I 14 × 1 MCQ; Part II 10 × 2 (from 14); Part III 10 × 5 (from 14); Part IV 2 × 8 (graphs or geometry constructions, internal choice). Source: Careers360 and PW exam-pattern pages for 2026–27. I could not verify the chapter-wise blueprint and weightage from an official DGE source, so no per-chapter marks are claimed.

**P2.13 Capability map** (`content/learning/syllabus/tn-g10.json`, 49 outcomes):
- 48 have a question pool.
- 4 are marked human-assessed: 3 constructions (Ch. 4: similar triangle, triangle from base and vertical angle, tangents) and 1 identity proof (Ch. 6). Their pools cover related numeric work, not the construction or proof itself. One construction outcome (o02) has no pool at all.
- Part IV (16 marks) is therefore half unassessable today (constructions). The graph half (variation and quadratic graphs, Ch. 3 o07) is only partly auto-assessed (graph-sketch is "both").

**P2.14 Foundations that block many question types.** Operation scan of all 193 families mapped to TN Class 10, counting families by operation actually performed (an undercount, as above):

| Foundation | Families | Chapters | Usually tagged as |
|---|---|---|---|
| Single-digit facts | 21 | 1,2,3,4,5,8 | the topic skill (probability, inverse proportion, triangle area…) |
| Division (incl. long division) | 19 | 1,2,3,4,5,8 | the topic skill |
| Multi-digit multiplication | 10 | 1,2,3,8 | multiplication-tables or topic skill |
| Squares/powers | 8 | 1,2,3,5,6,7 | exponents (correct) |
| Integer add/subtract | 7 | 1,2,3,5 | sometimes the topic skill |
| Integer multiply/divide | 5 here, + factorisation families feeding quadratics, GCD/LCM, rational expressions, zeros, discriminant | 1,2,3 | geometric sequences, multiplication-tables, factorisation |

Signed-integer arithmetic and factorisation are the highest-leverage repairs for Ch. 3. Facts and division sit under most of Ch. 8 (probability, statistics) and mensuration.

**P2.15 Goal-oriented plan (proposal).** Rank each capability by
*expected marks gained ÷ study hours = (marks at stake on the paper × P(learner reaches it | current profile)) ÷ estimated hours (from expected-time and prerequisite depth)*.
For a 40-mark learner this puts, in order:
1. Signed-integer and factorisation repair. Short, and it unlocks several Ch. 3 question types.
2. Procedural, low-depth chapters: mensuration formulas, coordinate area and slope, SD/CV, and basic probability.
3. Part I MCQs across chapters.
4. The Part IV graph question: table → plot → read. Practised on paper with a self-check, since drawing is not marked by OpenPath.

Constructions and proofs come last: low marks per hour for this learner, and not assessable here. The ordering needs the blueprint weights and the learner's own diagnostic before it is a plan. It must not change curriculum coverage (per your instruction).

**P2.16 Real-student evaluation** (needs your consent/retention policy first). Measure four things separately:
- **Diagnostic accuracy.** On the same items, compare OpenPath's identified gap with a blinded tutor's diagnosis from the learner's written working. Report precision and recall per operation.
- **Learning.** Fresh isomorphic items on the repaired operation: pre, immediate post, and 1–2 weeks delayed.
- **Transfer.** Unseen original-level items from other families and formats, on paper.
- **Exam improvement.** A board-format mock, marked blind: baseline, then after N weeks.

Use a within-learner control: topics not targeted serve as the comparison, which avoids needing a large control group. Pre-register the +20 target, and report everyone who started, including those who drop out.

## 6. Engineering vs educational evidence

- **Engineering (this audit):** code paths, routing, status claims and bounds under 5 constructed operation-error models; existing tests 31/31; scenarios 5/15.
- **Limits:** only numeric two-operand steps are re-executed, and learners answer symbolic steps correctly (so gaps are underestimated, not overstated). Lessons "repair" by rule, not by any model of real teaching.
- **Educational:** none. No result here says a child learned, transferred or scored more. That needs §5 P2.16 with real learners.

## 7. Reproduce

Scratch harness (not committed): `harness.ts` (learner models and driver), `acceptance.test.ts` (15 scenarios), `mismatch.ts` and `breadth.ts` (operation scans), `traces/` (one file per scenario). Run `bun test acceptance.test.ts` from the harness folder against a checkout of the baseline at `/home/claude/premsethutmc/openpath` (about 3 minutes).
