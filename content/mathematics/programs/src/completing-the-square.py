# Authoring source for content/mathematics/programs/completing-the-square.v1.json (the JSON is what the app and the
# server read). Regenerate with: python3 content/mathematics/programs/src/completing-the-square.py content/mathematics/programs/completing-the-square.v1.json
# It checks that every question is used, every support and "revisit" target exists, and value counts match their fields.
import json, sys
Q = {}
def q(id, type, prompt, answer, solution, skill, difficulty=1, **kw):
    d = dict(id=id, type=type, difficulty=difficulty, skill=skill, prompt=prompt, answer=answer, solution=solution)
    for k, v in kw.items():
        if k == 'mis': d['misconceptions'] = [dict(when=m[0], says=m[1], **({'signal': m[2]} if len(m) > 2 else {})) for m in v]
        else: d[k] = v
    assert id not in Q, id
    Q[id] = d
    return id
ROOTS = ["x =", "or x ="]

# ---------------------------------------------------------------- stage 1: prerequisites
q("p1", "integer", "Predict before you see it: (x + 5)² = x² + 10x + ?", "25",
  "(x + 5)(x + 5) = x² + 5x + 5x + 25 = x² + 10x + 25. The last term is 5 × 5.", "expand-square",
  mis=[("5", "You wrote 5, but the last term is 5 × 5 = 25: the 5 in the first bracket multiplies the 5 in the second."),
       ("10", "10 is 2 × 5, the middle coefficient. The last term is 5² = 25.")])
q("d1", "choice", "(x − 6)² equals", "B",
  "(x − 6)(x − 6) = x² − 6x − 6x + 36 = x² − 12x + 36.", "expand-square",
  options=["x² − 36", "x² − 12x + 36", "x² − 12x − 36", "x² + 36"],
  mis=[("A", "Squaring a bracket is not squaring each term: you lost the middle term −12x. Try x = 10: (10 − 6)² = 16, but 10² − 36 = 64."),
       ("C", "The last term is (−6) × (−6) = +36: a negative times a negative is positive."),
       ("D", "This squares each term and drops the middle term −12x.")],
  support="ds1", revisit=dict(stage="prereq", section="P1"))
q("ds1", "integer", "Extra practice: (x + 7)² = x² + 14x + ?", "49",
  "(x + 7)² = x² + 2 × 7 × x + 7² = x² + 14x + 49.", "expand-square",
  mis=[("7", "The last term is 7² = 49, not 7."), ("14", "14 is the middle coefficient, 2 × 7. The last term is 7² = 49.")])
q("d2", "values", "Solve (x + 4)² = 25. Enter both solutions.", "-9,1",
  "x + 4 = 5 or x + 4 = −5, so x = 1 or x = −9.", "square-root", fields=ROOTS, unordered=True,
  mis=[("-1,9", "Check the subtraction: x + 4 = ±5 gives x = −4 + 5 = 1 and x = −4 − 5 = −9."),
       ("-5,5", "It is x + 4 that equals ±5, not x. Subtract 4 from both: x = 1 or x = −9."),
       ("1,1", "There are two solutions: x + 4 = 5 and x + 4 = −5.")],
  support="ds2", revisit=dict(stage="prereq", section="P2"))
q("ds2", "values", "Extra practice: solve (x − 3)² = 16.", "-1,7",
  "x − 3 = 4 or x − 3 = −4, so x = 7 or x = −1.", "square-root", fields=ROOTS, unordered=True,
  mis=[("-7,1", "x − 3 = ±4 means x = 3 ± 4: 7 and −1."), ("-4,4", "It is x − 3 that equals ±4. Add 3: x = 7 or x = −1.")])
q("d3", "choice", "Divide every term of 2x² + 8x − 10 = 0 by 2.", "B",
  "2x² ÷ 2 = x², 8x ÷ 2 = 4x, −10 ÷ 2 = −5, and 0 ÷ 2 = 0: x² + 4x − 5 = 0.", "divide-through",
  options=["x² + 8x − 10 = 0", "x² + 4x − 5 = 0", "x² + 4x − 10 = 0", "2x² + 4x − 5 = 0"],
  mis=[("A", "Only the x² term was divided. Every term must be divided by 2."),
       ("C", "−10 must be divided too: −10 ÷ 2 = −5."),
       ("D", "The x² term must be divided too: 2x² ÷ 2 = x².")],
  support="ds3", revisit=dict(stage="prereq", section="P3"))
q("ds3", "choice", "Extra practice: divide every term of 3x² − 12x + 9 = 0 by 3.", "A",
  "3x² ÷ 3 = x², −12x ÷ 3 = −4x, 9 ÷ 3 = 3: x² − 4x + 3 = 0.", "divide-through",
  options=["x² − 4x + 3 = 0", "x² − 12x + 9 = 0", "x² − 4x + 9 = 0", "3x² − 4x + 3 = 0"],
  mis=[("B", "Only the x² term was divided."), ("C", "9 ÷ 3 = 3: the constant is divided too."), ("D", "3x² ÷ 3 = x².")])

prereq = dict(id="prereq", title="Before we start", phase="teaching", kind="teach", sections=[
  dict(id="P1", title="Squaring a bracket", screens=[
    dict(title="What (x + 3)² means", text=["(x + 3)² means (x + 3) × (x + 3). Multiply every term in the first bracket by every term in the second:", "The two middle terms are the same, so they add up: 3x + 3x = 6x."],
         math=["(x + 3)(x + 3) = x² + 3x + 3x + 9", "= x² + 6x + 9"], mathAt=1),
    dict(title="Spot the pattern", text=["In (x + 3)² = x² + 6x + 9, the 6 is twice 3, and the 9 is 3 squared. Use that pattern to predict the next one before you see it."],
         predict="p1",
         reveal=dict(text=["In general:", "The middle coefficient is twice a, and the last term is a squared. This one pattern is the whole key to completing the square."], math=["(x + a)² = x² + 2ax + a²"], mathAt=1)),
    dict(title="With a minus sign", text=["(x − 4)² = (x − 4)(x − 4) = x² − 4x − 4x + 16. So:"], math=["(x − a)² = x² − 2ax + a²"],
         tip="The last term is always positive: (−4) × (−4) = +16."),
  ], check="d1", remediate=dict(screens=[
    dict(title="Why (x − 6)² is not x² − 36", text=["Test it with a number. Put x = 10:", "They are different, so (x − 6)² ≠ x² − 36. Expanding properly gives x² − 12x + 36, and with x = 10 that is 100 − 120 + 36 = 16 ✓."],
         math=["(10 − 6)² = 4² = 16", "10² − 36 = 64"], mathAt=1)], support="ds1")),
  dict(id="P2", title="Solving x² = k", screens=[
    dict(title="Two square roots", text=["x² = 9 has two solutions, 3 and −3, because 3² = 9 and (−3)² = 9. We write x = ±3."], tip="Forgetting the negative root loses half the answer. It is the most common slip in this chapter."),
    dict(title="A squared bracket", text=["(x − 2)² = 9 works the same way: the bracket x − 2 must be 3 or −3."], math=["x − 2 = 3  or  x − 2 = −3", "x = 5  or  x = −1"]),
    dict(title="When the number is not a perfect square", text=["(x + 1)² = 5 gives x + 1 = ±√5, so x = −1 ± √5. Leave √5 as it is: that is the exact answer."]),
    dict(title="When the number is negative", text=["(x + 1)² = −4 has no real solution, because a real number squared is never negative. (Complex roots come later in the chapter.)"]),
  ], check="d2", remediate=dict(screens=[
    dict(title="Undo the bracket in two steps", text=["Solve (x + 4)² = 25 slowly:", "First take the square root of both sides, keeping both signs. Then undo the + 4 by subtracting 4 from both sides."],
         math=["x + 4 = 5  or  x + 4 = −5", "x = 5 − 4 = 1  or  x = −5 − 4 = −9"], mathAt=1)], support="ds2")),
  dict(id="P3", title="Keeping an equation balanced", screens=[
    dict(title="Do the same to both sides", text=["An equation is a balance: both sides have the same value. You may add, subtract, multiply or divide (by a non-zero number), as long as you do it to the whole of both sides.", "Dividing an equation by 2 means dividing every term on both sides by 2."],
         math=["4x² − 8x = 12", "x² − 2x = 3   (every term ÷ 4)"]),
  ], check="d3", remediate=dict(screens=[
    dict(title="Every term, both sides", text=["2x² + 8x − 10 = 0 has three terms on the left and 0 on the right. Divide each of them by 2:"], math=["2x² ÷ 2 = x²", "8x ÷ 2 = 4x", "−10 ÷ 2 = −5", "0 ÷ 2 = 0"])], support="ds3")),
])

# ---------------------------------------------------------------- stage 2: the picture
q("e1", "integer", "When the 6 strips are split 3 and 3, a corner is missing. How many 1 × 1 unit tiles fill that corner?", "9",
  "The missing corner is 3 wide and 3 tall, so it holds 3 × 3 = 9 unit tiles.", "complete-term",
  mis=[("6", "6 is the number of strips. The corner is 3 wide and 3 tall: 3 × 3 = 9."), ("3", "The corner is 3 by 3, so it holds 3 × 3 = 9 tiles, not 3."),
       ("36", "That would be a 6-by-6 corner. Each side gets only 3 strips, so the corner is 3 by 3 = 9.")])
q("e2", "integer", "For x² + 10x, how many unit tiles complete the square?", "25",
  "Split the 10 strips 5 and 5. The corner is 5 by 5, so 25 tiles: x² + 10x + 25 = (x + 5)².", "complete-term",
  mis=[("10", "10 is the number of strips. Split them 5 and 5: the corner is 5 × 5 = 25."), ("100", "That squares 10. Half the strips go each way, so the corner is (10/2)² = 25."),
       ("5", "The corner is 5 by 5: 5 × 5 = 25 tiles.")], support="es1")
q("es1", "integer", "Extra practice: what do you add to x² + 12x to complete the square?", "36",
  "Half of 12 is 6, and 6² = 36: x² + 12x + 36 = (x + 6)².", "complete-term",
  mis=[("12", "12 is b. Add (12/2)² = 36."), ("144", "Halve first: (12/2)² = 36, not 12²."), ("6", "6 is half of 12; square it: 36.")])
q("e3", "choice", "For x² + bx, the number you add to complete the square is", "C",
  "Half of the b strips go on each side, so the missing corner is b/2 by b/2, with area (b/2)².", "complete-term",
  options=["b", "2b", "(b/2)²", "b²"],
  mis=[("A", "For x² + 6x that would be 6, but the corner needed 9. Count the corner: it is b/2 by b/2."), ("B", "For x² + 6x that would be 12, but the corner needed 9."),
       ("D", "b² is a b-by-b corner. Only half of the strips go on each side, so the corner is (b/2) by (b/2).")], revisit=dict(stage="picture", section="S2"))
q("e4", "fraction", "What do you add to x² + 5x to complete the square? (Use / for a fraction, for example 7/4.)", "25/4",
  "Half of 5 is 5/2, and (5/2)² = 25/4: x² + 5x + 25/4 = (x + 5/2)².", "complete-term-fraction",
  mis=[("25/2", "Square the whole fraction: (5/2)² = 25/4. The denominator is squared too."), ("5/2", "Half of 5 is 5/2; you still need to square it: 25/4."),
       ("25", "That squares 5 without halving first: (5/2)² = 25/4.")], support="es2")
q("e5", "values", "x² − 8x + ▢ = (x − n)². Enter the number you add, and n.", "16,4",
  "Halve −8: −4. Square it: 16. So x² − 8x + 16 = (x − 4)², and n = 4.", "complete-term-negative", fields=["add", "n"],
  mis=[("16,-4", "The bracket is (x − 4)², so n = 4. (x − (−4))² would be (x + 4)²."), ("-16,4", "(−4)² = +16: the number you add is always positive."),
       ("64,8", "Halve −8 first (−4), then square it: 16."), ("-16,-4", "(−4)² = +16, and the bracket is (x − 4)², so n = 4.")])
