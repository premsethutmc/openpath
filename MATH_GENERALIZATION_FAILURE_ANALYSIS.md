# E7 generalization audit — failure analysis

Engine `837c79c` (unchanged). Benchmark r1 (2,382 cases), frozen at commit `41cbff2` before execution. Every case is listed in `MATH_GENERALIZATION_RESULTS.json` (repo root) with its input, E7 verdict, expected verdict, outcome, failure class and diagnostic. All 180 decisive failures (false acceptances, false rejections and misgrades) were read by hand; the findings are in `results/review.json` and `results/review.py`.

## 1. Headline metrics (r1; denominators stated)

| Metric | Value |
|---|---|
| Cases / evaluated | 2,382 / 2,375. The 7 exclusions are adapter defects: inputs the adapter could not convert to E7's typed format. |
| Correct verdict | 866 / 2,375 = **36.5%** (95% CI 34.6–38.4) |
| Correct among cases where E7 returned a decision | 758 / 938 = **80.8%** (108 further correct verdicts are expected abstentions) |
| False acceptances (accepted although it should be rejected) | 27 / 1,093 = 2.5% (1.7–3.6). Only **2 are mathematically false** (0.18%); 25 are policy (§3.1). |
| E7 acceptance precision | 378 / 410 accepted cases correct = 92.2%; mathematical precision 408 / 410 = 99.5% |
| False rejections (valid work rejected decisively) | 85 / 1,243 = 6.8%. As E7 verdict: missing-assumption 50, incomplete 18, **invalid 17** |
| Misgrades (wrong non-accepting verdict) | 68 |
| Safe abstentions | 1,329 / 2,375 = 56.0% |
| Parser-related failure rate | 668 of the 1,703 cases sent as natural text = 39.2% (class A) |
| Domain-semantics failure rate | 82 decisive errors / 539 domain-related cases = 15.2%, including 19 policy false accepts |
| Unfamiliar compositions | E7 decides 23.8% of 420 vs 42.9% of the rest; accuracy when it decides 81.0% vs 80.8% |
| Latency (E7, primary channel) | p50 0.66 ms, p95 7.96 ms, p99 17.9 ms, max 68.8 ms (2,248 timed calls) |

r2 differs from r1 by one relabelled case (CAL-0082). Correct becomes 867 and misgrades 67; every other figure is unchanged. See `frozen/REVISIONS.md`.

### Chain length (multi-line workings only)

| Lines | Cases | Correct | No decision by E7 | Decided | Correct when decided |
|---|---|---|---|---|---|
| 1 | 249 | 0.45 | 0.47 | 133 | 0.79 |
| 2 | 433 | 0.32 | 0.73 | 116 | 0.81 |
| 3–4 | 360 | 0.21 | 0.79 | 75 | 0.63 |
| 5–6 | 111 | 0.08 | 0.88 | 13 | 0.69 (wide CI) |
| 7+ | 16 | 0.25 | 0.75 | 4 | 1.00 (n too small) |

Longer chains mostly reduce **coverage**: one unreadable or undecided line makes the whole submission undecided. Accuracy when E7 decides also drops, from about 0.8 for 1–2 lines to about 0.63 for 3–4 lines (n = 75); the 5+ samples are too small for a firm conclusion.

## 2. Failure classes (primary; all failures including abstentions)

| Class | Count | Meaning in this audit |
|---|---|---|
| A Parser / notation | 668 | E7 could not read the student's text, or misread it |
| C Missing operation | 439 | No route can decide the mathematics, e.g. "no bounded exact strategy" or "outside the exact checker's scope" |
| B Representation | 230 | E7's input types cannot express the problem, step or answer. 127 cases cannot be written in its typed format. |
| E Domain / assumption | 66 | Domain conditions or assumptions handled incorrectly |
| G Grading policy vs mathematics | 62 | The maths is right but an obligation is judged differently, or vice versa |
| D Incorrect rule semantics | 27 | A verdict contradicts the mathematics in a way that is not about input form |
| F Composition / multi-step | 10 | Classified only where clearly attributable; see §5 |
| H Unsupported proof obligation | 6 | Proof-style tasks with no verifier |
| J Adapter | 7 | Evaluation-adapter conversion failures, excluded from E7 metrics |
| I Oracle / label defect | 1 | CAL-0082 (corrected in r2) |

By outcome:
- **False acceptances**: G 25, A 1, E 1.
- **False rejections**: E 60, A 11, D 9, B 5.
- **Misgrades**: G 37, D 18, A 6, E 5, B 1, I 1.
- **Abstentions**: A 650, C 439, B 224, F 10, H 6.

## 3. Representative counterexamples (reproducible IDs)

### 3.1 False acceptances

