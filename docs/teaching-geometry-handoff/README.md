# Teaching, geometry and adaptive handoff — 9 November 2026

Local branch: `milestone/teaching-geometry-handoff-2026-11-09`, based on calculus candidate `b5ebe187f4aba5ce16cb958172af04ce323fedf0`. Adaptive helper/journey commit: `e49caab4848d361338a414f945381ae2e2b3a812`. The final local commit is the commit containing this handover (`git rev-parse HEAD`). No push, merge, deployment or content approval.

## Implemented learner outcome

The existing triangle angle-sum `worked_steps` strategy now explains interior/straight angles, why a parallel through C copies A and B, and why subtracting the two given angles leaves the third. Four screens include 30°+90° →60° and the retained historical 56°+85° →39° example. Guided practice asks 56°+82° →42°; the fresh independent check asks 24°+57° →99°. Existing strategy ID, intervention kind and sub-skill scope remain intact. Replacement is selected by the real learner route; merely adding another strategy did not ensure this.

The shared Year/curriculum Figure renderer uses JSXGraph 1.14.3, under its retained MIT licence, when explicitly built with `--geometry-lab`. The non-test default renders the static picture; a URL parameter cannot activate interaction. Native labelled range controls provide touch/keyboard alternatives to dragging. Reset restores 30°/90°/60°. Flat/near-flat positions suppress the claim/proof; measurements remain approximate and are explicitly distinguished from proof. C is bounded above the base, so this is not an exploration of all orientations. Shallow labels can crowd; named text identifies all three sectors.

Only the generated triangle module changed relative to b5ebe187; all calculus content and other modules remain identical. Prior calculus revisions explain expansion/cancellation/limits and substitution/du/changed bounds. Independent review notes a remaining task-alignment limitation: some first-principles follow-ups use radical/rational forms after quadratic teaching. This milestone does not claim to resolve that broader teaching task.

The real Django learner–educator journey proves explicit no-share choice, consented access, answer-consent revocation, share revocation, unrelated-account denial, resolution, duplicate rejection, and one fresh unaided check with reload protection and no automatic mastery. No backend authorisation changes were needed. Wrong-answer helpers now submit actual displayed MC options; 99 intentional wrong responses are incorrect in both Django grading modes, not unreadable. See ADAPTIVE-HANDOVER.md.

## Review and release

The revised selected explanation is `pending_review`; module status is draft. No educator decision is fabricated. Supervised non-test evaluation eligibility still refuses this pending content. Geometry interaction and deep recovery retain separate, default-off controls. The learner browser harness uses the existing explicit test review fixture; it is not evidence of approval for real learners.

Library file: `libfile_fde3_f-7f4499caa7808191beb0108fb034ed68_1f1507b0598081918bc388a3c0f6b276`.

Teacher packet: `/workspace/shared/geometry-teacher-review-2026-11-09/OpenPath-triangle-teacher-review.pdf` (8 A4 pages). Source/lesson snapshot are beside it; generation script is `frontend/scripts/geometry-teacher-packet.mts`. Learner pages and questions precede separate teacher answers and the six-part rubric: correctness, prior-knowledge clarity, conceptual reason, worked steps, alignment and unsupported claims. Independent engineering/content review is recorded under `review/`; educator approval remains a separate human decision.

## Checks and evidence

- Final focused Node suites: 27 passed, zero skipped (geometry invariants/degeneracy/reset, actual task scope, replacement guards, old teaching record resume/exposure, pending gate; calculus; historical answers; integration; adaptive evidence). Historical answers include 2,372 answer/choice records. Old triangle guided/check answers 95/90 still grade correctly; saved records round-trip without invented mastery. This does not claim byte-identical decisions across arbitrary engine versions.
- Real geometry browser: passed on Django, mobile 393×852 with CDP touch drag, native keyboard fallback, flat/shallow cases, reset, scrolled proof visibility, and genuine 1280×900 desktop context. Actual four learner screens captured. Guided→fresh check→reload→later wrong→fresh check→reload passed; no educator approval or early transfer.
- Shared curriculum preview: passed at 360px, pending status visible, no writes, opt-in interaction and non-test static default. Query cannot enable the feature.
- Adaptive: 31 focused tests; real mobile Django handoff journey; 99 MC mistakes in both backend modes. Backend 23 passed/one fixture-dependent skip, then that persistence test passed separately with generated fixtures and a new Node process.
- Teaching/generator/server-grader contracts: 45 passed (122,300 assertions). TypeScript checks passed. Generated library, scoped review synchronisation, explanation registry check, grader build and on/off builds passed. `git diff --check` passed.
- Independent cosine-law review: 549 positions agree to <1.7e-12 degrees; invalid cases checked. Independent source and browser/PDF review separate from educator approval.
- Final logs, exit codes, browser JSON and screenshots: `/tmp/geometry-quality/`; durable copy: `/workspace/shared/teaching-geometry-quality-2026-11-09/`. Adaptive logs/screens: `/workspace/shared/adaptive-quality-2026-11-09/`.

Resolved development failures: initial route selected the old template (fixed by guarded in-place replacement); unsupported JSXGraph typing removed; preview server now decodes encoded release paths; desktop evidence now uses a genuine desktop context; PDF regenerated after final content, missing practice diagrams added and blank-page overflow removed; optional-instance typing in the new test corrected. No unresolved test failure is intentionally hidden.

Not run: hosted CI/full repository suite, physical iOS/Android, manual screen-reader audit, real educator approval or real-student learning assessment. Accessibility checks cover labels, keyboard controls, focus/touch sizing, text alternatives, non-colour labels, no horizontal overflow and proof scroll visibility; not a full WCAG audit. Grade 8 PR #119 was neither edited nor integrated.

## Reproduction

From frontend: `node --import tsx --test src/geometry/triangle.test.ts src/journey/calculus-teaching.test.ts src/learning/historical-answers.test.ts src/journey/maths-integration.test.ts src/journey/adaptive-milestone.test.ts`; `node --import tsx --test src/journey/simulated-choice-answers.test.ts`; `npm run typecheck`.

Build with `DIST=dist-geometry node scripts/build-year.mjs --test --geometry-lab` for the synthetic Year journey and `DIST=dist-geometry node scripts/build-curriculum.mjs --geometry-lab` for the non-test preview. Build both again into `dist-geometry-off` without flags for default-off checks. Run `node --import tsx e2e/geometry-preview.test.mts`. Geometry real-backend harness: `GEOMETRY_CASE=1 CASE='geometry reasoning' DIST=dist-geometry node --import tsx e2e/maths-expansion-browser.test.mts` with the existing test clock/API setup (saved runner in evidence). Adaptive commands are in ADAPTIVE-HANDOVER.md. Do not use test fixtures for real-learner approval.

After an authored change, run library synthesis, `scripts/geometry-review-sync.mts`, scoped explanation-review sync/check and the server-grader build before testing. The scoped script follows the existing draft-reset policy and avoids an unnecessary whole-library fingerprint pass.
