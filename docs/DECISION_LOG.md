# Decision log

*Item H of the architecture instruction. This log records what has been
decided, what I recommend, and what only you can decide. Newest entries are
added at the end of each section, and nothing is ever deleted: a reversed
decision is marked as replaced.*

| Label | Meaning |
|---|---|
| **Agreed** | You decided or required this. |
| **Recommended** | My proposal. It waits for your approval. |
| **Open** | Needs your decision. My recommendation is given, but the choice is yours. |

---

## A. Agreed

Each entry gives the date (2026) and the source.

| # | Decision | Date and source |
|---|---|---|
| A-1 | Learners are pseudonymous: no names or birth dates in the learning record | Oct · original brief |
| A-2 | Mastery is never claimed from one interaction. Evidence must be varied and must hold over time | Oct · original brief |
| A-3 | Do not delete existing code, alter production infrastructure or incur paid costs without approval | Oct · original brief |
| A-4 | Stack: React and TypeScript, Django and DRF, PostgreSQL. React Native / Expo later | Oct · original brief |
| A-5 | Children's game setting: a small Indian town, designed so other settings can follow later | Oct · storyboard decisions |
| A-6 | Child's first-person view, with no avatar selection | Oct · storyboard decisions |
| A-7 | Handing the basket to the shopkeeper is how a shopping trip ends | Oct · storyboard decisions |
| A-8 | Amma's character design and the warm illustrated home are the current *visual reference* | Oct · motion evaluation |
| A-9 | No written instructions, reviewer controls or assessment interface in the child's view | Oct · vertical slice |
| A-10 | **One shared intelligence platform, multiple independent products**, with no single forced dashboard | Oct · master direction §2 |
| A-11 | A living, evidence-based capability profile with four stages (unassessed, struggling, demonstrated, mastered). It is never a judgement of intelligence and infers no sensitive traits | Oct · master direction §3 |
| A-12 | An LLM may assist but is never the sole authority on mastery. The platform stays independent of any one AI provider | Oct · master direction §4 |
| A-13 | Nudges are configurable, permission-based and easy to switch off. Daily use is not assumed | Oct · master direction §5 |
| A-14 | Experiences are replaceable modules. Amma's game must not shape the architecture | Oct · master direction §6 |
| A-15 | No animation-tool licences or art production at this stage. Use placeholders | Oct · master direction §6 |
| A-16 | Design for contributors, review, versioning and licensing. **No marketplace in V1** | Oct · master direction §7 |
| A-17 | No automatic cross-product sharing. Guardian consent for children. Minimise data. Keep identity apart from evidence. Export and delete. Lightweight apps | Oct · master direction §8 |
| A-18 | A modular monolith with logical module boundaries | Oct · master direction §9 |
| A-19 | First objective: prove the complete adaptive loop, using shopping as one test and a second, different experience | Oct · master direction §10 |
| A-20 | No code rewrites, purchases, major implementation commits or merges until the architecture and V1 plan are approved. This audit is a documentation-only pull request | Oct · master direction §12 |
| A-21 | **The overall architectural direction is accepted** (R-1). PR #1 may be merged into `main` after its final checks and diff are verified. *Done 12 Oct: checks rechecked, then merged.* PRs #2 and #3 are **not** merged yet | 12 Oct · decision on O-1 |
| A-22 | Commit `df50049` stays, for the prototype, provided the required consent and privacy protections are not bypassed (see `REPOSITORY_AUDIT.md` §5 for the check) | 12 Oct · decision on O-2 |
| A-23 | The second product is a small **TNPSC Group 1 practice** experience | 12 Oct · decision on O-3 |
| A-24 | Folders are restructured minimally, and only where it improves architectural boundaries. No unnecessary refactoring | 12 Oct · decision on O-11 |
| A-25 | The living capability profile is the central product. It must be **observable and explainable early** in development, not only at the end | 12 Oct · additional requirement 1 |
| A-26 | All learning experiences stay independent of the core engine | 12 Oct · additional requirement 2 |
| A-27 | Simulation results are never presented as educational effectiveness. The pretend-learner simulation tests **system behaviour, consistency and edge cases**. Actual learning improvement must be validated with real learners | 12 Oct · additional requirements 3–4 |
| A-28 | Keep the architecture simple: no premature microservices, marketplace or AI infrastructure | 12 Oct · additional requirement 5 |
| A-29 | Every milestone leaves working, tested software | 12 Oct · additional requirement 6 |
| A-30 | **No milestone starts automatically.** At the end of each milestone, the result is reported and approval is requested before the next one begins. Each milestone's scope and acceptance tests are presented for approval before it is implemented | 12 Oct · additional requirement 7 |

## B. Recommended, awaiting your approval

| # | Recommendation | Where explained |
|---|---|---|
| R-1 | ~~The platform architecture: modules, borders and the rules between them~~ **Accepted 12 Oct → A-21** | `PLATFORM_ARCHITECTURE.md` |
| R-2 | The minimum records and interfaces | `CAPABILITY_MODEL.md` §4–5 |
| R-3 | The V1 scope and milestones M0–M9. Updated 12 Oct for A-25…A-30. M0 is done; each later milestone is approved separately (A-30) | `V1_IMPLEMENTATION_PLAN.md` |
| R-4 | Keep the finer stages *developing* and *needs review* under your four stage names | `CAPABILITY_MODEL.md` §2 |
| R-5 | Treat transfer as a property of evidence for every capability, not a separate skill | `CAPABILITY_MODEL.md` §3 |
| R-6 | Confidence is an interpretable label with a stated reason, not a hidden score, in V1 | `CAPABILITY_MODEL.md` §3 |
| R-7 | Split "what next" into a general recommender plus a per-activity round generator. The shopping tables leave the platform | `REPOSITORY_AUDIT.md` §4 |
| R-8 | One learner identity per product, linked only by an explicit, revocable grant | `PLATFORM_ARCHITECTURE.md` §4 |
| R-9 | Keep the on-device engine copy for the children's app only, and for evaluation only | `REPOSITORY_AUDIT.md` §4 |
| R-10 | Park Amma's home scene (PRs #2 and #3) as the visual reference. Do not extend its custom art pipeline | `PLATFORM_ARCHITECTURE.md` §6 |
| R-11 | M1 scope and acceptance tests | [`milestones/M1_CAPABILITY_REGISTRY.md`](milestones/M1_CAPABILITY_REGISTRY.md) |

