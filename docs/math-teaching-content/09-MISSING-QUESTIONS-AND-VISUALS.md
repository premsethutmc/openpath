# 9. Missing questions and visuals: implementation specifications (PROPOSED, not served)

> **Status: proposals only.** Nothing here is served, integrated or approved. The questions verified as served today are listed separately in [08-INTEGRATION-MANIFEST.md](08-INTEGRATION-MANIFEST.md) (`items`). In `integration-manifest.json` these proposals appear under `proposed`, never under `items`.
>
> Data: `missing-questions.json`, `improper-sum.json`. Tools: `tools/question-specs.mts`, `tools/improper-sum.mts`, `tools/freshness.test.mts` (all read-only). Source commit: `637938c7`.
>
> **Revision (bounded corrections).**
> - MQ5 and MQ6 are now **resolved inside the packages** by freshness@2 (below). They need no pool change and are verified served items.
> - MQ3's recheck stays in hours and minutes. Minutes and seconds are additional transfer practice only.
> - MQ7 (improper-sum diagnostic) is added.
> - V1 and V3 data are now in the packages, but **rendering is blocked**.

Ownership is unchanged. Codex owns runtime scope, answer normalization, misconception ids, contrast requirements and integration. This document only names, for each gap:
- the existing generator;
- the parameters that produce the needed question;
- the partition and role it needs;
- what has to change.

Every proposal reuses an existing generator. No parallel generator is proposed.

## How each gap was classified

The tool searches the generator's **whole** parameter domain, not only the released pool, using the family's own `reject`/`keep`. Each qualifying question gets one of these statuses:

1. **Served and unused:** it is in the required partition and not already used by the package or shown by the module (by exposure key, number signature, or answer where the package requires distinct answers). Only the package selection changes.
2. **Form change only:** it is in the right partition, but `phasePool` serves it as `:mc` and the role needs the typed form.
3. **Blocked by this branch's reuse rule:** it is served in the right partition, but it repeats a signature or answer the package uses. The fix is a decision about that rule, not a code change.
4. **Partition change:** it is released, but hashed into another partition.
5. **Release change:** it is valid, but outside the cap or removed by distinct@1.
6. **Generator change:** no parameter choice in the domain produces it.

Every proposed instance is checked three ways:
- the generator's answer and `validate`;
- this branch's independent prompt-text oracle (the same oracle as the packages);
- the trusted grader (`gradeRequest`), when the item is released.

All proposed instances agree on all checks. Answers below were also worked by hand.

### Side effect of any partition move (applies to MQ1–MQ3)

`phasePool` assigns typed or `:mc` by **position in the sorted partition**: every odd index becomes `:mc`. Moving one item by changing `phaseOf` therefore re-indexes both partitions, and can flip the served form of items the packages already reference.

The tool simulates this. Its simulator reproduces `phasePool` exactly when no move is applied, and it was checked against every package reference in that family.

| Move | Package references whose served form flips, if `phaseOf` is changed | If the move is applied after forms are assigned |
|---|---|---|
| `gen:ahid:0,2,9,1` → retention (+ pin `0,3,7,1` typed) | **3**:<br>`gen:ahid:1,3,8,1` worked example: typed → mc<br>`gen:ahid:1,2,3,1` delayed check: typed → mc<br>`gen:ahid:1,2,6,1` delayed check: typed → mc | 0 |
| `gen:akchance:8,8,0,0` → diagnostic, typed | 0 | 0 |
| `gen:addur:0,7` → check | 0 | 0 |

**Requirement for every move:** implement it as an explicit override list, applied after `phasePool` assigns forms. Remove the item from its old partition and add it to the new one in the stated form. Do not change the hash.

Adding items (MQ3 retention, MQ4) also re-indexes partitions. Any pool change must therefore be followed by re-checking the package references, for example with `tools/manifest.mts`.

## The questions

### MQ1 — TP-ALG-01: unambiguous (px + q)² cross-term questions (diagnostic and retention)

**Generator.** `ahid`, `packages/learning/src/fam/b08.ts:2188`.
- Parameters are `[form, p, q, box]`.
- `idOk` (`b08.ts:1851`) requires form 0–2, p 1–5, q 1–9 and box 0–2. It also rejects (form 2, box 1) and (p 1, box 0).

