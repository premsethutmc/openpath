# Authoring source for content/learning/{modules,problems,goals}.v1.json (the JSON is what the app and server read).
#   python3 content/learning/src/build.py
# Original content written for OpenPath, CC0. Provisional: not educator-reviewed. Every answer is recomputed
# independently in packages/learning/src/content.test.ts.
import json, os
OUT = os.path.join(os.path.dirname(__file__), "..")
SRC = {"source": "Original, written for OpenPath", "licence": "CC0", "review": "provisional"}
Q = {}
def q(id, competency, role, type, prompt, answer, solution, probe=None, skill=None, hint=None, options=None, mis=(), difficulty=1, **kw):
    assert id not in Q, id
    d = dict(id=id, competency=competency, skill=skill or competency, role=role, type=type, prompt=prompt, answer=answer, solution=solution, difficulty=difficulty, **SRC)
    if probe: d["probe"] = probe
    if hint: d["hint"] = hint
    if options: d["options"] = options
    if mis: d["misconceptions"] = [dict(when=m[0], hypothesis=m[1], says=m[2]) for m in mis]
    d.update(kw)
    Q[id] = d
    return id
def screen(title, *text, math=None, widget=None, tip=None):
    d = dict(title=title, text=list(text))
    if math: d["math"] = math
    if widget: d["widget"] = widget
    if tip: d["tip"] = tip
    return d
def strategy(id, title, kind, screens, guided, check, needs=()):
    return dict(id=id, title=title, kind=kind, needs=list(needs), screens=screens, guided=guided, check=check)
MODULES = []
def module(competency, title, chapter, diagnostics, strategies, practice, retention, transfer=(), probes=()):
    MODULES.append(dict(competency=competency, title=title, chapter=chapter, diagnostics=list(diagnostics), strategies=strategies, practice=list(practice), transfer=list(transfer), retention=list(retention), probes=list(probes)))

# ======================================================== Grade 4: equivalent fractions (Journey A, E, F)
EQ = "MATH.number.equivalent-fractions"
q("eq-d1", EQ, "diagnostic", "integer", "A strip is cut into 2 equal parts and 1 part is shaded. The same strip is cut into 4 equal parts instead. How many of the quarter parts cover the same shaded length?", "2",
  "1/2 of the strip is the same length as 2/4: two quarters fit in one half.", probe="concept", skill="MLY.frac.same-whole",
  mis=[("1", "conceptual", "One quarter is only half of the shaded half. Two quarters cover it."), ("4", "conceptual", "4 quarters cover the whole strip, not just the shaded half.")])
q("eq-d2", EQ, "diagnostic", "integer", "Fill in the box: 1/3 = □/6", "2", "6 is 3 × 2, so multiply the top by 2 as well: 1 × 2 = 2. So 1/3 = 2/6.", probe="procedure", skill="MLY.frac.scale",
  mis=[("4", "conceptual", "Adding 3 to the bottom does not mean adding 3 to the top. Equal fractions come from multiplying both by the same number."), ("3", "procedural", "The bottom was doubled, so the top must be doubled too: 1 × 2 = 2.")])
q("eq-d3", EQ, "diagnostic", "integer", "Fill in the box: 2/5 = 6/□", "15", "The top went from 2 to 6, which is × 3, so the bottom is 5 × 3 = 15.", probe="recall", skill="MLY.frac.scale",
  mis=[("9", "conceptual", "From 2 to 6 is × 3 (not + 4). Multiply the bottom by 3 too: 15."), ("10", "procedural", "2 to 6 is × 3, not × 2: 5 × 3 = 15."), ("13", "recall", "The idea is right (× 3), but 5 × 3 = 15.")])
q("eq-s1g", EQ, "guided", "integer", "Using the strips: 1/2 = □/8", "4", "Cut each half into 4 equal pieces: one half becomes 4 eighths.", hint="How many eighths fit in one half of the strip?", skill="MLY.frac.same-whole")
q("eq-s1c", EQ, "check", "integer", "3/4 = □/8", "6", "Each quarter is 2 eighths, so 3 quarters are 6 eighths.", skill="MLY.frac.same-whole", mis=[("7", "conceptual", "Adding 4 to the bottom and to the top does not keep the fraction the same. Each quarter is 2 eighths: 3 × 2 = 6.")])
q("eq-s2g", EQ, "guided", "integer", "2/3 = □/12", "8", "3 × 4 = 12, so multiply the top by 4 as well: 2 × 4 = 8.", hint="What do you multiply 3 by to get 12? Do the same to the top.", skill="MLY.frac.scale")
q("eq-s2c", EQ, "check", "integer", "3/5 = □/20", "12", "5 × 4 = 20, so 3 × 4 = 12.", skill="MLY.frac.scale", mis=[("18", "conceptual", "From 5 to 20 is × 4, not + 15. 3 × 4 = 12.")])
q("eq-s3g", EQ, "guided", "integer", "Four times what is 12? Use it: 1/4 = 3/□", "12", "1 × 3 = 3, so the bottom is 4 × 3 = 12.", hint="The top went from 1 to 3. That is × 3.", skill="MLY.frac.scale")
q("eq-s3c", EQ, "check", "integer", "2/7 = 6/□", "21", "2 × 3 = 6, so 7 × 3 = 21.", skill="MLY.frac.scale", mis=[("11", "conceptual", "From 2 to 6 is × 3, not + 4: 7 × 3 = 21.")])
q("eq-p1", EQ, "practice", "integer", "3/4 = □/12", "9", "4 × 3 = 12 and 3 × 3 = 9.", skill="MLY.frac.scale")
q("eq-p2", EQ, "practice", "choice", "Which fraction is equal to 2/3?", "B", "2/3 = 4/6: both parts multiplied by 2.", options=["4/5", "4/6", "3/4", "6/8"], skill="MLY.frac.check-equal",
  mis=[("A", "conceptual", "4/5 adds 2 to the top and 2 to the bottom. That does not keep the size."), ("D", "procedural", "6/8 = 3/4, not 2/3.")])
