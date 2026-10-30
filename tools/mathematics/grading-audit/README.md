# Curriculum grading audit harness

Measures how reliably every released mathematics question is graded, with an oracle that is independent of the production
graders. Report: `MATH_CURRICULUM_GRADING_AUDIT_REPORT.md` (repository root).

```
tools/mathematics/grading-audit/run-audit.sh      # from the repository root; resumable, deterministic
```

| Stage | Script | Output | Notes |
|---|---|---|---|
| baseline | `baseline.ts` | `data/baseline.json` | families, released questions, contract routes (recomputed from the live code) |
| parity | `parity.ts` | `data/parity.json` | app generators vs the server's `content/learning/generated.v1.json`, every form |
| sample | `sample.ts` | `data/samples.jsonl` (ignored) | ≤12 typed + ≤4 `:mc` + ≤3 `:w` per family; first/last, each parameter's min/max, zero and negative parameters, then a fill seeded by the family id |
| oracle | `oracle/oracle.py` | `data/oracle/` (ignored) | builds candidate answers from the stored answer and labels each with its own SymPy reading of the answer type; never imports a production grader |
| client | `run-client.ts` | `data/client/` (ignored) | `grade.ts decide` (what the app shows and records) and `server-grader.ts gradeRequest` in process |
| backend | `run-backend.py` | `data/backend/` (ignored) | the real Django code path (`_answer_ok`, `_authoritative`, `credited`) with the real integrity-checked Node bundle, batched; `OPENPATH_GRADER=off` measures the fallback |
| score | `score.py` | `data/results/` | joins truth and verdicts; outcome classes are never added together |
| certify | `certify.py` (`CERTIFY=1`) | `content/learning/grading-certifications.v1.json` | per family × form × verifier, only with zero blocking findings on both routes (GRADING_CERTIFICATION_REPORT.md) |
| inventory | `family-meta.ts`, `policies.ts`, `inventory.py` | `data/family-meta.json`, `data/question-policies.json`, `data/inventory.json` | the 15 facts per family and the policy of every released presentation |

Each family is one file per stage, written atomically; a stage skips families already present, so an interrupted run resumes.
Delete a stage's directory to recompute it. The raw per-candidate directories are large and reproducible, so they are not committed.

## Oracle

`oracle/mathtext.py` reads answer text (unicode or ASCII, implicit multiplication, `sin x`, `|x|`, `tan⁻¹`, exact decimals) into
SymPy; `oracle/oracle.py` defines each answer type's meaning (value, unordered set, multiset, tuple, matrix, real subset, ratio,
function on its domain, antiderivative up to a constant) and decides equality by exact simplification plus 40-digit evaluation at
fixed rational points (expressions need ≥3 real points and agreement at all of them). A candidate's label comes from that
mathematics, not from how it was built; anything it cannot decide is `unverified` and is not scored. Form requirements are read
from the prompt (`simplest form`, `interval notation`, `mixed number`, …) and decide whether an equal answer in another form must
be credited. `oracle/test_oracle.py` holds hand-derived fixtures for the oracle itself.

The oracle judges responses against the **stored answer**. Whether the stored answer is itself right is a separate premise,
independently established only for questions with a verified generator contract.

## Reproducible Python environment

`backend/vendor-deps.sh` clones the exact pinned versions from `backend/requirements.txt` (and SymPy 1.14.0 / mpmath 1.3.0 for
the oracle) from GitHub release tags into `~/.cache/openpath-vendor` and prints the `PYTHONPATH`. Use it where PyPI is unreachable.

## Oracle change log

Every change to the oracle's reading of prompts or answers is listed here, with the reason. A change is made only when the oracle
misreads mathematics or an instruction, never to make a production verdict pass.

| Date | Change | Reason |
|---|---|---|
| 2026-10-28 | reader: `xlogx`, `sec x tan x`, exact decimals, mixed numbers inside lists, `or`/`and` words | Phase A: oracle misread these (checked against hand fixtures) |
| 2026-10-29 | form rules: "interval notation (or as an inequality in x)" permits both notations | the instruction explicitly allows an inequality; the oracle treated it as a requirement |
| 2026-10-29 | form rules: "as a decimal" is violated by a fraction or mixed number | the oracle listed decimals as violating fraction rules but not the reverse |
