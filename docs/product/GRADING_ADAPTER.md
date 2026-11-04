# Shared grading adapter: design (not implemented)

**Status:** design only. The guest preview still uses its local checker, and learner credit is unchanged. Nothing here is switched on.

## The problem

The guest preview and signed-in learning check answers with different policies.

| Path | Code | Policy actually applied |
|---|---|---|
| Guest preview (`curriculum/PreviewExperience.tsx`) | `creditOf(id, response)` in the browser | `grade()` from `grading/decision.ts`, which is the unified policy. Working is ignored. |
| Signed-in learning (`year/CurriculumPractice.tsx` → `POST /pupils/<id>/events/`) | `family/learning.py` `_decide` | The `OPENPATH_GRADING` mode, default `shadow`. The server uses the trusted grader's verdict only where the grader reports `source: kernel`. Everywhere else it falls back to the stored-answer comparison (`legacy_grading.right`). The unified verdict is recorded beside it, never used. |

A guest can therefore be told "right" for an answer that a signed-in learner would see left undecided, or the other way round.

### Measured divergence

I compared the two paths on 1,860 responses: the six curated lessons' first 60 practice questions each, with the right answer, a padded copy, a wrong value and some format variants. I ran `tools/mathematics/preview-parity/`, which records the browser credit and then the result of `_decide` in Django (shadow mode, grader enabled). The two paths disagree on 62 responses (3.3%).

- **60 in probability fractions written with spaces**, such as `4 / 9`:
  - the preview gives credit;
  - the server leaves the answer undecided (the legacy reader rejects the spacing).
- **2 in discriminant choices with an out-of-range option (`D` when only A–C exist):**
  - the preview leaves the answer undecided;
  - the server marks it wrong.

There were no right-versus-wrong reversals in this sample. The sample is small and covers only six lessons, so this is not a parity claim.

## Design

There is one interface. Both paths call it, and neither path decides grading semantics itself.

```ts
// packages/learning/src/grading-adapter.ts (proposed)
export interface GradeRequest { id: string; response: string; working?: string[] }
export interface GradeResult {
  credit: boolean | null;          // null = undecided, never "wrong"
  verdict: string;                 // grading-decision@1 verdict
  source: "kernel" | "legacy" | "held" | "educator" | "infrastructure" | "preview-local";
  authoritative: boolean;          // false when the result is not the server's decision
  feedback?: { kind: "misconception" | "hint" | "none"; text?: string };
}
export interface GradingAdapter { grade(r: GradeRequest): Promise<GradeResult> }
```

There are three implementations.

1. **`ServerAdapter`** (signed-in learning). This is the current path, unchanged: the attempt event is posted and the server's recorded decision is read back. It is authoritative.
2. **`PreviewServerAdapter`** (proposed for guests). It calls a new read-only endpoint, `POST /api/grade/preview/`.
   - The endpoint runs the same `_decide(event, q)` policy as learner attempts, in the same `OPENPATH_GRADING` mode.
   - Nothing is stored.
   - There is no learner, and the call is rate-limited per IP.
   - Its result is the authoritative semantics, labelled `authoritative: true`, but it is never evidence.
3. **`LocalAdapter`** (today's preview checker, kept). It wraps `creditOf` and labels its result `source: "preview-local"`, `authoritative: false`. It is the fallback when the endpoint is unreachable (offline, cold start). The preview then says the check is approximate.

### Switching

- A build flag selects the adapter: `PREVIEW_GRADING=local|server`, default `local`.
- Changing the default needs:
  - product-owner approval;
  - the endpoint deployed with its rate limit;
  - a parity report from the measurement above, extended to all Grade 10 practice pools and kept as a test.
- `CurriculumPractice` already goes through the server, so it changes only by importing the shared types.

### What stays untouched

- Learner credit.
- Recorded decisions and `OPENPATH_GRADING`.
- Quarantine and certification.
- The grader bundle.

The endpoint reuses `_decide` read-only and never writes. When unified grading is approved later, both paths follow it at once, because both call the same server policy.

## Open questions for approval

- Should a guest's answer be graded on the server at all? It costs a Node process per check: about 0.3 s cold, and batching is possible.
- When the endpoint is unavailable, should the preview fall back to the local check (labelled approximate) or decline to grade?