q("eq-p3", EQ, "practice", "integer", "5/6 = 15/□", "18", "5 × 3 = 15 and 6 × 3 = 18.", skill="MLY.frac.scale")
q("eq-t1", EQ, "transfer", "integer", "A recipe needs 1/2 cup of milk. Asha's measuring cup is marked in eighths. How many eighths should she pour?", "4", "1/2 = 4/8, so 4 eighths.", probe="transfer", skill="MLY.frac.same-whole")
q("eq-r1", EQ, "retention", "integer", "2/3 = □/9", "6", "3 × 3 = 9 and 2 × 3 = 6.", skill="MLY.frac.scale", mis=[("8", "conceptual", "From 3 to 9 is × 3, not + 6: 2 × 3 = 6.")])
q("eq-r2", EQ, "retention", "integer", "3/5 = 9/□", "15", "3 × 3 = 9 and 5 × 3 = 15.", skill="MLY.frac.scale")
module(EQ, "Generate equivalent fractions", [
    screen("Same size, different pieces", "Two fractions are equal when they cover the same amount of the same whole. Cut the same strip into more pieces and the shaded length does not change.", widget=dict(type="strips", top=2, bottom=4, shaded=1)),
    screen("What changes and what stays", "Cutting every piece into 2 doubles the number of pieces (the bottom) and doubles the number of shaded pieces (the top).", math=["1/2 = (1 × 2)/(2 × 2) = 2/4"], tip="Multiply the top and the bottom by the same number. Adding the same number does not work: 1/2 is not 2/3."),
  ], ["eq-d1", "eq-d2", "eq-d3"], [
    strategy("strip_model", "See it with fraction strips", "conceptual", [screen("One strip, two cuts", "Put a strip cut in halves above the same strip cut in eighths. Count the eighths under one half.", widget=dict(type="strips", top=2, bottom=8, shaded=1))], "eq-s1g", "eq-s1c"),
    strategy("multiply_both", "Multiply top and bottom by the same number", "procedural", [screen("Find the multiplier", "Look at the parts you know. 3 became 12: that is × 4. Do exactly the same to the other part.", math=["2/3 = (2 × 4)/(3 × 4) = 8/12"])], "eq-s2g", "eq-s2c"),
    strategy("times_table_link", "Use the times table you know", "prerequisite", [screen("It is a multiplication fact", "Each equivalent fraction hides a multiplication: 1/4 = 3/12 because 1 × 3 = 3 and 4 × 3 = 12. If the fact is slow, say the times table first.", math=["4 × 3 = 12"])], "eq-s3g", "eq-s3c"),
  ], ["eq-p1", "eq-p2", "eq-p3"], ["eq-r1", "eq-r2"], transfer=["eq-t1"])

# ======================================================== Grade 4: three more fraction skills (assessable tiles)
def small(prefix, comp, title, d, s, r, chapter_screen, strat):
    module(comp, title, [chapter_screen], d, [strat], [f"{prefix}-p1"], r)
FM = "MATH.number.fraction-models"
q("fm-d1", FM, "diagnostic", "choice", "A pizza is cut into 4 pieces of different sizes, and 1 piece is eaten. Is 1/4 of the pizza eaten?", "B", "Quarters must be 4 equal parts. With unequal pieces we cannot say 1/4.", probe="concept", options=["Yes, 1 of 4 pieces", "Not necessarily: the pieces are not equal", "Yes, always", "No, it is 1/3"], mis=[("A", "conceptual", "A fraction counts equal parts. 1 of 4 unequal pieces is not 1/4.")])
q("fm-d2", FM, "diagnostic", "integer", "A chocolate bar has 6 equal pieces. Ravi eats 2. How many sixths are left?", "4", "6 − 2 = 4 pieces, so 4/6 is left.", probe="procedure", mis=[("2", "procedural", "2 pieces were eaten; 4 are left.")])
q("fm-g1", FM, "guided", "integer", "A ribbon is cut into 8 equal parts and 3 are used. How many eighths are left?", "5", "8 − 3 = 5, so 5/8 is left.", hint="Count the equal parts that are not used.")
q("fm-c1", FM, "check", "integer", "A cake has 10 equal slices. 7 are eaten. How many tenths are left?", "3", "10 − 7 = 3, so 3/10.")
q("fm-r1", FM, "retention", "integer", "A garden has 5 equal beds. 2 have flowers. How many fifths have no flowers?", "3", "5 − 2 = 3, so 3/5.")
q("fm-p1", FM, "practice", "integer", "A pie has 3 equal pieces. 1 is left. How many thirds were eaten?", "2", "3 − 1 = 2, so 2/3 was eaten.")
q("fm-r2", FM, "retention", "integer", "A bar has 6 equal pieces. 4 are shaded. How many sixths are not shaded?", "2", "6 − 4 = 2, so 2/6.")
small("fm", FM, "Represent fractions of a whole", ["fm-d1", "fm-d2"], None, ["fm-r1", "fm-r2"], screen("Equal parts", "A fraction names equal parts of one whole. The bottom number says how many equal parts; the top says how many we mean.", math=["A strip cut into 4 equal parts, 1 part shaded", "Equal parts: 4, so the bottom number is 4", "Shaded: 1, so the top number is 1", "The shaded part is 1/4 of the strip"], widget=dict(type="strips", top=4, bottom=4, shaded=1)),
      strategy("equal_parts", "Count equal parts", "conceptual", [screen("Check the parts are equal", "First check that every part is the same size. Then count the parts you need.")], "fm-g1", "fm-c1"))
FC = "MATH.number.fraction-comparison"
q("fc-d1", FC, "diagnostic", "choice", "Which is larger: 3/8 or 5/8?", "B", "Same-sized pieces (eighths): 5 of them is more than 3.", probe="concept", options=["3/8", "5/8", "They are equal", "You cannot tell"], mis=[("A", "conceptual", "Both are eighths, the same size of piece. 5 pieces are more than 3.")])
q("fc-d2", FC, "diagnostic", "choice", "Which is smallest: 4/9, 7/9 or 2/9?", "C", "All ninths: 2 pieces is the fewest.", probe="procedure", options=["4/9", "7/9", "2/9", "They are all equal"])
q("fc-g1", FC, "guided", "choice", "Put in order, smallest first: 5/6, 1/6, 3/6", "A", "Same pieces (sixths), so order by the top: 1/6, 3/6, 5/6.", options=["1/6, 3/6, 5/6", "5/6, 3/6, 1/6", "3/6, 1/6, 5/6", "1/6, 5/6, 3/6"], hint="The pieces are the same size. Compare how many.")
q("fc-c1", FC, "check", "choice", "Which is larger: 6/10 or 4/10?", "A", "Same pieces (tenths): 6 is more than 4.", options=["6/10", "4/10", "They are equal", "You cannot tell"])
q("fc-r1", FC, "retention", "choice", "Which is larger: 2/5 or 4/5?", "B", "Fifths: 4 of them is more than 2.", options=["2/5", "4/5", "They are equal", "You cannot tell"])
q("fc-p1", FC, "practice", "integer", "□/7 is larger than 4/7 and smaller than 6/7. What number goes in the box?", "5", "Sevenths: more than 4 and fewer than 6 is 5.", mis=[("4", "conceptual", "4/7 is equal to 4/7, not larger."), ("6", "conceptual", "6/7 is equal to 6/7, not smaller.")])
q("fc-r2", FC, "retention", "choice", "Which is smaller: 5/9 or 7/9?", "A", "Ninths: 5 of them is fewer than 7.", options=["5/9", "7/9", "They are equal", "You cannot tell"])
small("fc", FC, "Compare fractions with like denominators", ["fc-d1", "fc-d2"], None, ["fc-r1", "fc-r2"], screen("Same pieces", "When the bottom numbers are the same, the pieces are the same size. Then the fraction with more pieces is larger.", math=["Compare 3/7 and 5/7", "Both are sevenths: the pieces are the same size", "5 pieces is more than 3 pieces", "So 5/7 > 3/7"]),
      strategy("same_size_pieces", "Same-size pieces: count them", "conceptual", [screen("Count the pieces", "3/8 and 5/8 are both made of eighths. Compare 3 eighths with 5 eighths.", widget=dict(type="strips", top=8, bottom=8, shaded=3))], "fc-g1", "fc-c1"))
