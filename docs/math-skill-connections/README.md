> **Current integration status (2026-11-02):** The sections below record earlier branch handovers, not an assertion that their blockers or coverage claims still apply. The shared task validator now uses the trusted grader on the actual question variant; supported choice/fraction/tuple/set examples are no longer rejected by `Number()`. Prepared choice mappings remain deliberately unregistered pending domain integration review. Prerequisite-only strategies are excluded from target-teaching connections, while optional prerequisite help remains available.
>
> PR101's author-time half-picture correction was incomplete. The subsequent integration uses Claude's `81923a1` tuple data through `SubSkillDef.parameterTuples` in `pictographs-subskills@3` / `pictographs-subskill-projection@3`. Mapping history: @1 legacy (every row task, overclaims), @2 PR101 withdrawal (row tasks earn no skill evidence), @3 precise; each is exported for replay (`PICTOGRAPHS_MAPPING_HISTORY`) and tested on one saved ledger. Whole-picture rows retain ordinary answer grading but earn no half-symbol evidence; the three former TODO classification/projection/selection regressions are active and pass. Saved records are not rewritten. See `../math-answer-contract-integration/known-mapping-gap.json` for the before/after evidence. The original total `fix_assume_tens` is preserved; the separate read-bar candidate is `fix_assume_tens_read`, pending review. Generated connection reports remain mechanical evidence, not educator approval or curriculum completion.

# Mathematics skill connections

Stacked on foundation PR96, `feat/shared-math-foundation-local` at `637938c7da0416b03595fae60a80607e60aa84c0`. This branch does not merge or alter that PR. No deployment or global activation.

## Reuse and ownership

| Responsibility | Existing implementation reused | This milestone |
|---|---|---|
| Question semantics and answers | `families.ts`, family validators, server grader | Validate parameter-selected tasks; no new solver |
| Evidence and retention | `subskill-projection.ts`, existing ledger and retention cycles | Optional parameter predicates, reject ambiguous mappings, preserve older mappings |
| Teaching and selection | `intervention.ts`, review gates, `foundation-runtime.ts` | Preserve a delivered block's skill through guided work and reassessment |
| Diagnosis | `hypotheses.ts`, discriminating probes | Opt-in saved hypotheses require same-skill teaching and resolution evidence |
| UI and persistence | Existing Year, lessons, working input, Django event API | Reused without layout or theme changes |
| Content authorship | Claude owns `docs/math-teaching-content/` | Claude directory untouched; three existing candidates integrated through runtime contracts, no new approvals |
| Research | `openpath-research` at `46fcf5f` | Existing dashboard status maintained on its separate private branch; no estimator or experimental-state activation |

## Contract

A `SubSkillDef` may supply `parameters: [{index, values}]`. These are AND conditions on parameters of a valid generator question; matching multiple skills fails closed. Classification verifies the matched skill's actual competency, including the existing explicit linear-intro prerequisite mapping. No question-text inference is used.

`skill-connections.ts` configures square-identity coefficient tasks and five angle relationships. Existing linear-equation, addition and triangle configurations are reused. The older angle mapping remains available and unchanged; the opted-in pathway uses version 2. Correct constants cannot establish the square's middle coefficient, and opposite-angle answers cannot establish adjacent-angle calculations.

Teaching connections require valid guided and check tasks for the same skill, nonempty teaching screens and the existing teaching/content review gates. This is mechanical validation, not educator approval or proof of explanation quality. A missing connection produces an unavailable/content-gap result. Ordinary chapter access and optional prerequisite help remain available.

A delivered block keeps its skill through guided practice and a fresh reassessment. An assisted reassessment completes the instructional block without becoming independent evidence. Later independent practice/transfer/retention also prevents an old lesson from reopening. Active investigation, recovery and handover retain ownership. Checks exclude previously attempted, unresolved, pending and explicitly taught examples.

Existing misconception thresholds remain: one wrong answer does not diagnose a misconception. For opted-in sessions, saved teaching and resolution probes must match the observed skill as well as the existing diagnostic requirements. Legacy scope remains where safe; declared contrast requirements apply to the original task context, and malformed declarations fail closed.

Working stays with the existing trusted checker contracts and immutable decisions. These mappings add no checker authority. Square-identity expression working remains unsupported; a correct numeric coefficient is answer evidence only.

## Audit and limits

Run from `frontend`: `node --import tsx ../tools/mathematics/connection-audit.mts`.

The deterministic report inventories all 353 shared mathematics graph competencies, distinguishing missing modules, missing skill metadata, teaching/check/retention/diagnostic gaps, and bounded versus unsupported working. It checks candidate answers with the generator validator, validates teaching guided/check alignment, and applies quarantine/review gates. Counts describe engineering connections, not curriculum completion or learner outcomes. Content currently has connected answer chains in more than one domain, but every configured competency still has gaps. Numeric identity calculation (`ahidn`) is deliberately unmapped.

Claude candidate schema: competency; family; parameter conditions; guided and fresh-check IDs; explanation/worked-example/hints; diagnostic predictions with evidence requirements; source references; proposed retention task; mathematical validation; educator-review status. Staging stays under `docs/math-teaching-content/`, outside runtime and generated registries.

## Validation

See `validation.md` for final commands and outcomes. Frozen benchmarks, historical results and workflow definitions are unchanged.

## Other mathematics topics

The inventory uses the shared graph’s actual domain/strand labels across supported ages and curricula. “Partial” means explicit skill contracts exist but the competency is not fully connected. A missing working checker is not a missing answer grader. The working columns inspect existing diagnostic/guided/check examples only.

| Domain | Competencies | No module | No precise skill mapping | Partial | No eligible general teaching | No bounded working in inspected examples |
|---|---:|---:|---:|---:|---:|---:|
| algebra | 58 | 2 | 54 | 2 | 0 | 52 |
| calculus | 34 | 5 | 29 | 0 | 1 | 29 |
| coordinate | 13 | 0 | 13 | 0 | 0 | 13 |
| geometry | 44 | 0 | 42 | 2 | 2 | 42 |
| matrices | 4 | 0 | 4 | 0 | 0 | 4 |
| measurement | 40 | 0 | 40 | 0 | 3 | 40 |
| number | 79 | 8 | 69 | 2 | 14 | 50 |
| probability | 14 | 0 | 14 | 0 | 1 | 14 |
| reasoning | 24 | 2 | 22 | 0 | 1 | 22 |
| sequences | 7 | 0 | 7 | 0 | 0 | 7 |
| sets-relations | 5 | 0 | 5 | 0 | 0 | 5 |
| statistics | 18 | 0 | 16 | 2 | 0 | 18 |
| trigonometry | 9 | 0 | 9 | 0 | 1 | 9 |
| vectors | 4 | 0 | 4 | 0 | 0 | 4 |

The seven mechanically connected answer chains are binomial middle products, signed square-middle coefficients, two-step equations, equations on both sides, bracket equations, addition totals and triangle angle sums. They are constituent chains, not seven completed topics; demonstration eligibility is not educator approval. The five configured competencies are identities, linear equations, addition, triangle properties and angle pairs.

Shared freshness exclusions apply wherever the existing requirement selector is used. Strict opted-in hypothesis replay also excludes taught examples across topics. Parameter-level alignment and skill-specific retention need explicit validated configuration; this milestone does not guess such mappings for the other 331 modules. Existing teaching, practice and answer grading continue there. Calculus, coordinate geometry, matrices, measurement, probability, reasoning, sequences, sets/relations, statistics, trigonometry and vectors need further skill contracts and, where the audit identifies them, content or bounded working adapters. No existing solver or renderer is rebuilt.

