# Grade 10 showcase: human review checklist

**Status: not educator-reviewed.**

The lessons below pass mechanical checks:

- arithmetic claims evaluate;
- the result equals the question's checked answer;
- pictures are built from the question's own values;
- practice starts with the case that was taught.

None of these checks establishes that the teaching is good. Each lesson needs a reviewer (an educator familiar with the CBSE or TN Grade 10 syllabus) to tick every row and record their name, date and decision in the review registry (`content/learning/review.v1.json`). Until then, every item stays `draft`.

## How to review

1. Open the preview at 360 px: `/curriculum/?preview=1#b=<cbse|tn>&g=10&c=<competency>`.
2. Read every section, step through the worked example, then press **Practice this concept** and answer two questions (one right, one wrong).
3. For each lesson, answer each row with **Yes**, **No** (with a note) or **N/A**.

| # | Check |
|---|-------|
| C1 | **Mathematical correctness.** Every statement and every step is true. The final answer is right, and the units and notation follow the syllabus. |
| C2 | **Correctness of the picture.** The picture shows this question's mathematics. It is neither decorative nor misleading. |
| C3 | **Clarity.** The concept text explains why, not only how. The wording suits a Grade 10 learner in this board. |
| C4 | **Step size.** No step skips reasoning a Grade 10 learner would need. No step is padded. |
| C5 | **Difficulty.** The worked example and the first practice questions sit at the board's Grade 10 level, neither trivial nor beyond the syllabus. |
| C6 | **Misconception.** The common-mistake section describes a real error learners make, and its explanation corrects it. |
| C7 | **Alternative method.** "Another way" is a genuine, syllabus-appropriate method for this question, not filler. |
| C8 | **Practice alignment.** The first practice question tests what was just taught. Feedback on a wrong answer helps. |
| C9 | **Instructional usefulness.** A learner who reads this lesson can attempt the practice unaided. Would you use it? |

## Curated lessons

| Lesson | Family | Boards | What to look at especially |
|--------|--------|--------|----------------------------|
| Euclid's division algorithm (`MATH.number.euclid-algorithm`) | `hcf` | CBSE, TN | The concept section and the worked example both show a division table: is that repetitive? The concept repeats "So the HCF does not change …" in the worked section's text. The "common mistake" is LCM instead of HCF. |
| Arithmetic sequences, nth term (`MATH.algebra.arithmetic-sequences`) | `apn` | CBSE, TN | The table shows the three given terms. The steps run: difference, then number of jumps (n − 1), then term. Check the language around "jumps". |
| Pythagoras, missing side (`MATH.geometry.pythagoras`) | `ahpyth` | TN | The concept teaches the hypotenuse case; the worked example teaches the shorter-side case. Is that order right? "Spot a triple" appears only for multiples of 3-4-5, 5-12-13 and 8-15-17. |
| Classical probability (`MATH.probability.classical`) | `anbag` | CBSE, TN | Bags of two or three colours, drawn as counted balls. The answer is a simplified fraction. Check the wording of "out of how many". |
| Discriminant, nature of roots (`MATH.algebra.quadratic-discriminant`) | `disc` | CBSE, TN | New family idea and method. The cases are two, one or no real roots, and practice starts with the case taught. The worked example is checked from the family's own steps, not from instance teaching. |
| Relations, n(A × B) (`MATH.algebra.relations`) | `aocart` | TN | The kernel worked example (6 = 3 × n(B)) is kept. Practice now starts with "find n(B)" questions. |

## Rest of the scope (57 lessons)

These lessons were checked mechanically only (see `TEACHING_CONTRACT.md`).

Fourteen worked-example sections are labelled **Method** because their solution could not be checked to the answer. They need repair or confirmation before a showcase:

- mathematical-argument (`anpts`)
- prime-factorisation (`ajpf`)
- primes (`agprime`)
- factorisation (`factor`)
- linear-systems (`alsys`)
- model-selection (`anpair`)
- trigonometry ratios (`anstd`)
- sets (`aosetop`)
- function-types (`aqonto`)
- three-variable systems (`al3sys`)
- rational expressions (`alratl`)
- polynomial square root (`alpsq`)
- quadratic graphs (`alqline`)
- matrices (`apmmul`)

Seventeen sections in scope (eighteen platform-wide) are exempted, each with a stated reason in `content/learning/teaching-contract-exemptions.v1.json`. A reviewer confirms or rejects every exemption.
