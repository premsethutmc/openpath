# 02 General transformation-rule inventory (`openpath-derivation-authority@3`)

## How a line is judged

Every rule works on parsed expression trees and on the task's explicit assumptions; none matches a question pattern.

**One operation per line.** A line is authorized when it is ONE operation from the line before, followed only by authorized rewrites of each side. These are:
- registered rewrites, with determined grade only;
- or kernel-checked polynomial normalisation.

A line combining two operations (`x/6 − 1 = 4` → `x = 30`) is still refused as unsupported. This keeps the existing "one visible operation" policy.

**Exact validity check.** Every authorized equation or inequality line is also checked by `solution-sets@1`. A move may never lose a solution. Only an implication move may gain one.

## Rules

**Added in @3:**

| Rule (move kind) | What it covers | Soundness condition | Replay evidence |
|---|---|---|---|
| `balance-add` | Add or subtract a visible term or a whole side on both sides, including variable terms (`2x + 3 = x + 7` → `x + 3 = 7`; `x^2 = 9` → `x^2 − 9 = 0`) | Always an equivalence; checked exactly | Side rewrites (registry / kernel), move and parameter in the certificate; re-authorized on replay |
| `balance-multiply` / `balance-divide` | Multiply or divide both sides by a visible number, the common denominator (numeric LCD, decimal places), a variable denominator, a product of variable denominators, or a variable factor | The multiplier is provably nonzero: a nonzero number; declared nonzero; the task's own denominator (natural domain); or no real root in the domain (Sturm). Otherwise multiplying is `implication:multiply` and dividing is refused | Same, plus the nonzero proof is re-derived on replay |
| `implication:multiply`, `implication:square` | Multiply by a possibly-zero expression; square both sides | Implication only: may gain extraneous roots. Afterwards the session is in candidate mode | The relation (`implies`) is recomputed exactly on replay |
| `candidates`, `candidates-before-domain`, `check-candidates` | List every candidate (all rational roots, read off where visible); then keep exactly those that solve the TASK in its domain | The kept set must equal the task's exact solution set, and must be a subset of the listed candidates | Exact sets recomputed on replay |
| `split-zero-product`, `split-square-root`, `branchwise`, `branchwise-solve` | `A·B = 0` → `A = 0 or B = 0`; `L² = c` → `L = r or L = −r` (rational r); then each branch moved or solved on its own | Each branch step is a registered equation move | Re-authorized branch by branch |
| inequality moves (`identity`, `symmetry`, `side-rewrite`, `balance-*`) | Linear and polynomial inequalities | A multiplier needs a provable sign. A negative multiplier reverses the relation (checked). An unknown sign is refused. Every inequality step must be an exact equivalence | Relation and sign re-derived on replay |
| `substitute` | Under task bindings ("Given x = 3", "… when x = 4", "find y where y = …"): replace the bound variables by their values | Exact; truth is judged with the values substituted | The substitution is reproduced on replay |
| factorisation (in polynomial normalisation) | Rewriting any polynomial expression into a product of expanded, collected factors (`(x²−3)² − 4x²` → `(x²−3−2x)(x²−3+2x)`) | Kernel-checked identity | Kernel certificate |
| task normalisation | Verbs ("expand and simplify", "solve for x:", "find x:"); square brackets; superscripts; conjunctive conditions (`x ≠ 20 and x ≠ −20`); conditions `x ⋈ c` for any c; inequality tasks | Notation only; no meaning added | Part of the task digest |
| `notation@1` refusal | `1/2x`, `3/4(x+1)`, `x/2/4`, `9^1/2` | Two readings exist, so the line is never read and never certified | — |

**Kept from Milestone 2:** identity, symmetry, side-rewrite, closed balance, transposition, cancel-factor / cancel-divisor, solve-linear (one visible inverse operation), answer-claim (first line), zero-product, square-root, and the registered arithmetic rewrites.

## Examples for every newly supported family (all in `derivation-generalization.test.ts`)

| Family | Valid (certified) | Invalid (refuted, with a witness) | Unsupported (neither) |
|---|---|---|---|
| Add / subtract both sides | `2x+3 = x+7` → `x+3 = 7` → `x = 4` | `x+3 = 10` (x = 4 is lost) | `x + 3 = 7 and x = 4` (unparsed) |
| Multiply / divide by nonzero | `3(x+2) = 18` → `x+2 = 6`; `x/3+15 = 20` → `x+45 = 60` | `x² = 6x` → `x = 6` (x = 0 is lost) | dividing by `(x−1)` when it is not proven nonzero |
| Factorise and zero product | `(x−7)(x+3) = 0` → `x−7 = 0 or x+3 = 0` → `x = 7 or x = −3` | `… → x = 7 or x = 3` (x = −3 is lost) | `x² − 4x = 21` → roots (`solve-jump`) |
| Squaring and candidates | `x−4 = 2` → `(x−4)² = 4` → … → `x = 2 or x = 6` → `x = 6` | keeping `x = 2` (`keeps-extraneous`) | — |
| Rational equations | `x²/(x−2) = 4/(x−2)` → `x² = 4` → … → `x = 2 or x = −2` → `x = −2` | `x/(x−1) = 1/(x−1)` → `x = 1` (`excluded-value`) | multiplying by `(x−2)(x+4)` and expanding in the same line |
| Inequalities | `−2x > 4` → `x < −2`; `2x − 3 > 7` → `2x > 10` → `x > 5` | `−2x > 4` → `x > −2`; `6/x > 2` → `6 > 2x` (x = −6 is gained) | multiplying by `x` of unknown sign, where it happens to keep the set |
| Substitution | `5x²−7x+5` at x = 4: `5(4)²−7(4)+5` → `80−28+5` → `57` | `… → 47` | substituting and factorising in one line (`substitution-combined-with-other-steps`) |
| Irrational roots | — | `x² − 2 = 0` → `x = 1.41` (−√2, isolated in a rational interval, is lost) | `x = 1.41 or x = −1.41` (an approximation: a marking decision) |
