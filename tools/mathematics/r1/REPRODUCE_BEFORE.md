# R1: failing evidence preserved before any production change

All "before" results were produced with the pristine audit-branch code (`/home/claude/k052`, commit `6999970`) and committed before the first production edit of this branch.

Commands (from `packages/learning/src/reasoner/domain`, with the project's TS loader):
- `ENGINE_ROOT=<pristine checkout> OUT=tools/mathematics/r1/results/adversarial-before.json node ... tools/mathematics/r1/run-adversarial.ts` (suite: `adversarial/suite.json`, 177 cases written by an independent agent that had not seen any fix)
- `SUITE=tools/mathematics/r1/audit-cases.json ENGINE_ROOT=... OUT=...audit-cases-before.json node ... run-adversarial.ts` (the audit's own counterexamples)
- `ORACLE_DIR=<pristine>/tools/mathematics/domain-reasoner OUT=...oracle-before.json python3 -I tools/mathematics/r1/run_oracle.py`
