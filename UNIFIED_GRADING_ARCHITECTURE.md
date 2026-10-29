# OpenPath — Unified Grading Architecture (Phase B specification)

Status: **proposal for review**. Branch `feat/unified-grading`, based on Phase A `1b4e73a`. Specification only: no production grading
code is changed by this document. Evidence for every defect cited (D01–D16) is in `MATH_CURRICULUM_GRADING_AUDIT_REPORT.md`.

## 0. Approved policy (2026-10-29) and what it means here

| # | Decision | Normative rule in this design |
|---|---|---|
| P1 | Unreadable input → `unresolved` | reason `unresolved.invalid-response`; no credit, no mastery effect, **no attempt consumed, never counted as incorrect**; the raw response is kept; abuse is handled by request rate limits, not by assessment (removes `UNRESOLVED_CAP`, D16) |
| P2 | Forms enforced only when required | a form rule exists only if the **contract** declares it **and** the question's own instruction states it; an equal answer with no applicable rule is `correct`; a form the system cannot judge is `unresolved.form-undeterminable` |
| P3 | Ambiguous input → clarification | the parser reports every reading; two readings that differ → `unresolved.ambiguous` with a clarification prompt; never credit, never penalty; the accepted syntax is published to students (§4.4) |
| P4 | 951 held `:w` presentations excluded | quarantine is a first-class status; nothing quarantined is selectable by any route; definitions and records are kept (§8) |

Overriding principle from Phase A: **a "verified" label is not evidence**. Authority comes from a *certification* of a specific
(answer semantics × parser version × verifier version × form rules) combination, backed by independent oracle evidence (§6).

## 1. Current state this design replaces

```
browser: grade.ts decide() ─┬─ contractFor() → kernel (assessAnswerFirst / typed-contract readers)
                            └─ legacy isCorrect() (content.ts canonical / sampled)       ← also fed INTO the kernel decision (D10)
server : learning._authoritative ─┬─ kernel_grader → node grader.mjs → gradeRequest()  (no legacy input)  (D10)
                                  └─ Python mirror right()  (different readers; also the silent fallback) (D01, D12)
replay : app evidence.ts creditOf() and server credited() RECOMPUTE with today's code (D11)
programs: packages/mathematics scoreCode() — client only, boolean, no unresolved, never server-graded (D14)
selection: pool / phasePool / library drawer / probes / recovery / compiled library.v1.json — no status check (D09)
```

Five readers of the same text exist today (TS legacy, TS exact checker, TS typed-contract readers, Python mirror, scoreCode). D01,
D02, D04, D05, D06 are all disagreements or defects in these readers. The core of this design is therefore **one parser, one
dispatcher, one decision record**, with the existing kernels kept as verifiers behind it.

## 2. Architecture overview

```
                 trusted question definition (generator / authored item / program item)
                                     │  structured parameters only (never rendered text)
                                     ▼
                      ┌──────────────────────────────┐
                      │ Contract builder  (§3)        │──► contract-status registry (§8): certified / provisional /
                      │  openpath-assessment@2        │       quarantined / educator   (+ reason, evidence)
                      └──────────────┬───────────────┘
 response text ──► Strict parser (§4) ──► Parsed | Invalid | Ambiguous
                                     │
                                     ▼
                      Dispatcher (§5): pick the least complex CERTIFIED verifier (§6) for the contract
                                     │                         │
                      Verifier: correct / incorrect /     no certified verifier, verifier failure,
                      unsupported  + form check (§4.3)    status not certified → unresolved.<reason>
                                     ▼
                      GradingDecision  grading-decision@1 (§7)  ← the only verdict format anywhere
                                     │
              browser: preview only (same bundle)      server: authoritative, recorded once, immutable
                                     ▼
                      Mastery / replay reads recorded decisions only (§9)
```

One TypeScript module set (`packages/learning/src/grading/`) implements contract, parser, dispatcher and decision. The browser
imports it; the server runs the **same code** as the integrity-checked bundle (`grader.mjs`, as today). Python no longer grades:
it validates request shape, calls the bundle, validates the reply, stores the decision.

## 3. Assessment contract `openpath-assessment@2`

