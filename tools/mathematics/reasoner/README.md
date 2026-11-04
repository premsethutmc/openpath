# Mathematical reasoner (K05 pilot)

Proposal: `docs/milestones/MATH_REASONER.md` (PR #74). Branch is stacked on PR #69 (the kernel).

## E0: frozen acceptance sets (committed BEFORE any planner code)
`gen_sets.py` (Python, SymPy, shares no code with the planner) wrote `frozen/`:
| File | Count | Contents |
|---|---:|---|
| `smoke20.json` | 20 | brackets, fractions, both sides, negatives, a decimal; the five examples from the owner's note first |
| `seeded500.json` | 500 | seeded (20261025), 15 equation forms, 70% integer and 30% rational solutions, answers from SymPy |
| `edge50.json` | 56 | no solution 25, every x 11, nonlinear 10, variable in a denominator 10 |

SHA-256 of each file is in `frozen/manifest.json`. The answer key is recomputed by SymPy, never taken from the
generator's intended solution. Rebuild: `PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 gen_sets.py frozen`.
