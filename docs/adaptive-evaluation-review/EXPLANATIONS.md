# Educator-review packet (explanation-review@1)

Each section is one explanation at one exact revision. **Nothing here is approved.** The status shown is AI screening or registry bookkeeping, not an educator decision.

To record a decision, an authorised educator (listed in `reviewers` of `content/learning/explanation-review.v1.json` by a reviewed change) runs, for the revision shown:

```
node --import tsx packages/learning/scripts/explanation-review.ts decide '<id>' --status approved|revision_required|blocked --reviewer <id> --note "<what was checked>"
```

The command refuses a reviewer who is not authorised and records the decision against the current content hash only; any later edit of the explanation voids it.

Explanations in this packet: 9.

## MATH.calculus.integration-methods#why_du

- **Target competency:** Integrate by substitution and parts (`MATH.calculus.integration-methods`)
- **Explanation:** “Why 2x dx becomes du” — intervention type `conceptual`, general
- **Content revision:** `sha256:c02e08343df2e55ff5803d120f993c5a5deebea022a2e097580861ad03e19ab5`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:subst:0,1,1,2` ∫ from 0 to 1 of 2x(x² + 1)² dx = ? (A fraction is fine.) — answer: 7/3
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Nothing left to divide by**
> du ⁄ dx = 2x, so a small change dx in x changes u by 2x dx. The 2x in the integral is exactly what turns dx into du: there is no extra 2 to divide by.
>

**Mathematical steps, and what the machine checked:**

- Nothing left to divide by: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:subst:0,1,2,2` ∫ from 0 to 1 of 2x(x² + 2)² dx = ? (A fraction is fine.) — answer: 19/3
- independent check: `gen:subst:0,1,3,1` ∫ from 0 to 1 of 2x(x² + 3) dx = ? (A fraction is fine.) — answer: 7/2

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.calculus.integration-methods#limits_table

- **Target competency:** Integrate by substitution and parts (`MATH.calculus.integration-methods`)
- **Explanation:** “Make a little table of limits” — intervention type `procedural`, general
- **Content revision:** `sha256:ceab6b6f2fd66aac907167cbb3590f21a8dc222301c1c92dc7b4bb7f2501840b`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:subst:0,1,2,1` ∫ from 0 to 1 of 2x(x² + 2) dx = ? (A fraction is fine.) — answer: 5/2
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **x row, u row**
> Write two rows, x and u. Under x put the two limits; under u put x² + c for each. Then integrate in u between the u values.
> `∫ from 0 to 1 of 2x(x² + 2) dx = ?`
> `Let u = x² + 2: x = 0 gives u = 2, x = 1 gives u = 3`
> `2x dx = du, so the integral is ∫ u¹ du = u² ⁄ 2`
> `3² = 9`
> `2² = 4`
> `Between u = 2 and u = 3: 5/2`
>

**Mathematical steps, and what the machine checked:**

- x row, u row: steps checked (compatibility)
  - `Let u = x² + 2: x = 0 gives u = 2, x = 1 gives u = 3` — Evaluating gives 2, 3.
  - `2x dx = du, so the integral is ∫ u¹ du = u² ⁄ 2` — 
  - `3² = 9` — Evaluating gives 9.
  - `2² = 4` — Evaluating gives 4.
  - `Between u = 2 and u = 3: 5/2` — 
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:subst:0,2,4,2` ∫ from 0 to 2 of 2x(x² + 4)² dx = ? (A fraction is fine.) — answer: 448/3
- independent check: `gen:subst:0,3,1,2:mc` ∫ from 0 to 3 of 2x(x² + 1)² dx = ? Choose one. — answer: C

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.calculus.integration-methods#powers_check

- **Target competency:** Integrate by substitution and parts (`MATH.calculus.integration-methods`)
- **Explanation:** “Work out the powers” — intervention type `prerequisite`, general
- **Content revision:** `sha256:f68ced57e9f1a9880d4c895c6458af4950a9a6af21058639afe286bbb659b237`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:subst:0,2,4,3` ∫ from 0 to 2 of 2x(x² + 4)³ dx = ? (A fraction is fine.) — answer: 960
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **The last step is arithmetic**
> The last step is powers of whole numbers, like 2³ = 8 and 5³ = 125, then a subtraction and a division. A power is repeated multiplication, not the number times the power.
>

**Mathematical steps, and what the machine checked:**

- The last step is arithmetic: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:subst:0,2,4,3` ∫ from 0 to 2 of 2x(x² + 4)³ dx = ? (A fraction is fine.) — answer: 960
- independent check: `gen:subst:0,3,1,3` ∫ from 0 to 3 of 2x(x² + 1)³ dx = ? (A fraction is fine.) — answer: 9999/4

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.calculus.indefinite-integrals#differentiate_back

- **Target competency:** Find antiderivatives (`MATH.calculus.indefinite-integrals`)
- **Explanation:** “Check by differentiating back” — intervention type `conceptual`, general
- **Content revision:** `sha256:609dc7af0b54cb51f632cd2ee6d8a271c288b0a91a15fe34c01190cd15cb081d`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pint:0,2,3,2` ∫ from 0 to 2 of 3x² dx = ? (A fraction is fine.) — answer: 8
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Undo, then check**
> Whatever antiderivative you write, differentiate it: you must get back the function you started with. x³ differentiates to 3x², so ∫ 3x² dx = x³ + C.
>

**Mathematical steps, and what the machine checked:**

- Undo, then check: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pint:1,3,5,2` ∫ from 1 to 3 of 5x² dx = ? (A fraction is fine.) — answer: 130/3
- independent check: `gen:pint:0,1,12,2` ∫ from 0 to 1 of 12x² dx = ? (A fraction is fine.) — answer: 4

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.calculus.indefinite-integrals#raise_then_divide

