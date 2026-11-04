Correct 34 unrelated mathematics hard prerequisites while preserving historical IDs, evidence and all 49 educator-dependent proposals.

This branch is based on the accepted Grade 1–6 milestone. Graph task: adds a versioned 1.1.0 prerequisite patch that removes exactly 34 incorrect mandatory edges and adds no replacement gates. The original 200-node inventory and full proposal remain unchanged. Native registration defaults to graph 1.1.0; explicit graph 1.0.0 supports historical replay. Every intermediate graph is checked for cycles/references, and tested native histories preserve eligibility, decisions, estimates and verification. Programs and school/exam completion records are unchanged. Before/after: 200 → 166 edges; 200 IDs preserved; 40 justified roots, pending further reviewed prerequisite assignments.

Fingerprint task: reran unchanged research under Node 22/24 and documented the exact fractional-exponentiation cause. A replacement portable fingerprint is deferred: key sorting cannot fix numeric drift, while rounding/omitting fields could mask real state changes. No estimator arithmetic, evidence, legacy fingerprint algorithm or baseline was changed. Node 24's two existing fingerprint failures remain visible; Node 22 reproduces both hashes exactly.

Validation on both Node 22.18.0 and 24.19.0: 322 frontend tests passed; TypeScript/build passed; 9 mathematics browser tests passed per runtime. Shared core: 309/309 on Node 22; 307/309 on Node 24, with the two known failures. Also 166 backend tests and 9 standalone mathematics browser tests passed. CI preserves the Node 24 legacy failure as a real failed job.

Owner-only Codespaces instructions provide a complete startup/build/URL command with private port 4175 and synthetic account data. No public preview/tunnel/deployment or Codespace was created from this runner.

Review documents:
- `docs/mathematics/follow-up/README.md`
- `docs/mathematics/follow-up/GRAPH_DIFF.md` and `graph-before-after.json`
- `docs/mathematics/follow-up/FINGERPRINT_PORTABILITY.md` and `fingerprint-results.json`
- `docs/mathematics/follow-up/PRIVATE_PREVIEW.md`
- `docs/mathematics/follow-up/VALIDATION.md`

Draft only. No merge, deployment, production mastery-rule change, learner reset or curriculum expansion.