FA = "MATH.number.fraction-add-like"
q("fa-d1", FA, "diagnostic", "fraction", "3/8 + 2/8 = ?", "5/8", "Same pieces: 3 eighths + 2 eighths = 5 eighths.", probe="procedure", mis=[("5/16", "conceptual", "The pieces stay eighths. Add the tops only: 5/8.")])
q("fa-d2", FA, "diagnostic", "fraction", "7/10 − 4/10 = ?", "3/10", "7 tenths − 4 tenths = 3 tenths.", probe="concept", mis=[("3/0", "conceptual", "The pieces stay tenths: 3/10.")])
q("fa-g1", FA, "guided", "fraction", "2/6 + 3/6 = ?", "5/6", "2 sixths + 3 sixths = 5 sixths.", hint="The size of the pieces does not change. Count them.")
q("fa-c1", FA, "check", "fraction", "4/9 + 3/9 = ?", "7/9", "4 ninths + 3 ninths = 7 ninths.", mis=[("7/18", "conceptual", "Ninths plus ninths are still ninths: 7/9.")])
q("fa-r1", FA, "retention", "fraction", "5/7 − 2/7 = ?", "3/7", "5 sevenths − 2 sevenths = 3 sevenths.")
q("fa-p1", FA, "practice", "choice", "Which equals 2/5 + 1/5?", "A", "2 fifths + 1 fifth = 3 fifths. The bottom stays 5.", options=["3/5", "3/10", "2/10", "1/5"], mis=[("B", "procedural", "Add the tops only: the pieces are still fifths, so 3/5.")])
q("fa-r2", FA, "retention", "fraction", "1/6 + 4/6 = ?", "5/6", "1 sixth + 4 sixths = 5 sixths.")
small("fa", FA, "Add and subtract like fractions", ["fa-d1", "fa-d2"], None, ["fa-r1", "fa-r2"], screen("Add the pieces, keep their size", "3/8 + 2/8: three eighths and two eighths make five eighths. The bottom names the piece; it does not change.", math=["3/8 + 2/8", "= (3 + 2) eighths", "= 5/8 (the eighths stay eighths)"]),
      strategy("count_pieces", "Count pieces of the same size", "conceptual", [screen("Pieces are the unit", "Read 3/8 as '3 eighths'. 3 eighths + 2 eighths = 5 eighths, just like 3 apples + 2 apples.")], "fa-g1", "fa-c1"))

# ======================================================== Multiplication facts and 7 × 8 (Journey C)
MT = "MATH.number.multiplication-tables"
q("mt-d1", MT, "diagnostic", "integer", "7 × 8 = ?", "56", "7 × 8 = 56.", probe="recall", skill="MLY.mult.facts-6-9",
  mis=[("15", "conceptual", "7 + 8 = 15. Multiplying means 8 groups of 7."), ("54", "recall", "Close: 7 × 8 is 56."), ("48", "recall", "48 is 6 × 8. 7 × 8 is one more 8: 56."), ("63", "recall", "63 is 7 × 9.")])
