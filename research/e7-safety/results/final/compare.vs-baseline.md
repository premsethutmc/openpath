| outcome | before | after | change |
|---|---|---|---|
| correct | 866 | 924 | +58 |
| false-acceptance | 27 | 25 | -2 |
| overclaim | 0 | 0 | +0 |
| false-rejection | 85 | 23 | -62 |
| misgrade | 68 | 62 | -6 |
| safe-abstention | 1329 | 1341 | +12 |
| adapter-defect | 7 | 7 | +0 |

**Before** (rows: expected verdict; columns: E7 verdict)

| expected \ E7 | accept | one-way | objection | reject | abstain | total |
|---|---|---|---|---|---|---|
| accept | 327 | 5 | 68 | 17 | 763 | 1180 |
| one-way | 0 | 41 | 0 | 0 | 22 | 63 |
| objection | 19 | 10 | 89 | 6 | 143 | 267 |
| reject | 7 | 0 | 61 | 287 | 439 | 794 |
| abstain | 1 | 0 | 0 | 0 | 77 | 78 |

**After** (rows: expected verdict; columns: E7 verdict)

| expected \ E7 | accept | one-way | objection | reject | abstain | total |
|---|---|---|---|---|---|---|
| accept | 383 | 0 | 18 | 5 | 774 | 1180 |
| one-way | 0 | 41 | 0 | 0 | 22 | 63 |
| objection | 18 | 10 | 89 | 6 | 144 | 267 |
| reject | 7 | 0 | 60 | 288 | 439 | 794 |
| abstain | 0 | 0 | 0 | 0 | 78 | 78 |

Changed cases: 72

| transition | n |
|---|---|
| false-rejection -> correct | 49 |
| false-rejection -> safe-abstention | 13 |
| misgrade -> correct | 6 |
| safe-abstention -> correct | 2 |
| false-acceptance -> correct | 1 |
| false-acceptance -> safe-abstention | 1 |

Regressions: 0

