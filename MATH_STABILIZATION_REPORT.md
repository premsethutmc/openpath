# OpenPath — Stabilise Mathematical Grading (report)

Branch `feat/math-generalization-core-e7`; code `1479472`, gate outputs `f1bd814`. Nothing merged or deployed.

## Results
| Check | Result |
|---|---|
| Browser bundle (esbuild of `frontend/src/year/Main.tsx`, browser platform) | builds; no `node:crypto` in output. Not the full `build-year.mjs` run; no type-check (no `@types/react`) |
| `packages/learning` (bun) | 1,284 pass, 0 fail, 77 files (incl. 18 new pathway tests, digest parity test) |
| E7 gate | tests 1,284/0; scan errors 0; injection falseVerified 0; battery 38 cases, 1 mismatch (`alg-side`, present since stage2); holdout diagnostics identical to stage5 (0 false acceptances) |
| Frontend suites (49 files) | 47 pass, 0 fail; `mathematics-completion` timed out at 600 s then **passed on a 1,800 s cap (8/8, 1,146 s)**; `content-system` **timed out at 600 s and again at 1,800 s: result unknown, not passing** (it also did not finish in the audit run before these changes) |
| Django tests | **not run**: Django not installable here. New/changed Python verified only by importing `family.learning` with stubbed Django and exercising `_answer_ok`, `_authoritative`, `right` |

## Fixed
* **Build:** kernels use `digest.ts` (pure-JS SHA-256, byte-identical to `node:crypto`, tested on edge lengths/unicode). Certificate digests unchanged in Node. No new dependency.
* **Semantics (shared, not per-string):** integer accepts a zero decimal part (`5.0`; `5.5` is wrong); sets accept braces (client and server); tuples stay ordered; all four interval closures tested (only the stored closure credited; the audit's "3/40" was infinite endpoints, where closure is meaningless).
* **Unresolved:** legacy comparison returns undecided (never wrong) for unreadable input; mastery ignores it; `records.ts` honours a client "unresolved" flag only when the deterministic decision itself is undecided.
* **One authority:** `grade.ts` `decide`/`creditOf`; used by `Learn.tsx`, `StudySession.tsx`, `evidence.ts` replay, `records.ts`, review and preview screens. A test asserts no `isCorrect(` in `frontend/src/year` and no `node:` import in the grading closure. Legacy answers are labelled `source: "legacy"`.
* **Server:** attempt endpoint no longer rejects unreadable answers; it stores them undecided, and overwrites `answerCorrect`/`unresolved` from the stored answer whatever the client sends (forged "correct" or "unresolved" has no effect). Written answers stay educator-marked.

## Not changed / remaining risks
* `Unit.tsx` keeps its own comparator (`scoreCode`) on authored unit questions (not in the learning registry); it refuses unreadable input with a message and the server stores only the response. It accepts `5.0` now (client and server). Still a second grader.
* Server correctness = stored-answer comparison (Python mirror), not the TypeScript kernel; kernel verdicts are advisory. For a "held" question the server still decides from the stored answer (no held question exists in the six kernel families).
* Python/Django changes unexercised under Django; `content-system` result unknown.
* Unit/synthetic evidence only; not a production-readiness claim.
