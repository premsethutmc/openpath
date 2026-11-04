# 11. Prioritised gaps

| P | Gap | Class | Why it matters | Smallest next step (not done here) |
|---|---|---|---|---|
| P1 | Geometry working is not verifiable by the trusted grader: the geometry authority is an async Python worker; the server grader is a synchronous bundle; `working-assessment@1` knows only equation statements | ARCHITECTURAL GAP | numeric answers are the only geometry evidence; proof competence cannot be recorded | define a domain-dispatched, server-side working authority interface (async-capable) and a geometry statement contract; record its verdicts with authority id |
| P1 | Reasoner returns `invalid` for valid proofs outside its rule set or route (R06, R07) | authority defect | if connected, valid alternative proofs would count against learners | out-of-rule-set citation → `unsupported`; vertical-opposite should carry measures |
| P1 | Projection does not check which authority produced a working verdict | contract gap | a verdict from an unsuitable authority could become method evidence | add an authority/domain match to the trusted-working filter |
| P2 | Competency-level mastery leaks across sub-skills (G-03; one side-inequality answer suffices for transfer) | ARCHITECTURAL GAP (shared, not geometry-specific) | "transfer" overstates exterior-angle competence | a decision on sub-skill-aware mastery policy (not activated here) |
| P2 | Module item coverage: triangle-properties diagnostics sample only `ahtri`; angle-pairs has one open crossing-lines item. Exterior-angle and vertically-opposite misconceptions are never re-tested or taught | content/configuration | G-03 needs remediation the engine never offers | module diagnostics covering each core sub-skill |
| P2 | No misconception-specific geometry explanations (module strategies are generic; G-03, G-06 end untaught) | MISSING DOMAIN CAPABILITY | misconceptions are diagnosed but cannot be taught | author and review `fix_*` explanations for `opposite-as-linear`, `third-interior`, `added` |
| P3 | Bare final claims are `verified` by the reasoner (R02); R10 false step only `unsupported` | authority behaviour | must not be method evidence | mark entailment-only verdicts as answer-level |
| P3 | No exterior-angle rule in the reasoner (R07) | MISSING DOMAIN CAPABILITY | the core theorem of the target competency cannot be cited | add rule with soundness tests |
| P3 | No multi-step or "angles around a point" generator; `afcross` mixes three relationships in one family | MISSING DOMAIN CAPABILITY | finer evidence impossible | split families or expose mode to the projection |
| P3 | Isosceles / side-inequality never sampled at delayed check | inherited design | per-sub-skill retention never resolves | sample delayed checks per core sub-skill |
| P3 | No angle-diagram renderer (unverified in browser) | frontend | geometry relies on text prompts | — |
