# Domain-aware reasoner (K05.2): frozen tests and independent oracle

Proposal: `docs/milestones/DOMAIN_AWARE_REASONER.md`. **No planner code exists for this milestone.** This folder holds only the specification's test side.

| File | Purpose |
|---|---|
| `domain_oracle.py` | Independent oracle (SymPy, exact polynomial reduction; never imports or is fed by a planner). |
| `gen_domain_sets.py` | Deterministic generator of the frozen datasets. Recipes propose equations; the oracle alone labels them. |
| `verify_datasets.py` | Second oracle with **no SymPy**: exact `Fraction` evaluation, interpolation of the cleared polynomial, grid checks. Re-runs the main oracle on every record. |
| `summarize_datasets.py` | Writes `DATASETS.md` from the frozen files. |
| `run-freeze.sh` | Regenerates everything, requires byte equality with the committed files, verifies, summarises, refreshes the milestone document's dataset section. |
| `frozen/` | `dev`, `eval`, `holdout`, `unsupported`, `adversarial`, `claims` (JSON) and `manifest.json` (seeds, counts, SHA-256). |
| `results/verify.json` | Result of the independent verification. |

Reproduce: `./run-freeze.sh` (about 10 minutes; needs python3 and SymPy; set `VENDOR=/path/sympy:/path/mpmath` if SymPy is vendored).

Rules of use: `dev` may be used freely; `eval` is the acceptance set (disclose any tuning); `holdout` is run once, at the end. Thresholds and datasets change only through the amendment log in the milestone document.
