# Educator-review packet (explanation-review@1)

Each section is one explanation at one exact revision. **Nothing here is approved.** The status shown is AI screening or registry bookkeeping, not an educator decision.

To record a decision, an authorised educator (listed in `reviewers` of `content/learning/explanation-review.v1.json` by a reviewed change) runs, for the revision shown:

```
node --import tsx packages/learning/scripts/explanation-review.ts decide '<id>' --status approved|revision_required|blocked --reviewer <id> --note "<what was checked>"
```

The command refuses a reviewer who is not authorised and records the decision against the current content hash only; any later edit of the explanation voids it.

Explanations in this packet: 13.

## MATH.algebra.linear-equations#chapter

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Solve linear equations” — intervention type `conceptual`, general
- **Content revision:** `sha256:989f0cbb1dc544c5dff0ff4ee24b447e486b5656415b86a24080aec238db33d4`
- **Current status:** revision_required — ai-screening (concept section: the first screen (what an equation says) is new; the two sections after it need revision)
- **Earlier revisions:** `sha256:254fafb3d936…` pending_review
- **Original question:** `gen:lin:2,5,6` Solve 2x + 5 = 17. What is x? — answer: 6
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What an equation says**
> An equation says that two amounts are equal. 2x + 5 = 17 means: 2 lots of a number, plus 5, is the same amount as 17.
> Think of a balance. If you do the same thing to both sides, it stays level. That is why each step of solving keeps the equation true, and why the answer can be checked by putting it back in.
>
> **Choosing the equation that models a situation**
> An equation is the story written in symbols: the unknown is a letter, and each action in the story becomes an operation on it, in the same order.
> Name the unknown x. Follow the story: what multiplies x, what is added or taken away, and what the result equals. Check by putting a guessed number for x into both the story and the equation.
> `Anu thinks of a number x. Anu multiplies it by 8 and then adds 16. The result is 120. Which equation describes this situation?`
> `Let x stand for the unknown number in the story`
> `Write the story in order: 8 times x, then add 16, equals 120: 8x + 16 = 120`
>
> **Forming and solving a linear equation from a word problem**
> Call the number you are asked for x; the story then tells you how to build the total from x, and that is the equation.
> Write each quantity in terms of x, add them as the story says, set the result equal to the total, then undo: take away the constant, divide by the coefficient. Check in the story.
> `The length of a rectangle is 7 cm more than its width, and its perimeter is 78 cm. Form an equation and find the width, in cm.`
> `Let x be the number asked for and write the equation: 2(x + x + 7) = 78, so 4x + 14 = 78`
> `Take 14 from both sides: 4x = 64`
> `Divide by 4: x = 16`
>

**Mathematical steps, and what the machine checked:**

