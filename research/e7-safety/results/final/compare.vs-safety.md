| outcome | before | after | change |
|---|---|---|---|
| correct | 921 | 924 | +3 |
| false-acceptance | 25 | 25 | +0 |
| overclaim | 0 | 0 | +0 |
| false-rejection | 24 | 23 | -1 |
| misgrade | 62 | 62 | +0 |
| safe-abstention | 1343 | 1341 | -2 |
| adapter-defect | 7 | 7 | +0 |

**Before** (rows: expected verdict; columns: E7 verdict)

| expected \ E7 | accept | one-way | objection | reject | abstain | total |
|---|---|---|---|---|---|---|
| accept | 381 | 0 | 19 | 5 | 775 | 1180 |
| one-way | 0 | 41 | 0 | 0 | 22 | 63 |
| objection | 18 | 10 | 89 | 6 | 144 | 267 |
| reject | 7 | 0 | 60 | 287 | 440 | 794 |
| abstain | 0 | 0 | 0 | 0 | 78 | 78 |

**After** (rows: expected verdict; columns: E7 verdict)

| expected \ E7 | accept | one-way | objection | reject | abstain | total |
|---|---|---|---|---|---|---|
| accept | 383 | 0 | 18 | 5 | 774 | 1180 |
| one-way | 0 | 41 | 0 | 0 | 22 | 63 |
| objection | 18 | 10 | 89 | 6 | 144 | 267 |
| reject | 7 | 0 | 60 | 288 | 439 | 794 |
| abstain | 0 | 0 | 0 | 0 | 78 | 78 |

Changed cases: 3

| transition | n |
|---|---|
| safe-abstention -> correct | 2 |
| false-rejection -> correct | 1 |

Regressions: 0

