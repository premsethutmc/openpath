# CISCE (ICSE) Class 5 mathematics (icse@1)

2026-11-11. A third board, for Grade 5 only: `boardFor("icse", 5)`, release `icse-cisce-mathematics-grade-5@1.3.0`.
It reuses existing skills, lessons and question families; nothing was written for it. Not an educator review: OpenPath
has no educators, and questions count through machine validation only (`docs/product/MACHINE_VALIDATION.md`).

## Source (not official)

- Read: a third-party copy of the Class V mathematics pages (printed pages 101 to 115, ten themes) of the CISCE
  curriculum, hosted by BYJU'S: <https://cdn1.byjus.com/wp-content/uploads/2019/03/ICSEClass-5-Maths-Syllabus.pdf>
  (accessed 2026-11-11). The pages do not name their publisher or year. They were read through a text summary of the
  PDF; the PDF itself could not be downloaded here.
- Not read: the official document on <https://cisce.org/>. The site could not be reached from the build environment.
- So every theme is marked `sourceVerified: false`, and the release note begins "UNOFFICIAL SOURCE".
- CISCE is understood not to prescribe a textbook for Class V, so a school's own book may order or extend the topics
  differently. **The inventory should be checked against the learner's actual textbook and term plan.**
- No curriculum text is copied: each outcome is in OpenPath's own words with a pointer to its theme and line
  (`content/learning/syllabus/icse-g05.json`).

## Coverage

The document lists 78 learning-outcome lines. Lines that repeat a skill are merged, the line on pie charts and line
graphs is split in two, and 2 items that appear only under key concepts are added: **77 outcomes**.

| | Outcomes |
|---|---|
| Fully covered by existing skills | 58 |
| Partly covered (the note says what is missing) | 16 |
| Not covered (gaps, not in the release) | 3 |

### Gaps (not in the release)

No skill, lesson or question exists:
1. Roman numerals (Theme 1).
2. Symmetry in familiar 3-D shapes (Theme 6).
3. Reading line graphs (Theme 9).

**Repaired (grade5-lessons@1).** Four outcomes of Theme 5 were first left out because the lessons of
`MATH.number.number-line` and `MATH.number.integers` failed OpenPath's teaching checks. Both lessons now pass with no
violation (release 1.1.0: number line; release 1.2.0: integers), and the outcomes are in: whole numbers on a number line
and comparing integers (full); what integers are and ordering integers (partly: no question asks what an integer is, and
none asks for descending order).

## Measured (2026-11-11)

Synthetic learner, **no review fixture** (machine validation only), clock from 2026-11-13, delayed sessions 9 days
apart (`frontend/src/year/icse-grade5.test.ts`, which CI runs in parts):

| | Skills |
|---|---|
| In the release | 59 |
| Taught after two early mistakes (lesson, strategy screen or guided question) | 59 |
| Verified when every answer is right (one delayed session each) | 59 |
| Person-marked | 0 |
| Not verified | 0 |

The two skills left out (number line, integers) were also verified by the same learner, but were not taught after
mistakes; that is why they are gaps.

A simulated learner shows what the program decides: nothing is unavailable and nothing stalls. It does not show that
a child learns, that the teaching is good, or that a question suits a ten-year-old.

## Known limits

- Seven skills were written for Grade 6 or 7 in the other boards (integer addition, multiplying and dividing fractions
  and decimals, prime factorisation, divisibility, Indian and international numeration, percentage of an amount). CISCE
  places them in Class V; their lessons and wording were written with older learners in mind and have not been read
  for a Class V child.
- The coverage matrix classes all 74 outcomes "Partially implemented": the outcome-assessment map (the judgement of
  whether the content assesses every part of an outcome) has not been made for them.
- The topic dashboard lists CISCE / ICSE for Grade 5 only.
- "Full" and "Partly" above are a mapping judgement from question-family titles and examples, not a review of every
  question.

## Outcome by outcome