q("mt-d2", MT, "diagnostic", "integer", "6 × 7 = ?", "42", "6 × 7 = 42.", probe="recall", skill="MLY.mult.facts-6-9", mis=[("13", "conceptual", "6 + 7 = 13. Multiplying means 6 groups of 7."), ("36", "recall", "36 is 6 × 6; 6 × 7 is 6 more: 42.")])
# what the learner already knows decides the strategy (probes: each tests what one strategy needs)
q("mt-k-77", MT, "probe", "integer", "Quick one: 7 × 7 = ?", "49", "7 × 7 = 49.", skill="MLY.mult.facts-6-9")
q("mt-k-75", MT, "probe", "integer", "Quick one: 7 × 5 = ?", "35", "7 × 5 = 35.", skill="MLY.mult.facts-2-5-10")
q("mt-k-73", MT, "probe", "integer", "Quick one: 7 × 3 = ?", "21", "7 × 3 = 21.", skill="MLY.mult.facts-3-4")
q("mt-k-72", MT, "probe", "integer", "Quick one: 7 × 2 = ?", "14", "7 × 2 = 14.", skill="MLY.mult.facts-2-5-10")
q("mt-k-add", MT, "probe", "integer", "Quick one: 7 + 7 + 7 = ?", "21", "7 + 7 + 7 = 21.", skill="MLY.mult.facts-2-5-10")
q("mt-near-g", MT, "guided", "integer", "8 × 8 = 64. So 8 × 9 = ?", "72", "One more 8: 64 + 8 = 72.", hint="8 × 9 is one more group of 8 than 8 × 8.", skill="MLY.mult.derive")
q("mt-near-c", MT, "check", "integer", "6 × 6 = 36. So 6 × 7 = ?", "42", "One more 6: 36 + 6 = 42.", skill="MLY.mult.derive")
q("mt-dec-g", MT, "guided", "integer", "7 × 6 = 7 × 5 + 7 × 1 = 35 + 7 = ?", "42", "35 + 7 = 42.", hint="Add the two parts.", skill="MLY.mult.derive")
q("mt-dec-c", MT, "check", "integer", "6 × 8 = ? (Split 8 into 5 + 3 if it helps.)", "48", "6 × 5 = 30 and 6 × 3 = 18; 30 + 18 = 48.", skill="MLY.mult.derive", mis=[("14", "conceptual", "6 + 8 = 14; we need 8 groups of 6."), ("46", "recall", "6 × 5 = 30 and 6 × 3 = 18: 30 + 18 = 48.")])
q("mt-dbl-g", MT, "guided", "integer", "6 × 2 = 12. Double it: 6 × 4 = ?", "24", "12 doubled is 24.", hint="Double 12.", skill="MLY.mult.derive")
q("mt-dbl-c", MT, "check", "integer", "9 × 8 = ? (9 × 2 = 18; keep doubling.)", "72", "18, 36, 72: three doublings of 18 → 9 × 8 = 72.", skill="MLY.mult.derive")
q("mt-add-g", MT, "guided", "integer", "6 × 4 = 6 + 6 + 6 + 6 = ?", "24", "6, 12, 18, 24.", hint="Count on in sixes.", skill="MLY.mult.facts-6-9")
q("mt-add-c", MT, "check", "integer", "4 × 7 = ?", "28", "7, 14, 21, 28.", skill="MLY.mult.facts-6-9")
q("mt-arr-g", MT, "guided", "integer", "An array has 3 rows of 6 dots. How many dots?", "18", "6, 12, 18.", hint="Count one row, then add a row at a time.", skill="MLY.mult.facts-6-9")
q("mt-arr-c", MT, "check", "integer", "An array has 4 rows of 6 dots. How many dots?", "24", "6 + 6 + 6 + 6 = 24.", skill="MLY.mult.facts-6-9")
q("mt-r1", MT, "retention", "integer", "8 × 7 = ?", "56", "8 × 7 = 56.", skill="MLY.mult.facts-6-9")
q("mt-r2", MT, "retention", "integer", "9 × 6 = ?", "54", "9 × 6 = 54.", skill="MLY.mult.facts-6-9")
q("mt-p1", MT, "practice", "choice", "Which equals 8 × 6?", "C", "8 × 6 = 8 × 5 + 8 = 40 + 8 = 48.", options=["42", "46", "48", "54"], skill="MLY.mult.facts-6-9", mis=[("A", "recall", "42 is 6 × 7. 8 × 6 is 6 more: 48."), ("D", "recall", "54 is 9 × 6. 8 × 6 is 6 less: 48.")])
module(MT, "Multiplication facts", [screen("A fact you can rebuild", "Every multiplication fact can be rebuilt from facts you already know: a near fact, a split, or doubling.", widget=dict(type="array", rows=7, cols=8, split=5))],
  ["mt-d1", "mt-d2"], [
    strategy("near_fact", "Use a fact next door", "recall", [screen("One more group", "7 × 8 is one more 7 than 7 × 7. If you know 7 × 7 = 49, add 7.", math=["7 × 8 = 7 × 7 + 7 = 49 + 7 = 56"])], "mt-near-g", "mt-near-c", needs=["mt-k-77"]),
    strategy("decomposition", "Split it into facts you know", "recall", [screen("Split the 8", "8 = 5 + 3. Seven fives and seven threes are facts you know. Add them.", math=["7 × 8 = 7 × 5 + 7 × 3", "= 35 + 21 = 56"], widget=dict(type="array", rows=7, cols=8, split=5))], "mt-dec-g", "mt-dec-c", needs=["mt-k-75", "mt-k-73"]),
    strategy("doubling", "Double, double, double", "recall", [screen("8 is 2 × 2 × 2", "Start from 7 × 2 = 14 and double three times: 28, then 56.", math=["7 × 2 = 14", "7 × 4 = 28", "7 × 8 = 56"])], "mt-dbl-g", "mt-dbl-c", needs=["mt-k-72"]),
    strategy("repeated_addition", "Add groups one at a time", "conceptual", [screen("Eight sevens", "7 × 8 means 8 groups of 7: 7, 14, 21, 28, 35, 42, 49, 56.")], "mt-add-g", "mt-add-c", needs=["mt-k-add"]),
    strategy("visual_groups", "See the groups as an array", "conceptual", [screen("Rows of dots", "Draw 8 rows of 7 dots. Count 5 rows (35) and 3 more rows (21).", widget=dict(type="array", rows=8, cols=7, split=5))], "mt-arr-g", "mt-arr-c"),
  ], ["mt-p1"], ["mt-r1", "mt-r2"], probes=["mt-k-77", "mt-k-75", "mt-k-73", "mt-k-72", "mt-k-add"])

# ======================================================== Journey C supporting skills
RA = "MATH.measurement.rectangle-area"
q("ra-d1", RA, "diagnostic", "integer", "A rectangle is 6 cm long and 4 cm wide. What is its area in square centimetres?", "24", "Area = length × width = 6 × 4 = 24.", probe="procedure", mis=[("20", "conceptual", "20 is the perimeter (6 + 4 + 6 + 4). Area is length × width: 24.")])
q("ra-d2", RA, "diagnostic", "integer", "A square has sides of 5 m. What is its area in square metres?", "25", "5 × 5 = 25.", probe="concept", mis=[("20", "conceptual", "20 is the perimeter. Area is 5 × 5 = 25.")])
q("ra-g1", RA, "guided", "integer", "A rectangle is 9 m by 3 m. Area in square metres?", "27", "9 × 3 = 27.", hint="Rows of 9 squares, 3 rows.")
q("ra-c1", RA, "check", "integer", "A rectangle is 8 cm by 5 cm. Area in square centimetres?", "40", "8 × 5 = 40.")
q("ra-r1", RA, "retention", "integer", "A rectangle is 7 m by 4 m. Area in square metres?", "28", "7 × 4 = 28.")
q("ra-p1", RA, "practice", "choice", "Which rectangle has an area of 36 square centimetres?", "B", "6 × 6 = 36. The others: 4 × 8 = 32, 5 × 7 = 35, 3 × 10 = 30.", options=["4 cm by 8 cm", "6 cm by 6 cm", "5 cm by 7 cm", "3 cm by 10 cm"])
q("ra-r2", RA, "retention", "integer", "A rectangle is 9 cm by 3 cm. Area in square centimetres?", "27", "9 × 3 = 27.")
module(RA, "Calculate rectangle area", [screen("Rows of squares", "A 6 by 4 rectangle holds 4 rows of 6 unit squares: 6 × 4 = 24.", math=["Length 6 cm, width 4 cm", "4 rows of 6 squares of 1 cm²", "Area = 6 × 4 = 24 cm²"], widget=dict(type="array", rows=4, cols=6))], ["ra-d1", "ra-d2"],
  [strategy("rows_of_squares", "Count rows of squares", "conceptual", [screen("Length × width", "One row has 'length' squares; there are 'width' rows.")], "ra-g1", "ra-c1")], ["ra-p1"], ["ra-r1", "ra-r2"])
