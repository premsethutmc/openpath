# Grade 1–6 mathematics: reference journeys and proposed graph cleanup

Based on PR #55 head `174f73136841b9f980fe35c632ed290c2ead1b5a`, on isolated branch `feat/grade1-6-mathematics-foundation`. No changes to main, PR #55, JEE branches, estimator, verification policy or evidence eligibility. No deployment or real-child access enabled.

This is **three implemented reference journeys**, not a completed Grade 1–6 curriculum. All content is original AI-assisted, provisional and unreviewed. Mathematical checks and synthetic browser interaction do not establish educational effectiveness.

## Coverage and curriculum audit

The historical v1 graph remains byte-for-byte intact: 200 competencies, including 92 Grade 1–6 records. Counts by grade: **15, 16, 16, 15, 15, 15**. Early-grade strand counts: number 35; algebra 8; geometry 14; measurement 21; statistics 7; reasoning 6; probability 1. See [coverage.json](coverage.json).

[The machine-readable audit](../../../content/mathematics/foundation/graph-audit.v1.json) reviews all 92 early-grade prerequisite lists. The `1.1.0-proposal` teaching-navigation overlay keeps every existing ID; 83 lists change. The entire resulting 200-node graph has **261 edges, no cycles and no missing references**. Independent entry points have explicit root justifications. This proposal does **not** silently replace the registered v1 inference framework. Adoption into the canonical framework is a separate reviewed version change. New reference lessons do not gate children behind the old artificial chains.

| Problem in v1 | Proposed correction and rationale |
|---|---|
| Addition requires composing tens; zero follows subtraction | Counting is sufficient to explore joining groups and zero. Introduce place value separately. |
| Equal groups requires regrouping subtraction | Require counting and joining quantities, not an unrelated algorithm. |
| Thousands follows unit fractions; large numbers follows fraction comparison | Connect to hundreds/thousands place value instead. |
| Equivalence requires long division | Connect equal-whole fraction models and equal grouping. Long division is unnecessary. |
| Factors follows decimals; unlike fraction addition follows primality | Factors connects multiplication/division; unlike addition connects equivalence and like-unit addition. Primality is not mandatory. |
| Mass → time → money → length → mass → capacity → clock chains | Separate concrete measurement domains. Clock depends on event sequence/counting; change depends on coin values/subtraction. |
| Area follows money; speed follows volume; triangle area follows speed | Use square units/equal groups, distance/time/division, and rectangle-area/triangle models respectively. |
| Constructions follows nets; frequency tables follows mean | Use line/circle/measurement skills and count tables, respectively. |

Fourteen proposed refinements are **planning records, not added competencies or lessons**: one-to-one correspondence/cardinality; numeral–quantity mapping; subitising; number-line jumps; part–whole decomposition; gap-free unit iteration; array structure; sharing versus grouping division; fractions on a number line; equal parts/same whole; unlike-fraction comparison; decimal place-value comparison; multiplicative versus additive ratios; meaning of fraction division.

Six compound records need later subdivision: plane/solid shapes; sides/corners/faces; like-fraction addition/subtraction; metric-unit domains; fraction multiplication/division; decimal multiplication/division. No exact duplicate IDs were found. Important overlaps are meaningful refinements rather than reasons to delete history: unit-fractions → fraction-models → equivalence; equal-groups → tables; shape recognition → properties; direct length comparison → unit measurement. New subskills must not automatically inherit parent evidence.

**Migration policy:** current IDs have identity aliases only (unchanged). All historical activity and native evidence remains on its original ID/version. Proposed refinement IDs begin `proposal.math.` and are not registered capabilities. If promoted, retain the historical parent as an aggregate with explicit new relationships; do not move old evidence to children or infer demonstrated understanding without admissible evidence. No storage migration or evidence deletion is included.

## Board sources and placement uncertainty

