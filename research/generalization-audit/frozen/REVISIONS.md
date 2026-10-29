# Benchmark revisions

r1 — frozen before any E7 execution: frozen/benchmark.json, SHA-256 in FREEZE.json (commit 41cbff2). Primary results use r1.

r2 — frozen/benchmark.r2.json, SHA-256 79df2c1adf494586187ba47a252705568e27dd0d91bf1890c13a2fd6cccd7234. One change, found during the post-run review of every decisive failure:
- CAL-0082 (derivative of |2x|, student writes f'(x) = 2): r1 labelled insufficient-information (expected missing-assumption).
  The claim f'(x) = 2 is false for x < 0 (f'(x) = -2 there), so the correct label is invalid. E7 answered invalid.
No other label was changed. Labels where E7's verdict is defensible but differs by grading policy (e.g. ADV-0089/0090,
CAL-0060: E7 says missing-assumption for a wrongly cited log identity) were deliberately NOT changed; they are reported
as class G. Both r1 and r2 scores are reported.
