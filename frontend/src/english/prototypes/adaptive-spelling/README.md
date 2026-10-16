# Adaptive spelling: design prototype (Phase 1)

A design prototype only. The app does not import it, and the production Spelling Bee is unchanged.

- `logic.ts`: the pure rules. It covers letter-by-letter input (`judgeChange`), the clue timing (`helpOffer`, `takeClue`), the analysis of wrong answers (`slips`, `helpAfterWrong`) and the proposed evidence record (`WordEvidence`). Unit tests are in `logic.test.ts`.
- `Prototype.tsx`, `prototype.css`, `page.html`: the review page, with a phone-sized prototype, the demo controls and the design notes.
- Build: `node scripts/build-prototype.mjs` writes `dist-prototype/adaptive-spelling.html`. Browser tests: `node --test e2e/prototype-spelling.test.mjs`.

The timings are initial hypotheses, not validated thresholds. Mastery calculations are not changed.