- Teaching-contract check: not-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): ``  (not found)
- independent check: ``  (not found)

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#balance

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Keep the balance” — intervention type `procedural`, general
- **Content revision:** `sha256:609a232f6670b880be0d0bc5422378473d84e0338f806c304870303246b7264c`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:ahone:1,4,15` Find x: x − 4 = 11. — answer: 15
- **Learner error or teaching trigger:** 
  - scenario J7 (repeated difficulty, no misconception established (always wrong)) — repeated-difficulty; recheck wrong [a3dec.json]
  - scenario J9 (fails the first recheck after teaching) — verified-misconception; recheck right [a3dec.json]

**Full explanation (verbatim):**

> **Do the same to both sides**
> In x − 4 = 11, the two sides balance. Add 4 to both sides: the − 4 is undone and the sides still balance.
> `x − 4 = 11`
> `x − 4 + 4 = 11 + 4`
> `Add 4 to both sides: − 4 + 4 is 0.`
> `x = 15`
> `Check: 15 − 4 = 11`
>
> **Undo × with ÷**
> 5x = 35: 5x means 5 × x. Divide both sides by 5 to undo the × 5.
> `5x = 35`
> `5x ÷ 5 = 35 ÷ 5`
> `Divide both sides by 5.`
> `x = 7`
> `Check: 5 × 7 = 35`
>
> **Two steps: undo the last one first**
> In 3x + 4 = 19, x was multiplied by 3 and then 4 was added. Undo the + 4 first, then the × 3, each time on both sides.
> `3x + 4 = 19`
> `The two sides are equal: 3 lots of x, plus 4, is the same amount as 19.`
> `3x + 4 − 4 = 19 − 4`
> `Take 4 from both sides. Doing the same to both sides keeps them equal.`
> `3x = 15`
> `4 − 4 = 0, so only 3x is left on the left.`
> `3x ÷ 3 = 15 ÷ 3`
> `3x means 3 × x. Divide the whole of each side by 3.`
> `x = 5`
> `x is on its own: this is the solution.`
> `Check: 3 × 5 + 4 = 19`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- Do the same to both sides: no worked steps
- Undo × with ÷: no worked steps
- Two steps: undo the last one first: steps checked (contract)
  - `3x + 4 = 19` — The two sides are equal: 3 lots of x, plus 4, is the same amount as 19.
  - `3x + 4 − 4 = 19 − 4` — Take 4 from both sides. Doing the same to both sides keeps them equal.
  - `3x = 15` — 4 − 4 = 0, so only 3x is left on the left.
  - `3x ÷ 3 = 15 ÷ 3` — 3x means 3 × x. Divide the whole of each side by 3.
  - `x = 5` — x is on its own: this is the solution.
  - `Check: 3 × 5 + 4 = 19` — Put 5 back into the original equation. Both sides are 19, so x = 5 is right.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:7,5,10` Solve 7x + 5 = 75. What is x? — answer: 10
