# Tamil language adapter

`src/index.ts` exports `tamilModule`, the provisional language-module contract, with a sparse versioned graph, item metadata, activities, Unicode operations, scoring and response evidence. It does not own learner-state inference. The browser demo holds only raw evidence and navigation state. See [the integration handoff](../../docs/tamil/README.md).

Run contract tests from `frontend`: `npm run tamil:test`. The adapter has no new runtime dependencies and is bundled with the existing TypeScript/esbuild setup.
