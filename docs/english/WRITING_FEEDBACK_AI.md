# AI feedback on writing tasks (writing-feedback@1)

Owner decisions, 19 Nov 2026: a paid model may be used; three pieces per learner per week; a parent agrees once per
learner before anything is sent.

## What a learner sees

On a writing task, after "Check my writing":

1. While the free check still shows something to fix, or the length is wrong, AI feedback stays closed and says why.
2. The first time, a parent ticks a box agreeing that this learner's writing may be sent to an AI model.
3. "Ask for AI feedback (3 of 3 left this week)".
4. The feedback: yes / partly / not yet for each of the task's three checklist points, with one sentence each; one
   strength; one thing to do next time. No mark, no grade, no rewritten sentences.
5. It says it is written by an AI model and can be wrong: the grown-up beside the learner decides.

It appears only for a signed-in parent account, and only when the server has it switched on. On a device-only
record, or with the switch off, nothing about AI is shown.

## Cost controls

| Control | Where |
|---|---|
| One call per piece, reply capped at 400 output tokens | server |
| Its own model setting, so a small model can be used | server settings |
| Free check must be clean first | app |
| The same piece is never sent twice in a week | server (fingerprint) |
| Three pieces per learner per week | server, `OPENPATH_WRITING_FEEDBACK_WEEKLY` |
| Ceiling for the whole site per day (60) | server, `OPENPATH_WRITING_FEEDBACK_SITE_DAILY` |
| 30 requests an hour per account | server throttle |

Worst case in a week: 3 x the number of learners. The price per piece is not measured yet: it needs a real key.

## Privacy

Sent to the provider: the task's wording (looked up on the server by id), the piece with e-mail addresses and
phone numbers removed, and the ids of the free check's notes. Never the learner's name, the account or any record.
Kept: which task, a fingerprint of the text, the week, token counts, and the parent's yes or no. Never the writing
or the feedback. Deleting a learner deletes these rows. A parent's "no" is not yet offered in the app (the server
accepts it).

## Switching it on (server settings only, never in Git)

    OPENPATH_WRITING_FEEDBACK=on
    OPENPATH_WRITING_FEEDBACK_API_KEY=<key>
    OPENPATH_WRITING_FEEDBACK_MODEL=<a small model>
    OPENPATH_WRITING_FEEDBACK_PROVIDER=anthropic | openai_compatible
    OPENPATH_WRITING_FEEDBACK_BASE_URL=<provider address; default https://api.anthropic.com>

## Relation to the essay studio

Nothing in the essay studio or its evaluator (backend/evaluation/essay.py) is changed. This is a separate, smaller
request that reuses the same shared gateway (daily reservations), provider client, and identifier scrubbing.

## Tests

- backend/family/test_writing_feedback.py: 9 tests (off by default, consent, limits, same piece, shape of the reply,
  what is sent and kept, other accounts refused). No test calls a provider.
- frontend: WF-1, WF-2, AF-1.
- frontend/e2e/writing-feedback.test.mjs: the app, the API and a stand-in provider in a phone-sized browser.

## Not done

- Not tried with a real model: the quality of the feedback and the price per piece are unknown until a key is set.
- The prompt is mine, not educator-reviewed.
- The browser test is not in CI (it needs the API and a stand-in provider started together).
