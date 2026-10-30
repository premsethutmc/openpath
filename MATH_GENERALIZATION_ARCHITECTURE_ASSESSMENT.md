# E7 architecture assessment and final decision

This is an independent generalization audit of the unchanged E7 engine (`837c79c`). I built and froze a 2,382-case benchmark (r1, commit `41cbff2`) before E7 was run, then ran it through E7's own entry points:
- the student-facing answer-first kernel, for single statement transitions;
- the unified engine's symbolic typed route, for expression transitions;
- the unified engine's natural-text route, for multi-line workings.

Results are in `MATH_GENERALIZATION_RESULTS.json`. Root causes are in `MATH_GENERALIZATION_FAILURE_ANALYSIS.md` and capabilities in `MATH_GENERALIZATION_CAPABILITY_MATRIX.md`.

## 1. Answers to the twelve questions (evidence-based)

**1. Which principles does E7 handle reliably within the tested scope?**
- When the student's text is readable, E7 handles these reliably:
  - exact solution-set relations between single-variable polynomial and rational statements (equivalent, one-way, lost solutions);
  - inequality sign handling;
  - derivative rules and their compositions;
  - polynomial and multivariable identities.
- Evidence:
  - Answer-first transitions: 256 of 534 correct, 0 false rejections, 1 false acceptance (malformed input).
  - Inequality families: correct on 0.93 of decisions, with 0 false accepts and 0 false rejects.
  - Derivatives: 0.95 when decided. Multivariable identities: 0.96 when decided.
  - Mathematically false acceptances: 2 in 1,093 cases that should be rejected.

**2. Which principles work individually but fail when composed?**
- **Assumptions combined with a rule.**
  - A `nonzero` assumption discharges a rational cancellation, but a `positive` assumption does not license the log law (DOM-0058, FUN-0108).
  - An interval assumption does not discharge a trig pole (ADV-0073, TRG-0094).
  - a>0 and b>0 are not combined to give a+b ≥ 0 (MUL-0061/62/64).
- **Restrictions in different places.** A restriction in the problem statement is honoured, but the same restriction written as a working line breaks the solution chain (DOM-0160, EQN-0199).
- **Cancelling factors in a limit or integral.** Factor-and-cancel works for expressions but is undecided inside a limit working when the final value is written with "→".
- **Unfamiliar compositions overall.** On the 420 cases marked as compositions, E7 decides less often (23.8% vs 42.9%) but is equally accurate when it does (81.0% vs 80.8%). Composition costs coverage, not soundness.

**3. Which failures are caused by student notation rather than reasoning?**
- Class A covers 668 cases, 39% of the cases sent as natural text. The main causes:
  - ":" labels (102);
  - unsupported list forms and answer forms (≈260: expected expression, trailing notation, solution branches);
  - non-integer or symbolic exponents (55);
  - "→" (53), "·" (19), "[" (14).
- Notation also produces **wrong verdicts**, not just abstentions:
  - `sec` and `cbrt` are parsed as variables, so correct work is called invalid (CAL-0061, DOM-0214);
  - an unbalanced bracket is silently repaired and accepted (ADV-0327);
  - a limit stated with "→" is not read, so wrong limits are graded incomplete (LIM-0064).

**4. Which failures are caused by missing operations?**
- Class C covers 439 abstentions:
  - the symbolic route cannot prove or refute trig, log and abs identities (210);
  - the answer-first kernel does not handle trig, exponential or log equations, or several variables (151);
  - limit and integral answer contracts are missing.
- Proof-style mathematics (series tests, ε–δ, monotone convergence) has no verifier. E7 abstains safely on it: 47 correct abstentions, 0 acceptances.

**5. Which failures expose incorrect mathematical semantics?**
- **"Normal forms differ" is used as disproof.** True identities are reported invalid: cos(−x)→cos x, cos²x→(1+cos 2x)/2, cos(2π/3)→−1/2 (8 cases, D).
- **A derived contradiction is treated as a false claim** (EQN-0221).
- **A wrong final answer from lost solutions is graded incomplete, not invalid** (18 cases).
- **Domain bookkeeping is syntactic.** Identical domains are reported as "changing the domain" depending on input form (31 cases). The same identity is verified or rejected depending on whether a constant is written `·1/6` or `·6⁻¹` (§4 of the failure analysis).
- **An antiderivative valid on only part of the domain is accepted** (CAL-0131).

**6. Does E7 safely abstain when it cannot establish a claim?**
- Mostly yes.
  - 1,329 safe abstentions, with only 2 mathematical false acceptances.
  - It correctly abstains on 47 of 53 proof-style arguments and 9 of 10 hostile inputs, and it refuses `a/bc` notation.
- Exceptions:
  - It sometimes **asserts falsehood instead of abstaining**: 17 of its 310 "invalid" verdicts (5.5%) are on correct work. These come from trig normal forms, unknown identifiers read as variables, and binding lines.
  - It silently picks a reading for bare `log` and `sin x^2`.