| ID | Input | E7 | Finding | Class |
|---|---|---|---|---|
| ADV-0327 | `sqrt(x+1 = 2` → `x = 3` | equivalent | Unbalanced bracket silently repaired; malformed input accepted | A (math) |
| CAL-0131 | ∫2x/(x²−1)dx = ln(x²−1)+C | verified | Antiderivative undefined on (−1, 1), which is part of the integrand's domain | E (math) |
| ALG-0178, -0189, -0205, -0221, DOM-0193, -0207, -0209, -0211 | Simplify (x²−4)/(x²−2x) → (x+2)/x, with no exclusions stated | verified | E7's justification says "the final line is defined at x = 2 where the problem was not", then verifies anyway | G/E |
| DOM-0159, -0171, EQN-0200, PRF-0033, -0043 | x/(x−2)=3/(x−2) → x=3, denominators cleared with no restriction | verified | Unstated excluded values | G/E |
| EQN-0203, PRF-0036, DOM-0189, EQN-0154, PRF-0072 | sqrt(x+2)=x → x+2=x² → x=2 or x=−1 → x=2 (no check) | verified | E7 credits its own exact candidate elimination as if the student had checked | G/E |
| CAL-0056, -0099, -0104, -0154, -0020, ADV-0105, PRF-0172 | "by the power rule, ∫e^(3x)dx = e^(3x)/3 + C" | verified | Cited rule not read; correct result credited | G (B) |

The holdout convention treats unstated restrictions and unchecked candidates as missing-assumption (e.g. `h7-algA-065`), so these 25 policy acceptances are inconsistent with E7's own labelling practice. They are not mathematical falsehoods.

### 3.2 Correct work rejected or called false

| ID | Input | E7 | Finding | Class |
|---|---|---|---|---|
| TRG-0072, FUN-0061 | cos(−x) → cos x | **invalid** | "rational-polynomial normal forms differ" is used as a disproof | D |
| TRG-0032, -0038, -0051, -0076, -0108, FUN-0069 | cos²x → (1+cos 2x)/2; cos 3x → 4cos³x−3cos x; cos x+cos y → sum-to-product; cos(2π/3) → −1/2 | **invalid** | Same mechanism | D |
| EQN-0221 | 2x+5=2x+6 → 5=6 → no solution | **invalid** | A derived contradiction is judged as a false claim | D |
| CAL-0061 | f'(x) = 3sec(3x)² for tan(3x) | **invalid** | `sec` parsed as a variable times (3x)² | A |
| DOM-0214 | √((−2)²)+∛(−8) → √4+(−2) | **invalid** | `cbrt` parsed as a variable ("differ at cbrt = 0") | A |
| CAL-0141, -0148, -0153 | Integration by parts with "u = x, v = sin(x)" lines | **invalid** | Binding line unrepresentable; the "= …" continuation is compared with v | B/F |
| ALG-0042, -0060, -0086, -0112, MUL-0009, -0017, -0027, ADV-0274 … (31) | x²−2 → (x−√2)(x+√2); x⁻² → 1/x²; (6x)/6 → x; xy → ((x+y)²−(x−y)²)/4 | missing-assumption | "target changes the domain" although the domains are identical | E (form-dependent, §4) |
| DOM-0058, FUN-0108, ADV-0301 … (11) | ln(x²) → 2 ln x with `x > 0` assumed | missing-assumption | Positivity assumption not used by the log rule | E |
| DOM-0160, EQN-0199, PRF-0032, FUN-0147 … (9) | x≠2 / x=3 for x/(x−2)=3/(x−2) | incomplete / invalid | The restriction line is treated as a solution statement | E |
| MUL-0061/62/64 | \|a+b\| → a+b with a>0, b>0 | missing-assumption | Assumptions not composed (a+b ≥ 0) | E/F |
| LIM-0057, -0060, -0063 … (7) | (2+1/x)/(3−2/x) → 2/3 | incomplete | Limit stated with "→" is not read | A |

### 3.3 Misgrades (non-accepting, but the wrong objection)

- **Lost solutions graded incomplete** (18; D). Examples: x³=4x → x²=4 → x=±2 (PRF-0107); x²=9 → x=3 (PRF-0159); x²>4 → x>2 (PRF-0160). The final answers are wrong; E7 says incomplete.
- **Invalid rewrites graded "needs an assumption"** (37; G/E). Examples: sqrt(x²) → x and ln(x²) → 2 ln x with no assumption; x+1 → (x²+x)/x, where the domain narrows. E7 does not accept these and does not report the counterexample.
- **Premises ignored in answer-first transitions** (5; E). For (x²−1)/(x−1)=2 → x+1=2 given x≠1, E7 says one-way and that the step admits {1}, although x=1 is excluded by the premise (DOM-0045).
- **Wrong limit claims not read** (5; A). "degree of top larger, so → ∞" for 2n/(n²+1) (LIM-0064) is graded incomplete.

### 3.4 Abstentions — what blocks E7

