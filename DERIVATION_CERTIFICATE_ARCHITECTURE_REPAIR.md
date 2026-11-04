# Derivation certificate architecture repair — design for review

Branch `feat/math-answer-key-certification`, PR #83 (merge blocked), starting at audit commit `c4b9948`. **Design only: no production file was changed, nothing merged or deployed.** The demonstrator (`tools/mathematics/answer-key-certification/architecture-repair/contract-sim.ts`) is imported by nothing. Production suite re-run unchanged: 1353 pass / 0 fail.

## 0. Summary and decisions requested
The audit's six failures share two root causes: (1) **authorization was decided by a side channel that defaults open** (`null`/"not applicable" ⇒ the old rule), and (2) **the certificate proves equality of a block, not permission to introduce it in this task**. The repair: a closed verdict algebra (validity and authorization judged separately, authorization defaults to *unsupported*), and a context-bound certificate whose replay re-derives authorization from the task and from earlier certificates.
Demonstrated on the frozen 281-case corpus (§7): **0 mathematically false acceptances, 0 unjustified derivations verified, 0 previously-supported legitimate cases lost relative to 32c7f2c**; 44 legitimate cases remain unsupported and are listed, not relabelled.
Caveat that matters for the decision: the contract's heuristics were refined while looking at this corpus, so §7 shows the design is *consistent with* it, not that it generalises. A fresh, separately authored corpus is a gate before implementation sign-off.
Decisions needed: **D1** policy P2 (free-parameter strategies only on task-origin terms) vs P1 (any visible term; leaves 15 unjustified accepts); **D2** the 13 regressions against the pre-registry engine need new rules (you said none yet) — accept as a reviewed migration or authorize 3 rules; **D3** assumptions carrier (8 domain-conditioned cases fail closed meanwhile); **D4** where "anchored" strategies (round-number compensation) are pedagogy rather than mathematics, whether they gate verification.

## 1. Preservation
- Frozen: `FROZEN-heldout-corpus.json`, sha256 `af1bac00831d5d61fbc2f32cd2b2aab45206e6fa5bdfc9e2068a7b8f1ab6fb4d` (`FROZEN.sha256`; the demonstrator refuses to run if the hash differs). Labels unchanged: 125 verified / 86 unsupported / 61 invalid / 9 debatable.
- All existing tests preserved (no production edit); the 34 E8 tests stay and become a subset of the new gate.
- Label reconciliation (separate from the corpus; the 9 debatable stay out of every gate):
  | case | question | reasoning | contract outcome |
  |---|---|---|---|
  | regroup-transfer-009/010 | `83−48=(83+2)−(48+2)` equal-shift | mathematically exact, a recognised strategy, but it is not an addend transfer and no registered rule covers it | unsupported (legit, deferred rule) |
  | multistep-014 | five operations in one jump | true; each operation is a single evaluation of visible numerals | verified |
  | algebra-025/026 | task → answer in one line | true and fully determined by the task; no numeral is introduced except the answer | verified (same as today) |
  | negative-020 | `−3^2=9` | standard precedence gives −9, so the statement is **false**; the "debatable" tag only reflects notation | invalid (I would relabel `invalid`; left frozen) |
  | after-verified-011 | ends on `80+5` | a line that is true but not a final value | unsupported (incomplete) |
  | after-verified-015 | `1/2=3/6; 3/6=1/2` | scaling is a representation change; pointless but justified | verified |
  | true-chain-012 | `13×10÷2` | standard strategy, no registered rule | unsupported (legit, deferred rule) |
  I did not dispute any non-debatable label: the one I suspected (`9×8=72; 72=8×9`) is correctly refused by the contract, because factoring a derived value by free choice is not determined.

