# Independent answer-key certification — working rules

Goal: establish, **independently of the generators and of the production graders**, whether each family's stored answers are
mathematically correct. The graders agreeing with the stored answer proves nothing here.

## What you have
- Exported questions: `$DATA/q/<family>.jsonl` (one JSON per released typed question: `id, params, prompt, type, answer, figure?,
  expanded?, mc{options,key}?, word{prompt,answer}?`) and `$DATA/families.json` (`family, title, competency, type, arity, released,
  contract, comment` — `comment` is the generator author's description of the parameters, documentation only).
- The kit: `tools/mathematics/answer-key-certification/kit.py` (read its docstring) and the runner `certify.py`.
  Python needs SymPy: `export PYTHONPATH="/root/.cache/openpath-vendor/sympy-sympy-1.14.0:/root/.cache/openpath-vendor/mpmath-1.3.0"`.
- Your family list: `slices.json[<slice>]`. Your reference module: `tools/mathematics/answer-key-certification/refs/<slice>.py`
  (several files `refs/<slice>_1.py`… are fine). Your results: `$OUT/<slice>/fam/*.json`; register: `$OUT/<slice>/register.json`.

## Independence rules (the point of the exercise)
1. **Do not read the generator's solving code** (`packages/learning/src/families.ts`, `fam/*.ts`: the `solve`, `bugs`, `steps`
   functions). You may read the parameter comment in `families.json`, the prompt/figure/params of exported questions, and the
   statement. If parameters are unclear, infer them by matching the prompt to the params over several exported examples.
2. **Do not import production code** or the production answer normalisation. Do not use the stored answer to compute the expected
   answer (comparing stored with a reformatting of itself is not verification).
3. Derive the answer from the **mathematical statement** by a *different method than the obvious formula* where practical:
   brute-force enumeration (probability, counting, digits, divisibility, gcd/lcm, percentages as exact Fractions), substitution into
   the original equation or inequality over a grid plus completeness argument (all roots: use polynomial root counting with SymPy
   `Poly`/`roots`/`solveset`, or factor and compare degrees), expansion/identity checks by random-point evaluation, matrices via
   SymPy, geometry by coordinates (distance, shoelace, Heron cross-check), calculus by differentiating the proposed antiderivative
   and checking `+C` and domain (|x| for 1/x), limits via series/numeric high precision, sequences by iterating the recurrence.
   Where a closed formula is the only practical route, state in `method` that it is formula-based and name the independent source
   (textbook identity), and add one cross-check that is not the same formula (small-case enumeration or numeric).
4. Equality is mathematical (the kit compares with the Phase-A oracle's SymPy readers). Required **form** (lowest terms, simplest
   mixed number, expanded, rationalised, interval notation, "give a decimal to 2 d.p.") is part of the question: if the prompt asks for a
   form, pass `Expect(text, form=True)` so a correct value in the wrong form is flagged `form` (a notation issue, *not* a maths error).
5. Never silently skip. Anything you cannot verify independently → `Unsupported('why')`; a question that can be read two ways →
   `Ambiguous('which readings')`. Do not return `Expect(stored)`.
6. A mismatch has three possible causes: your reference is wrong, the statement is ambiguous/under-specified, or the stored answer
   is wrong. **Investigate each mismatch group before concluding** (re-derive by hand for the smallest parameters; check the prompt wording
   and figure; check boundary/degenerate parameters). Only then classify.

## Coverage
- Every family in your list needs a reference or an explicit entry in `unsupported.json` (`{family: reason}`) saying exactly what
  cannot be verified independently and why.
- Use `coverage='exhaustive'` whenever the reference is cheap (Fractions/integers: all released questions). Use `coverage='sampled'`
  (+`sample=N`, N ≥ 300 where the family has that many) only when the reference is expensive (SymPy simplify/integrate over thousands
  of questions); then also state the parameter-space limit in the register. A sampled family is **never** reported as fully certified.
- Check the boundary/degenerate parameters of each family (zero, negative, equal parameters, repeated roots, empty solution sets,
  division by zero, discriminant 0, domain restrictions) — the exhaustive run covers them if exhaustive, otherwise add targeted checks
  in `tests/test_<slice>_boundaries.py`-style code only if you find something.
- Multiple-choice forms are checked by the runner (exactly one option equals your derived answer and it is the keyed one). Word forms
  are checked only for answer equality with the typed form; **their wording is not verified** unless you read a few and say so.

## Running
```
cd tools/mathematics/answer-key-certification
python3 certify.py --data $DATA --out $OUT/<slice> --module refs.<module> [--family f] [--force] [--budget SEC]
```
Resumable: finished families are skipped. The machine has 2 CPU cores shared by several agents: run one process, one family while
developing, finish a module before running its whole slice, never loop the whole slice repeatedly, keep SymPy calls bounded (use
Fractions/ints whenever possible).

## Classification of results (per question, then per family)
Verified · Incorrect (stored answer demonstrably wrong) · Ambiguous · Incomplete (omits required solutions/conditions) ·
Unsupported (no independent verifier) · Generator defect (the construction itself is wrong, e.g. produces degenerate/invalid
questions, a figure that contradicts the statement, parameters outside the stated domain). `form` results are notation issues and are
reported separately (not errors). Do not call unsupported "verified".

## Register (`$OUT/<slice>/register.json`)
A list; one entry per **confirmed** discrepancy group (not per ref bug):
`{family, class, severity (critical = a student is taught/assessed something false and the question is released; high; medium; low),
 questionIds (all affected ids from the runner's mismatchIds/formIds/incompleteIds/ambiguousIds, or "all"), affectedCount, exampleId,
 params, prompt, stored, derived (or counterexample), method, explanation (the mathematics), proposedFix (do not edit production)}`.
Also `refNotes` for anything about your own reference choices that a reviewer must know. Reference bugs are fixed, not registered.

## Critical findings
If you confirm an incorrect answer that students would see (class Incorrect/Incomplete/Generator defect, severity critical or high),
immediately write `$OUT/critical/<family>.md` (family, one question id, params, prompt, stored, derived/counterexample, affected count)
and mention it in your next message. Do not wait for the end.

## Hard limits
Work only in this worktree; do not touch production generators, stored answers, the shared parser, grading contracts, backend,
mastery logic or decision records; do not commit or push (the coordinator does). Do not modify other agents' `refs/` files.
Your final message: counts per class for your slice (families and questions), the list of critical/high findings (family, id, one line),
families with unsupported/sampled status and why, and the files you wrote. Keep it compact.