- **Target competency:** Find antiderivatives (`MATH.calculus.indefinite-integrals`)
- **Explanation:** “Raise, then divide” — intervention type `procedural`, general
- **Content revision:** `sha256:c7861c59acf8fe1b3ef0a04d98f7852062fc279d8ac993f3e459745ccbc5ba03`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pint:0,1,12,1` ∫ from 0 to 1 of 12x dx = ? (A fraction is fine.) — answer: 6
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Two moves, then the limits**
> Add one to the power, then divide by that new power. Then put in the upper limit and the lower limit, and subtract.
> `∫ from 0 to 1 of 12x dx = ?`
> `Raise the power and divide: F(x) = 12x² ⁄ 2`
> `1² = 1`
> `0² = 0`
> `F(1) − F(0) = 6`
>

**Mathematical steps, and what the machine checked:**

- Two moves, then the limits: steps checked (compatibility)
  - `Raise the power and divide: F(x) = 12x² ⁄ 2` — 
  - `1² = 1` — Evaluating gives 1.
  - `0² = 0` — Evaluating gives 0.
  - `F(1) − F(0) = 6` — 
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pint:0,1,6,3` ∫ from 0 to 1 of 6x³ dx = ? (A fraction is fine.) — answer: 3/2
- independent check: `gen:pint:0,1,12,3:mc` ∫ from 0 to 1 of 12x³ dx = ? Choose one. — answer: A

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.calculus.indefinite-integrals#powers_and_fractions

- **Target competency:** Find antiderivatives (`MATH.calculus.indefinite-integrals`)
- **Explanation:** “Powers and fractions first” — intervention type `prerequisite`, general
- **Content revision:** `sha256:11bc72b1d56e1a415abb7c04981d347a4ffd6de2f88385dcfeeaefe3d8e28ecf`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pint:0,1,6,2` ∫ from 0 to 1 of 6x² dx = ? (A fraction is fine.) — answer: 2
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **What the working needs**
> The working needs powers (2³ = 8) and fractions with the same denominator (16⁄3 − 2⁄3 = 14⁄3). If either is slow, practise it first; the integration itself is two moves.
>

**Mathematical steps, and what the machine checked:**

- What the working needs: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pint:0,1,6,2` ∫ from 0 to 1 of 6x² dx = ? (A fraction is fine.) — answer: 2
- independent check: `gen:pint:1,3,3,1` ∫ from 1 to 3 of 3x dx = ? (A fraction is fine.) — answer: 12

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.exponents#count_factors

- **Target competency:** Use integer exponent laws (`MATH.number.exponents`)
- **Explanation:** “Write out the factors” — intervention type `conceptual`, general
- **Content revision:** `sha256:9b76f3028608d63a1066402d9dabba5346e96bfe6351728c5ca4a988cdedd68e`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pow:11,3` 11³ = ? — answer: 1331
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Count them out**
> Write the number as many times as the power says, with × between them. Then multiply two at a time.
> `11³ = ?`
> `11 × 11 × 11 = 1331`
>

**Mathematical steps, and what the machine checked:**

- Count them out: steps checked (compatibility)
  - `11 × 11 × 11 = 1331` — 
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pow:11,2` 11² = ? — answer: 121
- independent check: `gen:pow:5,4` 5⁴ = ? — answer: 625

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.exponents#build_up

- **Target competency:** Use integer exponent laws (`MATH.number.exponents`)
- **Explanation:** “Build it up one step at a time” — intervention type `procedural`, general
- **Content revision:** `sha256:47eccf5f65e77bd616728f3d00cd3e284d22bb014e9d72fcca98baf444f4fb56`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pow:11,4` 11⁴ = ? — answer: 14641
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Multiply again and again**
> Start with the number and multiply by it again for each extra power. That is one multiplication fewer than the power.
> `11⁴ = ?`
> `11 × 11 × 11 × 11 = 14641`
>

**Mathematical steps, and what the machine checked:**

- Multiply again and again: steps checked (compatibility)
  - `11 × 11 × 11 × 11 = 14641` — 
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pow:4,4` 4⁴ = ? — answer: 256
- independent check: `gen:pow:5,5:mc` 5⁵ = ? Choose one. — answer: D

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

## MATH.number.exponents#facts_first

- **Target competency:** Use integer exponent laws (`MATH.number.exponents`)
- **Explanation:** “Use the multiplication facts you know” — intervention type `prerequisite`, general
- **Content revision:** `sha256:0211a2ce0d732420c2413bd61ffa819ca1432b7f6e33077e0307c35f857bfc87`
- **Current status:** pending_review — registry (registered: not yet screened or reviewed)
- **Original question:** `gen:pow:5,2` 5² = ? — answer: 25
- **Learner error or teaching trigger:** not reached by the audited scenarios; triggered when the engine selects it for this skill

**Full explanation (verbatim):**

> **Each step is a fact**
> Every step of a power is a multiplication fact: 2 × 2 = 4, 4 × 2 = 8, 8 × 2 = 16. If a step is slow, say that times table first.
>

**Mathematical steps, and what the machine checked:**

- Each step is a fact: no worked steps
- Teaching-contract check: machine-checked; no violations

**Expected learner understanding:** not stated in the content. As the content is built, the learner should afterwards answer the independent recheck below alone. The educator confirms or corrects this.

**Independent recheck:**

- guided (with help): `gen:pow:5,2` 5² = ? — answer: 25
- independent check: `gen:pow:4,3` 4³ = ? — answer: 64

**Previous AI audit findings (screening only, not educator review):**

- not in the Milestone 2 audit

**Educator decision:** ☐ approve this revision ☐ request revision ☐ block — reviewer id: ______ date: ______ note: ______

