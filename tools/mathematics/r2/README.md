# R2 acceptance datasets: conventions and resolved ambiguities

Everything in this directory was written from `docs/milestones/R2_ACCEPTANCE_SPEC.md` alone.
No existing generator, frozen suite or domain-reasoner implementation was read or imported.

| file | role |
|---|---|
| `refimpl.py` | exact reference implementation (Fractions, own polynomial / rational-function code, no dependencies) |
| `gen_r2_sets.py` | seeded generator of `composition.json`, `reuse.json`, `limits.json`, `tuning.json` |
| `check_sets.py` | independent self-check and baseline measurement; `--write-frozen` writes `FROZEN.md` |
| `FROZEN.md` | SHA-256 of every file, seed, counts, baseline results |

Run: `python3 gen_r2_sets.py` (about an hour on 2 cores; deterministic), then `python3 check_sets.py --write-frozen`.

## 1. Language, states, restrictions

* Grammar: numbers (integers and decimals, parsed to exact rationals), `x`, `+ - * / ^`, unary minus/plus, round brackets,
  explicit `*` only. `2x`, `3(x+1)` and `x(x+1)` are PARSE_ERROR. Exponents must evaluate to an integer constant with
  |k| <= 64 (otherwise UNSUPPORTED_EXPRESSION); `x^-2`, `x^(-2)` are accepted. Exactly one `=`.
* Parsing does not constant-fold or simplify: the tree is the WRITTEN expression.
* Restrictions are extracted from the written expression: every denominator (`/` operand or negative power) and every
  zero-power base contributes the rational roots of its reduced numerator polynomial (so `(x^2-1)/(x-1)` restricts x = 1,
  and `(x-1)^0` restricts x = 1). A denominator that is identically zero, or has real roots that are not rational, is
  DOMAIN_UNRESOLVED.
* A state is `(equation text, restriction list)`. The initial state of a task has an EMPTY list; `restrict` fills it.
  Every other operation also carries forward `old list U extract(old text) U extract(new text)`, so a restriction is never
  dropped by an operation (the verifier still checks growth and retention independently at every step).
  Consequence: `restrict` is only ever applicable as the first step; every witness begins with it when it is applicable
  and allowed. Searches in the generator exclude it (it never shortens a path).
* Solution set of a state: real roots of the reduced numerator of (L - R), minus the restrictions; if that numerator is 0
  the state is an identity on its domain. Two states are EQUIVALENT over the original domain iff the original restrictions
  are retained and the solution sets agree after removing the original restrictions (identities compare excluded sets).
  Irrational factors are compared as a whole (never occurs in the sets).

## 2. Operations (all take a state and, where needed, parameters; return the new state or None)

An operation is applicable only if it changes the state; all rewrites use the tree structure (brackets are real nodes).
A right operand that is a sum (`a - (b + c)`) is a bracket group: `collect-terms` does not look inside it,
`expand` distributes it.

