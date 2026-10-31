# Derivation grounding — design decision (review of 8ee54f2)

No production code, certification authority, grading, mastery or learner evidence was changed. Evidence is reproducible in `tools/mathematics/answer-key-certification/derivation-audit/` (`bun compare-policies.ts`, `bun heldout.ts`, `bun probe.ts`). Nothing merged or deployed.

## Decision: **Option A, backed by a closed rewrite registry** (reusing the existing `KernelCertificate` — the useful part of Option C). Option B as proposed is **not** recommended.

## 1. Does the proposed rule state a general principle? — Partly, and it was oversold

It encoded one real principle — *a numeral is explained by a rewrite only if the rewrite is recoverable without first evaluating the answer* — but implemented it as pattern matches on additive groups and equivalent fractions. Review found:
- **It is unsound as a policy:** its multiplicative branch covers lone numerals unconditionally, so `37+59 → 96*1` and `37+59 → 2*48` are "explained" (answer smuggling).
- **It is over-strict:** it refuses the legitimate transfer with the shift shown, `(37+3)+(59−3)`, because it treats any cancelling pair as padding; it also refuses `7*(100−2) → 700−14` (distribution) and `100−37 → (100−40)+3`.
- On a held-out set written after the registry was fixed: prototype v1 wrong on 4/20, registry v2 on 0/20 (24-case tuned set: 5 vs 0; truth-only: 9). Both were written by me, so this is evidence, not proof.

## 2. Three independent judgments (kept separate)

| Judgment | Question | Owner | Gates "verified"? |
|---|---|---|---|
| J1 Truth | is the statement true? | exact kernel (unchanged) | yes |
| J2 Justification | does it follow from the preceding state by a certified local rewrite? | **new: rewrite certificate** | yes |
| J3 Pedagogy | is it relevant / needlessly complicated (e.g. `(37+22)+(59−22)`, `40+56` after a shown shift)? | advisory tag only | **no** — never changes classification; any use in mastery needs separate approval |

Invariant 7 (truth is not a derivation) is a statement about J2: truth-only accepts 9 of the 24 designed rejects.

## 3. Arbitrary intermediate constants

Accepted **only when determined**: each introduced numeral is attached to a visible term (a part whose sum/product reproduces it, a shown shift netting to 0 across *distinct* visible terms, a fraction scaling, a factor). Rejected: **unattached witnesses** (`+k−k`, `×k÷k`, `+0`, `×1`) and re-expressions of the answer (`95+1`, `100−4`, `48+48`). Reason: a parametric identity is true for every k, so acceptance cannot tell a justified k from a smuggled one; the engine's existing tests (`derivation-e7`: "a line that smuggles in a numeral the working never derived is not verified") require rejection. They stay **unsupported**, never "invalid" (they are true). There is no principled difference between "unrelated `40+56`" and a "transfer of 3"; the *shown* shift is what justifies the step, so `37+59 = 40+56` alone is unsupported, while `(37+3)+(59−3)` then `= 40+56` (two lines) is verified.

## 4. The symbolic exemption: soundness or policy?

**Policy, not soundness.** Reproduced: `2x+6=12` → `(2x+4713)+(6)−(4713)=12` is **verified**, while `(2x+4713)+(6−4713)=12` and `2x+6+4713−4713=12` are **unsupported**. The guard in `algebraGroundings` (`unified-math-engine.ts:451`) is the regex `\d+ op \d+`, so parentheses defeat it. But no false claim is certified: every line is kernel-checked (a false line, `(2x+17)−12`, is invalid at that line; a false conclusion `x=3.5` is invalid at line 3; `firstInvalidStep` is correct). The defect is an inconsistent grounding policy that admits an arbitrary unrelated constant (4713). Note: my earlier report guessed `(2x+17)−17+6` escapes; it does not (`17+6` is adjacent). The registry makes the policy semantic: `(2x+17)−11` (17−11 = visible 6) stays verified; the 4713 pad becomes unsupported — a **tightening, behaviour change requiring approval**.

## 5. Can the kernel issue transformation certificates? — Partly

`KernelCertificate` (`proof-kernel.ts`) carries `strategy, sourceCanonical, targetCanonical, rules, assumptions, restrictions, obligations, replayDigest` and is replay-checked by `checkSymbolicCertificate` (tamper tests in `verification-closure-e3.test.ts`). Probed: it handles constant expressions (`37+59 ≡ (30+50)+(7+9)` → `equivalent`; the false one → `invalid` with a countercertificate). But: (a) it certifies a **whole before/after pair** — no source path or replacement; (b) for all these cases `rules: []`, `strategy: canonical-identity` — it says *equal*, not *why*; (c) it returns `equivalent` for `(96+17)−17` and `40+56` alike, so it is J1 only; (d) it is used by the symbolic domain and `calculus-methods`, **not** by the natural-text arithmetic/algebra grounding path. So A needs a thin wrapper, not a new kernel.