CA = "MATH.coordinate.cartesian"
q("ca-d1", CA, "diagnostic", "choice", "Which point is 3 to the right of the origin and 2 down?", "C", "x = 3 (right), y = −2 (down): (3, −2).", probe="concept", options=["(2, 3)", "(−2, 3)", "(3, −2)", "(−3, 2)"], mis=[("A", "conceptual", "x comes first and goes across; y goes up or down.")])
q("ca-d2", CA, "diagnostic", "integer", "The point (4, 7) is how far above the x-axis?", "7", "The y-coordinate, 7.", probe="procedure")
q("ca-g1", CA, "guided", "choice", "Which point is on the y-axis?", "B", "On the y-axis, x = 0.", options=["(3, 0)", "(0, 5)", "(2, 2)", "(−1, 1)"], hint="Which point has no movement across?")
q("ca-c1", CA, "check", "integer", "The point (−6, 2) is how far from the y-axis?", "6", "The distance across is 6.")
q("ca-r1", CA, "retention", "choice", "In which quadrant is (−2, −5)?", "C", "Both negative: the third quadrant.", options=["First", "Second", "Third", "Fourth"])
q("ca-p1", CA, "practice", "choice", "In which quadrant is (−3, 4)?", "B", "x negative, y positive: the second quadrant.", options=["First", "Second", "Third", "Fourth"])
q("ca-r2", CA, "retention", "choice", "In which quadrant is (4, −1)?", "D", "x positive, y negative: the fourth quadrant.", options=["First", "Second", "Third", "Fourth"])
module(CA, "Plot points in four quadrants", [screen("Across, then up", "A point (x, y) is x across from the origin, then y up (negative: left or down).", math=["Plot (−3, 2)", "Start at the origin (0, 0)", "x = −3: move 3 to the left", "y = 2: then move 2 up", "The point is in the second quadrant"])], ["ca-d1", "ca-d2"],
  [strategy("across_then_up", "Across first, then up or down", "conceptual", [screen("Walk to the point", "Start at (0, 0). Walk x across, then y up.")], "ca-g1", "ca-c1")], ["ca-p1"], ["ca-r1", "ca-r2"])
DI = "MATH.calculus.definite-integrals"
q("di-d1", DI, "diagnostic", "integer", "The integral of 3 from x = 0 to x = 4 is the area of a rectangle. What is it?", "12", "Height 3, width 4: area 12.", probe="concept")
q("di-d2", DI, "diagnostic", "integer", "∫ from 1 to 5 of 2 dx = ?", "8", "Width 5 − 1 = 4, height 2: 8.", probe="procedure", mis=[("10", "procedural", "The width is 5 − 1 = 4, not 5: 2 × 4 = 8.")])
q("di-g1", DI, "guided", "integer", "∫ from 0 to 6 of 5 dx = ?", "30", "Height 5, width 6: 30.", hint="Draw the rectangle under y = 5.")
q("di-c1", DI, "check", "integer", "∫ from 2 to 7 of 4 dx = ?", "20", "Width 5, height 4: 20.")
q("di-r1", DI, "retention", "integer", "∫ from 0 to 3 of 9 dx = ?", "27", "Width 3, height 9: 27.")
q("di-p1", DI, "practice", "choice", "Which equals ∫ from 1 to 5 of 6 dx?", "C", "Width 5 − 1 = 4, height 6: 4 × 6 = 24.", options=["30", "6", "24", "20"])
q("di-r2", DI, "retention", "integer", "∫ from 2 to 6 of 5 dx = ?", "20", "Width 6 − 2 = 4, height 5: 20.")
module(DI, "Evaluate definite integrals", [screen("Area under a graph", "∫ from a to b of f(x) dx is the area under y = f(x) between x = a and x = b. Under a constant it is a rectangle.", math=["∫ from 1 to 4 of 3 dx", "The graph y = 3 is a horizontal line", "Width 4 − 1 = 3, height 3", "Area = 3 × 3 = 9"])], ["di-d1", "di-d2"],
  [strategy("rectangle_picture", "Picture the rectangle", "conceptual", [screen("Width × height", "Under y = c from x = a to x = b: width b − a, height c.")], "di-g1", "di-c1")], ["di-p1"], ["di-r1", "di-r2"])
AI = "MATH.calculus.area-integrals"
q("ai-original", AI, "original", "integer", "Find ∫ from 0 to 8 of 7 dx: the area under y = 7 from x = 0 to x = 8.", "56", "The region is a rectangle 8 wide and 7 high: 8 × 7 = 56.", probe="transfer", skill="MLY.calc.area-constant",
  mis=[("15", "prerequisite", "15 is 7 + 8. The area of the rectangle is 7 × 8."), ("54", "prerequisite", "The method is right: the area is 7 × 8. The multiplication fact is 56.")])
q("ai-c1", AI, "check", "integer", "Find ∫ from 0 to 9 of 6 dx.", "54", "A 9 by 6 rectangle: 54.", skill="MLY.calc.area-constant")

# ======================================================== Grade 5: factors and reasoning challenges (Journey B)
FMU = "MATH.number.factors-multiples"
q("fx-d1", FMU, "diagnostic", "integer", "How many factors does 12 have? (Count 1 and 12.)", "6", "1, 2, 3, 4, 6, 12.", probe="concept", mis=[("4", "procedural", "Remember 1 and 12 themselves: 1, 2, 3, 4, 6, 12.")])
q("fx-d2", FMU, "diagnostic", "integer", "What is the smallest number, other than 0, that is a multiple of both 4 and 6?", "12", "Multiples of 4: 4, 8, 12…; of 6: 6, 12… → 12.", probe="procedure", mis=[("24", "procedural", "24 works, but 12 is smaller."), ("2", "conceptual", "2 is a common factor. A multiple is in the times table: 12.")])
q("fx-g1", FMU, "guided", "integer", "How many factors does 18 have?", "6", "1, 2, 3, 6, 9, 18.", hint="Find factor pairs: 1 × 18, 2 × 9, 3 × 6.")
q("fx-c1", FMU, "check", "integer", "What is the smallest number, other than 0, that is a multiple of both 6 and 8?", "24", "6, 12, 18, 24 and 8, 16, 24 → 24.")
q("fx-r1", FMU, "retention", "integer", "How many factors does 20 have?", "6", "1, 2, 4, 5, 10, 20.")
q("fx-p1", FMU, "practice", "choice", "Which is a factor of 18?", "D", "18 = 6 × 3, so 6 is a factor. 4, 5 and 7 do not divide 18.", options=["4", "5", "7", "6"])
q("fx-r2", FMU, "retention", "integer", "How many factors does 15 have?", "4", "1, 3, 5, 15.")
module(FMU, "Find factors and multiples", [screen("Factor pairs", "Factors come in pairs that multiply to the number: 12 = 1 × 12 = 2 × 6 = 3 × 4.", math=["Factors of 12: try 1, 2, 3, … in turn", "1 × 12, 2 × 6, 3 × 4 (4 × 3 repeats a pair: stop)", "Factors: 1, 2, 3, 4, 6, 12"], widget=dict(type="array", rows=3, cols=4))], ["fx-d1", "fx-d2"],
  [strategy("factor_pairs", "Find the factor pairs", "procedural", [screen("Pairs", "Try 1, 2, 3, … and stop when the pairs meet.")], "fx-g1", "fx-c1")], ["fx-p1"], ["fx-r1", "fx-r2"])