- independent check: `gen:lin:2,15,1` Solve 2x + 15 = 17. What is x? — answer: 1

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#two_steps

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Undo one step at a time” — intervention type `procedural`, general
- **Content revision:** `sha256:514fb926db37e86eff56182f8b337c4c155521c18a3cf21cf74fcb231f6f1614`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lin:2,5,6` Solve 2x + 5 = 17. What is x? — answer: 6
- **Learner error or teaching trigger:** 
  - scenario J7 (repeated difficulty, no misconception established (always wrong)) — repeated-difficulty; recheck wrong [a3dec.json]

**Full explanation (verbatim):**

> **What you are finding**
> You want the number x that makes 2x + 5 = 17 true.
> 2x + 5 means: multiply x by 2, then add 5. To get x back, undo those in reverse order: first the + 5, then the × 2.
>
> **Solve 2x + 5 = 17**
> Each line does the same to both sides, so the two sides stay equal and the solution does not change.
> `2x + 5 = 17`
> `The two sides are equal: 2 lots of x, plus 5, is the same amount as 17.`
> `2x + 5 − 5 = 17 − 5`
> `Take 5 from both sides. Doing the same to both sides keeps them equal.`
> `2x = 12`
> `5 − 5 = 0, so only 2x is left on the left.`
> `2x ÷ 2 = 12 ÷ 2`
> `2x means 2 × x. Divide the whole of each side by 2.`
> `x = 6`
> `x is on its own: this is the solution.`
> `Check: 2 × 6 + 5 = 17`
>
> **Check in the original equation**
> Always check in the equation you were given. If you check in a later line, a mistake you made before it will not show up.
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What you are finding: no worked steps
- Solve 2x + 5 = 17: steps checked (contract)
  - `2x + 5 = 17` — The two sides are equal: 2 lots of x, plus 5, is the same amount as 17.
  - `2x + 5 − 5 = 17 − 5` — Take 5 from both sides. Doing the same to both sides keeps them equal.
  - `2x = 12` — 5 − 5 = 0, so only 2x is left on the left.
  - `2x ÷ 2 = 12 ÷ 2` — 2x means 2 × x. Divide the whole of each side by 2.
  - `x = 6` — x is on its own: this is the solution.
  - `Check: 2 × 6 + 5 = 17` — Put 6 back into the original equation. Both sides are 17, so x = 6 is right.
- Check in the original equation: no worked steps
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:6,17,3` Solve 6x + 17 = 35. What is x? — answer: 3
- independent check: `gen:lin:5,6,5` Solve 5x + 6 = 31. What is x? — answer: 5

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#both_sides

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “x on both sides” — intervention type `procedural`, general
- **Content revision:** `sha256:d1e680f45cc923e0de8d22a1dc624b1134cb44f0c1e220230a825bc7b1ee9027`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lboth:3,4,1,4` Solve 3x + 4 = x + 12. What is x? — answer: 4
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Why you may move x's**
> In 3x + 4 = x + 12 both sides contain x. Taking x from both sides keeps them equal, just as taking a number from both sides does.
> Every line changes both sides in the same way, so every line has the same solution as the first.
>
> **Solve 3x + 4 = x + 12**
> Collect the x's on the side with more of them, then the numbers on the other side.
> `3x + 4 = x + 12`
> `There are x's on both sides. Collect them on the side with more x's.`
> `3x + 4 − x = x + 12 − x`
> `Take x from both sides. It is the same amount on each side, so they stay equal.`
> `2x + 4 = 12`
> `3x − x = 2x, and the x's on the right are gone.`
> `2x + 4 − 4 = 12 − 4`
> `Take 4 from both sides, so the x term is on its own.`
> `2x = 8`
> `2x means 2 × x.`
> `x = 8 ÷ 2 = 4`
> `Divide both sides by 2.`
> `Check: 3 × 4 + 4 = 16 and 4 + 12 = 16`
>
> **Check both sides**
> Put your answer into both sides of the original equation: the two sides must give the same number.
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- Why you may move x's: no worked steps
- Solve 3x + 4 = x + 12: steps checked (contract)
  - `3x + 4 = x + 12` — There are x's on both sides. Collect them on the side with more x's.
  - `3x + 4 − x = x + 12 − x` — Take x from both sides. It is the same amount on each side, so they stay equal.
  - `2x + 4 = 12` — 3x − x = 2x, and the x's on the right are gone.
  - `2x + 4 − 4 = 12 − 4` — Take 4 from both sides, so the x term is on its own.
  - `2x = 8` — 2x means 2 × x.
  - `x = 8 ÷ 2 = 4` — Divide both sides by 2.
  - `Check: 3 × 4 + 4 = 16 and 4 + 12 = 16` — Put 4 into both sides of the original equation: both are 16.
- Check both sides: no worked steps
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lboth:7,15,3,5` Solve 7x + 15 = 3x + 35. What is x? — answer: 5
- independent check: `gen:lboth:8,3,4,3` Solve 8x + 3 = 4x + 15. What is x? — answer: 3

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#brackets

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Multiply out the bracket first” — intervention type `procedural`, general
- **Content revision:** `sha256:ccad1d6c91d24125fe9dbf272a87fe751a1029a92f962f89ef6d0a8c21c03f14`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lbrk:3,-2,2,11` Solve 3(x − 2) = 2x + 5. What is x? — answer: 11
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What the bracket means**
> 3(x − 2) = 2x + 5: the 3 multiplies everything inside the bracket, so 3(x − 2) is 3x − 6, not 3x − 2.
> Multiply out first. Then it is an equation with x on both sides.
>
> **Solve 3(x − 2) = 2x + 5**
> Multiply out, collect the x's, then the numbers, doing the same to both sides each time.
> `3(x − 2) = 2x + 5`
> `3(x − 2) means 3 lots of (x − 2).`
> `3x − 6 = 2x + 5`
> `Multiply out the bracket first: 3 × x = 3x and 3 × −2 = −6. Both terms inside are multiplied.`
> `3x − 6 − 2x = 2x + 5 − 2x`
> `Take 2x from both sides, so the x's are on one side.`
> `x − 6 = 5`
> `3x − 2x = x.`
> `x − 6 + 6 = 5 + 6`
> `Add 6 to both sides, so the x term is on its own.`
> `x = 11`
> `x is on its own.`
> `Check: 3 × (11 − 2) = 27 and 2 × 11 + 5 = 27`
>
> **Check with the bracket**
> Check in the original equation, with the bracket: work out the bracket first, then multiply.
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What the bracket means: no worked steps
- Solve 3(x − 2) = 2x + 5: steps checked (contract)
  - `3(x − 2) = 2x + 5` — 3(x − 2) means 3 lots of (x − 2).
  - `3x − 6 = 2x + 5` — Multiply out the bracket first: 3 × x = 3x and 3 × −2 = −6. Both terms inside are multiplied.
  - `3x − 6 − 2x = 2x + 5 − 2x` — Take 2x from both sides, so the x's are on one side.
  - `x − 6 = 5` — 3x − 2x = x.
  - `x − 6 + 6 = 5 + 6` — Add 6 to both sides, so the x term is on its own.
  - `x = 11` — x is on its own.
  - `Check: 3 × (11 − 2) = 27 and 2 × 11 + 5 = 27` — Put 11 into both sides of the original equation: both are 27.