```ts
interface AssessmentContractV2 {
  schema: "openpath-assessment@2";
  questionId: string;                       // gen:<fam>:<params>[:mc|:w], authored id, or program:<program>:<item>
  contractHash: string;                     // sha256 of the canonical JSON of every field below
  builder: { id: "contract-builder"; version: string };   // the code that built it
  source: { kind: "generator" | "authored" | "program"; family?: string; params?: number[]; definitionHash: string };
  semantics: AnswerSemantics;               // §3.1 — what an acceptable answer MEANS
  expected: TypedValue;                     // the answer as a typed object built from parameters (not a display string)
  expectedDisplay: string;                  // what the student is shown in solutions (presentation only)
  domain: { variables: { name: string; set: "R" | "C" | "Z" | "N" | "Q"; restrictions: string[] }[] };
  form: FormRule[];                         // §3.2 — empty unless declared AND stated in the instruction
  tolerance: null | { kind: "absolute" | "relative" | "decimal-places" | "significant-figures"; value: number };  // only when the question states rounding
  units: null | { expected: string; required: boolean };
  mode: "answer-only" | "method-required" | "educator";
  method?: { contributes: "none" | "required" | "partial"; rubric: string };       // §10
  options?: { label: "A" | "B" | "C" | "D"; value: TypedValue }[];                 // choice: options are typed values too
  keyAuthority: "independent-kernel" | "generator-only" | "educator-reviewed";     // whether the expected value itself is independently established
}
```

### 3.1 Answer semantics (only what the curriculum uses — inventory in `data/inventory.json`)

| `semantics.kind` | Meaning | Families today (answer types) |
|---|---|---|
| `choice` | one option label; option values typed | choice (169 + all `:mc`) |
| `rational` | one exact rational (integer is a rational with `integer: true`) | integer 411, fraction 151, mixed 7 |
| `exact-real` | one exact real over ℚ(√n, π) | exact (numeric) |
| `polynomial-expr` | polynomial / rational expression in named variables, equal as functions on the domain | exact (symbolic), polynomial |
| `function-expr` | general expression (trig, exp, log, inverse trig), equal on the domain | expression 31 |
| `antiderivative` | expression whose derivative equals the integrand on the domain; constant optional unless a form rule requires it | antiderivative 10 |
| `solution-set` | unordered set of exact values (`multiset: true` for roots with multiplicity) | set 27, roots 5 |
| `tuple` | ordered tuple of exact values (coordinates, vectors, ordered lists) | tuple 110 |
| `matrix` | r × c matrix of exact values | matrix 12 |
| `real-subset` | subset of ℝ: intervals, unions, inequalities | interval 16 |
| `ratio` | positive ratio a : b | ratio 3 |
| `educator` | free response, marked by a person | written |

Not added (no released question needs it): proof checking, geometric constructions, units arithmetic, statistics with tolerance
beyond stated rounding. A future need is added as a new kind with its own certification (§6), never folded into an existing one.

### 3.2 Form rules

```ts
type FormRule =
  | { rule: "lowest-terms" } | { rule: "mixed-number" } | { rule: "improper-fraction" } | { rule: "decimal"; places?: number }
  | { rule: "simplest-surd" } | { rule: "expanded" } | { rule: "factorised" } | { rule: "interval-notation" }
  | { rule: "inequality-notation" } | { rule: "in-terms-of-pi" } | { rule: "ordered"; by: "ascending" | "descending" | "given" }
  | { rule: "ratio-simplest" } | { rule: "constant-of-integration" };
// each carries: instruction: string  — the exact phrase in the question that states it (P2 "supported by the instructions")
```

Rules come from the **generator definition** (`def.contract.form`), never from parsing rendered text at grading time. Migration
(§11 step C3) proposes per-family rules from the Phase A prompt scan (`formRulesInPrompts` in the inventory); a person reviews them,
they are written into the family definitions, and the builder then checks that each rule's `instruction` phrase occurs in the
prompt. A declared rule not stated in the prompt, or a prompt instruction with no declared rule, is a **contract inconsistency**
(§8). Each rule has a predicate implemented per semantics kind; a rule without a predicate for that kind makes the form
**undeterminable** → `unresolved.form-undeterminable` (P2), and the certification registry shows it.

### 3.3 Versioning and compatibility

- `schema` changes only for structural changes; readers accept @1 records (history) and write @2.
- `contractHash` identifies one contract exactly. Any change to the generator, its parameters, the builder, semantics, expected
  value, domain or form rules changes the hash. Decisions reference the hash, so a decision is always interpretable against the
  contract it was made under.
