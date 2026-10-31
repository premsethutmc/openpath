# OpenPath — Independent Mathematical Answer-Key Certification

Branch `feat/math-answer-key-certification` (from `feat/unified-grading` @ `3e4c62d`). No production generator, stored answer, parser, grading contract, backend, mastery or decision-record file was changed (`git diff 3e4c62d -- packages backend content apps` is empty). Nothing merged or deployed.

## 1. Baseline (verified from the repository)

| Item | Count |
|---|---|
| Families | 1,080 |
| Released typed questions | 341,483 |
| Presentations (typed + 284,170 multiple-choice + 230,273 word) | 855,926 |
| Kernel-verified by grader contracts (Phase A) | 38,028 |
| Legacy-graded (the rest) | 303,455 |

## 2. Final assessment (the seven questions)

1. **Independently certified: 341,014 of 341,483 typed questions (99.86%)**, every family run exhaustively (no sampling anywhere). "Certified" = an independent reference derived the answer from the statement/figure/parameters and agreed with the stored key; for choice items, exactly one option text is true and it is the keyed letter. 1,056 families are *Fully certified*, 18 *Partially certified*, 6 *Discrepancy detected*, 0 *Unsupported*, 0 *Verification inconclusive*.
2. **Mathematically defective: 455 questions** — 41 invalid statements (aofclass) and 414 undecidable as written (ambiguous): abmeas 108, amcrit 100, amsimc 72, aiconvex 70, aasolid 64. A further 14 (aipi) have the right value in the wrong displayed form (notation, not maths).
3. **Incorrect stored answers: 0** demonstrably wrong typed answers. For the 41 aofclass questions the *statement* is invalid, so the key (C) can be neither confirmed nor refuted as written.
4. **Unsupported or inconclusive: 0 typed questions.** Not independently verified, by design: the *wording* of 230,273 word presentations (their answers equal the typed answer; wording was read for a sample per family only), rendering of figures (data checked against statements, pixels not), and the quality of multiple-choice distractors beyond "exactly one option is correct". See §6.
5. **Generator defects affecting several questions:** aofclass 41 (critical); amsimc 72, aiconvex 70, amcrit 100, abmeas 108, aasolid 64 (ambiguity, medium/low); agmix 248 and amceva 122 (a distractor equal in value to the key, MC only); aipi 92 wording + 14 form; aofund 64, auapk 27 (grammar); anquad 300 (word form only); form/notation: ahcube 13, above 15, alcomp 17, antable 9. Details in §5.
6. **Immediate quarantine: `aofclass`, the 41 listed question IDs only** (handoff `handoff/aofclass-quarantine.json`). Recommended hold-and-fix (owner decision, not critical): amsimc group `[4,*,*]`, aiconvex groups `[1,2,k]` and `[0,2,k]`, amcrit groups `[2,*,*]`/`[3,*,*]`, abmeas (ruler scale), aasolid (cylinder/cuboid objects).
7. **Needed before the curriculum is "reliable":** (a) fix/quarantine §5 items and re-run; (b) wording review of word forms (230k presentations; template-level human or independent review, since only answer equality is automated); (c) render-level check of figures; (d) distractor audit (value-equal and not-in-form distractors, plausible-wrong-answer quality); (e) a second independent implementation for the families the references check by textbook formula only (listed in each `results/*/refNotes.json`); (f) pedagogical review of convention choices (ℕ starts at 1, half-up rounding, "sensible estimate" bands); (g) wire these references into CI so a new/changed generator cannot ship uncertified.

## 3. Coverage (actual question counts, not module counts)

| Slice | Families | Typed questions | Verified | Not verified |
|---|---|---|---|---|
| number-a | 120 | 36,825 | 36,825 | 0 |
| number-b | 121 | 44,708 | 44,708 | 0 |
| algebra-a | 108 | 33,435 | 33,435 | 0 |
| algebra-b | 109 | 43,827 | 43,786 | 41 (aofclass) |
| measurement | 131 | 36,506 | 36,384 | 108 ambiguous (abmeas), 14 form (aipi) |
| sets-reasoning | 65 | 20,213 | 20,213 | 0 |
| geometry-coordinate | 175 | 52,607 | 52,301 | 306 ambiguous (aasolid 64, aiconvex 70, amcrit 100, amsimc 72) |
| calculus-trig-sequences | 139 | 36,794 | 36,794 | 0 |
| statistics-prob-vectors-matrices | 112 | 36,568 | 36,568 | 0 |
| **Total** | **1,080** | **341,483** | **341,014** | 469 (41 invalid, 414 ambiguous, 14 form) |