### Theme 1: Numbers

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Read and write numbers up to crores with Indian place value and commas. | learning outcome 1 | Full | `number.indian-international-numeration`, `number.large-numbers` |  |
| Read and write large numbers in the international system (millions) and relate it to lakhs and crores. | learning outcome 2 | Full | `number.indian-international-numeration` |  |
| Write a large number in expanded form and turn an expanded form back into the number. | learning outcome 3 | Full | `number.large-numbers` |  |
| Compare large numbers by place value and put them in ascending or descending order. | learning outcome 4 | Full | `number.compare-numbers`, `number.large-numbers` |  |
| Make the greatest and the smallest number from a set of digits. | learning outcome 5 | Full | `number.compare-numbers` |  |
| Round a number to the nearest 10, 100 or 1000. | learning outcome 6 | Full | `number.rounding` |  |
| Show what a fraction means as equal parts of a whole. | learning outcome 8 | Full | `number.fraction-models` |  |
| Find a fraction of a collection of objects. | learning outcome 9 | Full | `number.fraction-of-collection` |  |
| Recognise and make equivalent fractions. | learning outcome 10 | Full | `number.equivalent-fractions` |  |
| Write simple fractions such as a half, a quarter and a fifth as decimals and back, with lengths and money. | learning outcome 11 | Full | `measurement.money-decimals`, `number.decimal-tenths` |  |
| Build and use the multiplication tables from 2 to 20. | key concept (no outcome line of its own) | Partly | `number.multiplication-tables` | Facts to 10 × 10 and the 13 to 19 tables have questions; 11, 12 and 20 have none of their own. |
| Write numbers in Roman numerals. | learning outcome 7 | **Not covered** | — | No skill, lesson or question. |

### Theme 2: Number Operations

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Use place value beyond 1000 when adding, subtracting, multiplying and dividing. | learning outcome 1 | Full | `number.multi-digit-add-subtract`, `number.multi-multiplication` |  |
| Divide a number by a two-digit number with the standard written method. | learning outcomes 2 and 5 (the same skill, listed twice) | Full | `number.division-remainders`, `number.long-division` |  |
| Estimate a sum, difference, product or quotient, and check an answer against the estimate. | learning outcome 3 | Partly | `number.rounding`, `reasoning.estimate-check` | Estimating a quotient of whole numbers has no question of its own. |
| Add, subtract and multiply large numbers with the standard written methods. | learning outcome 4 | Full | `number.multi-digit-add-subtract`, `number.multi-multiplication` |  |
| Solve everyday problems that need the four operations. | learning outcome 6 | Full | `reasoning.multi-step`, `reasoning.operation-choice` |  |
| Make up a word problem that fits a given number statement. | learning outcome 7 | Partly | `reasoning.operation-choice` | OpenPath asks which operation fits a story; a problem the learner writes needs a person to read it. |
| Explain what factors, multiples, prime numbers and composite numbers are. | learning outcome 8 | Full | `number.factors-multiples`, `number.primes` |  |
| Find factors and multiples in different ways, including a factor tree. | learning outcome 9 | Full | `number.factors-multiples`, `number.prime-factorisation` |  |
| Pick out the prime and the composite numbers up to 100. | learning outcome 10 | Full | `number.primes` |  |

### Theme 3: Fractions and Decimals

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Tell proper fractions, improper fractions and mixed numbers apart. | learning outcome 1 | Full | `number.mixed-fractions` |  |
| Write equivalent fractions by multiplying or dividing the top and bottom numbers by the same number. | learning outcome 2 | Full | `number.equivalent-fractions` |  |
| Compare and order three or more fractions. | learning outcome 3 | Full | `number.fraction-comparison` |  |
| Add and subtract unlike fractions and mixed numbers. | learning outcome 4 | Full | `number.fraction-add` |  |
| Solve word problems that add or subtract fractions. | learning outcome 5 | Partly | `number.fraction-add` | The questions on adding and subtracting fractions are calculations, not stories. |
| Read a fraction 'of' a quantity as a multiplication. | learning outcome 6 | Full | `number.fraction-multiply`, `number.fraction-of-collection` |  |
| Multiply a fraction by a whole number and a fraction by a fraction. | learning outcome 7 | Full | `number.fraction-multiply`, `number.fraction-product` |  |
| Divide a whole number by a fraction and a fraction by a fraction. | key concept (no outcome line of its own) | Full | `number.fraction-product` |  |
| Write fractions with denominator 10, 100 or 1000 as decimals and back. | learning outcome 8 | Full | `number.decimal-tenths` |  |
| Show a decimal in a picture, such as a shaded strip or grid. | learning outcome 9 | Partly | `number.decimal-tenths` | Decimals are asked in figures and words; shaded-grid pictures of decimals are not part of the questions. |
| Give the place value of each digit of a decimal to thousandths. | learning outcome 10 | Full | `number.decimal-tenths` |  |
| Write a decimal in expanded form. | learning outcome 11 | Full | `number.decimal-tenths` |  |
| Recognise equivalent decimals, like decimals and unlike decimals. | learning outcome 12 | Partly | `number.decimal-tenths` | Decimals with different numbers of places are compared; the names 'like' and 'unlike' decimals are not used. |
| Compare decimals and put them in order. | learning outcomes 13 (compare and order) | Full | `number.decimal-tenths` |  |
| Add and subtract decimals. | learning outcome 14 | Full | `number.decimal-operations` |  |
| Solve word problems that add or subtract decimals. | learning outcome 15 | Full | `number.decimal-operations` |  |
| Multiply a decimal by 10, 100 or 1000 by moving the digits. | learning outcome 16 | Full | `number.decimal-product`, `number.multiply-divide-powers-of-ten` |  |
| Multiply a decimal by a whole number and a decimal by a decimal. | learning outcome 17 | Full | `number.decimal-product` |  |

