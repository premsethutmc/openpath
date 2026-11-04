# E7 post-audit diagnosis (Phase 1)

Engine: `837c79c` (unchanged when this was written). Branch: `fix/math-e7-safety-invariants`.
Minimal reproductions: `research/e7-safety/repro.ts`. Baseline output: `repro.before.txt` / `repro.before.json` (6 ok, 24 fail).
Paths below are relative to `packages/learning/src/`.

## Classification key

- **Defect**: E7 violates an invariant that its own contract already states, or that holds for every grading policy.
- **Policy**: the behaviour follows a deliberate, tested rule. The audit labels disagree with that rule, so the owner must decide.
- **Adapter**: an artefact of the audit harness.
- **Label**: an error in the benchmark's expected verdict.

## Findings

### F1. Malformed syntax accepted; unknown notation given an invented meaning — **Defect**

**Repros:** F1a, F1b, F1c, F1d, F1e, F1f.

| Input | What E7 does |
|---|---|
| `sqrt(x+1 = 2` | Parses as `sqrt(x+1) = 2`. Answer-first marks the transition *equivalent*; the unified route returns **verified** (ADV-0327). |
| `3sec(3x)tan(3x)` | Parses as `3·sec·(3x)·tan(3x)`, with `sec` as a variable (CAL-0061). |
| `cbrt(…)` | Treated the same way as `sec` (DOM-0214). |
| `atan(x)` | Parses as `atan·x`, although E7 has an `atan` kind. |
| `sin x^2` | Read silently as `(sin x)^2`. |

**Mechanisms:**

1. `natural-working.ts`, `Parser.prefix()` (line 34), function-call branch:
   ```ts
   argument = peek()==="lparen" ? (take(), expr()) : expr(4); if (peek()==="rparen") take();
   ```
   The closing parenthesis is optional, so an unbalanced call is silently closed at end of input. An unparenthesised argument binds tighter than `^`.
2. Any other identifier becomes a variable (`return V(name)`). `atan`/`arctan` are not in the function list.

**Violated invariants:**
- No silent repair of invalid syntax.
- Unknown notation is not assigned an invented meaning.

**Not a defect:**
- Bare `log` read as natural log is a notation convention: the notation-policy entry below.
- `1/2x`-style refusals are already correct.

### F2. Antiderivative accepted outside the integrand's domain — **Defect**

**Repros:** F2a (`∫2x/(x²−1)dx = ln(x²−1)+C` → **verified**, CAL-0131). F2b and F2c are controls.

**Mechanism:**
- `natural-geocalc-e5.ts:499` `calcIndefinite` judges only that F′ equals the integrand, as an identity: `calculus-binder-e5.ts` `judgeIdentity`, via U4 `certify`.
- It never asks whether F is defined wherever the integrand is.
- The typed route and E6 already run this check (`e6-calc.ts` `typedCalculusDomainGap`, built on `logDomainGaps`; applied in `unified-math-engine.ts:389`). The E5 natural route (`assessE5Route`, `unified-math-engine.ts:231`) does not.
- F2c is caught only because `ln x` falls on a different path. Behaviour depends on the route.

**Violated invariant:** assumptions and restrictions are propagated. An antiderivative claimed for all x must be valid on the integrand's domain.

### F3. Failed canonical-form match treated as a disproof — **Defect**

**Repros:**

| Case | E7 verdict | Correct verdict |
|---|---|---|
| F3a `cos(−x) → cos x` | **invalid** | true identity |
| F3b `cos²x → (1+cos 2x)/2` | **invalid** | true identity |
| F3c `cos(2π/3) → −1/2` | **invalid** | true identity |
| F3d `sin(−x) → sin x` (false) | unsupported | safe abstention: no proof, no witness |

**Mechanism:** `symbolic-equivalence.ts:52` `verifySymbolicTransformation`:
```ts
if (purelyAlgebraic && rel.size===0 && !obligations.length) return base("invalid","exact rational-polynomial normal forms differ")
```
Here `purelyAlgebraic = !hasOpaque(left) && !hasOpaque(right)`, and `hasOpaque` (line 45) does not count `sin`/`cos` as opaque. `sin(·)`/`cos(·)` atoms with different arguments therefore become independent polynomial generators. When the normal forms differ, the code reports a disproof, which is wrong whenever those generators are algebraically related (parity, multiple angles, special values, π).

**Violated invariant:** a failed proof is not a disproof. Refutation needs either a sound decision procedure (generators provably independent) or an exhibited counterexample.

### F4. Domain comparison is syntactic — **Defect**

**Repros:**

