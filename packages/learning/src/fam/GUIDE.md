# Writing a question family (families@2)

A family is a reusable, versioned generator of one kind of mathematics problem for ONE competency. An educator
approves the family as a whole (its fingerprint), so everything it produces must be right, kind and clear.
Read `../family-kit.ts` (the contract) and two existing families in `../families.ts` (`mul`, `pct`, `lin`) first.

## The contract (`Def` in family-kit.ts)

| Field | What it must be |
|---|---|
| `id` | short, `[a-z0-9]+`, unique across ALL families (check `FAMILIES` and `fam/*.ts`) |
| `arity`, `domain` | integer parameters only; `domain` gives inclusive ranges; `keep` narrows; `reject` gives a reason |
| `competency` | an id from the competency graph (`content/mathematics/curriculum.v1.json`, `content/learning/competency-additions.v1.json`, or the expansion file named in your task) |
| `type` | an answer type (below) |
| `prompt(p)` | the question, plain words, age-appropriate, Indian context where a context is used (₹, names like Anu, Ravi, Meena) |
| `solve(p)` | `{ steps, answer }`: the solution STRUCTURE, each step tied to the competency it uses |
| `validate(p, answer)` | an INDEPENDENT check by a DIFFERENT method from `solve` (counting, repeated addition, substitution back into the equation, brute-force search over a range, numeric evaluation at points, inverse operation, Simpson's rule). Never call `solve` or copy its formula. It must refuse every wrong answer your explanations predict (checked). |
| `bugs(p)` | written explanations of real, common mistakes, each with `predict` (the wrong answer that mistake gives here), `kind`, the `competency` whose teaching fixes it, and `probe` (a question id of another family that tests the underlying fact) where one exists |
| `explain(step)` | the learner-facing sentence for a step |
| `difficulty(p)` | 1, 2 or 3 |
| `teach` | `idea` (why it works) and `method` (how to do it), each one or two sentences; `alternatives`: at least ONE further way of explaining (e.g. a picture or concrete model for younger grades, a different method for older), each `{ id, title, kind, text: [..] }`, optional `visual` |
| `figure(p)` | a picture the question needs (Grades 1–5 especially: dots to count, a clock, coins, a bar chart). See "Pictures". |
| `word(p)` | the same mathematics in an everyday situation (the transfer question). Strongly recommended. Same answer (a choice family's everyday form keeps its `choices` and letter). |
| `mc` | `true` if a multiple-choice form makes sense; options come from your explanations' predictions, topped up by `distractors(p)` |
| `decimals` | `true` for money, measures and statistics: answers and options are shown as decimals (54.5, not 109/2) |
| `cap` | at most this many problems released (use 300–600 for large domains). With a cap, a domain of more than 300 000 combinations (e.g. five-digit numbers) is SAMPLED deterministically instead of listed, so large numbers are fine |
| `variants(p)` | other parameter choices of the same family (follow-ups); may return `[]` |
| `parse(t)` | read a typed problem if easy, else `() => null` |
| `limits` | one sentence on what the domain deliberately leaves out |

Size: the release pool must have at least **80 problems** (the pool is split by a fixed hash into diagnosis 10 %,
checks 20 %, practice 50 %, delayed check 20 %; a module needs 3 / 6 / 15 / 6). Aim for 150–600.

## Answer types (`../answer-types.ts`)

| type | answer written as | use for |
|---|---|---|
| `integer` | `-12` | whole-number answers |
| `fraction` | `3/4`, `0.75`, `1.5` (equal values are equal) | fractions, decimals, money (₹12.50 → `12.5`) |
| `set` | `2, -3` rational numbers, any order | several rational answers |
| `choice` | a letter A–D for the family's own options: set `choices(p)` (2–4 distinct strings, e.g. `["North", "South", "East", "West"]`) and return the INDEX of the right one from `solve` (0 = A); predictions are indices too | answers that are words, names or statements (directions, shape names, which statement is true) |
| `exact` | `2√3`, `(1 + √5)/2`, `x^2 - 9`, `2ab - b^2` | surds, exact trig values, algebraic expressions (polynomials in any letters, surd coefficients) |
| `roots` | `(1+√5)/2, (1-√5)/2` | solutions with surds |
| `tuple` | `(3, -2)`, `(1, 0, -4)` | points, vectors, ordered lists, sequences |
| `matrix` | `[[1, 2], [3, 4]]` | matrices |
| `interval` | `x > 3`, `-1 < x <= 4`, `(-inf, 2] U (5, inf)` | inequalities, domains, ranges |
| `ratio` | `3:4` (NOT reduced: `6:8` is a different answer) | ratios in simplest form |
| `mixed` | `3 2/5` (simplest form: `17/5` and `3 4/10` are different answers) | mixed numbers |
| `expression` | `2x cos(x^2)` (checked at sample points) | derivatives, trig identities, anything with functions |
| `antiderivative` | `x^3/3 + C` (up to a constant) | indefinite integrals |

`solve` returns the answer as a number (integer, fraction) or number[] (set), or as a STRING in the type's own form
for the other types (e.g. `"2√3"`, `"(3, -2)"`, `"x > 3"`). Predictions in `bugs` use the same form. Write answers in
the simplest conventional form (that is what the learner sees as the answer).

Units: put the unit in the prompt ("in cm", "in rupees") and ask for the number. Time of day: ask "how many minutes"
or use a `tuple` (hours, minutes) — say which in the prompt.

## Pictures (`Visual` in family-kit.ts; the app draws them)

`{ type: "dots", count, rows? }` objects to count · `{ type: "tenframe", filled, frames? }` ·
`{ type: "blocks", hundreds, tens, ones }` base-ten blocks · `{ type: "numberline", from, to, step?, marks?: number[], jumps?: [a, b][], unknown?: number }` ·
`{ type: "clock", h, m }` · `{ type: "coins", items: number[] }` (rupee values: 1, 2, 5, 10, 20, 50, 100, 200, 500) ·
`{ type: "bars", title?, labels, values, scale? }` bar chart · `{ type: "pictograph", labels, counts, key }` (one picture = key items) ·
`{ type: "table", head, rows }` · `{ type: "shape", sides, lengths?: (number|string)[], name? }` (a regular polygon) or `{ type: "shape", kind: "rectangle" | "square" | "parallelogram" | "rhombus" | "trapezium" | "kite" | "lshape", lengths?: [...side by side, starting top-left, clockwise], diagonals?: true, height?: "4 cm" }` ·
`{ type: "angle", deg }` · `{ type: "circle", radius?, diameter?, sector? }` (labels as strings; sector in degrees) · `{ type: "grid", rows, cols, shaded? }` (shaded: a count, filled row by row) ·
`{ type: "triangle", sides?: [base, right side, left side], angles?: [bottom-left, bottom-right, top], right?, height?: "6 cm" }` (side 0 is the base, drawn at the bottom; with right: true, side 0 and side 2 are the legs and side 1 the hypotenuse) ·
`{ type: "plane", points: [x, y, label?][], segments?: [[x, y], [x, y]][], range?, quadrant?: 1 }` (quadrant 1: only x, y ≥ 0, numbered axes) · `{ type: "pie", labels, values }` ·
`{ type: "strips", top, bottom, shaded }` fraction strips · `{ type: "array", rows, cols, split? }` ·
`{ type: "solid", name: "cube" | "cuboid" | "cylinder" | "cone" | "sphere" | "pyramid", dims?: string[] }` ·
`{ type: "balance", left, right }`.

A question that NEEDS its picture (count these, read this clock) must set `figure`; the prompt says "in the picture".
Never ask a learner to draw: drawing, construction and proof are marked by an educator (written.ts), not by a family.

## Quality rules (reviewers check these; tests check what can be checked)

1. Every answer is computed, never typed by hand; `validate` agrees by an independent method.
2. Every explanation in `bugs` is a real misconception at this grade, worded kindly, without jargon, and its
   `predict` is what that mistake really gives for these parameters (never the right answer; drop it when equal).
3. The multiple-choice options are all different under the type's own equality, and exactly one is right.
4. No textbook text, exercise or example is copied. Write your own wording.
5. A problem stays inside the competency's grade: numbers a Grade 1 learner can handle, notation a Grade 12 learner
   expects (formal notation and multi-step derivations in the senior grades).
6. No two families for the same competency do the same thing; a family can be one of several for a competency
   (e.g. "read the clock" and "time after n minutes") — the first one listed for a competency becomes its module's pool.

## Checking your file

```
node --import tsx packages/learning/scripts/check-family.ts packages/learning/src/fam/<your-file>.ts
```
(run from the `frontend` directory with `node_modules` linked, or via the runner your task gives). It builds every
family in the file, runs the full specification validation (deterministic, property-based, boundary), the server's
marking of every answer and every predicted wrong answer, builds the module the family would give, checks pool
depth, and prints samples. Fix everything it reports. It must end with `OK`.