- Check with the bracket: no worked steps
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lbrk:5,-5,1,10` Solve 5(x − 5) = x + 15. What is x? — answer: 10
- independent check: `gen:lbrk:4,4,2,2` Solve 4(x + 4) = 2x + 20. What is x? — answer: 2

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_finish

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Finish by dividing” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:0d182aa99b83b117cfc54560972fda7944a8eba219fd31b29b49ebd6b178a245`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lin:2,17,12` Solve 2x + 17 = 41. What is x? — answer: 12
- **Learner error or teaching trigger:** 
  - scenario J6 (two-step: forgets to divide; recovers; remembers 8 days later) — verified-misconception; recheck right [a3dec.json]
  - scenario J9 (fails the first recheck after teaching) — verified-misconception; recheck wrong [a3dec.json]

**Full explanation (verbatim):**

> **What went wrong**
> In 2x + 17 = 41, one wrong answer is 24.
> 17 was taken away but the 2 was not divided out: 2x = 24 means x = 24 ÷ 2.
> x is not on its own until the number multiplying it has been divided out, on both sides.
> `Not 24, but 12`
>
> **Solve 2x + 17 = 41 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `2x + 17 = 41`
> `The two sides are equal: 2 lots of x, plus 17, is the same amount as 41.`
> `2x + 17 − 17 = 41 − 17`
> `Take 17 from both sides. Doing the same to both sides keeps them equal.`
> `2x = 24`
> `17 − 17 = 0, so only 2x is left on the left.`
> `2x ÷ 2 = 24 ÷ 2`
> `2x means 2 × x. Divide the whole of each side by 2.`
> `x = 12`
> `x is on its own: this is the solution.`
> `Check: 2 × 12 + 17 = 41`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 2x + 17 = 41 correctly: steps checked (contract)
  - `2x + 17 = 41` — The two sides are equal: 2 lots of x, plus 17, is the same amount as 41.
  - `2x + 17 − 17 = 41 − 17` — Take 17 from both sides. Doing the same to both sides keeps them equal.
  - `2x = 24` — 17 − 17 = 0, so only 2x is left on the left.
  - `2x ÷ 2 = 24 ÷ 2` — 2x means 2 × x. Divide the whole of each side by 2.
  - `x = 12` — x is on its own: this is the solution.
  - `Check: 2 × 12 + 17 = 41` — Put 12 back into the original equation. Both sides are 41, so x = 12 is right.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:9,20,9` Solve 9x + 20 = 101. What is x? — answer: 9
