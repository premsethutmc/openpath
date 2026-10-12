# E3a report: the free-form evaluation pipeline, with mock evaluators only

*12 October 2026 · branch `feature/english-e3a` · approved 12 October with the cleanup below. No live LLM is
connected, no provider has been chosen, no API has been called or paid for, and no learner answer has
left OpenPath. Scope and decisions: [`E3_SCOPE.md`](E3_SCOPE.md) (PR #10, decisions of 12 October).*

All new educational content (40 short written-response items, their key points, guards, model
answers and anchors) is **candidate, unvalidated**. Difficulty labels are **expert estimates**. No
anchor is trusted.

## Summary

| | Result |
|---|---|
| **Pipeline** | Extended writing (protocol `evaluate.v2`) and short written answers (`short.v1`), from request to proposal to the controlled updater. `evaluate.v1` is unchanged |
| **Authority** | Evaluators propose evidence-backed observations only. Fields that try to set an estimate, score, stage or verdict are refused. Every accepted judgement is weighed by the evaluator's measured noise and capped at 0.75 band, and none can change a stage |
| **New checks** | **12**, criterion–band consistency (approved): contradictions and incomplete criteria are rejected, and inconsistent bands held. **13**, words that could be read as an instruction to the marker are held for a person to review, without any judgement about the learner. **Check 6** gains deterministic guards for short answers. (Grammar-pattern ceilings were removed in review and are research-only.) |
| **Short written answers** | 40 candidate items on 23 capabilities: grammar 15, vocabulary 5, sentences 7, writing 8, reading 5. Code decides right or wrong from the key points; the result enters through the same update as a code-scored item, with no guessing floor |
| **Gateway (Django)** | Per-purpose consent, strict request checks, identifier removal (same rules and test cases as the core), and disabled, mock or replay adapters only. Every request is recorded with its provenance. Configuring any other adapter fails at start-up |
| **Measurement harnesses** | Qualification (noise, bias, key-point agreement), the anchoring-bias test, and drift monitoring with hidden anchors, all proven on mock evaluators with known properties |
| **Tests** | Core **105 of 105** (81 before, plus 24); backend **83 of 83** (70 before, plus 13). Both preserved simulation baselines reproduce exactly |
| **Frozen simulation** | Unchanged (current bank 6 of 8; E1 and E2a baselines exact). Short answers are offered only when a caller says an evaluator is available, and the frozen simulation never says so |

## Review cleanup (12 October)

1. **Check 13 kept as a conservative safety flag.**
   - The patterns were narrowed. "Ignore the rules", "give me five minutes" and "a model student" no
     longer match.
   - The reason recorded says it is a precaution about the evaluator, not a judgement about the
     learner.
   - Known false positives (quoted or innocent uses) are documented and tested; they are held for a
     person and nothing is changed.
2. **The seven grammar-pattern ceilings are removed from production.**
   - The detectors are kept as a research-only diagnostic (`tools/english/research/grammar-signals.ts`,
     `content/english/research/grammar-signals.json`). It only annotates decisions and never caps a
     band or changes an estimate.
   - Using them in production needs separate validation and approval.
   - A misjudgement such as *She don't… They was…* called accurate is therefore now accepted by the
     updater, and only flagged by the diagnostic.
3. **Unchanged:**
   - evaluators cannot set estimates, stages or verdicts;
   - checks 1–12 and the guards;
   - the consent gateway;
   - item versioning;
   - the frozen simulation baselines.
4. **Educator proposal.** It stays a planning document; nothing is commissioned and no one is
   approached. A small exploratory pilot (48 independently scored answers) is designed alongside it,
   and is **not** sufficient to qualify an evaluator.
5. **PR #10.** This branch is built on PR #10's branch, so the E3 scope and its decisions merge with it
   (see the PR).

## What was built

### 1. Protocols and prompts (`packages/english-core/src/freeform.ts`, `content/english/prompts/`)

- **`evaluate.v1` (E1) is kept exactly as it was.** Earlier evidence and the frozen simulation are
  interpreted as before; a v1 proposal needs no criterion scores.
- **`evaluate.v2` (E3), extended writing.**
  - Every rubric criterion of every target and secondary capability is scored on the band scale,
    with a verbatim quote. Criterion ids come from the rubric (`capability#1`, …), or
    `capability#overall` for a capability without listed criteria.
  - The learner's estimates are left out of the request unless the anchoring-bias test allows them.
  - Only prompt-set anchors are shown.
  - The response is scrubbed of identifiers and placed between fixed markers. Marker text inside a
    response is neutralised.
- **`short.v1` (E3), short written answers.** Key points marked present or absent, each "present"
  with a quote. No band, no score, no verdict.

### 2. Updater changes (`updater.ts`)

The existing checks 1–11 apply to v2 unchanged. Added:

| Check | Rule | Outcome |
|---|---|---|
| 4 (extended) | Criterion quotes and key-point quotes must appear in the learner's text | Rejected |
| 6 (short answers) | A guard that rules a key point out overrides an evaluator that marks it present | Held |
| **12 (new, approved)** | The band must agree with the evaluator's own criterion scores | No criteria, missing, unknown or repeated criteria, an off-scale criterion, or a band outside the criteria's range by more than 0.5: **rejected**. Inside the range but more than one band from their mean: **held** |
| **13 (new)** | Words that could be read as an instruction to the marker ("ignore the rubric", "give me band 8", "you are an AI grader") | Held for a person to review, no update. The reason says it is a precaution about the evaluator, not a judgement about the learner |
| 7 (short answers) | The evaluator must also be qualified on short-answer anchors (agreement ≥ 0.9) | Held |

**How a short answer is scored.**

1. Code checks the marks: complete, quoted and guard-consistent.
2. It sets right = every required key point present.
3. It applies `binaryUpdate` with the item's own a and b and no guessing floor, capped like any
   evaluator judgement.
4. Repeats count for retention only, as for code items.

**Item versions.** An answer is always judged against the version of the item the learner saw.
Retired short-answer versions are supported in the same way as code items (E2b).

### 3. Short written-response items (`content/english/short/short-items.json`)

| Strand | Capabilities | Items |
|---|---|---|
| Grammar | agreement, present and past, conditionals, reported speech, relative clauses, passive, modals | 15 |
| Vocabulary | word choice, academic vocabulary, similes and metaphors | 5 |
| Sentences | subordination, run-ons, coordination, embedding, connectives, fragments | 7 |
| Writing | register, idea development, persuasive, functional | 8 |
| Reading | cause and effect, motives, summarising (with passages) | 5 |

**Every item has:**

- a step on its capability's ladder (bands 3.25–7.25);
- one to three key points, and model answers;
- three candidate anchors: one prompt anchor and two qualification anchors.

**Guards.** 29 items have deterministic guards (for example *dogs barks* rules out "uses the plural
verb").

- Content validation proves that no guard rules out an item's own model answer or agreed anchor
  marks.
- Meaning-based items (explanations, relevance, inference) have no guards. Only an evaluator can
  judge those, and only trusted anchors can check that evaluator.

### 4. Trusted anchors

- **Sets.** Anchors carry a set: prompt, qualification or drift.
- **Review record.** An anchor can be marked trusted only with a record of two independent educator
  scorings, a rubric version and a date. Content validation enforces this.
- **Current state.** Every anchor is still a candidate.
- **The existing writing tasks' 3–4 anchors have no set.** They are treated as before, which means
  they serve both as examples and for qualification. That is acceptable only in development; new,
  separated sets come from educators (see the proposal).

### 5. Evaluators and harnesses (`freeform-evaluators.ts`)

- **`mockFreeformEvaluator`.** Configurable noise, bias, anchoring, drift and key-point error, plus 12
  scripted failure behaviours, such as contradiction, incomplete criteria, invented quotes, plausible
  inflation and misjudged quotes.
- **`humanEvaluator`.** A teacher's marks enter through the same checks.
- **`gatewayEvaluator`.** The device's client for the gateway, with an injected transport. The core
  stays free of network code, and a test enforces this.
- **`qualifyFreeform`.** Noise and bias per capability on writing anchors, and key-point agreement
  on short anchors. Malformed outputs count against the evaluator.
- **`anchoringBiasTest`** and **`DriftMonitor`** (one hidden anchor in every 20 requests).

### 6. Gateway (`backend/evaluation/`)

- **Endpoints:**
  - `POST /api/learners/<id>/consents/` records consent for **"AI evaluation of written answers"**,
    separate from enrolment. The latest record wins, so consent can be withdrawn.
  - `POST /api/learners/<id>/evaluations/` is the gateway itself.
- **Steps for each request:**
  1. **Consent.** Without it the answer is refused (403) and **nothing is stored**.
  2. **Request checks.** E3 protocols only, exact fields, no identifying keys anywhere, at most 3,000
     characters.
  3. **Identifier removal.** Python rules identical to the core's, both tested against
     `content/english/signals/scrub-cases.json`.
  4. **Adapter.** `disabled` (the default; 503 with the fallback), `mock` (judges nothing) or
     `replay`.
  5. **Record.** Status, adapter, protocol, item and version, fingerprint, the scrubbed request and
     the raw proposal.
- **Export and deletion** include the new records.
- **No live provider adapter exists**, by decision; configuring one raises an error at start-up.

## Tests

**Core: `test/e3-freeform.test.ts`, 23 tests.**

1. **Authority.** Fields that set an estimate, score or verdict are rejected. Accepted judgements are
   capped and never make a capability demonstrated.
2. **Check 12:**
   - a consistent band is accepted;
   - contradiction is rejected, a band far from the mean is held, and incomplete, missing or unknown
     criteria are rejected;
   - invented criterion quotes are rejected;
   - the pure function's limits are tested;
   - a v1 proposal is interpreted as before.
3. **Superficially plausible output.** Inflation by two bands passes every per-response check. An
   evaluator that does it is refused at qualification, and the ledger then holds its proposals.
4. **Misjudgement on a genuine quote.**
   - *She don't…, They was…* called accurate grammar is **held** (two code-detectable errors).
   - *Everyone have a bag…* called accurate is **accepted**: code cannot see it.
5. **Short answers.**
   - A guard overrules *dogs barks* marked right; held.
   - A wrong judgement on relevance is accepted, and only qualification on anchors catches that
     evaluator.
   - Code scores right and wrong with the exact binary update.
   - Incomplete, unquoted or invented marks are rejected.
   - Answers need a short-answer qualification and trusted anchors outside development.
   - Selection offers them only when `shortAvailable` is set.
   - Content: all four strands named in the decision are covered, and guards never contradict model
     answers or agreed marks.
   - Historical meaning: an answer is judged against the version the learner saw.
6. **Check 13** holds instruction-like text, and ordinary text that mentions a band or a score is not
   flagged.
7. **Harnesses:**
   - qualification recovers good, noisy, biased and careless evaluators;
   - the anchoring-bias test allows an unanchored evaluator and refuses one pulled by 0.4;
   - drift is detected, and the ledger then holds the drifting evaluator.
8. **Identifiers, prompts and the gateway client:**
   - identifier removal and hashing match the gateway's, case for case;
   - in prompts, the response sits between markers and cannot close them early;
   - the gateway client uses an injected transport and surfaces refusals;
   - a teacher's marks pass the same checks;
   - trusted anchors need two independent scorings.

**Backend: `backend/evaluation/tests.py`, 13 tests.**

1. **Consent:** required, separate from enrolment, and withdrawable.
2. **Adapters:**
   - the default adapter is disabled;
   - the mock adapter returns a proposal with provenance and scores every criterion;
   - no network is used (socket connections fail the test);
   - replay returns recordings and fails loudly without one;
   - only offline adapters can be configured.
3. **Requests and identifiers:**
   - identifiers are removed before anything is stored or forwarded;
   - malformed, v1, identifying, oversized and empty requests are refused, and nothing is stored;
   - scrubbing and hashing agree with the core.
4. **Export and deletion** cover consents and evaluation records.

**Unchanged and still passing:**

- every E1 and E2 test;
- the E1 and E2a baseline fingerprints;
- the item-versioning tests;
- the bank checks (G1–G7 for 56 of 56 capabilities; G8 recorded for all).

## Harness results (mock evaluators; `node tools/english/e3/harness.ts`)

**Qualification on writing anchors** (limits: noise ≤ 0.9 and bias ≤ 0.3, or 2 standard errors):

| True noise | True bias | Measured noise | Measured bias | Qualified |
|---|---|---|---|---|
| 0.2 | 0 | 0.41 | 0.04 | yes |
| 0.2 | 0.5 | 0.64 | 0.51 | no |
| 0.5 | 0 | 0.57 | 0.07 | **no** |
| 0.8 | 0 | 0.78 | 0.07 | no |
| 1.2 | 0 | 1.06 | 0.05 | no |

**A good evaluator (true noise 0.5) fails here by chance.** One capability (capitalisation) has only
6 anchors, and its measured noise is 0.98. **The candidate anchor sets are too small to qualify a real
evaluator.** About 20 scored responses per capability are needed, which is what the educator proposal
sizes.

**Short answers** (limit: agreement ≥ 0.9): a mark error of 0 or 5% qualifies (agreement 1.00 and
0.93); 10% and 20% do not (0.88 and 0.80).

**Anchoring** (estimates shown ±1.5 bands; limit: pull ≤ 0.3): evaluators with an anchoring tendency
of 0, 0.1 or 0.2 are allowed estimates; 0.3 (pull 0.31) and 0.5 (0.51) are not. By default, requests
carry no estimates.

**Drift** (one hidden anchor per 20 live requests): a drift of 0.4, 0.8 or 1.2 bands is detected
after 180, 140 or 120 live requests (9, 7 or 6 hidden anchors). Proposals made before detection are
not held retroactively; they can be revoked and re-scored.

**Request size** (characters ÷ 4; real tokenisers differ): about 3,400 input and 860 output tokens
per writing evaluation (largest 4,200), and about 770 input and 105 output tokens per short answer. No
cost is computed, because no provider or price has been chosen. The harness computes one only if you
give prices.

## What deterministic validation can and cannot catch

This is decision 5. The full table is in [`E3A_VALIDATION_LIMITS.md`](E3A_VALIDATION_LIMITS.md).

**Code catches, on every response:**

- schema violations, attempts to set scores, and foreign capabilities;
- invented quotes;
- contradictions with the evaluator's own criterion scores, and incomplete criteria;
- bands ruled out by measurable signals (misspelling rate, short-answer guards);
- instruction-like text;
- surprises, and large movements.

**Code cannot catch** a wrong judgement that is complete, quoted and self-consistent. That includes:

- a misread grammar error outside the pattern list;
- plausible inflation;
- a wrong call on meaning or relevance.

**Only trusted, educator-scored anchors reveal these,** at qualification and through hidden drift
anchors.

## Limitations

1. **Mock evaluators only.** Their failures are the ones we scripted. Real models will fail in other
   ways (paraphrased quotes, partial JSON, refusals, prose around the JSON), and only E3b can measure
   them.
2. **No trusted anchors.** Qualification on candidates proves the machinery, not any evaluator.
   Outside development, the updater refuses every evaluator (check 7) until educators score anchors.
3. **Writing-task anchors are not yet separated.** The 3–4 legacy anchors per task act as both
   examples and qualification data.
4. **Candidate thresholds.** Criterion agreement (one band), range slack (0.5),
   short-answer agreement (0.9), anchoring pull (0.3) and the drift window are reasoned choices, not
   calibrated. Changing any of them is a reported decision.
5. **Pattern-based protections.**
   - Check 13 catches common phrasings addressed to a marker, not every one, and has known false
     positives (quoted or innocent uses), which are held for a person, never treated as misconduct.
   - Names in running text, or written in lower case, are not removed.
6. **Not built yet:**
   - self-consistency sampling;
   - a second-provider second opinion (check 9 uses a second proposal if one arrives);
   - per-capability qualification limits (an evaluator must qualify on every capability);
   - a human review queue for held judgements;
   - server-side re-running of the updater at sync;
   - rate limits, timeouts and budget caps in the gateway.
7. **Short items are candidates.** Their key points and guards need educator review. Their
   difficulty estimates are as uncertain as the code items'.

## Readiness for a real provider (E3b)

| Area | Ready | Still needed |
|---|---|---|
| Protocols, prompts and schemas | Versioned v2 and short.v1 prompts; strict parsers | Testing on real model output: JSON-mode support, repair or refusal handling |
| Controlled updater | Checks 1–13; versioned items; replay and revocation | Self-consistency and second-provider rules, if wanted |
| Gateway | Consent, identifier removal, strict requests, records, disabled by default | A provider adapter, timeouts and retries, rate limiting, budget caps, secret handling, and data-retention settings |
| Qualification | Harnesses proven on mocks | **Trusted anchors (educator review)**, with separated sets |
| Children's data (D-3) | Consent per purpose; identifiers removed; nothing stored without consent | Provider terms for under-18s, settings that exclude training, legal review (DPDP Act) |
| Cost | Token estimates per request | Prices for the chosen provider; a budget |

**What E3b needs from you:**

1. Approve the educator review (scope, rate, approach).
2. Choose providers, a budget and acceptable data terms.
3. Approve a limited run on anchor responses only.

Learner writing stays on the device until consent, provider terms and legal review allow otherwise.

## Decisions for you

1. Merge PR #11 (E3a) as it stands.
2. The [educator-review proposal](EDUCATOR_REVIEW_PROPOSAL.md): scope, rate range, and whether
   educators may be approached.
3. Whether the candidate thresholds above stand until real data replaces them.
