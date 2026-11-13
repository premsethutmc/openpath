# Word problems (word-reader@1)

A typed word problem is turned into ONE calculation by a language model. OpenPath's own solver then works the
calculation and checks every line. The model never supplies an answer that is shown.

- **Off by default.** On only when the server has `OPENPATH_WORD_PROBLEMS=on`, `OPENPATH_WORD_PROBLEM_MODEL` and
  `OPENPATH_WORD_PROBLEM_API_KEY` (set in the host's environment by the owner; never in a file, a commit or a chat).
- **What is sent:** the typed problem text and a fixed prompt. Never a name, an account or a record.
- **What is kept:** per account per day, a count of requests and tokens. No problem text.
- **Limits:** 20 a day per account (`OPENPATH_WORD_PROBLEM_DAILY`), 1,000 a day across the site
  (`OPENPATH_WORD_PROBLEM_SITE_DAILY`). Set a monthly spending limit at the provider as well.
- **What the learner sees:** "How OpenPath read it" (the reading and the calculation) before the steps, with a note to
  check it matches the problem, and a line saying an AI helper read the words and can misread.
- **Not available** in the device-only demo (there is no server to hold the key).

## Trial before use

`tools/mathematics/word-reader-eval/run.ts` reads OpenPath's own worded problems (one per kind, answers known) and counts
right / wrong / refused. It runs from the workflow "Word-reader trial" (by hand, or a push to `eval/word-reader`) with
the repository secret `OPENPATH_WORD_PROBLEM_API_KEY`. It costs a few cents and never runs in ordinary CI.