q("e6", "values", "Write x² + 8x + 3 in the form (x + p)² + q.", "4,-13",
  "x² + 8x + 3 = x² + 8x + 16 − 16 + 3 = (x + 4)² − 13. So p = 4 and q = −13.", "vertex-form", fields=["p", "q"],
  mis=[("4,3", "You made (x + 4)² by adding 16, but did not take the 16 away again: 3 − 16 = −13."), ("4,19", "You added 16 instead of subtracting it: 3 − 16 = −13."),
       ("8,-61", "p is half of 8, which is 4."), ("-4,-13", "x² + 8x has +8, so the bracket is (x + 4)²: p = 4.")], support="es3", revisit=dict(stage="picture", section="S3"))
q("es2", "fraction", "Extra practice: what do you add to x² + 3x to complete the square?", "9/4",
  "Half of 3 is 3/2, and (3/2)² = 9/4.", "complete-term-fraction", mis=[("9/2", "(3/2)² = 9/4: square the denominator too."), ("3/2", "Square the half: 9/4."), ("9", "Halve first: (3/2)² = 9/4.")])
q("es3", "values", "Extra practice: write x² − 6x + 1 in the form (x + p)² + q.", "-3,-8",
  "x² − 6x + 1 = (x − 3)² − 9 + 1 = (x − 3)² − 8.", "vertex-form", fields=["p", "q"],
  mis=[("3,-8", "x² − 6x gives (x − 3)², so p = −3."), ("-3,10", "Subtract the 9 you added: 1 − 9 = −8."), ("-3,1", "Take away the 9 you added: 1 − 9 = −8.")])

picture = dict(id="picture", title="See it: why it is called completing the square", phase="teaching", kind="teach", sections=[
  dict(id="S1", title="A perfect square is a square", screens=[
    dict(title="(x + 3)² as an area", text=["(x + 3)² is the area of a square with side x + 3. Cut each side into x and 3, and the square splits into four pieces:", "One x² square, two x-by-3 rectangles (3x each, 6x in all), and a 3-by-3 corner of 9 unit tiles: x² + 6x + 9."],
         widget=dict(type="tiles", b=6, mode="show")),
    dict(title="Now the corner is missing", text=["Start with only x² + 6x: one x² square and 6 strips, each x long and 1 wide. Move strips to the right side or the bottom and try to make a square."],
         widget=dict(type="tiles", b=6, mode="split"), predict="e1",
         reveal=dict(text=["Adding 9 completes the square:", "That is all “completing the square” means: adding the missing corner."], math=["x² + 6x + 9 = (x + 3)²"], mathAt=1)),
    dict(title="Build it yourself", text=["Split the strips evenly, then add unit tiles until the shape is a complete square. Watch the algebra underneath change as you go."], widget=dict(type="tiles", b=6, mode="build")),
  ]),
  dict(id="S2", title="What do you add, in general?", screens=[
    dict(title="Change the number of strips", text=["Try x² + 4x, x² + 8x and x² + 10x. Each time, split the strips evenly and count the tiles in the corner."], widget=dict(type="tiles", b=4, mode="build", choose=True)),
    dict(title="Predict", text=["Without building it, predict the corner for x² + 10x."], predict="e2", reveal=dict(text=["10 strips split 5 and 5, so the corner is 5 by 5:"], math=["x² + 10x + 25 = (x + 5)²"])),
    dict(title="The rule", text=["Now for any x² + bx."], predict="e3",
         reveal=dict(text=["Half of the b strips go on each side, so the corner is b/2 by b/2. Its area is (b/2)²:"], math=["x² + bx + (b/2)² = (x + b/2)²"], tip="Say it as: halve the coefficient of x, then square it.")),
    dict(title="Why halve? The algebra agrees", text=["Compare with the pattern from the start: (x + a)² = x² + 2ax + a². To match x² + bx we need 2a = b, so a = b/2, and the last term must be a² = (b/2)².", "The picture and the algebra give the same answer, and the algebra still works when tiles cannot be drawn (fractions and negatives, next)."]),
  ], remediate=dict(screens=[
    dict(title="Count the corner again", text=["Look at x² + 6x again: 3 strips on the right and 3 on the bottom. The gap in the corner is 3 tiles wide and 3 tiles tall, so 3 × 3 = 9. With b strips, each side gets b/2, so the corner is (b/2) × (b/2)."], widget=dict(type="tiles", b=6, mode="build"))], support="es1")),
  dict(id="S3", title="Fractions, negatives and expressions", screens=[
    dict(title="An odd coefficient", text=["Tiles cannot be cut in half on screen, but the algebra works the same way. Predict first."], predict="e4",
         reveal=dict(text=["Half of 5 is 5/2:"], math=["x² + 5x + (5/2)² = (x + 5/2)²", "(5/2)² = 25/4"])),
    dict(title="A negative coefficient", text=["Now x² − 8x. Halving −8 gives −4."], predict="e5",
         reveal=dict(text=["(x − 4)² = x² − 8x + 16. The sign goes into the bracket; the number you add is positive, because it is a square."])),
    dict(title="Completing the square in an expression", text=["To rewrite x² + 6x + 5, add the missing 9 and take it away again, so the value does not change:"],
         math=["x² + 6x + 5 = x² + 6x + 9 − 9 + 5", "= (x + 3)² − 4"], tip="In an expression, add and take away the same number. In an equation, add it to both sides (next stage)."),
  ], check="e6", remediate=dict(screens=[
    dict(title="Add it, then take it away", text=["(x + 4)² = x² + 8x + 16. That has 16 where x² + 8x + 3 has 3. So x² + 8x + 3 is 13 less than (x + 4)²:"], math=["x² + 8x + 3 = (x + 4)² − 16 + 3 = (x + 4)² − 13"])], support="es3")),
])

# ---------------------------------------------------------------- stage 3: worked examples (basic, then intermediate)
q("w1", "choice", "x² + 6x = −5. What do you add to both sides?", "B", "Add (6/2)² = 9 to both sides: the left side becomes (x + 3)².", "complete-term",
  options=["6", "9", "36", "3"], mis=[("A", "6 is b. The missing corner is (6/2)² = 9."), ("C", "36 is 6². Halve first: (6/2)² = 9."), ("D", "3 is half of 6; you still square it: 9.")])
q("w2", "choice", "x² − 8x = −3. Which line comes next?", "A", "Add (−8/2)² = 16 to both sides.", "balance",
  options=["x² − 8x + 16 = −3 + 16", "x² − 8x + 16 = −3", "x² − 8x − 16 = −3 − 16", "x² − 8x + 64 = −3 + 64"],
  mis=[("B", "16 must be added to the right side too, or the equation is no longer true."), ("C", "(−4)² = +16: add 16, not −16."), ("D", "Halve −8 first: (−8/2)² = 16, not 64.")])
q("w3", "fraction", "x² + 3x = 1. What do you add to both sides?", "9/4", "Half of 3 is 3/2, and (3/2)² = 9/4.", "complete-term-fraction",
  mis=[("3/2", "Square the half: (3/2)² = 9/4."), ("9/2", "(3/2)² = 9/4: square the denominator too."), ("9", "Halve 3 first: (3/2)² = 9/4.")])
q("w4", "choice", "2x² + 12x − 5 = 0. What is the best first step?", "A", "Divide every term by 2, so the x² coefficient is 1.", "divide-through",
  options=["Divide every term by 2", "Add 36 to both sides", "Move −5 across, then add (12/2)²", "Take square roots"],
  mis=[("B", "Completing the square needs x² with coefficient 1 first: (x + 3)² gives x², not 2x²."), ("C", "With 2x² on the left, adding 36 does not make a perfect square. Divide by 2 first."), ("D", "There is no square to take the root of yet.")])
q("w5", "choice", "−x² + 4x + 1 = 0. What is the best first step?", "A", "Divide every term by −1, giving x² − 4x − 1 = 0.", "divide-through",
  options=["Divide every term by −1", "Add 4 to both sides", "Divide only the x² term by −1", "Take square roots"],
  mis=[("B", "First make the x² coefficient +1. With −x², adding 4 does not complete a square."), ("C", "Dividing only one term changes the equation. Every term must be divided by −1."), ("D", "There is no square yet.")])
q("w6", "fraction", "x² − (2/3)x = 1/3. What do you add to both sides?", "1/9", "Half of −2/3 is −1/3, and (−1/3)² = 1/9.", "complete-term-fraction",
  mis=[("4/9", "Halve −2/3 first: −1/3. Then square it: 1/9."), ("1/3", "Half of 2/3 is 1/3; square it: 1/9."), ("-1/9", "A square is never negative: (−1/3)² = +1/9.")])

worked = dict(id="worked", title="Worked examples", phase="worked", kind="worked", examples=[
  dict(id="W1", title="Basic: a monic quadratic", problem="Solve x² + 6x + 5 = 0.", steps=[
    dict(text="Move the constant to the right.", math=["x² + 6x = −5"], why="We want x² + bx alone on the left, so that we can complete the square there."),
    dict(text="Add (6/2)² = 9 to both sides.", math=["x² + 6x + 9 = −5 + 9"], why="Adding the same number to both sides keeps the equation true.", predict="w1"),
    dict(text="Write the left side as a square.", math=["(x + 3)² = 4"], why="x² + 6x + 9 is exactly (x + 3)²: the completed square."),
    dict(text="Take square roots, both of them.", math=["x + 3 = 2  or  x + 3 = −2"], why="Both 2² and (−2)² are 4."),
    dict(text="Solve each and check.", math=["x = −1  or  x = −5"], why="Check x = −1: 1 − 6 + 5 = 0 ✓. (This one also factorises as (x + 1)(x + 5); completing the square works even when factorising does not.)"),
  ]),
  dict(id="W2", title="Basic: a negative b and irrational roots", problem="Solve x² − 8x + 3 = 0.", steps=[
    dict(text="Move the constant across.", math=["x² − 8x = −3"]),
    dict(text="Add (−8/2)² = 16 to both sides.", math=["x² − 8x + 16 = −3 + 16"], predict="w2", why="Halve −8 to get −4; square it to get +16."),
    dict(text="Complete the square.", math=["(x − 4)² = 13"]),
    dict(text="Square-root both sides.", math=["x − 4 = ±√13"], why="13 is not a perfect square, so keep the exact root."),
    dict(text="Solve.", math=["x = 4 ± √13"], why="Two irrational roots, a conjugate pair. No integer factorisation exists here."),
  ]),
  dict(id="W3", title="Intermediate: an odd coefficient", problem="Solve x² + 3x − 1 = 0.", steps=[
    dict(text="Move the constant across.", math=["x² + 3x = 1"]),
    dict(text="Add (3/2)² = 9/4 to both sides.", math=["x² + 3x + 9/4 = 1 + 9/4"], predict="w3", why="Fractions are fine: the rule is the same."),
    dict(text="Complete the square and add the fractions.", math=["(x + 3/2)² = 13/4"], why="1 = 4/4, and 4/4 + 9/4 = 13/4."),
    dict(text="Square-root both sides.", math=["x + 3/2 = ±√13 / 2"], why="√(13/4) = √13 / √4 = √13 / 2."),
    dict(text="Solve.", math=["x = (−3 ± √13) / 2"]),
  ]),
  dict(id="W4", title="Intermediate: a leading coefficient that is not 1", problem="Solve 2x² + 12x − 5 = 0.", steps=[
    dict(text="Divide every term by 2.", math=["x² + 6x − 5/2 = 0"], predict="w4", why="The pattern x² + bx + (b/2)² needs the x² coefficient to be 1. Dividing by 2 does not change the roots."),
    dict(text="Move the constant across.", math=["x² + 6x = 5/2"]),
    dict(text="Add 9 to both sides.", math=["x² + 6x + 9 = 5/2 + 9 = 23/2"]),
    dict(text="Complete the square.", math=["(x + 3)² = 23/2"]),
    dict(text="Solve.", math=["x = −3 ± √(23/2) = (−6 ± √46) / 2"], why="√(23/2) = √46 / 2 (multiply top and bottom inside the root by 2)."),
  ]),
  dict(id="W5", title="Intermediate: a negative leading coefficient", problem="Solve −x² + 4x + 1 = 0.", steps=[
    dict(text="Divide every term by −1.", math=["x² − 4x − 1 = 0"], predict="w5", why="Dividing every term by −1 flips every sign."),
    dict(text="Move the constant across and add (−4/2)² = 4.", math=["x² − 4x + 4 = 1 + 4"]),
    dict(text="Complete the square.", math=["(x − 2)² = 5"]),
    dict(text="Solve.", math=["x = 2 ± √5"]),
  ]),
  dict(id="W6", title="Intermediate: fractions throughout", problem="Solve 3x² − 2x − 1 = 0.", steps=[
    dict(text="Divide every term by 3 and move the constant.", math=["x² − (2/3)x = 1/3"]),
    dict(text="Add (−1/3)² = 1/9 to both sides.", math=["x² − (2/3)x + 1/9 = 1/3 + 1/9"], predict="w6"),
    dict(text="Complete the square.", math=["(x − 1/3)² = 4/9"], why="1/3 = 3/9, and 3/9 + 1/9 = 4/9."),
    dict(text="Square-root and solve.", math=["x − 1/3 = ±2/3", "x = 1  or  x = −1/3"], why="Check x = 1: 3 − 2 − 1 = 0 ✓. Rational roots: this one also factorises as (3x + 1)(x − 1)."),
  ]),
])

