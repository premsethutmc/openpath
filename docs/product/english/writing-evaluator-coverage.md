# Evaluator acceptance coverage v2

**Synthetic, AI-reviewed candidate references only. No provider call, accuracy validation, calibrated difficulty or learning-benefit claim.** This extension is isolated from the original green evaluator PR #225.

## Scope

Version 2 contains **30 invented samples**: 14 language samples and 16 argument samples. It contains 39 required reference anchors across 10 grammar competencies and all seven argument areas, with seven stretch-labelled samples and three revision cases. It retains the original 16-case suite as version 1 without changing that historical file.

New language coverage includes sentence boundaries, collocations, connectives, stylistic concision, a/an by sound, countability and dependent prepositions. The adult-context sample concerns a committee's expansion decision; exam goal labels elsewhere still do not make school-context grammar passages exam questions.

Argument reference concerns now span all seven areas: claim, reasons, evidence, warrant, counterargument, organization and clarity. Added cases include inconsistent recommendations, ambiguous pronouns, a strawman, an irrelevant paragraph, a qualified opposing argument and three supported revisions:
- earlier universal claim corrected and qualified in current writing;
- earlier evidence problem still present in current writing;
- malicious instructions appearing only in the previous draft.

Revision requests include the earlier draft as untrusted context. Accepted feedback must still quote the **current** draft. Transfer requests cannot carry previous-draft context. Neither a revision nor a transfer response creates an improvement or mastery claim.

`stretch` samples are now present, but this is a self-selected practice label, **not measured text difficulty or exam readiness**. The report displays exact coverage counts and keeps `calibrated: false`, `releaseReady: false` and `liveAccuracyEstablished: false`.

## Reference and scoring refinements

- The unsupported percentage case accepts a short diagnostic quote such as “forty percent” **or** the complete unsupported assertion. A broad whole-draft quote cannot earn the same match. Alternatives belong to one annotation, so they cannot multiply required-credit counts.
- The Chennai explanation is local to that city in that sentence, not an incorrect universal rule about every city name.
- The a/an example now uses “an useful book,” avoiding the earlier conflation of article sound and uncountable *advice*. Countability has its own separate sample.
- An unsignalled counterpoint and short balanced comma coordination are not mandatory grammatical errors. Optional stylistic observations are distinguished from required errors.
- Wordy but grammatical concision examples are protected from grammar-error classification. A style suggestion is permitted.
- Contradictory recommendations accept either conflicting assertion as a diagnostic quote.
- The revision instruction acknowledges that the original recommendation was incautious instead of incorrectly describing it as an already cautious proposal.

These changes followed independent AI review. They are not human educator validation. Exact-quote/category agreement still does not establish whether an explanation or coaching question is correct or helpful. All accepted feedback requires qualitative review; protected-span flags are alarms for review, not automatic verdicts that the model is wrong.

## Reproduce without a provider

From the repository root with dependencies installed:

```sh
node --import ./frontend/node_modules/tsx/dist/loader.mjs frontend/scripts/workspace-writing-acceptance.mts --suite 2 > /tmp/workspace-v2-requests.json
python backend/manage.py workspace_writing_benchmark --requests /tmp/workspace-v2-requests.json --out /tmp/workspace-v2-dry.json
node --import ./frontend/node_modules/tsx/dist/loader.mjs frontend/scripts/workspace-writing-acceptance.mts --recorded /tmp/workspace-v2-dry.json > /tmp/workspace-v2-dry-score.json
```

Version 2 is the CLI default. Use `--suite 1` for the historical 16 samples. Scoring selects the version named in the recording and checks its exact request/reference/server-policy digests; changing the version label cannot reuse another version's evidence.

Both versions use the existing safe runner. Live mode still requires a configured provider/key, an existing active developer, explicit approval, verified prices and a spending cap. The runner's default request cap remains **20**, so a full 30-case live run additionally needs `--max-calls 30`; otherwise uncalled cases remain missing in the report. This extension does not silently increase spending limits or activate a provider. Start with the intended subset/call limit only after approval; do not interpret a truncated run as full coverage.

## Remaining gaps

The suite is still a small targeted set. It does not cover every grammatical construction, every proficiency level, representative Indian learner writing, all forms of prompt injection, long multi-page arguments, reliable factual verification, model-to-model consistency, calibrated severity or actual learning retention. It does not score the natural-language quality of hints, whether a slip is correctly classified, or whether the writer really learned to articulate better. Those require further evaluation, not larger synthetic counts alone.