## 6. Local rewrite vs prototype (24 tuned + 20 held-out cases, `compare-policies.ts` / `heldout.ts`)

| Form | truth-only | prototype v1 | registry v2 |
|---|---|---|---|
| place-value split, `(31+49)+(6+10)`, evaluate groups/whole | ✔ | ✔ | ✔ |
| distributivity `7*(100−2) → 700−14` | ✔ | ✘ | ✔ |
| fraction split / scale | ✔ | ✔ | ✔ |
| transfer, shift shown (`(37+3)+(59−3)`, `(37+22)+(59−22)`) | ✔ | ✘ | ✔ |
| cancellation `(96+17)−17`, `+(5−5)`, `150−(150−96)` (must reject) | ✘ accepts | ✔ | ✔ |
| answer-smuggling `96*1`, `2*48`, `(37+59)*1` (must reject) | ✘ | ✘ | ✔ |
| unshown equal-sum `40+56`, `95+1`, `100−4` (must reject) | ✘ | ✔ | ✔ |
| false equality | ✔ | ✔ | ✔ |

## 7. Recommended design (Option A + registry)

**Artefact.** A `RewriteCertificate` attached to each `derivation` obligation: `{ path, source, replacement, rule ∈ registry, kernel: KernelCertificate(source→replacement), assumptions, restrictions, premises: [visible numeral/fact ids] }`, replay-digested like the kernel's. The numerals it introduces become `derived-fact` sources citing it, replacing the `free-literal` classification. Value truth stays with the kernel; a certificate can only convert `free-literal → derived-fact`.

**Precise invariant.** A numeral not otherwise explained is explained iff it is introduced by a **registered rewrite applied to a visible expression** (the previous accepted line or the task), whose kernel equivalence holds under the stated assumptions and whose side-condition is computed **only from numerals visible in that expression and numerals shown in the line itself**. The value of the whole preceding expression is available only to `evaluate`, whose replacement must be a single atom. No registered rewrite is parametric in an unattached witness.

**Registry (closed, auditable, extendable by review):** identity/commute/associate · evaluate · additive split · multiplicative split · split-into-group · fraction scaling · distribute · shifted transfer (shifts shown, summing to 0).

**Accepts:** `37+59 → (30+50)+(7+9) → 80+16 → 96`; `12*4 → (10+2)*4`; `7*98 → 7*(100−2) → 700−14`; `5/6 → 1/2+1/3`; `(37+3)+(59−3)`; `100−37 → (100−40)+3`.
**Rejects (unsupported):** `(96+17)−17`; `+(5−5)`; `*1`; `95+1`; `40+56` without shown shift; `2x+6 → (2x+4713)+(6)−(4713)`. **Rejects (invalid):** any false equality, as now.

**Remaining unsupported by design:** two registered rewrites in one line (`6*15 → 6*10+6*5`); neutral-element insertion and parametric witnesses (add-zero, ×1, completing the square unless its determined constant `(b/2)²` is registered); equation-level moves combined with rewrites (the `derivation-e7` smuggle case); geometry/calculus/linear-algebra registries; word-problem semantics; chained `a=b=c` (parser contract); percentages and surds until registered. Limit stated plainly: **the registry is a finite catalogue of rewrites, not a theory of all justified steps.**

## 8. Minimal regression plan (after approval)

1. All existing suites unchanged and green (`derivation-e7`, `proof-integrity-e2`, `proof-obligations-e7`, `verification-closure-e3`, `proof-kernel-u4`, `bun test packages/learning`).
2. **Accept table** (6 cases above) → `verified`; **reject table** (6 above) → `unsupported`; false equalities → `invalid` with the correct `firstInvalidStep`.
3. **Property tests:** every registered rewrite instance generated at random is accepted; every random pad (`+k−k`, `×k÷k`, `+0`, `×1`, answer re-expression) is refused; perturbing any numeral of an accepted line is `invalid`.
4. **Metamorphic:** verdict invariant under whitespace and re-association of sums.
5. **Certificate integrity:** a tampered `RewriteCertificate` digest, a certificate for a different path, and a certificate whose `rule` is not in the registry are each rejected (mirrors the kernel's tamper tests).
6. **Behaviour-change gate:** the symbolic exemption change (4713 pad: verified → unsupported) is listed in the PR as an intended tightening; run every existing working corpus in the repo (the e7/E6/U4 test corpora) before and after, and report any verdict change; the 855,926 generated presentations contain questions, not student working, so they do not exercise this.
7. Performance bound (≤ 6 old terms, ≤ 8 new) asserted by test.