q("ch-remainder", FMU, "challenge", "integer", "Reasoning challenge: find the smallest number greater than 1 that leaves remainder 1 when divided by 2, by 3 and by 4.", "13", "A multiple of 12 (the smallest common multiple of 2, 3, 4) plus 1: 12 + 1 = 13.", goals=["jee-advanced", "jee-main"], readiness=[FMU])
q("ch-triangle", "MATH.algebra.expressions-intro", "challenge", "integer", "Pattern challenge: 1, 3, 6, 10, 15, … What is the 8th number?", "36", "Add 2, 3, 4, …: 21, 28, 36. The 8th is 1 + 2 + … + 8 = 36.", goals=["jee-advanced", "jee-main"], readiness=[FMU])
q("ch-counter", "MATH.reasoning.counterexamples-intro", "challenge", "choice", "Reasoning challenge: Meena says every number ending in 1 is prime. Which number shows she is wrong?", "B", "21 = 3 × 7 ends in 1 but is not prime.", options=["11", "21", "31", "41"], goals=["jee-advanced", "jee-main"], readiness=[FMU])

# ======================================================== Grade 10: quadratic equations (Journey D readiness)
QD = "MATH.algebra.quadratics"
q("qd-d1", QD, "diagnostic", "set", "Solve x² − 5x + 6 = 0. Give both solutions, separated by a comma.", "2,3", "Two numbers that multiply to 6 and add to 5: 2 and 3. (x − 2)(x − 3) = 0, so x = 2 or x = 3.", probe="procedure",
  mis=[("-2,-3", "procedural", "(x + 2)(x + 3) gives + 5x. Here it is − 5x, so the factors are (x − 2)(x − 3): x = 2 or 3."), ("6", "conceptual", "6 is the constant term, not a solution. Find x that makes the expression zero.")])
q("qd-d2", QD, "diagnostic", "integer", "x² = 49 and x is positive. What is x?", "7", "7 × 7 = 49.", probe="recall", mis=[("24", "conceptual", "x² means x × x, not x × 2. 7 × 7 = 49.")])
q("qd-d3", QD, "diagnostic", "choice", "How many real solutions does x² + 1 = 0 have?", "A", "x² is never negative, so x² + 1 is at least 1 and is never 0: no real solutions.", probe="concept", options=["None", "One", "Two", "Infinitely many"],
  mis=[("C", "conceptual", "A square is never negative, so x² = −1 has no real solution.")])
q("qd-g1", QD, "guided", "set", "Solve x² − 7x + 12 = 0.", "3,4", "3 × 4 = 12 and 3 + 4 = 7: (x − 3)(x − 4) = 0.", hint="Find two numbers that multiply to 12 and add to 7.")
q("qd-c1", QD, "check", "set", "Solve x² − x − 6 = 0.", "-2,3", "−2 × 3 = −6 and −2 + 3 = 1: (x + 2)(x − 3) = 0, so x = −2 or 3.", mis=[("2,-3", "procedural", "Check the middle term: (x − 2)(x + 3) gives + x. We need − x: (x + 2)(x − 3).")])
q("qd-p1", QD, "practice", "set", "Solve x² + 5x + 4 = 0.", "-4,-1", "1 × 4 = 4 and 1 + 4 = 5: (x + 1)(x + 4) = 0, so x = −1 or −4.")
q("qd-p2", QD, "practice", "choice", "Which number is a solution of x² − 9 = 0?", "B", "3² = 9, so 3² − 9 = 0. (−3 is also a solution.)", options=["9", "3", "81", "0"])
q("qd-t1", QD, "transfer", "integer", "A rectangle is 2 cm longer than it is wide. Its area is 15 cm². How wide is it, in cm?", "3", "w(w + 2) = 15, so w² + 2w − 15 = 0, (w + 5)(w − 3) = 0. A width is positive: w = 3.")
q("qd-s2g", QD, "guided", "choice", "How many real solutions does x² = 16 have?", "C", "4 × 4 = 16 and (−4) × (−4) = 16: two solutions.", options=["None", "One", "Two", "Infinitely many"], hint="Try a negative number too.")
q("qd-s2c", QD, "check", "choice", "How many real solutions does x² + 4 = 0 have?", "A", "x² + 4 is at least 4, never 0.", options=["None", "One", "Two", "Infinitely many"])
q("qd-r1", QD, "retention", "set", "Solve x² − 8x + 15 = 0.", "3,5", "3 × 5 = 15 and 3 + 5 = 8.")
q("qd-r2", QD, "retention", "set", "Solve x² + x − 2 = 0.", "-2,1", "(x + 2)(x − 1) = 0.")
module(QD, "Solve quadratic equations", [screen("Zero products", "If a product is zero, one of its factors is zero. Factorise, then set each factor to zero.", math=["x² − 5x + 6 = (x − 2)(x − 3)", "x − 2 = 0 or x − 3 = 0"])], ["qd-d1", "qd-d2", "qd-d3"],
  [strategy("two_numbers", "Find two numbers", "procedural", [screen("Multiply to c, add to b", "For x² + bx + c, find two numbers that multiply to c and add to b. They give the factors.", math=["x² − 7x + 12: −3 × −4 = 12, −3 + −4 = −7", "(x − 3)(x − 4) = 0"])], "qd-g1", "qd-c1"),
   strategy("square_meaning", "What a square can be", "conceptual", [screen("Squares are never negative", "x² is x × x. It is 0 or positive for every real x, so x² = −1 has no real solution and x² = 49 has two: 7 and −7.")], "qd-s2g", "qd-s2c")],
  ["qd-p1", "qd-p2"], ["qd-r1", "qd-r2"], transfer=["qd-t1"])

