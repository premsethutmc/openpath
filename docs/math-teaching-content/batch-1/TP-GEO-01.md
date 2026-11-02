# TP-GEO-01: The exterior angle of a triangle

**Status:** review-candidate (not approved, not registered, not served). Competency `MATH.geometry.triangle-properties` (Use elementary triangle properties, grade 6), family `ahext` (The exterior angle of a triangle).

**Skill.** Use the exterior-angle theorem: an exterior angle equals the sum of the two interior opposite angles (both directions).

## Prerequisites

- angles on a straight line add to 180° (MATH.geometry.angle-pairs)
- angle sum of a triangle is 180°
- Graph: MATH.geometry.basic-constructions (mandatory)
- SUSPECTED GRAPH GAP: triangle-properties lists only basic-constructions as mandatory; the exterior-angle theorem depends on angles on a straight line (angle-pairs). Not changed here; for Codex/curriculum review.

## Explanation

At C the exterior angle and the interior angle next to it lie on a straight line, so together they make 180°.
The three interior angles also make 180°. Both pairs make 180° and share the angle at C, so the exterior angle equals the other two interior angles together.

Visual: `{"type":"triangle","angles":["39°","","112°"],"exterior":{"at":1,"label":"?"},"notToScale":true,"description":"A triangle (not drawn to scale) with one side extended. The two interior angles opposite the exterior angle are 39° and 112°. The exterior angle is marked ?."}`. Spec 09 V3 (supersedes the earlier placeholder, which put the second opposite angle at vertex 1, next to the exterior angle). RENDERING BLOCKED until Codex adds the `exterior` field (extended side, arc and label at vertex 1) and the `notToScale` caption to Figure.tsx `triangle`; today the field is ignored and a plain triangle would be drawn without the exterior angle, so the screen must stay text-only. The vertices are fixed, so the figure is NOT to scale; `description` is the required screen-reader text. Nothing is read from the picture. **UNSUPPORTED BY THE RENDERER (blocked): 09 V3: needs `exterior` and `notToScale` in Figure.tsx triangle. The integration screens carry no widget (text only).**

## Worked examples (instances from the generator; lines from the independent oracle; checked)

**`gen:ahext:39,112,0`** — One side of a triangle is extended. The two interior angles opposite the exterior angle are 39° and 112°. What is the exterior angle, in degrees?

1. Third interior angle C = 180° − 39° − 112° = 29° (angle sum)
1. Exterior angle = 180° − 29° = 151° (straight line)
1. Check: 39° + 112° = 151° (exterior-angle theorem)

