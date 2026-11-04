# 12. Recommendation

**Decision: PARTIAL — architectural gaps identified.**

What passes:
- Geometry answer-level learning runs end to end through the shared engine with no geometry-specific engine: generation, trusted server grading, misconception diagnosis, teaching gates, fresh rechecks, ledger, retention, recovery, persistence and deterministic replay. 190 of 193 modules in the geometry journey (98.4 %) are pre-existing shared modules used unchanged; 11 of 12 interfaces need no shared-code change.
- A complete successful journey (G-02: misconception → teaching → fresh check → transfer → retention) and a failed journey needing remediation (G-03) are traced.
- Sub-skill evidence is now configuration of a domain-neutral engine; linear-equations behaviour is unchanged.
- The geometry authority never accepted a false step or a diagram-only relation in the adversarial set.

Why not PASS:
1. **Working/proof verification is an architectural gap.** The geometry authority is disconnected from the trusted grader and from records; geometry method evidence cannot exist.
2. **The geometry authority is not ready to be connected**: it calls valid alternative proofs `invalid` (R06, R07), verifies bare final claims (R02) and only abstains on a provably false step (R10).
3. **Competency mastery leaks across sub-skills** (shared, pre-existing), and geometry lacks the misconception teaching content and diagnostic coverage that would remediate G-03.

Why not BLOCK: no safety rule was weakened, no false acceptance occurred, nothing leaks into production, and the answer-level loop is fully functional on shared components.

Recommended order (no work started): P1 items in 11 (server-side working authority interface with authority provenance; reasoner `unsupported` for out-of-rule-set citations) before any geometry method evidence; then P2 content (diagnostics per core sub-skill, reviewed geometry `fix_*` explanations). Do not expand geometry coverage before P1.

Not claimed: educator approval of the sub-skill mapping or the oracles; browser verification of geometry rendering.
