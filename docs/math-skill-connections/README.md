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