### Theme 4: Playing with Numbers (Factors and Multiples)

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| List the multiples of a number. | learning outcome 1 | Full | `number.factors-multiples` |  |
| Find all the factors of a number. | learning outcome 2 | Full | `number.factors-multiples` |  |
| Identify prime, composite, twin-prime and co-prime numbers. | learning outcome 3 | Partly | `number.hcf-lcm`, `number.primes` | Prime, composite and co-prime numbers have questions; twin primes have none. |
| Test whether a number is divisible by 2, 3, 4, 5, 9, 10 or 11. | learning outcome 4 and its key concept | Partly | `reasoning.divisibility` | The questions cover the tests for 2, 4, 5, 8 and 10 and a missing-digit question; 3, 9 and 11 are not practised as tests of their own. |
| Write a number as a product of its prime factors with a factor tree. | learning outcome 5 | Full | `number.prime-factorisation` |  |
| Find the HCF of numbers by listing factors and by common division. | learning outcome 6 | Full | `number.factors-multiples`, `number.hcf-lcm` |  |
| Find the LCM of numbers by listing multiples and by common division. | learning outcome 7 | Full | `number.hcf-lcm` |  |
| Use the link HCF × LCM = product of the two numbers to find one from the other. | learning outcome 8 | Full | `number.hcf-lcm` |  |

### Theme 5: Introduction to Negative Numbers

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Add and subtract integers. | learning outcome 5 | Full | `number.integer-add` |  |
| Place whole numbers on a number line. | learning outcome 1 | Full | `number.number-line` | Lesson repaired 2026-11-11. |
| Understand integers as the counting numbers, zero and the negatives of the counting numbers. | learning outcome 2 | Partial | `number.integers` | Lesson repaired; no question asks what an integer is. |
| Compare two integers using a number line. | learning outcome 3 | Full | `number.integers` | Lesson repaired. |
| Put integers in ascending or descending order. | learning outcome 4 | Partial | `number.integers` | Lesson repaired; increasing order only. |

### Theme 6: Geometry

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Find angles in shapes and in the surroundings, by looking and by folding paper. | learning outcomes 1 and 4 | Partly | `geometry.angles-intro` | Paper folding is a hands-on activity outside OpenPath. |
| Spot right angles in objects and pictures. | learning outcome 5 | Full | `geometry.angles-intro` |  |
| Classify an angle as right, acute or obtuse. | learning outcomes 2 and 6 (the same skill, listed twice) | Full | `geometry.angles-intro` |  |
| Draw and trace acute, obtuse and right angles, and read the size of an angle. | learning outcome 7 and the key concept on angle measures | Partly | `geometry.angle-measure` | Reading an angle from a protractor is practised; a drawn angle needs a person to check it. |
| Recognise reflection symmetry and rotational symmetry in familiar 2-D shapes and letters. | learning outcomes 3 and 9 | Full | `geometry.rotational-symmetry`, `geometry.symmetry-lines` |  |
| Make cubes, cuboids, cylinders and cones from their nets. | learning outcome 10 | Partly | `geometry.nets` | Matching solids with nets is practised; folding a real net is a hands-on activity outside OpenPath. |
| Explore symmetry in familiar 3-D shapes. | learning outcome 8 | **Not covered** | — | No skill, lesson or question. |

