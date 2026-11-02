# PAT-REGROUP: Regroup at the unit boundary (60 minutes, 100 paise)

**Status:** review candidate (not approved, not registered, not served). Strands: measurement.

**Why this pattern.** 19 families across 10 competencies model a 60/100/24 boundary error (hour-as-100, minute-as-100, paise-over-100, no-carry, past-24); one strategy serves them all.

## The one shared strategy

A bigger unit is made of a fixed number of smaller units: 60 minutes make 1 hour, 100 paise make ₹1.
When the small units add up to that number or more, make one big unit from them and keep the rest as small units. The number to regroup at depends on the unit: 60 for time, 100 for money (10 for ones and tens).

Alternative: **Like carrying, but at 60 or 100** — Carrying in ones and tens happens at 10. Time carries at 60, money at 100.

## Existing material reused (not rewritten)

| Competency | Existing explanation | Covers |
|---|---|---|
| `MATH.measurement.time-unit-conversion` | `spot_the_mistake` | hour-as-100 (an hour taken as 100 minutes) |
| `MATH.measurement.time-unit-conversion` | `clock_round` | the 60-minute hour (general) |
| `MATH.measurement.money-decimals` | `drop_dot` | money as paise (general) |

## Member packages (family-specific parts only)

- [TP2-REG-TIME](TP2-REG-TIME.md): Adding durations: 60 minutes make an hour (`addur`, `MATH.measurement.time-unit-conversion`)
- [TP2-REG-MONEY](TP2-REG-MONEY.md): Adding rupees and paise: 100 paise make ₹1 (`acmoneyadd`, `MATH.measurement.money-decimals`)

## Cross-family contrast diagnostic

1. `gen:addur:0,27` (TP2-REG-TIME, minutes add to 100 or more): A bus ride takes 4 h 50 min and a train ride after it takes 1 h 55 min. How long is the whole journey? Write the answer as (hours, minutes).
2. `gen:acmoneyadd:3,7,11,13,0` (TP2-REG-MONEY, paise add to 100 or more): ₹3.35 + ₹11.65 = ? Write the answer in rupees, like 4.50.

| Answers | Supports | Leaves uncertain | Establishes? |
|---|---|---|---|
| (5, 105) (bug:no-carry); 15.00 (correct) | minutes kept at 100 or more while money is regrouped: the 60-minute boundary is the gap | on a 100+ minute item regrouping at 100 would give (h + 1, minutes − 100), which is different, so hour-as-100 does not explain this answer | **no** |
| (5, 105) (bug:no-carry); 14.100 (bug:paise-over-100) | small units kept past the boundary in both units (100 or more minutes kept as minutes; 100 or more paise written after the dot) | the money answer also fits a notation habit (paise written in full after the dot); two different families: guide the shared concept, do not establish either misconception from this pair | **no** |
| (6, 45) (correct); 14.00 (bug:no-carry) | regroups time but loses the regrouped rupee in money | money-specific; the money no-carry answer also fits adding the rupees only | **no** |
| (6, 45) (correct); 15.00 (correct) | regroups at both boundaries | answer evidence only | **no** |