# ---------------------------------------------------------------- stage 4: the quadratic formula, derived
q("f1", "choice", "x² + (b/a)x = −c/a. What do you add to both sides?", "C", "Half of b/a is b/2a; square it: (b/2a)² = b²/4a².", "derivation",
  options=["(b/a)²", "b/2a", "(b/2a)²", "b²/4"], mis=[("A", "Halve first: half of b/a is b/2a."), ("B", "That is half the coefficient; now square it."), ("D", "The coefficient of x is b/a, not b: (b/2a)² = b²/4a².")])
q("f2", "choice", "Write b²/4a² − c/a over the common denominator 4a².", "A", "c/a = 4ac/4a² (multiply top and bottom by 4a), so the right side is (b² − 4ac)/4a².", "derivation",
  options=["(b² − 4ac) / 4a²", "(b² − c) / 4a²", "(b² − 4ac) / 2a", "(b² + 4ac) / 4a²"],
  mis=[("B", "c/a must become 4ac/4a²: multiply top and bottom by 4a."), ("C", "The denominator is still 4a². The 2a appears after taking the square root."), ("D", "It is minus c/a, so minus 4ac.")])
q("f3", "choice", "What does the derivation show when b² − 4ac < 0?", "B", "(x + b/2a)² would equal a negative number, which no real x can do. So there are no real roots.", "derivation",
  options=["The formula is wrong", "(x + b/2a)² would equal a negative number, so there is no real x", "Both roots are 0", "a must be negative"],
  mis=[("A", "The algebra is still right; it just has no real solution."), ("C", "Roots of 0 would need c = 0, which has nothing to do with the sign of b² − 4ac."), ("D", "The sign of a is not what decides it.")])
q("f4", "values", "Use the formula on x² − 4x + 1 = 0 and write the roots as p ± √q.", "2,3", "x = (4 ± √(16 − 4)) / 2 = (4 ± √12) / 2 = (4 ± 2√3) / 2 = 2 ± √3.", "formula", fields=["p", "q"],
  mis=[("-2,3", "−b = −(−4) = +4, so p = 4 / 2 = 2."), ("2,12", "√12 = 2√3, and dividing by 2a = 2 leaves √3: q = 3."), ("4,12", "Divide by 2a = 2: (4 ± √12) / 2 = 2 ± √3.")])
formula = dict(id="formula", title="Why the quadratic formula is true", phase="worked", kind="worked", examples=[
  dict(id="F", title="Completing the square, once, for every quadratic", problem="Solve ax² + bx + c = 0 (a ≠ 0) with the same steps as before, using letters.", steps=[
    dict(text="Divide every term by a.", math=["x² + (b/a)x + c/a = 0"], why="Exactly as for 2x² + 12x − 5 = 0: the x² coefficient must be 1. This is allowed because a ≠ 0."),
    dict(text="Move c/a to the right.", math=["x² + (b/a)x = −c/a"]),
    dict(text="Add (b/2a)² to both sides.", math=["x² + (b/a)x + (b/2a)² = −c/a + b²/4a²"], predict="f1", why="Halve the coefficient of x, then square it: the same rule as x² + 6x + 9."),
    dict(text="The left side is now a perfect square.", math=["(x + b/2a)² = b²/4a² − c/a"]),
    dict(text="Put the right side over one denominator.", math=["(x + b/2a)² = (b² − 4ac) / 4a²"], predict="f2"),
    dict(text="Square-root both sides.", math=["x + b/2a = ±√(b² − 4ac) / 2a"], why="√(4a²) = 2|a|, and the ± already covers both signs, so we can write 2a."),
    dict(text="Subtract b/2a.", math=["x = (−b ± √(b² − 4ac)) / 2a"], why="This is the quadratic formula. It is completing the square, done once for every quadratic."),
    dict(text="What b² − 4ac tells you.", math=["D = b² − 4ac"], predict="f3", why="That is why the discriminant decides the nature of the roots: D > 0 two real roots, D = 0 one repeated root, D < 0 none that are real."),
  ]),
], check="f4")

# ---------------------------------------------------------------- stage 5: guided practice (hints)
def solve(id, prompt, answer, solution, skill, support, hint, mis=(), difficulty=1, fields=ROOTS, unordered=True, revisit=None):
    kw = dict(fields=fields, hint=hint, support=support, mis=list(mis))
    if unordered: kw['unordered'] = True
    if revisit: kw['revisit'] = revisit
    return q(id, "values", prompt, answer, solution, skill, difficulty, **kw)
RV_TERM = dict(stage="picture", section="S2"); RV_NEG = dict(stage="picture", section="S3"); RV_DIV = dict(stage="worked", section="W4"); RV_BAL = dict(stage="worked", section="W1")
solve("g1", "Solve x² + 4x − 5 = 0 by completing the square.", "-5,1", "x² + 4x = 5. Add 4: (x + 2)² = 9. So x + 2 = ±3, giving x = 1 or x = −5.", "solve-monic", "gs1",
      "Move −5 across, then add (4/2)² = 4 to both sides.", [("-1,5", "Check the signs: x + 2 = 3 gives x = 1, and x + 2 = −3 gives x = −5."), ("-3,3", "It is x + 2 that equals ±3. Subtract 2: x = 1 or x = −5.")], revisit=RV_BAL)
solve("g2", "x² − 10x + 7 = 0 has roots p ± √q. Find p and q.", "5,18", "x² − 10x = −7. Add 25: (x − 5)² = 18, so x = 5 ± √18 (that is, 5 ± 3√2).", "solve-negative", "gs2",
      "Move 7 across (it becomes −7), then add (−10/2)² = 25.", [("-5,18", "The bracket is (x − 5)², so x = 5 ± √18: p = 5."), ("5,32", "7 moves across as −7: −7 + 25 = 18."), ("5,7", "Move 7 across and add 25 to both sides: q = −7 + 25 = 18.")], fields=["p", "q"], unordered=False, revisit=RV_NEG)
solve("g3", "Solve x² + 7x + 10 = 0 by completing the square.", "-5,-2", "x² + 7x = −10. Add 49/4: (x + 7/2)² = −40/4 + 49/4 = 9/4. So x + 7/2 = ±3/2: x = −2 or x = −5.", "solve-odd", "gs3",
      "Add (7/2)² = 49/4 to both sides, and write −10 as −40/4.", [("2,5", "x + 7/2 = ±3/2 gives x = −7/2 ± 3/2: −2 and −5 (both negative).")], revisit=RV_TERM)
solve("g4", "Solve 2x² − 8x − 10 = 0 by completing the square.", "-1,5", "Divide by 2: x² − 4x − 5 = 0. x² − 4x = 5, add 4: (x − 2)² = 9. So x = 2 ± 3: 5 or −1.", "solve-nonunit", "gs4",
      "Divide every term by 2 first.", [("-5,1", "(x − 2)² = 9 gives x = 2 ± 3: 5 and −1."), ("-1,9", "After dividing by 2, the constant is −5, not −10: x² − 4x = 5.")], revisit=RV_DIV)
q("g5", "values", "Write 2x² + 12x + 7 in the form a(x + p)² + q.", "2,3,-11", "2x² + 12x + 7 = 2(x² + 6x) + 7 = 2[(x + 3)² − 9] + 7 = 2(x + 3)² − 18 + 7 = 2(x + 3)² − 11.", "vertex-form", 2,
  fields=["a", "p", "q"], hint="Take 2 out of the first two terms: 2(x² + 6x) + 7. Complete the square inside the bracket.", support="gs5", revisit=RV_NEG,
  mis=[("2,3,-2", "The 9 you subtracted is inside the bracket, so it is multiplied by 2: 7 − 18 = −11."), ("2,3,16", "You added 9 instead of subtracting it: 2[(x + 3)² − 9] + 7."), ("2,6,-11", "Inside the bracket it is x² + 6x, so p is half of 6: 3."), ("1,3,-11", "a is the 2 you took out: 2(x + 3)² − 11.")])
solve("g6", "Solve −x² + 6x − 5 = 0 by completing the square.", "1,5", "Divide by −1: x² − 6x + 5 = 0. x² − 6x = −5, add 9: (x − 3)² = 4. So x = 3 ± 2: 1 or 5.", "solve-negative-a", "gs6",
      "Divide every term by −1 first: every sign flips.", [("-5,-1", "Dividing by −1 gives x² − 6x + 5 = 0, so (x − 3)² = 4 and x = 3 ± 2: 1 and 5.")], revisit=dict(stage="worked", section="W5"))
solve("g7", "Solve x² + (1/2)x − 3/16 = 0 by completing the square.", "-3/4,1/4", "x² + (1/2)x = 3/16. Add (1/4)² = 1/16: (x + 1/4)² = 4/16 = 1/4. So x + 1/4 = ±1/2: x = 1/4 or x = −3/4.", "solve-fractions", "gs7",
      "Half of 1/2 is 1/4. Add (1/4)² = 1/16 to both sides.", [("-1/4,3/4", "x + 1/4 = ±1/2 gives x = −1/4 ± 1/2: 1/4 and −3/4.")], difficulty=2, revisit=dict(stage="worked", section="W6"))
q("g8", "integer", "Complete the square for x² + 2x + 5 = 0. In (x + 1)² = k, what is k?", "-4", "x² + 2x = −5. Add 1: (x + 1)² = −4. A real square cannot be negative, so there are no real roots (the roots are −1 ± 2i).", "no-real-roots",
  hint="Move 5 across (it becomes −5), then add 1.", support="gs8", revisit=dict(stage="formula", section="F"),
  mis=[("6", "5 moves across as −5: −5 + 1 = −4."), ("4", "−5 + 1 = −4, not 4."), ("-6", "Add 1 to both sides: −5 + 1 = −4.")])