The square-middle coefficient chain now has three explicitly scoped candidate strategies from Claude’s TP-ALG-01 handover: one general explanation and two exact-target interventions. They remain pending review; the audit counts the general strategy without assuming any learner misconception. No new `contract.statement`, missing-middle diagnosis or expression-working checker is supplied. Leading-square, constant and numeric-identity skill connections remain incomplete in this audited revision. Claude’s latest inspected handover is docs-only commit `7e89e078`; it is not runtime approval. See [contract and manifest guidance](claude-handover-assessment.md#b1b2b3-integration-contract-candidate-implementation).

Generate this breakdown with `node --import tsx ../tools/mathematics/connection-domain-summary.mts` from `frontend`. The [machine-readable domain report](domains.v1.json) distinguishes existing teaching eligibility and bounded-working examples; it does not exhaustively certify answer grading.

## Coverage expansion: unit-value pattern and visual-data repair (Claude, `feat/math-coverage-expansion`)

**Base:** `1bfb1e13`, the PR99 renderer handover (`feat/math-teaching-visuals`). It depends on PR99's renderer fields (`bottomShaded`, `labels`, `vertices`, `extendedTo`). Codex integrates with PR98.

**Ownership:** domain content, question-family data and skill-mapping configuration only. The engine, grading, diagnosis, selection, persistence and retention are unchanged, and nothing is approved.

### 1. Repaired picture data

The family fingerprints are unchanged: teaching pictures are functions, so they are not in the specification hash. The grader inputs and answer tables are untouched.

| Data | Was | Now | Verified against |
|---|---|---|---|
| `adfnl` (b04, comparing 1/a and 1/b) | Second row derived (1/2 vs 1/4 shaded as 2/4) | Both unit fractions stated, each strip shaded on its own | Every pool item: the labels are the question's fractions |
| `adfcmpu` (b04, comparing a/b and c/d) | Second fraction missing | Both stated | Every pool item |
| `adfunit` (b04, strips 1/b of a metre) | Whole = b/b | The metre, and the metre in b strips with one (1/b) shaded | Every pool item |
| `adfordu` (b04, ordering **three** fractions) | Two strips, second row derived | **No picture.** Two strips could leave out the deciding fraction; the honest fallback is kept | Independent review |
| `achalf` fold (b03, unit fractions) | `top: 1, shaded: 2..3`: more shaded parts than exist | One strip of 4 equal parts with **q quarters** shaded (q is the question's own quarters) | Every pool item: q/4 equals the question picture's shaded fraction |
| `ajrdiv` (b10, sharing in a ratio) | A strip of a + b (+ c) parts with no second row; always the first person's share | One bar of all the parts, with the **asked** person's parts shaded | All 450 items: shaded parts × one part = the answer |
| `ahext` (b08, exterior angle) | No picture | Triangle with vertices A, C, B; side AC extended to D; exterior angle at C; opposite angles at A and B; the asked angle marked ?; not to scale | Every pool item; matches the family's idea and method text |
| Fraction comparison (authored) | 3/8 vs 5/8 drawn as two 3/8 strips | 3/8 and 5/8 stated | Screen text |
| Fraction models "Equal parts" (authored) | Two identical strips | One strip of 4 parts with 1 shaded (`grid`), as its math lines describe | Math lines |

**Remaining honest fallback (pinned by test):** `aifword` alternative `bar` (b09). It is a generic constant picture, `{top: 4, bottom: 3, shaded: 3}`, with no instance values, and its intended second value cannot be established from the text ("count how many parts fit, or shade the fraction"). It still shows as text.

**Regenerated outputs:**
- `library.v1.json`: only the `achalf` fold, the `ahext` chapter and two `ajrdiv` pictures changed.
- `modules.v1.json`: the two authored screens above (source also in `content/learning/src/build.py`).

**Review records:** the changed explanations were re-registered with the existing tools. These registered new revisions; nothing was approved.
- `explanation-review.ts sync`: 6 explanations got a new revision at the **same** status as before, `pending_review` with demonstration scope.
- `review.ts sync`: changed modules returned to draft.

Teaching eligibility is unchanged from before: fraction comparison `same_size_pieces` and unit fractions `fold` remain demonstration-eligible.

**Not shown yet:** the `adfnl`, `adfcmpu` and `adfunit` pictures are correct data, but their competencies use hand-written lessons. They reach learners only where a lesson uses those families' teaching.

### 2. Newly connected skills: "one symbol, bar or digit stands for a fixed amount"

> Teaching coverage below is as of `559697b2`. Section 4 (`feat/math-teaching-gaps`) closes the 16 teaching gaps; its table supersedes the Teaching column.

There are 3 competencies and 17 sub-skills (`packages/learning/src/subskill-config-scale.ts`), registered in `CONNECTION_CONFIGS`. The same multiplicative structure (count × unit value) appears in each: reading it, comparing with it, totalling it, or inverting it.

| Competency | Sub-skill | Family and parameters | Teaching (eligible, same skill) | Fresh checks | Delayed checks | Diagnostic predictions |
|---|---|---|---|---:|---:|---|
| `MATH.statistics.pictographs` | read-with-key | `acpict`, key ≠ 1 | **gap** | 55 | 39 | no-key, wrong-row |
| | half-symbol | `acpicthalf` q = 0 | **gap** | 45 | 55 | half-as-whole, half-left-out, no-key |
| | half-symbol-total | `acpicthalf` q = 1 | **gap** | 5 | 7 | same |
| | compare-rows | `acpictmore`, key ≠ 1 | **gap** | 45 | 40 | added, bigger-only, no-key |
| | draw-from-table | `acpicttab` q = 0 | **gap** | 42 | 44 | one-each |
| | total | `acpicttab` q = 1 | **gap** | 12 | 9 | missed-row, no-key |
| | largest-group | `acpicttab` q = 2 | **gap** | 9 | 11 | no-key, smallest |
| `MATH.statistics.scaled-bars` | read | `afbar` kind 0 | **gap** | 24 | 23 | assume-tens, count-lines |
| | difference | `afbar` kind 1 | **gap** | 27 | 27 | add-for-more, assume-tens, count-lines |
| | total | `afbar` kind 2 | **gap** | 31 | 20 | assume-tens, count-lines, difference-for-total |
| `MATH.number.place-value-tens` | blocks-to-number | `aatens` | **count_on, bundles** (and the prerequisite pointer `check_what_it_uses`, which is not teaching) | 35 | 22 | count-blocks, join-digits, swap-digits |
| | tens-digit-value | `aadigit` kind 0 | **gap** | 17 | 16 | face-value, wrong-digit |
| | count-tens | `aadigit` kind 1 | **gap** | 16 | 15 | value-not-count, wrong-digit |
| | ones-digit-value | `aadigit` kind 2 | **gap** | 13 | 16 | times-ten, wrong-digit |
| | full-tens | `aabund` kind 0 | **gap** | 23 | 19 | rows-as-tens |
| | left-over-ones | `aabund` kind 1 | **gap** | 22 | 14 | last-row |
| | grouped-total | `aabund` kind 2 | **gap** | 18 | 24 | rows-as-tens, tens-only |

**Deliberately unmapped**, each with a reason in the configuration:
- `acpict` and `acpictmore` with a key of 1: no unit value is used;
- `aagreat` (digit cards), `aaword` (number names);
- `aaname` (a choice answer, which the shared numeric validator cannot check; see below).

**Coverage, kept separate:**

| | Count |
|---|---|
| **Adaptive support** | All 17 sub-skills: same-skill questions, misconception predictions readable by the existing diagnosis reader, and recovery after a failed delayed check |
| **Retention** | All 17 sub-skills have fresh same-skill delayed checks. The existing policy asks for one delayed answer, or two unless a module check was sampled |
| **Teaching availability** | **1 of 17** (blocks-to-number) |

Why the teaching gaps are not filled by substitution:
- **Pictographs `table`:** its worked instance uses a key of 1, so it does not teach reading with a key.
- **Scaled bars:** every strategy guides one question kind and checks another.

Candidate strategies already exist on `feat/math-teaching-content`: TP2-SCL-PICT (draw-from-table), TP2-SCL-BAR (scaled bars) and TP2-PV-DIGIT (digit value, count tens). They need Codex integration and educator review. Working evidence is answer-only (`unsupported`) everywhere: these mappings grant no method credit.

**Graph prerequisites:** unchanged. The mappings add no graph relations, and chapter access stays open.

**Journeys** (`frontend/src/journey/scale-pattern.test.ts`; synthetic learners through `foundationPlan`, `SliceSession` and `learnerState`): **25/25 pass**. They cover:
- the partition of every served task (typed and `:mc`) of the mapped families, with each generator's validator accepting the answer;
- all 17 sub-skills: same-skill fresh checks with no repeats, replay from saved events, a fresh same-skill delayed check after 8 days, and recovery on a wrong delayed answer;
- three skills retained after correct delayed answers;
- evidence for one skill never covering another (including key 1 against read-with-key);
- teaching availability;
- the actual pathway for place-value `bundles`: guided, then a fresh same-skill check that is not a taught example, and reload.

**Picture data tests** (`frontend/src/year/visual-data.test.ts`): **6/6 pass**.

**Independent review:** no blockers. Fixed from it:
- `acpicthalf` totals were split out of the row-reading skill;
- the `adfordu` picture was removed (three fractions);
- the skill names for `aatens` (ten or more loose ones) and `aabund` totals were made accurate;
- the "Equal parts" test now reads the math lines instead of hard-coding the picture;
- a retained-delayed-answer test was added.

### 3. For Codex: one shared-contract blocker (precise reproducer)

`validSkillTask` (`skill-connections.ts`) accepts only answers where `Number(answer)` is finite. Every other answer type is refused, although the trusted grader marks the generator's own answer correct:

```ts
// from frontend: node --import tsx <file>
const C = { version: "repro", mapping: "repro", competency: "MATH.number.fraction-comparison", unmapped: {}, core: ["s"], broadClaim: (l) => l,
  subSkills: [{ id: "s", name: "s", example: "gen:adfcmp:1,1,9,11,0", families: ["adfcmp"], competency: "MATH.number.fraction-comparison" }] };
validSkillTask(C, "s", "gen:adfcmp:1,1,9,11,0");                 // false  (answer "1/9")
gradeRequest({ id: "gen:adfcmp:1,1,9,11,0", response: "1/9" }).verdict; // "correct"
// same for gen:akchance:2,3,2,0 ("2/7"), gen:addur:0,7 ("(6, 50)"), gen:aaname:15 ("A")
```

**Required behaviour:** decide task validity with the family's own typed answer check (the trusted grader or the family `validate` with its typed value), not `Number()`.

**Affected:** 529 of 1,082 families give non-numeric answers (fraction, choice, tuple, exact, set, expression, interval and other types). That touches 235 competencies, and **78 of 327 competencies have no numeric-answer family at all**, so they cannot be connected until this is fixed. The topics blocked include:
- fractions (models, comparison, adding);
- probability (chance, classical, sample space);
- durations, and comparison and ordering tuples;
- number names.

This is why this batch connects only numeric-answer skills.

**Integration step for Codex: trusted grader manifest.** `backend/family/grader/grader.manifest.json` records hashes of the bundle's source inputs. Nine of its 212 inputs changed on this branch:
- the four family files `b03`, `b04`, `b08`, `b10`;
- `skill-connections.ts`;
- `modules`, `library`, `explanation-review` and `review` `.v1.json`.

Grading semantics did not change: every changed family's specification fingerprint is identical, and only teaching-picture functions, screens and mapping configuration differ. Rebuild with the existing command, `ESBUILD=./frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs`, at integration. Grading is Codex's, so it was not rebuilt here.

## Teaching gaps closed, and the next mapping group (Claude, `feat/math-teaching-gaps`)

**Base:** `559697b2` (PR #100, `feat/math-coverage-expansion`). This branch depends on PR #100 and is reviewable after it. Same ownership: domain teaching and mapping configuration only; nothing is approved, and the engine, grading, diagnosis, selection, persistence and recovery are unchanged.

### 4. Skill-scoped teaching for the 17 unit-value skills

> Historical (PR101). The half-symbol withdrawal below was mapping @2; the integrated mapping is the precise @3 (section 8).

**Why blueprints.** A template module draws its strategy questions from the whole family (`take(...)`), so it cannot keep a strategy's worked example, guided question and check on one sub-skill. The existing blueprint contract can (`scope: {family, subSkill}`, validated by `synthesise`). Pictographs, scaled bars and place value (tens) are now blueprints (source: `content/learning/src/scale-blueprints.mts`, output appended to `blueprints.v1.json`).

**Reuse.** Text comes from the `feat/math-teaching-content@4e655e73` candidates (TP2-SCL-PICT `acpicttab_concept`, TP2-SCL-BAR `fix_assume_tens`, TP2-PV-DIGIT `aadigit_concept`, split by skill) and the existing template strategies (`skip_count`, `table`, `bundles`, `count_on`). New text was written only where no candidate covered the skill (half symbols, row comparison, totals, largest group, bar difference and total, ones digit, the three grouping skills). Every worked line is the generator's own step text for the screen's instance; explanation text contains no instance numbers.

**Alignment rules applied** (pinned by test): worked instance, guided question and module check are all the taught skill; pictograph teaching never uses a key of 1; each bar strategy uses one question kind; `bundles` shows ten to nineteen loose cubes and its math lines tie ten of them into another ten, `count_on` fewer than ten (answering their recorded `revision_required` notes; they re-enter review as new pending revisions).

**Dropped:** the template prerequisite pointer `check_what_it_uses`. It has no skill scope, so its drawn questions landed in an arbitrary skill (`scaled-bars.total`) and the audit counted it as that skill's teaching.

**Half pictures.** The generator's half-symbol questions may ask about a row with no half picture, so `half_pictures` uses only rows with an odd number of halves for its worked example, guided question and check. Both half-picture texts count in halves (the generator's own method), so they hold when halves do not pair up.

**Half-symbol rows withdrawn from evidence (mapping `pictographs-subskills@2`).** Mapping @1 credited every `acpicthalf` row question (q = 0) as `pictographs.half-symbol@1`, including rows of whole pictures only. Reproducer: `gen:acpicthalf:0,8,1,0`, two halves, one whole picture; 197 of 472 valid tasks are like this.
- **The limitation:** the precise condition (the asked row holds a half picture, `halves(ki, s)[j]` odd) is joint over key, seed and row. Per-index `parameters` cannot express it, and duplicate skill ids are not used.
- **What @2 changes:** the row questions are unmapped. They are still served and graded and earn ordinary answer credit, but they earn no skill evidence. The totals skill (q = 1) is unchanged. The `half_pictures` explanation is withheld (kept in `scale-blueprints.mts`, not published).
- **Protection** (plain tests in `scale-pattern.test.ts`): no row question classifies to any skill (typed or multiple-choice); a correct answer is credited but no pictograph skill is demonstrated; no pictograph skill's assessment, retention or recovery selects a row question.
- **Pending restoration** (`todo`, **not counted as protection**): genuine-row inclusion, projection credit and selection. They are enabled once Codex extends the contract.
- **Data for that version:** `HALF_SYMBOL_ROWS` (275 genuine `(ki, s, j)`). The version number is to be coordinated with Codex's replay handling.

**Misconception teaching.** Only `fix_assume_tens` (scaled-bars.read) is added: its evidence is a numeric wrong answer and it needs no contrast item. It is never general teaching (`addresses: "assume-tens"`): with `assume-tens` evidence it is eligible for scaled-bars.read only (tested). The contrast-dependent fixes (`one-each`, `face-value`, `value-not-count`) are **not** added: they need contrast declarations, which belong with Codex's diagnosis integration.

**Review status.** `explanation-review.ts sync`: 16 explanations registered and 7 given new revisions, all `pending_review` (demonstration scope). `review.ts sync`: the three modules are draft. No approval was recorded.

| Sub-skill | Teaching (same skill, pending review) | Guided | Fresh check | Delayed check | Recovery |
|---|---|---|---|---|---|
| pictographs.read-with-key | read_with_key, table | yes | yes | yes | yes |
| pictographs.half-symbol | **withdrawn in @2** (no skill evidence until the contract extension) | – | – | – | – |
| pictographs.half-symbol-total | half_pictures_total | yes | yes | yes | yes |
| pictographs.compare-rows | compare_rows | yes | yes | yes | yes |
| pictographs.draw-from-table | draw_from_table | yes | yes | yes | yes |
| pictographs.total | pictograph_total | yes | yes | yes | yes |
| pictographs.largest-group | largest_group | yes | yes | yes | yes |
| scaled-bars.read | skip_count (+ fix_assume_tens on evidence) | yes | yes | yes | yes |
| scaled-bars.difference | bars_difference | yes | yes | yes | yes |
| scaled-bars.total | bars_total | yes | yes | yes | yes |
| place-value.blocks-to-number | bundles, count_on | yes | yes | yes | yes |
| place-value.tens-digit-value | tens_digit_value | yes | yes | yes | yes |
| place-value.count-tens | count_tens | yes | yes | yes | yes |
| place-value.ones-digit-value | ones_digit_value | yes | yes | yes | yes |
| place-value.full-tens | full_tens | yes | yes | yes | yes |
| place-value.left-over-ones | left_over_ones | yes | yes | yes | yes |
| place-value.grouped-total | grouped_total | yes | yes | yes | yes |

**Coverage, kept separate (16 mapped skills after @2; half-symbol withdrawn):** teaching 16 (pending review, demonstration only); assessment 16; recovery 16; retention 16.

**Journeys** (`scale-pattern.test.ts`, 46 pass, 3 pending `todo`; the test also checks every current revision is `pending_review`): for each of the 20 general strategies, teach → guided (the strategy's own question, same skill) → independent fresh check (same skill, not a taught or guided example) → reload keeps the check. The delayed check and recovery paths are the per-skill foundation journeys of section 2. **Blocked paths:** none for these skills in demonstration mode; under supervised evaluation, none teach until an educator approves (by design).

### 5. Next mapping group: "change between units by a fixed factor"

`packages/learning/src/subskill-config-conversion.ts`, registered in `CONNECTION_CONFIGS`: 3 competencies across money, length and geometry, 18 registered sub-skills, one family per skill, plus one prepared choice-answer skill (not registered).

| Competency | Sub-skills (family, parameters) | Assessment + retention + recovery | Teaching |
|---|---|---|---|
| `MATH.measurement.money-decimals` | paise-to-rupees (`acp2r`); rupees-and-paise-to-paise (`acpaise` form 0); decimal-rupees-to-paise (`acpaise` form 1) | 3/3 | 3/3 (section 7) |
| `MATH.measurement.length-conversion` | cm→decimal m, mm→decimal cm, m→decimal km, decimal m→cm (`acdecu` kinds 0–3); m cm→cm, cm→m cm (`acmcm`); cm mm→mm, mm→cm mm, m→km m, m→whole km, mm→whole cm (`acmmkm` kinds 0–4); compare-m-cm (`acmcmp`) **prepared, not registered** | 11/11 | 11/11 (section 7) |
| `MATH.geometry.scale-drawings` | map→real, real→map (`aiscale`); plan 1 : n→metres, map 1 : n→km (`airatio`) | 4/4 | 4/4 (section 7) |

Unmapped with reasons: `acbill`, `acmoneyadd`, `acmoneymul` (money arithmetic, not unit change).

**Blocked (prepared, not registered):** `PREPARED_CHOICE_SKILLS` holds `length.compare-m-cm@1` (`acmcmp`, choice answer A/B/C); `acmcmp` is listed as unmapped. Registering it today would split the system: the foundation runtime **would** ask and credit it (it reads the stored verdict; verified), while `validSkillTask` refuses every one of its tasks, so teaching, the connection audit and diagnosis would report it unconnected. Reproducer (in `conversion-pattern.test.ts`): add the prepared skill to `LENGTH_CONVERSION_CONFIG`; `validSkillTask(cfg, "length.compare-m-cm@1", "gen:acmcmp:1,4,1,0") === false` (answer `"B"`), yet `foundationPlan` asks that skill and a correct answer is credited. Same shared blocker as section 3; no validator change was made here.

**Teaching note (superseded by section 7):** at this commit these modules were still templates with no skill-scoped teaching. The audit shows `money.decimal-rupees-to-paise` and `length.cm-to-m-cm` as connected only through the unscoped `check_what_it_uses` pointer, whose drawn questions happen to share a skill. That is not teaching of the skill; it is pinned in `conversion-pattern.test.ts` and reported here, not counted.

**Journeys** (`conversion-pattern.test.ts`, 22/22): partitions over every served task, partition meanings read from the generated prompts, numeric diagnostic predictions, and for each of 18 skills same-skill fresh checks, a fresh delayed check after 8 days and recovery; plus the blocker reproducer.

### 7. Skill-scoped teaching for the 18 conversion skills

> Superseded in part by section 8: the choice skill is now registered (19 skills).

The three conversion modules are now blueprints, from the same authoring source as section 4 (`scale-blueprints.mts`, the "change between units by a fixed factor" block). There is one scoped strategy per skill: worked instance, guided question and module check are all that skill. Text contains no instance numbers, and the worked lines are the generator's own steps.
- **Reused text:** the template modules' family ideas and methods (`worked_steps`, `drop_dot`, `place_value`, `ratio_table`) and TP2-REG-MONEY's unit idea ("a bigger unit is made of a fixed number of smaller units").
- **New text:** only per-direction method lines.
- **Removed from these modules:**
  - the unscoped `check_what_it_uses` pointer (decision 1);
  - the template `spot_the_mistake` screens. They taught one misconception (added the numbers; multiplied instead of divided) as general teaching, with no contrast declaration. They return as `addresses`-scoped fixes once contrast items exist (decision 2).
- **Review:** 18 explanations registered as `pending_review`; the modules are draft. Nothing is approved.

**Coverage, kept separate (18 registered skills):** teaching 18 (pending review, demonstration only); assessment 18; recovery 18; retention 18. The prepared choice skill (`length.compare-m-cm`) stays unregistered.

**Journeys** (`conversion-pattern.test.ts`, 40/40):
- partitions and partition meanings;
- per-skill foundation checks, a delayed check after 8 days and recovery;
- the blocker reproducer;
- teaching alignment, with no digits in explanation text, a non-trivial worked example and `pending_review` status;
- for each of the 18 strategies, the path teach → guided → independent fresh check → reload.

**Ratio scales:** the taught items avoid 1 : 100 (to metres) and 1 : 100000 (to km). At those scales the multiplication and the unit change cancel, which hides the method; they are still assessed.

**Independent review:** fixed:
- ratio items that cancel;
- "the hundreds are the rupees" (now "the number of whole hundreds");
- the length chapter now covers decimals;
- tests now compare math lines with the generator's own lines, check every revision is pending, use exposure keys for freshness and apply the full non-trivial test.

Open, outside this branch's ownership:
- The engine-drawn sub-chapters (from `subSkills()` in `library.ts`) can draw a cancelling example (ratio 1 : 100, 12 cm → 12 m).
- The length chapter includes `acmcmp` (unregistered) and an "equal lengths" example.
- These sub-chapters are not skill teaching.

**Integration note:** Codex's local integration now accepts choice answers. The blocker reproducer test asserts today's numeric-only `validSkillTask` on this branch. On the combined branch, it should be replaced by registering `PREPARED_CHOICE_SKILLS` as a new mapping version, with the usual journeys; registration stays explicit.

### 6. Decisions for Codex

0. **Mapping contract: joint parameter conditions** (section 4). Extend `SubSkillDef` with an enumerated tuple list or a problem predicate. Decided meanwhile: row questions are unmapped (@2). With the contract change, Claude adds a new mapping version using `HALF_SYMBOL_ROWS` and enables the three pending tests; the version number is coordinated with replay handling.

1. **Unscoped prerequisite strategies** (`check_what_it_uses` in template modules): should `strategyConnects` exclude `kind: "prerequisite"` or strategies with no scope? Today they count as same-skill teaching by chance (two skills above, and previously `scaled-bars.total`).
2. **Contrast declarations** for `one-each` (pictographs), `face-value` and `value-not-count` (place value): the candidates on `feat/math-teaching-content` are ready to scope once contrast items are declared.
3. **Answer-type support in `validSkillTask`** (section 3): unblocks `PREPARED_CHOICE_SKILLS` and the fraction/choice/tuple families. Note the runtime already credits choice answers; the restriction is only in task validity (teaching, audit, diagnosis).
4. **Grader manifest:** this branch changes `skill-connections.ts` and the `blueprints`, `library`, `explanation-review` and `review` `.v1.json` inputs; rebuild at integration with the section 3 command.
5. **Template → blueprint conversion** of the three unit-value modules: an engine-visible change of module source (same contract, `synthesise`); confirm at integration.

**Independent review of this branch:** two defects fixed (half-picture questions without a half picture; the total text failing on an odd number of halves). Also fixed from it: `bundles` now shows the regrouping, the blocked-skill test was strengthened (which exposed the runtime/audit split above), the registry status and the with-evidence misconception path are now tested. Open, for Codex: decision 1 (unscoped prerequisite pointers).

## 8. Integration repair (Claude, `feat/math-integration-repair`, from PR102 `24d254fd`)

PR101 and PR102 stay unchanged as checkpoints. This branch combines them selectively. Codex's shared fixes stay in place:
- the trusted answer contracts and `parameterTuples`;
- prerequisite exclusion in `strategyConnects`;
- `fix_assume_tens_read` and the retained `fix_assume_tens` for totals.

### Conversion teaching (from `2ec9c528`)

**What was integrated:**
- The conversion block of `scale-blueprints.mts`. The generated money, length and scale blueprints are byte-identical to `2ec9c528`, and the 12 existing blueprints are unchanged.
- The explanation-review histories, merged by revision: 18 entries added, 3 chapter revisions appended. All are `pending_review`, and a resync registered nothing new.
- The tests.

**Codex's prerequisite test** used the money module's template pointer, which no longer exists. It now builds a pointer from the aligned target strategy (same guided and check questions, only the kind or role differs) and asserts it does not connect.

### Half-symbol version collision, resolved

Each meaning has its own identity, exported as `PICTOGRAPHS_MAPPING_HISTORY`:

| Mapping | Meaning | Status |
|---|---|---|
| `pictographs-subskills@1` | Legacy: every row task is evidence, including whole-picture rows | Replay only |
| `pictographs-subskills@2` | PR101 withdrawal: row tasks earn no skill evidence | Replay only |
| `pictographs-subskills@3` | Precise: `parameterTuples` from `HALF_SYMBOL_ROWS` | Live |

PR102 first labelled the precise mapping @2. It is renumbered @3, with the projection renumbered to match. The three runtime regressions (classification, projection credit, selection) are active against @3.

**Replay test:** one saved ledger (whole rows, genuine rows, a totals task) projects as follows:
- **@1** credits all row tasks;
- **@2** has no half-symbol skill;
- **@3** credits only the genuine rows;
- the totals skill is the same under all three.

The ledger is byte-identical before and after, and replay is order-independent.

### Choice skill registered: `length-conversion-subskills@2`

`length.compare-m-cm@1` (`acmcmp`, native A/B/C) is now a core skill, and `LENGTH_CONVERSION_CONFIG_V1` is kept for replay.
- **Teaching:** `compare_m_cm`, pending review. Its worked example has unequal lengths. Its math lines are the generator's own, plus one line naming the chosen option, because the answer is a letter.
- **Assessment, delayed check and recovery:** the per-skill foundation journey. The wrong answer is a different option letter.
- **Saved replay:** @1 gives no skill evidence; @2 gives 4 attempts with 3 right. The ledger is unchanged and replay is order-independent.
- **Diagnosis:** option predictions are not read as numeric diagnoses, and answer credit grants no method credit.
- **Prerequisite pointers** do not count as target teaching (shared predicate, tested).

`PREPARED_CHOICE_SKILLS` is now empty.

### CI failure 1: the Completing-the-square browser journey

**Cause (diagnosed):** `chapter/Main.tsx` rendered the learner's screens while `repo.load()` was still fetching the saved records. `Teach` and `Worked` take their starting part from the records once, in `useState(start)`. A learner who opened the unit before the records arrived started at part 1 and stayed there. CI saw this on a slow load; a rerun of PR102's job passed, so it is timing-dependent, not a broken assertion.

**Fix:** the learner's screens wait for that learner's records ("Loading your progress…"). A late response for another learner is ignored.

**Regression:** the existing e2e test now delays the records response by 2.5 s on reload and still requires "Part 2 of 3". The assertion is unchanged, and the timeout is not extended.

### CI failure 2: generated coverage (scaled bars "independent")

**Cause:** synthesised blueprint modules took their transfer from the other families' word forms only. Scaled bars has a single family, so it lost the word-problem transfer that its template module had, and independent assessment requires one.

**Fix:** `library.ts` adds the primary family's own word form when no other family supplies one. Only scaled bars changes: `transfer` gains `gen:afbar:4,0,0:w`.

**Result:** the regenerated `coverage-matrix.v1.json`, `COVERAGE_MATRIX.md` and `COVERAGE.md` match the committed versions: 336 required, 329 complete, 0 approved.

### Grader and generated artifacts

- **Grader:** rebuilt with the existing command (214 inputs). On 500 sampled requests across 15 families and the program items, the verdict, reason, expected answer and contract hash all match the PR102 bundle.
- **Pipeline:** family specs and parity are unchanged. The library, coverage, expansion and board releases were regenerated, and the explanation and module registries synced.

### Engine-drawn conversion sub-chapters (chapter introductions, not teaching evidence)

The audit and `strategyConnects` count only strategies. Examples worth an educator's look:
- Length, "Comparing lengths": an equal-lengths example ("Compare 571 cm with 571 cm") with no concluding line.
- Scale, "Ratio scales 1 : n": a 1 : 100 example, where the multiplication and the unit change cancel.
- Money, "Adding and taking away": an example with no regrouping.

These come from `subSkills()` drawing the first practice item. They are left unchanged, and recorded here.

## 9. Inverse operations (Claude, `feat/math-inverse-operations`, from #103 `c2296013`)

**Pattern:** adding and taking away, multiplying and dividing undo each other. An unknown (a box, x, a hidden digit) is found by working backwards; the same relation gives related facts and the check of an answer. The batch covers arithmetic and algebra across grades, from the existing inventory and generators.
- **Mappings:** `packages/learning/src/subskill-config-inverse.ts`, registered in `CONNECTION_CONFIGS`. There are 3 new mappings, each `@1`; no earlier mapping changed.
- **Teaching:** the `"inverse operations undo each other"` block of `content/learning/src/scale-blueprints.mts`.

| Competency (mapping) | Sub-skill | Family, parameters | Answer |
|---|---|---|---|
| `MATH.algebra.missing-number` (`missing-number-subskills@1`) | box-plus-k (□ + k = n) | `acmissing` f 0 | number |
| | n-minus-box (n − □ = k) | `acmissing` f 1 | number |
| | box-minus-k (□ − k = n) | `acmissing` f 2 | number |
| | k-times-box (k × □ = n) | `acmissing` f 3 | number |
| | subtraction-from-addition | `acfacts` mode 0 | choice |
| | check-subtraction-by-addition | `acfacts` mode 1 | choice |
| | division-from-multiplication | `acfacts` mode 2 | choice |
| | dividend-is-divisor-times-quotient | `acfacts` mode 3 | choice |
| `MATH.algebra.linear-intro` (`linear-intro-subskills@1`) | x + a = b, x − a = b, ax = b, x ÷ a = b | `ahone` f 0–3 | number |
| `MATH.reasoning.puzzle-strategy` (`missing-digit-subskills@1`) | missing-in-addend | `afmissd` where 0, op 0 | digit |
| | missing-in-first-number | `afmissd` where 0, op 1 | digit |

That is 14 skills in all. **Unmapped, with reasons in the config:**
- `acplace`: digit cards, which is place value;
- `afmissd` where 1: the digit is hidden in the result, so it is found by working forwards;
- `afnim` and `afriver`.

**Teaching.** Each skill has one skill-scoped explanation, pending review. The module's worked example, guided question and check are all that skill.
- **Worked lines** state the numbers being undone and end with the substitution check. For example: "□ + 10 = 21 / 10 was added to the box: undo it by taking 10 away / 21 − 10 = 11 / Check: 11 + 10 = 21".
- **Related facts** show the asked fact, a check that it is true, and the chosen option.
- **Review notes answered:** this split answers the `revision_required` notes on the retired template explanations (one form per explanation, a worked example of the checked form, the number named in the undo line, the substitution check shown).
- **Retired template explanations:** they are no longer served; their registry history (including the blocked revisions) is kept. Two existing tests now state this explicitly: `content-corrections` B and the four corrections, and `linear-equations` J12.

**Misconception teaching, 7 fixes authored** (see 9a: 4 are withheld because their mistake is modelled by several skills). Each is offered only with misconception evidence:

| Fix | Skill | Mistake (bug) |
|---|---|---|
| `fix_added_both` | □ + k | `added-both` |
| `fix_added_both_taken` | n − □ | `added-both` |
| `fix_took_away_again` | □ − k | `took-away-again` |
| `fix_same_operation_add` | x + a | `same-operation` |
| `fix_same_operation_take` | x − a | `same-operation` |
| `fix_subtract_coefficient` | ax | `subtract-coefficient` |
| `fix_add_for_multiply` | x ÷ a | `add-for-multiply` |

- **Contrast:** on every taught, guided and checked item the mistake predicts one answer, different from the right one and from every other modelled mistake.
- **No fix for k × □:** its times-table slip predictions overlap, so there is no contrast.

**Coverage, kept separate (14 skills):**

| | Count |
|---|---|
| Teaching | 14 general explanations plus evidence-gated fixes (7 authored; **3 published after the safety correction in 9a**, 4 withheld). All are demonstration-ready (`pending_review`), and none is educator-approved |
| Assessment | 14 |
| Recovery | 14 |
| Retention | 14 |

**Learner-path evidence** (`frontend/src/journey/inverse-pattern.test.ts`, 34 tests):
- partitions, with exactly one matching partition per task, and partition meanings read from the prompts;
- numeric diagnostic readings;
- for each skill: same-skill fresh checks, replay, a fresh delayed check after 8 days, and recovery on a wrong delayed answer;
- teaching alignment: worked sentences true, the undo step producing the answer, the check line, no digits in the text, `pending_review` status;
- the misconception gate, contrast and fix screens;
- for each skill: teach → guided → fresh check → reload → saved answer as that skill's evidence only, with no method credit;
- mapping-stamped, order-independent replay with an untouched ledger.

**Limitations:**
- **Shared limitation (not a blocker):** misconception evidence is keyed by the mistake's id within a competency, not by skill. `same-operation` is modelled for `ahone` f 0–3, and `added-both` for `acmissing` f 0–1. Reproducer: `teachable(moduleFor("MATH.algebra.linear-intro"), fix_same_operation_add, ["same-operation"])` is true whichever kind of equation produced the evidence. Mitigated in the domain: those fixes' words are true for every kind that models the mistake, and the worked example is the fix's own form. Skill-keyed evidence would be an engine change.
- **Prerequisite not declared:** the missing-digit skills assume three-digit addition and subtraction with regrouping, and no graph relation records this.

### 9a. Safety correction: cross-skill misconception fixes withheld (`feat/math-inverse-safety`)

> Superseded by section 11: the shared rule skill-scope@1 makes the four withheld fixes safe, and they are published again.

**Problem.** Misconception evidence is keyed by the mistake's id within a competency, not by skill, and the engine's intervention ordering puts any eligible targeted fix first by that id alone. Two mistake ids are modelled by several skills:
- `added-both`: □ + k and n − □;
- `same-operation`: all four one-step equation forms.

So a learner's mistake on one skill could select the fix written for another, presenting it as proof of a mistake in that other skill.

**Correction (domain only; the engine is unchanged).** The four fixes whose mistake is modelled by more than one skill are withheld from the published modules: `fix_added_both`, `fix_added_both_taken`, `fix_same_operation_add` and `fix_same_operation_take`.
- They stay authored in `scale-blueprints.mts` (`withheld: CROSS_SKILL`) for when evidence is keyed by skill.
- Their review records stay `pending_review`.
- They are not retained as general teaching.

Ordinary same-skill teaching for all 14 skills is unchanged. The published, assessed and retained paths are unaffected.

**Readiness of the seven authored fixes:**

| Fix | Mistake modelled by | Status |
|---|---|---|
| `fix_took_away_again` | □ − k only | **Published.** Reached end-to-end through recorded evidence: the engine's own investigation establishes the mistake on □ − k answers, teaches this fix, and the finding resolves |
| `fix_subtract_coefficient` | ax = b only | **Published, skill-safe, not yet demonstrated.** In the recorded-evidence scenario the finding resolves, but recovery chose a prerequisite pointer of another competency instead |
| `fix_add_for_multiply` | x ÷ a = b only | **Published, skill-safe, not yet demonstrated.** The engine's investigation did not establish the mistake (its questions span other forms) |
| `fix_added_both`, `fix_added_both_taken` | □ + k and n − □ | **Withheld** |
| `fix_same_operation_add`, `fix_same_operation_take` | all four one-step forms | **Withheld** |

All explanations remain pending educator review; none is approved.

**Regression with recorded evidence** (`inverse-pattern.test.ts`):
1. A scripted learner makes `added-both` only on □ + k questions. The engine's own investigation records the finding, and every supporting answer is □ + k.
2. Nothing addressing `added-both` is taught.
3. Moving to n − □, the finding authorises only the ordinary `n_minus_box` explanation, and the engine's own ordering offers no targeted fix.
4. That explanation still runs on the same records: teach → guided → a fresh n − □ check, the same check after a saved reload, and evidence for that skill.

A second test shows the published □ − k fix is reached only through □ − k evidence.

**Reproducer for shared-engine work.** On records holding no □ − k answer at all,
`orderStrategies(moduleFor("MATH.algebra.missing-number"), d, records, ["took-away-again"])[0].id === "fix_took_away_again"`.
The gate and ordering take the mistake id alone. The foundation runtime already checks the strategy's scope against the original question (`teachingMatchesMisconception`); `intervention.orderStrategies` does not.

**Second engine limitation observed.** Intervention orders general explanations by family, not skill. In a scenario where `added-both` is shown on n − □, the engine first taught the □ + k explanation (both forms are family `acmissing`), then n − □. Both are correct general teaching, but the first is of another skill.

**Prerequisite resolved.** The missing-digit skills now have `support` relations from `MATH.number.addition-regroup` and `MATH.number.subtraction-regroup`.
- These are the competencies the generator's own carry and exchange steps already name.
- They are curated in `content/learning/src/expansion-audit.v1.json` (audit `1.0.2`).
- The relations are `support`, not `plausible`: the competency's game and river puzzles do not need regrouping, and support never gates, so chapter access stays open.
- The expansion generator's cycle check accepts both edges; none is disputed. `test_expansion.py` pins them.
- The regroup competencies are written for two digits (Grade 2). Three-digit column regrouping has no separate competency, so none was invented.

## 10. Fractions: equivalence, comparison and ordering (Claude, `feat/math-fractions`, from `ffa2c1d7`)

**What newly works: 9 skills across 2 competencies.** The batch reuses the existing generators, the shared typed answer contracts (fraction, tuple, mixed, native choice) and the two hand-written fraction modules.
- **Mappings:** `packages/learning/src/subskill-config-fractions.ts`, each `@1`.
- **Teaching:** `content/learning/src/fraction-strategies.mts`. It adds skill-scoped explanations to `modules.v1.json` and keeps the hand-written chapters and explanations unchanged, as the fraction-models module already does.

| Competency (mapping) | Skill | Family, parameters | Answer | Explanation |
|---|---|---|---|---|
| `MATH.number.fraction-comparison` (`fraction-comparison-subskills@1`) | compare, same bottom | `adfcmp` mode 0 | fraction | `compare_same_bottom` |
| | compare, same top | `adfcmp` mode 1 | fraction | `compare_same_top` (TP-NUM-01 text; re-enabled under skill-scope@1, section 11) |
| | order, same bottom | `adford` mode 0 | tuple | `order_same_bottom` |
| | order, same top | `adford` mode 1 | tuple | `order_same_top` |
| | compare, unlike | `adfcmpu` | fraction | `compare_unlike` |
| | order, unlike | `adfordu` | tuple | `order_unlike` |
| `MATH.number.equivalent-fractions` (`equivalent-fractions-subskills@1`) | missing part | `eqfrac` | number | hand-written `strip_model` and `multiply_both` (no scoped explanation, see below) |
| | lowest terms | `avlow` | mixed | `lowest_terms` |
| | equal by folding | `avfold` | choice | `equal_by_folding` (with the family picture) |

**Unmapped, with reasons in the config:**
- `adfnl`: locating unit fractions on a number line, which is a different skill;
- `avlike`: classifying like and unlike fractions.

**Coverage, kept separate (9 skills):**

| | Count |
|---|---|
| Teaching | **7** skill-connected scoped explanations (after section 11), demonstration-ready (`pending_review`), 0 educator-approved. 2 more skills (compare same bottom, missing part) are taught by the existing hand-written lessons, which use authored questions and so are not skill-connected |
| Assessment | 9 |
| Recovery | 9 |
| Retention | 9 |

**Learner-path evidence** (`frontend/src/journey/fraction-pattern.test.ts`, 20 tests; the teaching paths cover the 6 scoped explanations):
- **Partitions:** exactly one partition per task, the trusted typed answer accepted, and meanings read from the prompts.
- **Each skill, assessment path:** fresh same-skill checks, replay, a fresh same-skill delayed check after 8 days, and recovery after a wrong delayed answer in the question's own form (another option, the triple reversed, another fraction).
- **Each skill, teaching path:** teach → guided → fresh check → reload → evidence for that skill only, with no method credit.
- **Teaching alignment:** no digits in the explanation text, true worked sentences, `pending_review` status.
- **Replay:** stamped with the mapping and order-independent.

**Why three scoped explanations are held back (found by the browser journey A in CI).** The engine orders general explanations by the family of the learner's last mistake (before the diagnosis kind), not by skill.
- **Missing part and compare same bottom:** a scoped explanation for either would be chosen before the hand-written lesson that already teaches that skill, after a mistake on it. That displaces the designed lesson; journey A expects the strip model after an additive, conceptual mistake.
- **Compare same top:** it shares the `adfcmp` family, so after a same-bottom mistake it would be chosen over the hand-written lesson.

All three stay authored in `fraction-strategies.mts` (`held`), waiting for skill-keyed ordering. A test pins the designed choices: `strip_model` (conceptual) and `multiply_both` (procedural) after a missing-part mistake, and `same_size_pieces` (conceptual) after a same-bottom mistake. It also pins the remaining limitation: with a procedural diagnosis after a same-bottom mistake, the procedural same-bottom *ordering* explanation (another skill) comes first.

**Still blocked or not done:**
- **Misconception-specific fraction fixes:** none added. The modelled mistakes are shared by several skills:
  - `bigger-bottom-bigger`: compare and order same top, compare unlike, and the number line;
  - `as-given`: ordering, both modes.

  Misconception evidence is not keyed by skill (section 9a), so a fix chosen by mistake id alone could present one skill's mistake as another's. The TP-NUM-01 `fix_bigger_bottom_bigger` candidate waits for skill-keyed evidence.
- **Pictures:**
  - `compare_unlike` shows the family's two-strip picture (both fractions, each strip shaded for its own fraction).
  - `equal_by_folding` shows its question picture.
  - The same-bottom and same-top teaching pictures show only the first fraction, so they are not used, and those explanations are text and worked lines only.

## 11. Shared selection rule skill-scope@1 (Claude, on `feat/math-fractions`, #105)

**Cause.** The ordinary intervention path (`intervention.ts` `orderStrategies`, used by `moduleState`) chose explanations by mistake id, question family and diagnosis kind, never by skill. A skill-scoped explanation or fix could therefore be selected for another skill of the same competency:
- an ordering lesson after a same-bottom comparison mistake;
- one equation form's fix after a mistake recorded on another.

The readiness pathway (`foundation-runtime.ts`) already checked scope; the ordinary path did not.

**Rule** (`intervention.ts` `currentSkill` and `scopeAllows`; applied in `orderStrategies`, in the sub-skill-gap path and in the planner's availability count):
- **Current skill:** read from trusted provenance, never from family or wording. The competency's versioned skill mapping classifies the question of the learner's latest recorded wrong answer in the module. It is `null` when there is no mapping, no such answer, or the question is unmapped.
- **Explanations without a skill scope** (generic and hand-written lessons) are unchanged.
- **A skill-scoped general explanation** is offered on its own skill, or, when no current skill is known, as safe general teaching.
- **A skill-scoped misconception fix** is offered only when the current skill is its skill and the misconception was recorded on that skill (an investigated finding whose original question the mapping classifies as that skill). With missing or ambiguous provenance it abstains, and general teaching remains.
- Records, mappings and replay are untouched; the rule only reads them.

**Proof on the real automatic path** (`frontend/src/journey/skill-scope.test.ts`, 7 tests). Each runs through `runScenario`: the engine asks, a scripted learner answers, the engine teaches, and no strategy is chosen by the test. Each case also checks that a saved reload gives the same next step.

| Case | Result |
|---|---|
| Same-bottom comparison difficulty (generated and hand-written same-bottom questions) | Taught `same_size_pieces`; no ordering, same-top or unlike lesson |
| Same-top difficulty (positive) | Taught `compare_same_top` |
| `same-operation` established on an x − a question while the current skill is x + a | No targeted fix; taught `x_plus_a`. The content gate alone would allow both same-operation fixes; the scope rule refuses them |
| `added-both` established on n − □ while the current skill is □ + k | No targeted fix; taught `box_plus_k` |
| `added-both` on □ + k, and `same-operation` on x + a (positive) | Taught `fix_added_both` and `fix_same_operation_add` |
| `took-away-again` on □ − k (positive, skill-unique) | Taught `fix_took_away_again` |
| No current skill, or a competency without a mapping | Targeted scoped fixes abstain; general teaching is unchanged |

**Re-enabled where the rule makes them safe:**
- the four inverse-operation fixes withheld in 9a (`fix_added_both`, `fix_added_both_taken`, `fix_same_operation_add`, `fix_same_operation_take`; content identical to #104's original, so the registry is unchanged);
- the fraction `compare_same_top` explanation.

`equivalent_missing_part` and `compare_same_bottom` stay held. They were held because they would come before the hand-written lesson of the **same** skill; that is ordering preference, not scope, and the rule does not change it.

**Actual teaching coverage now:**
- **Inverse operations (14 skills):** 14 general explanations plus 7 fixes, all published. 4 of the fixes are scope-guarded.
- **Fractions (9 skills):** 7 skill-connected explanations. 2 skills are taught by the hand-written lessons, which use authored questions and so are not skill-connected. 0 gaps.
- All explanations remain pending educator review.

## 12. Product walkthrough findings (Claude, on `feat/math-fractions`, #105)

A phone-sized walkthrough of the shipped build (provisional content, "Demonstration" labels) against the real Django API,
through the ordinary learner screens; the script and its workflow live on `walkthrough/*` branches only, never in #105.
Outcomes are reported as **completed**, **awaiting educator** (written work not yet marked) or **blocked**; a finished
recording is not a completed journey.

- **Missing operand → calendar-pattern detour (fixed).** "Find missing operands" (`MATH.algebra.missing-number`) had one
  mandatory edge in graph 1.1.0, from "Extend additive number patterns": a sequence-order artefact that the relation audit
  had not reviewed. Recovery followed it, so a learner whose mistake the app did not recognise was sent to a calendar
  pattern question. The frozen inventory and the mandatory graph are unchanged; `graph-audit.v1.json` 1.1.1 classifies the
  edge `disputed` (not traced in recovery) and `competency-additions.v1.json` 1.1.1 adds supports (never gates) from
  addition and subtraction within 20 and multiplication facts, the operations the skill's questions undo. Lessons stay open
  whatever their prerequisites. Regression: `frontend/src/journey/missing-number-support.test.ts` (graph view, the
  unrecognised-mistake learner, the recognised-mistake learner).
- **One-step equations** are reached through Grade 6 → Mathematics – Standard Six (Tamil Nadu) → Introduction to Algebra →
  2.4 Solving unknowns. The Grade 7 sample's "Simple equations" maps only multi-step `linear-equations`.
- **Same-top comparison** is taught by `compare_same_top` when a learner is right on same-bottom pairs and wrong on same-top.
- **Written work** uses the existing screens: learner submits; parent shares from the dashboard's "Written work" panel;
  educator marks at `/review/` → Marking; learner sees the mark. Granting the educator role is an administrator command
  (`manage.py content_reviewer grant … --role educator`); there is no screen for it.
## 13. Learner routing, educator hand-off and phone walkthrough (Claude, `integration/fractions-learner-handoff`, from #105 `4919cc15`)

Three parallel workstreams with one coordinator. Nothing is merged, deployed or educator-approved. Every explanation and the disputed graph edge below remain **pending educator review**.

### 13.1 Learner routing: why 10 × □ = 30 led to "Patterns on a calendar"

**Trace.**
- The question is `gen:acmissing:3,3,10` in `MATH.algebra.missing-number`, sub-skill `missing.k-times-box@1`. Its solution steps use `MATH.number.multiplication-tables`.
- `recovery()` walked the competency graph (`walkSupports`). That graph's only prerequisite edge is to `MATH.algebra.number-patterns` (`curriculum.v1.json:1828-1830`), whose module is "Patterns on a calendar".
- So the support link came from the competency graph, not from the question. The detour was inappropriate.

**Fix: shared rule `question-supports@1`** (`intervention.ts` `questionSupports`, used by `recovery()`):
- **Order:** the skills the question's own steps use come first, nearest to its topic first, then what those skills build on.
- **Eligibility:** a step skill must have a module and be within the learner's grade or readiness route. Skills 3 or more grades below the question count as background arithmetic and go after the competency's usual supports.
- **Fallback:** with no eligible step skill, recovery uses the old graph walk unchanged. A step skill that is eligible but already shown does not fall back to the graph (which would bring back the detour); the module carries on to its own teaching.
- **Graph data unchanged.**
- **Impact:** 2,161 questions get a different first support and 356 gain one; none lose one. In a 20-question sample: 15 better, 3 neutral, 2 worse (`agptest`, `alrem`, which have sparse step labels).

**Also in this workstream:**
- **`explore-once@1`:** an exploratory question already answered is never served again. This fixes the repeated `fc-d2` on the curriculum Assessment entry.
- **`review-scope@1`:** "Review a supported lesson" follows skill-scope@1. A wrong 300 on 10 × □ = 30 now reviews "The box was multiplied", not the wrong operation. A question outside every skill gets no review button.
- **`lesson-resume@1`:** the lesson position and the open review survive a reload, keyed per learner and per skill.

**Demonstrated** (CBSE Grade 4, real app, phone viewport):
1. A wrong answer leads to "Use multiplication facts · used directly", with a fresh 7 × 8.
2. After a reload, the dashboard says "Carry on" and resumes the module.
3. Other chapters still open.

### 13.2 Educator hand-off for written answers

**Already on this candidate (verified, not rebuilt):**
- written tasks (`HUMAN={'written'}`, 376 tasks);
- `WrittenMark`, `MarkingShare` and the `ContentReviewer` educator role;
- the Marking tab at `/review/`.

Text answers already worked end to end. The stops were:
1. **Drawing tasks:** 148 tasks in 86 competencies need drawing input, which is off (`HANDWRITING_ENABLED=false`). A learner could reach one and not hand it in.
2. **No route to marking:** nothing linked to `/review/`.
3. **Route stopped:** `plan.ts` halted the pathway while a skill waited for a mark.

**Smallest missing pieces built:**
- **Drawing tasks:** `written.ts` adds `keyboardOffered` and `withheldDrawings`. It filters only what is offered, so content, module lists, review hashes and stored records are unchanged.
- **Hook:** the coordinator added the hook in `intervention.ts` `unanswered()`.
- **Coordinator addition:** six construction strategies whose own check is a drawing now reach an honest pause naming the drawing, instead of an unsubmittable task (`drawn-check.test.ts`).
- **Parent:** the parent's Written work section shows how many answers are waiting and, once shared, the `/review/#marking` link.
- **Educator:** `#marking` opens the queue directly.
- **Plan:** a skill waiting for a mark is set aside, and other skills continue.

**Demonstrated in fractions, algebra and geometry:**
1. The learner hands in a written answer on a phone.
2. The parent shares it.
3. The educator signs in on a desktop through the link and marks it (rubric, points, feedback).
4. The learner reloads and sees "Marked correct · n/n" with the feedback, and continues.

A mark writes no content decision; this is tested in Django and e2e.

### 13.3 Phone walkthrough (baseline `4919cc15`, 390×844, normal app selection)

| Journey | Result | Notes |
|---|---|---|
| A: one-step equation / missing number | Completed, with caveats | The review lesson used the wrong operation (fixed in 13.1). Digit-card puzzles (`acplace`) appear in this skill's practice. The delayed check opens after 8 days. Nothing reaches Verified on a non-test build. |
| B: same-top fraction comparison | Completed, with caveats | Diagnosis and lesson were correct. Same-top cannot be chosen as a skill and is never rechecked. |
| Either journey | No educator stop | — |

**Other findings:**
- No link from the English home to `/year/`.
- The step bar says "Explore" when the status says otherwise.
- Follow-up questions are labelled "short check to find the starting point".
- "bottom numbers.." (doubled full stop).
- The dashboard counts 74 vs 53.
- A misleading "Check your connection" error.

The phone layout itself is fine.

### 13.4 Still open (owner decisions; none changed here)

| Item | Effect | Suggested |
|---|---|---|
| ~~Edge `missing-number` < `number-patterns`~~ | **Resolved by #105 `9be50269`** (edge disputed, operation supports added; see 13.6): no calendar fallback remains | Edge still pending educator review |
| `acplace` (digit-card puzzles) filed under missing-number (`b03.ts:1805-1808`) | 160 of 496 practice, 59 of 196 check and 57 of 194 retention items | Move to `MATH.reasoning.puzzle-strategy`; regenerate the library |
| 2,245 questions without step labels | Old graph-walk recovery | Label steps |
| `records.ts:144`: every check after a lesson review counts as assisted | Status "Learning (with help so far)" | Product decision |
| A reload lands on the dashboard (the screen state lives in `Main.tsx`) | One extra tap ("Carry on") | URL-routed screens |
| Educator role granted only by `manage.py content_reviewer grant`; the parent must know the educator's email | Teacher setup is not self-service | An invite screen |
| Drawing tasks | Withheld, not markable | Enable drawing input, then remove the filter (a test ties the two flags) |
| Construction skills can show "Shown on your own" from auto-marked questions alone | Existing evidence rule | Educator review |
| Hand-over acknowledgement | API only, no educator screen | A button in the Marking view |
| `educator-marking.test.mjs` | Not in CI | Add it next to `learning-year.test.mjs` |

### 13.5 Combined validation (candidate `c43b0ee7`: #106 + #105 `9be50269` + claim-teaching@1), one run

| Check | Result |
|---|---|
| Learning package (`bun test packages/learning`) | 1845 pass, 41 skip, 0 fail (112 files) |
| Frontend unit, every `src/**/*.test.ts` (per file) | 1012 pass, 0 fail (93 files) |
| Typecheck `tsconfig.json`, `tsconfig.english.json` | 0 errors |
| Typecheck `tsconfig.mathematics-integration.json` | 1 error, `@types/bun` missing in this environment (same on baseline) |
| Django, whole suite | 327 OK (3 skipped) |
| CI generated artifacts (specs, library, parity, coverage, expansion, board releases, compile-coverage) | Regenerated; no file changed |
| Browser: `e2e/educator-marking.test.mjs` | 5/5 (fractions relevant, fractions incomplete, algebra, geometry, constructions) |
| Phone walkthrough, all five #105 journeys, shipped build | 4 completed, 1 awaiting educator (f, written work not submitted; as on `9be50269`) |

Evidence: branch `walkthrough/pr106-8ff31cf7`, `docs/walkthrough/8ff31cf7/` (app code `8ff31cf7`; `c43b0ee7` changes docs only), with `educator/` for the marking screens.

### 13.6 Reconciliation with #105 `9be50269`

- **Merge** (`49c0b879`): #105's graph-audit 1.1.1 (edge `missing-number` < `number-patterns` disputed) and competency-additions 1.1.1 (supports from addition, subtraction, multiplication-tables) kept alongside question-supports@1, explore-once@1, review-scope@1, lesson-resume@1 and the hand-over work. Only conflict: this README (both added §12; #105's stays §12, this is §13).
- **a2 replayed exactly** on the merge: reproduced both faults. Cause: `moduleState` treated any lesson in the skill after the claim as its teaching (so the claim looked "taught and shown again" and paused at once), and the lesson's introduction quoted the open claim ("…were added…") even when the chosen lesson (`k_times_box`) does not address it. **claim-teaching@1** (`intervention.ts`): the pause needs the claim's own relevant teaching (`teaching.lastAt`), and the introduction names the claim only when `teachingMatchesMisconception` says the lesson addresses it. Regression: `missing-number-support.test.ts` replays the 14 recorded a2 answers through the real session (fails on `49c0b879`, passes now). Walkthrough a2: was blocked, now completed (lesson, guided, fresh check alone, reload, "Shown on your own, also on new problems").
- **Calendar fallback**: already removed by `9be50269` with question-supports@1; reused, no change. All 892 Grade 1–2 missing-number questions (acmissing 364, acplace 276, acfacts 252) lead to addition, subtraction, multiplication-tables or the skill's own lesson; Grades 3–5 sampled the same. Patterns never gate, so chapters stay open.
- **Fraction rubric**: the stored `wr:frc:half-whole` rubric is task-specific and kept. The earlier "mismatch" was the e2e's generic typed answer, not the content; withdrawn. The e2e now checks that the displayed task, `/written/queue/` (exact response, stored rubric) and the educator screen agree, and marks a relevant answer (4/4, "Marked correct") and an incomplete one (1/4, "Partly correct · 1/4" with feedback); the learner sees the mark and carries on.
- Content stays pending educator review; nothing merged or deployed.