| Cause | Count | Examples |
|---|---|---|
| ":" in a line (labels, "Case x>0:", "check:") | 102 | "by the chain rule: 3e^(3x)" |
| Expected expression / trailing notation / solution branches | 101 / 92 / 69 | "x = π/4 + kπ", "x=1, 2 or −2", "x ≤ −2 or x ≥ 3" |
| Power exponent must be a bounded integer | 55 | 2^x, (1/2)^x, x^(1/3) |
| '→' / '·' / '[' | 53 / 19 / 14 | Limits, products, evaluation brackets |
| Division followed by implicit multiplication (deliberate refusal) | 47 | Safe behaviour |
| Symbolic route: "no bounded exact strategy proved or refuted" | 210 | Trig, log and abs identities |
| Answer-first: "outside the exact checker's scope" | 151 | Trig, exp and log equations; several variables |
| Unrepresentable in E7's typed format | 127 | asin/acos, symbolic exponents, log bases, π as a bound |
| Proof-style tasks | 47 correct abstentions, 6 H | Series tests, ε–δ, monotone convergence |

## 4. Form sensitivity (same mathematics, different input form)

The symbolic route was re-run with numeric reciprocals folded to constants (`·4⁻¹` → `·1/4`) and nested positive integer powers merged (`(x²)⁻¹` → `x⁻²`). Domains and meaning are unchanged.

- **19 outcomes change**: 12 false rejections and 7 abstentions become correct.
- **No outcome gets worse.**

An earlier draft of the variant also merged `(x⁻¹)⁻¹` → `x`. That changes the domain, and it produced two acceptances. It was corrected; the error was in the adapter, not E7.

Results: `results/results-canonical.json`. E7's domain comparison therefore depends on the syntactic form of the expression, not its meaning. Direct probes show the same:
- `6x·6⁻¹ → x` is reported missing-assumption, but `6x·(1/6) → x` is verified.
- `x²/x³ → 1/x` is reported missing-assumption, but `→ x⁻¹` is verified.

## 5. Affected invariants

| Invariant | Status | Representative IDs |
|---|---|---|
| A true identity must not be refuted | **Violated** (8 trig + 1 contradiction + 2 parser) | TRG-0072, TRG-0032, EQN-0221, CAL-0061, DOM-0214 |
| Malformed input must not be accepted | **Violated once** | ADV-0327 |
| An antiderivative must be valid on the integrand's domain | **Violated once** | CAL-0131 |
| Domain bookkeeping is semantic (identical domains compare equal) | **Violated** (31, form-dependent) | ALG-0042, MUL-0009, DOM-0036 |
| Assumptions are used where they apply | Partly violated (positivity, intervals, composition) | DOM-0058, ADV-0073, MUL-0061 |
| Restrictions written in the working are premises, not solutions | **Violated** | DOM-0160, FUN-0147 |
| A wrong final answer is invalid | Violated in classification (graded incomplete) | PRF-0107, PRF-0159 |
| Unstated exclusions / unchecked candidates are not credited | Not enforced (detected but verified) | ALG-0178, EQN-0203 |
| Cited rules are checked | Not represented in natural text | CAL-0104 |
| Unknown identifiers are refused | **Violated** (sec, cbrt become variables) | CAL-0061, DOM-0214 |
| Ambiguous notation is refused | Partly (a/bc refused; bare log and sin x^2 read silently) | ADV ambiguity group |

**Composition** (class F is assigned sparingly): on the 420 cases marked as unfamiliar compositions, E7 decides less often (23.8% vs 42.9% of other cases), but its decisions are as accurate (81.0% vs 80.8%). The clearest composition failures are assumption chaining:
- a>0, b>0 is not combined to give a+b ≥ 0 (MUL-0061, -0062, -0064);
- positivity plus a log law (DOM-0058);
- an interval assumption plus a trig pole (ADV-0073);
- a restriction line plus a rational equation (DOM-0160).

## 6. Benchmark and oracle limitations (disclosed)

- **Authorship:** cases were authored by six AI agents under independence rules. They had no access to E7 code or output. Labels were checked by an independent SymPy oracle; 2,250 agree, 102 are policy, 30 are uncertified and flagged.
- **Oracle fixes before the freeze:** the authors' disputes exposed oracle defects, and these were fixed before the freeze (`oracle/CHANGELOG.md`). They include SymPy `solveset` silently dropping trigonometric roots; the oracle now refuses to certify those cases.
- **Post-run review:** one label defect was found and corrected in r2 (CAL-0082).
- **Wording artefact:** 11 workings use the word "empty" as a student line. This is the oracle's notation leaking into student text. Those cases abstained, except EQN-0221, which was rejected for a different reason.
- **Principle counts:** principle strings are almost unique per case. The honest grouping is 371 tested invariants and 836 minimal-pair groups.
- **Not tested:** geometry, probability and linear algebra.
- **Small samples:** chains of 7+ lines (16 cases). Rates there are indicative only.
