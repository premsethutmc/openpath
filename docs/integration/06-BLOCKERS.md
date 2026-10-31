# 06 — Remaining blockers and unsupported routes

Blockers found while integrating (reported, not simulated)
1. Renderer had no multiple-choice component: `InputSpec` declared it, nothing rendered it (the numeric keypad showed instead). Added minimal `ChoiceInput`; no MathLive.
2. Renderer hard-codes teacher/completion text and the "demo" badge; added optional `teacherGuide` and `WorkingStep.badge`, `nav.skipLabel`. The other experiences (addition/fractions demo graders and prompts) remain demonstration-only and are not on the journey.
3. Renderer assumes every question has a math expression (word problems overflowed). Slice sends an empty expression for prose prompts and `QuestionPanel` hides an empty one. Long word problems are plain text only.
4. LIMITATION (not a blocker for this linear-equation journey): MathLive (typed math input) and JSXGraph (graphs) are not present in the renderer; numeric and choice input only, no equation editor, no graph/geometry interaction.
5. LIMITATION: browser geometry grading. The grader's geometry verifier needs Node child processes; the browser harness stubs `node:*`, so geometry items cannot be graded in-page (the Django server path grades them). The slice question is algebra.
6. ENVIRONMENT: the project typecheck (`npm run typecheck`) stops at `TS2688: Cannot find type definition file for 'node'`. Missing packages: `@types/node`, `@types/react`, `@types/react-dom` (not in node_modules; npm registry unreachable from this sandbox: `npm ci` ENOTFOUND, `bun install` 403). Partial check run instead: `tsc` with `types: []` over frontend/src + packages/learning/src; every M1-touched file is clean except `slice-app.tsx` `key` prop (TS2322), caused by the missing React types. Pre-existing on 2db1c44 and 5289948: unused imports `parseProblem`, `phasePool`, `problemOf` in `intervention.ts` (`noUnusedLocals`), left unchanged.
7. The renderer's "Continue" / progressive reveal use `skip_requested`; there is no dedicated "next" event in `RendererEvent`.

Unsupported routes kept unsupported
- Unregistered P2 moves (e.g. `3x+5=14 / 3x=8 / x=3` has no registered move) stay `unsupported` — never verified, never wrong.
- Restatement-only working (tr pattern) is not method evidence.
- E7 process policy: shadow only. Experimental authority is not promoted to production certification.
- Educator-marked / written items stay `pending-educator`; shown as not marked.

Product-owner decisions needed
- relabel rl-022/023/024; adopt or reject the loop's `nothingToTellApart` rule; whether `Learn.tsx` should pass `ctx.evidence` into `moduleState` (production caller currently omits it) and call `teachingHistory`.