### Theme 7: Measurement

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Relate larger and smaller units of length, weight, capacity, time and money, and convert both ways. | learning outcome 1 | Full | `measurement.length-conversion`, `measurement.money-decimals`, `measurement.time-unit-conversion`, `measurement.unit-conversions` |  |
| Estimate how much a solid or a container holds in a known unit, such as mugs in a bucket. | learning outcome 2 | Full | `measurement.capacity`, `measurement.volume-cubes` |  |
| Use the four operations in problems about money, length, mass, capacity and intervals of time. | learning outcome 3 | Full | `measurement.compute-with-measures`, `measurement.elapsed-time`, `measurement.money-decimals` |  |
| Say what the area and the perimeter of a simple shape are. | learning outcome 4 | Full | `measurement.area-squares`, `measurement.perimeter-intro` |  |
| Work out the area and the perimeter of simple shapes such as rectangles and squares. | learning outcome 5 | Full | `measurement.rectangle-area`, `measurement.rectangle-perimeter` |  |

### Theme 8: Introduction to Percentage

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Understand a percentage as a fraction with denominator 100. | learning outcome 1 | Full | `number.percent-intro` |  |
| Relate fractions, decimals and percentages to one another. | learning outcome 2 | Full | `number.percent-intro` |  |
| Show a percentage in a picture, such as a shaded hundred grid. | learning outcome 3 | Partly | `number.percent-intro` | Percentages are asked in figures; shaded-grid pictures are not part of the questions. |
| Change a fraction into a percentage and a percentage into a fraction. | learning outcome 4 | Full | `number.percent-intro`, `number.percentage` |  |
| Change a decimal into a percentage and a percentage into a decimal. | learning outcome 5 | Full | `number.percent-intro` |  |
| Solve simple word problems about percentages. | learning outcome 6 | Full | `number.percentage` |  |

### Theme 9: Data Handling

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Collect everyday data, record it in a table, show it in a bar graph and read a given bar graph. | learning outcome 1 | Partly | `statistics.bar-charts`, `statistics.scaled-bars`, `statistics.tables` | Collecting data and drawing a graph by hand are outside OpenPath. |
| Read a pie chart of the kind printed in newspapers and magazines. | learning outcome 2 (pie charts) | Full | `statistics.pie-charts` |  |
| Read a line graph of the kind printed in newspapers and magazines. | learning outcome 2 (line graphs) | **Not covered** | — | No skill, lesson or question. |

### Theme 10: Patterns

| Outcome (OpenPath's words) | Source line | Coverage | OpenPath skills | What is missing |
|---|---|---|---|---|
| Find the repeating unit of a pattern and continue the pattern. | learning outcome 1 | Full | `algebra.repeating-patterns` |  |
| Find the rule of a growing pattern and use it to continue the pattern. | learning outcome 2 | Full | `algebra.growing-patterns`, `algebra.pattern-rules` |  |
| Make a pattern that changes in more than one way at once, such as shape and colour. | learning outcome 3 | Partly | `algebra.repeating-patterns` | Continuing a pattern is practised; a pattern the learner invents needs a person to look at it. |
| See and describe the patterns in triangular numbers and square numbers. | learning outcome 4 | Full | `algebra.figurate-numbers` |  |

## 2026-11-12: the three gaps closed (release 1.3.0)

The three outcomes that had no skill now have one each, with OpenPath's own questions, lessons and pictures (nothing is taken
from a textbook): `MATH.number.roman-numerals` (families `akromr` read, `akromw` write as one of four options),
`MATH.geometry.symmetry-3d` (`aesym3`: mirror cuts of a cuboid or cube) and `MATH.statistics.line-graphs` (`adline`: read a
point, compare two, count the rises; new `linegraph` drawing). 62 skills, 77 outcomes (61 full, 16 partial), no gaps. All
1,560 released questions agree with independent references (`refs/icse_g5_2026_11.py`); the grading audit found no blocking
finding. Limits: Roman numerals are chosen, not typed (no free-text answer type); 3-D symmetry covers boxes only (not
cylinders, cones or spheres); line-graph points lie on scale lines. Earlier sections describe the state at release 1.2.0.