| Case | Notation | E7 verdict |
|---|---|---|
| F4a | `6x·6⁻¹ → x` | missing-assumption |
| F4b | `x²·(x³)⁻¹ → x⁻¹` | missing-assumption |
| F4c | `x⁻² → (x²)⁻¹` | missing-assumption |
| F4d | `(x²−1)⁻¹ → ((x−1)(x+1))⁻¹` | missing-assumption |

In each case the domains are identical. 31 audit cases are affected, and the same mathematics in another notation is verified (audit §4).

**Mechanism:** `symbolic-equivalence.ts:44` `domain()` emits string keys (`nonzero:<key(base)>`, `positive:…`, `nonnegative:…`), and a domain change is decided by set difference of those strings. As a result:
- constant conditions (`nonzero:6`) count as restrictions;
- `x²≠0`, `x≠0` and `x³≠0` are different keys;
- a product's factors are not split.

**Violated invariant:** domain equivalence is semantic.

### F5. Assumptions not applied — **Defect** (partly a coverage limit)

**Repros:**

| Case | Assumption | E7 verdict |
|---|---|---|
| F5a `ln(x²) → 2 ln x` | `x>0` | missing-assumption |
| F5c `\|x+y\| → x+y` | `x>0, y>0` | missing-assumption |
| F5b, F5d | — | controls |

**Mechanism:** `symbolic-equivalence.ts:46` `assumed()` matches only by the exact key of the expression:
- `positive(x)` does not give `positive(x²)` or `nonzero(x²)`;
- positivity of a sum is not derived from positivity of its terms.

The log-law obligation in F5a is `positive:x^2`-shaped and is never discharged.

**Violated invariant:** assumptions are propagated.

**Coverage limit (documented, not repaired):** interval assumptions such as `0<x<π/2` cannot be expressed in `SymbolicAssumption` (the kinds are real/positive/nonnegative/nonzero/integer), so they cannot discharge trig poles (ADV-0073).

### F6. Restriction lines read as solution statements; problem premises ignored in transitions — **Defect**

**Repros:**
- **F6a** `x/(x−2)=3/(x−2)` with working `x≠2 / x=3`: unified **incomplete** ("an unjustified jump from all reals except {2} to {3}").
- **F6b**: answer-first transitions `[implied, narrowing]`.
- **F6c** `(x²−1)/(x−1)=2 for x≠1` → `x+1=2`: transition **implied**, "admits more values". The premise already excludes x=1 (DOM-0045).

**Mechanism:** `independent-checker.ts`:
- `builtLines` (line 1009) turns every relation into a chain `Stmt`. A line consisting only of `x≠2` becomes the set ℝ∖{2} and replaces the previous chain statement, so the next line looks like a narrowing jump.
- In `solutionMode` (line 1024) and `answerFirstSolutionSet`, the first transition is related to `stmtFromRelation(rel0)`, not to `stmt0` with its premises (`withPremises`, line 1002). The problem's stated conditions are therefore used for the answer but not for the transitions.

**Violated invariant:** assumptions and restrictions are propagated. A restriction is a premise or annotation, not a claim about the solution set.

### F7. Lost solutions graded *incomplete* — **Policy conflict** (owner decision required)

**Repros:**
- F7a `x²=9 → x=3`: incomplete.
- F7b and F7c: dropping x=0 from `x³=4x` gives incomplete.
- F7d `x²>4 → x>2`: incomplete.

**Mechanism:** this is a deliberate, tested rule, not an accident.
- `independent-checker.ts:1093`: a reduction that drops solutions → `incomplete / narrowing`.
- `unified-math-engine.ts:140` `refineLoss`: the "E2 completeness rule", "a step that only loses solutions is a valid-but-incomplete narrowing".
- `unified-math-engine.ts:303`: special case for `x²=c`.
- Answer-first `answerFirstSolutionSet`: a final answer that is a subset of the solutions → `incomplete`.
- Tests: `proof-integrity-e2.test.ts:136` ("x^2=9 then x=3 is valid-but-incomplete, never verified and never called false") and `verification-closure-e3.test.ts:59`.
- A final completeness claim ("this is the complete solution") already makes it invalid.

**Conflict:** the new invariant ("removing valid solutions is not a harmless incomplete answer") contradicts the E2 contract. Under E2, a bare final line `x=3` is a partial answer, not a false claim.

**Alternatives:**
- **(a) keep E2.** Lost solutions stay incomplete, with the lost values listed as obligations.
- **(b) invalid when stated as the answer.** A working whose last solution statement omits solutions is invalid. A working that stops at an intermediate line, with nothing presented as the answer, stays incomplete.
- **(c) invalid always.** Any solution-dropping step is invalid.