**7. Does increasing chain length change reliability?**
- Coverage collapses with length. E7 makes no decision on 47% of 1-line workings, 73% of 2-line, 79% of 3–4-line and 88% of 5–6-line workings. The cause is all-or-nothing line accounting.
- Accuracy when it does decide drops from about 0.80 (1–2 lines) to 0.63 (3–4 lines, n = 75). For 5+ lines the samples (13 and 4 decided) are too small to conclude.

**8. Are domain restrictions consistently preserved?**
- No, though E7 does not fail open on mathematics.
  - It detects missing exclusions, but in 16 cases it still returns verified, and its own justification says the restriction is unstated.
  - It mishandles restrictions written in the working (9 cases).
  - It ignores positivity and interval assumptions for logs, abs and poles (≈27 cases).
  - It reports spurious domain changes for constants and nested powers (31 cases).
- Domain-semantics failure rate: 15.2% decisive errors on 539 domain-related cases.

**9. Can the existing representation express the tested reasoning?**
- Partly. These have no representation:
  - inverse trig beyond atan, symbolic or non-integer exponents in typed form, log bases, non-rational limit points (127 cases cannot be written in E7's typed format);
  - case-scoped hypotheses;
  - auxiliary bindings (u, v, u′);
  - cited rules in natural text;
  - conditional answers ("for x ≠ 0");
  - periodic solution sets.
- The core algebraic representation (exact rationals, polynomials, rational functions, roots, abs, elementary functions) is adequate for the rest.

**10. Which failures could be corrected without modifying the core architecture?**
- Most of them:
  - parser strictness and coverage (class A);
  - treating a normal-form mismatch as "undecided" instead of "invalid";
  - normalising domain conditions as sets before comparing;
  - using positivity and interval assumptions in the existing assumption mechanism;
  - treating restriction lines as premises;
  - mapping lost-solution answers to invalid;
  - handling derived contradictions;
  - premise propagation in answer-first transitions;
  - a policy decision on unstated restrictions and unchecked candidates.
- Each of these is local to the parser, the domain or assumption layer, the classification mapping or the policy layer. The certification and obligation design (`certification-authority.ts`, `proof-obligations.ts`) already provides the needed structure.

**11. Is there evidence of a fundamental architectural limitation?**
- Not of the kind that would require a rewrite.
- The weaknesses with the most structural character are:
  1. **Domain conditions are compared by form, not as sets.** This is a design choice in the symbolic and domain layers, fixable by canonicalising conditions.
  2. **A failed normal-form match is treated as refutation.** This is a semantic rule error in one module.
  3. **Several separate representations exist** (natural relations, calculus Expr, verifier tree, E6 tree). Each route reads text differently, so the same mathematics gets different verdicts by route and form. This raises maintenance cost and inconsistency but is not a ceiling on what can be verified.
- Missing scoped hypotheses (case analysis) and missing method or citation semantics are real representation gaps. They are extensions, not contradictions of the design.

**12. Which extensions would give the greatest increase in coverage?**
1. Natural-parser coverage: labels, "→", "·", lists and ranges, scoped "Case …:" lines. Up to 668 class-A cases.
2. Symbolic strategies for trig, log and abs identities, plus exact-scope extensions of the answer-first kernel to trig, exp and log equations on stated intervals. About 361 class-C cases.
3. Limit and integral answer contracts in natural text. Limits currently decide 15 of 145 cases.
4. A scoped-hypothesis representation for case analysis. 81 cases, decided on 20.

## 2. Distinguishing the findings

| Kind | Findings |
|---|---|
| **Defects repairable within the existing design** | Normal-form-mismatch-as-disproof (8 false invalids). Unknown identifiers parsed as variables (sec, cbrt). Unbalanced-bracket repair (1 false acceptance). Syntactic domain comparison (31 false rejections). Positivity and interval assumptions unused (≈27). Restriction lines treated as solutions (9). Premises ignored in answer-first transitions (5). Lost solutions graded incomplete (18). Contradiction lines (1). Antiderivative domain gap (1). Excluded values detected but not enforced (policy, 16). |
| **Missing mathematical capabilities** | Trig, log and abs identity strategies. Trig, exp and log equations in the exact checker. Limit evaluation from natural working. Definite-integral substitution. Implicit and parametric differentiation in natural text. Proof-style verification (series tests, ε–δ). |
| **Genuine representation or architectural limitations** | No scoped hypotheses (case analysis). No representation of cited rules or methods in natural text. No auxiliary bindings (u, v). No periodic or parametric solution sets. Typed format lacks inverse trig, symbolic exponents and log bases. Multiple non-unified representations, so verdicts depend on route and form. |
| **Insufficient evidence** | Geometry, probability, linear algebra (not in this benchmark). Chains of 7+ lines (16 cases). Proof-style tasks (all abstained, so capability is unknown, not absent by evidence). Student-facing path beyond algebra transitions. Labels were authored by AI agents and checked by a SymPy oracle (30 uncertified, flagged); author bias cannot be excluded. |

## 3. Final decision

**Is the E7 architecture a sound foundation for progressively general mathematical reasoning, or is there a fundamental limitation?**

**It is a sound foundation, and the experiments reveal no fundamental limitation. Its present generality is narrow, and a small number of repairable semantic defects make it assert falsehoods on correct work.**

Supporting evidence:
- **Soundness of acceptance holds under adversarial pressure.** Of 1,093 cases that must not be accepted, only 2 mathematically false items were accepted. One is a malformed input that the parser repaired (ADV-0327). The other is an antiderivative domain gap (CAL-0131). Proof-style arguments, hostile inputs and ambiguous divisions were refused.
- **When E7 decides, it decides with the right principle** in 81% of cases, and composing principles does not reduce that rate (81.0% vs 80.8%). The abstractions generalize where they apply; they do not apply widely enough.
- **The dominant failures sit outside the reasoning core:**
  - notation (668);
  - missing operations (439);
  - representation gaps (230);
  - domain bookkeeping done by syntax (66 decisive errors);
  - policy inconsistencies (62).
- **The semantic defects are specific and local:**
  - cos(−x) → cos x reported invalid because a normal-form comparison is used as disproof;
  - `6x·6⁻¹ → x` "changes the domain" while `6x·(1/6) → x` is verified;
  - "x ≠ 2" written as a working line is read as a solution claim;
  - x³=4x → x²=4 → x=±2 graded incomplete instead of invalid.

  None requires a new architecture; each has a clear owner module.
- **Where the evidence points to genuine representation work:** scoped hypotheses for case analysis, cited-method semantics, and auxiliary bindings. These are additive extensions to the existing obligation and certification design, not reasons to replace it.

I therefore do **not** recommend a rewrite. A rewrite would not address the largest measured failure classes (parser coverage, missing operations), which any architecture must build anyway, and the current certification design already confines failures to safe abstention in the overwhelming majority of cases.

## 4. Smallest set of structural improvements (ranked)

Ranking criteria, in order: 1 mathematical safety, 2 generalization benefit, 3 failure mechanisms addressed, 4 compatibility, 5 implementation complexity.

| Rank | Change | Safety | Generalization | Mechanisms addressed | Compatibility | Complexity |
|---|---|---|---|---|---|---|
| 1 | **Never refute without a witness**: an undecided normal-form comparison becomes `unsupported`; `invalid` requires an exact counterexample or exact disagreement with a reference (symbolic-equivalence route) | Removes 8+ false "invalid" verdicts on true identities | Medium | D (trig identities, special values) | High: local rule | Low |
| 2 | **Strict, complete identifier and bracket handling in `natural-working.ts`**: refuse unknown function names and unbalanced brackets; add `sec/csc/cot/cbrt/asin/acos`; refuse bare `log` and `sin x^2` as ambiguous | Removes 1 false acceptance and 2+ false invalids | Medium | A (misreads) | High | Low |
| 3 | **Semantic domain layer**: compare domain conditions as sets (ignore constant denominators and radicands, factor products, merge positive nested powers); apply `positive`/`nonnegative`/interval assumptions to logs, abs, poles and sums | Prevents form-dependent verdicts | High: 31 + ≈27 false rejections; makes verdicts route- and form-invariant | E (domain), part of F | High: inside existing assumption/obligation model | Medium |
| 4 | **Premises vs claims**: restriction lines ("x ≠ a", "for x > 0") and stated premises become context items in `ProofContext` and in answer-first transition diagnosis, never chain statements | Fixes false incomplete/invalid verdicts | Medium | E (9 + 5) | High: `ProofContext` already has student-assumption items | Low–medium |
| 5 | **Classification corrections**: lost solutions or a wrong final set → invalid; derived contradiction ⇒ no solution; antiderivative domain check | Correct verdicts on wrong answers | Low–medium | D (18 + 1 + 1) | High | Low |
| 6 | **Grading-policy decision, then enforcement**: unstated excluded values, unchecked candidates and cited reasons. E7 already detects the first two. Decide whether they block certification, and make answer-first and unified consistent with the holdout convention | Closes 25 policy false accepts | Low | G | High | Low (decision) to medium (cited reasons) |
| 7 | **Natural-parser coverage**: labels with ":", "→" limit answers, "·", ranges and lists, "x ∈ {…}", per-line rather than all-or-nothing accounting | Neutral if 1–2 land first | **Highest coverage**: up to 668 cases | A | High | Medium |
| 8 | **New operations**: trig/log/abs identity strategies; trig/exp/log equations on stated intervals; limit and integral answer contracts | Neutral | High: ≈361 + limits/integrals | C | High: new mechanisms registered in `MECHANISMS` | Medium–high |
| 9 | **Scoped hypotheses** for case analysis, and auxiliary bindings | Neutral | Medium: 81 case-analysis cases plus integration by parts | B/F | Medium: representation extension | Medium–high |

Items 1–6 are small and directly reduce false verdicts; they should precede the coverage work in 7–9. Nothing here has been implemented: this audit changed no production code, and I am waiting for explicit approval before any production change.