| op | parameters | meaning |
|---|---|---|
| `restrict` | - | add the restrictions of the written text |
| `move-to-left` | - | `L = R` to `L - R = 0` (rhs not already 0); `R` stays a bracket group if it is a sum |
| `combine-terms` | `side` L/R | one side, >= 2 terms with an x-denominator somewhere, to a single quotient over the product of LCD factors; numerator is the unexpanded sum of `term * cofactor`; nothing is cancelled |
| `cancel-common-factor` | `side`, `idx` (term index) | cancel all common polynomial factors between numerator and denominator of that additive term (removable singularity: restriction retained) |
| `clear-denominators` | - | multiply both sides by the LCD of all x-denominators, term by term (needs every term to be a product/quotient without nested fractions; otherwise `expand` first) |
| `expand` | - | distribute brackets/groups/powers of sums; products of monomials are evaluated but like terms are NOT merged; a quotient keeps its (expanded) numerator as one sum |
| `collect-terms` | - | merge like monomials on each side (and inside quotient numerators that are sums of monomials), descending degree; brackets are opaque |
| `add-sub-both-sides` | `term` (a signed single term, text) | add the term to both sides; a syntactically equal opposite term on a side is cancelled instead of appended. The term's own restrictions must already be known |
| `mul-div-const` | `c` (non-zero rational != 1) | multiply both sides by c (every term's coefficient; groups get a factor) |
| `divide-restricted-factor` | `a` | divide both sides by `(x - a)`. Legal only if `a` is a known restriction (state list or written text). Each side must be 0 or a product that contains a bracket proportional to `(x - a)` (syntactic factor, no factoring is performed) |
| `accept-candidate` | - | the state is `x = c` with `c` restricted: the candidate is rejected, giving the no-solution state `0 = 1` |

The search vocabulary of parameters (used by BFS, P2, P3, P4 and for "unreachable") is: every (side, term) for cancel; the
negation of every existing additive term for add-sub; for mul-div the reciprocals of the term coefficients, the lcm of
coefficient denominators, 1/gcd of integer coefficients and -1; every known restriction for divide. "Unreachable" is
therefore relative to this vocabulary (and to depth 8 / 20000 nodes, see section 5).

## 3. Goal predicates (precisely as implemented)

* `SOLVE`: lhs is literally `x` and rhs is x-free with value `c`, `c` not restricted, and (when the start is supplied)
  `c` is not a restriction of the ORIGINAL equation and satisfies it with both sides defined; or both sides are x-free
  (identity if equal, no solution if different). A claimed root that is restricted must first go through `accept-candidate`.
* `CLEARED`: no x in any denominator or negative power (syntactic, on the written tree).
* `REDUCED`: every additive term that has an x-denominator is in lowest terms (polynomial gcd of numerator and denominator
  factors is 1, no nested fractions) AND (when the start is supplied) the number of such terms equals the number of
  start terms whose reduced rational function has a non-constant denominator. This is how "fractions have not been
  multiplied out" is made checkable on a state: combining or clearing changes the count. Resolved ambiguity: the spec does not
  say how to detect multiplication on a single state.
* `ONE_FRACTION_ZERO`: rhs is the literal `0` and lhs is either denominator-free ("a polynomial", any form) or a single
  additive term that is a quotient N/D in lowest terms.
* `EXPANDED_POLY`: CLEARED, rhs literal `0`, lhs a sum of monomials with non-zero coefficients and pairwise distinct degrees
  (any order; no brackets inside terms); lhs `0` counts.
* "Equivalent to the start over the original domain" is checked separately by `refimpl.equivalent` for every step.

## 4. Scope boundary used by the generators

`refimpl.in_scope`: one unknown, every denominator splits into rational linear factors, <= 3 distinct roots among all
denominators, each factor multiplicity <= 2, and the reduced numerator of L - R has degree <= 1 (an identity counts as
degree -inf). Every start in `composition.json` and `tuning.json` is inside; `limits.json` deliberately is not.
Intermediate states (e.g. after `clear-denominators` with a removable singularity) may exceed it.

## 5. Dataset A construction and the computed family definitions

Reverse scrambling: a base state satisfying the goal (`x = c`, identity, no-solution, `p x + q = 0`, a reduced quotient,
...) receives k (3..6; some 2) inverse operations at tree level: split a coefficient, move a term across, add the same term
to both sides, multiply both sides by a constant, group into a bracket, factor a polynomial, multiply numerator and
denominator by `(x-r)` (introduces a removable singularity), divide every term by `(x-r)` (inverse of clearing; `r` may equal
the solution so the root becomes extraneous), split a quotient into a sum, polynomial-division split, swap sides,
shuffle terms, multiply both sides by a bracket. Syntax is varied (swapped factors, `x*x`, `x^(-1)`, spacing, decimals).
The forward witness is then found by breadth-first search over the allowed operations (shortest witness), recorded with
`restrict` in front when applicable. Task fields: `id, family, start, goal, allowed, reachable, witness, notes` plus
`props` (scramble trace, shortest length, family evidence) and, for unreachable tasks, `status` and `excluded_op`.
`allowed` = operations of a witness found with all operations + 0-3 random distractors (+ `restrict`); `solve-mixed`
tasks have all 11 operations allowed (their unreachable variants use a reduced allowed set so exhaustion is feasible).
The family labels are decided by computation, not by label:

1. `order`: the witness contains adjacent steps (a, b) with b applicable before a, and running b, a, then the rest of the witness
   either fails or does not reach the goal.
2. `shortest-not-obvious`: every first move of every shortest witness leaves terms, degree, fractions and their sum
   all >= the start's, while a size-reducing move exists at the start.
3. `local-trap`: the smallest-size successor (P4's choice) strictly reduces size, yet from it the goal is not reachable within
   the shortest length L (so the detour costs >= 2 extra steps or is impossible), with an exhaustive search.
4. `complexity-up`: no witness of length <= 8 stays within the start's terms and degree (BFS restricted to such states finds
   none, no cap hit) although a witness exists.
5. `restriction-gate`: both sides share a syntactic factor `(x-a)`, `a` is not a restriction, so `divide-restricted-factor`
   is structurally possible but illegal; the naive result is computed and shown NOT equivalent to the start (the
   difference of the sides is `m (x-a)`, a degree-1 equation whose root `a` the division would lose); the witness uses a
   legal route.
6. `goal-variety`: one start, >= 3 different goals reachable, shortest witnesses diverge (no one op sequence has all of them
   as prefixes, so no single fixed order serves all goals); P1's outcome per goal is stored.
7. `solve-mixed`: SOLVE, all operations allowed; includes no-solution, identity and extraneous-root cases.

Size measure (for P4 and families 2-4): terms = monomials after full distribution (numerators, plus the number of terms of
each denominator factor), degree = largest numerator or denominator degree, fractions = number of quotient terms.

Unreachable tasks: derived from a reachable task of the same family by removing one operation that its shortest witness uses
and for which exhaustive BFS (depth <= 8, node cap 20000) finds no state satisfying the goal. `status` is `proven-closed`
(the whole state space was enumerated), `proven-depth8` (no goal within 8 steps; the space is larger) or
`unreachable-unproven` (cap hit; not claimed). Resolved ambiguity: the spec says "declared by construction"; the construction
is the removal, the BFS is the guard.

## 6. Baselines

* P1: restrict; cancel-common-factor on each term until none; clear-denominators; expand; collect-terms; move-to-left;
  divide-restricted-factor for every known restriction; then a deterministic linear delegate (collect, move x-terms right
  to left with add-sub, move constants, mul-div, accept-candidate). Stages whose operation is not allowed are skipped.
  The goal is judged at the end only (fixed pipeline).
* P2: `run_priority` with a fixed priority list of the 11 operations (first applicable parameterisation, no revisits, 30 steps).
  For each goal the best list among 90 (the P1 order plus 89 seeded random permutations) is chosen on `tuning.json` only.
* P3: `refimpl.bfs` over the allowed operations, node limit 20000 (depth cap 30).
* P4: greedy: from the applicable (operation, parameter) pairs take the one whose result has the SMALLEST size
  (terms + degree + fractions; may be larger than the current size; ties by operation order then parameter order),
  never revisit a state, at most 30 steps. Resolved ambiguity: "most reduces" is read as "minimum resulting size", otherwise
  P4 could not take any solving step (add-sub does not shrink).
* Success of every baseline: goal predicate holds AND the final state is equivalent to the start over the original domain.

## 7. Datasets B, C, tuning

* `reuse.json`: 60 pairs (12 each of mul-div-const, add-sub-both-sides, collect-terms, expand, move-to-left). `k052` is a
  rational equation, a prefix (restrict, clear-denominators, expand/collect or a linear-delegate stretch) and then the rule; `k051` is
  the polynomial equation the prefix reaches, presented as a plain linear task with no restrictions, and the same rule
  and parameters. Both sides have `expected_eq` (identical by construction) and `expected_restrictions`; each also carries a
  whole-task view (`task`: start, goal SOLVE, a BFS witness).
* `limits.json`: 80 items. `expected.kind` is `refuse` (code(s) in `codes`), `answer` (reference `solution` description)
  or `either` (a correct answer equal to `solution`, or one of `acceptable_refusals`). Time limit 5 s, node limit 20000.
  Conventions: unknown identifiers and variable/non-integer exponents are UNSUPPORTED_EXPRESSION, functions and symbols such
  as `!`, `%`, `<`, `|`, `**` are UNSUPPORTED_OPERATOR, denominators with irrational real roots or identically zero are
  DOMAIN_UNRESOLVED, equations outside the scope of section 4 are UNSUPPORTED_EXPRESSION unless the reference can state the
  solution set (then `either`). PROOF_FAILED and SEARCH_LIMIT are only allowed alternatives (no item requires them).
* `tuning.json`: 60 tasks of the same format (witness included), no family property, goals SOLVE 24, ONE_FRACTION_ZERO 10,
  EXPANDED_POLY 10, CLEARED 8, REDUCED 8; disjoint from `composition.json` by raw and canonical text (checked).

## 8. Determinism

Python hash randomisation does not influence the output (no iteration over sets of strings in decisions; every random choice
comes from `random.Random(seed)`); JSON is written with sorted keys. Traces of `refimpl` are deterministic.