- A contract-builder release that changes the hash of a **released** question is a content change: it goes through the release gate
  (§12) with an old/new comparison, and never alters existing decisions (§9).

## 4. Strict response parser

One parser (`grading/parse.ts`), one grammar per semantics kind, bundled into the server grader. Output:

```ts
type ParseResult =
  | { status: "parsed"; value: TypedValue; canonicalText: string; notation: NotationFacts }   // facts used by form predicates
  | { status: "invalid"; reason: "empty" | "syntax" | "trailing-operator" | "split-number" | "unbalanced" | "division-by-zero"
                         | "type-mismatch" | "no-such-option" | "too-long" | "unsupported-notation"; at?: number }
  | { status: "ambiguous"; readings: TypedValue[]; texts: string[] };                         // ≥2 readings with different values
```

### 4.1 Invariants (each has a property test, §12)

1. **Total consumption**: every input character is consumed by the grammar; nothing is skipped, trimmed (except outer whitespace)
   or deleted. Fixes D02 (`177147 +` → `invalid.trailing-operator`).
2. **No digit joining**: whitespace is a token separator and is never removed before tokenising. Two numerals separated by space
   are never one number (`17714 7`, `√2 2` → `invalid.split-number`). The only construct that places numerals side by side is the
   mixed number `w n/d` (with `0 < n < d`), accepted only where `semantics` is `rational`/`exact-real` and parsed as `w + n/d`
   (fixes D06: `40 1/2` = 81/2).
3. **No operator dropping**: a binary operator without a right operand is `invalid`, never ignored.
4. **No guessing of grouping**: a construct with two standard readings yields `ambiguous` (§4.2).
5. **Same result everywhere**: browser preview and server use the same bundle; property tests run it against the oracle.
6. **Explicit `+` sign** on a number is accepted (`+5`), ASCII spellings are accepted (`sqrt(22)`, `pi`, `oo`, `tan^-1`, `<=`),
   unicode is accepted (`√`, `π`, `∞`, `⁻¹`, `≤`, `−`) — fixes D04, D05.
7. **Domain-invalid values** (`1/0`, `log(-1)` as a value) → `invalid.division-by-zero` / `invalid.syntax`, i.e. unresolved (D01).
8. **Closed brackets at ±∞** → `invalid.syntax` (D03).

### 4.2 Ambiguity rules (P3)

| Text | Readings | Result |
|---|---|---|
| `1/2x`, `−1/8x`, `3/4y` | (1/2)·x and 1/(2x) | `ambiguous` unless both readings are equal |
| `2^3x`, `e^2x` | (2^3)·x and 2^(3x) | `ambiguous` |
| `sin 2x cos x` without brackets | accepted: function applied to the following monomial (documented convention) | parsed |
| `sin x^2` | sin(x²) and (sin x)² | `ambiguous` |
| `log 2x` | log(2x) | parsed (convention) |
| `a b/c` in a rational answer | mixed number | parsed (convention); in an expression answer → `ambiguous` |
| `1,234` in a number answer | one thousand two hundred thirty-four, or the list 1, 234 | `ambiguous` for `rational`; list for `solution-set`/`tuple` |

Every convention row is a published rule (§4.4) and a fixture.

### 4.3 Form predicates

Form is judged on `NotationFacts` (what was written: numerator/denominator, whether a mixed number, decimal places, whether
brackets/products remain, radicand square-free, interval vs inequality notation, element order), never by re-rendering. Each
(form rule × semantics) pair is either implemented and fixture-tested, or `undeterminable`.

### 4.4 Accepted syntax shown to students