Official starting points: [NCERT textbooks](https://ncert.nic.in/textbook.php) and [Tamil Nadu Textbook Corporation](https://textbookcorp.tn.gov.in/). Both requests returned **proxy CONNECT 403 on 2026-10-19**. No edition, chapter, page or verified curriculum alignment is claimed. The original graph's NCERT placements remain provisional; Tamil Nadu mappings remain independently unmapped.

A verified chapter-by-chapter NCERT/Samacheer comparison is an external blocker, not completed work. The audit records separate board fields and specific comparison questions: equivalence/decimal introduction; grade-5 percentages; grade-6 fraction division; ratios; constructions; triangle area/cuboid volume; mean/frequency. These require official edition-specific checks before changing grade assignments. In particular, percentages and fraction division may be enrichment at their current placements. Do not assume identical expectations across boards.

The Grade 3 equal-groups lesson reinforces an existing grade-2 capability; the Grade 5 equivalence lesson reinforces the existing grade-4 ID and includes unlike-fraction comparison. These are proposed instructional age bands, not new official grade mappings.

## Implemented learning experience

Entry point: **`/foundation.html`**, additive to the integrated app. Existing English navigation, essay UX, Tamil entry point, old mathematics page and exam generator are preserved.

| Journey | Conceptual understanding | Procedure and application |
|---|---|---|
| Grade 1: numbers and addition | Tap individual apples, count each once, join/adjust groups, see zero and counted number-line landings | Count-on worked story; guided/independent addition; birds and shells; transfer from objects to jumps |
| Grade 3: equal groups | Change rows and objects per row; see repeated addition and multiplication; turn arrays | Contrast equal/unequal groups; idlis, pencils, seating; distinguish adding labels from counting objects |
| Grade 5: fractions | Two same-length fraction bars, selectable equal partitions and shading; equality by shaded length | Equivalent fractions, common-unit comparison, ribbon application, path transfer; contrast changing only denominator |

Each program has **8 fixed activities**: concept, interactive exploration, worked example, guided practice, independent practice, application, transfer, delayed review. There are **18 fixed questions** total (six per journey, including three distinct next-day questions), plus three interactive models and three worked explanations. These are not educator-approved lessons. The Grade 5 comparison questions share the historical equivalence parent pending a reviewed comparison subskill; that granularity limitation is explicit.

Progress rows show activity completion, fixed activity list, current/remaining work, recorded time, attempts, successful practice and examples to revisit. A collapsed program list reduces phone clutter; switching stages scrolls to the teaching activity. Completed activities can be reopened without erasing anything. Server-derived next-day review preserves **7/8 completed activities** until due; 8/8 still does not mean mastery. Exploration changes and answer drafts saved when leaving the answer field survive reload. Transient apple-count highlight selections are not a separate attainment record.

Speech is optional browser/device speech synthesis, with no paid service, external audio request or promised voice availability. Visuals and text remain available without speech. A beginning reader may need a grown-up to read instructions if device speech is unavailable. Tamil instructional localisation and verified recorded audio remain outstanding.

## Integration and evidence boundaries

- Existing `Api`, HttpOnly account session, CSRF transport, parent-owned pupil UUID and append-only mathematics `PupilEvent` stream; no new identity/table/ledger service.
- New receipts: `math_foundation_activity`, `programId`, immutable `lessonVersion`, `journey`, stage/action, actual visit, response/draft and bounded elapsed time. Sequence conflicts and duplicate IDs use existing API protection. Successful save is confirmed by a server reload; failed writes require reloading the server place.
- Backend validates owner/version/model shape, stage order, required attempts, exploration interaction and delayed-review clock. It never calculates proficiency. Activity completion requires an attempt, not a correct answer.
- Adapter uses native `CodeItem`, exact rational normalization, `scoreCode`, `Ledger.apply` and canonical `sharedProfile`/verification. Native items have stable IDs/families, original-content provenance, worked solutions and **hardcoded provisional status**. There is no API field that can elevate eligibility.
- Legacy fractions evidence and activities are retained; native events preserve their original append order when streams interleave. The old fractions UI filters foundation receipts while keeping the full server sequence. This avoids both replay errors and cross-program unlocking.
- Misconception feedback describes a plausible interpretation of this response, not a diagnosis. Two wrong practice examples suggest revisiting the model; one wrong response does not establish a gap. Fresh independent successes avoid extra optional practice; hints and repeated items cannot become independent proof. The assigned program is never regenerated.
- School, GRE, JEE Main and JEE Advanced have separate program keys and completion. They share capability identity/native exposure history. Competitive selection offers foundation review only, not exam-style instruction. Official scoring, timers and readiness claims remain disabled.
- Elapsed time is interaction-to-interaction recorded time, bounded to an hour per receipt; it is not a calibrated attention measure. Unsaved time since the last interaction is not restored.

There are no newly validated mathematics items or calibrated difficulty bands. Therefore this branch cannot establish verified strengths or perform verified-mastery-based automatic skipping. Shared-engine status is displayed honestly, and local practice strengths are labelled formative. Automatic prerequisite remediation, official curriculum adoption and new reviewed evidence releases remain integration/review work, not a second planner embedded in the frontend.

## Private local preview

Prerequisites are the existing backend virtual environment and frontend dependencies. Use synthetic accounts only. From the repository root, in separate terminals:

```sh
backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:8012 --noreload --nothreading
```

```sh
cd frontend
node scripts/build-mathematics-foundation.mjs
PORT=4182 API_TARGET=http://127.0.0.1:8012 node scripts/preview-english.mjs
```

Open port 4182, path `/foundation.html`. Create a synthetic account/pupil in the existing `/` app first, or sign into an existing test account on the new page. Both pages use the same identity. Keep any Codespaces port **private**; do not change public visibility. SQLite local review uses `--nothreading`; production PostgreSQL/load behaviour is not certified here.

The feature workflow builds/tests the combined artifact for repository-authorized download and local review. It does not host or deploy it. There is no public/private hosted URL newly provisioned by this branch. [Screenshots](screens/) show real synthetic browser interactions at 320/360/412/768px. A screenshot does not replace educator observation.

## Remaining coverage and effort

**Mapped:** 92 provisional Grade 1–6 records. **Implemented:** three substantive reference journeys targeting three existing IDs. **Tested:** synthetic interactions and mathematical invariants listed in [VALIDATION.md](VALIDATION.md). **Educator-reviewed:** zero. The other 89 mapped targets are not completed instructional programs, even where a v1 question generator exists.

Remaining work includes counting/numeral recognition beyond the slice; place-value blocks and regrouping; subtraction/division models; time, money, measurement; geometry and spatial tasks; decimal/ratio/percentage models; data; richer reasoning; prerequisite checks; board verification; curriculum-grade corrections; many more independent/transfer/delayed items; accessible manipulative interaction, Tamil localisation and real-device audio; reviewed question release and calibrated mastery integration; supervised educator/learner validation under separately approved access.

Planning estimate, **not a commitment**: 89 additional targets × roughly 2–5 author/reviewer person-days = **178–445 person-days** for substantive first-pass programs using these reusable models. Add approximately 15–30 specialist days for official-board audit and progression revision; localisation, accessibility, content calibration and supervised learner studies require separate estimates. Reuse may reduce authoring time, while evidence-driven revision may increase it. Three synthetic journeys cannot predict classroom learning effectiveness.