## 2. Route inventory (every caller of grounding) and fail-open points
| # | Site | Behaviour today | Fail-open defect |
|---|---|---|---|
| 1 | `unified-math-engine.ts` `algebraGroundings` (algebra-text and arithmetic-statement text routes) | `rewriteLicense(pool,…)` returns `null` when no pool entry parses ⇒ falls back to the pre-registry rule | **yes**: pool[0] is the raw statement, so "Compute 18+27" disables the guard (16 audit false accepts) |
| 2 | `e6-numbers.ts` chain rows (~l.659) | visible set is the row's own first member + earlier rows; the task data are never an expression | **yes**: the first member is never judged (`(4+8+3)/3*1`, `((2+2)+8+3)/3`) |
| 3 | `natural-geocalc-e5.ts` l.171 | `literalProvenance` with old rule only | not wired: `(180−50−60)*1` verified |
| 4 | symbolic exemption in `algebraGroundings` | `polynomialKey` equality ⇒ numerals exempt; license is `null` for any variable line | **yes**: `x=6→x=1+5`, `3x×1=24`, `2x=3+13` |
| 5 | `literalProvenanceOne` | numeral 1 explained as implicit coefficient; negative values are not atoms | enables `×1`, negative splits |
| 6 | `certification-authority.ts` l.128-151 | accepts a derivation obligation as covered when its line is in `groundedLines` | consumer: trusts whatever the routes above say |
Authorization is therefore not a single decision point. The repair makes it one.

## 3. Revised contract
**3.1 Verdict algebra.** A line has two independent judgements:
- *Validity* V ∈ {true, false, undetermined} — exact kernel/rational arithmetic only.
- *Authorization* A ∈ {authorized(cert), refused(reason), not-applicable-by-contract}. The default is `refused("no-registered-justification")`. `null` no longer exists: a route that cannot construct a `TaskContext` or a certificate returns `refused("task-unparsed" | "route-unwired")`.
Final classification: any V=false ⇒ `invalid` at the first false line (validity is evaluated first and for all lines, so an unauthorized line before a false one cannot hide it); else all lines A=authorized and ends at a value ⇒ `verified`; else `unsupported` carrying the refusal reason. "Unsupported legitimate" and "mathematically false" therefore stay distinguishable by construction: `invalid` is reachable only through V.

**3.2 Task context** (`TaskContext`, produced by one function `normalizeTask(statement, problem)`): `{ taskId = sha256(canonical task), expr[] (parsed trees), numerals (with written form), assumptions[], parseSpan }`. Wrapper handling is exactly: strip a fixed list of imperative prefixes and trailing punctuation, extract `for <condition>` into `assumptions`, then require the remainder to parse. Anything else ⇒ `task-unparsed`. Assumptions present ⇒ `refused("assumption-without-carrier")` until D3.

**3.3 Certificate v2** (`openpath-rewrite-certificate@2`):
```
{ version, registryVersion, verifierVersion, kernelVersion,
  taskId, taskDigest,                              // context binding
  line, sourceTermId, source{expr, path, origin},  // origin: task | derived(depCertDigest)
  replacement{expr, termIds[]}, rule, parameters{k…},
  grade: determined | anchored | parametric,
  assumptions[], restrictions[],                   // carried, not dropped
  dependsOn[certDigest…],                          // DAG of earlier certificates
  kernel: KernelCertificate (block) , whole: KernelCertificate,
  digest }
```
**3.4 Replay is contextual and deterministic.** `replay(cert, taskContext, priorCertificates)` (a) checks versions and digest; (b) requires `taskDigest` = the context's; (c) requires every `dependsOn` digest to be a replayed prior certificate of this task, and the source expression to be the current *visible* expression (the task, or the result of a dependency) at `path`; (d) re-checks rule admissibility, the grade and the origin policy against the context; (e) re-verifies each block and the whole with the kernel; (f) checks assumptions/restrictions are carried. No search, no clock, no randomness; inputs sorted canonically; same inputs ⇒ same bytes. A certificate valid in another task, or after its dependency is removed, fails (c).

**3.5 Dependencies and cycles.** Each term in a visible expression has a `termId`; a step *consumes* source termIds and *produces* replacement termIds. Within one line, a produced term may not be consumed by another step of that line and a replacement part may not equal another step's source (this is the cyclic-split pad: `46→29+17` and `29→46−17`). Across lines, `dependsOn` forms a DAG by construction (a certificate can only cite earlier digests). Grounding of a numeral requires a finite chain to a task numeral; a cycle yields no chain.

