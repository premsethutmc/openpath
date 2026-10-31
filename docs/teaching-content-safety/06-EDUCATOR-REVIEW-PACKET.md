# Educator-review packet (explanation-review@1)

Each section is one explanation at one exact revision. **Nothing here is approved.** The status shown is AI screening or registry bookkeeping, not an educator decision.

To record a decision, an authorised educator (listed in `reviewers` of `content/learning/explanation-review.v1.json` by a reviewed change) runs, for the revision shown:

```
node --import tsx packages/learning/scripts/explanation-review.ts decide '<id>' --status approved|revision_required|blocked --reviewer <id> --note "<what was checked>"
```

The command refuses a reviewer who is not authorised and records the decision against the current content hash only; any later edit of the explanation voids it.

Explanations in this packet: 18.

## MATH.algebra.algebra-simplify#check_number

- **Target competency:** Simplify linear expressions (`MATH.algebra.algebra-simplify`)
- **Explanation:** “Check with a number” — intervention type `procedural`, general
- **Content revision:** `sha256:46d23a87c03c19dbad50c09f9ad205b8fa79a145cf3ec175a7b244c75a497bec`
- **Current status:** revision_required — ai-screening (screening: requires teaching-content revision. Not an educator review.)
- **Original question:** `gen:ahlike:7,-7,-2,-7` Simplify 7x − 7y − 2x − 7y. — answer: 5x − 14y
- **Learner error or teaching trigger:** 
  - scenario 3h (misconception sign-dropped until never explanation(s)) — recovery found no gap in the skills it builds on; the problem is still wrong; justified [teaching-decisions.json]
  - scenario 3h (misconception sign-dropped until never explanation(s)) — recovery found no gap in the skills it builds on; the problem is still wrong; evidence: missing-prerequisite; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Check with a number**
> Put x = 2 and y = 1 into the question and into your answer.
> If the two values are different, a term has been combined wrongly.
> `Simplify 7x − 7y − 2x − 7y.`
> `x terms: 7 − 2 = 5, so 5x`
> `y terms: −7 − 7 = −14, so −14y`
> `Together: 5x − 14y`
>

**Mathematical steps, and what the machine checked:**

