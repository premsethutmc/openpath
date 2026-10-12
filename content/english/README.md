# OpenPath English content (E1 draft)

**Status: draft, unreviewed.** Everything here was written by OpenPath to
exercise the engine in milestone E1. It is not yet fit to teach with. Before
any learner sees it, an English educator must review it (decision D-4).

| Path | What it holds |
|---|---|
| `framework/en-0.1.0.json` | The full capability hierarchy: 8 strands, 44 sub-strands, 121 capabilities. The 17 *skeleton* capabilities are fully specified (band descriptors, misconceptions, couplings); the rest are named and placed, to be specified in E2 |
| `framework/versions.lock.json` | Fingerprints of frozen framework versions. Editing a frozen file without a new version number fails the tests |
| `items/code-items.json` | 123 code-scored items across the 17 skeleton capabilities (difficulty `b` and discrimination `a` are initial expert guesses, to be calibrated from real responses later) |
| `items/passages.json` | 3 original reading passages (bands about 3, 5 and 7) |
| `writing/tasks.json` | 3 writing tasks with rubrics and 4 **candidate** anchor responses each. Anchors become *trusted* only when educators have scored them (`trusted: false` today) |
| `goals.json` | Goals a learner can choose, as weights over the hierarchy |
| `signals/misspellings.json` | Common misspellings used by the updater's code-checkable signal (check 6) |
| `prompts/evaluate.v1.md` | The versioned evaluation prompt for real LLM adapters (E3). No LLM is called in E1 |
| `replay/` | Illustrative evaluator outputs used by the demonstration (written by OpenPath, not produced by an LLM) |

All passages, items and anchor texts are original. Names are invented.
