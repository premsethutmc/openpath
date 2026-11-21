# reading-ai@1: a second check by the AI on typed reading answers

Owner decision (21 November 2026): try sending typed reading answers to the AI and measure whether it helps; a
separate bucket from writing feedback's three a week.

- When: only when the on-device rules mark an answer wrong and no guard caught it (a named wrong fact, two choices,
  a pasted passage). A right answer is never sent. The AI's yes turns the answer right ("Checked again by the AI");
  its no, a failure or a limit leaves the rules' mark.
- Who: signed-in parent accounts only, for their own child, after a parent's own yes for this (shown on the "Write
  an answer" start screen, with a way to turn it off). The writing-feedback yes does not count for it.
- What is sent: the question id and the answer (at most 300 characters; e-mail addresses and phone numbers removed).
  The server adds its own passage, question and model answer. Nothing typed is stored.
- Model and key: the writing-feedback ones on the server. Limits (own bucket): `OPENPATH_READING_AI_DAILY` (15) per
  account and `OPENPATH_READING_AI_SITE_DAILY` (500) for the site, per day. Switch: `OPENPATH_READING_AI=on`.
- Trial before building (`reading_ai_trial`, five made-up answers, gpt-4.1-mini): the AI agreed with a careful
  teacher on 5 of 5, the rules on 1 of 5; about 270 input and 26 output tokens an answer.
- Measuring whether it helps: the usage summary in the server log counts answers checked again, how many the AI
  turned right, and how many of those a child then reported as looking wrong (a sign the AI was too generous).
- Code: `backend/family/reading_ai.py`, gateway task `reading.answer`, `frontend/src/english/logic/reading/ai-check.ts`,
  `WrittenSitting.check(answer, ai)`. Tests: `family/test_reading_ai.py`, usage summary, WA-5.