The authoritative per-question account is `data/per-question.ndjson.gz` (one record per released question: `id, family, cls, note?`) and `data/final-counts.json`.

All 1,080 families were run **exhaustively**; the sampled mode of the runner was never needed. **Choice-letter families** (169; 46,878 questions): the first export carried only the key letter, so 77 of them were first marked Unsupported by the slice agents. After `export_options.ts` (option texts only — no solving data) they were certified in dedicated passes (`choice-pass` 46 families/12,538 q, `choice-pass-geo` 31/10,059, `choice-recheck` 10/3,250 — the last re-verified ten families first checked through an *inferred* letter map, with 0 disagreements). Every choice judge evaluates each option text as a claim.

## 4. Method and independence

- Exporter (`export.ts`) writes statements, parameters, figures and stored answers to JSONL; the Python references never import production code and never derive the expected answer from the stored one. Comparison is mathematical (Phase-A SymPy oracle readers, which import no grading decision function).
- Methods differ from the generators': Fractions/integers and brute-force enumeration (probability, counting, digits, percentages), substitution/identity checks on grids with completeness arguments, SymPy `Poly`/`solveset`, matrix multiplication back, coordinates for geometry, differentiation of proposed antiderivatives with constant/domain checks, series/high-precision numerics for limits, iterating recurrences. Formula-only families say so in `method` and carry one cross-check.
- **Independence disclosures:** (1) one probe printed production solving metadata for an `aabig` item (number-a); not used. (2) Option texts and MC/word presentations come from the production pool export (data shown to students, not solving code). (3) The Phase-A oracle's equality readers are reused. (4) `acnlpos` figure inference. (5) Word-form wording is verified for answer equality everywhere but for wording only on sampled templates.
- **Reference validation** (`data/reference-validation.json`): coordinator mutation test over all 911 non-choice families — 36,390 deliberately corrupted stored answers: 36,314 flagged mismatch, 10 ambiguous, 61 unreadable, 4 reference-unparsable, **1 accepted** (`gen:aopfint:1,0,0,1,0`, "x + log|x| zz": the shared oracle treats a trailing free symbol as the constant of integration — a limit of the oracle on corrupted antiderivative text, not a key defect). Choice families: key-shift mutation flagged 100% in every family of the three choice passes. Agents also ran their own corrupted-answer tests (number-a, measurement, algebra-a: 0 passes) and hand-derived fixtures; reference bugs found along the way (dozens across slices, e.g. `a|b|` parsing, ÷ precedence, SymPy hangs) were fixed and are recorded in each `refNotes.json`, not registered. `test_kit.py`: 7/7 pass.
- Disagreements were investigated, not auto-resolved: every mismatch group was re-derived by hand for the smallest parameters; all but the registered ones were reference bugs.

## 5. Discrepancy register (provisional vs verified)

*Verified* = reproduced by the coordinator or by two independent derivations. All below are verified unless marked.

| Priority | Family | Class / severity | Questions | Finding | Proposed fix (not applied) |
|---|---|---|---|---|---|
| 1 | aofclass | Generator defect / **critical** | 41 | Variant `s=2`, `d<h`: codomain `[f(d),∞)` excludes `f(h)=c`. E.g. `gen:aofclass:-3,2,-5,2`: f(x)=(x+3)²+2 on [−5,∞)→[6,∞), but f(−3)=2∉[6,∞). 259 other questions fine. | codomain `[c,∞)` for `s=2`, or generate `s=2` only when `d≥h`; add a codomain-containment check to `validate()` |
| 2 | amsimc | Ambiguous / medium | 72 (group `[4,*,*]`) | Proportional sides + equal non-included angle with opposite side longer determine the triangle: provably similar, key says "Not shown to be similar" | generate with opposite side shorter, or reword |
| 2 | aiconvex | Ambiguous / medium | 70 (`[1,2,k]` 39; `[0,2,k]` 31) | A,B,C collinear / 180° angle: "quadrilateral" vs triangle | drop group or state convention |
| 3 | amcrit | Ambiguous / low | 100 | ASA and AAS both offered; both valid | ask "which rule applies directly" |
| 3 | abmeas | Ambiguous / low | 108 | mm ruler labelled in cm-numbers | label scale |
| 3 | aasolid | Ambiguous / low | 64 | tin of oil / pencil box read as cylinder or cuboid | drop or specify |
| 4 | agmix | MC distractor / low | 248 | malformed distractor equals key in value | distinct distractor |
| 4 | amceva | MC distractor / low | 122 | unsimplified duplicate of key | distinct distractor |
| 4 | anquad | Ambiguous (word form only) / low | 300 | frame vs glass area | reword |
| 5 | aipi | form + wording / low | 14 + 92 | "two decimal places" with 330; lower-case/garbled sentences | format; reword |
| 5 | aofund, auapk, aosamp, aaname | wording / low | 64, 27, 1, 1 | "1 Chinese dishes", "2th", "up 1 floors"-type, option "undefined" | grammar fixes |
| 5 | ahcube, above, alcomp, antable | form / low | 13, 15, 17, 9 | "+ 0" terms; decimals requested but not shown | formatting |
| – | ajrat, ajrstd, avfas, avlow, agnl, agpfrac | MC distractor note | 450, 400, 363, 360, 25, 160 MC | distractors equal in value to the key but not in required form (a unique correctly-formed option exists in every item) | none required |