- Check with a number: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:ahlike:7,6,1,8` Simplify 7x + 6y + x + 8y. — answer: 8x + 14y
- independent check: `gen:ahlike:1,5,6,4` Simplify x + 5y + 6x + 4y. — answer: 7x + 9y

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **requires teaching-content revision** — math correct; clarity weak; fit fits; difficulty partly. Show the check worked out (question and answer both evaluate to the same number). Use non-special values such as x = 3, y = 5 instead of 1 and 2.
- Reviewer: correctness correct (Simplification 5x − 14y correct (at x=2, y=1 both sides give −4, though this is never shown); check 7x + 9y correct.); clarity weak (Tells the learner to substitute but the screen never performs the substitution; the math lines are just the standard method.); fit fits; difficulty partly (Self-checking is useful, but y = 1 and x = 2 are poor test values (y = y², 2x = x², xy = x when y = 1) and can hide errors.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.algebra-simplify#check_what_it_uses

- **Target competency:** Simplify linear expressions (`MATH.algebra.algebra-simplify`)
- **Explanation:** “Check what it builds on” — intervention type `prerequisite`, general
- **Content revision:** `sha256:8cdf0b2656282bc9a759f854425e88ede80632ac4f3e3f6ec8c236d5873f9b23`
- **Current status:** demo_only — ai-screening (screening: demonstration-only. Not an educator review.)
- **Original question:** `gen:ahlike:5,9,-4,1` Simplify 5x + 9y − 4x + y. — answer: x + 10y
- **Learner error or teaching trigger:** 
  - scenario 3h (misconception sign-dropped until never explanation(s)) — recovery found no gap in the skills it builds on; the problem is still wrong; justified [teaching-decisions.json]
  - scenario 3h (misconception sign-dropped until never explanation(s)) — recovery found no gap in the skills it builds on; the problem is still wrong; evidence: missing-prerequisite; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **What it uses**
> Each step builds on another skill: Add and subtract integers. If a step is slow, practise that skill first.
> Then the method is: Group the x terms and the y terms, keeping each sign with the term after it. Add the numbers in front of each group and write one term for each letter.
>

**Mathematical steps, and what the machine checked:**

- What it uses: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:ahlike:5,9,-4,1` Simplify 5x + 9y − 4x + y. — answer: x + 10y
- independent check: `gen:ahlike:8,-5,1,6` Simplify 8x − 5y + x + 6y. — answer: 9x + y

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **demonstration-only** — math correct; clarity weak; fit fits; difficulty no. Link a prerequisite item (e.g. −9 − 3 = ?) and show where it appears in a simplification. Otherwise treat it as a routing placeholder, not teaching content.
- Reviewer: correctness correct (No computation; check 9x + y correct.); clarity weak (Generic template sentence naming a prerequisite plus a restatement of the method; no example.); fit fits; difficulty no (Names a prerequisite but gives no diagnostic or practice of it; 'needs' is empty.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#check_what_it_uses

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Check what it builds on” — intervention type `prerequisite`, general
- **Content revision:** `sha256:63f25924206524c6701e731aa0eeb2fec322b5329009b043f95bbd61a95205ae`
- **Current status:** demo_only — ai-screening (screening: demonstration-only. Not an educator review.)
- **Original question:** `gen:lin:2,4,6` Solve 2x + 4 = 16. What is x? — answer: 6
- **Learner error or teaching trigger:** 
  - scenario 2b (misconception forgot-divide until never explanation(s)) — established misconception: forgot-divide (3 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 4a (right only after a hint) — module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported; plausible, unverified [teaching-decisions.json]
  - scenario 4c (hint, still wrong) — module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported; plausible, unverified [teaching-decisions.json]
  - scenario 5a (misconception forgot-divide until 2 explanation(s)) — established misconception: forgot-divide (3 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 5b (always wrong (readable)) — module starting check: insufficient_evidence (confidence 0.47); hypotheses unsupported; plausible, unverified [teaching-decisions.json]
  - scenario 5c (misconception forgot-divide, slips the first check after teaching) — established misconception: forgot-divide (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 2b (misconception forgot-divide until never explanation(s)) — established misconception: forgot-divide (3 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 2c (misconception added-not-subtracted until 1 explanation(s)) — established misconception: added-not-subtracted (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 4a (right only after a hint) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]
  - scenario 4c (hint, still wrong) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]
  - scenario 5a (misconception forgot-divide until 2 explanation(s)) — established misconception: forgot-divide (3 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 5b (always wrong (readable)) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]
  - scenario 5c (misconception forgot-divide, slips the first check after teaching) — established misconception: forgot-divide (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **What it uses**
> Each step builds on another skill: Use multiplication facts. If a step is slow, practise that skill first.
> Then the method is: Undo the operations in reverse order: first take away the number added, then divide by the number multiplying x.
>

**Mathematical steps, and what the machine checked:**

- What it uses: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:2,4,6` Solve 2x + 4 = 16. What is x? — answer: 6
- independent check: `gen:lin:2,15,1` Solve 2x + 15 = 17. What is x? — answer: 1

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **demonstration-only** — math correct; clarity weak; fit fits; difficulty no. Attach a prerequisite item (e.g. 7 × ? = 70) or treat it as a routing placeholder.
- Reviewer: correctness correct (No computation; check 2x + 15 = 17 -> 1 correct.); clarity weak (Generic template sentence plus restated method; no example.); fit fits; difficulty no (No diagnostic for multiplication facts; 'needs' is empty.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#spot_the_mistake

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Spot the mistake” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:cb775b7077011a253813963468c7311dd455d01793fe93a4ef3d132153104fa6`
- **Current status:** pending_review — ai-screening (screening: ready for supervised educational evaluation. Not an educator review.)
- **Original question:** `gen:lin:7,5,10` Solve 7x + 5 = 75. What is x? — answer: 10
- **Learner error or teaching trigger:** 
  - scenario 2a (misconception forgot-divide until 1 explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 2b (misconception forgot-divide until never explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 2c (misconception added-not-subtracted until 1 explanation(s)) — established misconception: added-not-subtracted (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 4a (right only after a hint) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; plausible, unverified [teaching-decisions.json]
  - scenario 4c (hint, still wrong) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; plausible, unverified [teaching-decisions.json]
  - scenario 5a (misconception forgot-divide until 2 explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 5b (always wrong (readable)) — module starting check: insufficient_evidence (confidence 0.47); hypotheses none; plausible, unverified [teaching-decisions.json]
  - scenario 5c (misconception forgot-divide, slips the first check after teaching) — established misconception: forgot-divide (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 2a (misconception forgot-divide until 1 explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 2b (misconception forgot-divide until never explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 5a (misconception forgot-divide until 2 explanation(s)) — established misconception: forgot-divide (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]
  - scenario 5c (misconception forgot-divide, slips the first check after teaching) — established misconception: forgot-divide (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **A common wrong answer**
> A question: “Solve 7x + 5 = 75. What is x?” A common wrong answer is 70.
> 5 was taken away but the 7 was not divided out: 7x = 70 means x = 70 ÷ 7.
> `Not 70, but 10`
>

**Mathematical steps, and what the machine checked:**

- A common wrong answer: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:7,9,12` Solve 7x + 9 = 93. What is x? — answer: 12
- independent check: `gen:lin:3,3,4:mc` Solve 3x + 3 = 15. What is x? Choose one. — answer: B

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **ready for supervised educational evaluation** — math correct; clarity clear; fit fits; difficulty yes. Optionally show 7 × 10 + 5 = 75 as confirmation.
- Reviewer: correctness correct (75 − 5 = 70, 70 ÷ 7 = 10; check 3x + 3 = 15 -> 4 (B) correct.); clarity clear (Identifies the missing division step precisely.); fit fits; difficulty yes (Stopping after the first inverse step is a common error.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.missing-number#check_what_it_uses

- **Target competency:** Find missing operands (`MATH.algebra.missing-number`)
- **Explanation:** “Check what it builds on” — intervention type `prerequisite`, general
- **Content revision:** `sha256:7db177735bec4b1e1aaa9a03ff2afc5ec82c6c82c1a1a94b799b0ab742b82d34`
- **Current status:** revision_required — ai-screening (mathematics verified correct; teaching needs revision before educator review (see knownIssues). Earlier: correction of the blocked revision: same method text corrected. Arithmetic machine-verified (content-corrections.test.ts). Pending educator review; not approved.)
- **Earlier revisions:** `sha256:dcb2f8c4dcab…` blocked (repeats the same rule. Verified.)
- **Original question:** `gen:acmissing:2,15,10` What number goes in the box? □ − 10 = 5 — answer: 15
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What it uses**
> Each step builds on another skill: Find differences within 20. If a step is slow, practise that skill first.
> Then the method is: Read the sentence and ask what was done to the box, then work backwards. If a number was added to the box, take it away. If a number was taken away from the box, add it back. If the box was multiplied by a number, divide by that number. If the box was taken away from a number, the box is the gap: the first number take away the answer. Check by putting your answer in the box.
>

**Mathematical steps, and what the machine checked:**

- What it uses: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:acmissing:2,15,10` What number goes in the box? □ − 10 = 5 — answer: 15
- independent check: `gen:acmissing:0,10,7` What number goes in the box? □ + 7 = 17 — answer: 10

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **mathematically unsupported or unsafe** — math error; clarity weak; fit fits; difficulty no. repeats the same rule. Verified.
- Reviewer: correctness error (Check box + 7 = 17 -> 10 verified, but it repeats the over-general rule 'Do the opposite to the other number', which fails for a - box = b; prerequisite 'differences within 20' also misses the x/÷ items.); clarity weak (Generic prerequisite name plus restated method.); fit fits; difficulty no (Teaches nothing new; repeats a rule that causes the 43-type error.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.missing-number#worked_steps

- **Target competency:** Find missing operands (`MATH.algebra.missing-number`)
- **Explanation:** “Step by step” — intervention type `procedural`, general
- **Content revision:** `sha256:240265ad4aff5720bf4b1c0f70ee71bd261a875706c37b9466f36754101a02da`
- **Current status:** revision_required — ai-screening (mathematics verified correct; teaching needs revision before educator review (see knownIssues). Earlier: correction of the blocked revision: rule “do the opposite to the other number” (wrong for 27 − □ = 9) replaced by the inverse-operation rule for each kind of sentence. Arithmetic machine-verified (content-corrections.test.ts). Pending educator review; not approved.)
- **Earlier revisions:** `sha256:25ddff6090f1…` blocked (rule "do the opposite to the other number" gives 36 for 27 − □ = 9 (its own check question); the answer is 18. Verified.)
- **Original question:** `gen:acmissing:0,10,3` What number goes in the box? □ + 3 = 13 — answer: 10
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **The method**
> Read the sentence and ask what was done to the box, then work backwards. If a number was added to the box, take it away. If a number was taken away from the box, add it back. If the box was multiplied by a number, divide by that number. If the box was taken away from a number, the box is the gap: the first number take away the answer. Check by putting your answer in the box.
> `What number goes in the box? □ + 3 = 13`
> `Undo the adding: take away`
> `13 − 3 = 10`
>

**Mathematical steps, and what the machine checked:**

- The method: no worked steps
- Teaching-contract check: machine-checked; violations: The method: worked-unverified

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:acmissing:2,11,7` What number goes in the box? □ − 7 = 4 — answer: 11
- independent check: `gen:acmissing:1,18,9` What number goes in the box? 27 − □ = 9 — answer: 18

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **mathematically unsupported or unsafe** — math error; clarity adequate; fit fits; difficulty partly. rule "do the opposite to the other number" gives 36 for 27 − □ = 9 (its own check question); the answer is 18. Verified.
- Reviewer: correctness error (Arithmetic correct (13-3 = 10; check 27-box = 9 -> 18). But the rule 'Do the opposite to the other number' is wrong when the box is subtracted: for the check 27 - box = 9 it gives 9+27 = 36, not 18.); clarity adequate (Inverse-operation idea with a check-by-substitution step is good, but the rule is over-general.); fit fits; difficulty partly (Covers box + a = b but produces the known 'add the two numbers' error on a - box = b.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.quadratic-discriminant#parabola

- **Target competency:** Interpret the quadratic discriminant (`MATH.algebra.quadratic-discriminant`)
- **Explanation:** “Picture the parabola” — intervention type `conceptual`, general
- **Content revision:** `sha256:65dea5334eec7bafd561b818995aade85e00baf20f17a7cd845c07bec79c2355`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:disc:2,5` How many different real solutions does x² + 2x + 5 = 0 have? (0, 1 or 2) — answer: 0
- **Learner error or teaching trigger:** 
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — module starting check: insufficient_evidence (confidence 0.39); hypotheses none; plausible, unverified [teaching-decisions.json]
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — module starting check: insufficient_evidence (confidence 0.39); hypotheses none; evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Crossings**
> y = x² + bx + c is a U-shaped curve. Two solutions: it crosses the x-axis twice. One: it just touches it. None: it stays above it. The discriminant tells you which, without drawing.
>

**Mathematical steps, and what the machine checked:**

- Crossings: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:disc:10,-19` How many different real solutions does x² + 10x − 19 = 0 have? (0, 1 or 2) — answer: 2
- independent check: `gen:disc:-2,-2` How many different real solutions does x² − 2x − 2 = 0 have? (0, 1 or 2) — answer: 2

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.quadratic-discriminant#signed_numbers

- **Target competency:** Interpret the quadratic discriminant (`MATH.algebra.quadratic-discriminant`)
- **Explanation:** “Subtracting a negative” — intervention type `prerequisite`, general
- **Content revision:** `sha256:48d0f8c9f4871a07fb7eb326fa7b2de734ef3ea774dbdfb739711624b1cc8b8e`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:disc:10,-18` How many different real solutions does x² + 10x − 18 = 0 have? (0, 1 or 2) — answer: 2
- **Learner error or teaching trigger:** 
  - scenario 3a (lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught) — established misconception: minus-c-sign (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 3a (lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught) — established misconception: minus-c-sign (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Two sign facts**
> Taking away a negative number adds: 16 − (−20) = 36. And a square is never negative: (−4)² = 16.
>

**Mathematical steps, and what the machine checked:**

- Two sign facts: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:disc:10,-18` How many different real solutions does x² + 10x − 18 = 0 have? (0, 1 or 2) — answer: 2
- independent check: `gen:disc:-10,20` How many different real solutions does x² − 10x + 20 = 0 have? (0, 1 or 2) — answer: 2

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.quadratics#square_meaning

- **Target competency:** Solve quadratic equations (`MATH.algebra.quadratics`)
- **Explanation:** “What a square can be” — intervention type `conceptual`, general
- **Content revision:** `sha256:77aea4808c432b765a75d25dc72a18489402f2d1debf1a1b0e0787d963c05cb7`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `qd-s2g` How many real solutions does x² = 16 have? — answer: C
- **Learner error or teaching trigger:** 
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — recovery named this skill (uncertain); plausible, unverified [teaching-decisions.json]
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — recovery named this skill (uncertain); evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Squares are never negative**
> x² is x × x. It is 0 or positive for every real x, so x² = −1 has no real solution and x² = 49 has two: 7 and −7.
>

**Mathematical steps, and what the machine checked:**

- Teaching-contract check: not-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `qd-s2g` How many real solutions does x² = 16 have? — answer: C
- independent check: `qd-s2c` How many real solutions does x² + 4 = 0 have? — answer: A

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.quadratics#two_numbers

- **Target competency:** Solve quadratic equations (`MATH.algebra.quadratics`)
- **Explanation:** “Find two numbers” — intervention type `procedural`, general
- **Content revision:** `sha256:f0b0ee87bd1a38d8509a401ad48c8c553187e31706c65510e04caf32781d3e31`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `qd-g1` Solve x² − 7x + 12 = 0. — answer: 3,4
- **Learner error or teaching trigger:** 
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — recovery named this skill (uncertain); plausible, unverified [teaching-decisions.json]
  - scenario 2h (misconception minus-c-sign until never explanation(s)) — recovery named this skill (uncertain); evidence: repeated-difficulty; general (no diagnosis claimed) [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Multiply to c, add to b**
> For x² + bx + c, find two numbers that multiply to c and add to b. They give the factors.
> `x² − 7x + 12: −3 × −4 = 12, −3 + −4 = −7`
> `(x − 3)(x − 4) = 0`
>

**Mathematical steps, and what the machine checked:**

- Teaching-contract check: not-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `qd-g1` Solve x² − 7x + 12 = 0. — answer: 3,4
- independent check: `qd-c1` Solve x² − x − 6 = 0. — answer: -2,3

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.measurement.standard-mass#spot_the_mistake

- **Target competency:** Measure using standard mass units (`MATH.measurement.standard-mass`)
- **Explanation:** “Spot the mistake” — intervention type `conceptual`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:1a6c4a63768516078b21ea754e71f3d2c5fecf9f37e6c1a815782d03d7297ecf`
- **Current status:** revision_required — ai-screening (mathematics verified correct; teaching needs revision before educator review (see knownIssues). )
- **Earlier revisions:** `sha256:ce571e2f7c64…` pending_review
- **Original question:** `gen:abkg:1,1,0,1,0` The balance in the picture is level: the bag of rice weighs the same as the weights on the other side. How much does the bag weigh, in grams? (1 kg = 1000 g) — answer: 1600
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **A common wrong answer**
> A question: “The balance in the picture is level: the bag of rice weighs the same as the weights on the other side. How much does the bag weigh, in grams? (1 kg = 1000 g)” A common wrong answer is 3.
> The weights were counted, not added. Each weight has its own number of grams.
> `Not 3, but 1600`
>

**Mathematical steps, and what the machine checked:**

- A common wrong answer: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:abkg:1,1,0,0,1` The balance in the picture is level: the bag of rice weighs the same as the weights on the other side. How much does the bag weigh, in grams? (1 kg = 1000 g) — answer: 1550
- independent check: `gen:abkg:2,1,0,0,1:mc` The balance in the picture is level: the bag of rice weighs the same as the weights on the other side. How much does the bag weigh, in grams? (1 kg = 1000 g) Choose one. — answer: B

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.integer-add#tokens

- **Target competency:** Add and subtract integers (`MATH.number.integer-add`)
- **Explanation:** “Positive and negative tokens” — intervention type `conceptual`, general
- **Content revision:** `sha256:b55ece5ce41b20d7c0d2ff26125dbdacec446785250a1b29ffbe8211fa035238`
- **Current status:** revision_required — ai-screening (screening: requires teaching-content revision. Not an educator review.)
- **Original question:** `gen:aiint:16,-1,0` 16 + (−1) = ? — answer: 15
- **Learner error or teaching trigger:** 
  - scenario 3a (lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught) — established misconception: minus-c-sign (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 3a (lacks integer-add (minus-c-sign+minus-negative-as-minus) until it is taught) — established misconception: minus-c-sign (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Positive and negative tokens**
> Use + tokens and − tokens; a + and a − together make zero and can be removed.
> To take away tokens you do not have, first add zero pairs (+ and −), then remove what you need.
> `16 + (−1) = ?`
> `16 + (−1) = 15`
>

**Mathematical steps, and what the machine checked:**

- Positive and negative tokens: steps NOT checked (kernel)
  - `Move 1 steps left from 16` — Starting at 16, moving 1 to the left lands at 15
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:aiint:-9,7,0` (−9) + 7 = ? — answer: -2
- independent check: `gen:aiint:40,-11,1:mc` 40 − (−11) = ? Choose one. — answer: C

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **requires teaching-content revision** — math correct; clarity adequate; fit fits; difficulty partly. Use a subtraction-of-negative instance with small numbers (e.g. 3-(-2)): draw 3 +tokens, add 2 zero pairs, remove 2 -tokens, count 5.
- Reviewer: correctness correct (16+(-1) = 15 verified; check 40-(-11) = 51 = option C verified.); clarity adequate (Zero-pair model is the right idea, but the instance is a trivial addition and no tokens are actually drawn or removed.); fit fits; difficulty partly (Text mentions taking away tokens you don't have (subtracting negatives), but the example never shows it.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.multi-multiplication#check_what_it_uses

- **Target competency:** Multiply multi-digit numbers (`MATH.number.multi-multiplication`)
- **Explanation:** “Check what it builds on” — intervention type `prerequisite`, general
- **Content revision:** `sha256:25c66b44dbda7814322142c38a3b669ffd537235055e6b4b7f55464163eec62d`
- **Current status:** revision_required — ai-screening (screening: requires teaching-content revision. Not an educator review.)
- **Original question:** `gen:mmul:78,9` 78 × 9 = ? — answer: 702
- **Learner error or teaching trigger:** 
  - scenario 3d (lacks multiplication-tables (fact-slip:5x6) until it is taught) — established misconception: fact-slip:5x6 (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 3d (lacks multiplication-tables (fact-slip:5x6) until it is taught) — established misconception: fact-slip:5x6 (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **What it uses**
> Each step builds on another skill: Use multiplication facts. If a step is slow, practise that skill first.
> Then the method is: 47 × 6 = 40 × 6 + 7 × 6 = 240 + 42 = 282. The 4 tens of 42 join the tens.
>

**Mathematical steps, and what the machine checked:**

- What it uses: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:mmul:78,9` 78 × 9 = ? — answer: 702
- independent check: `gen:mmul:51,4` 51 × 4 = ? — answer: 204

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **requires teaching-content revision** — math correct; clarity weak; fit fits; difficulty partly. Show which fact (7x6, 4x6) each step uses.
- Reviewer: correctness correct (Restated example 47x6=282 correct; check 51x4=204 correct.); clarity weak (Generic prerequisite list; method example is copied without explanation.); fit fits; difficulty partly (Generic.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.multiplication-tables#doubling

- **Target competency:** Use multiplication facts (`MATH.number.multiplication-tables`)
- **Explanation:** “Double, double, double” — intervention type `recall`, general
- **Content revision:** `sha256:7c24363e57fe65dde9871436ec5a23823e37c311bb0ae587ebd8c315ea59f0f0`
- **Current status:** pending_review — engineering (correction of the blocked revision: “double three times” from 14 corrected (three doublings from 7, two from 14). Arithmetic machine-verified (content-corrections.test.ts). Pending educator review; not approved. Independent AI review: mathematics correct, acceptable for educator review.)
- **Earlier revisions:** `sha256:b8eb70b54170…` blocked (text says "double three times" from 7 × 2 = 14; it is twice (14 → 28 → 56). Verified.)
- **Original question:** `mt-dbl-g` 6 × 2 = 12. Double it: 6 × 4 = ? — answer: 24
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **8 is 2 × 2 × 2**
> So 7 × 8 is 7 doubled three times: 7 → 14 → 28 → 56. If you already know 7 × 2 = 14, double twice more: 28, then 56.
> `7 × 2 = 14`
> `7 × 4 = 28`
> `7 × 8 = 56`
>

**Mathematical steps, and what the machine checked:**

- Teaching-contract check: not-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `mt-dbl-g` 6 × 2 = 12. Double it: 6 × 4 = ? — answer: 24
- independent check: `mt-dbl-c` 9 × 8 = ? (9 × 2 = 18; keep doubling.) — answer: 72

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **mathematically unsupported or unsafe** — math error; clarity adequate; fit fits; difficulty partly. text says "double three times" from 7 × 2 = 14; it is twice (14 → 28 → 56). Verified.
- Reviewer: correctness error ('Start from 7 x 2 = 14 and double three times: 28, then 56' is wrong: from 14 you double twice (14->28->56); three doublings start from 7.); clarity adequate (Doubling chain is shown in math lines, but the text miscounts the doublings.); fit fits; difficulty partly (Useful for x4/x8 facts, but the miscount would mislead a learner applying it to the check.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.multiplication-tables#near_fact

- **Target competency:** Use multiplication facts (`MATH.number.multiplication-tables`)
- **Explanation:** “Use a fact next door” — intervention type `recall`, general
- **Content revision:** `sha256:9b80ad73bb61c95e81cce9b96834e4bd9d960dc0dae5c707fa3259f5c808bbf0`
- **Current status:** pending_review — ai-screening (screening: ready for supervised educational evaluation. Not an educator review.)
- **Original question:** `mt-near-g` 8 × 8 = 64. So 8 × 9 = ? — answer: 72
- **Learner error or teaching trigger:** 
  - scenario 3d (lacks multiplication-tables (fact-slip:5x6) until it is taught) — established misconception: fact-slip:5x6 (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 3d (lacks multiplication-tables (fact-slip:5x6) until it is taught) — established misconception: fact-slip:5x6 (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **One more group**
> 7 × 8 is one more 7 than 7 × 7. If you know 7 × 7 = 49, add 7.
> `7 × 8 = 7 × 7 + 7 = 49 + 7 = 56`
>

**Mathematical steps, and what the machine checked:**

- Teaching-contract check: not-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `mt-near-g` 8 × 8 = 64. So 8 × 9 = ? — answer: 72
- independent check: `mt-near-c` 6 × 6 = 36. So 6 × 7 = ? — answer: 42

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **ready for supervised educational evaluation** — math correct; clarity clear; fit fits; difficulty yes. AI review: correct and clear but not machine-checked; a 2-screen reveal (7x7, then +7) and an array picture would help.
- Reviewer: correctness correct (7x7+7=49+7=56; check 6x6=36 so 6x7=42 correct.); clarity clear (Explains why: one more group of 7.); fit fits; difficulty yes (Targets learners who cannot recall 7x8 but know squares.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.place-value-tens#count_on

- **Target competency:** Compose tens and ones (`MATH.number.place-value-tens`)
- **Explanation:** “Count in tens, then in ones” — intervention type `procedural`, general
- **Content revision:** `sha256:7ed3051265c31cc56644890fd3dfceae6518fa125b037559f027bc3fd1869d24`
- **Current status:** revision_required — ai-screening (screening: requires teaching-content revision. Not an educator review.)
- **Original question:** `gen:aatens:4,1` What number do the blocks in the picture show? (Each long block is a ten; each small cube is a one.) — answer: 41
- **Learner error or teaching trigger:** 
  - scenario 3c (lacks place-value-tens (no-regroup) until it is taught) — established misconception: no-regroup (2 supporting answer(s)); justified [teaching-decisions.json]
  - scenario 3c (lacks place-value-tens (no-regroup) until it is taught) — established misconception: no-regroup (2 supporting answer(s)); evidence: verified-misconception; justified [teaching-decisions-a2.json]

**Full explanation (verbatim):**

> **Count in tens, then in ones**
> Touch each long block and say 10, 20, 30 …
> Then touch each cube and keep counting by ones.
> `What number do the blocks in the picture show?`
> `4 tens are 40.`
> `1 one.`
> `40 and 1 make 41.`
>

**Mathematical steps, and what the machine checked:**

- Count in tens, then in ones: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:aatens:6,10` What number do the blocks in the picture show? (Each long block is a ten; each small cube is a one.) — answer: 70
- independent check: `gen:aatens:3,7:mc` What number do the blocks in the picture show? (Each long block is a ten; each small cube is a one.) Choose one. — answer: D

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **requires teaching-content revision** — math correct; clarity adequate; fit fits; difficulty partly. Show the blocks for 4 tens 1 one (or reword text to the number line); the math line refers to 'the picture' that is not shown.
- Reviewer: correctness correct (40 + 1 = 41; number-line jumps 0-10-20-30-40-41 consistent; check 37 = option D correct.); clarity adequate (Counting-on is explained, but text says 'touch each long block' while the widget is a number line and no block picture is shown.); fit fits; difficulty partly (Addresses counting tens as ones, but the representation mismatch could confuse a 6-year-old.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.rational-numbers#spot_the_mistake

- **Target competency:** Operate on rational numbers (`MATH.number.rational-numbers`)
- **Explanation:** “Spot the mistake” — intervention type `conceptual`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:adb861504fda0d46f2b48706a77496d6572a582f32ec64e267b3c2b916f33601`
- **Current status:** revision_required — ai-screening (mathematics verified correct; teaching needs revision before educator review (see knownIssues). Earlier: correction of the blocked revision: truncated question “Work out 2/5 ×” restored from the question definition: “Work out 2/5 × (−7/9).”. Arithmetic machine-verified (content-corrections.test.ts). Pending educator review; not approved.)
- **Earlier revisions:** `sha256:1cb06cc7f93a…` blocked (the misconception screen cuts the question off at "Work out 2/5 ×" (the question itself, 2/5 × (−7/9), displays correctly). Verified.)
- **Original question:** `gen:ajrq:2,5,-7,9,2` Work out 2/5 × (−7/9). (A fraction is fine.) — answer: -14/45
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **A common wrong answer**
> A question: “Work out 2/5 × (−7/9).” A common wrong answer is 14/45.
> The sign is wrong: same signs give a positive answer, different signs a negative one.
> `Not 14/45, but −14/45`
>

**Mathematical steps, and what the machine checked:**

- A common wrong answer: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:ajrq:1,8,-7,9,2` Work out 1/8 × (−7/9). (A fraction is fine.) — answer: -7/72
- independent check: `gen:ajrq:1,4,-6,7,0:mc` Work out 1/4 + (−6/7). Choose one. — answer: B

**Previous AI audit findings (screening only, not educator review):**

- Matrix: **mathematically unsupported or unsafe** — math error; clarity weak; fit fits; difficulty yes. the misconception screen cuts the question off at "Work out 2/5 ×" (the question itself, 2/5 × (−7/9), displays correctly). Verified.
- Reviewer: correctness unclear (Question text is truncated: 'Work out 2/5 x' (the factor -7/9 is missing), so the claim that 14/45 is wrong and -14/45 is right cannot be checked from the screen; with the decoded parameters 2/5 x (-7/9) = -14/45 is correct. Check 1/4+(-6/7) = -17/28 = B verified.); clarity weak (As displayed the learner cannot see the negative factor, so 'the sign is wrong' is unexplained.); fit fits; difficulty yes (Targets a dropped sign in a product, a real error.)

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.reasoning.propositional-logic#spot_the_mistake

- **Target competency:** Analyse compound statements with truth tables (`MATH.reasoning.propositional-logic`)
- **Explanation:** “Spot the mistake” — intervention type `conceptual`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:7095a52c164c4bb1837cd9c0782eaffa710a7c9fb65ba6e59eea9df35c4a24e8`
- **Current status:** revision_required — ai-screening (mathematics verified correct; teaching needs revision before educator review (see knownIssues). )
- **Earlier revisions:** `sha256:52bbfdaa4437…` pending_review
- **Original question:** `gen:atrows:3,2,1,3,5` How many rows of the truth table of (¬q → ¬p) ↔ ¬r are true? (The table has 8 rows, one for each choice of truth values of p, q and r.) — answer: 4
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **A common wrong answer**
> A question: “How many rows of the truth table of (¬q → ¬p) ↔ ¬r are true?” A common wrong answer is 3.
> 'A if and only if B' was taken as true only when both are true; it is also true when both are false.
> `Not 3, but 4`
>

**Mathematical steps, and what the machine checked:**

- A common wrong answer: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:atrows:1,1,3,2,5` How many rows of the truth table of (¬p ∨ ¬q) → ¬r are true? (The table has 8 rows, one for each choice of truth values of p, q and r.) — answer: 5
- independent check: `gen:atrows:0,2,3,2,5:mc` How many rows of the truth table of (p → ¬q) → ¬r are true? (The table has 8 rows, one for each choice of truth values of p, q and r.) Choose one. — answer: B

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