**Planned action:** implement (b) behind a policy switch, `withSolutionLossPolicy("incomplete" | "invalid")`, with the default left at E2 so the existing contract tests are unchanged. Benchmark results will be reported under both settings.

### F8. Missing restrictions, unchecked candidates and cited reasons — **Policy** (owner decision required)

**Repros:**
- F8a `x²/(x−3)=9/(x−3) → x²=9 → x=−3`: verified. The candidate x=3 is eliminated by E7's exact check, not by the student.

**Audit cases:**
- ALG-0178 and others: `(x²−4)/(x²−2x) → (x+2)/x` with no exclusion stated is verified, although the justification notes the unstated restriction.
- CAL-0104 and others: "by the power rule, ∫e^{3x}dx = e^{3x}/3 + C" is verified. The cited reason is not read.

**Mechanism:**
- `independent-checker.ts:28–36`: `CandidateEliminationPolicy = "implicit" | "shown"`, default `"implicit"`. The `"shown"` setting exists and is used only in `verification-closure-e4.test.ts:218`.
- Expression simplifications record the excluded-value note but do not change the verdict.
- Natural-text rule citations are not represented, which is a coverage gap.

**Inconsistency:**
- The equation route can enforce shown checks (under `"shown"`); the expression route never enforces stated exclusions.
- The audit's own holdout labels treat both as missing-assumption.

**Alternatives:**
- **(a) implicit everywhere.** Current behaviour; E7's proof is credited.
- **(b) shown everywhere.** Unchecked candidates and unstated exclusions give missing-assumption on both routes.
- **(c) per-assessment option.** Default implicit; `"shown"` also enforces exclusions on the expression route, so the two are consistent.

**Planned action:** none to defaults. If the owner picks (b) or (c), the change is local to the expression path; it is not implemented now.

### F8b. Derived contradiction judged as an error — **Defect**

**Repro:** `2x+5=2(x+3)`, working `2x+5=2x+6 / 5=6 / no solution` → **invalid** (EQN-0221).

**Mechanism:** in `independent-checker.ts:1053`, a closed false statement → `verified-invalid / independent-false`, regardless of whether it follows from the previous line. Here `5=6` is equivalent to the previous line, whose solution set is empty, so it is a valid derivation of a contradiction, and "no solution" is the correct conclusion.

**Violated invariant:** a valid step is not an error. A closed false line is wrong only when the previous chain line has solutions.

## Non-engine items

| Item | Class | Disposition |
|---|---|---|
| Canonical-variant adapter merged `(x⁻¹)⁻¹ → x` | Adapter | Already corrected in the audit; noted in `MATH_GENERALIZATION_FAILURE_ANALYSIS.md` §4. |
| CAL-0082 expected verdict | Label | Corrected in r2 (`frozen/benchmark.r2.json`). r1 stays the frozen comparison set. |
| 11 workings contain the word "empty" | Benchmark wording | Not student notation; excluded from interpretation, not relabelled. |
| `sqrt(x²) → x` with no assumption gives missing-assumption rather than invalid (37 audit cases) | Policy | Missing-assumption is a defensible reading of a conditional identity. Not changed. Listed for owner awareness. |
| Bare `log` read as ln | Notation policy | Alternatives: ln, base 10, or refuse as ambiguous. Unchanged pending a decision. |

## Repair plan (Phase 2, smallest general changes)

1. **`natural-working.ts`** (F1):
   - require `)` after `(`;
   - refuse unknown function-call identifiers and known-unsupported names (`sec`, `csc`, `cot`, `cbrt`, `asin`, `acos`, `sinh`, …) as `unsupported:`;
   - map `atan`/`arctan` to `atan`;
   - refuse an unparenthesised function argument followed by `^` as `ambiguous:`.
2. **`symbolic-equivalence.ts`**:
   - (F3) refute with "normal forms differ" only when every `sin`/`cos` atom's argument is a distinct bare variable; otherwise refute only on an exhibited numeric disagreement, else unsupported;
   - (F4) compare `nonzero` domain conditions semantically, by polynomial radical and factor reasoning (`core/multivariate/poly.ts`), dropping constant conditions;
   - (F5) derive positivity and nonzero-ness of powers, products and sums from assumptions.
3. **`unified-math-engine.ts` `assessE5Route`** (F2): apply `typedCalculusDomainGap` to a verified indefinite-integral final claim, as the typed and E6 routes already do.
4. **`independent-checker.ts`**:
   - (F6) a line made only of `≠` restrictions entailed by the problem's domain or premises is an annotation, not a chain statement;
   - (F6) the first transition is related to the problem with its premises;
   - (F8b) a closed false line that follows from an empty-set chain line is a valid derived contradiction;
   - (F7) add the `withSolutionLossPolicy` switch, default unchanged.