**3.6 Authorization grades (replaces the "answer-valued" restriction).**
- `determined`: the rewrite has no free choice — evaluate, distribute, place-value split (parts are a grouping of the numeral's own digit×10^k parts), reduction, common-denominator scaling (target denominator = a visible denominator or their lcm), decimal ↔ lowest-terms fraction.
- `anchored`: one free parameter, tied to a visible sibling or a round target (compensation `98→100−2`, shifts `(37+3)+(59−3)`, `−6+9→−6+6+3`).
- `parametric`: a free parameter with no anchor (`6→4713−4707`, `96→95+1`, `fraction scaled by an arbitrary k`).
Policy **P2**: `determined` is authorized from any term; `anchored` only when the source term is **task-origin** (the term, or its value, occurs in the task); `parametric` is refused. P1 (authorize all grades) is kept for comparison. This is what answer-valued tried to do, but as a property of *provenance* rather than "the value of a computation": it blocks `85=40+45` and `−4=−10+6` yet permits `85=80+5` and `5/6=5/6` reductions, and it needs no sign special-case.

**3.7 Route-uniformity.** Every route calls the same `authorizeLine(ctx, priorCerts, line)`. Symbolic sides use the same matcher (variable terms are ordinary terms); balance operations are a registered family (same operation and parameter on both sides, parameter visible); a neutral element (`×1`, `+0`, `/1`, `^1`) that is not the result of an evaluate is refused by a structural rule, not by listing examples. `literalProvenance` remains only as a *feeder* for already-authorized lines; it can no longer authorize.

## 4. Representation normalization
Normalize for comparison, never for provenance: terms keep their **written form** (`0.75`, `3/4`, `−4`) and a value `Q`. Findings: the audit's decimal regression came from storing licensed numerals as `Q.str()` ("3/4") while the grounding checks the written "0.75"; negatives were not atoms because they are `0−n` trees. Contract: (a) atoms are signed rationals with a recorded written form; (b) decimal ↔ lowest-terms fraction is a `determined` representation change, anything else (`1/2→2/4`) is scaling with a recorded parameter and grade; (c) grouping/parenthesization is erased by flattening before matching, but each term keeps a path so that bracket-sensitive *shifts* match flat and grouped writing alike (`38+2+60−2` ≡ `(38+2)+(60−2)`); (d) symbolic and numeric sides use one tree type; (e) the kernel receives exact constants.

## 5. Validity versus authorization — the four cases
| line | validity | authorization under P2 |
|---|---|---|
| `85=80+5` (after `38+47=85`) | true | determined (place-value) ⇒ authorized |
| `5/6=10/12` | true | scaling by k=2: parametric unless 12 is a visible/lcm denominator ⇒ **refused** (reported unsupported-legit; needs D1/rule decision) |
| `0.3+0.45=0.75` | true | evaluate of visible closed expression; representation fixed (§4) ⇒ authorized |
| `5×(2+9)=5×2+5×9` | true | distribution with unevaluated products: **no registered rule yet** ⇒ unsupported (D2) |
`85=84+1`, `85=40+45`, `96=95+1` are *true* and refused (parametric, derived source); `85=84` is *false* and is `invalid`.

## 6. How the contract prevents the six failures (by principle, not by example)
| Failure | Mechanism |
|---|---|
| Cyclic-split padding | §3.5: a step may not produce a term another step of the line consumes, nor reuse another step's source as a part; a single conservation check on `termId`s |
| Statement-wrapper bypass | §3.1-3.2: no `null` path; no `TaskContext` ⇒ refused; one normalization function for all routes |
| Negative answer splitting | §3.6: authorization depends on origin and grade, not on a value-equality test; atoms are signed (§4) |
| Symbolic-route bypass | §3.7: one `authorizeLine` for every route; neutral-element and balance rules are structural |
| Arbitrary-constant laundering | §3.6: parametric refused; anchored only on task-origin terms; every parameter is recorded in the certificate for audit |
| Context-free replay | §3.4 (b)(c)(d): task digest, dependency digests, visible-expression and origin checks are part of replay |

## 7. Demonstration on the frozen corpus (`contract-sim.ts P1|P2`, raw `sim-results-*.json`)
Numeric tasks: full verdict from exact arithmetic + the unchanged production matcher + the authorization layer above. Symbolic tasks: production verdict with the contract's strengthening checks overlaid (it can only refuse). Validity evaluated first.
| | match | false accepts | legit unsupported | other | invalid at correct line |
|---|---|---|---|---|---|
| production @32c7f2c (statements normalized) | 204 | 10 | 55 | 3 | 60/61 |
| contract P1 | 212 | **15** | 44 | 1 | 60/61 |
| contract **P2** | **227** | **0** | **44** | 1 | 60/61 |
(9 debatable excluded.) Mathematically false accepted: 0 in all columns. Previously supported legitimate cases lost: **0 vs 32c7f2c**, **13 vs the pre-registry engine 5d6003e** (missing rules: unevaluated distribution `a(b+c)=ab+ac` and `(b+c)÷a` — 6; fraction multiply/divide/add-numerators — 3; evaluation inside a power base and across factor groups — 3; `5×18×2` regroup chain — 1). The other 'other' case is `5÷0=0` (undefined; stays unsupported).
Legitimate cases still unsupported (44, not relabelled): 24 no registered rewrite (above plus equal-shift subtraction, `×10÷2`), 9 production-route unsupported (algebra tasks written as expressions, e.g. `3x+2x`), 8 domain-conditioned (assumption carrier, D3), 2 parametric scalings (`25×36=25×4×9`, `25×18=25×2×9`; factor-compensation is not anchored by the current predicate), 1 task not parseable (`Given x=5, find y…`).
Honest limits of this demonstration: heuristics (round-number and sibling anchors, task-origin by numeral membership) were adjusted after seeing corpus failures; the symbolic half is an overlay; certificate structure, replay and performance were not implemented, so those gates below are **not** demonstrated.

## 8. Source-level integration plan (after review)
1. New `task-context.ts` (`normalizeTask`, `TaskContext`) — single wrapper handler; routes 1-3 call it.
2. `rewrite-registry.ts` → v2: `termId`s, `origin`, `grade`, `dependsOn`, `authorize(ctx, prior, line)`, contextual `replay`; matcher unchanged except a conservation check and flat/grouped shift matching.
3. `claim-grounding.ts`: `literalProvenance` returns facts only; authorization moves to `authorizeLine`. Remove implicit-coefficient "1" as a free explanation for lines that fail structural neutral-element detection.
4. `unified-math-engine.ts`: `algebraGroundings` and `gateAlgebraText` consume `authorizeLine`; delete the regex exemption guard and `hasFlattenedNumberComputation`; `null` license removed.
5. `e6-numbers.ts` and `natural-geocalc-e5.ts`: pass the task expression as the first visible expression; wire to `authorizeLine`; route-specific adversarial tests added.
6. `certification-authority.ts`: require certificate digests (not bare line numbers) in `groundedLines`.
7. Authoritative grading semantics unchanged; any change in classification of previously verified work ships behind a migration table (old/new side by side) for separate review.

## 9. Risk analysis
- **Over-refusal (largest):** 13 regressions vs 5d6003e until rules are added; mitigated by reporting, not hidden. 
- **Heuristic anchors** are pedagogy, not mathematics; a wrong anchor admits laundering (round-number target) or refuses a legitimate strategy. Mitigation: grade recorded, advisory flag, D4.
- **Task-origin by numeral membership** is coarse (a derived value that coincides with a task numeral counts as task-origin); replace by termId lineage in implementation.
- **Symbolic coverage** depends on extending the matcher to equation moves; until then the overlay refuses less than it should (production half unchanged).
- **Overfitting:** see §0 caveat. **Performance:** certificate v2 adds hashing and dependency replay; expected same order as today (median ~1.5 ms, p99 ~30 ms on the corpus) but unmeasured.
- **Semantics:** wrapper list is closed (a new phrasing fails closed as `task-unparsed`).

## 10. Validation gates — status
| Gate | Status |
|---|---|
| Zero mathematically false acceptances | demonstrated on frozen corpus (0); not yet re-measured in production |
| Zero unjustified derivations in frozen safety corpus | demonstrated (P2: 0 false accepts); **needs a fresh corpus** |
| No new false rejections vs previously supported | **met vs 32c7f2c, unmet vs 5d6003e (13)** — decision D2 |
| No fail-open routes | by construction in design; route tests not yet written |
| No context-free authorization | by construction; not implemented |
| Deterministic replay | specified; not implemented |
| Full regression + performance distribution | production unchanged: 1353/0; new-design performance not measured |
No merge approval is requested.
