# 07 — Desktop and mobile screenshots (real browser, real components)

`screenshots/<scenario>-<desktop|mobile>-<state>.png` — 112 files from `frontend/e2e/m2-scenarios.test.mjs` at 1366×800 and 390×844, plus the Milestone 1 journey in `docs/integration/screenshots/`. Every screen in every run was checked automatically:
- no horizontal overflow;
- every button, input and choice has an accessible name;
- navigation, choice and hint controls are at least 40px tall;
- no page or console errors;
- the run ends in an engine stopping state within 160 interactions.

| Scenario | What it shows | Key files |
|---|---|---|
| 2a repeated error → teaching | incorrect feedback from the grader, the selected explanation revealed step by step, guided practice, the independent check | `2a-*-feedback-incorrect`, `2a-*-teaching`, `2a-*-guided`, `2a-*-independent-check` |
| 3a missing prerequisite | recovery teaches the supporting skill (integer addition: "Positive and negative tokens"), then returns | `3a-*-teaching`, `3a-*-independent-original` |
| 4a right only after hints | the hint is offered and shown only in guided practice ("Getting some help"); asking during independent work shows nothing | `4a-*-hint-shown`, `4a-*-hint-not-offered`, `4a-*-summary-0` |
| 4b hint, then on their own | independent questions marked "Try it yourself" | `4b-*-independent-*` |
| 2f unreadable input | "not marked" feedback (no right or wrong), then a stop for a person after 2 tries | `2f-*-feedback-none`, `2f-*-summary-0` |
| 2d bounded retry | "Try again" offered, then only "Continue with another question" | `2d-*-retry-offered`, `2d-*-summary-0` |
| 6a forgets | the delayed check 8 days later, failed, then the re-check | `6a-*-retention-question`, `6a-*-summary-1` |

What was looked at by eye:
- Formulas render once (KaTeX).
- Guided work ("Getting some help", with the hint panel) is distinct from independent work ("Try it yourself") on both widths.
- Feedback cards state only the grader's verdict and reason code.
- Teaching steps carry an "explanation" badge, never "verified".
- Stopping states show the engine's own reason, with no spinner or retry loop.
- Mobile layout note (existing renderer layout, kept): the feedback card sits below the navigation buttons.