The student interface shows, per semantics kind, a short "how to type it" panel generated from the grammar's own examples
(`grading/syntax-examples.ts`, also the parser's fixture list), e.g. rational: `7`, `-3/4`, `2 1/2`, `0.75`; exact: `3√2` or
`3sqrt(2)`, `π/6` or `pi/6`; expression: write `x/2` or `(1/2)x`, not `1/2x`; intervals: `(-∞, 3]` or `(-oo, 3]` or `x <= 3`.
An `ambiguous` result shows the readings as choices ("Did you mean x/2 or 1/(2x)?"); the choice is a new submission graded
normally.

## 5. Dispatcher and verdict

```ts
function grade(contract: AssessmentContractV2, status: ContractStatus, sub: { response: string; working?: string[] },
               env: { certifications: CertificationRegistry; clock: () => string }): GradingDecision
```

Order of evaluation (first match decides):

1. `status` is `quarantined` → `unresolved.quarantined` (no parse needed). `educator` → `pending-educator` (§10).
2. Parse (§4). `invalid` → `unresolved.invalid-response`; `ambiguous` → `unresolved.ambiguous` with clarification.
3. Select verifier: the **least complex certified** verifier for `(semantics.kind, parser.version, form rules)` (§6). None →
   `unresolved.unsupported`.
4. Verify value: `correct` / `incorrect` / `unsupported` (→ `unresolved.unsupported`). A thrown error or timeout →
   `unresolved.infrastructure` (never incorrect).
5. If value is equal and the contract has form rules: each predicate → satisfied / violated / undeterminable. Violated →
   `incorrect.required-form` (with the rule's instruction text as feedback); undeterminable → `unresolved.form-undeterminable`.
6. Tolerance and units, when the contract declares them, are part of the value check of the certified verifier.

Verifier ladder (existing code kept as adapters, in increasing complexity):

| Verifier | Semantics | Backed by (existing) |
|---|---|---|
| `choice-label@1` | choice | option comparison |
| `rational-exact@1` | rational | exact `Rational` (`math-kernel.ts`) |
| `exact-real@1` | exact-real | `answer-types.ts exact()` canonical form over ℚ(√n, π) |
| `structure@1` | solution-set, tuple, matrix, ratio, real-subset | element-wise over the above |
| `typed-kernel@1` | values the generator supplies as typed objects (linear algebra, B1, M2, complex) | `typed-contract.ts` kernels — **receives parsed values; its own text readers are retired** (D02, D06) |
| `exact-solution@1` | var / set contracts from equations | `assessAnswerFirst` |
| `symbolic@1` | polynomial-expr, function-expr, antiderivative | `answer-types.ts` sampling + exact polynomial; certification per kind (§6) |
| educator | educator | written marks |

The verifier result never depends on any other verifier's opinion: the current pattern of feeding the legacy comparison into the
kernel decision (`legacyCorrect`, the "disagreement" state) is removed (D10). Disagreement between verifiers is a **certification**
concern measured offline (shadow mode, §11), not a runtime state.

## 6. Certification

A verifier is authoritative for a contract only through a certification:

```ts
interface Certification {
  id: string;                            // e.g. "rational-exact@1/parser@1/forms:lowest-terms"
  semantics: AnswerSemantics["kind"]; verifier: string; parser: string; forms: FormRule["rule"][];
  evidence: { auditRun: string; families: number; questions: number; cases: number; falseAcceptance: 0; falseRejection: 0;
              fixtures: string[]; oracle: "grading-oracle@N" };
  scope: { families: string[] } | "all";  // families whose sampled audit passed
  certifiedAt: string; approvedBy: string;
}
```

Rules:
- Certification requires **zero** false acceptances and zero false rejections on the independent audit for every family in scope,
  plus the fixture suite, plus the parser property tests. It is per family scope, so one family's defect cannot be hidden by others.
- `keyAuthority` is reported alongside, never conflated: a certified verifier judging against a `generator-only` key is "grading
  certified, key not independently established" (303,455 typed questions today).
- **Provisional** status (migration only): a family with no certification is graded by the unified path with the best available
  verifier, the decision carries `certified: false`, and reporting counts it separately. Whether provisional decisions may feed
  mastery is a flag (`OPENPATH_PROVISIONAL_CREDIT`, default on during migration to preserve the learning workflow; turning it off
  makes uncertified → unresolved). It is the product owner's call when to turn it off; it is never silently on in reports.
- The registry is a versioned JSON file (`content/learning/grading-certifications.v1.json`), hashed into the grader manifest, so the
  server cannot grade under a registry different from the one reviewed.

## 7. Grading decision `grading-decision@1` (the only verdict format)

```ts
interface GradingDecision {
  schema: "grading-decision@1";
  decisionId: string;                       // uuid; one per graded submission
  attemptId: string;                        // the learner record it decides
  questionId: string; contractHash: string; contractSchema: "openpath-assessment@2";
  policy: "grading-policy@1";               // the rules in §0/§5 (changes only with an approved policy change)
  grader: { bundleSha256: string; parser: string; verifier: string | null; certification: string | null; registryHash: string };
  decidedBy: "server" | "client-preview";   // only "server" decisions are stored as authoritative
  decidedAt: string;
  response: { raw: string; working: string[] };
  interpretation: null | { canonicalText: string; readings?: string[] };   // what the parser read
  verdict: "correct" | "incorrect" | "unresolved";
  reason: ReasonCode;
  certified: boolean;                        // false = provisional (§6)
  form: { rule: string; result: "satisfied" | "violated" | "undeterminable" }[];
  method: { examined: boolean; verified: boolean; contributes: "none" | "required" | "partial"; result: null | "valid" | "invalid" | "unverified" };
  diagnosis: null | { firstError: { transition: number; from: string; to: string; kind: string; explanation: string } };
  feedback: { kind: "correct" | "incorrect" | "clarify" | "pending" | "educator"; message: string; clarification?: string };
  ms: number;
}
type ReasonCode =
  | "correct.equal" | "correct.equal-within-tolerance"
  | "incorrect.value" | "incorrect.required-form" | "incorrect.missing-elements" | "incorrect.extra-elements"
  | "unresolved.invalid-response" | "unresolved.ambiguous" | "unresolved.unsupported" | "unresolved.form-undeterminable"
  | "unresolved.infrastructure" | "unresolved.contract-inconsistency" | "unresolved.quarantined" | "pending-educator";
```

The five conditions the brief requires to stay distinct map one-to-one: unsupported capability → `unresolved.unsupported`;
invalid response → `unresolved.invalid-response`; ambiguity → `unresolved.ambiguous`; verifier failure →
`unresolved.infrastructure`; contract inconsistency → `unresolved.contract-inconsistency` (and the question is quarantined, §8).

Effects (single table used by app and server):

| verdict | answer credit | mastery input | attempt consumed | stored |
|---|---|---|---|---|
| correct | yes | yes | yes | yes |
| incorrect | no | yes (as not-correct) | yes | yes |
| unresolved (any reason) | no | **none** | **no** (P1; `UNRESOLVED_CAP` removed, D16) | yes, with raw response |
| pending-educator | when marked | when marked | yes | yes |

## 8. Quarantine and question status

`content/learning/question-status.v1.json` (versioned, hashed into the manifest):

```json
{ "schema": "question-status@1", "entries": [
  { "match": { "family": "adexp", "form": "w" }, "status": "quarantined", "reason": "contract-inconsistency",
    "detail": "contract number guard: word prompt states 9 × 1000, statement uses 9000", "since": "2026-10-29", "evidence": "audit D09" } ] }
```

Statuses: `certified` (all decisions certified), `provisional`, `quarantined`, `educator`. Status is computed by
`questionStatus(qid)` = registry entry ∪ contract builder result (a `held` contract is quarantined automatically, so a new
inconsistency can never be served while waiting for someone to update the file).

**One gate, every route.** `selectable(qid): boolean` in `families.ts` is the only test; every selector calls it:

| Route (inventory) | File | Change |
|---|---|---|
| release pool, phase pools | `families.ts pool / phasePool / inPool` | filter by `selectable` |
| module drawer (typed / mc / **word**) | `library.ts drawer.take` | skip non-selectable; the word form is where the 951 enter |
| compiled synthesised modules | `content/learning/library.v1.json` (3 quarantined ids today) | validated at load: a non-selectable id is removed from the phase list and reported; release build fails if any remain |
| guided / practice / transfer / retention picks | `library.ts` (`take`, `pred` picks), `intervention.ts fromPool` | via `phasePool` |
| misconception probes | `library.ts` probes, `intervention.ts nextProbe` | filter |
| recovery / investigate variants | `intervention.ts recovery`, `families.ts variantsOf`, `reasoning.ts` | filter |
| study sessions, year plan, revision | `session.ts`, `frontend/src/year/*` (draw through the above) | covered by the route test |
| previews / review screens | `frontend/src/curriculum/*`, `review/Main.tsx` | show status badge; not a learner route |
| server acceptance | `learning.checked_learning` | an attempt on a quarantined question is stored with `unresolved.quarantined`; never credited (fixes the D09 server credit) |

Route-coverage test (gate): enumerate every exported selector, run it over all modules × phases × forms with the real registry,
and assert no quarantined id is ever returned; a new selector that bypasses `selectable` fails the "selectors are registered" test
(same technique as the existing "only session.ts and records.ts build attempt records" test). Releasing a question from quarantine
requires: the defect fixed in the generator/contract, the family re-audited with zero findings, and an entry removal reviewed in
the PR. Definitions and historical records are never deleted.

## 9. Immutable decisions and replay

- The server stores the `GradingDecision` inside the append-only `PupilEvent` (already immutable by `save()`), keyed by `attemptId`.
- **Replay = read decisions.** App `evidence.ts`/`records.ts` and server `independent_at` use `decision.verdict` only; `creditOf()`
  and `credited()` stop recomputing (D11). The client keeps its preview decision only until the server's decision arrives; the
  server's replaces it in the local store.
- **Historical records** (assessment@1 or none): a one-time, versioned migration job writes a `reconstructed` decision per old
  attempt, using the grader that was current when it ran (`grader.bundleSha256` recorded, `decidedBy: "server"`,
  `reason` as computed, plus `reconstructed: true`). It is run once, reviewed (count of verdict changes versus the old
  `credited()` result, every change listed), and never re-run silently.
- **Regrading** never mutates. A regrade writes a new decision `supersedes: <decisionId>` with `regrade: { reason, approvedBy }`.
  Allowed automatically only for `unresolved.infrastructure` (a later successful grade of the same submission). Any other regrade
  (a fixed defect, a corrected key) is a reviewed batch with a before/after report. Replay uses the latest non-superseded decision
  and can reproduce any historical state by ignoring decisions after a date.

## 10. Final answer and method

- `answer-only` (every released generated question today): answer credit comes from §5 alone; working is read only for
  diagnosis after `incorrect`; `method.examined` records whether it was read; `method.verified` is true only if a step checker
  actually ran and validated every step; working can never change `verdict`.
- `method-required`: the contract states `method.contributes` and a rubric; the decision keeps `verdict` (final answer) and
  `method.result` separate; any combined score is computed by the consumer from both, by the contract's rule.
- `educator`: decision `pending-educator`, finalised by an educator mark event that references the decision.
- No AI fallback grades. The existing `assessment-fallback.ts` remains a proposal-only interface (unchanged).

## 11. Failure semantics (server)

| Condition | Today | Unified |
|---|---|---|
| Node missing / bundle tampered / manifest mismatch / `OPENPATH_GRADER=off` | Python mirror grades, labelled legacy (D12) | `unresolved.infrastructure`; alert; automatic regrade when the grader is healthy |
| Grader timeout / crash / malformed reply | same | same as above |
| Stored-answer parity mismatch (Django table vs contract) | grader ignored, mirror grades | `unresolved.contract-inconsistency`; question auto-quarantined; alert |
| Contract builder throws | legacy | `unresolved.contract-inconsistency` |
| Request shape invalid (not an answer field at all) | 400 | 400 (unchanged: this is a malformed API call, not a learner answer) |
| Unreadable learner answer | mixed: 400 / unresolved / incorrect | `unresolved.invalid-response`, stored (P1); per-learner rate limit on submissions |

No fallback issues a definitive verdict. The Python mirror (`learning.right`, `answer_types.py`) is retained read-only for the
historical-reconstruction comparison report and then removed from the grading path.

Performance (only after correctness, per the brief): the per-request Node process (~460 ms) is kept for C-phase; a persistent
worker is a later, separate change measured against the same decision fixtures.

## 12. Test gates

| Gate | Content | Blocks |
|---|---|---|
| G1 parser properties | for every semantics kind: total consumption, no digit joining, no operator dropping (fuzz: insert/delete spaces and operators into stored answers; the result is either equal-to-intended or invalid/ambiguous, never a different accepted value); syntax-example fixtures | any parser change |
| G2 phase A fixtures | `grading-audit-regressions.test.ts`, `test_grading_regressions.py` — each `test.failing`/`expectedFailure` is flipped to a passing test in the change that fixes it; none is deleted or loosened | every commit |
| G3 decision parity | the same bundle in the browser path and the server path gives byte-identical decisions (minus ids/time) on the full audit candidate set (308k cases) | grading changes |
| G4 independent audit | `tools/mathematics/grading-audit/run-audit.sh` on the unified path: 0 false acceptance, 0 false rejection, 0 invalid-marked-incorrect, 0 ambiguity credited, per family in a certification's scope | certification, release |
| G5 shadow comparison | old vs unified decisions over the corpus; every difference classified (fix / policy / defect) before switching authority | flag flip to `unified` |
| G6 quarantine routes | the route-coverage test of §8 | every commit |
| G7 Django integration | full `manage.py test` via `backend/vendor-deps.sh`: forged client fields, missing/tampered grader → infrastructure, timeouts, parity mismatch, repeated submissions, unresolved never consumes an attempt, replay from recorded decisions, regrade supersession | backend changes |
| G8 replay stability | mastery computed from stored decisions is identical before and after a grader version bump (fixture learners) | grader release |
| G9 learning suite | `bun test packages/learning` and the frontend suites stay green | every commit |

## 13. Migration and rollback

Feature flag `OPENPATH_GRADING` (server env + app build constant), values:

1. `legacy` — today's behaviour (default until G5 passes).
2. `shadow` — legacy decides; the unified grader also runs and its decision is stored as `decidedBy: "shadow"` (never used for
   mastery). Produces the G5 report from real use as well as the corpus.
3. `unified` — unified decisions are authoritative; legacy runs in shadow for a fixed period.

Rollback: set the flag back. Decisions already recorded under `unified` stay valid (they carry their own versions); replay keeps
reading them. No schema is dropped; @1 assessments remain readable. The quarantine registry is independent of the flag (it is
safe in all modes and is enabled first).

## 14. Implementation sequence (Phase C/D), prioritised

| Step | Scope | Fixes | Exit test |
|---|---|---|---|
| C1 | Quarantine registry + `selectable` gate on every route + server stores attempts on quarantined questions as unresolved; withdraw the 951 | **D09** | G6; D09 fixtures flip |
| C2 | Strict parser (`grading/parse.ts`) for all 12 semantics kinds + syntax examples + property tests; typed-contract/exact-checker text readers replaced by the parser's typed values | **D02, D06**, D03, D04, D05, D08 | G1; D02–D06, D08 fixtures flip |
| C3 | Contract @2 builder over existing generators (semantics, typed expected value, domain, keyAuthority); form rules proposed from the audit scan, reviewed, declared in definitions; instruction cross-check | D07 | builder parity: every released question builds; inconsistencies auto-quarantined and listed |
| C4 | Dispatcher + `GradingDecision` + verifier adapters; remove `legacyCorrect` input; one `grade()` for browser and server bundle | **D10**, D01 | G3; D01, D10 fixtures flip |
| C5 | Certification registry; audit harness switched to the unified path; certifications issued per semantics × family scope | — | G4 |
| D1 | Server: Python stops grading; infrastructure failure → unresolved; regrade queue; rate limiting; `UNRESOLVED_CAP` removed in app and server | **D12**, D16, D13 | G7; D12, D16 fixtures flip; the 4 failing Django tests updated to P1 (approved policy change, documented per test) |
| D2 | Decisions stored; replay from decisions (app + server); historical reconstruction job and its report | **D11** | G8 |
| D3 | Shadow mode in production builds behind the flag; G5 report | — | G5 reviewed by the product owner |
| D4 | Program route (D14): program items get `openpath-assessment@2` contracts (`source.kind: "program"`); `scoreCode` becomes the `choice/order/match` verifier adapter; typed program answers use the parser; the server records decisions for program answers | **D14** | G3/G4 extended to the 140 program questions |
| D5 | Parity mirror retirement: `learning_families._mirror` and Python grading removed after G5 | D15 | G7 |

E (certification report) and F (final review) follow, as in the brief. Nothing in C1–D5 is a rewrite of a kernel: kernels are
reused as verifiers; what is replaced is text reading, the decision path and replay.

## 15. Open questions for review

1. `OPENPATH_PROVISIONAL_CREDIT` (§6): keep provisional (uncertified-but-audited) decisions feeding mastery during migration?
   Recommended **yes**, reported separately, with a dated target to switch off per semantics kind as certifications land.
2. Ambiguity conventions in §4.2 (`sin 2x cos x`, `log 2x`, mixed numbers only in numeric answers): approve as published rules?
3. Historical reconstruction (§9): run once over existing records with a reviewed diff — approve the approach (it touches stored
   learner data only by appending; nothing is altered)?
4. C1 is independent of the rest and low-risk; may it be implemented first, ahead of the full C-phase review?
