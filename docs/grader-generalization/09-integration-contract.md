# 09 Integration contract and compatibility

## What the grader produces (additive)

- `assessChain(statement, lines)` keeps its fields: `status`, `at`, `reason`, `lines`, `chain`.
- It adds `evidence: WorkingEvidence` (`openpath-working-evidence@1`):
  - per-transition status, relation and counterexample;
  - first invalid line;
  - method;
  - completeness;
  - final answer;
  - certified progress.
- `derivation-interface.ts` (`authorizeWorking`, `workingEvidence`) is unchanged in shape, so the M1/M2 journey consumer (`frontend/src/journey/session.ts`) compiles and passes unchanged (64 / 64 journey tests).

**Schema of the new evidence** (all fields read-only; no score):

```ts
WorkingEvidence {
  contract: "openpath-working-evidence@1";
  versions: { authority: "openpath-derivation-authority@3"; solutionSets: "openpath-solution-sets@1" };
  task: { mode: "expression" | "equation" | "inequality" | null; conditions: string[]; domain: string[] };
  transitions: {
    line: number;
    status: "certified-equivalence" | "certified-implication" | "certified-candidate-check" | "certified-rewrite" | "invalid" | "unsupported";
    relation: "equivalent" | "implies" | "implied-by" | "neither" | null;
    reason: string;
    counterexample: { lost: unknown; gained: unknown } | null;
    move: string | null;
    certificate: string | null;
  }[];
  firstInvalid: number | null;
  method: "certified" | "invalid" | "unsupported" | "no-working";
  completeness: "complete" | "incomplete" | "no-working";
  finalAnswer: { present: boolean; correct: boolean | null; claimed: string | null; reason: string };
  progress: string[];
}
```

## What the grader does NOT do (boundaries kept)

- **No learner claims.** It does not establish misconceptions: `invalid` is a statement about one line of mathematics, never about why the learner wrote it.
- **No teaching or mastery decisions.** It does not decide teaching, award mastery, or touch retention policy. Nothing in `records.ts`, `evidence.ts`, `hypotheses.ts`, `intervention.ts` or `plan.ts` reads the new evidence.
- **Production grading unchanged:**
  - `grading-policy@1`, `assessment.ts` and the server bundle are unchanged; the bundle rebuilt byte-identical (`b4a2e637…`, matching the committed bundle).
  - `derivationVerified` stays false on every production path. The Milestone 2 test still passes.
- **No E7 activation.** E7 still consults the authority only in shadow.

## Compatibility notes (each covered by a test)

1. **Certificate versions.** `openpath-derivation-certificate@3` and task digests include the new task fields (bindings, relation, natural domain). `@2` certificates no longer replay as current. No `@2` certificate is stored anywhere; Milestone 2 states the same for `@1`.
2. **More derivations certified.** E7's shadow credit now reaches its original pre-P2 values in 3 assertions of `e7-finalisation.test.ts`; the assertions are updated with comments. 8 recorded fallback calls are now certified (06). 3 previously skipped E7 tests are re-enabled.
3. **Exact irrational refutation.** `x² − 2 = 0` → `x = 1.41` is now invalid: it loses −√2, previously reported as "fail-closed unsupported". A full rounding of every root stays unsupported. `derivation-interface.test.ts` is updated.
4. **Domain-aware loses-solution.** The refutation now also applies to tasks with conditions, within their domain. Before, tasks with conditions were never refuted.

## Decisions for architectural review

1. Whether the engine's own statement parser (E7 / P1) should hand more algebra to the authority. This is where most of the authority-level gain would reach the engine.
2. Whether to keep "one operation per line", or to certify any exact equivalence. The latter is sound, but changes what counts as a justified derivation.
3. The two label conventions surfaced by the held-out sets:
   - first invalid = final claim vs implication step;
   - natural-domain equivalence vs `implies` for clearing the task's own denominators.
4. Whether a teacher-controlled marking policy should consume `finalAnswer`, `progress` and `approximate-values`. They are exposed, never scored.
