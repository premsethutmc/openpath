# 2. Authoritative grading contract

One decision, made by the trusted grader: `grading-decision@1`. Django runs the same bundle and stores what it returns. The decision answers five separate questions.

| # | Question | Field | Values | Decided by |
|---|---|---|---|---|
| 1 | Answer correctness | `verdict`, `reason`; credit in the reply | `correct` / `incorrect` / `unresolved` / `pending-educator` | Unchanged grading policy (`gradeAnswer`): parser, kernel or value verifier, required forms |
| 2 | Method verification | `working.methodEvidence` | `method-verified` / `method-false-step` / `no-method-evidence` | `derivation-interface.workingEvidence`, answer-vs-method@1 |
| 3 | Derivation completeness | `working.completeness` | `complete` / `incomplete` / `no-working` | P2 working evidence (completeness@2) |
| 4 | Unsupported working | `working.status = "unsupported"` | | `authorizeWorking` did not authorise the chain and the authority refuted no line |
| 5 | First invalid step | `working.firstInvalid` `{index, text, from, reason, lost, gained}` | | P2: the earliest line with a certain counterexample |

## `working-assessment@1` (`packages/learning/src/grading/working.ts`)

| Field | Meaning |
|---|---|
| `statement` | The task the authority read. It comes from the family contract or `Question.statement`, never from the request. |
| `status` | One of the six statuses below. |
| `lines[]` | Each submitted line with its P2 transition status and move. |
| `replayedLines` | Leading lines covered by an authorised chain that was replayed from the task. For invalid working, this is the valid prefix, authorised and replayed on its own. |
| `certificates[]`, `replayed` | Certificate digests and the replay result. |
| `workingAnswer`, `agreesWithResponse` | The final answer stated in the working (judged by P2), and whether it is the submitted answer. |
| `substitution` | For an incorrect answer to a one-variable equation: the answer put into both sides, evaluated exactly. |
| `versions` | `{authority, registry, kernel}`, for replay (doc 8). |

### Statuses

| Status | When |
|---|---|
| `none` | No working was submitted. |
| `answer-only` | The working is the answer alone. |
| `verified` | Authorised, replayed and complete, and it shows a step (method-verified). |
| `partial` | Authorised and replayed, but incomplete. |
| `invalid` | A line is refuted. |
| `unsupported` | Anything else. |

## Rules (each one tested)

1. **A correct answer does not establish a method.**
   - `methodEvidence` is `method-verified` only when the authority authorised and replayed the whole chain, it is complete, and a line produces something that is neither the task nor the answer.
   - B (`x = 5`) gives `none` / `no-method-evidence`.
   - The answer alone as working gives `answer-only` / `no-method-evidence`.
2. **An incorrect answer does not establish a misconception.**
   - `working` never names a misconception, and `diagnosis` is unchanged.
   - Misconceptions are established only by the existing investigation policy (hypotheses.ts), from answers (doc 5).
   - Case A has `diagnosis: null` and `firstInvalid: null`.
3. **A valid partial derivation is not a solution.** F (`3x = 15`) gives `partial` / `incomplete`, with verdict `unresolved` (no final answer). It is not an attempt.
4. **A bare answer is never verified working.** This is rule 1 again. The submission reader never turns a bare answer into a working line.
5. **The answer verdict never depends on the working.** Tested: four responses × four kinds of working give the same verdict, reason and credit as the bare answer.
6. **Unsupported is never wrong.**
   - `firstInvalid` is null.
   - `workingAnswer` is null.
   - The renderer shows "not marked right or wrong".
   - An unmarked answer with judged working gets feedback level `partial`, labelled "Not marked".
7. **No client authority.**
   - The statement comes from the question.
   - The decision comes from the trusted grader.
   - Django refuses a record that carries its own decision.
8. **Replay.**
   - The recorded assessment can be re-derived (`replayWorking`): same status, first invalid step, certificate digests and replayed prefix.
   - A record made under another authority version is `historical-version-not-replayable`, and its recorded result stands.
   - Tampered digests or a tampered status give `failed-replay`.

## What was not changed

- The answer decision: the policy, reasons, `method {examined, verified}` (natural-working) and `diagnosis` are untouched. Proof: 109,096 identical decisions (doc 9).
- The authority's rules. Only its version label changed (doc 8).
- The adaptive policy and the learner-state estimator (doc 5).

## One integration fix on the answer side

An authored question has no generator contract, so its answer reader had no variable, and "x = 5" was unreadable (`unresolved.invalid-response`). `legacyContract` now takes the variable from `Question.statement` when the statement has exactly one unknown. Only questions with a `statement` are affected; today that is only the reference question.
