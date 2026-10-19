Build three interactive mathematics reference journeys and audit Grade 1–6 prerequisites on PR #55’s integrated baseline.

The existing early-grade graph contains chronological fallbacks such as money → length and long division → equivalent fractions. This change preserves all 200 historical IDs and the frozen graph, adds a proposed 92-record teaching-navigation overlay with 83 corrected prerequisite lists, and records 14 missing/refined concepts and six compound-skill issues. Official NCERT/Samacheer mapping remains unverified because both official sites returned proxy CONNECT 403.

Adds `/foundation.html` with Grade 1 objects/counting/addition, Grade 3 equal groups/arrays, and Grade 5 fraction equivalence/comparison. Each has eight fixed resumable activities, interactive exploration, teaching, worked contrasts, guided/independent/application/transfer practice and server-delayed review. Three programs contain 18 fixed provisional questions; no educator approval, mastery, exam scoring or readiness claims. Uses the existing account, pupil UUID, append-only event API and native mathematics ledger/verification gate. Old fractions receipts coexist without progress leakage. School/GRE/JEE program completion stays separate.

Validation: 318 frontend unit tests passed; 166 backend tests passed; TypeScript/build passed; 5 new foundation browser tests, 4 existing mathematics browser tests, 6 English account tests and 5 Tamil browser tests passed. Shared core: 307 passed, two known frozen E1/E2A research-baseline failures remain unchanged. No estimator, shared-core rules, JEE branch, main or PR #55 changes. No merge/deployment.

Screenshots (synthetic accounts):

[Grade 1 phone exploration](https://github.com/premsethutmc/openpath/blob/feat/grade1-6-mathematics-foundation/docs/mathematics/grade1-6/screens/grade-1-320-exploration.png)
[Grade 3 phone arrays](https://github.com/premsethutmc/openpath/blob/feat/grade1-6-mathematics-foundation/docs/mathematics/grade1-6/screens/grade-3-360-exploration.png)
[Grade 5 phone fraction bars](https://github.com/premsethutmc/openpath/blob/feat/grade1-6-mathematics-foundation/docs/mathematics/grade1-6/screens/grade-5-412-exploration.png)

Private preview: local-only combined build, port 4182 `/foundation.html`; see `docs/mathematics/grade1-6/README.md`. Keep forwarded ports private. The workflow produces a repository-access artifact; it does not deploy or enable real-child access.

Remaining: adoption/review of proposed graph corrections, verified board editions/grade mappings, educator and learner validation, more independent/retention items, accessible/localized instruction and roughly 89 additional mapped targets needing substantive lessons. Planning estimate: 178–445 author/reviewer person-days plus board audit, localisation, accessibility and separately approved learner studies. This is three reference journeys, not completed Grade 1–6 instruction.

Please keep this PR in draft and dependent on the integrated PR #55 branch. No merge or deployment is requested.