# ======================================================== Journey D: one advanced problem, decomposed
PROBLEMS = [dict(
  id="area-parabola-line", title="Region between a parabola and a line", **SRC,
  style="In the style of a JEE Advanced area question. Original, not a past paper.",
  validation="Answers computed and checked in packages/learning/src/content.test.ts; not educator-reviewed.",
  competencies=["MATH.algebra.variables", "MATH.coordinate.cartesian", "MATH.algebra.quadratics", "MATH.algebra.functions", "MATH.algebra.inequalities", "MATH.calculus.definite-integrals", "MATH.calculus.area-integrals"],
  full=dict(id="area-parabola-line.full", type="fraction", prompt="Find the area of the region {(x, y) : x² ≤ y ≤ x + 2}.", answer="9/2",
            solution="x² = x + 2 gives x = −1 and x = 2. Area = ∫ from −1 to 2 of (x + 2 − x²) dx = [x²/2 + 2x − x³/3] from −1 to 2 = 10/3 − (−7/6) = 9/2.",
            competencies=["MATH.algebra.quadratics", "MATH.algebra.inequalities", "MATH.calculus.definite-integrals", "MATH.calculus.area-integrals"], minGrade=11, readiness=["MATH.algebra.quadratics", "MATH.calculus.definite-integrals"]),
  fragments=[
    dict(id="area-parabola-line.g7", type="integer", prompt="On the line y = x + 2, what is y when x = 3?", answer="5", solution="y = 3 + 2 = 5.", competencies=["MATH.algebra.variables", "MATH.coordinate.cartesian"], minGrade=7, maxGrade=7, readiness=[]),
    dict(id="area-parabola-line.g8", type="set", prompt="Try whole numbers x from −3 to 3. For which of them is x × x equal to x + 2? Enter both, separated by a comma.", answer="-1,2", solution="(−1) × (−1) = 1 = −1 + 2, and 2 × 2 = 4 = 2 + 2. No other whole number from −3 to 3 works.", competencies=["MATH.algebra.linear-equations", "MATH.coordinate.cartesian"], minGrade=8, maxGrade=9, readiness=[]),
    dict(id="area-parabola-line.g10", type="set", prompt="Solve x² = x + 2. Enter both solutions, separated by a comma.", answer="-1,2", solution="x² − x − 2 = 0, (x − 2)(x + 1) = 0.", competencies=["MATH.algebra.quadratics"], minGrade=10, readiness=[]),
    dict(id="area-parabola-line.g11", type="choice", prompt="Between x = −1 and x = 2, which graph is higher: y = x + 2 or y = x²? (Try x = 0.)", answer="A", options=["y = x + 2", "y = x²", "They are equal everywhere there", "It changes at x = 0"], solution="At x = 0: x + 2 = 2 and x² = 0. The line is above the parabola between the crossing points.", competencies=["MATH.algebra.functions", "MATH.algebra.inequalities"], minGrade=11, readiness=["MATH.algebra.quadratics"]),
  ])]

# ======================================================== goal pathways
GOALS = [
  dict(id="jee-advanced", name="JEE Advanced", examTrack="jee-advanced", status="provisional",
       note="An overlay on the shared graph. Weights are provisional ranges, not a fixed marks allocation.",
       foundations=dict(strands=["number", "algebra", "reasoning", "geometry"], note="For younger learners: number sense, fractions, patterns, reasoning and proof-like thinking within their own grade."),
       topics=[dict(id="algebra", competencies=["MATH.algebra.quadratics", "MATH.algebra.quadratic-complex", "MATH.algebra.arithmetic-sequences", "MATH.algebra.binomial", "MATH.algebra.permutations"], weight=[0.2, 0.35]),
               dict(id="calculus", competencies=["MATH.calculus.limits", "MATH.calculus.derivative-rules", "MATH.calculus.definite-integrals", "MATH.calculus.area-integrals"], weight=[0.2, 0.35]),
               dict(id="coordinate", competencies=["MATH.coordinate.straight-lines", "MATH.coordinate.conics"], weight=[0.1, 0.25]),
               dict(id="vectors-3d", competencies=["MATH.vectors.algebra", "MATH.coordinate.space-lines"], weight=[0.05, 0.2]),
               dict(id="probability", competencies=["MATH.probability.conditional", "MATH.probability.bayes"], weight=[0.05, 0.15])],
       marking=dict(correct=4, wrong=-1, note="Varies by paper and section; a configurable default, not a claim about any year's paper."),
       exam=dict(pattern="example pattern (the paper changes every year; not authoritative)", verified=False, durationMinutes=180, papers=2,
                 sections=[dict(id="single", format="mcq-single", questions=4, marking=dict(correct=3, wrong=-1, blank=0)),
                           dict(id="multiple", format="mcq-multiple", questions=4, marking=dict(correct=4, wrong=-2, blank=0, partialPerOption=1)),
                           dict(id="numerical", format="numerical", questions=6, marking=dict(correct=4, wrong=0, blank=0))],
                 note="JEE Advanced changes its sections and marking every year: confirm against that year's official paper before use.")),
  dict(id="jee-main", name="JEE Main", examTrack="jee-main", status="provisional",
       note="An overlay on the shared graph. Weights are provisional ranges, not a fixed marks allocation.",
       foundations=dict(strands=["number", "algebra", "reasoning", "geometry"], note="As for JEE Advanced."),
       topics=[dict(id="algebra", competencies=["MATH.algebra.quadratics", "MATH.algebra.arithmetic-sequences", "MATH.algebra.binomial"], weight=[0.2, 0.35]),
               dict(id="calculus", competencies=["MATH.calculus.limits", "MATH.calculus.derivative-rules", "MATH.calculus.definite-integrals"], weight=[0.2, 0.35]),
               dict(id="coordinate", competencies=["MATH.coordinate.straight-lines", "MATH.coordinate.conics"], weight=[0.1, 0.25])],
       marking=dict(correct=4, wrong=-1, note="NTA Information Bulletin JEE (Main) 2026: +4 / −1 / 0."),
       exam=dict(pattern="2026 (provisional)", verified=False, durationMinutes=180, papers=1,
                 sections=[dict(id="A", format="mcq-single", questions=20, marking=dict(correct=4, wrong=-1, blank=0)),
                           dict(id="B", format="numerical", questions=5, marking=dict(correct=4, wrong=-1, blank=0), disputed="Published summaries disagree on negative marking for Section B; confirm against the official NTA bulletin.")],
                 note="Mathematics part only (the paper also has physics and chemistry).")),
  dict(id="gre-quant", name="GRE Quantitative", examTrack="gre-quant", status="provisional", note="An overlay; weights provisional.",
       foundations=dict(strands=["number", "algebra", "statistics", "geometry"], note="Arithmetic, algebra, data analysis."),
       topics=[dict(id="arithmetic", competencies=["MATH.number.percentage", "MATH.number.ratio"], weight=[0.2, 0.35]), dict(id="algebra", competencies=["MATH.algebra.linear-equations", "MATH.algebra.quadratics"], weight=[0.2, 0.35]), dict(id="data", competencies=["MATH.statistics.averages-intro", "MATH.statistics.dispersion"], weight=[0.15, 0.3])],
       marking=dict(correct=1, wrong=0, note="No negative marking."),
       exam=dict(pattern="shorter GRE (from September 2023; provisional)", verified=False, durationMinutes=47, papers=1,
                 sections=[dict(id="quant-1", format="mixed", questions=12, marking=dict(correct=1, wrong=0, blank=0)), dict(id="quant-2", format="mixed", questions=15, marking=dict(correct=1, wrong=0, blank=0))],
                 formats=["quantitative comparison", "multiple choice, one answer", "multiple choice, one or more answers (all correct choices needed)", "numeric entry"],
                 note="Section-level adaptive; scaled scores 130–170 are not modelled.")),
]

