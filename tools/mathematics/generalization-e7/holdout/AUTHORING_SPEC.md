# E7 final holdout — authoring spec (read fully)

You are an INDEPENDENT case author. Goal: write fresh test cases for a mathematical-working verifier and decide each expected verdict **from the mathematics alone**.

## Hard rules
- NEVER run, import, or read the verifier (`packages/learning/src/**` verdict logic, anything named assess/unified-math-engine/e5/e6/certification*). Do not run `bun test`. Do not look at any engine output.
- Do not copy or lightly vary cases from `tools/mathematics/**` (E1–E6 corpora). You MAY read a few of them ONLY to learn the JSON *schema* of a problem form (geometry, probability, etc.); then invent your own problems with different structure, numbers and phrasing.
- Derive every label yourself. Use python/sympy in a scratch dir to check that lines you call true/false really are (this is a math oracle, not the verifier). Write scratch files only under your own scratch dir, never in the repo except your output file.
- Write your output as ONE JSON array file `tools/mathematics/generalization-e7/holdout/authored/<yourbatch>.json` (valid JSON). Then run `bun tools/mathematics/generalization-e7/holdout/compile.ts --check` (it only validates syntax/labels; it does not touch the verifier) and fix errors. Ignore errors from other authors' files.
- Target ≥ your quota of cases. Return only: file path, case count, per-label counts. No long prose.

## Case format
`{"id":"h7-<batch>-NNN","cat":"<batch category>","tags":[...],"p":PROBLEM,"w":WORKING,"exp":"<verdict>","alt":[optional other acceptable NON-verified verdicts],"why":"<one-sentence mathematical reason>"}`

PROBLEM forms (compiled by dsl.ts):
- `{"alg":"2x+3=11"}` algebra statement (equation/inequality/system/identity/expression to simplify; plain ASCII, ^ for powers).
- `{"der":"(3x+1)^5"}`, `{"int":"x e^x"}`, `{"defint":"x^2","a":0,"b":3}`, `{"lim":"sin(5x)/(2x)","at":"0","side":"both"}` (`at` may be "infinity"; optional `"v":"t"` for another variable). Expression syntax: + - * / ^, implicit product (3x, 2(x+1), x sin(x)), sin cos tan ln exp sqrt abs atan, `e^(2x)`, `x^(1/2)`. Integer exponents only (or p/q → root).
- `{"stmt":"Find dy/dx for x^3+y^3=6xy","domain":"calculus","task":"implicit-differentiation"}` for statement-style problems (tasks seen in the corpora: implicit-differentiation, parametric-derivative, fundamental-theorem-derivative, logarithmic-differentiation, double-integral, differential-equation, trigonometric-substitution, improper-integral, series-convergence, epsilon-delta-proof, sequence-limit, limit-squeeze, series, taylor, partial-derivative, ode, numerical-methods, continuity, differentiability).
- `{"raw":{...}}` exact problem object for other domains (geometry, probability-statistics, linear-algebra, complex-polynomial, trigonometry, etc.). Learn the schema from one or two corpus fixtures, then write your own.
WORKING: a string (lines separated by `\n`, the student's submitted working; the last line is normally the answer) or `{"raw":<working object or string[]>}`.

## Verdict vocabulary (label policy — apply exactly)
- `verified`: every claimed line is mathematically true AND justified (follows from the task/previous lines by a legitimate transformation) AND relevant to the task, AND the work reaches the requested result. Concise work (e.g. one line `x = 4`, or `f'(x)=15(3x+1)^4` straight away) is verified if true. A genuinely different valid method is verified. Extra true remarks that do not affect the solution do not spoil an otherwise complete correct solution (still `verified`).
- `invalid`: some claimed line is false or a non-sequitur/illegitimate transformation (sign error, wrong rule, wrong arithmetic, unjustified cancellation that changes the solution set, wrong final answer, an irrelevant FALSE statement, etc.), even if the final answer happens to be right.
- `incomplete`: all stated lines are true but the task result is not reached (stops early, only restates, or only irrelevant/ungrounded calculations such as true arithmetic that introduces unexplained quantities and never establishes the requested result). Use `alt:["invalid"]` for true-but-unjustified/ungrounded numerology that nevertheless states the correct final number.
- `missing-assumption`: lines true as far as they go, but a step or the result depends on an unstated condition that the task does not supply/imply (dividing by an expression that may be zero without excluding it, dropping a case/branch, omitting +C in an indefinite integral, not restricting a domain that matters, not checking extraneous roots when the final answer would otherwise include them...). If the stated final answer is simply wrong, use `invalid` instead.
- `ambiguous`: the problem or the working admits materially different readings leading to different verdicts (use sparingly, ≤3% of your cases, and give `alt`).
- `unsupported`: genuinely outside elementary school/early-university symbolic scope for an exact checker (e.g. elliptic integrals, non-elementary closed forms, deep theorems, open-ended proofs) — a verifier should NOT claim `verified`; set `alt:["incomplete"]` when sensible. ≤5% of your cases.
Do not assume what any verifier would say; decide what is mathematically right.

## Required mix inside your quota (adapt to your batch)
~35% verified (include concise one-line answers and ≥15% genuinely different valid methods, unusual but correct routes, different but equivalent final forms), ~25% invalid (subtle: error in middle, correct final answer after bad step, plausible-looking forged identity, wrong theorem/rule used), ~10% missing-assumption, ~10% incomplete, ~10% **irrelevant-but-correct calculation** cases (true lines about other quantities: both "complete correct solution + irrelevant true side line" → verified, and "only irrelevant true calculations" → incomplete, and "irrelevant FALSE side line" → invalid; tag `side-claim`), remaining: conditional proofs (work with "if/assume/suppose/case" structure, tag `conditional`), dependent claims (a later line relies on an earlier line that is false/unsupported; tag `dependent`), numerical-coincidence traps (a true line whose numbers are merely close to the task's numbers or reach the right number by an unjustified route; tag `coincidence`), unsupported/ambiguous.
Vary surface form (spacing, unicode ∠ √ ∫ ≠ ≤, "therefore", words like "so/hence"), lengths (1–8 lines), and problem difficulty. Avoid duplicates and near-duplicates. Each `why` must name the specific mathematical reason.