Related-defect search (codomain/range/bounds from endpoints; monotonic/endpoint-extremum/codomain=range/critical-point-in-domain assumptions): scanned all prompts stating a domain, codomain, range or extremum (≈40 families). `aorange` (300), `aqabs` (300; endpoint-only evaluation would be wrong on 108 — the keys correctly use interior critical points) and `apinvf` (400) re-derived independently with 0 defects; `aodom`, `aqext`, `aofname`, `aqonto`, the LPP families and the rest are covered by their exhaustive references. **No second family with the aofclass defect was found.** Script: `handoff/scan_range_codomain.py`.

## 6. Not independently established (explicit)

Word-presentation wording (230,273) beyond sampled templates; figure rendering; distractor plausibility; whether lesson/prompt conventions suit the target learners; formula-based references (`method` field) share a textbook formula with the generator in places, mitigated by one non-formula cross-check; `alcyc` uses the converse cyclic-quadrilateral theorems without a numeric cross-check. Families whose notation requirement is not machine-checkable (e.g. "simplify") are flagged in `refNotes`.

## 7. Reproducing

```
export PYTHONPATH="/root/.cache/openpath-vendor/sympy-sympy-1.14.0:/root/.cache/openpath-vendor/mpmath-1.3.0"
cd tools/mathematics/answer-key-certification
bun export.ts /tmp/certdata && bun export_options.ts /tmp/certdata        # data
python3 test_kit.py                                                        # harness self-tests
python3 certify.py --data /tmp/certdata --out /tmp/certout/<slice> --module refs.<module>   # resumable, per-family checkpoints
python3 -m refs.choice_pass_run --out /tmp/certout/choice-pass --force     # choice passes (also choice_pass_geo_run, choice_recheck_run)
python3 aggregate.py --out /tmp/certout --meta ../grading-audit/data/family-meta.json --dest data/ --overlay choice-pass choice-pass-geo
python3 per_question.py --data /tmp/certdata --out /tmp/certout --dest data/ --overlay choice-pass choice-pass-geo
python3 mutate.py --data /tmp/certdata --out /tmp/certmut && python3 certify.py --data /tmp/certmut --out /tmp/certmut-res
python3 handoff/verify_aofclass.py /tmp/certdata/q/aofclass.jsonl
python3 handoff/scan_range_codomain.py /tmp/certdata/q
```
Regression: `bun test packages/learning` 1,319 pass / 0 fail (production unchanged).

## 8. Files

`MATH_ANSWER_KEY_CERTIFICATION_REPORT.md` · `data/certification.json` (per family: status, method, coverage, assumptions, counts, examples) · `data/per-question.ndjson.gz` (per question) · `data/discrepancy-register.json` · `data/final-counts.json` · `data/reference-validation.json` · `results/<pass>/` (raw per-family runner output, registers, `refNotes.json`, `unsupported.json` — empty after the choice passes) · `refs/` (reference solvers) · `handoff/` (aofclass quarantine JSON, verifier, critical note, range/codomain scan) · `kit.py`, `certify.py`, `aggregate.py`, `per_question.py`, `mutate.py`, `export*.ts`, `slices.json`, `AGENT_BRIEF.md`, `test_kit.py`.