Answer **151**. (The family's own step text: Exterior angle = sum of the interior opposite angles: 39° + 112° = 151°.)

**`gen:ahext:93,36,1`** — One side of a triangle is extended. The exterior angle is 129° and one of the two interior opposite angles is 93°. What is the other interior opposite angle, in degrees?

1. Interior angle next to the exterior angle C = 180° − 129° = 51° (straight line)
1. Other opposite angle = 180° − 93° − 51° = 36° (angle sum)
1. Check: 93° + 36° = 129° (exterior-angle theorem)

Answer **36**. (The family's own step text: Other opposite angle = exterior − known: 129° − 93° = 36°.)

## Hints (graded, per worked example)

For `gen:ahext:39,112,0`:

1. Which interior angle sits next to the exterior angle, on the straight line?
2. That angle and the exterior angle make 180°; the three interior angles also make 180°.
3. So the exterior angle equals the two far interior angles added.

For `gen:ahext:93,36,1`:

1. Which interior angle sits next to the exterior angle, on the straight line?
2. That angle and the exterior angle make 180°; the three interior angles also make 180°.
3. So the far angle is the exterior angle minus the other far angle.

## Alternative explanation: Go through the third angle

Find the third interior angle with the angle sum.
The exterior angle and that angle lie on a straight line, so the exterior angle is a straight angle minus the third angle.

## Valid alternative methods (each checked to reach the same answer on every applicable generated item)

- **Exterior-angle theorem directly**: exterior = 39° + 112° = 151°

**Method credit.** A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: ahext has a geometry task (geometry-task.ts) for the foundation's geometry working adapter; the Python reasoner has NO exterior-angle rule (G5 R07), so a citation of the exterior-angle theorem is not verifiable; the 'via the third angle' route uses supported rules (triangle-sum, straight-line).

## Diagnostic (distinguishes the difficulties)

Interpretation rule: A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.

| Item | Case | Correct | Readings of other answers |
|---|---|---|---|
| `gen:ahext:51,21,0`: One side of a triangle is extended. The two interior angles opposite the exterior angle are 51° and 21°. What is the exterior angle, in degrees? | find the exterior angle — third-interior gives 180 − a − b (the adjacent interior angle) | 72 | 108 → TARGET modelled error third-interior (conceptual): suspected on one answer; 129 | 159 → other modelled error one-angle (procedural): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |
| `gen:ahext:32,96,1`: One side of a triangle is extended. The exterior angle is 128° and one of the two interior opposite angles is 32°. What is the other interior opposite angle, in degrees? | find an interior opposite angle — exterior-as-interior and adjacent-interior give different wrong values; a learner who only adds is wrong here | 96 | 20 → TARGET modelled error exterior-as-interior (conceptual): suspected on one answer; 160 → other modelled error added (procedural): suspected on one answer; 52 → TARGET modelled error adjacent-interior (conceptual): suspected on one answer; anything else → unexplained (no diagnosis; policy A: a single slip is kept, not acted on) |

## Misconception-specific teaching (only after the misconception is ESTABLISHED)

### `third-interior` (conceptual) — the exterior angle confused with the adjacent interior angle

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "One side of a triangle is extended. The two interior angles opposite the exterior angle are 34° and 27°. What is the exterior angle, in degrees?", one wrong answer is 119.
> The third interior angle was found instead. The exterior angle sits outside, next to that angle, on the straight line.
> The exterior angle is OUTSIDE the triangle, on the straight line next to the third angle; it is not the third angle.
> Not 119, but 61.

Counter-check: the third angle is 119°; it and the exterior angle must make 180°, so the exterior angle is 61°.

Solved correctly:

1. Third interior angle C = 180° − 34° − 27° = 119° (angle sum)
1. Exterior angle = 180° − 119° = 61° (straight line)
1. Check: 34° + 27° = 61° (exterior-angle theorem)

Example `gen:ahext:34,27,0`; guided `gen:ahext:34,53,0:mc`; fresh check `gen:ahext:111,26,0`.

### `adjacent-interior` (conceptual) — the same confusion in reverse

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "One side of a triangle is extended. The exterior angle is 135° and one of the two interior opposite angles is 108°. What is the other interior opposite angle, in degrees?", one wrong answer is 45.
> The interior angle next to the exterior angle was found (180° − exterior). The question asks for the other opposite angle.
> The question asks for an angle FAR from the exterior angle, not the one next to it.
> Not 45, but 27.

Counter-check: 45° is the angle next to the exterior angle; the far angles add to 135°, so the other far angle is 27°.

Solved correctly:

1. Interior angle next to the exterior angle C = 180° − 135° = 45° (straight line)
1. Other opposite angle = 180° − 108° − 45° = 27° (angle sum)
1. Check: 108° + 27° = 135° (exterior-angle theorem)

Example `gen:ahext:108,27,1`; guided `gen:ahext:23,76,1`; fresh check `gen:ahext:47,45,1`.

### `exterior-as-interior` (conceptual) — the exterior angle used as a third interior angle

Status: modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers).

> In "One side of a triangle is extended. The exterior angle is 128° and one of the two interior opposite angles is 45°. What is the other interior opposite angle, in degrees?", one wrong answer is 7.
> The exterior angle was used as if it were inside the triangle (180° − 128° − 45°). The exterior angle equals the two opposite interior angles together.
> The exterior angle is outside the triangle; it is not one of the three angles that make 180°.
> Not 7, but 83.

Counter-check: 128° makes 180° with the interior angle next to it (52°). The interior angles are 45°, 52° and the one you want: 180° − 45° − 52° = 83°.

Solved correctly:

1. Interior angle next to the exterior angle C = 180° − 128° = 52° (straight line)
1. Other opposite angle = 180° − 45° − 52° = 83° (angle sum)
1. Check: 45° + 83° = 128° (exterior-angle theorem)

Example `gen:ahext:45,83,1`; guided `gen:ahext:25,60,1:mc`; fresh check `gen:ahext:69,32,1:mc`.

## Practice, transfer and delayed checks (fresh; same skill)

- Guided practice: `gen:ahext:62,79,0:mc`, `gen:ahext:34,63,0:mc`, `gen:ahext:80,39,0`
- Rechecks after teaching: `gen:ahext:86,70,0:mc`, `gen:ahext:44,76,1`
- Transfer (everyday form): `gen:ahext:44,105,1:w`, `gen:ahext:21,85,1:w`
- Delayed checks: `gen:ahext:56,89,0:mc`, `gen:ahext:77,74,1`

## Integration specification (for the shared teaching selector; nothing written)

- **Skill:** Use the exterior-angle theorem: an exterior angle equals the sum of the two interior opposite angles (both directions).
- **Generator:** `ahext` — ahext, both forms: params[2] = 0 (find the exterior angle) and 1 (find an interior opposite angle); examples avoid coincident angles.
- **Trigger** `ahext_concept`: general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page
- **Trigger** `fix_third_interior`: verified-misconception 'third-interior' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_adjacent_interior`: verified-misconception 'adjacent-interior' (two matching answers, misconception-evidence@1)
- **Trigger** `fix_exterior_as_interior`: verified-misconception 'exterior-as-interior' (two matching answers, misconception-evidence@1)
- **Allowed methods:** the oracle's method (worked lines); Exterior-angle theorem directly
- **Fresh check:** partition `check`; a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question; exclude the exposure keys and number signatures of every item already shown in this teaching. Candidates: `gen:ahext:86,70,0:mc`, `gen:ahext:44,76,1`
- **Retention target:** MATH.geometry.triangle-properties / `ahext`, cases: find the exterior angle; find an interior opposite angle. Candidates: `gen:ahext:56,89,0:mc`, `gen:ahext:77,74,1`
- **Answer evidence:** grading-decision@1 correctness from the trusted server grader (every item here is gradable)
- **Method evidence:** ahext has a geometry task (geometry-task.ts) for the foundation's geometry working adapter; the Python reasoner has NO exterior-angle rule (G5 R07), so a citation of the exterior-angle theorem is not verifiable; the 'via the third angle' route uses supported rules (triangle-sum, straight-line)
- **Ungradable / text-only:** none
- **Reused existing explanations:** none

Platform checks of the proposed objects (in memory):

| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |
|---|---|---|---|---|---|
| `ahext_concept` | **not checked**: outside the module's teaching scope (ineligible today) | 4/4 sections checked, no violations | yes | yes | — |
| `fix_third_interior` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | third-interior |
| `fix_adjacent_interior` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | adjacent-interior |
| `fix_exterior_as_interior` | **not checked**: outside the module's teaching scope (ineligible today) | 2/2 sections checked, no violations | no (misconception-evidence) | yes | exterior-as-interior |

Registry validation problems for the new records: none.

The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).

## Sources

- packages/learning/src/fam/b08.ts:1199 ahext: teach, via_third, bugs third-interior / one-angle / exterior-as-interior / added / adjacent-interior
- docs/geometry-cross-domain-validation (G5): G-03 failed journey; R07

## Uncertainties

- Family bugs 'one-angle' and 'added' are procedural and not given misconception screens here (general teaching covers them).

## Validation: 22/22 items pass; whole-pool oracle + alternatives agreement 400/400
