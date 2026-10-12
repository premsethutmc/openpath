# Baselines

Frozen copies of earlier content, kept so earlier results stay reproducible. Never edit these files.

- `e1/` — the E1 item bank exactly as merged in PR #6 (commit `cb59b3c`): `code-items.json` and
  `passages.json`. Writing tasks, goals and signals have not changed since E1, so they are shared.
  Load it with `loadContext({ bank: "e1" })`.

The E1 simulation results are in `tools/english/baselines/e1-simulation-results.json`. Running the
frozen simulation on the E1 bank reproduces their fingerprint exactly (a test checks this).
