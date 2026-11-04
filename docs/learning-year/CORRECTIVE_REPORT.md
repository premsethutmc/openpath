# My Learning Year: corrective work (completion directive)

**Branch and PR:**
- branch: `feat/my-learning-year-corrective`
- stacked on: `feat/my-learning-year` (PR #61), which sits on `integ/learning-year-base` (PR #60)
- merged in: `fix/mathematics-prerequisites-reproducibility-v1` (graph 1.1.0, including commit `86d731b`)

**Constraints held:**
- nothing merged into the PRs' bases and nothing deployed;
- no real learner record touched and no paid call made;
- no verified-mastery rule changed: the shared engine's verification@2 is untouched, and this surface only adds conditions;
- no competency ID changed.

**What this report is not:**
- It is not a claim about learning gains, educational validity or exam performance.
- Every number here comes from synthetic learners.

## 1. Gap matrix: requirement → what was wrong → correction

Each status uses these words:
- **implemented**: in the code;
- **tested**: by an automated test;
- **browser**: through the UI against Django;
- **validated**: with real learners or educators. Nothing here is validated.

| # | Requirement | Before (PR #61) | Root cause | Correction (files) | Status |
|---|---|---|---|---|---|
| A1 | Audit the graph against the correction branch | It used the v1.0 graph: `graph.supportsOf` fell back to the v1.0 mandatory edges, e.g. fraction models → division with remainders. | The learning layer read `curriculum.v1.json` directly, not the versioned graph. | Merged graph 1.1.0. Mandatory edges now come only from `packages/mathematics/src/prerequisites.ts` (`packages/learning/src/graph.ts`). | implemented, tested |
| A2 | Mandatory vs support vs decomposition vs strategy | Supports and v1 prerequisites competed, and one pair could appear twice (area integrals ← definite integrals). | There were two representations with no rule for which one wins. | Relations are typed (relations@1): mandatory, plausible, support, disputed, trivial, part. There is one relation per pair. Strategies stay in modules, not in the graph. | implemented, tested |
| A3 | Review the mathematics, don't assume it | The remaining 166 edges of 1.1.0 were unreviewed. | The correction branch removed 34 edges and deliberately left the rest. | Mathematical review of the 41 in-scope edges (`content/learning/graph-audit.v1.json`): 11 mandatory, 5 plausible, 8 support, 16 disputed, 1 trivial. It is a **proposal**: the mandatory graph is unchanged. Recovery doesn't follow disputed or trivial edges. | implemented, tested; **educator review needed** |
| A4 | A correction changes recommendations, not evidence | Not demonstrated. | — | Test A: the same records under graph 1.0.0 and 1.1.0 give identical evidence and ledger event ids but different recovery supports. | tested |
| B | General diagnostic reasoning | Six fixed hypotheses with likelihoods per written question; it only worked on scripted questions. | Hypotheses were attached to individual questions, not to the mathematics. | diagnostic@2 (`packages/learning/src/reasoning.ts`), detailed below the table. | implemented, tested, browser |
| C | General decomposition | One hand-written problem with fixed fragments. | No problem representation. | families@1 (`packages/learning/src/families.ts`), detailed below the table. | implemented, tested, browser |
| D | Curriculum understanding | Structured text only; mapping by word overlap. | Extraction and interpretation were one function. | Extraction, interpretation and review are now separate stages, detailed below the table. | implemented, tested, browser (text). PDF: tested at engine level only. Scans: **external dependency** |
| E | Plan continuity | The plan was derived, but nothing said why it changed. One slip after showing a skill sent it back. | status@1's "latest answer on your own must be right". | The plan is still derived from the stored records, so it persists across sessions, devices and years. `planChange` explains each change since the previous visit. status@2: once a skill is shown, it comes back only after two wrong answers out of the last three. The module never repeats an explanation already taught. | implemented, tested, browser |
| F | Seven-day verification | The surface showed green at 6.51 days on ordinary practice. The server allowed a delayed check 6.5 days after any attempt. | The shared engine's verification@2 uses a seven-day delay less a 12-hour tolerance. The surface trusted it alone. | See the seven-day findings below the table. | implemented, tested, browser |
| G | Learner interface states | One flow; a design that wasn't approved. | — | Screenshots of every important state (section 4). The interface uses the English visual language tokens; the design is **not** owner-approved. | implemented, browser; **design decision pending** |
| H | Goal overlays | One marking pair per goal. | Exam structure wasn't modelled. | goals@2, detailed below the table. | implemented, tested, browser |

**B: diagnostic@2 (`packages/learning/src/reasoning.ts`)**
- The competing explanations come from written mal-rules in each problem family.
- A predicted wrong answer is computed from the problem's own parameters, so it works on unseen problems.
- The follow-up question is the one with the most expected information.
- Uncertainty is explicit: the result is relative support, not probabilities.
- A misunderstanding is never established on one answer.
- "Unexplained" answers never produce a claim.
- Recovery investigates first (`intervention.ts`).

**C: families@1 (`packages/learning/src/families.ts`)**
- Ten families: multiplication facts, rectangle area, missing equivalent fraction, like-fraction addition, constant definite integral, quadratics with whole-number roots, line value, meeting points, which graph is higher, area between a line and a parabola.
- Each family's solution structure is kept separate from its wording.
- Each answer passes an independent check: repeated addition, counting squares, cross-multiplication, Riemann sums, substitution or Simpson's rule.
- Decomposition is by grade, and anything unsupported is rejected with a reason.
- Generated questions use `gen:*` ids, which the server checks (`backend/family/learning_families.py`). A parity fixture keeps the server's rules identical to the app's.

**D: curriculum stages**
- extract@1 (`extract.ts`): structured text, plain text, and a PDF's text layer. Scanned PDFs are declined. AI-assisted extraction is refused unless approved.
- meaning@2 (`meaning.ts`): mathematical concepts, with synonyms, qualifiers and contradictions. Each mapping is clear, uncertain or missing.
- Review: uncertain mappings are never accepted without a decision.
- Releases are versioned: 1.0.0 is kept and 1.1.0 is new. A second-board book is included, and the source records its board and academic year.

**F: seven-day findings and fix**
- The engine's tolerance is an established, cross-surface policy, so it is **not changed**. Changing it is an owner decision; see blockers.
- Green on this surface now needs both the engine's verification and the skill's own delayed check, taken at least seven full days after independent success (`evidence.ts`).
- The server refuses a delayed check before seven full days, using the app's own independence rule (`learning.py`).
- Boundaries tested: 6.5, 6.6 and 6.99 days are refused, and 7.0 days is accepted, in the engine, in Django and in the browser.

**H: goals@2**
- Readiness is a view over the one evidence record: goals add no evidence (tested).
- Horizons: foundations (years away), the exam plan, and a crash course (12 weeks or less).
- Each section has its own marking: negative marking, partial marking, numerical answers, a break-even chance for guessing.
- Exam structures are marked **provisional and unverified**. Published summaries disagree on negative marking in JEE Main Section B.

## 2. Blockers, classified

| Blocker | Class | Done without you | Needs you or someone else |
|---|---|---|---|
| No question is educator-reviewed, so verified mastery (green) can't occur on shipped content | Evidence | The test build shows how green would look, with a banner on every screen. | Educator review and release of questions. |
| The relation audit (16 disputed, 8 re-classified mandatory edges) is my mathematical review | Mathematical / Evidence | The audit affects recovery only. The mandatory graph is unchanged. | Educator review, then a 1.2.0 graph if accepted. |
| The engine's 12-hour tolerance on verification@2 (6.5 days) for every surface | **Product decision** | This surface needs seven full days; the engine is untouched. | Decide whether verification@2 itself should require seven full days. That affects English too. |
| Approved My Learning Year design | **Product decision** | English tokens plus the directive's colour rules; screenshots of every state. | Approve the design or supply one. |
| Exam patterns (JEE Main Section B negative marking; JEE Advanced changes yearly; GRE scaled scores) | External / Content | Modelled as provisional data with a disputed note. | Confirm against the official bulletins. |
| Scanned textbooks (OCR) | External dependency | Scans are detected and declined. The PDF text layer works. | An OCR service or library. A paid service needs approval. |
| AI-assisted extraction or mapping | External, paid | It is refused in code (`EXTRACTION_POLICY`). | Your approval, a cost limit and a review design. |
| Content breadth: 10 modules, 10 families, 7 sample books | Content | — | More modules, families and real textbooks (licensing). |
| Diagnostic and mapping parameters are design values | Evidence | Synthetic checks: 85 seeded cases → 67 identified, 18 "uncertain", 0 wrong claims; random answers never produce a claim. | Calibration with real learners' answers. |
| The CI job "Mathematics prerequisite safety" fails by design on Node 24 (legacy fingerprints; documented in the merged branch) | Engineering (known) | Unchanged and not hidden. | Decide on the fingerprint follow-up (that branch's README). |

## 3. Tests run (this branch)

**Automated tests:**
- Frontend unit tests: **382/382**. This includes the 20 engine tests and 13 generalisation tests:
  - relations;
  - A, H, G and B;
  - C and M;
  - I, J and K;
  - L (text and PDF);
  - N.
- Backend Django: **183/183** (SQLite, locally), of which 11 are My Learning Year:
  - ownership, references and the release hash;
  - the seven-day boundary;
  - the test clock;
  - generated questions and server parity.
- Browser: **9 tests covering journeys A–N** at phone (360 px) and tablet (820 px) sizes. They all pass against **Django `runserver`**, run locally from source, and against the fake API. CI runs the same against Django on GitHub.
- The B check is seeded (fixed cases each run): 85 simulated misunderstandings across 9 families with random parameters.
  - 67 identified, 18 reported as uncertain, 0 wrong explanations claimed.
  - 85 random-answer learners: no claims.
  - This checks the reasoning's behaviour, not its accuracy on real children.

**Evidence levels:**
- **Implemented:** everything in section 1.
- **Tested:** everything in section 1, including the browser journeys.
- **Empirically validated:** nothing. There are no real learners and no educator review.
- **Incomplete:**
  - OCR;
  - AI extraction (not approved);
  - educator review of content and the audit;
  - official exam patterns;
  - design approval;
  - calibration;
  - dark mode on `/year/`. The maths layout is light-only.

## 4. Learner states, with screenshots (`docs/learning-year/screens/`)

| State | Screenshot |
|---|---|
| Year dashboard: not started, no questions yet, proposal tiles | `a2`, `e1` |
| Year → chapter → skill → activity | `a3` → `a4` (Explore), `c2` (Chapter), `j1` (Practise, check), `a5` (shown) |
| Learning (orange), shown on your own (blue), review needed (orange ↻), verified (green ✓) | `j2`, `a5`, `f1`, `k1` |
| Why the plan changed | `j2` |
| Mapping review: clear (ticked), uncertain ("Please choose"), missing (proposal) | `a1`, `l1` |
| Problem investigated → "What we think happened" → teaching → solved after help | `g1`, `g2`, `g3` (also `c1a`, `c1`, `c3`) |
| Not sure: no guess | `g4` |
| Unsupported problem declined | `m1` |
| Several valid methods recognised | `i1`, `i2` |
| Goal overlay at Grade 5 (no advanced material); exam plan at Grade 11 (crash mode, unverified pattern) | `b1`, `b2`, `n1` |
| Advanced problem: grade-appropriate steps; the full problem when ready | `d1`, `d2`, `d3` |

## 5. Recommendation

**Ready for product-owner review as a draft. Not ready to merge or deploy.**

What the engineering supports:
- the specified behaviours beyond the scripted examples;
- consistent dependencies;
- diagnosis that says when it is unsure;
- persistent plans;
- intact historical evidence;
- an interface that reflects the learner's actual evidence.

Before any real use, three decisions are needed:
1. the verification@2 tolerance;
2. the tile design;
3. the relation audit (by an educator).

Educator-reviewed content is required before anything can honestly show as verified.