# ======================================================== platform: complete the small modules (practice in a second
# format, and a transfer question), so each passes validate@1. New ids only: no existing question changes.
EXTRA = {
    FM: [q("fm-p2", FM, "practice", "choice", "A bar is cut into 5 equal parts and 2 are shaded. What fraction is shaded?", "A", "2 of 5 equal parts: 2/5.", options=["2/5", "2/3", "5/2", "3/5"], mis=[("B", "conceptual", "2/3 compares shaded with unshaded parts; a fraction compares shaded parts with all the equal parts."), ("C", "procedural", "The top and bottom are swapped: the bottom counts all the equal parts."), ("D", "conceptual", "3/5 is the part that is not shaded.")]),
         q("fm-t1", FM, "transfer", "integer", "A ribbon is cut into 8 equal pieces. Sam uses 3 pieces for a gift. How many eighths of the ribbon are left?", "5", "8 − 3 = 5 equal pieces, so 5/8 is left.", probe="transfer")],
    FC: [q("fc-p2", FC, "practice", "integer", "□/9 is smaller than 3/9 and larger than 1/9. What number goes in the box?", "2", "Ninths: more than 1 and fewer than 3 is 2."),
         q("fc-t1", FC, "transfer", "choice", "Asha ate 2/6 of a cake and Ravi ate 4/6 of the same cake. Who ate more?", "B", "Both are sixths of the same cake: 4 pieces are more than 2.", probe="transfer", options=["Asha", "Ravi", "They ate the same", "You cannot tell"], mis=[("A", "conceptual", "Both are sixths of one cake, so the one with more sixths ate more.")])],
    FA: [q("fa-p2", FA, "practice", "fraction", "3/7 + 2/7 = ?", "5/7", "3 sevenths + 2 sevenths = 5 sevenths.", mis=[("5/14", "procedural", "The bottom numbers were added too; sevenths stay sevenths.")]),
         q("fa-t1", FA, "transfer", "fraction", "A jug is 2/9 full. You pour in another 5/9 of a jug. How full is it now?", "7/9", "2 ninths + 5 ninths = 7 ninths.", probe="transfer", mis=[("7/18", "procedural", "The bottom numbers were added too; ninths stay ninths.")])],
    MT: [q("mt-p2", MT, "practice", "integer", "7 × 6 = ?", "42", "7 × 5 = 35, and one more 7 is 42.", skill="MLY.mult.facts-6-9", mis=[("48", "recall", "48 is 8 × 6. 7 × 6 is one 6 less: 42."), ("13", "conceptual", "7 and 6 were added; 7 × 6 is 7 groups of 6.")]),
         q("mt-t1", MT, "transfer", "integer", "Chairs are set out in 8 rows of 7. How many chairs are there?", "56", "8 rows of 7: 8 × 7 = 56.", probe="transfer", skill="MLY.mult.facts-6-9")],
    RA: [q("ra-p2", RA, "practice", "integer", "A rectangle is 9 cm by 4 cm. What is its area in square centimetres?", "36", "9 × 4 = 36 unit squares.", mis=[("26", "conceptual", "26 cm is the perimeter (the distance around); area is the space inside: 9 × 4."), ("13", "conceptual", "The sides were added; area multiplies them.")]),
         q("ra-t1", RA, "transfer", "integer", "A floor is 6 m long and 5 m wide. How many tiles 1 m by 1 m cover it?", "30", "6 rows of 5 tiles: 6 × 5 = 30.", probe="transfer")],
    CA: [q("ca-p2", CA, "practice", "integer", "The point (−4, □) is on the x-axis. What number goes in the box?", "0", "Every point on the x-axis has y = 0."),
         q("ca-t1", CA, "transfer", "integer", "On a map grid you start at (1, 2) and move 3 units left. What is your new x-coordinate?", "-2", "Left lowers x: 1 − 3 = −2.", probe="transfer", mis=[("4", "conceptual", "Moving left makes x smaller, not larger."), ("2", "procedural", "The sign was dropped: 1 − 3 is −2.")])],
    DI: [q("di-p2", DI, "practice", "integer", "∫ from 2 to 7 of 3 dx = ?", "15", "Width 7 − 2 = 5, height 3: 5 × 3 = 15.", mis=[("21", "conceptual", "Only the upper limit was used; the width is 7 − 2."), ("18", "procedural", "The whole numbers from 2 to 7 were counted; the width is 7 − 2 = 5.")]),
         q("di-t1", DI, "transfer", "integer", "A tap adds water at a steady 4 litres per minute from minute 3 to minute 10. The water added is ∫ from 3 to 10 of 4 dt. How many litres is that?", "28", "Width 10 − 3 = 7 minutes, height 4 litres per minute: 7 × 4 = 28 litres.", probe="transfer")],
    FMU: [q("fx-p2", FMU, "practice", "integer", "What is the smallest number that is a multiple of both 4 and 6?", "12", "Multiples of 6: 6, 12. 12 is also 4 × 3.", mis=[("24", "procedural", "4 × 6 = 24 is a common multiple, but 12 is smaller.")]),
          q("fx-t1", FMU, "transfer", "integer", "A class of 24 is split into equal teams of more than 1 and fewer than 24 pupils. How many different team sizes are possible?", "6", "The factors of 24 between 2 and 23: 2, 3, 4, 6, 8, 12. That is 6 sizes.", probe="transfer")],
}
for m in MODULES:
    for qid in EXTRA.get(m["competency"], []):
        (m["transfer"] if Q[qid]["role"] == "transfer" else m["practice"]).append(qid)

ids = set(Q)
for m in MODULES:
    for qid in m["diagnostics"] + m["practice"] + m["retention"] + m["transfer"] + m["probes"] + [x for s in m["strategies"] for x in [s["guided"], s["check"]] + s["needs"]]:
        assert qid in ids, (m["competency"], qid)
        assert Q[qid]["competency"] == m["competency"], (qid, m["competency"])
for x in Q.values():
    if x["type"] == "choice": assert len(x["options"]) == 4 and x["answer"] in "ABCD", x["id"]
json.dump(dict(version="1.0.0", status="provisional", note="Original, written for OpenPath (CC0). Not educator-reviewed: every question is provisional and can never verify mastery until reviewed and released.", modules=MODULES, questions=list(Q.values())), open(os.path.join(OUT, "modules.v1.json"), "w"), ensure_ascii=False, indent=1)
json.dump(dict(version="1.0.0", status="provisional", problems=PROBLEMS), open(os.path.join(OUT, "problems.v1.json"), "w"), ensure_ascii=False, indent=1)
json.dump(dict(version="1.0.0", status="provisional", goals=GOALS), open(os.path.join(OUT, "goals.v1.json"), "w"), ensure_ascii=False, indent=1)
print(len(MODULES), "modules,", len(Q), "questions,", len(PROBLEMS), "problems,", len(GOALS), "goals")