- independent check: `gen:lin:3,3,4` Solve 3x + 3 = 15. What is x? — answer: 4

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_inverse

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Undo with the opposite operation” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:a5b6f1addea70bccf9baa10f6c69e8bdda2184d1fc05bb563bde399d8c9785c9`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lin:4,16,12` Solve 4x + 16 = 64. What is x? — answer: 12
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What went wrong**
> In 4x + 16 = 64, one wrong answer is 20.
> 16 was added to 64 instead of taken away: 4x = 64 + 16. To remove the + 16, take 16 from both sides: 4x = 64 − 16.
> To undo + a number, take it away from both sides; to undo × a number, divide both sides by it.
> `Not 20, but 12`
>
> **Solve 4x + 16 = 64 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `4x + 16 = 64`
> `The two sides are equal: 4 lots of x, plus 16, is the same amount as 64.`
> `4x + 16 − 16 = 64 − 16`
> `Take 16 from both sides. Doing the same to both sides keeps them equal.`
> `4x = 48`
> `16 − 16 = 0, so only 4x is left on the left.`
> `4x ÷ 4 = 48 ÷ 4`
> `4x means 4 × x. Divide the whole of each side by 4.`
> `x = 12`
> `x is on its own: this is the solution.`
> `Check: 4 × 12 + 16 = 64`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 4x + 16 = 64 correctly: steps checked (contract)
  - `4x + 16 = 64` — The two sides are equal: 4 lots of x, plus 16, is the same amount as 64.
  - `4x + 16 − 16 = 64 − 16` — Take 16 from both sides. Doing the same to both sides keeps them equal.
  - `4x = 48` — 16 − 16 = 0, so only 4x is left on the left.
  - `4x ÷ 4 = 48 ÷ 4` — 4x means 4 × x. Divide the whole of each side by 4.
  - `x = 12` — x is on its own: this is the solution.
  - `Check: 4 × 12 + 16 = 64` — Put 12 back into the original equation. Both sides are 64, so x = 12 is right.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:2,13,7` Solve 2x + 13 = 27. What is x? — answer: 7
- independent check: `gen:lin:3,9,1` Solve 3x + 9 = 12. What is x? — answer: 1

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_divide_all

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Divide the whole side” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:377edebdfa574554b577c583cbc142269a3722987f94863399dd9cddb7e113dd`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lin:8,8,8` Solve 8x + 8 = 72. What is x? — answer: 8
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What went wrong**
> In 8x + 8 = 72, one wrong answer is 1.
> Only part of the left side was divided by 8: 8x + 8 divided by 8 is x + 1, not x + 8. Divide every term, or take away 8 first.
> Dividing both sides is allowed, but it must divide every term of each side.
> `Not 1, but 8`
>
> **Solve 8x + 8 = 72 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `8x + 8 = 72`
> `The two sides are equal: 8 lots of x, plus 8, is the same amount as 72.`
> `8x + 8 − 8 = 72 − 8`
> `Take 8 from both sides. Doing the same to both sides keeps them equal.`
> `8x = 64`
> `8 − 8 = 0, so only 8x is left on the left.`
> `8x ÷ 8 = 64 ÷ 8`
> `8x means 8 × x. Divide the whole of each side by 8.`
> `x = 8`
> `x is on its own: this is the solution.`
> `Check: 8 × 8 + 8 = 72`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 8x + 8 = 72 correctly: steps checked (contract)
  - `8x + 8 = 72` — The two sides are equal: 8 lots of x, plus 8, is the same amount as 72.
  - `8x + 8 − 8 = 72 − 8` — Take 8 from both sides. Doing the same to both sides keeps them equal.
  - `8x = 64` — 8 − 8 = 0, so only 8x is left on the left.
  - `8x ÷ 8 = 64 ÷ 8` — 8x means 8 × x. Divide the whole of each side by 8.
  - `x = 8` — x is on its own: this is the solution.
  - `Check: 8 × 8 + 8 = 72` — Put 8 back into the original equation. Both sides are 72, so x = 8 is right.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lin:2,16,2` Solve 2x + 16 = 20. What is x? — answer: 2
