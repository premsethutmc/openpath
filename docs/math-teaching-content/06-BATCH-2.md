# 6. Teaching batch 2: five instructional patterns (review candidates)

Batch 2 is organised by **pattern**, not by wrong answer (07 gives the ranking). Each pattern file (`batch-2/PAT-*.md|json`) holds:
- the **one shared strategy** (concept and alternative explanation);
- the **existing explanations it reuses** (not rewritten);
- its member packages;
- a **cross-family contrast diagnostic** with a response-pattern table (what each combination of answers supports, what it leaves uncertain, and whether it may establish a diagnosis).

Member packages (`batch-2/TP2-*`) contain only what is family-specific: examples, the oracle, and fixes for beliefs that **no existing explanation already covers**. They have the same structure, checks and integration specification as batch 1.

| Pattern | Strands | Members |
|---|---|---|
| [PAT-REGROUP](batch-2/PAT-REGROUP.md) Regroup at the unit boundary (60 minutes, 100 paise) | measurement | TP2-REG-TIME, TP2-REG-MONEY |
| [PAT-SCALE](batch-2/PAT-SCALE.md) One picture or line stands for the key | statistics | TP2-SCL-PICT, TP2-SCL-BAR |
| [PAT-PARTS](batch-2/PAT-PARTS.md) The bottom number counts all the equal parts | number | TP2-PRT-NAME, TP2-PRT-SHADE |
| [PAT-PLACE](batch-2/PAT-PLACE.md) What a digit is worth depends on its place | number | TP2-PV-DIGIT (TP-NUM-03 in batch 1 is the decimal case) |
| [PAT-CHANCE](batch-2/PAT-CHANCE.md) Count equally likely outcomes, not categories | probability | TP2-CH-BAG, TP2-CH-BALL (TP-PRO-01 in batch 1 is the two-stage case) |

| Package | Family | Competency | New strategies | Existing misconception explanation in the module (reused) | Items passing checks | Oracle + alternatives on the whole applicable pool |
|---|---|---|---|---|---|---|
| [TP2-REG-TIME](batch-2/TP2-REG-TIME.md) | `addur` | `measurement.time-unit-conversion` | 2 | spot_the_mistake (hour-as-100) | 14/14 | 99/99 |
| [TP2-REG-MONEY](batch-2/TP2-REG-MONEY.md) | `acmoneyadd` | `measurement.money-decimals` | 3 | spot_the_mistake (wrote-together) | 17/17 | 240/240 |
| [TP2-SCL-PICT](batch-2/TP2-SCL-PICT.md) | `acpicttab` | `statistics.pictographs` | 2 | spot_the_mistake (no-key) | 15/15 | 300/300 |
| [TP2-SCL-BAR](batch-2/TP2-SCL-BAR.md) | `afbar` (module seed) | `statistics.scaled-bars` | 1 (no concept strategy: the family is already taught) | spot_the_mistake (count-lines) | 16/16 | 360/360 |
| [TP2-PRT-NAME](batch-2/TP2-PRT-NAME.md) | `adfname` | `number.fraction-models` | 3 | — | 17/17 | 145/145 |
| [TP2-PRT-SHADE](batch-2/TP2-PRT-SHADE.md) | `adshade` | `number.fraction-models` | 2 | — | 14/14 | 300/300 |
| [TP2-PV-DIGIT](batch-2/TP2-PV-DIGIT.md) | `aadigit` | `number.place-value-tens` | 3 | spot_the_mistake (count-blocks) | 20/20 | 234/234 |
| [TP2-CH-BAG](batch-2/TP2-CH-BAG.md) | `akchance` (module seed) | `probability.chance-language` | 1 | spot_the_mistake (odds) | 14/14 | 317/317 |
| [TP2-CH-BALL](batch-2/TP2-CH-BALL.md) | `anbag` (module seed) | `probability.classical` | 1 | spot_the_mistake (odds) | 14/14 | 400/400 |

Totals: **141/141 instances pass. 2,395/2,395 applicable pool items agree** (oracle and every alternative method). 18 new strategies are proposed.

## Not duplicated

- For the three seed families (`afbar`, `akchance`, `anbag`), the module's general teaching and its "spot the mistake" already exist. Only the beliefs those explanations do not address get a new strategy.
- The pattern files list the general explanations reused across modules: `clock_round`, `drop_dot`, `skip_count`, `equal_parts`, `bundles`, `scale_words`, and batch-1 TP-PRO-01.

## Oracles that read figure data

Five families answer from a figure: the pictograph or table, bars, grids, blocks and colour table. The oracle reads the **figure data object the renderer receives**, so the question's own facts are read, not a drawn picture. Nothing is inferred from appearance; the same principle was applied to geometry in G5.

## Recorded gaps inside batch 2

- `akchance`: the equal-colour-count contrast item exists only outside every served partition (`gen:akchance:6,6,0,0`, `gen:akchance:8,8,0,0`). The only partitioned candidate, `gen:akchance:1,1,0,0`, is ambiguous because two errors give the same value. PAT-CHANCE therefore uses a marbles + balls cross-check, and records that "not chance" cannot be shown.
- `aadigit`: numbers with two equal digits are excluded, because "the value of the digit 1 in 11" is ambiguous.
- Pictographs: no-key (reading) is already taught. The package adds one-each (drawing) only.