# supports (one similar question per skill)
solve("gs1", "Extra practice: solve x² + 2x − 8 = 0.", "-4,2", "x² + 2x = 8. Add 1: (x + 1)² = 9, so x = −1 ± 3: 2 or −4.", "solve-monic", None, "Add (2/2)² = 1 to both sides.", [("-2,4", "x + 1 = ±3 gives x = −1 ± 3: 2 and −4.")])
solve("gs2", "Extra practice: x² − 6x + 2 = 0 has roots p ± √q. Find p and q.", "3,7", "x² − 6x = −2. Add 9: (x − 3)² = 7, so x = 3 ± √7.", "solve-negative", None, "Add (−6/2)² = 9 to both sides.", [("-3,7", "The bracket is (x − 3)², so p = 3."), ("3,11", "2 moves across as −2: −2 + 9 = 7.")], fields=["p", "q"], unordered=False)
solve("gs3", "Extra practice: solve x² + 5x + 4 = 0.", "-4,-1", "x² + 5x = −4. Add 25/4: (x + 5/2)² = 9/4, so x = −5/2 ± 3/2: −1 or −4.", "solve-odd", None, "Add (5/2)² = 25/4; −4 = −16/4.", [("1,4", "x = −5/2 ± 3/2 gives −1 and −4: both negative.")])
solve("gs4", "Extra practice: solve 3x² + 6x − 9 = 0.", "-3,1", "Divide by 3: x² + 2x − 3 = 0. Add 1: (x + 1)² = 4, so x = 1 or −3.", "solve-nonunit", None, "Divide every term by 3 first.", [("-1,3", "(x + 1)² = 4 gives x = −1 ± 2: 1 and −3.")])
q("gs5", "values", "Extra practice: write 3x² − 6x + 1 in the form a(x + p)² + q.", "3,-1,-2", "3(x² − 2x) + 1 = 3[(x − 1)² − 1] + 1 = 3(x − 1)² − 2.", "vertex-form", 2, fields=["a", "p", "q"], hint="Take 3 out of the first two terms.",
  mis=[("3,-1,0", "The 1 you subtract inside is multiplied by 3: 1 − 3 = −2."), ("3,1,-2", "x² − 2x gives (x − 1)², so p = −1.")])
solve("gs6", "Extra practice: solve −x² − 2x + 3 = 0.", "-3,1", "Divide by −1: x² + 2x − 3 = 0. Add 1: (x + 1)² = 4, so x = 1 or −3.", "solve-negative-a", None, "Divide every term by −1 first.", [("-1,3", "x² + 2x − 3 = 0 gives (x + 1)² = 4, so x = −1 ± 2: 1 and −3.")])
solve("gs7", "Extra practice: solve x² − (2/3)x − 1/3 = 0.", "-1/3,1", "x² − (2/3)x = 1/3. Add 1/9: (x − 1/3)² = 4/9, so x = 1/3 ± 2/3: 1 or −1/3.", "solve-fractions", None, "Add (1/3)² = 1/9.", [("-1,1/3", "x − 1/3 = ±2/3 gives x = 1/3 ± 2/3: 1 and −1/3.")])
q("gs8", "integer", "Extra practice: in x² − 4x + 7 = 0, completing the square gives (x − 2)² = k. Find k.", "-3", "x² − 4x = −7. Add 4: (x − 2)² = −3. No real roots.", "no-real-roots",
  hint="−7 + 4.", mis=[("11", "7 moves across as −7: −7 + 4 = −3."), ("3", "−7 + 4 = −3.")])
guided = dict(id="guided", title="Guided practice", phase="guided", kind="questions", hints=True, questions=["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"])

# ---------------------------------------------------------------- stage 6: independent practice (no hints)
solve("i1", "Solve x² + 8x + 12 = 0 by completing the square.", "-6,-2", "x² + 8x = −12. Add 16: (x + 4)² = 4, so x = −4 ± 2: −2 or −6.", "solve-monic", "gs1", None, [("2,6", "x = −4 ± 2 gives −2 and −6: both negative.")], revisit=RV_BAL)
solve("i2", "x² − 2x − 4 = 0 has roots p ± √q. Find p and q.", "1,5", "x² − 2x = 4. Add 1: (x − 1)² = 5, so x = 1 ± √5.", "solve-negative", "gs2", None, [("-1,5", "The bracket is (x − 1)², so p = 1."), ("1,3", "−4 moves across as +4: 4 + 1 = 5.")], fields=["p", "q"], unordered=False, revisit=RV_NEG)
solve("i3", "Solve x² + 9x + 14 = 0 by completing the square.", "-7,-2", "x² + 9x = −14. Add 81/4: (x + 9/2)² = −56/4 + 81/4 = 25/4, so x = −9/2 ± 5/2: −2 or −7.", "solve-odd", "gs3", None, [("2,7", "x = −9/2 ± 5/2 gives −2 and −7: both negative.")], difficulty=2, revisit=RV_TERM)
solve("i4", "Solve 3x² − 12x + 9 = 0 by completing the square.", "1,3", "Divide by 3: x² − 4x + 3 = 0. x² − 4x = −3, add 4: (x − 2)² = 1, so x = 1 or 3.", "solve-nonunit", "gs4", None, [("-3,-1", "x² − 4x gives (x − 2)², so x = 2 ± 1: 1 and 3.")], revisit=RV_DIV)
q("i5", "values", "Write x² − 5x + 2 in the form (x + p)² + q.", "-5/2,-17/4", "x² − 5x + 2 = (x − 5/2)² − 25/4 + 2 = (x − 5/2)² − 17/4.", "vertex-form", 2, fields=["p", "q"], support="es3", revisit=RV_NEG,
  mis=[("-5/2,33/4", "Subtract (5/2)² = 25/4, do not add it: 2 − 25/4 = −17/4."), ("5/2,-17/4", "x² − 5x gives (x − 5/2)², so p = −5/2."), ("-5/2,-23/4", "2 = 8/4, so 8/4 − 25/4 = −17/4.")])
solve("i6", "Solve 4x² + 4x − 3 = 0 by completing the square.", "-3/2,1/2", "Divide by 4: x² + x = 3/4. Add 1/4: (x + 1/2)² = 1, so x = −1/2 ± 1: 1/2 or −3/2.", "solve-fractions", "gs7", None, [("-1/2,3/2", "x = −1/2 ± 1 gives 1/2 and −3/2.")], difficulty=2, revisit=RV_DIV)
independent = dict(id="independent", title="On your own", phase="independent", kind="questions", hints=False, questions=["i1", "i2", "i3", "i4", "i5", "i6"])

# ---------------------------------------------------------------- stage 7: application, comparison and error analysis
q("a1", "choice", "Which method is quickest for x² − 7x + 12 = 0?", "A", "3 × 4 = 12 and 3 + 4 = 7 are easy to spot, so factorising, (x − 3)(x − 4) = 0, is quickest. The other methods also work.", "method-choice",
  options=["Factorisation: (x − 3)(x − 4) = 0", "Completing the square", "The quadratic formula", "They all take exactly the same work"],
  mis=[("B", "Completing the square works, but here two integers (3 and 4) with product 12 and sum 7 are easy to spot."), ("C", "The formula works, but factorising is quicker when the factors are easy to see."), ("D", "They give the same roots, but not with the same work.")])
q("a2", "choice", "Which method works for every quadratic equation?", "B", "Completing the square always works (the quadratic formula is completing the square done in general). Integer factorisation does not always exist.", "method-choice",
  options=["Factorisation with integers", "Completing the square", "Guess and check", "Taking square roots straight away"],
  mis=[("A", "x² − 2x − 1 = 0 has roots 1 ± √2: there is no integer factorisation."), ("C", "Irrational roots such as 1 ± √2 cannot be found by guessing."), ("D", "That works only when there is no x term, like x² = 9.")])
solve("a3", "Solve x² + 14x + 40 = 0 by any method.", "-10,-4", "Factorising: (x + 4)(x + 10) = 0. Or completing the square: (x + 7)² = 9, x = −7 ± 3. Either way x = −4 or x = −10.", "solve-monic", "gs1", None, [("4,10", "Both roots are negative: (x + 4)(x + 10) = 0 gives x = −4 or x = −10.")])
q("a4", "choice", "Find the mistake. Riya solves x² + 6x − 7 = 0:\n① x² + 6x = 7\n② x² + 6x + 9 = 7\n③ (x + 3)² = 7\n④ x = −3 ± √7\nWhich line is wrong first?", "B",
  "In line ② the 9 was added to the left side only. Adding it to both sides gives (x + 3)² = 16, so x = 1 or x = −7.", "error-balance",
  options=["Line ①: it should be −7", "Line ②: 9 was added to the left side only", "Line ③: (x + 3)² is x² + 6x + 3", "Line ④: the root should be √3"],
  mis=[("A", "Moving −7 across gives +7, so ① is right."), ("C", "(x + 3)² = x² + 6x + 9, so ③ follows from ②. The problem is earlier."), ("D", "④ follows from ③; the mistake is in ②.")], revisit=dict(stage="apply", section="intro"))
q("a5", "choice", "Find the mistake. Arjun solves 2x² + 8x − 10 = 0:\n① 2x² + 8x = 10\n② x² + 4x = 10\n③ (x + 2)² = 14\n④ x = −2 ± √14\nWhich line is wrong first?", "B",
  "In line ② the 10 was not divided by 2. Correctly: x² + 4x = 5, (x + 2)² = 9, so x = 1 or x = −5.", "error-divide",
  options=["Line ①", "Line ②: 10 was not divided by 2", "Line ③: he should add 16", "Line ④"],
  mis=[("A", "Moving −10 across gives +10, so ① is right."), ("C", "After dividing by 2 the x coefficient is 4, so 4 is the right number to add. The mistake is earlier."), ("D", "④ follows from ③. The mistake is in ②.")])
q("a6", "choice", "Find the mistake. Meera writes x² − 10x + 3 = (x + 5)² − 22. What went wrong?", "B",
  "(x + 5)² = x² + 10x + 25 has +10x. The correct bracket is (x − 5)²: x² − 10x + 3 = (x − 5)² − 22.", "error-sign",
  options=["She should have added 100", "The bracket should be (x − 5)²", "−25 + 3 is −28", "Nothing: it is correct"],
  mis=[("A", "Halve −10 first: (−5)² = 25, so 25 is right."), ("C", "−25 + 3 = −22, so −22 is right."), ("D", "Expand (x + 5)²: x² + 10x + 25. The sign of the x term is wrong.")])
apply = dict(id="apply", title="Choose a method, find the mistake", phase="application", kind="questions", hints=False,
  intro=dict(id="intro", screens=[
    dict(title="Which method?", text=["Factorisation is fastest when two integers with the right product and sum are easy to spot. Completing the square always works, and it shows the turning point of the graph. The formula is completing the square done once in general: use it when the numbers are awkward."]),
    dict(title="Mistake 1: adding to one side only", text=["x² + 6x = −5 is true when x = −1. Try adding 9 to one side only, then to both sides, and test x = −1 each time."], widget=dict(type="balance")),
    dict(title="Mistakes 2 and 3: signs and dividing", text=["Signs: (x − 4)² = x² − 8x + 16. Halving −8 gives −4 (that sign goes in the bracket), and the number you add, 16, is positive.", "Dividing: when the x² coefficient is not 1, divide every term on both sides, including the constant."]),
  ]), questions=["a1", "a2", "a3", "a4", "a5", "a6"])

# ---------------------------------------------------------------- stage 8: transfer (structures not seen in the examples)
q("t1", "integer", "Find the smallest value that x² − 6x + 13 can take, for real x.", "4", "x² − 6x + 13 = (x − 3)² + 4. A square is never negative, so the smallest value is 4, when x = 3.", "transfer-minimum", 2,
  support="ts1", revisit=RV_NEG, mis=[("13", "13 is the value at x = 0. Complete the square: (x − 3)² + 4 is smallest when x = 3."), ("3", "3 is the value of x where the minimum happens. The minimum value is 4.", "extreme"), ("-9", "(x − 3)² = x² − 6x + 9, so x² − 6x + 13 = (x − 3)² + 4.")])
