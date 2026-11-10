# Offline deep-recovery tools

These simulations and reports are **not application code**. They use synthetic learners and raw question pools for research comparisons, not for selecting questions for real learners. The phase-2 implementation is retained in `../frozen/` with unchanged logic.

Run from `frontend/` after the normal `npm ci`, for example:

```sh
node --import tsx ../research/deep-recovery/tools/deep-recovery-flags.ts
node --import tsx ../research/deep-recovery/tools/deep-recovery-sim3.ts 2001 2001 p3-selective O1:single-gap
node --import tsx ../research/deep-recovery/tools/deep-recovery-sim5.ts 6001 6001 selective O1:single-gap
```

Other tools retain their existing arguments; see each file's header. Historical result manifests retain the paths and commits used to produce those archived runs. For a current rerun, replace `src/journey/deep-recovery-…` with `../research/deep-recovery/tools/deep-recovery-…` when running from `frontend/`.

`tools/question-selection-boundary.mjs` rejects any runtime import from application source into this directory or `../frozen/`, including through another local module. Tests may import them. The same boundary and selector registry run in the Node frontend suite (therefore existing CI shards) and the Bun question-status test. Nothing here is an approved application selector.
