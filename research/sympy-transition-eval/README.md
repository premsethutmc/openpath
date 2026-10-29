# SymPy transition-verification evaluation (Agent 3, isolated research)

Not wired into any product path. Reports: `/MATH_TRANSITION_ENGINE_AUDIT.md`, `/E7_FALSE_REJECTION_ANALYSIS.md`, `/SYMPY_TRANSITION_EVALUATION.md` (reproduction commands in §10).

- `verifier/` — prototype: `safe_parse.py` (no-eval parser), `transition.py` (four-way transition verdicts), `cases.py` (whole-case adapter), `service.py` (isolated worker + client)
- `harness/` — holdout runner and scoring (`run_holdout.py`, `score.py`), root-cause classifier (`classify_fr.py`), front-end-only experiment (`normalize_text.py`)
- `adversarial/` — independent transition suite (125) and whole-working suite (40), E7 runners
- `tests/` — `python3 -m unittest discover -s research/sympy-transition-eval/tests`
- `out/` — machine-readable per-case results
- `e7-dump.ts` — read-only E7 run capturing verdicts and justifications
- `architecture-notes.md` — line-level audit notes behind the architecture report

Requires SymPy 1.14.0 and mpmath 1.3.0 (PyPI was not reachable from the evaluation sandbox; both were installed from their GitHub release tags).
