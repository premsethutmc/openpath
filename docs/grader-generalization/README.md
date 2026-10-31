# Grader generalization (Workstream B): general mathematical derivations

**Branch:** `feat/p2-general-derivations`, created from Milestone 2 `c58c4430cbad4cb049ad241edfe683f6a8623746` (`milestone-2/robust-adaptive`).

**Commit:** given in the hand-off message. A report cannot contain its own hash.

**Not done:** nothing is merged or deployed; no grading route is activated; E7 is not activated; Agent A's branch is not touched.

## Summary

The existing P2 derivation authority now has a general, exact solution-set engine. Its version moves from `openpath-derivation-authority@2` to `@3`, and certificates from `@2` to `@3`; `@2` certificates no longer replay as current.

The authority gains:

- general one-operation equation moves;
- domain handling;
- implication-only steps that require candidates to be checked;
- inequalities;
- substitution under bindings;
- structured per-transition evidence.

All grading stays fail-closed, and every certified line replays independently.

The **authority** level is the authority API on its own. The **engine** level is the full unified math engine, whose own statement parser stops most algebra before it reaches the authority.

| | Milestone 2 | This branch |
|---|---|---|
| Known false mathematical accepts (all corpora, authority and engine) | 4 on HELDOUT4: ambiguous notation that was read as one meaning | **0** |
| Fresh held-out set HELDOUT5, frozen single run: valid derivations certified | 7 / 62 | **28 / 62** |
| HELDOUT5, frozen run: invalid working detected | 15 / 59 | **59 / 59** (first invalid step exact 58 / 59) |
| HELDOUT5, frozen run: false rejects | 3 | 1 |
| Frozen corpora, authority level: legitimate derivations certified | 131 / 131 / 114 / 110 | **147 / 142 / 135 / 122** |
| SymPy cross-check of certified equivalences and refuted lines | — | 1,274 checked, **0 disagreements** |
| Certificate safeguards (843 verified chains) | — | 0 cross-task, truncated, tampered, forged or move-forged chains accepted |

The HELDOUT5 false reject (`h5-sub-010`) is fixed after the run. The fix is disclosed in 05.

## Documents

1. [01 Baseline and gap report](01-baseline-and-gaps.md)
2. [02 General transformation-rule inventory](02-rule-inventory.md)
3. [03 Domain and assumption model](03-domain-and-assumptions.md)
4. [04 First-invalid-step evaluation](04-first-invalid-step.md)
5. [05 Held-out adversarial evaluation](05-heldout-evaluation.md)
6. [06 Corpus comparison](06-corpus-comparison.md)
7. [07 Regression report](07-regression.md)
8. [08 Remaining unsupported mathematics](08-unsupported.md)
9. [09 Integration contract and compatibility](09-integration-contract.md)

## Evidence and data

Everything is in `tools/mathematics/grader-generalization/`:

- **Corpora:** `heldout4/` and `heldout5/` (frozen and sha256-pinned).
- **Results:** `results/`.
- **Scripts:** `scripts/`, the authority runner, metrics, the integrity check and the SymPy cross-check.
- **Recoveries:** `RECOVERED-BY-GENERALIZATION.json`.