q("ts1", "integer", "Extra practice: find the smallest value of x² + 4x + 9.", "5", "x² + 4x + 9 = (x + 2)² + 5, smallest (5) when x = −2.", "transfer-minimum",
  mis=[("9", "9 is the value at x = 0; (x + 2)² + 5 is smallest when x = −2."), ("-2", "−2 is where it happens; the smallest value is 5.")])
q("t2", "integer", "For which value of x is −x² + 8x − 5 largest?", "4", "−x² + 8x − 5 = −(x² − 8x) − 5 = −[(x − 4)² − 16] − 5 = 11 − (x − 4)². It is largest (11) when x = 4.", "transfer-minimum", 2,
  revisit=RV_NEG, mis=[("11", "11 is the largest value. It happens when x = 4.", "extreme"), ("-4", "x² − 8x completes to (x − 4)², which is 0 when x = 4.")])
solve("t3", "Solve (x + 1)² + 6(x + 1) + 8 = 0.", "-5,-3", "Let u = x + 1: u² + 6u + 8 = 0, so (u + 3)² = 1 and u = −2 or −4. Then x = u − 1: x = −3 or x = −5.", "transfer-substitution", None, None,
      [("-4,-2", "Those are the values of x + 1. Subtract 1: x = −3 or x = −5.", "recognise"), ("-3,-1", "Complete the square in u = x + 1: (u + 3)² = 1 gives u = −2 or −4, so x = −3 or −5.")], difficulty=3)
q("t4", "integer", "The equation x² + 10x + c = 0 has exactly one root (a repeated root). Find c.", "25", "x² + 10x + c = (x + 5)² + c − 25. One repeated root means (x + 5)² = 0 exactly, so c − 25 = 0 and c = 25.", "transfer-repeated", 2,
  revisit=RV_TERM, mis=[("100", "Halve 10 first: (10/2)² = 25."), ("5", "(x + 5)² needs + 25: c = 25."), ("-25", "(x + 5)² = x² + 10x + 25, so c = +25.")])
q("t5", "integer", "Solve x² = 4x + 21 and give the larger root.", "7", "x² − 4x = 21. Add 4: (x − 2)² = 25, so x = 2 ± 5: 7 or −3. The larger is 7.", "transfer-rearrange", 2,
  revisit=RV_BAL, mis=[("5", "(x − 2)² = 25 gives x − 2 = ±5, so x = 7 or −3."), ("-3", "−3 is the smaller root; the larger is 7.", "context"), ("3", "x = 2 − 5 = −3 is the smaller root. The larger is 2 + 5 = 7.")])
q("t6", "integer", "A rectangle is 4 m longer than it is wide, and its area is 60 m². How wide is it, in metres?", "6", "w(w + 4) = 60, so w² + 4w = 60. Add 4: (w + 2)² = 64, so w + 2 = ±8: w = 6 or −10. A width cannot be negative, so w = 6.", "transfer-context", 2,
  mis=[("-10", "w = −10 solves the equation, but a width cannot be negative.", "context"), ("10", "10 m is the length (6 + 4). The width is 6 m.", "context"), ("8", "8 is w + 2. Subtract 2: w = 6.")])
transfer = dict(id="transfer", title="New kinds of problem", phase="transfer", kind="questions", hints=False, questions=["t1", "t2", "t3", "t4", "t5", "t6"])

# ---------------------------------------------------------------- stage 9: delayed retention
solve("r1", "Solve x² − 12x + 32 = 0 by completing the square.", "4,8", "x² − 12x = −32. Add 36: (x − 6)² = 4, so x = 6 ± 2: 4 or 8.", "solve-negative", None, None, [("-8,-4", "x² − 12x gives (x − 6)², so x = 6 ± 2: 4 and 8.")])
q("r2", "values", "Write 3x² + 12x + 5 in the form a(x + p)² + q.", "3,2,-7", "3(x² + 4x) + 5 = 3[(x + 2)² − 4] + 5 = 3(x + 2)² − 7.", "vertex-form", 2, fields=["a", "p", "q"],
  mis=[("3,2,1", "The 4 subtracted inside is multiplied by 3: 5 − 12 = −7."), ("3,4,-7", "Inside it is x² + 4x, so p is half of 4: 2.")])
q("r3", "choice", "Why do we add (b/2)² to x² + bx?", "A", "x² + bx is a square with two strip rectangles; the missing corner is b/2 by b/2, with area (b/2)². Adding it makes (x + b/2)².", "explain",
  options=["It is the area of the missing b/2-by-b/2 corner, which makes a perfect square", "It makes the equation equal zero", "It doubles b", "It is a rule with no reason"],
  mis=[("B", "Adding (b/2)² does not make anything zero; it turns x² + bx into the square (x + b/2)²."), ("C", "It does not change b. It fills the missing corner."), ("D", "There is a reason: it is the missing corner of the square, (b/2) × (b/2).")])
retention = dict(id="retention", title="Revision check", phase="retention", kind="questions", hints=False, questions=["r1", "r2", "r3"])

# ---------------------------------------------------------------- remediation (v1.1.0): a temporary help branch
# Each "rule" is something a learner can be missing. Its strategies are tried in order by the shared planner
# (english-core/src/planner.ts): teach, one guided question (hints, assisted), then one fresh independent check.
# A failed strategy is never repeated; after the last one the planner recommends a person. Nothing is generated.
R = "remediation"
def rq(id, type, prompt, answer, solution, skill, competency=None, **kw):
    kw.setdefault('difficulty', 1)
    d = q(id, type, prompt, answer, solution, skill, kw.pop('difficulty'), **kw)
    Q[id]['role'] = R
    if competency: Q[id]['competency'] = competency
    return d
def strat(id, title, screens, guided, reassess, ref=None):
    d = dict(id=id, title=title, screens=screens, guided=guided, reassess=reassess)
    if ref: d['teachFrom'] = ref
    return d
ID, SQ, LIN, QUAD = "MATH.algebra.identities", "MATH.number.square-roots", "MATH.algebra.linear-equations", "MATH.algebra.quadratics"

# prerequisite rules (competencies from the curriculum graph)
rq("px1", "values", "(x + 2)² = x² + ▢x + ▢. Fill in both numbers.", "4,4", "Two rectangles of 2x make 4x, and the 2-by-2 corner is 4: (x + 2)² = x² + 4x + 4.", "expand-square", ID,
   fields=["middle coefficient", "last term"], hint="Picture the square of side x + 2: x², two x-by-2 rectangles, and a 2-by-2 corner.",
   mis=[("2,4", "There are two rectangles of 2x each: 4x in all."), ("0,4", "The two rectangles make the middle term: 2 × 2 × x = 4x."), ("4,2", "The corner is 2 by 2, so the last term is 4, not 2.")])
rq("pxc1", "integer", "(x + 9)² = x² + 18x + ?", "81", "The corner is 9 by 9: 81.", "expand-square", ID, mis=[("9", "The last term is 9², not 9."), ("18", "18 is the middle coefficient; the last term is 9² = 81.")])
rq("px2", "values", "(x − 3)² = x² + ▢x + ▢. Fill in both numbers (use ± for a minus sign).", "-6,9", "Grid: x × x = x², x × (−3) = −3x twice (−6x), (−3) × (−3) = 9. So x² − 6x + 9.", "expand-square", ID,
   fields=["middle coefficient", "last term"], hint="Use the grid: the two middle cells are both x × (−3).",
   mis=[("-3,9", "There are two middle cells of −3x: −6x."), ("-6,-9", "(−3) × (−3) = +9."), ("6,9", "Each middle cell is x × (−3) = −3x, so the middle term is negative.")])
rq("pxc2", "choice", "Which expression equals (x − 7)²?", "B", "(x − 7)² = x² − 14x + 49.", "expand-square", ID, options=["x² − 49", "x² − 14x + 49", "x² + 14x + 49", "x² − 14x − 49"],
   mis=[("A", "That forgets the two middle cells, −7x each."), ("C", "The middle cells are x × (−7): negative."), ("D", "(−7) × (−7) = +49.")])
rq("pr1", "values", "Solve (x + 2)² = 9.", "-5,1", "x + 2 = 3 or x + 2 = −3, so x = 1 or x = −5.", "square-root", SQ, fields=ROOTS, unordered=True,
   hint="The box x + 2 squares to 9, so the box is 3 or −3.", mis=[("-1,5", "x + 2 = ±3 gives x = −2 ± 3: 1 and −5."), ("-3,3", "It is x + 2 that is ±3. Subtract 2 from each.")])
rq("prc1", "values", "Solve (x − 5)² = 4.", "3,7", "x − 5 = 2 or x − 5 = −2, so x = 7 or x = 3.", "square-root", SQ, fields=ROOTS, unordered=True,
   mis=[("-7,-3", "x − 5 = ±2 gives x = 5 ± 2: 7 and 3."), ("-2,2", "It is x − 5 that is ±2. Add 5 to each.")])
rq("pr2", "values", "Solve (x + 3)² = 49.", "-10,4", "Undo the square: x + 3 = ±7. Undo the + 3: x = 4 or x = −10. Check: (4 + 3)² = 49 ✓, (−10 + 3)² = 49 ✓.", "square-root", SQ, fields=ROOTS, unordered=True,
   hint="Undo the square first (±7), then the + 3.", mis=[("-4,10", "x + 3 = ±7 gives x = −3 ± 7: 4 and −10."), ("-7,7", "Undo the + 3 as well: subtract 3 from each.")])
rq("prc2", "values", "Solve (x − 4)² = 36.", "-2,10", "x − 4 = ±6, so x = 10 or x = −2.", "square-root", SQ, fields=ROOTS, unordered=True,
   mis=[("-10,2", "x − 4 = ±6 gives x = 4 ± 6: 10 and −2."), ("-6,6", "It is x − 4 that is ±6. Add 4 to each.")])
rq("pb1", "choice", "Divide every term of 4x² − 8x = 20 by 4.", "A", "4x² ÷ 4 = x², −8x ÷ 4 = −2x, 20 ÷ 4 = 5.", "divide-through", LIN, options=["x² − 2x = 5", "x² − 8x = 20", "x² − 2x = 20", "4x² − 2x = 5"],
   hint="Three terms, three divisions.", mis=[("B", "Only the x² term was divided."), ("C", "The right side must be divided too: 20 ÷ 4 = 5."), ("D", "4x² ÷ 4 = x².")])
rq("pbc1", "choice", "x² + 4x = 1. Which line is still the same equation?", "A", "Adding 4 to both sides keeps it balanced: x² + 4x + 4 = 5.", "balance", LIN, options=["x² + 4x + 4 = 5", "x² + 4x + 4 = 1", "x² + 4x = 5", "x² + 4x + 4 = 4"],
   mis=[("B", "4 was added to the left only."), ("C", "4 was added to the right only."), ("D", "The right side should become 1 + 4 = 5.")])
rq("pb2", "choice", "x = 2 solves x² − x = 2. Which step keeps the balance? (Test x = 2 in each.)", "A", "Adding 1/4 to both sides keeps the equation true for x = 2: 4 − 2 + 1/4 = 2 + 1/4 ✓.", "balance", LIN,
   options=["x² − x + 1/4 = 2 + 1/4", "x² − x + 1/4 = 2", "x² − x = 2 + 1/4", "x² − x − 1/4 = 2 + 1/4"],
   hint="Put x = 2 into each line and see which stays true.", mis=[("B", "With x = 2 the left is 2¼ and the right is 2: not balanced."), ("C", "With x = 2 the left is 2 and the right is 2¼."), ("D", "The left went down by ¼ and the right went up by ¼.")])
rq("pbc2", "choice", "Divide every term of −2x² + 6x = −4 by −2.", "A", "−2x² ÷ −2 = x², 6x ÷ −2 = −3x, −4 ÷ −2 = 2.", "divide-through", LIN, options=["x² − 3x = 2", "x² + 6x = −4", "−x² + 3x = −2", "x² − 3x = −4"],
   mis=[("B", "Only the first term was divided."), ("C", "That divides by 2, not by −2."), ("D", "The right side too: −4 ÷ −2 = 2.")])