## C. Open: decisions for you

Each entry gives the options and my recommendation. Decided entries stay here
for the record, with the outcome beside the title.

**Still open:** O-4, O-5, O-6, O-7, O-8, O-9, O-10, O-12, O-13, O-14.

**O-1 · What happens to the three open pull requests?** — ✅ **Decided 12 Oct: (a), after verification → A-21.**

- **Options:**
  - (a) Merge PR #1 into `main` now, and keep PRs #2 and #3 open and parked.
  - (b) Merge all three.
  - (c) Merge nothing until M1 is ready.
- **Recommendation: (a).** PR #1 is the platform seed, passes all CI checks,
  and every later milestone builds on it. PRs #2 and #3 are a visual reference
  that V1 does not need.

**O-2 · Keep or revert commit `df50049` on PR #1?** — ✅ **Decided 12 Oct: keep, provided consent is not bypassed → A-22.**

- **What the commit does:**
  - The children's app opens straight into the game, with no start form.
  - Consent moves to the grown-ups' area and gates only server storage. Play
    stays on the device until then.
  - It keeps one kind of fruit per trip until counting looks secure.
- **Recommendation: keep.** It matches A-9 and does not weaken consent.

**O-3 · Which second test experience?** — ✅ **Decided 12 Oct: (a) TNPSC Group 1 practice → A-23.**

- **Options:**
  - (a) Exam-style practice: a small TNPSC Group 1 sample unit.
  - (b) A small Spanish vocabulary and phrase activity.
- **Recommendation: (a).** It differs from the children's game on every axis
  and is the seed of a product you have named. Spanish is pulled quickly
  toward speech and AI, which are deferred.

**O-4 · Who provides and checks the second experience's content?**

- **Options:**
  - (a) I write 25–40 sample items marked *unreviewed*, used for testing only.
  - (b) You or a subject expert supply them.
- **Recommendation: (a) for building, then (b) before any real learner uses
  them.**

**O-5 · Sign-in for V1**

- **Options:**
  - (a) E-mail and password, using Django's built-in accounts. No cost.
  - (b) E-mail one-time links. Needs an e-mail sending service.
  - (c) Phone and SMS codes. SMS costs money.
- **Recommendation: (a) for V1.** Revisit before a wider launch. Options (b)
  and (c) need your cost approval.

**O-6 · Words learners and guardians see for each stage**

- **Context:** "Struggling" is accurate for internal use but harsh on screen.
- **Recommendation:** children see no stages at all. Guardians and adults see
  gentler wording:
  - "Not tried yet"
  - "Getting started"
  - "Growing"
  - "Shown"
  - "Mastered"
  - "Time for a refresh"

  You choose the final wording.

**O-7 · Mastery thresholds for adult or exam frameworks**

- **Context:** the children's policy is 3 successes, 2 contexts and a 3-day
  gap.
- **Recommendation:** for the exam sample, at least 4 unaided correct answers
  across 2 different phrasings, in 2 sessions at least 7 days apart, with 75%
  recent accuracy.
- These are data, not code, and easy to change after the try-out.

**O-8 · Must the children's app work offline?**

- **Context:** it does today, which is why there are two engine copies.
- **Options:**
  - (a) Keep offline play.
  - (b) Require a connection and drop the device engine.
- **Recommendation: (a)** if your target families have unreliable connections.
  Otherwise (b) is simpler.

**O-9 · AI in V1?**

- **Recommendation:** no AI in the V1 loop. Write the adapter contract only.
  The first AI use, later, would be drafting practice items for human review.
  Provider choice and any cost come to you then.

**O-10 · Legal review before real children's data**

- **Context:** India's Digital Personal Data Protection Act (2023) and its
  rules set specific duties for children's data, including verifiable parental
  consent.
- **Recommendation:** no real children's data on a server until a lawyer has
  reviewed the consent flow. Device-only play is unaffected.

**O-11 · May I reorganise folders?** — ✅ **Decided 12 Oct: minimal, only where it improves boundaries → A-24.**

- **What it involves:** moving `frontend/` → `apps/kids-web/` and `game/` →
  `apps/kids-game/`, and splitting backend apps into the modules. Moves only,
  with no deleted logic, each in its own reviewed pull request.
- **Recommendation: yes,** at M0 (folders) and M1–M5 (backend modules).

**O-12 · Hosting for the try-out**

- **Context:** any hosting costs money or needs an account.
- **Recommendation:** decide at M7. Until then everything runs locally, and you
  get recordings and self-contained files. I will bring options with costs.

**O-13 · The small try-out**

- **Questions:** who takes part (e.g. 5–10 adults for the practice app), for
  how long, and whether children take part after O-10.
- **Recommendation:** adults first.

**O-14 · Account model across products**

- **Options:**
  - (a) One account per person, which can enrol in several products, each with
    its own learner identity.
  - (b) A completely separate account per product.
- **Recommendation: (a).** It keeps evidence separate (R-8) without making
  people sign up twice, and preserves both standalone and bundled futures.