**Constraint.** The item must be `[0, p, q, 1]`, i.e. form (px + q)² with the box on the x coefficient, and:
- p ≥ 2, p ≠ q, q ≠ 2p and p ≠ 2q;
- neither modelled wrong value (pq or −2pq) appears as a number in the question.

**What exists.**
- 24 such items exist in the domain, all of them released.
- 18 are already used by the package or have the same p, q.

| Role | Proposed | Status → change | Answer (hand check) | Anticipated wrong answers |
|---|---|---|---|---|
| Diagnostic (replaces `gen:ahid:0,4,9,1`, which was borrowed from the check partition) | `gen:ahid:0,3,7,1` | In the diagnostic partition, but served only as `:mc`. **Form change only: pin typed.** | (3x + 7)² = 9x² + 2·3·7x + 49, so **42** | middle-not-doubled **21**; middle-sign **−42** |
| Delayed check (retention) | `gen:ahid:0,2,9,1`<br>(alternative `gen:ahid:0,5,3,1`) | Practice partition. **Partition change → retention.** | (2x + 9)² = 4x² + 36x + 81, so **36** (alternative 25x² + 30x + 9, so **30**) | **18 / −36** (alternative **15 / −30**) |

**Ambiguity.** None found:
- no wrong value is printed in the question;
- pq ≠ p²;
- pq ≠ q².

There is no qualifying retention item today. Of the three retention items that ask the (px + q)² cross term, all are copy-ambiguous (the TP-ALG-01 delayed-check audit). A partition change is therefore unavoidable.

### MQ2 — TP2-CH-BAG: equal-colour-count probability contrast (diagnostic)

**Generator.** `akchance`, `packages/learning/src/fam/b11.ts:634`.
- Parameters are `[r, b, g, q]`.
- The domain is `[[1,9],[1,9],[0,6],[0,3]]` with cap 400.

**Constraint.** `[r, r, 0, 0]`: two colours in equal numbers, asking for red, with r ≥ 2.
- **Two colours, not three:** the unequal diagnostics (`gen:akchance:2,3,2,0` and `gen:anbag:6,9,7,2`) have three colours, where colours-equal gives 1/3.
- **The contrast only works if the belief predicts something other than 1/3 here.** Colours-equal predicts **1/2** on this item, which is also right. A learner who writes 1/3 everywhere is therefore separated from one who applies "1 ÷ number of colours". This is the "not chance" reading that PAT-CHANCE marked unavailable.
- r ≥ 2 avoids `gen:akchance:1,1,0,0`, where odds and count-only both give 1.

**Correction.** Earlier revisions (06, 05, TP2-CH-BAG, 04) said `gen:akchance:6,6,0,0` and `gen:akchance:8,8,0,0` were "in no served partition". **That was wrong.** The check missed their `:mc` ids. They are actually served:
- `gen:akchance:8,8,0,0:mc` in the **check** partition;
- `gen:akchance:6,6,0,0:mc` in the **practice** partition.

The real gap is that no equal two-colour bag is in the **diagnostic** partition, released or not. The other 11 qualifying items are outside the release cap. If released, they would hash into practice or check, and `gen:akchance:1,1,1,0` (three colours) into diagnostic.

| Role | Proposed | Status → change | Answer | Anticipated wrong answers |
|---|---|---|---|---|
| Diagnostic contrast (third item, alongside the two unequal bags) | `gen:akchance:8,8,0,0` | Check partition, served `:mc`. **Partition change → diagnostic, typed.** | 8 red out of 16 marbles: **1/2** | odds **1** (8 : 8); count-only **8**; colours-equal **1/2** (= right: that is the point of the contrast) |

**Ambiguity.**
- The answer 1/2 repeats the answer of `gen:akchance:1,1,0,1:mc` ("not red" from 1 red and 1 blue), which the module's existing teaching shows. That is why this package's distinct-answer rule flags it. The repeat is harmless for a diagnostic, which reveals no answer and comes before teaching, but it should not be used anywhere after that teaching.
- How the three answers combine into a reading is Codex's contrast policy (P1). The cell needed is: 1/3, 1/3, then 1/2 here. That combination supports colours-equal and excludes "1/3 by chance". A different wrong value here contradicts colours-equal.

### MQ3 — TP2-REG-TIME: durations whose minutes total 100 or more (recheck and retention)