prerequisite_rules = [
  dict(id="expand", kind="prerequisite", competency=ID, name="Squaring a bracket",
       why="Completing the square is the pattern (x + a)² = x² + 2ax + a², used backwards. Two of your answers suggest that pattern is not secure yet, so here is a short lesson on it first.",
       observe=["p1", "d1", "ds1"], strategies=[
    strat("area_model", "See (x + a)² as an area", [
      dict(title="A square of side x + 4", text=["Split each side of the square into x and 4. The square breaks into four pieces:", "x², two rectangles of 4x each (8x), and a 4-by-4 corner of 16. So (x + 4)² = x² + 8x + 16."], widget=dict(type="tiles", b=8, mode="show")),
      dict(title="Why not x² + 16?", text=["x² + 16 counts only the big square and the corner. It leaves out the two rectangles, which make the middle term 2 × 4 × x = 8x. Check with x = 1: (1 + 4)² = 25, but 1 + 16 = 17."])], "px1", "pxc1"),
    strat("multiply_it_out", "Multiply every term, then check with a number", [
      dict(title="The grid", text=["Write (x + 5)(x + 5) as a grid: x and 5 along the top, x and 5 down the side. Each cell is a product:", "Add the cells: x² + 5x + 5x + 25 = x² + 10x + 25."], math=["×  |  x   |  5", "x  |  x²  |  5x", "5  |  5x  |  25"], mathAt=1),
      dict(title="Check with a number", text=["Put x = 1: (1 + 5)² = 36, and 1 + 10 + 25 = 36 ✓. A quick number check catches a missing middle term or a wrong sign."])], "px2", "pxc2")]),
  dict(id="roots", kind="prerequisite", competency=SQ, name="Square roots: both of them",
       why="Solving (x + p)² = k needs both square roots of k. Two of your answers suggest the ± step is not secure yet.",
       observe=["d2", "ds2"], strategies=[
    strat("two_numbers", "Two numbers square to the same thing", [
      dict(title="What squares to 16?", text=["4 × 4 = 16 and (−4) × (−4) = 16. So if a box squared is 16, the box is 4 or −4."], math=["▢² = 16  ⇒  ▢ = 4  or  ▢ = −4"]),
      dict(title="The bracket is the box", text=["In (x + 1)² = 16 the box is x + 1. So x + 1 = 4 or x + 1 = −4. Undo the + 1 in each: x = 3 or x = −5."])], "pr1", "prc1"),
    strat("undo_and_check", "Undo one layer at a time, then check", [
      dict(title="Undo in reverse order", text=["(x − 1)² = 25. To make this, 1 was subtracted from x and then the result was squared. Undo in reverse: first the square (±5), then the subtraction (add 1): x = 6 or x = −4."]),
      dict(title="Check both", text=["(6 − 1)² = 25 ✓ and (−4 − 1)² = (−5)² = 25 ✓. If a check fails, a sign was lost on the way."])], "pr2", "prc2")]),
  dict(id="balance", kind="prerequisite", competency=LIN, name="Keeping an equation balanced",
       why="Completing the square adds the same number to both sides, and divides every term when a ≠ 1. Two of your answers suggest that is not secure yet.",
       observe=["d3", "ds3", "w2", "w4", "w5"], strategies=[
    strat("balance_model", "An equation is a balance", [
      dict(title="Both sides, every term", text=["x² + 6x = −5 is true for x = −1. Try adding 9 to one side only, then to both sides."], widget=dict(type="balance")),
      dict(title="Dividing works the same way", text=["Dividing 3x² + 6x = 9 by 3 means dividing each of the three terms: x² + 2x = 3. Miss one term and the balance tips."])], "pb1", "pbc1"),
    strat("test_with_a_number", "Test each step with a known solution", [
      dict(title="A built-in check", text=["x = 1 solves x² + 2x = 3. After any step, put x = 1 into the new line. If it is still true, the step kept the balance."],
           math=["add 1 to both: 1 + 2 + 1 = 3 + 1 ✓", "add 1 to the left only: 1 + 2 + 1 = 4, not 3 ✗"])], "pb2", "pbc2")]),
]

# procedure families: what is practised in the unit, and what to teach when it goes wrong twice
rq("ftg1", "fraction", "x² + 7x + ▢ = (x + a)². Find ▢. (Match 2a = 7 first.)", "49/4", "2a = 7, so a = 7/2 and ▢ = a² = 49/4.", "complete-term-fraction",
   hint="2a = 7 gives a = 7/2. The missing number is a².", mis=[("49/2", "a² = (7/2)² = 49/4: square the 2 as well."), ("7/2", "That is a; the missing number is a² = 49/4."), ("49", "Find a first: 2a = 7, a = 7/2.")])
rq("ftc1", "integer", "x² − 12x + ▢ = (x − 6)². Find ▢.", "36", "(x − 6)² = x² − 12x + 36.", "complete-term-negative", mis=[("-36", "(−6)² = +36."), ("12", "12 is 2a; the missing number is a² = 36."), ("144", "That is 12²; the number is 6² = 36.")])
rq("ftg2", "integer", "(x + 6)² = x² + 12x + ?", "36", "The corner is 6 by 6: 36.", "expand-square", ID, hint="The last term of (x + a)² is a².", mis=[("6", "The last term is 6², not 6."), ("12", "12 is the middle coefficient.")])
rq("ftc2", "fraction", "What do you add to x² + 9x to complete the square?", "81/4", "Half of 9 is 9/2, and (9/2)² = 81/4.", "complete-term-fraction", mis=[("81/2", "(9/2)² = 81/4."), ("9/2", "Square the half: 81/4."), ("81", "Halve 9 first: (9/2)² = 81/4.")])
rq("ffg1", "values", "Write x² + 6x − 2 in the form (x + p)² + q, then expand your answer to check it.", "3,-11", "(x + 3)² = x² + 6x + 9, which is 11 more than x² + 6x − 2. So (x + 3)² − 11. Check: x² + 6x + 9 − 11 = x² + 6x − 2 ✓.", "vertex-form",
   fields=["p", "q"], hint="Expand (x + 3)² and compare its constant with −2.", mis=[("3,-2", "(x + 3)² brings +9, so take 9 away: −2 − 9 = −11."), ("3,7", "You added 9 instead of taking it away."), ("6,-38", "p is half of 6.")])
rq("ffc1", "values", "Write x² − 2x + 9 in the form (x + p)² + q.", "-1,8", "(x − 1)² = x² − 2x + 1, so x² − 2x + 9 = (x − 1)² + 8.", "vertex-form", fields=["p", "q"],
   mis=[("1,8", "x² − 2x gives (x − 1)², so p = −1."), ("-1,10", "Take away the 1 you added: 9 − 1 = 8."), ("-1,9", "(x − 1)² already contains + 1: 9 − 1 = 8.")])
rq("ffg2", "integer", "(x − 4)² = x² − 8x + ?", "16", "(−4) × (−4) = 16.", "expand-square", ID, hint="The last term is (−4)².", mis=[("-16", "(−4)² = +16."), ("8", "8 is the middle coefficient.")])
rq("ffc2", "values", "Write x² + 12x + 30 in the form (x + p)² + q.", "6,-6", "(x + 6)² = x² + 12x + 36, so x² + 12x + 30 = (x + 6)² − 6.", "vertex-form", fields=["p", "q"],
   mis=[("6,30", "Take away the 36 you added: 30 − 36 = −6."), ("6,66", "You added 36 instead of taking it away."), ("12,-114", "p is half of 12.")])
rq("fsg1", "values", "Solve x² − 10x + 16 = 0. Name each of the four moves as you go.", "2,8", "1: x² − 10x = −16. 2: add 25 to both sides. 3: (x − 5)² = 9. 4: x − 5 = ±3, so x = 8 or x = 2.", "solve-negative",
   fields=ROOTS, unordered=True, hint="Move 2 is adding (−10/2)² = 25 to both sides.", mis=[("-8,-2", "(x − 5)² = 9 gives x = 5 ± 3: 8 and 2."), ("2,2", "Two roots: x − 5 = 3 and x − 5 = −3.")])
rq("fsc1", "values", "Solve x² + 8x + 7 = 0 by completing the square.", "-7,-1", "x² + 8x = −7; add 16: (x + 4)² = 9; x = −4 ± 3: −1 or −7.", "solve-monic", fields=ROOTS, unordered=True,
   mis=[("1,7", "x = −4 ± 3 gives −1 and −7: both negative."), ("-4,-1", "(x + 4)² = 9 gives x + 4 = ±3.")])
rq("fsg2", "values", "Solve (x + 6)² = 1.", "-7,-5", "x + 6 = ±1, so x = −5 or x = −7.", "square-root", SQ, fields=ROOTS, unordered=True, hint="x + 6 is 1 or −1.",
   mis=[("5,7", "x + 6 = ±1 gives x = −6 ± 1: −5 and −7."), ("-1,1", "It is x + 6 that is ±1.")])
rq("fsc2", "values", "Solve x² − 2x − 8 = 0 by completing the square.", "-2,4", "x² − 2x = 8; add 1: (x − 1)² = 9; x = 1 ± 3: 4 or −2.", "solve-negative", fields=ROOTS, unordered=True,
   mis=[("-4,2", "(x − 1)² = 9 gives x = 1 ± 3: 4 and −2.")])
rq("fdg1", "values", "Solve −x² + 2x + 8 = 0. Make the x² coefficient 1 first.", "-2,4", "Divide every term by −1: x² − 2x − 8 = 0. Then (x − 1)² = 9, so x = 4 or x = −2.", "solve-negative-a", fields=ROOTS, unordered=True,
   hint="Divide every term by −1: every sign flips.", mis=[("-4,2", "x² − 2x − 8 = 0 gives (x − 1)² = 9, so x = 1 ± 3: 4 and −2.")])
rq("fdc1", "values", "Solve 2x² − 12x + 10 = 0 by completing the square.", "1,5", "Divide by 2: x² − 6x + 5 = 0. (x − 3)² = 4, so x = 1 or 5.", "solve-nonunit", fields=ROOTS, unordered=True,
   mis=[("-5,-1", "x² − 6x gives (x − 3)², so x = 3 ± 2: 1 and 5."), ("-1,11", "After dividing by 2 the constant is 5, not 10.")])
rq("fdg2", "choice", "Divide every term of 5x² + 10x − 15 = 0 by 5.", "A", "5x² ÷ 5 = x², 10x ÷ 5 = 2x, −15 ÷ 5 = −3.", "divide-through", LIN, options=["x² + 2x − 3 = 0", "x² + 10x − 15 = 0", "x² + 2x − 15 = 0", "5x² + 2x − 3 = 0"],
   hint="Three terms, three divisions.", mis=[("B", "Only the x² term was divided."), ("C", "−15 ÷ 5 = −3."), ("D", "5x² ÷ 5 = x².")])
rq("fdc2", "values", "Solve 3x² + 12x + 9 = 0 by completing the square.", "-3,-1", "Divide by 3: x² + 4x + 3 = 0. (x + 2)² = 1, so x = −1 or −3.", "solve-nonunit", fields=ROOTS, unordered=True,
   mis=[("1,3", "x = −2 ± 1 gives −1 and −3."), ("-5,1", "After dividing by 3 the constant is 3, not 9.")])
def example(problem, steps, tip=None):
    d = dict(problem=problem, steps=[dict(text=t) for t in steps])
    if tip: d['tip'] = tip
    return d
