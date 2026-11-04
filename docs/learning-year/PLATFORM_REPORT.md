# My Learning Year: grade-independent platform (development directive)

**Branch and PR:**
- branch: `feat/my-learning-year-platform`
- stacked on: `feat/my-learning-year-corrective` (PR #62) → #61 → #60

**Constraints held:**
- nothing merged and nothing deployed;
- no paid call and no language model;
- no real learner record touched; only synthetic pupils, in a scratch database and in CI;
- no evidence policy weakened;
- no competency id changed and no existing curriculum release rewritten;
- nothing approved for educators.

The one rule change is the seven-full-day verification, which the owner approved. It is now verification@3 in the shared engine, and verification@2 can still be replayed for historical records.

> **Platform vs content.** The platform is general: any supported textbook → tiles at any depth → modules → recovery → evidence → plans and goals. The **content is not complete**:
> - 17 of 200 competencies have a complete learning module;
> - no module is educator-approved;
> - so no skill can honestly be verified on real use.
>
> See `COVERAGE.md`. The curriculum is **not** declared complete.

## 1. Directive → what was built

| Directive | Built (files) | Status |
|---|---|---|
| Generic curriculum synthesis | See note 1 below. Sources: `extract.ts`, `curriculum.ts`, `meaning.ts`, `content/learning/competency-concepts.v1.json`. | implemented, tested, browser |
| Hierarchical tiles, any depth | See note 2 below. Source: `tiles.ts`. | implemented, tested, browser |
| Module for every assessable capability | Explore → Strategy → Chapter → Practise → Verify, unchanged (`intervention.ts`). The module also asks unused strategy checks alone, so the shared engine gets the direct evidence it needs. Each answer's activity comes from the list the question is in. | implemented, tested, browser |
| Same recovery for every grade | `recovery()` with diagnostic@2 over 17 problem families. Tested at Grade 4 (7 × 8 inside an equivalent fraction), Grade 10 (expanding brackets inside quadratics) and Grade 12 (powers inside a substitution integral; changing the limits). | tested, browser (Grades 10 and 12) |
| Distinct systems | See note 3 below. | implemented |
| Seven-full-day rule | verification@3 in `english-core/src/retention.ts`: the delay is exactly 7 days, with no tolerance. verification@2 can be replayed with `opts.definition`. On this surface the delayed check is due 7 days after the later of: the skill shown on this surface, and the engine's first demonstration. The server refuses a check before 7 full days. | implemented, tested (engine, Django, browser) |
| Exam goals | goals@2, unchanged. Grade 5 gets foundations from its own year only. Decomposition is by grade: a Grade 8 learner gets the power steps of a substitution integral, and a Grade 12 learner gets the full problem. There is one evidence record (`platform.test.ts` D). | tested, browser (B, N) |
| Content production and review | See note 4 below. | implemented, tested |
| Coverage, reported separately | coverage@1 (`coverage.ts`, `scripts/coverage.ts` → `COVERAGE.md`). See note 5 below. | implemented, tested, browser |
| Unsupported things explicit | Subjects other than mathematics are extracted, then marked "not supported yet". Nothing in them is mapped, and the server refuses mapping them. Scans, other file formats and question types are listed in `UNSUPPORTED`. | implemented, tested, browser |

**Notes to the table**

1. **Generic curriculum synthesis**
   - extract@1 now reads units, parts or strands above chapters, and numbered sections of any depth, in both structured and plain text.
   - meaning@3 adds secondary-school concepts, plus competency concept annotations kept as data.
   - Unsupported subjects are stated as such.
   - The release script never rewrites an existing release. A reviewer's decisions on uncertain mappings are recorded per book (`<book>.review.json`).
   - New sample books: Grade 12 (calculus, with units and nested sections) and Board B Class 10 (units and sections).
2. **Hierarchical tiles, any depth**
   - The hierarchy is subject → unit → chapter → section … → skill → micro-skills.
   - aggregate@2 rolls a parent up from its distinct constituent competencies, so progress (the fill) and mastery (the colour) stay separate.
   - Each tile shows its content level: a full module, incomplete (with what is missing), or "No learning content yet". A tile with no content is not assessable and never counted.
   - Each tile shows its educator-review state.
   - Alternative ways and enrichment links are shown.
3. **Distinct systems**, each with its own interface:
   - graph (`graph.ts`: mandatory, plausible, support, disputed, trivial, part, plus the new **alternative** and **enrichment** relations, which recovery never follows);
   - curriculum (`curriculum.ts`);
   - evidence (`evidence.ts`, the shared ledger);
   - planner (`plan.ts`, `intervention.ts`).
4. **Content production and review**
   - library@1 synthesises a module from a blueprint: the teaching text a person wrote, plus a problem family. Synthesis adds questions in two formats; multiple-choice options are mal-rule answers. Every generated answer passes the family's independent check.
   - validate@1 checks module structure.
   - review@1 is the registry: draft → submitted → approved (by an educator who is not the author) → released. A content change makes the module a draft again.
   - Only a released, unchanged module counts as validated in the content gate.
   - Scripts: `library.ts`, `review.ts`, `coverage.ts`.
5. **Coverage categories**, each reported on its own:
   - extracted requirements and mappings;
   - diagnostic questions, teaching strategies, practice and independent assessment;
   - retention checks;
   - educator-approved content.
   - Coverage is reported per release and for the whole graph. Each dashboard has a coverage card.

## 2. New content (all original, CC0, written with AI assistance, not educator-reviewed)

**Seven problem families**, each answer checked independently:

| Family | Problem | Independent check |
|---|---|---|
| pow | aⁿ | `BigInt` |
| dist | a(x + b) | evaluation at two points by repeated addition |
| expand | (x + a)(x + b) | substitution |
| dpow | f′(t) for k xⁿ | central difference |
| pint | ∫ k xⁿ | Simpson's rule |
| subst | ∫ 2x(x² + c)ⁿ | Simpson's rule |
| disc | number of real roots | the vertex value |

- Each family has a multiple-choice form, `gen:…:mc`.
- The server mirrors the families, and a parity fixture covers 1136 ids (1114 supported, 22 that must be refused).

**Seven synthesised modules:**
- powers;
- a(x + b);
- (x + a)(x + b);
- the power rule for derivatives;
- antiderivatives of powers;
- substitution;
- the discriminant.

**Eight existing small modules completed** with a second practice question and a transfer question (new ids only). All 17 modules validate and are *submitted* (awaiting an educator).

**Graph additions 1.1.0:**
- 7 micro-skills. "Integrate by parts" deliberately has no content.
- Supports for the new modules.
- 2 alternative relations and 2 enrichment relations.

**Relation audit 1.1.0:**
- 6 more edges are classified, for example "exponents ← profit and loss" is disputed.
- The mandatory graph is unchanged.

## 3. Scenarios A–F

Each scenario is tested at engine level in `frontend/src/learning/platform.test.ts`. The browser tests run against Django `runserver` in `frontend/e2e/learning-year.test.mjs`.

| Scenario | Engine | Browser |
|---|---|---|
| A: Grade 4 textbook → dashboard → fractions → assessment, learning, verification after seven full days | ✓ | ✓ (journeys A, E, F, J, K) |
| B: Board B Class 10 → Algebra → Quadratic equations → sections. A gap in expanding brackets is investigated, taught and repaired, then the learner goes back to the problem and continues with quadratics | ✓ | ✓ (platform B) |
| C: Grade 12 → Calculus → Integrals → Techniques of integration → capabilities ("by parts": no content, said so). Powers-as-multiplication leads to the Grade 7 powers module, then solved after help. A limits slip → integration is taught. The same mechanism works at Grade 4 | ✓ | ✓ (platform C, journeys C and G) |
| D: JEE: Grade 5 foundations only from its own year. Grade 8 fragments versus the full problem at Grade 12. An exam plan from one evidence record | ✓ | ✓ (journeys B, D, N) |
| E: an unseen plain-text Board C book: parts, sections and a non-mathematics outcome kept as a proposal. A Science book is declined. The book's module goes through the same review, and once released (in a test registry) it can verify | ✓ | ✓ (platform E) |
| F: Grade 9 or 10 → Grade 12, 2027-28: every record kept, the overdue delayed check comes first, and the new book's plan and tiles | ✓ | ✓ (platform E/F, journey E) |

**Tests run on this branch (local):**
- frontend unit tests: **392/392**;
- Django: **186/186**;
- browser: **12/12 journeys** against Django `runserver` (phone and tablet);
- diagnostic@2 synthetic check across 16 families: 153 cases → 132 identified, 21 uncertain, **0 wrong claims**. Random answers gave 0 claims.
- An independent check (a separate agent that had not written the code) recomputed all 919 new-family questions in closed form: 0 wrong. It found a notation slip ("−1²" for (−1)²), and explanations that predicted the right answer on some items, which made those diagnostic picks uninformative. Both are fixed: such predictions are dropped, and diagnostics prefer questions that can show more explanations.

## 4. Findings and blockers

| Item | Class | What it means |
|---|---|---|
| No module is educator-approved | Evidence (needs people) | Green is only reachable in the test build or in a test registry. The registry and scripts are ready. An educator must review and approve, and a release manager must release. |
| After two early mistakes, the shared engine's estimate may need more direct answers than a module holds (11–15 questions) | Content and product decision | See note 1 below. |
| Content breadth: 17/200 competencies | Content | Adding a module needs a blueprint (text) and usually a problem family. Most Grade 1–3, 9 and 11 skills have none. Geometry constructions, proofs and probability have no families. |
| meaning@3 interpretation parameters and annotations | Evidence | Design values, written by AI with no educator involved. Uncertain mappings still go to a reviewer. |
| Exam patterns, OCR, AI extraction, the tile design, the relation audit | Unchanged from PR #62 | Owner decisions or external dependencies; see `CORRECTIVE_REPORT.md`. |
| The CI job "Mathematics prerequisite safety" on Node 24 | Known, by design | Unchanged. |

1. **Engine evidence after early mistakes.**
   - The module then says honestly: "your shared record needs more answers on your own before a delayed check can verify it".
   - The real fix is larger question pools. Synthesised modules could draw further family variants, but that needs a decision: whether a release covers a family's variants or only the listed questions.

## 5. How to reproduce

```
# content pipeline
node --import tsx packages/learning/scripts/library.ts        # blueprints → library.v1.json (validated)
node --import tsx packages/learning/scripts/review.ts status   # the review registry
node --import tsx packages/learning/scripts/releases.ts       # textbooks → releases (existing ones kept)
node --import tsx packages/learning/scripts/coverage.ts       # → docs/learning-year/COVERAGE.md
node --import tsx packages/learning/scripts/families-parity.ts
# tests
cd frontend && npm test && cd ../backend && python manage.py test
# browser (as CI): see .github/workflows/learning-year.yml
```

**Screenshots:** `screens/p-*.png`.

| Screenshot | State |
|---|---|
| `p-b0` | board choice |
| `p-b1` | units dashboard |
| `p-b2` | chapter sections |
| `p-b3` | section skills |
| `p-b4` | gap repaired |
| `p-c1` | capabilities, including "no learning content" |
| `p-c2` | coverage card |
| `p-c3` | solved after powers |
| `p-e0` | unsupported subject |
| `p-e1` | review of the unseen book |
| `p-e2` | skill at depth |
| `p-e3` | unit progress over its constituents |
| `p-f1` | next year: the delayed check first |