**Generator.** `addur`, `packages/learning/src/fam/b04.ts:2140`.
- Parameters are `[mode, x]`, with x from 0 to 99.
- `durParts` (`b04.ts:2830`) makes each minutes part 5 × (hash mod 12), so 0–55.
- A total of 100 or more needs both parts to be 45 or more. Only **3** of the 100 mode-0 seeds qualify:

| Item | Durations | Partition | Status |
|---|---|---|---|
| `0,7` | 55 + 55 | diagnostic | unused |
| `0,27` | 50 + 55 | diagnostic | used as the package's diagnostic |
| `0,57` | 45 + 55 | practice | used as the worked example |

**Constraint.** `[0, x]` (hours and minutes), where the two minute parts add to 100 or more. Then three answers differ:
- no-carry keeps 100+ minutes;
- regrouping at 100 gives (h + 1, m − 100);
- the correct answer gives (h + 1, m − 60).

| Role | Proposed | Status → change | Answer (hand check) | Anticipated wrong answers |
|---|---|---|---|---|
| Recheck | `gen:addur:0,7` | Diagnostic partition. **Partition change → check.** | 3 h 55 min + 2 h 55 min = 5 h 110 min, so **(6, 50)** | no-carry **(5, 110)**; carry-kept **(6, 110)**; regroup at 100 (the module's spot-the-mistake "hour-as-100", not an `addur` bug) **(6, 10)** |
| Delayed check (retention) | `gen:addur:0,291` | **Generator change (bounds only):** allow x up to 299 for mode 0 (`reject` and `domain`), with no new logic. Seed 291 then hashes into **retention** without any override. | 3 h 55 min + 4 h 50 min = 7 h 105 min, so **(8, 45)** | **(7, 105)**; **(8, 105)**; hour-as-100 **(8, 5)** |

Notes on the retention row:
- Seeds 100–299 add 8 more mode-0 items with 100+ minutes. Besides 291, these include `0,281` (check: 4 h 55 + 1 h 50 = **(6, 45)**) and `0,265` (check: **(8, 45)**).
- The durations shown for seeds above 99 are predicted with the same hash. They must be re-checked by the generator once the bound changes.
- The bound change adds items, which re-indexes forms (see the side-effect section above).

**The recheck stays in hours and minutes.** The recheck must test the package's own skill (60 minutes make an hour), so it is `gen:addur:0,7` after the partition change.

`gen:addur:1,39` (minutes and seconds) is served typed in the check partition today:
- "Priya runs two laps in 4 min 55 s and 1 min 50 s": **(6, 45)**; no-carry **(5, 105)**; carry-kept **(6, 105)**.
- It may be added only as **additional transfer practice**: the same regrouping idea with a different unit.
- It is never the recheck and never its replacement, and it is not evidence for the hours-and-minutes skill.
- Using it needs TP2-REG-TIME's restriction widened for that one transfer role.

**Ambiguity.** None. All the predicted values differ from each other and from the answer.

### MQ4 — TP-NUM-02: everyday transfer question for adding like fractions

**Generator.** `fadd`, `packages/learning/src/families.ts:116`.
- Parameters are `[a, b, n, s]`, where s = 1 means addition.
- The family has **no `word(p)`** (D5). `problemOf("…:w")` therefore returns null and no transfer item can exist.

**Change: generator change, small.** Add `word(p)` to the existing `fadd` definition. This is the family-kit contract: "the same mathematics in an everyday situation … Same answer".
- It needs no new family, `solve`, `validate` or bugs.
- Return text only for addition with a + b < n, so the parts are of one whole and the total is less than one whole. Leave subtraction and sums of one whole or more with no word form.

**Proposed template.** "Meena cut a cake into {n} equal pieces. She ate {a} piece(s) and her brother ate {b} piece(s). What fraction of the cake did they eat altogether?"
- Use singular "piece" when the count is 1 (see D8 for the same agreement defect elsewhere).

**Required role.** Transfer (`:w`), drawn from the practice partition. Each item must also:
- not repeat a TP-NUM-02 number signature or answer;
- have distinct wrong values.

| Proposed (`:w` once `word` exists) | Answer | add-denominators | multiply-tops |
|---|---|---|---|
| `gen:fadd:1,2,5,1:w` | 1/5 + 2/5 = **3/5** | 3/10 | 2/5 |
| `gen:fadd:1,2,4,1:w` | **3/4** | 3/8 | 2/4 |
| `gen:fadd:1,2,11,1:w` | **3/11** | 3/22 | 2/11 |

**Ambiguity.**
- Avoid items where add-denominators equals multiply-tops. For example, `fadd:1,1,3,1` gives 1/3 for both.
- Answers that simplify (for example 1,2,9 gives 3/9 = 1/3) need both forms accepted. That is answer normalization, which belongs to Codex.

The improper-sum diagnostic gap in NUM-02 is specified in MQ7.

### MQ5 — TP-PRO-01: different-size-spinner recheck

**Generator.** `akdice`, `packages/learning/src/fam/b11.ts:803`.
- Parameters are `[m, n, q, k]`.
- `reject` requires m ≥ 3, n ≤ 6, m ≤ n and q 0–2. When q = 0, k must be from 2 to m + n.

**Constraint.** `[m, n, 0, k]` with m ≠ n and 2 < k < m + n, so the total is made by at least two pairs.

**Before.**
- All 36 such items are released, and six are in the check partition.
- Every one was blocked only by this branch's distinct-answer rule. The package's "different-size" recheck slot was filled by `gen:akdice:4,6,0,10:mc`, which is a single-pair total.

**Now (freshness@2, built into the package).**

| Recheck | Served as | Answer (hand check) | Anticipated wrong answers |
|---|---|---|---|
| **`gen:akdice:4,5,0,5`** | check, typed | (1,4), (2,3), (3,2), (4,1) out of 4 × 5 = 20: **1/5** | totals-equally-likely **1/8** (8 possible totals, 2–9); added-sides **4/9** (4 pairs out of 4 + 5) |

- Its answer 1/5 repeats the misconception example `gen:akdice:3,5,0,6`. That example is a different problem (other spinners, other total), so freshness@2 allows it.
- Neither wrong value equals an answer the learner has been shown.
- `gen:akdice:4,5,0,4` (proposed earlier) is now **excluded**. Total 4 on spinners 1–4 and 1–5 is the diagnostic `4,5,0,7` relabelled: renumbering each face x → (size + 1 − x) maps total k to 11 − k and pairs to pairs.
- `gen:akdice:5,6,0,3`, `5,6,0,8` and `5,6,0,9` are **excluded** by the shown-answer guard. Their totals-equally-likely value (1/10) is the answer of the worked example `4,5,0,3`.

### MQ6 — TP2-PV-DIGIT: "how many tens" recheck

**Generator.** `aadigit`, `packages/learning/src/fam/b01.ts:1691`.
- Parameters are `[n, kind]`; kind 1 asks "how many tens".
- The domain is two-digit numbers, so the answer is always the tens digit, 1–9.

**Constraint.** `[n, 1]` with two different digits. The tens digit, which is the answer, must differ from the answers of the items the learner was **shown**.

**Before.**
- 81 such items exist, all released, and 16 are in the check partition.
- Every one was blocked only by this branch's `q:1:<tens>` key. That key is in effect an answer key, and the package already uses each of the nine possible tens counts somewhere.
- No two-digit item can avoid repeating a tens count. Three-digit numbers would be a different, harder skill.

**Now (freshness@2, built into the package).**

| Recheck | Served as | Answer | Anticipated wrong answers |
|---|---|---|---|
| **`gen:aadigit:28,1:mc`** ("how many tens") | check, `:mc`; options 3, 2, 8, 20 | 28 = 2 tens and 8 ones: **2** (B) | value-not-count **20** (D); wrong-digit **8** (C) |
| `gen:aadigit:39,0:mc` (value of the tens digit; replaces `50,0`) | check, `:mc`; options 9, 3, 31, 30 | **30** (D) | face-value **3** (B); wrong-digit **9** (A) |

Both PV-DIGIT rechecks are now served as `:mc` (previously typed). In `28,1:mc`, the non-target option 8 equals the answer of the shown item `82,1`: the shown-answer guard covers target wrong values only.

- Answer 2 repeats the guided `gen:aadigit:26,1:mc`, which is a different number, so freshness@2 allows it. The answer digit is printed in the question by construction anyway.
- Under freshness@2, the same number asked any other way is the same problem (`problem:digit:n`).
- The shown-answer guard also replaced the earlier value rechecks:
  - `50,0`: its face-value error (5) is the answer of the worked example `56,1`;
  - `20,0`: its face-value error (2) is the answer of the guided `26,1`.
- `gen:aadigit:39,1`, proposed earlier, is still fresh. The build takes the first fresh item in the served order, which is 28,1. 39,1 remains a valid alternative.

## Freshness rule, revised (freshness@2)

| | Before | Now |
|---|---|---|
| Recheck blocked by | same exposure key, number signature, or **answer** (PRO-01's distinct-answer rule; PV-DIGIT's tens-count key) | same exposure key (covering the `:mc` form and distinct@1 duplicates), or the same **problem**: the same numbers, or the same problem relabelled |
| Repeated answer of a different question | blocked | **allowed** |
| Target wrong value equals an answer the learner was shown | not checked | **blocked**: a copied answer would read as the misconception |
| Scope | — | rechecks of TP-PRO-01 and TP2-PV-DIGIT (`recheckProblem` in the package definitions; `sigR`/`freeR` in `tools/build.mts`) |

Other roles and packages keep their rules unchanged. The full rebuild was compared file by file with the previous build:
- only TP-PRO-01 and TP2-PV-DIGIT changed, and only in their rechecks (every other role keeps the same items);
- TP-NUM-01 and TP-GEO-01 changed only in their corrected visuals (V1, V3);
- every other package file is byte-identical.

**Tests** (`tools/freshness.test.mts`): **18 passed, 0 failed.**
- **Excluded:**
  - the same question;
  - its `:mc` form;
  - the mirror (relabelled) total;
  - the same number asked another way.
- **Allowed:** a different problem with the same answer (each of these was blocked under the old rule).
- **Guard rejections:** `5,6,0,3` and `50,0`.
- **Built rechecks:** no collision and no copy risk.
- **Pools:** no two served `akdice` or `aadigit` questions show the same thing (distinct@1).

**Known limits** (review pass 7, notes):
- A recheck may share its **answer** with a shown item (`4,5,0,5` and `3,5,0,6`: 1/5; `28,1` and `26,1`: 2). A learner copying that answer would pass. The guard stops a copied answer from being read as the misconception; it does not stop copying.
- `shownAnswers` counts the same family only.
- Other roles detect problem-key clashes in the reuse audit (a build failure), not during selection. There are none today.
- `missing-questions.json` "available" counts apply the problem keys but not the shown-answer guard. The build applies both.

### MQ7 — TP-NUM-02: improper-sum diagnostic (sum above one whole)

**Existing generators.**
- `fadd` (`families.ts:116`; release rule at `families.ts:1192`) releases **220** additions and **none** with a sum above one: `keep` requires a + b < n.
- No other family adds like fractions to more than one whole. `faddu` and `avfas` are unlike-denominator families (`fraction-add`), and the only like-denominator sums elsewhere are integer, property or distributive items.
- So **no suitable item exists today**.

**Same skill, same generator.** `fadd`'s `reject`, `solve`, `validate` and bugs all accept a + b > n: `keep` is a release filter, not a validity rule. `problemOf` builds the item, and the family's independent `validate` accepts the answer.

| Proposed | Partition (hash) | Answer (hand check) | Modelled wrong answers | Unmodelled readings (no diagnosis) |
|---|---|---|---|---|
| **`gen:fadd:4,2,5,1`**: "4/5 + 2/5 = ?" | diagnostic, typed | 4 fifths + 2 fifths = 6 fifths: **6/5** (= 1 1/5) | add-denominators **6/10** (value 3/5; the written form 6/10 is the NUM-02 trigger); multiply-tops **8/5** | whole dropped **1/5**; capped at one **1** (or 5/5) |

**Checks** (`tools/improper-sum.mts`):
- the generator answer, the family's `validate`, this branch's prompt-text oracle and the number-line method all give 6/5;
- all four wrong values are distinct, differ from the answer and are not printed in the question;
- gcd(6, 5) = 1, so the answer needs no simplifying;
- its numbers and answer do not repeat any TP-NUM-02 item.

**What it adds.**
- add-denominators gives 6/10, **less than either addend's 4/5**. That is a sense-check that the below-one item cannot offer.
- It shows whether answers above one are accepted.
- Accepting 1 1/5 as well as 6/5 is answer normalization, which belongs to Codex.

**Smallest change: a one-item release override** that serves `gen:fadd:4,2,5,1` in the diagnostic partition, **typed** (Codex, pool).
- No release-override mechanism exists today: `question-status` can only quarantine.
- If the item were simply added to the pool, it would sort to index 73 of 80 in the diagnostic partition. It would then be served as `:mc` itself, and it would flip the form of 6 other diagnostic items, none of them referenced by TP-NUM-02 or the module.
- The override must therefore place the item outside `phasePool`'s typed/`:mc` alternation, or pin it to the package.

**Required with it (Codex owns misconception ids).** The two errors this item exists to catch are **not modelled** as `fadd` bugs:
- whole dropped: **1/5**;
- capped at one: **1** or 5/5.

Today both would grade as plain "incorrect", with no reading. Add them (for addition with a + b > n) so the diagnostic can name them.

**Not recommended: relaxing `keep`** (`a + b < n` → `a < n && b < n && a + b ≠ n`):
- it releases **220** new items;
- the simulation, which matches `phasePool`, shows **9 referenced TP-NUM-02 items would flip** between typed and `:mc`, including the diagnostic `gen:fadd:3,5,9,1` (typed → `:mc`);
- it is acceptable only if existing items' served forms are frozen.

**Ambiguity.**
- The value 3/5 also fits "averaging". As on the existing item, only the written form 6/10 supports add-denominators (P1, Codex).
- A single answer establishes nothing.

## The five visuals: existing primitives plus minimal renderer requirements

There are two render paths. Both take `Screen.widget`, a family-kit `Visual`:
- **strategy screens**, through `Learn.tsx` `Picture`, which handles `strips` and `array` and passes everything else to `Figure`;
- **lesson blocks**, through `curriculum/TeachingContent.tsx`, which passes `block.widget` to `Figure` only. Its `TeachingVisual` comes from `familyTeachingVisual`.

The `Visual` interface has an index signature, so the new optional fields below need **no type change**. Each requirement is:
- one optional field;
- its drawing, in `Figure.tsx` (or `Learn.tsx` for strips);
- one clause in `describe()` (the aria text).

The tool generated each data object from the package's own worked-example and diagnostic instances, and checked it against the instance across the **whole family pool**:

| Visual | Family | Pool items | Items with an issue | Issue rule |
|---|---|---|---|---|
| V1 | `adfcmp` | 500 | 0 | strips must equal the question's fractions and `familyTeachingVisual(adfcmp)` |
| V2 | `aeperar` | 400 | 0 | labels must equal the question's sides and must not show the answer |
| V3 | `ahext` | 400 | 0 | labels must be numbers of the question; the answer is never labelled; the adjacent interior angle stays unlabelled |
| V4 | `afcross` | 300 | 0 | `deg` must be the given angle; no label other than the given one shows the answer |
| V5 | `ahid` (forms 0–1) | 252 | 0 | the cells must be p², ±pq, ±pq and q², and the two rectangles must add to the checked middle coefficient |

### V1 — TP-NUM-01: paired fraction strips of equal length

> **Package status:** the TP-NUM-01 package now carries this data, with a `description` (screen-reader text), and the earlier two-grid placeholder is removed. **Rendering is blocked:** today's renderer cannot draw it correctly. `Learn.tsx` derives the second row's shading and has no `bottomShaded`, and `Figure.tsx` has no `strips` case. The screen must stay text-only until Codex adds both.

**Existing primitives.**
- The `strips` widget (`Learn.tsx` `Picture`: two rows of equal width, `top` parts with `shaded` shaded, then `bottom` parts).
- On the lesson page, `TeachingVisual` `fraction-strip` with `comparison`. `familyTeachingVisual` **already produces this for `adfcmp`** (`teaching-presentation.ts:270`).

**Today's defect.** The package's provisional visual (two `grid` strips) draws unequal wholes: the cell size is `min(30, 360/cols)`, so 9 columns are 270 px wide and 11 columns are 330 px. **It is superseded by V1.**

**Data.**
```json
{ "type": "strips", "top": 9, "shaded": 1, "bottom": 11, "bottomShaded": 1, "labels": ["1/9", "1/11"] }
```

**Minimal requirements.**
1. Add `bottomShaded?: number` to `strips`. Today the second row's shading is derived as `round(shaded × bottom / top)` (an equivalent fraction). That is wrong for comparison: for 1/3 against 1/9 it shades 3 of 9.
2. Add optional `labels` to name each row.
3. Add a `strips` case to `Figure.tsx` (render and `describe()`), reusing the `Learn.tsx` markup. `TeachingContent` sends widgets only to `Figure`, which today falls through to the "A picture" placeholder.
4. aria text: "Two strips of the same length: 9 equal parts with 1 shaded (1/9), and 11 equal parts with 1 shaded (1/11)".
5. On the `fraction-strip` lesson path, make the caption neutral when the two fractions differ. The current caption, "Equal fractions cover the same length of the same whole", is about equivalence.

### V2 — TP-MEA-01: perimeter outline

**Existing primitive.** `Figure` `shape` with `kind: "rectangle"`. It already draws the outline and puts one `lengths` label per side. For covering, the existing `grid` with every square shaded stays as the contrast.

**Data (going round).** All four sides are labelled, which addresses the two-sides error.
```json
{ "type": "shape", "kind": "rectangle", "name": "rectangle", "lengths": ["10 cm", "9 cm", "10 cm", "9 cm"], "outline": true }
```

**Minimal requirements.**
1. Add `outline?: boolean`. When true, draw with fill `none` and stroke `ACC` at width 3–4, so the edge, not the inside, is what is emphasised.
2. In `describe()`, add ", drawn as an outline".

It needs no new shape. The answer is never labelled.

### V3 — TP-GEO-01: triangle with an extended side and its exterior angle

> **Package status:** the TP-GEO-01 package now carries this data, with `notToScale: true` and a `description` (screen-reader text, which says "not drawn to scale"). The placeholder that put the second opposite angle next to the exterior angle is removed. **Rendering is blocked:** `Figure.tsx` ignores `exterior` and `notToScale`, so it would draw a plain triangle with no extended side. The screen must stay text-only until Codex adds both fields.

**Existing primitive.** `Figure` `triangle`: fixed vertices P0 (20,160), P1 (240,160), P2 (100,30), with `angles[i]` labels at vertex i.

**Data.** The exterior angle is at P1, on side P0→P1 extended. Its two **opposite** interior angles are therefore at P0 and P2, and the interior angle at P1 stays unlabelled.

Asking for the exterior angle:
```json
{ "type": "triangle", "angles": ["39°", "", "112°"], "exterior": { "at": 1, "label": "?" }, "notToScale": true }
```

Asking for the other opposite angle:
```json
{ "type": "triangle", "angles": ["93°", "", "?"], "exterior": { "at": 1, "label": "129°" }, "notToScale": true }
```

**Correction.** The package's provisional data put the second opposite angle at P1 (`angles: [a, b, ""]`). That is the wrong vertex. **It is superseded by V3.**

**Minimal requirements.**
1. Add `exterior?: { at: 1; label: string }`.
2. Draw the extension of P0→P1 beyond P1, for example to (310,160). The viewBox needs widening from 260 to about 320.
3. Draw an arc at P1 between the extension and side P1→P2, with the label on its bisector.
4. Add `notToScale?: boolean`. It renders a small "not to scale" caption, and `describe()` appends "(not drawn to scale)". The vertices are fixed, so an angle such as 112° is drawn at about 79°.
5. `describe()`: "A triangle with one side extended; the two opposite interior angles are 39° and 112°; the exterior angle is marked ?".

Drawing to scale is optional, and is a decision for Codex. Nothing is read from the picture.

### V4 — TP-GEO-02: two crossing lines with four angles

**Existing primitive.** `Figure` `angle`: one horizontal ray, one ray at `deg` drawn to scale, and an arc.

**Data.** The angles are numbered anticlockwise from the given one:
- 0 is the given angle;
- 1 is next to it;
- 2 is opposite;
- 3 is next to it on the other side.

Opposite:
```json
{ "type": "angle", "deg": 128, "cross": true, "labels": ["128°", "", "?", ""] }
```
Next to it:
```json
{ "type": "angle", "deg": 149, "cross": true, "labels": ["149°", "?", "", ""] }
```
"The other three together": `["a°", "?", "?", "?"]`.

**Minimal requirements.**
1. Add `cross?: boolean`. When true, move the vertex to the centre and draw both lines through it in both directions.
2. Add `labels?: string[4]`. Draw a non-empty label at radius about 40 on the bisector of angle i. The bisectors are at θ/2, θ + (180 − θ)/2, 180 + θ/2 and 180 + θ + (180 − θ)/2. Draw an arc for each labelled angle.
3. `describe()`: "Two straight lines crossing, making four angles: one is 128°; the angle opposite it is marked ?".

For "opposite", the answer equals the given angle. That equality is the property being taught, not a leak.

### V5 — TP-ALG-01: labelled 2 × 2 area model

**Existing primitive.** `Figure` `grid` with `rows: 2, cols: 2`. This is `ahid`'s own "area" alternative visual (`b08.ts`), which today has no labels.

**Data.**
- Concept (symbolic):
  ```json
  { "type": "grid", "rows": 2, "cols": 2, "colLabels": ["a", "b"], "rowLabels": ["a", "b"], "labels": ["a²", "ab", "ab", "b²"] }
  ```
- Worked example, from the instance (5x + 2)²:
  ```json
  { "type": "grid", "rows": 2, "cols": 2, "colLabels": ["5x", "2"], "rowLabels": ["5x", "2"], "labels": ["25x²", "10x", "10x", "4"] }
  ```
- For (3x − 8)²:
  ```json
  { "labels": ["9x²", "−24x", "−24x", "64"], "colLabels": ["3x", "−8"], "rowLabels": ["3x", "−8"] }
  ```

**Minimal requirements.**
1. Add `labels?: string[]` (row-major; one centred text per cell). Labelled cells are drawn unshaded.
2. Add `rowLabels?` and `colLabels?`, drawn outside the left and top edges. The canvas needs about 24 px more.
3. `describe()`: "A square cut into four parts: 25x², 10x, 10x, 4; sides 5x and 2".

Equal cell sizes are acceptable (the picture is schematic), so proportional sizes are not required.

**Constraint.** The instance version shows the two rectangles, which add to the answer. Use it **only** on worked-example and strategy screens, **never** on a diagnostic, recheck or delayed item. Whether the cell numbers pass the lesson's instance-number check (`teaching-contract.ts` `instanceNumbers`) is Codex's to decide.

## Implementation-ready list

**Verified served items (in the packages now; no change needed):**
- TP-PRO-01 recheck `gen:akdice:4,5,0,5`;
- TP2-PV-DIGIT rechecks `gen:aadigit:28,1:mc` and `gen:aadigit:39,0:mc`.

**Proposed pool and generator changes (Codex):**

| # | Change | Kind |
|---|---|---|
| 1 | TP-ALG-01 diagnostic → `gen:ahid:0,3,7,1`, pinned to the typed form | form pin |
| 2 | TP-ALG-01 retention: add `gen:ahid:0,2,9,1` to retention | override applied after forms are assigned |
| 3 | TP2-CH-BAG contrast: `gen:akchance:8,8,0,0` → diagnostic, typed | override applied after forms are assigned |
| 4 | TP2-REG-TIME recheck (hours and minutes): `gen:addur:0,7` → check | override applied after forms are assigned |
| 5 | TP2-REG-TIME retention: `addur` mode-0 bound x ≤ 299; then `gen:addur:0,291` is in retention | generator bounds |
| 6 | TP-NUM-02 transfer: `fadd.word(p)` (template above) | generator, one function |
| 7 | TP-NUM-02 improper-sum diagnostic: release `gen:fadd:4,2,5,1` into diagnostic | one-item release override |
| 8 | Optional: `gen:addur:1,39` as additional minutes-and-seconds transfer practice for TP2-REG-TIME | package restriction (transfer role only) |

**Unsupported visuals (renderer, Codex).**
- V1 and V3 data are in the packages but **blocked**.
- V2, V4 and V5 are specified only.
- Each needs the optional fields and `describe()` clauses above.

## Decisions still open

- **A. Exterior-angle triangle.** Keep it not to scale (the minimum), or draw it to scale?
- **B. Override mechanism.** An explicit override list applied after form assignment (or frozen forms for existing items) is required to avoid the form flips shown above. How to implement it is Codex's choice.
- **C. Wider freshness@2.** The other packages with a distinct-answer rule (TP-NUM-02, TP-STA-01, TP2-SCL-BAR, TP2-CH-BAG, TP2-CH-BALL) are unchanged. Should freshness@2 replace their rule too? That would re-select their items and need re-review.
- **Resolved:**
  - *recheck answer reuse* is settled by freshness@2;
  - *seconds as the recheck* is settled: hours and minutes only; seconds are transfer practice.
