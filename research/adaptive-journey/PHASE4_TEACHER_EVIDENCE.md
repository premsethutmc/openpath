# Teacher evidence view: design (read-only; no screen built)

**View model:** `packages/learning/src/teacher-evidence.ts` (`teacher-evidence@1`). It is a pure function of the learner's records and evidence. It writes nothing and is not learner-facing.

## Principle

The teacher always sees *what happened*, *what the grader decided*, *what the engine suspects*, and *what the policy says* as four separate things. The engine's suspicions are never presented as facts.

## Layout (one skill, one learner)

1. **Status (policy).** The status word, answers right alone and with help, and the delayed-check history. A failed check stays visible, together with when recovery opened a new check.
2. **What the learner answered (observations, verified).**
   - One row per answer: question, right/wrong/not decided, alone or with help, and activity.
   - Where the algebra kernel recorded it, the first invalid step and its source.
   - "Working written (not assessed)" when the learner wrote working that the engine did not check.
3. **What the engine suspects (hypotheses, suspected).** One card per hypothesis, with a label of the form "Possible misunderstanding (not a confirmed fact)". Each card shows:
   - the explanation in plain words;
   - the answers that match it and the answers against it, including discriminating questions answered after teaching;
   - the status (open / taught and waiting for a question that tells it apart / resolved / conflicting evidence / not enough answers / no known explanation);
   - why it was looked into (starting check, stuck problem, an answer a misunderstanding predicts, repeated errors).
4. **What was taught (teaching records).** Each explanation delivered, how many times, and whether the check alone after it was right.

## Wording rules (enforced by a contract test for hypotheses)

| Do | Don't |
|---|---|
| Start hypotheses with "Possible …", "Earlier possible …" or "A wrong answer …" | Use "has the misconception", "confirmed", "definitely" |
| Show uncertainty as counts of answers for and against | Show probabilities |
| Say "no known explanation fits" when the engine does not know | Guess |
| Present the verified record of answers as fact | Mix it with the engine's guesses |

## Out of scope until approved

- Learner-facing presentation of hypotheses.
- Teacher actions: confirming or dismissing a hypothesis, which would need its own record type and policy.
- Exporting the view.
