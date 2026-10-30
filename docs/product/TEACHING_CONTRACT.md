# teaching-contract@1

How a mathematics lesson is assembled, and what is checked mechanically. Code: `packages/learning/src/teaching-contract.ts`.

## Roles

Each lesson section has one role. The learner sees a label for it:

| Role | Label | What the section is |
|---|---|---|
| concept | The idea | What the idea is, shown on the section's own question |
| worked-example | Worked example, or Method if not verified | A complete solution of one concrete question |
| strategy | Another way | Another way of thinking about a question it applies to |
| misconception | Common mistake | A common wrong answer to a concrete question, and why it is wrong |
| prerequisite | It builds on | What the skill builds on |

A section is labelled "Worked example" only when its solution is complete and checked. The same rule applies to a
worked example shown inside another section.

## The instance rule

A section's text, its question, its solution and its picture are about one question, its `instance`.

- A family can teach instance by instance with `teach.instance(params)`. That function returns the concept, the worked
  solution with arithmetic claims and the result, and a representation of the same question.
- A family that mixes kinds of question gives `teach.caseOf`, so the sections of one lesson are drawn from different
  kinds. Each section is taught as its own kind.
- A way of explaining can declare the questions it is about (`applies`) and give text for one question (`textFor`).

## What is checked mechanically

| Violation | Meaning |
|---|---|
| `claim-false` | A step's arithmetic claim (expression = value) does not evaluate to the value. |
| `result-mismatch` | The result is not the question's checked answer (the family's `validate`). |
| `worked-unverified` | The section is meant as a worked example, but its solution is not complete and checked. |
| `text-not-instance` | The text quotes numbers that are not in its question, its solution, its picture or the family's diagnoses of that question. This is a numeric heuristic: other kinds of mismatch need a reviewer. |
| `representation-mismatch` | The picture's data are not the question's values (dot arrays, dot triangles, sequence tables). |
| `decorative-visual` | Dots shown without mathematical meaning. They are no longer drawn. |
| `no-instance` | A teaching section is not tied to any question. |

## Explanations need an educator

Passing these checks does not establish that the teaching is good. Each section lists the claims that were verified
mechanically separately from the explanations, which await educator review. Educator approval stays a separate
requirement in the review registry.

## Ratchet

`content/learning/teaching-contract-baseline.v1.json` is written by `bun packages/learning/scripts/teaching-contract.ts`.
It holds violation counts by rule and by module. `teaching-contract.test.ts` fails when any count rises. Lower the
baseline when content is corrected (stage 2).

## Reference

`affig` (number patterns) is the reference family:

- **Six pattern kinds**, each with its own concept text and its own solution steps.
- **Pictures:**
  - square numbers as an n × n dot array;
  - rectangular numbers as an n × (n + 1) dot array;
  - triangular numbers as a triangle of dots;
  - cube, doubling and odd numbers as sequence tables with the rule that makes each term, and the gap or ratio.
- **"Look at the gaps"** is paired only with patterns whose gaps explain them: square, triangular, rectangular and odd numbers.