procedure_rules = [
  dict(id="term", kind="procedure", competency=QUAD, name="Finding the number that completes the square", prerequisite="expand",
       why="Finding the number to add has gone wrong twice, so here is a different way to see it.",
       observe=["e1", "e2", "es1", "e3", "e4", "es2", "e5", "w1", "w3", "w6"],
       example=example("What do you add to x² + 14x to complete the square?", ["Halve the coefficient of x: 14 ÷ 2 = 7.", "Square it: 7² = 49.", "Check: (x + 7)² = x² + 14x + 49 ✓. So add 49."], "Halve first, then square: not the other way round, and not just one of the two."),
       strategies=[
    strat("match_the_identity", "Match it to (x + a)² = x² + 2ax + a²", [
      dict(title="Read a off the middle term", text=["The middle term of (x + a)² is 2a × x. So in x² + 18x, 2a = 18, which gives a = 9, and the missing last term is a² = 81:", "Halving is just solving 2a = b. Squaring is the a² at the end of the pattern."],
           math=["x² + 18x + ▢ = (x + a)²", "2a = 18  ⇒  a = 9  ⇒  ▢ = 81"], mathAt=1)], "ftg1", "ftc1"),
    strat("prerequisite_review", "Back to the pattern underneath", [
      dict(title="Reading the pattern backwards", text=["(x + a)² = x² + 2ax + a². So x² + 2ax is a² short of being a square, and that missing a² is the number you add. First, make sure the forward direction is solid:"], widget=dict(type="tiles", b=6, mode="show"))], "ftg2", "ftc2", ref="expand")]),
  dict(id="form", kind="procedure", competency=QUAD, name="Writing (x + p)² + q", prerequisite="expand",
       why="Writing the completed-square form has gone wrong twice, so here is a different way to check it.",
       observe=["e6", "es3", "g5", "gs5", "i5", "r2"],
       example=example("Write x² + 10x + 7 in the form (x + p)² + q.", ["Half of 10 is 5, and (x + 5)² = x² + 10x + 25.", "x² + 10x + 7 has 7 where (x + 5)² has 25: it is 18 less.", "So x² + 10x + 7 = (x + 5)² − 18: p = 5 and q = −18."], "Add the missing number and take it away again: the value must not change."),
       strategies=[
    strat("check_by_expanding", "Expand your answer back to check it", [
      dict(title="Your answer contains its own check", text=["Whatever you write, expand it back and compare. (x + 5)² − 18 = x² + 10x + 25 − 18 = x² + 10x + 7 ✓.", "If the constants do not match, change q by the difference. If the x terms do not match, p is wrong."])], "ffg1", "ffc1"),
    strat("prerequisite_review", "Back to the pattern underneath", [
      dict(title="Where q comes from", text=["(x + p)² always brings its own constant p². q is whatever is left over: q = c − p². To use that, (x + p)² must expand correctly first:"], widget=dict(type="tiles", b=8, mode="show"))], "ffg2", "ffc2", ref="expand")]),
  dict(id="solve", kind="procedure", competency=QUAD, name="Solving by completing the square", prerequisite="roots",
       why="Solving by completing the square has gone wrong twice, so here is the method as four fixed moves.",
       observe=["g1", "g2", "g3", "g7", "g8", "gs1", "gs2", "gs3", "gs7", "gs8", "i1", "i2", "i3", "i6", "a3", "r1"],
       example=example("Solve x² + 2x − 15 = 0.", ["Move −15 across: x² + 2x = 15.", "Add (2/2)² = 1 to both sides: x² + 2x + 1 = 16.", "Write the square: (x + 1)² = 16.", "Both roots: x + 1 = 4 or x + 1 = −4.", "x = 3 or x = −5. Check x = 3: 9 + 6 − 15 = 0 ✓."]),
       strategies=[
    strat("four_moves", "The same four moves every time", [
      dict(title="Four moves", text=["Say which move you are on as you write each line. Most slips happen at move 2 (adding to one side only) or move 4 (keeping only one root)."],
           math=["1  constant to the right", "2  add (half the x coefficient)² to both sides", "3  write the left side as a square", "4  square-root with ±, then solve each"], mathAt=0)], "fsg1", "fsc1"),
    strat("prerequisite_review", "Back to the last move: both square roots", [
      dict(title="Move 4 is the one to check", text=["After move 3 you always have (x + p)² = k. Then x + p is √k or −√k: two answers, each giving one root."], math=["(x + p)² = k  ⇒  x = −p ± √k"])], "fsg2", "fsc2", ref="roots")]),
  dict(id="divide", kind="procedure", competency=QUAD, name="Dividing through when a ≠ 1", prerequisite="balance",
       why="Equations that do not start with x² alone have gone wrong twice, so here is why dividing comes first.",
       observe=["g4", "g6", "gs4", "gs6", "i4"],
       example=example("Solve 2x² + 4x − 6 = 0.", ["Divide every term by 2: x² + 2x − 3 = 0.", "x² + 2x = 3; add 1 to both sides: (x + 1)² = 4.", "x + 1 = ±2, so x = 1 or x = −3."]),
       strategies=[
    strat("why_divide", "Why the x² coefficient must be 1", [
      dict(title="(x + a)² starts with x²", text=["(x + a)² always starts with x², never 2x² or −x². So 2x² + 12x cannot match (x + a)² until you divide by 2 (or take the 2 out as a factor):"], math=["2x² + 12x = 2(x² + 6x) = 2[(x + 3)² − 9]"])], "fdg1", "fdc1"),
    strat("prerequisite_review", "Back to keeping the balance", [
      dict(title="Divide every term, on both sides", text=["Dividing an equation divides every term, and 0 stays 0. Try the balance again:"], widget=dict(type="balance"))], "fdg2", "fdc2", ref="balance")]),
]

# transfer: what else, besides the procedure, an unfamiliar problem needs
rq("tig1", "integer", "Find the smallest value of (x + 2)² − 5.", "-5", "(x + 2)² is never negative and is 0 when x = −2, so the smallest value is −5.", "transfer-minimum",
   hint="When is (x + 2)² smallest? What is left then?", mis=[("-2", "−2 is the x where it happens; the smallest value is −5."), ("5", "The square is 0 at its smallest, leaving −5."), ("2", "When the square is 0, what is left is −5.")])
rq("tic1", "integer", "Find the smallest value of x² + 10x + 30.", "5", "x² + 10x + 30 = (x + 5)² + 5, smallest (5) when x = −5.", "transfer-minimum",
   mis=[("30", "30 is the value at x = 0. Complete the square first: (x + 5)² + 5."), ("-5", "−5 is where it happens; the smallest value is 5."), ("25", "(x + 5)² brings 25; what is left is 30 − 25 = 5.")])
rq("tig2", "integer", "x² − 6x + 11 = (x − 3)² + 2. Try x = 1, 2, 3, 4, 5. For which x is it smallest?", "3", "Values: 6, 3, 2, 3, 6. Smallest at x = 3, where (x − 3)² = 0.", "transfer-minimum",
   hint="Work out the five values; or ask when (x − 3)² is 0.", mis=[("2", "2 is the smallest value; it happens at x = 3."), ("-3", "(x − 3)² is 0 when x = 3, not −3.")])
rq("tic2", "integer", "For which x is −x² + 6x + 1 largest?", "3", "−x² + 6x + 1 = 10 − (x − 3)², largest (10) when x = 3.", "transfer-minimum",
   mis=[("10", "10 is the largest value; it happens at x = 3."), ("-3", "x² − 6x completes to (x − 3)², which is 0 at x = 3.")])
rq("txg1", "integer", "A square garden has side s metres, and s² + 2s = 48. Find s.", "6", "(s + 1)² = 49, so s = 6 or s = −8. A side cannot be negative: s = 6.", "transfer-context",
   hint="Solve first, then ask which solution can be a length.", mis=[("-8", "−8 solves the equation, but a length cannot be negative."), ("7", "7 is s + 1. Subtract 1: s = 6.")])
rq("txc1", "integer", "A rectangle is 2 cm longer than it is wide, and its area is 35 cm². Find its width in cm.", "5", "w(w + 2) = 35, so (w + 1)² = 36 and w = 5 or −7. The width is 5 cm.", "transfer-context",
   mis=[("-7", "−7 solves the equation, but a width cannot be negative."), ("7", "7 cm is the length; the width is 5 cm.")])
rq("txg2", "integer", "The product of two consecutive positive whole numbers is 72. Find the smaller one.", "8", "n(n + 1) = 72: n = 8 or n = −9. Positive: 8 (and 9).", "transfer-context",
   hint="Write n(n + 1) = 72, solve, then keep the answer the question allows.", mis=[("9", "9 is the larger number; the smaller is 8."), ("-9", "The numbers must be positive.")])
rq("txc2", "integer", "A positive number n satisfies n² − 3n = 10. Find n.", "5", "(n − 3/2)² = 49/4, so n = 5 or n = −2. Positive: 5.", "transfer-context",
   mis=[("-2", "−2 solves the equation, but n must be positive.")])
rq("trg1", "values", "Solve (x + 2)² + 2(x + 2) − 3 = 0. (Let u = x + 2.)", "-5,-1", "u² + 2u − 3 = 0 gives (u + 1)² = 4, u = 1 or −3. Then x = u − 2: −1 or −5.", "transfer-substitution", fields=ROOTS, unordered=True,
   hint="Solve for u first, then turn each u back into x.", mis=[("-3,1", "Those are the values of u = x + 2. Subtract 2 from each.")])
rq("trc1", "values", "Solve (x − 2)² − 4(x − 2) − 5 = 0.", "1,7", "u = x − 2: u² − 4u − 5 = 0, so u = 5 or −1, and x = 7 or 1.", "transfer-substitution", fields=ROOTS, unordered=True,
   mis=[("-1,5", "Those are the values of u = x − 2. Add 2 to each.")])
rq("trg2", "integer", "x² − 6x + c = 0 has exactly one root. Find c.", "9", "Exactly one root means the left side is a perfect square: (x − 3)² = x² − 6x + 9, so c = 9.", "transfer-repeated",
   hint="Which value of c makes x² − 6x + c a perfect square?", mis=[("36", "Halve −6 first: (−3)² = 9."), ("-9", "(x − 3)² = x² − 6x + 9: c = +9.")])
rq("trc2", "integer", "Solve x² = 6x + 16 and give the larger root.", "8", "x² − 6x = 16. Add 9: (x − 3)² = 25, so x = 8 or −2.", "transfer-rearrange",
   mis=[("-2", "−2 is the smaller root."), ("5", "(x − 3)² = 25 gives x − 3 = ±5: 8 or −2.")])
rq("ttg1", "choice", "A rectangle's length is 5 m more than its width w, and its area is 84 m². Which equation fits?", "A", "Area is length × width: w(w + 5) = 84.", "transfer-translate",
   options=["w(w + 5) = 84", "w + w + 5 = 84", "2w + 2(w + 5) = 84", "w² + 5 = 84"], hint="Area means multiply the two sides.",
   mis=[("B", "That adds the sides; area multiplies them."), ("C", "That is the perimeter, not the area."), ("D", "The length is w + 5, so the area is w(w + 5) = w² + 5w.")])
rq("ttc1", "integer", "A rectangle is 3 m longer than it is wide and has area 40 m². Find its width in metres.", "5", "w(w + 3) = 40: w² + 3w − 40 = 0 gives w = 5 or w = −8. The width is 5 m.", "transfer-translate",
   mis=[("8", "8 m is the length; the width is 5 m."), ("-8", "A width cannot be negative.")])
rq("ttg2", "choice", "The square of a number n, plus 6 times the number, is 16. Which equation fits?", "A", "“The square of n” is n², “plus 6 times the number” is + 6n, “is 16” is = 16.", "transfer-translate",
   options=["n² + 6n = 16", "(n + 6)² = 16", "2n + 6n = 16", "n² + 6 = 16"], hint="Translate one phrase at a time.",
   mis=[("B", "That squares n + 6. The square is only of n."), ("C", "The square of n is n², not 2n."), ("D", "“6 times the number” is 6n.")])
