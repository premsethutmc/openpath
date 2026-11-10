# Grade 3 tally teaching review — 2026-11-10

Reviewed the lesson ourselves and implemented verified corrections on draft PR #123, starting from remote `a24b591`. This is an AI content/code review, not external educator approval or a claim that children have trialled the lesson. No named external reviewer is assigned. Waiting for one is not a prerequisite for this correction pass.

## Findings and corrections

- **Wrong row identity:** the empty Games question rendered a Books row. Row labels now live beside each question's tally counts and render consistently in the table and accessible SVG name.
- **Irrelevant feedback:** reading and zero questions reused difference feedback. Each question now has a relevant hint, solution and common-error explanation. Zero explains that the category label is not a mark; reading explains groups of five; comparison distinguishes a difference from a total.
- **Tie wording:** the question referred to a “larger row” even when both counts were ten. Both the app and draft family now describe equal counts without inventing a larger row.
- **Explanatory clarity:** corrected singular grammar, explained frequency in familiar language, gave a concrete five-book recording task, and completed the 13-versus-8 worked example with pairing and subtraction.
- **Mobile visuals:** removed forced within-word wrapping and fixed table layout. Natural-width label cells, shorter recording labels and explicit column-header scopes replace the earlier cramped layout. Screenshot inspection then exposed needless shrinking of short tally rows and the zero label; SVG width now follows its number of groups, with a 120px minimum, rather than always reserving 330px. A browser regression requires the zero label to render at least 14px high.
- **Review language:** removed the repeated learner-facing “educator review pending” banner. The lesson still says it is draft practice and that completion is not mastery or full curriculum coverage. Provenance still explicitly states no external educator review.

## Mathematical and evidence checks

Independently counted rendered strokes for all 21 quantities from 0 to 20 and checked all 441 ordered row pairs by pairing/unpaired marks. Four uprights plus the crossing mark are exactly five; adding/undoing across that boundary, zero, ties and reversed rows are covered. The six app answers remain 6, 14, 0, 5, 0 and 19. No numeric answer, question ID, receipt version, grading policy, existing learner data, release mapping or mastery threshold changed. The trusted grader was rebuilt from its sources to keep its integrity manifest current after wording changes.

New tests verify every question's labels against its prompt, count its actual SVG strokes against the answer, check singular grammar and relevant feedback, and verify semantic column headers. The existing account browser journey now also checks 320px, 360px and 900px, within-word wrapping, the Games SVG label and zero-specific feedback. Its additional initial wrong zero answer is unassisted practice, not independent evidence; expected replay is 4 assisted and 3 unassisted responses with 0 independent evidence.

## Verification and limits

- Local focused frontend tests: 12 pass. Intake/model/parser tests: 33 pass. Backend foundation tests: 8 pass using an isolated test database.
- Full `npm run typecheck` passes with a 4 GB Node heap; foundation app build and standalone tally preview build pass. The full frontend test run was interrupted after a concurrent typecheck was killed with exit 137; typecheck was then rerun alone successfully. The complete test suite remains for CI, not a local full-pass claim.
- Local Chromium launch was attempted and stopped before any page ran: `socket() failed: Operation not permitted (1)`. Browser verification runs in CI, not locally.
- Initial correction commit `d379968` passed [tally run 42775558505](https://github.com/premsethutmc/openpath/actions/runs/42775558505): 12 frontend tests, 8 backend tests, build and all 8 Chromium journeys, including tally at 320/360/900px. Four teaching/recording/practice screenshots were inspected. Artifact 13744106271 has SHA-256 `5b513276d0997f0d73b1631e00f4c25c88048d8a31b9c45150c70265442398d0` and expires November 17. These screenshots identified the short-row scaling issue corrected in the follow-up. Fresh browser results for that final sizing correction are pending at publication; the earlier pass is not claimed for it.
- No new model API calls in the deterministic tests/builds; the review itself used session tokens.

This pass is deliberately bounded. It does not add a real survey/category-collection activity, a complete table-building assessment, broad randomized transfer, Tamil content, full screen-reader/WCAG testing, classroom efficacy evidence, or complete TN coverage. Those are concrete future work, not an anonymous educator dependency. Other branches, including Claude's #124, remain untouched. No merge or deployment.
