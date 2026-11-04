# Grade 7 student dashboard entry

Base: `feat/mathematics-keyboard-dashboard-integration` at `607154614d888b847be724bd6742f23ab3f8abce`.
Branch: `feat/grade7-dashboard-entry-v1`.

My Learning Year now links to the current learner's Mathematics topics. The topic dashboard reads the saved board, grade and competency states from the existing Django-backed learner record. Its existing topic recommendation links directly to the existing diagnostic/learning module, while retaining competency details and actual review status.

“Change board or curriculum” reuses the existing curriculum-selection screen, defaulting to the current grade and academic year. Switching CBSE/NCERT ↔ Tamil Nadu appends an enrolment record, preserves historical evidence and existing goals, and does not force advancement to Grade 8. The next-year workflow is unchanged. Unknown/custom curricula remain in My Learning Year rather than silently showing the CBSE topic inventory.

Grade 7 year/learning screens and student topic tiles use the existing notebook's warm paper, ink and violet palette. No curriculum, content, engine, estimator, API, database or mastery-policy changes were made.

## Verification

- TypeScript: all three existing projects passed.
- Normal My Learning Year and curriculum-dashboard builds passed.
- Focused engine/dashboard/board-preservation regressions: **33 passed, 0 failed**.
- Existing dashboard acceptance A–N: **6 grouped tests passed, 0 failed**, against Django.
- Complete mobile Grade 7 journeys: **2 passed, 0 failed**, one each at 360px and 393px, each selecting both CBSE and Tamil Nadu, entering learning, saving an answer, refreshing and changing board in the same year.
- `git diff --check` passed. Existing assertions were not weakened.

Commands: `npm run typecheck`; `node scripts/build-year.mjs`; `node scripts/build-curriculum.mjs`; `node --import tsx --test src/year/grade7-board.test.ts src/learning/engine.test.ts src/learning/dashboard.test.ts`; `node --test e2e/grade7-entry.test.mjs`; existing `node --import tsx --test e2e/curriculum.test.mjs` against its labelled test build. The existing Actions workflow now includes the Grade 7 mobile regression after rebuilding the normal provisional-content UI.

Browser journeys use actual Django sessions, synthetic accounts, real Grade 7 curriculum releases, normal provisional-content builds and real answer/event APIs. They select both boards through the UI, compare visible topics with the compiled repository release, open a topic and learning entry, submit an answer, reload, preserve the event history and switch boards without advancing the academic year.

The evidence-preservation unit test uses the existing explicit synthetic review fixture to establish previously verified fractions evidence, then changes the Grade 7 board and confirms that verification/history remain intact. It does not approve repository content. Existing dashboard A–N uses its original test-only review fixture to exercise delayed verification and educator marking. Neither fixture is used for the new mobile screenshots or deployed.

## Actual mobile screenshots

Android-sized Chromium, not physical Android hardware. Each board/width has the existing year dashboard, the selected-board topics, the topic's learning entry and the actual diagnostic/learning screen. All are synthetic learners against Django.

| Width / board | Dashboard | Topics | Topic entry | Learning |
| --- | --- | --- | --- | --- |
| 360 / CBSE | [Image](screens/360-cbse-dashboard.png) | [Image](screens/360-cbse-topics.png) | [Image](screens/360-cbse-topic-entry.png) | [Image](screens/360-cbse-learning.png) |
| 360 / Tamil Nadu | [Image](screens/360-tn-dashboard.png) | [Image](screens/360-tn-topics.png) | [Image](screens/360-tn-topic-entry.png) | [Image](screens/360-tn-learning.png) |
| 393 / CBSE | [Image](screens/393-cbse-dashboard.png) | [Image](screens/393-cbse-topics.png) | [Image](screens/393-cbse-topic-entry.png) | [Image](screens/393-cbse-learning.png) |
| 393 / Tamil Nadu | [Image](screens/393-tn-dashboard.png) | [Image](screens/393-tn-topics.png) | [Image](screens/393-tn-topic-entry.png) | [Image](screens/393-tn-learning.png) |

## Boundaries

No new lessons or approval claims. Existing unreviewed content remains provisional; Tamil Nadu inventory limitations remain visible. Drawing-dependent tasks remain unavailable under the existing keyboard-only policy. Verified mastery still requires the existing evidence and delayed-verification rules. This connects the existing Grade 7 learning entry; it does not declare the full curriculum educator-reviewed or instructionally complete.

No merge or deployment.