rq("ttc2", "integer", "The square of a positive number, plus 6 times the number, is 16. Find the number.", "2", "n² + 6n = 16: (n + 3)² = 25, n = 2 or −8. Positive: 2.", "transfer-translate",
   mis=[("-8", "−8 solves the equation, but the number must be positive."), ("5", "5 is n + 3. Subtract 3: n = 2.")])
transfer_rules = [
  dict(id="extreme", kind="transfer", category="interpret", competency=QUAD, name="Reading a smallest or largest value from (x + p)² + q",
       why="Your working with the method was right, so the method is not the problem. What is new here is connecting the completed form to the smallest or largest value.",
       observe=[], strategies=[
    strat("minimum_explorer", "Why (x − 3)² + 4 is never below 4", [
      dict(title="Move x and watch", text=["(x − 3)² is a square, so it is 0 or more. It is 0 only when x = 3. Move x and watch the value of (x − 3)² + 4:"], widget=dict(type="minimum", p=-3, q=4)),
      dict(title="Smallest value, and where", text=["For (x + p)² + q the smallest value is q, and it happens when x = −p. For −(x + p)² + q the largest value is q, at x = −p."], tip="Two different questions: “what is the smallest value?” (q) and “for which x?” (−p).")], "tig1", "tic1"),
    strat("table_of_values", "Try values and watch the square", [
      dict(title="A table", text=["x² − 4x + 7 = (x − 2)² + 3. Try x = 0, 1, 2, 3, 4:", "The values go down and come back up, smallest at x = 2, where the square is 0."], math=["x:      0   1   2   3   4", "value:  7   4   3   4   7"], mathAt=1)], "tig2", "tic2")]),
  dict(id="context", kind="transfer", category="interpret", competency=QUAD, name="Checking a solution against the question",
       why="You solved the equation, but a solution of the equation is not always the answer to the question.",
       observe=[], strategies=[
    strat("check_against_the_story", "Ask what the answer means", [
      dict(title="Every solution, checked against the question", text=["w(w + 4) = 60 has two solutions, 6 and −10. A width cannot be −10 m, so the answer is 6 m. And if the question asks for the width, 10 m (the length) is not the answer.", "After solving, reread the question: which quantity, which units, which values are possible?"])], "txg1", "txc1"),
    strat("write_the_meaning", "Write what each solution means", [
      dict(title="Say it in words", text=["Write one sentence for each solution, for example “w = −10: a width of −10 m”. Saying it in words makes an impossible answer easy to spot."])], "txg2", "txc2")]),
  dict(id="recognise", kind="transfer", category="recognise", competency=QUAD, name="Spotting when completing the square applies",
       why="You can complete the square on a standard equation. What is new here is seeing that this problem is one in disguise.",
       observe=[], strategies=[
    strat("spot_the_structure", "Three common disguises", [
      dict(title="Look for these", text=["A repeated block: (x + 1)² + 6(x + 1) + 8 is u² + 6u + 8 with u = x + 1. Solve for u, then turn u back into x.", "Terms on both sides: x² = 4x + 21 must become x² − 4x = 21 first.", "“Exactly one root” means the quadratic is a perfect square: x² + 10x + c = (x + 5)² when c = 25."])], "trg1", "trc1"),
    strat("one_tidying_move", "Make one tidying move, then look again", [
      dict(title="Tidy first", text=["Before solving, make one move and look again: give a repeated block a name, bring every term to one side, or compare with (x + a)². The familiar shape usually appears after one move."])], "trg2", "trc2")]),
  dict(id="translate", kind="transfer", category="translate", competency=QUAD, name="Turning words into an equation",
       why="The equation in a word problem has to be built from the words first. That step went wrong, not the solving.",
       observe=[], strategies=[
    strat("draw_and_label", "Draw it and label it", [
      dict(title="Sketch first", text=["Sketch the rectangle and label the sides: width w, length w + 4. Area means length × width, so w(w + 4) = 60. Only then complete the square."])], "ttg1", "ttc1"),
    strat("phrase_by_phrase", "Translate phrase by phrase", [
      dict(title="A small dictionary", text=["“4 more than w” → w + 4. “area” → multiply the sides. “the square of n” → n². “is” → =. Translate each phrase, then put them together."])], "ttg2", "ttc2")]),
]

# transfer diagnosis: quick questions on the parts, used only when the answer itself does not show what went wrong
rq("tp1", "values", "Quick check: write x² − 6x + 13 in the form (x + p)² + q.", "-3,4", "x² − 6x + 13 = (x − 3)² − 9 + 13 = (x − 3)² + 4.", "vertex-form", fields=["p", "q"],
   mis=[("3,4", "x² − 6x gives (x − 3)², so p = −3."), ("-3,13", "Take away the 9 you added: 13 − 9 = 4.")])
rq("tp2", "values", "Quick check: write x² − 8x in the form (x + p)² + q.", "-4,-16", "x² − 8x = (x − 4)² − 16.", "vertex-form", fields=["p", "q"], mis=[("4,-16", "x² − 8x gives (x − 4)²: p = −4."), ("-4,16", "Take away the 16 you added.")])
rq("tp3", "values", "Quick check: solve u² + 6u + 8 = 0.", "-4,-2", "(u + 3)² = 1, so u = −2 or u = −4.", "solve-monic", fields=["u =", "or u ="], unordered=True, mis=[("2,4", "u = −3 ± 1: −2 and −4.")])
rq("tp4", "integer", "Quick check: what do you add to x² + 10x to complete the square?", "25", "(10/2)² = 25.", "complete-term", mis=[("10", "Halve and square: 25."), ("100", "Halve first: 5² = 25.")])
rq("tp5", "values", "Quick check: solve x² − 4x − 21 = 0.", "-3,7", "(x − 2)² = 25, so x = 7 or −3.", "solve-negative", fields=ROOTS, unordered=True, mis=[("-7,3", "x = 2 ± 5: 7 and −3.")])
rq("tq6", "choice", "Quick check: a rectangle is 4 m longer than it is wide (width w) and has area 60 m². Which equation fits?", "A", "Area is length × width: w(w + 4) = 60.", "transfer-translate",
   options=["w(w + 4) = 60", "w + w + 4 = 60", "2w + 2(w + 4) = 60", "w² + 4 = 60"], mis=[("B", "That adds the sides; area multiplies them."), ("C", "That is the perimeter."), ("D", "w(w + 4) = w² + 4w, not w² + 4.")])
rq("tp6", "values", "Quick check: solve w² + 4w − 60 = 0.", "-10,6", "(w + 2)² = 64, so w = 6 or w = −10.", "solve-monic", fields=["w =", "or w ="], unordered=True, mis=[("-6,10", "w = −2 ± 8: 6 and −10.")])
transfer_diagnosis = [
  dict(question="t1", demand="extreme", procedure="form", probes=[dict(question="tp1", tests="procedure")]),
  dict(question="t2", demand="extreme", procedure="form", probes=[dict(question="tp2", tests="procedure")]),
  dict(question="t3", demand="recognise", procedure="solve", probes=[dict(question="tp3", tests="procedure")]),
  dict(question="t4", demand="recognise", procedure="term", probes=[dict(question="tp4", tests="procedure")]),
  dict(question="t5", demand="recognise", procedure="solve", probes=[dict(question="tp5", tests="procedure")]),
  dict(question="t6", demand="context", procedure="solve", probes=[dict(question="tq6", tests="translate"), dict(question="tp6", tests="procedure")]),
]
remediation = dict(
  policy=dict(note="The shared planner's draft policy with this unit's block size: one guided question and one fresh independent check per strategy, no contrast items. Estimator, verification and retention settings are unchanged.",
              guidedItems=1, reassessItems=1, reassessPassMin=1, reassessContrastItems=0),
  rules=prerequisite_rules + procedure_rules + transfer_rules, transfer=transfer_diagnosis)

stages = [prereq, picture, worked, formula, guided, independent, apply, transfer, retention]
# teaching / worked stages: their questions are the predictions and checks, in order
for st in stages:
    if st['kind'] == 'teach':
        qs, sup = [], []
        for sec in st['sections']:
            for sc in sec['screens']:
                if sc.get('predict'): qs.append(sc['predict'])
            if sec.get('check'): qs.append(sec['check'])
            if sec.get('remediate', {}).get('support'): sup.append(sec['remediate']['support'])
        st['questions'] = qs
        st['support'] = sorted(set(sup) | {Q[x]['support'] for x in qs if Q[x].get('support')})
    elif st['kind'] == 'worked':
        st['questions'] = [s['predict'] for e in st['examples'] for s in e['steps'] if s.get('predict')] + ([st['check']] if st.get('check') else [])
        st['support'] = []
    else:
        st['support'] = sorted({Q[x]['support'] for x in st['questions'] if Q[x].get('support')})
    st['hints'] = st.get('hints', st['kind'] != 'questions' or st['phase'] == 'guided')
used = {x for st in stages for x in st['questions'] + st['support']}
remedial = {x for r in remediation['rules'] for st in r['strategies'] for x in (st['guided'], st['reassess'])} | {p['question'] for t in remediation['transfer'] for p in t['probes']}
assert not used & remedial and used | remedial == set(Q), set(Q) ^ (used | remedial)
assert all(Q[x].get('role') == 'remediation' for x in remedial) and not any(Q[x].get('role') for x in used)
rules = {r['id']: r for r in remediation['rules']}
for r in remediation['rules']:
    assert all(x in used for x in r['observe']), r['id']
    assert r.get('prerequisite') is None or rules[r['prerequisite']]['kind'] == 'prerequisite'
    for st in r['strategies']: assert st.get('teachFrom') is None or st['teachFrom'] in rules
for t in remediation['transfer']: assert t['demand'] in rules and t['procedure'] in rules and Q[t['question']]
signals = {m['signal'] for x in Q.values() for m in x.get('misconceptions', []) if 'signal' in m}
assert signals <= set(rules), signals
for x in Q.values():
    if x.get('support'): assert x['support'] in Q, x['support']
    if 'revisit' in x:
        st = next(s for s in stages if s['id'] == x['revisit']['stage'])
        ids = [s['id'] for s in st.get('sections', [])] + [e['id'] for e in st.get('examples', [])] + ([st['intro']['id']] if st.get('intro') else [])
        assert x['revisit']['section'] in ids, x
    if x['type'] == 'values': assert len(x['answer'].split(',')) == len(x['fields']), x['id']
spec = dict(id="completing-the-square", version="1.1.0", compatibleVersions=["1.0.0"], title="Completing the square", unitOf="jee-quadratics", track="jee-main",
  competencyId="MATH.algebra.quadratics", review="provisional",
  reviewNote="Original teaching and questions written for this reference unit; every answer is recomputed independently in frontend/src/mathematics/unit/unit.test.ts. Not reviewed by an educator; not previous-year questions. Provisional: it can never verify mastery.",
  source=["NTA Syllabus for JEE (Main) 2026, Unit 2: quadratic equations in real and complex number systems and their solutions"],
  levels="School foundations (stages 1 to 6) towards JEE Main (stages 7 and 8). No JEE Advanced material.",
  retentionAfter="transfer", retentionDelayDays=7, stages=stages, remediation=remediation, questions=list(Q.values()))
json.dump(spec, open(sys.argv[1], 'w'), ensure_ascii=False, indent=2); open(sys.argv[1], 'a').write("\n")
main = [x for st in stages for x in st['questions']]
print("stages", len(stages), "main questions", len(main), "support", len(Q) - len(main) - len(remedial), "remediation", len(remedial), "rules", len(remediation["rules"]), "screens", sum(len(sc['screens']) for st in stages for sc in st.get('sections', [])) + sum(len(st['intro']['screens']) for st in stages if st.get('intro')),
      "worked steps", sum(len(e['steps']) for st in stages for e in st.get('examples', [])))