- independent check: `gen:lin:5,10,2` Solve 5x + 10 = 20. What is x? — answer: 2

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_one_side

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Change both sides” — intervention type `conceptual`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:dcf7968ab1f89d51df243356a6fb12fbb54fa71b4a18e08d9f620116cffc70a7`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lboth:6,5,5,10` Solve 6x + 5 = 5x + 15. What is x? — answer: 10
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What went wrong**
> In 6x + 5 = 5x + 15, one wrong answer is 15.
> 5 was taken away on the left but not on the right. Whatever is done to one side must be done to the other: x = 15 − 5.
> An equation stays true only if both sides change in the same way.
> `Not 15, but 10`
>
> **Solve 6x + 5 = 5x + 15 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `6x + 5 = 5x + 15`
> `There are x's on both sides. Collect them on the side with more x's.`
> `6x + 5 − 5x = 5x + 15 − 5x`
> `Take 5x from both sides. It is the same amount on each side, so they stay equal.`
> `x + 5 = 15`
> `6x − 5x = x, and the x's on the right are gone.`
> `x + 5 − 5 = 15 − 5`
> `Take 5 from both sides, so the x term is on its own.`
> `x = 10`
> `x is on its own.`
> `Check: 6 × 10 + 5 = 65 and 5 × 10 + 15 = 65`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 6x + 5 = 5x + 15 correctly: steps checked (contract)
  - `6x + 5 = 5x + 15` — There are x's on both sides. Collect them on the side with more x's.
  - `6x + 5 − 5x = 5x + 15 − 5x` — Take 5x from both sides. It is the same amount on each side, so they stay equal.
  - `x + 5 = 15` — 6x − 5x = x, and the x's on the right are gone.
  - `x + 5 − 5 = 15 − 5` — Take 5 from both sides, so the x term is on its own.
  - `x = 10` — x is on its own.
  - `Check: 6 × 10 + 5 = 65 and 5 × 10 + 15 = 65` — Put 10 into both sides of the original equation: both are 65.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lboth:4,18,2,4` Solve 4x + 18 = 2x + 26. What is x? — answer: 4
- independent check: `gen:lboth:5,20,4,4` Solve 5x + 20 = 4x + 24. What is x? — answer: 4

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_sign_move

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Taking away an x term” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:54d9767fc5f029f46405b7fc6a27a4a0274344fe6a937973e8145327f0e376e5`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lboth:3,1,2,10` Solve 3x + 1 = 2x + 11. What is x? — answer: 10
- **Learner error or teaching trigger:** 
  - scenario J3 (x on both sides: moves an x term without changing its sign) — verified-misconception; recheck right [a3dec.json]

**Full explanation (verbatim):**

> **What went wrong**
> In 3x + 1 = 2x + 11, one wrong answer is 2.
> 2x was moved to the left without changing its sign. Taking 2x from both sides leaves x on the left, not 5x.
> Moving a term to the other side means taking it from both sides, so its sign changes.
> `Not 2, but 10`
>
> **Solve 3x + 1 = 2x + 11 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `3x + 1 = 2x + 11`
> `There are x's on both sides. Collect them on the side with more x's.`
> `3x + 1 − 2x = 2x + 11 − 2x`
> `Take 2x from both sides. It is the same amount on each side, so they stay equal.`
> `x + 1 = 11`
> `3x − 2x = x, and the x's on the right are gone.`
> `x + 1 − 1 = 11 − 1`
> `Take 1 from both sides, so the x term is on its own.`
> `x = 10`
> `x is on its own.`
> `Check: 3 × 10 + 1 = 31 and 2 × 10 + 11 = 31`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 3x + 1 = 2x + 11 correctly: steps checked (contract)
  - `3x + 1 = 2x + 11` — There are x's on both sides. Collect them on the side with more x's.
  - `3x + 1 − 2x = 2x + 11 − 2x` — Take 2x from both sides. It is the same amount on each side, so they stay equal.
  - `x + 1 = 11` — 3x − 2x = x, and the x's on the right are gone.
  - `x + 1 − 1 = 11 − 1` — Take 1 from both sides, so the x term is on its own.
  - `x = 10` — x is on its own.
  - `Check: 3 × 10 + 1 = 31 and 2 × 10 + 11 = 31` — Put 10 into both sides of the original equation: both are 31.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lboth:4,5,3,7` Solve 4x + 5 = 3x + 12. What is x? — answer: 7
- independent check: `gen:lboth:7,16,5,6` Solve 7x + 16 = 5x + 28. What is x? — answer: 6

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_number_sign

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Taking away a number” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:67a1f1ee2b1181ae89e486f8142415f0c8a13c6989ffeeb654c195b5a817e4e7`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lboth:5,18,1,1` Solve 5x + 18 = x + 22. What is x? — answer: 1
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What went wrong**
> In 5x + 18 = x + 22, one wrong answer is 10.
> 18 was moved to the right without changing its sign. To remove + 18 from the left, take 18 from both sides: 22 − 18, not 22 + 18.
> Moving a number to the other side means taking it from both sides, so its sign changes.
> `Not 10, but 1`
>
> **Solve 5x + 18 = x + 22 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `5x + 18 = x + 22`
> `There are x's on both sides. Collect them on the side with more x's.`
> `5x + 18 − x = x + 22 − x`
> `Take x from both sides. It is the same amount on each side, so they stay equal.`
> `4x + 18 = 22`
> `5x − x = 4x, and the x's on the right are gone.`
> `4x + 18 − 18 = 22 − 18`
> `Take 18 from both sides, so the x term is on its own.`
> `4x = 4`
> `4x means 4 × x.`
> `x = 4 ÷ 4 = 1`
> `Divide both sides by 4.`
> `Check: 5 × 1 + 18 = 23 and 1 + 22 = 23`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 5x + 18 = x + 22 correctly: steps checked (contract)
  - `5x + 18 = x + 22` — There are x's on both sides. Collect them on the side with more x's.
  - `5x + 18 − x = x + 22 − x` — Take x from both sides. It is the same amount on each side, so they stay equal.
  - `4x + 18 = 22` — 5x − x = 4x, and the x's on the right are gone.
  - `4x + 18 − 18 = 22 − 18` — Take 18 from both sides, so the x term is on its own.
  - `4x = 4` — 4x means 4 × x.
  - `x = 4 ÷ 4 = 1` — Divide both sides by 4.
  - `Check: 5 × 1 + 18 = 23 and 1 + 22 = 23` — Put 1 into both sides of the original equation: both are 23.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lboth:6,13,4,11` Solve 6x + 13 = 4x + 35. What is x? — answer: 11
- independent check: `gen:lboth:8,18,7,8` Solve 8x + 18 = 7x + 26. What is x? — answer: 8

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_distribution

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Multiply every term in the bracket” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:f0be3389c9cb7d377b3789760e9c79099aa33a7c771994570adf9ed75d0e26a6`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lbrk:6,3,5,8` Solve 6(x + 3) = 5x + 26. What is x? — answer: 8
- **Learner error or teaching trigger:** 
  - scenario J4 (brackets: multiplies only the first term) — verified-misconception; recheck right [a3dec.json]

**Full explanation (verbatim):**

> **What went wrong**
> In 6(x + 3) = 5x + 26, one wrong answer is 23.
> Only x was multiplied by 6. The 6 multiplies every term in the bracket: 6(x + 3) = 6x + 18, not 6x + 3.
> The number outside a bracket multiplies each term inside it.
> `Not 23, but 8`
>
> **Solve 6(x + 3) = 5x + 26 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `6(x + 3) = 5x + 26`
> `6(x + 3) means 6 lots of (x + 3).`
> `6x + 18 = 5x + 26`
> `Multiply out the bracket first: 6 × x = 6x and 6 × 3 = 18. Both terms inside are multiplied.`
> `6x + 18 − 5x = 5x + 26 − 5x`
> `Take 5x from both sides, so the x's are on one side.`
> `x + 18 = 26`
> `6x − 5x = x.`
> `x + 18 − 18 = 26 − 18`
> `Take 18 from both sides, so the x term is on its own.`
> `x = 8`
> `x is on its own.`
> `Check: 6 × (8 + 3) = 66 and 5 × 8 + 26 = 66`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 6(x + 3) = 5x + 26 correctly: steps checked (contract)
  - `6(x + 3) = 5x + 26` — 6(x + 3) means 6 lots of (x + 3).
  - `6x + 18 = 5x + 26` — Multiply out the bracket first: 6 × x = 6x and 6 × 3 = 18. Both terms inside are multiplied.
  - `6x + 18 − 5x = 5x + 26 − 5x` — Take 5x from both sides, so the x's are on one side.
  - `x + 18 = 26` — 6x − 5x = x.
  - `x + 18 − 18 = 26 − 18` — Take 18 from both sides, so the x term is on its own.
  - `x = 8` — x is on its own.
  - `Check: 6 × (8 + 3) = 66 and 5 × 8 + 26 = 66` — Put 8 into both sides of the original equation: both are 66.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lbrk:5,-6,3,3` Solve 5(x − 6) = 3x − 24. What is x? — answer: 3
- independent check: `gen:lbrk:4,3,3,4` Solve 4(x + 3) = 3x + 16. What is x? — answer: 4

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.algebra.linear-equations#fix_bracket_sign

- **Target competency:** Solve linear equations (`MATH.algebra.linear-equations`)
- **Explanation:** “Keep the sign in the bracket” — intervention type `procedural`, **misconception-specific** (shown only when a misconception is established for the learner)
- **Content revision:** `sha256:8b9ab8fc53b535f70cdff53ae98a78dd94f263728e364b13f2390aa49f8503a7`
- **Current status:** pending_review — engineering (new linear-equations explanation; worked lines machine-checked (teaching contract) and independently re-derived (linear-equations.test.ts); revised after two rounds of independent AI review; pending educator review, not approved)
- **Original question:** `gen:lbrk:2,-1,1,14` Solve 2(x − 1) = x + 12. What is x? — answer: 14
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What went wrong**
> In 2(x − 1) = x + 12, one wrong answer is 10.
> The sign was lost when multiplying out: 2 × −1 = −2, so 2(x − 1) = 2x − 2.
> Multiply the sign too: a positive number times a negative number is negative.
> `Not 10, but 14`
>
> **Solve 2(x − 1) = x + 12 correctly**
> Every line does the same to both sides; the check uses the original equation.
> `2(x − 1) = x + 12`
> `2(x − 1) means 2 lots of (x − 1).`
> `2x − 2 = x + 12`
> `Multiply out the bracket first: 2 × x = 2x and 2 × −1 = −2. Both terms inside are multiplied.`
> `2x − 2 − x = x + 12 − x`
> `Take x from both sides, so the x's are on one side.`
> `x − 2 = 12`
> `2x − x = x.`
> `x − 2 + 2 = 12 + 2`
> `Add 2 to both sides, so the x term is on its own.`
> `x = 14`
> `x is on its own.`
> `Check: 2 × (14 − 1) = 26 and 14 + 12 = 26`
>
> **Your turn**
> Now solve one on your own. Check your answer in the original equation.
>

**Mathematical steps, and what the machine checked:**

- What went wrong: no worked steps
- Solve 2(x − 1) = x + 12 correctly: steps checked (contract)
  - `2(x − 1) = x + 12` — 2(x − 1) means 2 lots of (x − 1).
  - `2x − 2 = x + 12` — Multiply out the bracket first: 2 × x = 2x and 2 × −1 = −2. Both terms inside are multiplied.
  - `2x − 2 − x = x + 12 − x` — Take x from both sides, so the x's are on one side.
  - `x − 2 = 12` — 2x − x = x.
  - `x − 2 + 2 = 12 + 2` — Add 2 to both sides, so the x term is on its own.
  - `x = 14` — x is on its own.
  - `Check: 2 × (14 − 1) = 26 and 14 + 12 = 26` — Put 14 into both sides of the original equation: both are 26.
- Your turn: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:lbrk:6,-6,2,12` Solve 6(x − 6) = 2x + 12. What is x? — answer: 12
- independent check: `gen:lbrk:6,-5,3,9` Solve 6(x − 5) = 3x − 3. What is x? — answer: 9

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

