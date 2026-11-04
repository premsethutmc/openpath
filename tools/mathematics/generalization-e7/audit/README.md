Audit tracing scripts (Phase 1, read-only; no engine change).
They import `packages/learning/src/_audit-trace.ts`, which is NOT committed. Regenerate it with:
  cp packages/learning/src/unified-math-engine.ts packages/learning/src/_audit-trace.ts
  echo 'export { assessCandidateBase, assessE5Route, assessE6Route, assessCandidate, applyAcceptanceGate, mergeE6 };' >> packages/learning/src/_audit-trace.ts
(scripts reference /tmp/claude-0/a paths; adjust). route-scan.json = per-case route verdicts for 1725 natural-input cases (E2-E6 + both E6-R holdouts).
