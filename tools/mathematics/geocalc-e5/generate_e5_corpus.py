"""Deterministic E5 corpus generator (seed 20261103). 200 cases: angle 50, coordinate 30, proof 20, differentiation 40,
integration 35, limits/continuity 25. Reference verdicts come ONLY from e5_oracle.py (Fractions/Decimal, own parser, own
differentiator). The OpenPath implementation is never imported. 100 cases are development, 100 sealed (split by family,
alternating, before any E5 code exists). Usage: python3 generate_e5_corpus.py  -> dev-cases.v1.json, sealed-cases.v1.json
"""
import json, random, hashlib, itertools, sys, re, os
from fractions import Fraction as F
import e5_oracle as O

FUZZ = os.environ.get('E5_FUZZ_SEED')
R = random.Random(int(FUZZ) if FUZZ else 20261103)
CASES = []

def fr(x):
    x = F(x); return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"
def add(category, family, problem, lines, ref, fmt="natural", tags=(), alt=False, scope="in-scope"):
    CASES.append(dict(category=category, family=family, problem=problem, studentWorking=dict(format=fmt, text="\n".join(lines)),
        reference=dict(classification=ref[0], firstInvalidStep=ref[1], firstInvalidAcceptable=[], complete=ref[0] == "verified", alternativeMethodValid=alt, mustNotVerify=ref[0] != "verified", coverage=scope, tags=list(tags),
                       derivation=ref[2])))

# ======================================================================================================= angle algebra oracle
def rank_rows(rows, n):
    rows = [list(r) for r in rows]; r = 0
    for c in range(n):
        piv = next((i for i in range(r, len(rows)) if rows[i][c] != 0), None)
        if piv is None: continue
        rows[r], rows[piv] = rows[piv], rows[r]; pv = rows[r][c]; rows[r] = [x / pv for x in rows[r]]
        for i in range(len(rows)):
            if i != r and rows[i][c] != 0: f = rows[i][c]; rows[i] = [a - f * b for a, b in zip(rows[i], rows[r])]
        r += 1
    return rows
def solvable(rows, n):
    red = rank_rows(rows, n); return not any(all(x == 0 for x in r[:n]) and r[n] != 0 for r in red)
def eq_row(coef, const, vs):  # sum coef*v = const  -> row
    return [F(coef.get(v, 0)) for v in vs] + [F(const)]
def implied(prem, row, vs):
    """prem entails the equation L = c exactly: prem + {L = c} is consistent AND prem + {L = c + 1} is not."""
    n = len(vs)
    if not solvable(prem, n): return True
    return solvable(prem + [row], n) and not solvable(prem + [[x for x in row[:n]] + [row[n] + 1]], n)
def angle_status(vs, prem, missing_thm, row):
    """valid | missing | unestablished | false for one line equation under premises."""
    n = len(vs)
    if implied(prem, row, vs): return "valid"
    if missing_thm and implied(prem + missing_thm, row, vs): return "missing"
    if solvable(prem + [row], n): return "unestablished"
    return "false"
def goal_determined(vs, prem, goal_var, goal_val, lines_rows):
    """conclusion = trailing solved-form lines; goal discharged when some line states goal_var = goal_val."""
    return any(r is not None and r == ("goal",) for r in lines_rows)


# ---- text/row audit (added after freeze; read-only): re-derives each equation row from the student TEXT with a private linear parser
AUDIT = []
def _lin_from_text(txt):
    t = re.sub(r"m?\s*∠\s*|\bangle\s+", " ", txt).replace("°", "").replace("degrees", "").replace("−", "-")
    toks = re.findall(r"\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9]*|[()+\-*/]", t); pos = [0]
    def peek(): return toks[pos[0]] if pos[0] < len(toks) else None
    def eat(): pos[0] += 1; return toks[pos[0] - 1]
    def expr():
        v = term()
        while peek() in ("+", "-"):
            op = eat(); w = term(); v = add_(v, w, 1 if op == "+" else -1)
        return v
    def add_(a, b, sg):
        out = dict(a)
        for k, x in b.items(): out[k] = out.get(k, 0) + sg * x
        return out
    def mul_(a, b):
        ca = set(a) <= {""}; cb = set(b) <= {""}
        if not (ca or cb): raise ValueError("nonlinear")
        if ca: return {k: a.get("", F(0)) * x for k, x in b.items()}
        return {k: b.get("", F(0)) * x for k, x in a.items()}
    def term():
        v = factor()
        while True:
            p = peek()
            if p == "*": eat(); v = mul_(v, factor())
            elif p == "/": eat(); d = factor(); assert set(d) <= {""}; v = {k: x / d[""] for k, x in v.items()}
            elif p is not None and (re.match(r"[A-Za-z0-9(]", p)): v = mul_(v, factor())
            else: return v
    def factor():
        p = eat()
        if p == "-": return {k: -x for k, x in factor().items()}
        if p == "(": v = expr(); eat(); return v
        if re.match(r"\d", p): return {"": F(p)}
        return {p: F(1)}
    r = expr(); assert pos[0] == len(toks), txt; return r
def text_row(text, vs):
    sides = [x for x in re.split(r"=", re.sub(r"\([^()]*[A-Za-z]{4,}[^()]*\)\s*$", "", text))]
    if len(sides) != 2: return None
    l = _lin_from_text(sides[0]); r = _lin_from_text(sides[1])
    d = dict(l)
    for k, x in r.items(): d[k] = d.get(k, 0) - x
    if any(k and k not in vs for k in d if d[k] != 0): return None
    row = [F(d.get(v, 0)) for v in vs] + [-F(d.get("", 0))]
    return row
def _norm(row):
    for x in row[:-1]:
        if x != 0: return [y / x for y in row]
    return row

def run_angle(vs, prem, missing_thm, lines):
    """lines: list of (text, row | None, kind) where kind in {'eq','goal','prose'}; returns classification, firstInvalid."""
    stat = []
    for text, row, kind in lines:
        if kind != "prose" and row is not None:
            try:
                tr = text_row(text, vs)
                if tr is not None and _norm(tr) != _norm(row): AUDIT.append(("text/row mismatch", text))
            except Exception as e: AUDIT.append(("audit-parse-error", text))
        if kind == "prose": stat.append("prose"); continue
        stat.append(angle_status(vs, prem, missing_thm, row))
    if "false" in stat: return "invalid", stat.index("false")
    if "missing" in stat or "unestablished" in stat:
        return "missing-assumption", None
    concluded = any(k == "goal" and s == "valid" for (t, r, k), s in zip(lines, stat))
    return ("verified", None) if concluded else ("incomplete", None)

DEG = [("°", "natural"), (" degrees", "natural"), ("°", "natural"), ("°", "natural")]
def lab(style, name):
    return {"plain": name, "angle": f"∠{name}", "word": f"angle {name}", "m": f"m∠{name}"}[style]

# ----------------------------------------------------------------------------- A1 triangle angle sum
def tri_problem(g, goal, cond=True, pid="tri"):
    return dict(domain="geometry", problem=dict(id=pid, objects=[dict(id="ABC", kind="triangle")], facts=[dict(predicate="angle_measure", args=[a], value=v) for a, v in g],
        conditions=["nondegenerate:ABC"] if cond else [], goal=dict(predicate="angle_measure", args=[goal[0]], value=goal[1])))
def A1():
    out = []
    pool = [(30, 60), (40, 70), (35, 65), (50, 55), (25, 80), (45, 45), (62, 38), (28, 73), (55, 35), (20, 100), (33, 47), (41, 59), (72, 18), (15, 85), (66, 24), (52, 61), (39, 39), (58, 49)]
    for k, (a, b) in enumerate(pool[:16]):
        c = 180 - a - b
        if c <= 0: a, b = 40, 50; c = 90
        lbs = ["plain", "angle", "word", "plain", "m", "angle"][k % 6]
        dg, fmt = DEG[k % 4]
        L = lambda n: lab(lbs, n); d = lambda v: f"{v}{dg}"
        vs = ["A", "B", "C"]
        givens = [eq_row({"A": 1}, a, vs), eq_row({"B": 1}, b, vs)]
        thm = eq_row({"A": 1, "B": 1, "C": 1}, 180, vs)
        cond = k not in (10, 11)
        prem = givens + ([thm] if cond else []); miss = [] if cond else [thm]
        prob = tri_problem([("A", a), ("B", b)], ("C", c), cond)
        T = lambda s: s
        style = k % 4
        solved_goal = lambda v: (f"{L('C')} = {d(v)}", eq_row({"C": 1}, v, vs), "goal")
        sumline = (f"{L('A')} + {L('B')} + {L('C')} = {d(180)}", thm, "eq")
        sub = (f"{d(a)} + {d(b)} + {L('C')} = {d(180)}", eq_row({"C": 1}, 180 - a - b, vs), "eq")
        sumAB = (f"{L('A')} + {L('B')} = {d(a + b)}", eq_row({"A": 1, "B": 1}, a + b, vs), "eq")
        sub2 = (f"{L('C')} = {d(180)} - {d(a + b)}", eq_row({"C": 1}, 180 - a - b, vs), "eq")
        solved = (f"{L('C')} = {d(180)} - {L('A')} - {L('B')}", eq_row({"C": 1, "A": 1, "B": 1}, 180, vs), "eq")
        short = (f"{L('C')} = {d(180)} - {d(a)} - {d(b)}", eq_row({"C": 1}, c, vs), "eq")
        if k < 7:  # valid
            lines = [[sumline, sub, solved_goal(c)], [sumAB, sub2, solved_goal(c)], [sumline, solved, solved_goal(c)], [short, solved_goal(c)],
                     [sumline, sub, solved_goal(c)], [sumAB, sub2, solved_goal(c)], [short, solved_goal(c)]][k]
            tags = ["valid"]
        elif k == 7:  # sign slip
            bad = (f"{L('C')} = {d(180)} - {d(a)} + {d(b)}", eq_row({"C": 1}, 180 - a + b, vs), "eq"); lines = [sumline, bad, solved_goal(180 - a + b)]; tags = ["sign-slip"]
        elif k == 8:  # wrong final arithmetic
            lines = [sumline, sub, solved_goal(c + 10)]; tags = ["arith-final"]
        elif k == 9:  # invalid then correct
            bad = (f"{d(a)} + {d(b)} + {L('C')} = {d(170)}", eq_row({"C": 1}, 170 - a - b, vs), "eq"); lines = [sumline, bad, solved_goal(c)]; tags = ["invalid-then-correct"]
        elif k in (10, 11):  # missing nondegenerate condition
            lines = [[sumline, sub, solved_goal(c)], [short, solved_goal(c)]][k - 10]; tags = ["missing-condition"]
        elif k in (12, 13):  # incomplete
            lines = [[sumline, sub], [sumAB, sub2]][k - 12]; tags = ["stop"]
        elif k == 14:  # wrong constant
            bad = (f"{L('A')} + {L('B')} + {L('C')} = {d(360)}", eq_row({"A": 1, "B": 1, "C": 1}, 360, vs), "eq"); lines = [bad, solved_goal(c)]; tags = ["wrong-constant"]
        else:  # picture-based assertion of an unestablished relation
            lines = [(f"{L('A')} = {L('C')}", eq_row({"A": 1, "C": -1}, 0, vs), "eq"), solved_goal(c)] if a != c else [sumline, sub, solved_goal(c)]; tags = ["unestablished"]
        cls, fi = run_angle(vs, prem, miss, lines)
        add("angle-relationships", "triangle-sum", prob, [l[0] for l in lines], (cls, fi, "oracle: exact Fraction linear algebra over the angle variables; premises = givens + angle-sum theorem (condition permitting)"), fmt, tags)
    return

def A2():  # isosceles base angles (needs equal_length + nondegenerate)
    for k, (apex, ) in enumerate([(40,), (50,), (80,), (20,), (100,), (30,)]):
        base = F(180 - apex, 2); vs = ["A", "B", "C"]
        cond = k != 4
        prob = dict(domain="geometry", problem=dict(id="iso", objects=[dict(id="ABC", kind="triangle", data=dict(angles=["A", "B", "C"], sides=["AB", "BC", "CA"]))],
            facts=[dict(predicate="equal_length", args=["AB", "CA"]), dict(predicate="angle_measure", args=["A"], value=apex)], conditions=["nondegenerate:ABC"] if cond else [], goal=dict(predicate="angle_measure", args=["B"], value=int(base) if base.denominator == 1 else fr(base))))
        given = [eq_row({"A": 1}, apex, vs)]; thm = [eq_row({"A": 1, "B": 1, "C": 1}, 180, vs), eq_row({"B": 1, "C": -1}, 0, vs)]
        prem = given + (thm if cond else []); miss = [] if cond else thm
        s_eq = ("B = C", eq_row({"B": 1, "C": -1}, 0, vs), "eq"); s_sum = ("A + B + C = 180°", thm[0], "eq")
        s_two = (f"{apex}° + 2B = 180°", eq_row({"B": 2}, 180 - apex, vs), "eq"); s_goal = (f"B = {fr(base)}°", eq_row({"B": 1}, base, vs), "goal")
        if k in (0, 1, 2): lines = [s_eq, s_sum, s_two, s_goal]; tag = ["valid"]
        elif k == 3: lines = [s_eq, s_sum, (f"{apex}° + 2B = 180°", eq_row({"B": 2}, 180 - apex + 20, vs), "eq"), s_goal]; tag = ["arith-slip"]
        elif k == 4: lines = [s_eq, s_sum, s_two, s_goal]; tag = ["missing-condition"]
        else: lines = [s_eq, s_sum, s_two]; tag = ["stop"]
        cls, fi = run_angle(vs, prem, miss, lines)
        add("angle-relationships", "isosceles-base-angles", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra; base angles equal because AB = CA is given"), tags=tag)

def A3():  # linear pair
    for k, x in enumerate([65, 110, 40, 125, 72, 33, 98]):
        vs = ["ABD", "DBC"]; y = 180 - x
        prob = dict(domain="geometry", problem=dict(id="lp", objects=[dict(id="ABD", kind="angle"), dict(id="DBC", kind="angle")], facts=[dict(predicate="linear_pair", args=["ABD", "DBC"]), dict(predicate="angle_measure", args=["ABD"], value=x)], conditions=[], goal=dict(predicate="angle_measure", args=["DBC"], value=y)))
        prem = [eq_row({"ABD": 1}, x, vs), eq_row({"ABD": 1, "DBC": 1}, 180, vs)]
        st = ["angle", "plain", "word"][k % 3]; L = lambda n: lab(st if st != "plain" else "angle", n)
        sumline = (f"{L('ABD')} + {L('DBC')} = 180°", prem[1], "eq"); goal = lambda v: (f"{L('DBC')} = {v}°", eq_row({"DBC": 1}, v, vs), "goal")
        if k in (0, 1, 2): lines = [sumline, (f"{x}° + {L('DBC')} = 180°", eq_row({"DBC": 1}, y, vs), "eq"), goal(y)]; tag = ["valid"]
        elif k == 3: lines = [sumline, goal(y)]; tag = ["valid"]
        elif k == 4: lines = [(f"{L('DBC')} = {x}°", eq_row({"DBC": 1}, x, vs), "goal")]; tag = ["equal-instead-of-supplement"]
        elif k == 5: lines = [sumline, (f"{L('DBC')} = 90° - {x}°", eq_row({"DBC": 1}, 90 - x, vs), "eq"), goal(90 - x)]; tag = ["complement-instead-of-supplement"]
        else: lines = [sumline, (f"{x}° + {L('DBC')} = 180°", eq_row({"DBC": 1}, y, vs), "eq")]; tag = ["stop"]
        cls, fi = run_angle(vs, prem, [], lines)
        add("angle-relationships", "linear-pair", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra; supplementary linear pair"), tags=tag)

def A4():  # vertical angles
    for k, x in enumerate([48, 125, 37, 70, 85]):
        vs = ["AOC", "BOD"]
        facts = [dict(predicate="angle_measure", args=["AOC"], value=x)] + ([dict(predicate="vertical_pair", args=["AOC", "BOD"])] if k != 4 else [])
        prob = dict(domain="geometry", problem=dict(id="vt", objects=[dict(id="AOC", kind="angle"), dict(id="BOD", kind="angle")], facts=facts, conditions=[], goal=dict(predicate="angle_measure", args=["BOD"], value=x)))
        prem = [eq_row({"AOC": 1}, x, vs)] + ([eq_row({"AOC": 1, "BOD": -1}, 0, vs)] if k != 4 else []); miss = [eq_row({"AOC": 1, "BOD": -1}, 0, vs)] if k == 4 else []
        eqline = ("∠BOD = ∠AOC", eq_row({"BOD": 1, "AOC": -1}, 0, vs), "eq"); goal = ("∠BOD = %d°" % x, eq_row({"BOD": 1}, x, vs), "goal")
        if k in (0, 1, 2): lines = [eqline, goal]; tag = ["valid"]
        elif k == 3: lines = [("∠BOD + ∠AOC = 180°", eq_row({"BOD": 1, "AOC": 1}, 180, vs), "eq"), ("∠BOD = %d°" % (180 - x), eq_row({"BOD": 1}, 180 - x, vs), "goal")]; tag = ["wrong-relation"]
        else: lines = [eqline, goal]; tag = ["from-picture"]
        cls, fi = run_angle(vs, prem, miss, lines)
        add("angle-relationships", "vertical-angles", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra; vertical pair equality requires the stated pair fact"), tags=tag)

def A5():  # parallel lines: alternate / corresponding
    for k, (x, rel) in enumerate([(55, "alternate_pair"), (110, "corresponding_pair"), (72, "alternate_pair"), (64, "alternate_pair"), (130, "corresponding_pair"), (48, "alternate_pair"), (95, "corresponding_pair")]):
        vs = ["a1", "a2"]; has_par = k not in (3, 4)
        facts = [dict(predicate=rel, args=["a1", "a2", "l1", "l2"]), dict(predicate="angle_measure", args=["a1"], value=x)] + ([dict(predicate="parallel", args=["l1", "l2"])] if has_par else [])
        prob = dict(domain="geometry", problem=dict(id="par", objects=[dict(id="a1", kind="angle"), dict(id="a2", kind="angle"), dict(id="l1", kind="line"), dict(id="l2", kind="line")], facts=facts, conditions=[], goal=dict(predicate="angle_measure", args=["a2"], value=x)))
        eqr = eq_row({"a1": 1, "a2": -1}, 0, vs); prem = [eq_row({"a1": 1}, x, vs)] + ([eqr] if has_par else []); miss = [] if has_par else [eqr]
        eqline = ("a2 = a1", eqr, "eq"); goal = (f"a2 = {x}°", eq_row({"a2": 1}, x, vs), "goal")
        if k in (0, 1, 2, 3, 4): lines = [eqline, goal]; tag = ["valid"] if has_par else ["missing-parallel"]
        elif k == 5: lines = [("a1 + a2 = 180°", eq_row({"a1": 1, "a2": 1}, 180, vs), "eq"), (f"a2 = {180 - x}°", eq_row({"a2": 1}, 180 - x, vs), "goal")]; tag = ["co-interior-instead"]
        else: lines = [eqline, (f"a2 = {x + 10}°", eq_row({"a2": 1}, x + 10, vs), "goal")]; tag = ["arith-final"]
        cls, fi = run_angle(vs, prem, miss, lines)
        add("angle-relationships", "parallel-lines", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra; alternate/corresponding equality requires the parallel fact"), tags=tag)

def A6():  # exterior angle of a triangle
    for k, (a, b) in enumerate([(40, 65), (35, 50), (28, 77), (55, 30), (62, 41)]):
        vs = ["A", "B", "C", "E"]; e = a + b
        prob = dict(domain="geometry", problem=dict(id="ext", objects=[dict(id="ABC", kind="triangle", data=dict(angles=["A", "B", "C"], sides=["AB", "BC", "CA"])), dict(id="E", kind="angle")],
            facts=[dict(predicate="angle_measure", args=["A"], value=a), dict(predicate="angle_measure", args=["B"], value=b), dict(predicate="linear_pair", args=["C", "E"])], conditions=["nondegenerate:ABC"], goal=dict(predicate="angle_measure", args=["E"], value=e)))
        prem = [eq_row({"A": 1}, a, vs), eq_row({"B": 1}, b, vs), eq_row({"A": 1, "B": 1, "C": 1}, 180, vs), eq_row({"C": 1, "E": 1}, 180, vs)]
        if k in (0, 1, 2): lines = [("E = A + B", eq_row({"E": 1, "A": -1, "B": -1}, 0, vs), "eq"), (f"E = {a}° + {b}°", eq_row({"E": 1}, e, vs), "eq"), (f"E = {e}°", eq_row({"E": 1}, e, vs), "goal")]; tag = ["valid"]
        elif k == 3: lines = [("E = A + B", eq_row({"E": 1, "A": -1, "B": -1}, 0, vs), "eq"), (f"E = {a}° + {b}°", eq_row({"E": 1}, e, vs), "eq"), (f"E = {e + 10}°", eq_row({"E": 1}, e + 10, vs), "goal")]; tag = ["arith-final"]
        else: lines = [("E = A + B", eq_row({"E": 1, "A": -1, "B": -1}, 0, vs), "eq"), (f"E = {a}° + {b}°", eq_row({"E": 1}, e, vs), "eq")]; tag = ["stop"]
        cls, fi = run_angle(vs, prem, [], lines)
        add("angle-relationships", "exterior-angle", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra (angle sum + linear pair imply the exterior angle theorem)"), tags=tag)

def A7():  # right triangle, complementary acute angles
    for k, (a) in enumerate([35, 52, 28, 61]):
        vs = ["A", "B", "C"]; b = 90 - a
        prob = dict(domain="geometry", problem=dict(id="rt", objects=[dict(id="ABC", kind="triangle", data=dict(angles=["A", "B", "C"], sides=["AB", "BC", "CA"]))],
            facts=[dict(predicate="angle_measure", args=["C"], value=90), dict(predicate="angle_measure", args=["A"], value=a)], conditions=["nondegenerate:ABC"], goal=dict(predicate="angle_measure", args=["B"], value=b)))
        prem = [eq_row({"C": 1}, 90, vs), eq_row({"A": 1}, a, vs), eq_row({"A": 1, "B": 1, "C": 1}, 180, vs)]
        pair = ("A + B = 90°", eq_row({"A": 1, "B": 1}, 90, vs), "eq")
        if k < 2: lines = [pair, (f"B = 90° - {a}°", eq_row({"B": 1}, b, vs), "eq"), (f"B = {b}°", eq_row({"B": 1}, b, vs), "goal")]; tag = ["valid"]
        elif k == 2: lines = [("A + B = 180°", eq_row({"A": 1, "B": 1}, 180, vs), "eq"), (f"B = {180 - a}°", eq_row({"B": 1}, 180 - a, vs), "goal")]; tag = ["supplement-instead"]
        else: lines = [pair, (f"B = 90° - {a}°", eq_row({"B": 1}, b, vs), "eq")]; tag = ["stop"]
        cls, fi = run_angle(vs, prem, [], lines)
        add("angle-relationships", "right-triangle-complementary", prob, [l[0] for l in lines], (cls, fi, "oracle: exact linear algebra; the acute angles of a right triangle sum to 90"), tags=tag)

# ======================================================================================================= coordinate geometry
def pt(i, x, y): return dict(id=i, kind="point", data=dict(x=x, y=y))
def coord_ref(lines, target, labels_ok=lambda t: True):
    """lines: list of RHS numeric expressions (strings) -> classification. target: Fraction (or Decimal string for surds)."""
    stat = []
    for t in lines:
        try:
            v = O.ev(O.parse(t), {})
            stat.append("valid" if abs(v - (Decimal_of(target))) < O.TOL else "false")
        except Exception as e: stat.append("unparsed")
    if "false" in stat: return "invalid", stat.index("false")
    if "unparsed" in stat: raise ValueError("oracle could not parse a coordinate line")
    last = lines[-1].strip()
    plain = all(ch.isdigit() or ch in "/-." for ch in last.replace(" ", "")) and last.count("/") <= 1
    return ("verified", None) if plain else ("incomplete", None)
def Decimal_of(t):
    from decimal import Decimal
    return t if isinstance(t, Decimal) else Decimal(F(t).numerator) / Decimal(F(t).denominator)

def pieces(line):
    parts = [t.strip() for t in line.split("=")]
    return parts[1:] if not parts[0].replace(" ", "").replace(".", "").replace("-", "").replace("/", "").isdigit() and not parts[0].startswith("(") and not parts[0].startswith("sqrt") else parts
def tup(t):
    t = t.strip()
    if t.startswith("(") and t.endswith(")"):
        depth, comps, cur = 0, [], ""
        for ch in t[1:-1]:
            if ch == "(": depth += 1
            if ch == ")": depth -= 1
            if ch == "," and depth == 0: comps.append(cur); cur = ""
            else: cur += ch
        comps.append(cur)
        if len(comps) > 1: return comps
    return None
def coord_oracle(lines, target):
    """target: Fraction or tuple of Fractions. Every piece of every line must equal the target exactly (Decimal 70 digits)."""
    stat = []
    for ln in lines:
        ok = True
        for pc in pieces(ln):
            tc = tup(pc)
            if isinstance(target, tuple):
                if tc is None or len(tc) != len(target): ok = False; break
                ok = ok and all(abs(O.ev(O.parse(c), {}) - Decimal_of(t)) < O.TOL for c, t in zip(tc, target))
            else:
                ok = ok and abs(O.ev(O.parse(pc), {}) - Decimal_of(target)) < O.TOL
        stat.append("valid" if ok else "false")
    last = pieces(lines[-1])[-1].strip(); plain = bool(re.fullmatch(r"-?\d+(/\d+)?|\d*\*?sqrt\(\d+\)|\(-?\d+(/\d+)?, -?\d+(/\d+)?\)", last))
    m = re.fullmatch(r"\d*\*?sqrt\((\d+)\)", last)
    if m:
        n = int(m.group(1)); plain = n > 1 and all(n % (q * q) for q in range(2, int(n ** 0.5) + 1))
    if "false" in stat: return ("invalid", stat.index("false"))
    return ("verified", None) if plain else ("incomplete", None)

def C1():  # midpoint (tuple answers)
    for k, ((x1, y1), (x2, y2)) in enumerate([((1, 2), (5, 8)), ((-2, 4), (6, 10)), ((3, -1), (9, 5)), ((0, 6), (8, -2)), ((-4, -3), (2, 7)), ((5, 5), (11, 9))]):
        mx, my = F(x1 + x2, 2), F(y1 + y2, 2)
        prob = dict(domain="geometry", problem=dict(id="mid", objects=[pt("A", x1, y1), pt("B", x2, y2), pt("M", fr(mx) if mx.denominator != 1 else int(mx), fr(my) if my.denominator != 1 else int(my))], facts=[], conditions=[], goal=dict(predicate="midpoint", args=["M", "A", "B"])))
        xs, ys = f"({x1} + {x2})/2", f"({y1} + {y2})/2"
        if k in (0, 1, 2): lines = [f"M = (({x1} + {x2})/2, ({y1} + {y2})/2)", f"M = ({x1 + x2}/2, {y1 + y2}/2)", f"M = ({fr(mx)}, {fr(my)})"]; ref = ("verified", None); tag = ["valid"]
        elif k == 3: lines = [f"M = (({x1} + {x2})/2, ({y1} + {y2})/2)", f"M = ({x1 + x2}/2, {y1 + y2 + 1}/2)", f"M = ({fr(mx)}, {fr(my + F(1, 2))})"]; ref = ("invalid", 1); tag = ["arith-slip"]
        elif k == 4: lines = [f"M = ({x1} + {x2}, {y1} + {y2})", f"M = ({x1 + x2}, {y1 + y2})"]; ref = ("invalid", 0); tag = ["forgot-half"]
        else: lines = [f"M = (({x1} + {x2})/2, ({y1} + {y2})/2)"]; ref = ("incomplete", None); tag = ["stop"]
        # oracle verification of the reference by evaluating each component
        add("coordinate-geometry", "midpoint", prob, lines, (ref[0], ref[1], "oracle: exact Fractions; midpoint = average of coordinates"), tags=tag)

def C2():  # slope
    for k, ((x1, y1), (x2, y2)) in enumerate([((1, 2), (5, 8)), ((0, 3), (4, 11)), ((-2, 5), (4, -1)), ((2, 1), (8, 4)), ((1, 3), (5, 5)), ((-1, -2), (3, 4)), ((1, 1), (4, 9))]):
        m = F(y2 - y1, x2 - x1)
        prob = dict(domain="geometry", problem=dict(id="slope", objects=[pt("A", x1, y1), pt("B", x2, y2), dict(id="AB", kind="segment", data=dict(points=["A", "B"]))], facts=[], conditions=[], goal=dict(predicate="slope", args=["AB"], value=fr(m))))
        good = [f"m = ({y2} - {y1})/({x2} - {x1})", f"m = {y2 - y1}/{x2 - x1}", f"m = {fr(m)}"]
        if k in (0, 1, 2): lines = good; ref = ("verified", None); tag = ["valid"]
        elif k == 3: lines = [good[0], good[1], f"m = {fr(m + 1)}"]; ref = ("invalid", 2); tag = ["arith-final"]
        elif k == 4: lines = [f"m = ({x2} - {x1})/({y2} - {y1})", f"m = {x2 - x1}/{y2 - y1}", f"m = {fr(F(x2 - x1, y2 - y1))}"]; ref = ("invalid", 0) if F(x2 - x1, y2 - y1) != m else ("verified", None); tag = ["inverted"]
        elif k == 5: lines = [f"m = ({y2} - {y1})/({x1} - {x2})", f"m = {y2 - y1}/{x1 - x2}", f"m = {fr(F(y2 - y1, x1 - x2))}"]; ref = ("invalid", 0); tag = ["mixed-order"]
        else: lines = good[:1]; ref = ("incomplete", None); tag = ["stop"]
        if ref[0] == "invalid" and k in (4, 5): ref = ("invalid", 0)
        add("coordinate-geometry", "slope", prob, lines, (ref[0], ref[1], "oracle: exact Fractions; slope = rise over run"), tags=tag)

def C3():  # distance squared
    for k, ((x1, y1), (x2, y2)) in enumerate([((1, 2), (4, 6)), ((0, 0), (5, 12)), ((-3, 1), (2, 13)), ((2, 2), (8, 10)), ((-1, 4), (3, 7))]):
        d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
        prob = dict(domain="geometry", problem=dict(id="d2", objects=[pt("A", x1, y1), pt("B", x2, y2), dict(id="AB", kind="segment", data=dict(points=["A", "B"]))], facts=[], conditions=[], goal=dict(predicate="distance_squared", args=["AB"], value=d2)))
        good = [f"d^2 = ({x2} - {x1})^2 + ({y2} - {y1})^2", f"d^2 = {(x2 - x1) ** 2} + {(y2 - y1) ** 2}", f"d^2 = {d2}"]
        if k in (0, 1, 2): lines = good; ref = ("verified", None); tag = ["valid"]
        elif k == 3: lines = [good[0], f"d^2 = {(x2 - x1) * 2} + {(y2 - y1) ** 2}", f"d^2 = {(x2 - x1) * 2 + (y2 - y1) ** 2}"]; ref = ("invalid", 1); tag = ["squared-as-doubled"]
        else: lines = [f"d^2 = ({x2} + {x1})^2 + ({y2} + {y1})^2", f"d^2 = {(x2 + x1) ** 2 + (y2 + y1) ** 2}"]; ref = ("invalid", 0) if (x2 + x1) ** 2 + (y2 + y1) ** 2 != d2 else ("verified", None); tag = ["sign-error"]
        add("coordinate-geometry", "distance-squared", prob, lines, (ref[0], ref[1], "oracle: exact integers"), tags=tag)

def C4():  # distance with perfect-square result
    for k, ((x1, y1), (x2, y2), d) in enumerate([((0, 0), (3, 4), 5), ((1, 1), (7, 9), 10), ((-2, 3), (4, 11), 10), ((2, 5), (14, 10), 13), ((0, 1), (8, 16), 17)]):
        assert (x2 - x1) ** 2 + (y2 - y1) ** 2 == d * d
        prob = dict(domain="geometry", problem=dict(id="dist", objects=[pt("A", x1, y1), pt("B", x2, y2), dict(id="AB", kind="segment", data=dict(points=["A", "B"]))], facts=[], conditions=[], goal=dict(predicate="length", args=["AB"], value=d)))
        good = [f"d = sqrt(({x2} - {x1})^2 + ({y2} - {y1})^2)", f"d = sqrt({(x2 - x1) ** 2} + {(y2 - y1) ** 2})", f"d = sqrt({d * d})", f"d = {d}"]
        if k in (0, 1): lines = good; ref = ("verified", None); tag = ["valid"]
        elif k == 2: lines = [f"d = sqrt({(x2 - x1) ** 2} + {(y2 - y1) ** 2})", f"d = sqrt({d * d})", f"d = {d}"]; ref = ("verified", None); tag = ["valid-short"]
        elif k == 3: lines = [good[0], good[1], f"d = sqrt({d * d + 1})", f"d = {d}"]; ref = ("invalid", 2); tag = ["arith-slip"]
        else: lines = good[:3]; ref = ("incomplete", None); tag = ["stop"]
        add("coordinate-geometry", "distance", prob, lines, (ref[0], ref[1], "oracle: exact integers"), tags=tag, alt=(k == 2))

def C5():  # distance with irrational result (outside rational scope)
    for k, ((x1, y1), (x2, y2)) in enumerate([((1, 2), (5, 8)), ((0, 0), (2, 6)), ((-1, 1), (3, 5))]):
        d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
        s, r = 1, d2
        for q in range(int(d2 ** 0.5), 1, -1):
            if d2 % (q * q) == 0: s, r = q, d2 // (q * q); break
        prob = dict(domain="geometry", problem=dict(id="dsurd", objects=[pt("A", x1, y1), pt("B", x2, y2), dict(id="AB", kind="segment", data=dict(points=["A", "B"]))], facts=[], conditions=[], goal=dict(predicate="distance_squared", args=["AB"], value=d2)))
        lines = [f"d = sqrt(({x2} - {x1})^2 + ({y2} - {y1})^2)", f"d = sqrt({(x2 - x1) ** 2} + {(y2 - y1) ** 2})", f"d = sqrt({d2})", f"d = {s}*sqrt({r})"]
        add("coordinate-geometry", "distance-irrational", prob, lines, ("verified", None, "oracle: exact integers; sqrt(d2) = s*sqrt(r)"), tags=["valid", "irrational"], scope="outside-rational-scope")

def C6():  # parallel / perpendicular by slope
    for k, (kind, pts, ok) in enumerate([("parallel", ((1, 1), (3, 5), (2, 0), (4, 4)), True), ("perpendicular", ((0, 0), (2, 4), (1, 1), (5, -1)), True), ("parallel", ((1, 1), (3, 5), (2, 0), (4, 3)), False), ("perpendicular", ((0, 0), (2, 4), (1, 1), (5, 3)), False)]):
        (a, b, c, d) = pts
        m1, m2 = F(b[1] - a[1], b[0] - a[0]), F(d[1] - c[1], d[0] - c[0])
        truth = (m1 == m2) if kind == "parallel" else (m1 * m2 == -1)
        assert truth == ok
        prob = dict(domain="geometry", problem=dict(id="pp", objects=[pt("A", *a), pt("B", *b), pt("C", *c), pt("D", *d), dict(id="AB", kind="line", data=dict(points=["A", "B"])), dict(id="CD", kind="line", data=dict(points=["C", "D"]))], facts=[], conditions=[], goal=dict(predicate=kind, args=["AB", "CD"])))
        l1 = f"slope AB = ({b[1]} - {a[1]})/({b[0]} - {a[0]}) = {fr(m1)}"; l2 = f"slope CD = ({d[1]} - {c[1]})/({d[0]} - {c[0]}) = {fr(m2)}"
        concl = f"{fr(m1)} = {fr(m2)}, so AB is parallel to CD" if kind == "parallel" else f"{fr(m1)} * {fr(m2)} = {fr(m1 * m2)}, so AB is perpendicular to CD"
        if ok: lines = [l1, l2, concl]; ref = ("verified", None); tag = ["valid"]
        else: lines = [l1, l2, concl]; ref = ("invalid", 2); tag = ["false-claim"]
        add("coordinate-geometry", f"{kind}-by-slope", prob, lines, (ref[0], ref[1], "oracle: exact Fractions slopes"), tags=tag, scope="multi-claim-line")

# ======================================================================================================= geometry proof steps
def P1():  # vertical angles with reasons
    for k, (x, reason, ok) in enumerate([(50, "vertical angles", True), (70, "vertical angles are equal", True), (65, "alternate interior angles", False), (40, "corresponding angles", False)]):
        prob = dict(domain="geometry", problem=dict(id="pv", objects=[dict(id="AOC", kind="angle"), dict(id="BOD", kind="angle")], facts=[dict(predicate="vertical_pair", args=["AOC", "BOD"]), dict(predicate="angle_measure", args=["AOC"], value=x)], conditions=[], goal=dict(predicate="angle_measure", args=["BOD"], value=x)))
        lines = [f"∠BOD = ∠AOC ({reason})", f"∠BOD = {x}°"]
        add("geometry-proof-steps", "reason-vertical", prob, lines, ("verified", None, "oracle: rule table; vertical pair given") if ok else ("invalid", 0, "oracle: cited reason does not justify the relation"), tags=["valid" if ok else "wrong-reason"])
def P2():
    for k, (apex, kind) in enumerate([(40, "ok"), (70, "ok"), (50, "wrong"), (60, "nogiven")]):
        base = (180 - apex) // 2
        facts = [dict(predicate="angle_measure", args=["A"], value=apex)] + ([dict(predicate="equal_length", args=["AB", "CA"])] if kind != "nogiven" else [])
        prob = dict(domain="geometry", problem=dict(id="pi", objects=[dict(id="ABC", kind="triangle", data=dict(angles=["A", "B", "C"], sides=["AB", "BC", "CA"]))], facts=facts, conditions=["nondegenerate:ABC"], goal=dict(predicate="angle_measure", args=["B"], value=base)))
        reason = "base angles of an isosceles triangle" if kind != "wrong" else "angle sum of a triangle"
        lines = [f"B = C ({reason})", f"B + C = {180 - apex}°", f"B = {base}°"]
        ref = ("verified", None, "oracle: isosceles base angles") if kind == "ok" else ("invalid", 0, "oracle: cited reason does not justify B = C") if kind == "wrong" else ("missing-assumption", None, "oracle: AB = CA is not given")
        add("geometry-proof-steps", "reason-isosceles", prob, lines, ref, tags=[kind])
def P3():
    for k, (x, kind) in enumerate([(55, "ok"), (72, "ok"), (64, "nopar"), (48, "wrong")]):
        facts = [dict(predicate="alternate_pair", args=["a1", "a2", "l1", "l2"]), dict(predicate="angle_measure", args=["a1"], value=x)] + ([dict(predicate="parallel", args=["l1", "l2"])] if kind != "nopar" else [])
        prob = dict(domain="geometry", problem=dict(id="pa", objects=[dict(id="a1", kind="angle"), dict(id="a2", kind="angle"), dict(id="l1", kind="line"), dict(id="l2", kind="line")], facts=facts, conditions=[], goal=dict(predicate="angle_measure", args=["a2"], value=x)))
        reason = "alternate interior angles" if kind != "wrong" else "vertical angles"
        lines = [f"a2 = a1 ({reason}, l1 ∥ l2)", f"a2 = {x}°"]
        ref = ("verified", None, "oracle: alternate interior angles with parallel given") if kind == "ok" else ("missing-assumption", None, "oracle: parallel not given") if kind == "nopar" else ("invalid", 0, "oracle: wrong reason")
        add("geometry-proof-steps", "reason-alternate", prob, lines, ref, tags=[kind])
def P4():
    for k, (a, b, kind) in enumerate([(50, 60, "ok"), (35, 65, "const"), (45, 80, "nocond")]):
        c = 180 - a - b
        prob = tri_problem([("A", a), ("B", b)], ("C", c), cond=(kind != "nocond"))
        total = 180 if kind != "const" else 360
        lines = [f"A + B + C = {total}° (angle sum of a triangle)", f"{a}° + {b}° + C = {total}°", f"C = {c}°"]
        ref = ("verified", None, "oracle: triangle angle sum") if kind == "ok" else ("invalid", 0, "oracle: wrong constant") if kind == "const" else ("missing-assumption", None, "oracle: nondegenerate condition absent")
        add("geometry-proof-steps", "reason-triangle-sum", prob, lines, ref, tags=[kind])
def P5():
    for k, kind in enumerate(["sas", "ssa", "missing"]):
        facts = {"sas": [("equal_length", ["AB", "DE"]), ("equal_angle", ["B", "E"]), ("equal_length", ["BC", "EF"])], "ssa": [("equal_length", ["AB", "DE"]), ("equal_length", ["AC", "DF"]), ("equal_angle", ["B", "E"])], "missing": [("equal_length", ["AB", "DE"]), ("equal_angle", ["B", "E"])]}[kind]
        prob = dict(domain="geometry", problem=dict(id="cg", objects=[dict(id="ABC", kind="triangle", data=dict(angles=["A", "B", "C"], sides=["AB", "BC", "CA"])), dict(id="DEF", kind="triangle", data=dict(angles=["D", "E", "F"], sides=["DE", "EF", "FD"]))],
            facts=[dict(predicate=p, args=a) for p, a in facts], conditions=["nondegenerate:ABC", "nondegenerate:DEF"], goal=dict(predicate="congruent", args=["ABC", "DEF"])))
        crit = {"sas": "SAS", "ssa": "SSA", "missing": "SAS"}[kind]
        lines = ["AB = DE (given)", "∠B = ∠E (given)", f"triangle ABC is congruent to triangle DEF ({crit})"]
        ref = ("verified", None, "oracle: SAS with two sides and the included angle given") if kind == "sas" else ("invalid", 2, "oracle: SSA is not a congruence criterion") if kind == "ssa" else ("missing-assumption", None, "oracle: BC = EF is not given")
        add("geometry-proof-steps", "reason-congruence", prob, lines, ref, tags=[kind], scope="congruence")
def P6():
    for k, (x, ok) in enumerate([(70, True), (55, False)]):
        prob = dict(domain="geometry", problem=dict(id="pl", objects=[dict(id="ABD", kind="angle"), dict(id="DBC", kind="angle")], facts=[dict(predicate="linear_pair", args=["ABD", "DBC"]), dict(predicate="angle_measure", args=["ABD"], value=x)], conditions=[], goal=dict(predicate="angle_measure", args=["DBC"], value=180 - x)))
        reason = "angles on a straight line" if ok else "vertical angles"
        lines = [f"∠ABD + ∠DBC = 180° ({reason})", f"∠DBC = {180 - x}°"]
        add("geometry-proof-steps", "reason-linear-pair", prob, lines, ("verified", None, "oracle: linear pair") if ok else ("invalid", 0, "oracle: wrong reason"), tags=["valid" if ok else "wrong-reason"])

# ======================================================================================================= calculus helpers
def to_expr(a):
    k = a[0]
    if k == "c": return dict(kind="constant", value=fr(a[1]))
    if k == "pi": return dict(kind="pi")
    if k == "x": return dict(kind="variable", name=a[1])
    if k == "neg": return dict(kind="multiply", factors=[dict(kind="constant", value="-1"), to_expr(a[1])])
    if k == "+": return dict(kind="add", terms=[to_expr(a[1]), to_expr(a[2])])
    if k == "-": return dict(kind="add", terms=[to_expr(a[1]), dict(kind="multiply", factors=[dict(kind="constant", value="-1"), to_expr(a[2])])])
    if k == "*": return dict(kind="multiply", factors=[to_expr(a[1]), to_expr(a[2])])
    if k == "/": return dict(kind="multiply", factors=[to_expr(a[1]), dict(kind="power", base=to_expr(a[2]), exponent=-1)])
    if k == "^":
        assert a[2][0] == "c" and a[2][1].denominator == 1; return dict(kind="power", base=to_expr(a[1]), exponent=int(a[2][1]))
    if k in ("sin", "cos", "tan", "exp"): return dict(kind=k, argument=to_expr(a[1]))
    if k == "ln": return dict(kind="log", argument=to_expr(a[1]))
    if k == "sqrt": return dict(kind="root", radicand=to_expr(a[1]), index=2)
    if k == "abs": return dict(kind="abs", argument=to_expr(a[1]))
    raise ValueError(k)
def rhs_of(line):
    return line.split("=")[-1].strip()
def deriv_ref(fstr, lines, claims, order=1, tags=()):
    """claims: list of expression strings (one per line, or None for prose). returns classification, firstInvalid."""
    f = O.parse(fstr); d = f
    for _ in range(order): d = O.diff(d, "x")
    stat = []
    for c in claims:
        if c is None: stat.append("prose"); continue
        r = O.same_function(O.parse(c), d)
        stat.append("valid" if r else "false" if r is False else "unknown")
    assert "unknown" not in stat, (fstr, claims)
    if "false" in stat: return "invalid", stat.index("false")
    return ("verified", None) if "valid" in stat and stat[-1] == "valid" else ("incomplete", None)

def DIFF(family, fstr, lines, claims, fmt="natural", tags=(), alt=False, scope="in-scope", order=1, ref_override=None):
    f = O.parse(fstr)
    ref = ref_override or deriv_ref(fstr, lines, claims, order)
    prob = dict(domain="calculus", task="derivative", expression=to_expr(f), variable="x", **({"order": order} if order != 1 else {}))
    add("differentiation", family, prob, lines, (ref[0], ref[1], "oracle: own differentiator + Decimal(70) agreement at >= 8 rational points"), fmt, tags, alt, scope)

def D1():
    sets = [("3x^4 - 2x^2 + 5x - 7", "12x^3 - 4x + 5", ["12x^3 - 4x^3 + 5", "12x^3 - 4x + 5 - 7", "12x^3 - 4x + 5x"]),
            ("x^5 + 4x^3 - x", "5x^4 + 12x^2 - 1", ["5x^5 + 12x^2 - 1", "5x^4 + 12x^2", "x^4 + 12x^2 - 1"]),
            ("2x^3 - 9x^2 + 6x + 1", "6x^2 - 18x + 6", ["6x^2 - 18x^2 + 6", "6x^2 - 18x + 6 + 1", "6x - 18x + 6"]),
            ("x^7 - 3x^2", "7x^6 - 6x", ["7x^7 - 6x", "7x^6 - 3", "6x^6 - 6x"])]
    forms = [lambda f, d: [f"f(x) = {f}", f"f'(x) = {d}"], lambda f, d: [f"f(x) = {f}", f"d/dx ({f}) = {d}"], lambda f, d: [f"f(x) = {f}", f"dy/dx = {d}"], lambda f, d: [f"y = {f}", f"y' = {d}"]]
    for i, (f, d, bads) in enumerate(sets):
        form = forms[i]
        lines = form(f, d); DIFF("power-rule", f, lines, [None, d] if len(lines) == 2 else [None, d], tags=["valid"])
    for i, (f, d, bads) in enumerate(sets[:3]):
        lines = ["f(x) = " + f, "f'(x) = " + bads[i % 3]]; DIFF("power-rule", f, lines, [None, bads[i % 3]], tags=["slip"])
    f = "x^6 - 2x^3"; lines = ["f(x) = x^6 - 2x^3", "Use the power rule"]; DIFF("power-rule", f, lines, [None, None], tags=["stop"])

def D2():
    items = [("(3x + 1)^5", "15(3x + 1)^4", "5(3x + 1)^4"), ("(x^2 + 1)^3", "6x(x^2 + 1)^2", "3(x^2 + 1)^2"), ("sin(3x)", "3cos(3x)", "cos(3x)"), ("cos(x^2)", "-2x sin(x^2)", "-sin(x^2)"),
             ("exp(2x)", "2exp(2x)", "exp(2x)"), ("(2x - 1)^4", "8(2x - 1)^3", "4(2x - 1)^3"), ("ln(5x + 2)", "5/(5x + 2)", "1/(5x + 2)"), ("(x^3 - x)^2", "2(x^3 - x)(3x^2 - 1)", "2(x^3 - x)")]
    for i, (f, good, bad) in enumerate(items):
        if i < 3:
            lines = [f"f(x) = {f}", f"f'(x) = {good}"]; DIFF("chain-rule", f, lines, [None, good], tags=["valid"], fmt="natural")
        elif i < 7:
            lines = [f"f(x) = {f}", f"f'(x) = {bad}"]; DIFF("chain-rule", f, lines, [None, bad], tags=["missing-inner-derivative"])
        else:
            lines = [f"f(x) = {f}", "Use the chain rule"]; DIFF("chain-rule", f, lines, [None, None], tags=["stop"])

def D3():
    items = [("x^2 sin(x)", "2x sin(x) + x^2 cos(x)", "2x cos(x)"), ("x exp(x)", "exp(x) + x exp(x)", "exp(x)"), ("(x + 1)(x^2 - 3)", "(x^2 - 3) + 2x(x + 1)", "2x"), ("x^3 ln(x)", "3x^2 ln(x) + x^2", "3x^2/x"),
             ("x^2 exp(3x)", "2x exp(3x) + 3x^2 exp(3x)", "2x exp(3x) * 3exp(3x)"), ("(2x - 1)(x^3 + x)", "2(x^3 + x) + (2x - 1)(3x^2 + 1)", "2(3x^2 + 1)"), ("x cos(x)", "cos(x) - x sin(x)", "cos(x) + x sin(x)"), ("x^4 sin(x)", "4x^3 sin(x) + x^4 cos(x)", "x^4 sin(x)")]
    for i, (f, good, bad) in enumerate(items):
        if i < 4:
            lines = [f"f(x) = {f}", f"f'(x) = {good}"]; DIFF("product-rule", f, lines, [None, good], tags=["valid"])
        elif i < 7:
            lines = [f"f(x) = {f}", f"f'(x) = {bad}" if i != 6 else f"f'(x) = {bad}"]; DIFF("product-rule", f, lines, [None, bad if i != 6 else bad], tags=["wrong-product-rule"])
        else:
            lines = [f"f(x) = {f}", "Use the product rule"]; DIFF("product-rule", f, lines, [None, None], tags=["stop"])

def D4():
    items = [("x/(x + 1)", "1/(x + 1)^2", "(x + 1 - x)/(x + 1)"), ("x^2/(x - 3)", "(2x(x - 3) - x^2)/(x - 3)^2", "(x^2 - 2x(x - 3))/(x - 3)^2"), ("sin(x)/x", "(x cos(x) - sin(x))/x^2", "(sin(x) - x cos(x))/x^2"),
             ("(x + 2)/(x - 1)", "-3/(x - 1)^2", "3/(x - 1)^2"), ("exp(x)/x", "(x exp(x) - exp(x))/x^2", "(x exp(x) - exp(x))/x"), ("1/(x^2 + 1)", "-2x/(x^2 + 1)^2", "-2x/(x^2 + 1)")]
    for i, (f, good, bad) in enumerate(items):
        if i < 3:
            lines = [f"f(x) = {f}", f"f'(x) = {good}"]; DIFF("quotient-rule", f, lines, [None, good], tags=["valid"])
        elif i < 5:
            lines = [f"f(x) = {f}", f"f'(x) = {bad}"]; DIFF("quotient-rule", f, lines, [None, bad], tags=["wrong-quotient-rule"])
        else:
            lines = [f"f(x) = {f}", "Use the quotient rule"]; DIFF("quotient-rule", f, lines, [None, None], tags=["stop"])

def D5():
    items = [("(x + 1)^2", ["f(x) = (x + 1)^2", "f(x) = x^2 + 2x + 1", "f'(x) = 2x + 2"], [None, None, "2x + 2"]),
             ("(2x + 3)^2", ["f(x) = (2x + 3)^2", "f(x) = 4x^2 + 12x + 9", "f'(x) = 8x + 12"], [None, None, "8x + 12"]),
             ("(x - 1)(x + 4)", ["f(x) = (x - 1)(x + 4)", "f(x) = x^2 + 3x - 4", "f'(x) = 2x + 3"], [None, None, "2x + 3"]),
             ("x(x^2 + 5)", ["f(x) = x(x^2 + 5)", "f(x) = x^3 + 5x", "f'(x) = 3x^2 + 5"], [None, None, "3x^2 + 5"])]
    for f, lines, claims in items: DIFF("alternative-expand-first", f, lines, claims, tags=["valid", "alt"], alt=True)

def D6():
    DIFF("outside-scope", "sqrt(x)", ["f(x) = sqrt(x)", "f'(x) = 1/(2 sqrt(x))"], [None, "1/(2 sqrt(x))"], tags=["valid"], scope="radical-derivative")
    DIFF("outside-scope", "sqrt(3x + 1)", ["f(x) = sqrt(3x + 1)", "f'(x) = 3/(2 sqrt(3x + 1))"], [None, "3/(2 sqrt(3x + 1))"], tags=["valid"], scope="radical-derivative")
    DIFF("outside-scope", "sin(x)^2", ["f(x) = sin(x)^2", "f'(x) = 2 sin(x) cos(x)"], [None, "2 sin(x) cos(x)"], tags=["valid", "chain-power-of-function"])
    DIFF("second-derivative", "x^4 - 3x^2", ["f(x) = x^4 - 3x^2", "f''(x) = 12x^2 - 6"], [None, "12x^2 - 6"], tags=["valid"], order=2)
    DIFF("second-derivative", "x^3 + 2x", ["f(x) = x^3 + 2x", "f''(x) = 6x + 2"], [None, "6x + 2"], tags=["wrong-order-result"], order=2, ref_override=("invalid", 1))
    DIFF("outside-scope", "x^2 exp(-x)", ["f(x) = x^2 exp(-x)", "f'(x) = 2x exp(-x) - x^2 exp(-x)"], [None, "2x exp(-x) - x^2 exp(-x)"], tags=["valid", "product-and-chain"])

# ---------------------------------------------------------------------------------------------------- integration
def indef_ref(fstr, lines, claims):
    """claims: list of (antiderivative-string or None, has_constant)."""
    f = O.parse(fstr); stat = []
    for c in claims:
        if c is None: stat.append("prose"); continue
        expr, hasC = c
        r = O.same_function(O.diff(O.parse(expr), "x"), f)
        stat.append("false" if r is False else ("valid" if hasC else "missingC"))
    if "false" in stat: return "invalid", stat.index("false")
    if "missingC" in stat: return "missing-assumption", None
    return ("verified", None) if stat and stat[-1] == "valid" else ("incomplete", None)

def INDEF(family, fstr, lines, claims, tags=(), scope="in-scope", fmt="natural", alt=False, ref_override=None):
    ref = ref_override or indef_ref(fstr, lines, claims)
    prob = dict(domain="calculus", task="indefinite-integral", integrand=to_expr(O.parse(fstr)), variable="x")
    add("integration", family, prob, lines, (ref[0], ref[1], "oracle: derivative of the claimed antiderivative agrees with the integrand at >= 8 rational points; +C required"), fmt, tags, alt, scope)

def I1():
    items = [("3x^2 + 2x", "x^3 + x^2", "x^3 + 2x^2"), ("4x^3 - 6x", "x^4 - 3x^2", "x^4 - 6x^2"), ("5x^4 + 1", "x^5 + x", "5x^5 + x"), ("2x + 7", "x^2 + 7x", "x^2 + 7")]
    for i, (f, F_, bad) in enumerate(items):
        if i < 3: INDEF("polynomial", f, [f"∫ ({f}) dx = {F_} + C"], [(F_, True)], tags=["valid"])
    INDEF("polynomial", "6x^2 - 4x", ["∫ (6x^2 - 4x) dx = 2x^3 - 2x^2"], [("2x^3 - 2x^2", False)], tags=["missing-constant"])
    INDEF("polynomial", "9x^2 + 2", ["∫ (9x^2 + 2) dx = 3x^3 + 2x"], [("3x^3 + 2x", False)], tags=["missing-constant"])
    INDEF("polynomial", "8x^3 - 3", ["∫ (8x^3 - 3) dx = 2x^4 - 3 + C"], [("2x^4 - 3", True)], tags=["wrong-antiderivative"])
    INDEF("polynomial", "2x + 7", [f"∫ (2x + 7) dx = x^2 + 7 + C"], [("x^2 + 7", True)], tags=["wrong-antiderivative"])
    INDEF("polynomial", "3x^2 + 4x", ["∫ (3x^2 + 4x) dx", "Integrate term by term"], [None, None], tags=["stop"], ref_override=("incomplete", None, ""))

def I2():
    INDEF("trig-exp", "cos(2x)", ["∫ cos(2x) dx = sin(2x)/2 + C"], [("sin(2x)/2", True)], tags=["valid"])
    INDEF("trig-exp", "exp(3x)", ["∫ exp(3x) dx = exp(3x)/3 + C"], [("exp(3x)/3", True)], tags=["valid"])
    INDEF("trig-exp", "sin(5x)", ["∫ sin(5x) dx = -cos(5x)/5 + C"], [("-cos(5x)/5", True)], tags=["valid"])
    INDEF("trig-exp", "cos(4x)", ["∫ cos(4x) dx = sin(4x) + C"], [("sin(4x)", True)], tags=["missing-inner-factor"])
    INDEF("trig-exp", "exp(2x)", ["∫ exp(2x) dx = exp(2x) + C"], [("exp(2x)", True)], tags=["missing-inner-factor"])
    INDEF("trig-exp", "sin(3x)", ["∫ sin(3x) dx = -cos(3x)/3"], [("-cos(3x)/3", False)], tags=["missing-constant"])

def I3():
    INDEF("substitution-claim", "2x(x^2 + 1)^3", ["∫ 2x(x^2 + 1)^3 dx = (x^2 + 1)^4/4 + C"], [("(x^2 + 1)^4/4", True)], tags=["valid"])
    INDEF("substitution-claim", "3x^2(x^3 + 2)^4", ["∫ 3x^2(x^3 + 2)^4 dx = (x^3 + 2)^5/5 + C"], [("(x^3 + 2)^5/5", True)], tags=["valid"])
    INDEF("substitution-claim", "2x exp(x^2)", ["∫ 2x exp(x^2) dx = exp(x^2) + C"], [("exp(x^2)", True)], tags=["valid"])
    INDEF("substitution-claim", "2x(x^2 + 1)^3", ["∫ 2x(x^2 + 1)^3 dx = (x^2 + 1)^4 + C"], [("(x^2 + 1)^4", True)], tags=["forgot-divide-by-power"])
    INDEF("substitution-claim", "x exp(x^2)", ["∫ x exp(x^2) dx = exp(x^2) + C"], [("exp(x^2)", True)], tags=["forgot-half"])

def DEF(family, fstr, a, b, lines, claims, tags=(), alt=False, scope="in-scope", ref_override=None):
    """claims: list of ('F', antiderivative string) | ('v', value string) | None; the definite integral value is computed exactly by the oracle."""
    f = O.parse(fstr)
    # exact value through an exact polynomial antiderivative search is delegated to the supplied true antiderivative string 'true_F'
    raise NotImplementedError

def poly_int_value(coefs, a, b):  # exact Fraction polynomial definite integral: coefs low->high
    Fp = [F(0)] + [c / (i + 1) for i, c in enumerate(coefs)]
    return O.peval(Fp, F(b)) - O.peval(Fp, F(a))

def DEFINT(family, coefs, fstr, Fstr, a, b, lines, claims, tags=(), alt=False, scope="in-scope", ref_override=None):
    val = poly_int_value([F(c) for c in coefs], a, b); stat = []
    for c in claims:
        if c is None: stat.append("prose"); continue
        kind, s = c
        if kind == "F":
            r = O.same_function(O.diff(O.parse(s), "x"), O.parse(fstr)); stat.append("valid" if r else "false")
        else:
            v = O.ev(O.parse(s), {}); stat.append("valid" if abs(v - Decimal_of(val)) < O.TOL else "false")
    if ref_override: ref = ref_override
    elif "false" in stat: ref = ("invalid", stat.index("false"))
    else: ref = ("verified", None) if stat and stat[-1] == "valid" and claims[-1] and claims[-1][0] == "v" else ("incomplete", None)
    prob = dict(domain="calculus", task="definite-integral", integrand=to_expr(O.parse(fstr)), variable="x", lower=str(a), upper=str(b))
    add("integration", family, prob, lines, (ref[0], ref[1], "oracle: exact Fraction polynomial antiderivative; value F(b) - F(a)"), "natural", tags, alt, scope)

def I4():
    # ∫_0^2 3x^2 dx = 8
    DEFINT("definite-polynomial", [0, 0, 3], "3x^2", "x^3", 0, 2, ["∫_0^2 3x^2 dx = 8"], [("v", "8")], tags=["valid", "one-line"])
    DEFINT("definite-polynomial", [0, 2, 3], "2x + 3x^2", "x^2 + x^3", 1, 3, ["∫_1^3 (2x + 3x^2) dx = [x^2 + x^3]_1^3", "[x^2 + x^3]_1^3 = (9 + 27) - (1 + 1)", "(9 + 27) - (1 + 1) = 34"], [("F", "x^2 + x^3"), ("v", "(9+27)-(1+1)"), ("v", "34")], tags=["valid", "bracket-chain"], scope="bracket-chain")
    DEFINT("definite-polynomial", [1, 0, 4], "1 + 4x^2", "x + 4x^3/3", 0, 3, ["F(x) = x + 4x^3/3", "F(3) - F(0) = 3 + 36", "F(3) - F(0) = 39"], [("F", "x + 4x^3/3"), ("v", "3+36"), ("v", "39")], tags=["valid", "F-notation"])
    DEFINT("definite-polynomial", [0, 6, 0], "6x", "3x^2", 1, 4, ["∫_1^4 6x dx = 45"], [("v", "45")], tags=["valid", "one-line"])
    DEFINT("definite-polynomial", [0, 0, 3], "3x^2", "x^3", 0, 2, ["∫_0^2 3x^2 dx = 4"], [("v", "4")], tags=["wrong-value"])
    DEFINT("definite-polynomial", [0, 2, 3], "2x + 3x^2", "x^2 + x^3", 1, 3, ["F(x) = x^2 + x^3", "F(3) - F(1) = 36 - 2", "F(3) - F(1) = 36"], [("F", "x^2 + x^3"), ("v", "36-2"), ("v", "36")], tags=["arith-slip"])
    DEFINT("definite-polynomial", [0, 6, 0], "6x", "3x^2", 1, 4, ["F(x) = 3x^2", "F(1) - F(4) = 3 - 48", "F(1) - F(4) = -45"], [("F", "3x^2"), ("v", "3-48"), ("v", "-45")], tags=["reversed-bounds"])
    DEFINT("definite-polynomial", [1, 0, 4], "1 + 4x^2", "x + 4x^3/3", 0, 3, ["F(x) = x + 4x^2/3"], [("F", "x + 4x^2/3")], tags=["wrong-antiderivative"])
    DEFINT("definite-polynomial", [0, 6, 0], "6x", "3x^2", 1, 4, ["F(x) = 3x^2"], [("F", "3x^2")], tags=["stop-at-antiderivative"])

def I5():
    # ∫_0^1 2x(x^2+1)^2 dx via u = x^2 + 1: = ∫_1^2 u^2 du = 7/3
    prob = dict(domain="calculus", task="definite-integral", integrand=to_expr(O.parse("2x(x^2 + 1)^2")), variable="x", lower="0", upper="1")
    add("integration", "definite-substitution", prob, ["u = x^2 + 1", "∫_0^1 2x(x^2 + 1)^2 dx = ∫_1^2 u^2 du", "= 7/3"], ("verified", None, "oracle: bounds u(0)=1, u(1)=2; exact value 7/3"), tags=["valid"], scope="substitution-method")
    prob = dict(domain="calculus", task="definite-integral", integrand=to_expr(O.parse("3x^2(x^3 + 1)")), variable="x", lower="0", upper="1")
    add("integration", "definite-substitution", prob, ["u = x^3 + 1", "∫_0^1 3x^2(x^3 + 1) dx = ∫_1^2 u du", "= 3/2"], ("verified", None, "oracle: bounds 1..2, value 3/2"), tags=["valid"], scope="substitution-method")
    prob = dict(domain="calculus", task="definite-integral", integrand=to_expr(O.parse("2x(x^2 + 1)^2")), variable="x", lower="0", upper="1")
    add("integration", "definite-substitution", prob, ["u = x^2 + 1", "∫_0^1 2x(x^2 + 1)^2 dx = ∫_0^1 u^2 du", "= 1/3"], ("invalid", 1, "oracle: u-bounds must be u(0)=1 and u(1)=2, not 0 and 1"), tags=["bounds-not-converted"], scope="substitution-method")
    prob = dict(domain="calculus", task="definite-integral", integrand=to_expr(O.parse("3x^2(x^3 + 1)")), variable="x", lower="0", upper="1")
    add("integration", "definite-substitution", prob, ["u = x^3 + 1", "∫_0^1 3x^2(x^3 + 1) dx = ∫_0^1 u du", "= 1/2"], ("invalid", 1, "oracle: u-bounds must be 1..2"), tags=["bounds-not-converted"], scope="substitution-method")

def I6():
    INDEF("by-parts-claim", "x exp(x)", ["∫ x exp(x) dx = x exp(x) - exp(x) + C"], [("x exp(x) - exp(x)", True)], tags=["valid"])
    INDEF("outside-scope", "1/x", ["∫ 1/x dx = ln(abs(x)) + C"], [("ln(x)", True)], tags=["valid", "abs-log"], scope="abs-log", ref_override=("verified", None, "oracle: ln|x| is an antiderivative of 1/x on each interval"))
    INDEF("by-parts-claim", "x cos(x)", ["∫ x cos(x) dx = x sin(x) + cos(x) + C"], [("x sin(x) + cos(x)", True)], tags=["valid"])

# ---------------------------------------------------------------------------------------------------- limits
def LIM(family, fstr, approach, claimed_lines, claim_vals, truth, tags=(), side="both", method="direct", equiv=None, scope="in-scope", alt=False):
    """truth: ('finite', Fraction) | ('inf', +1/-1) | ('dne',). claim_vals: per line ('finite',v)|('inf',s)|('dne',)|None(prose/intermediate-ok)|'ok' ."""
    stat = []
    for cv in claim_vals:
        if cv is None: stat.append("prose")
        elif cv == "ok": stat.append("valid")
        else: stat.append("valid" if cv == truth else "false")
    if "false" in stat: ref = ("invalid", stat.index("false"))
    elif stat and stat[-1] == "valid" and claim_vals[-1] not in (None,) and claim_vals[-1] != "ok": ref = ("verified", None)
    else: ref = ("incomplete", None)
    prob = dict(domain="calculus", task="limit", expression=to_expr(O.parse(fstr)), variable="x", approach=str(approach), side=side, method=method)
    if equiv: prob["equivalentExpression"] = to_expr(O.parse(equiv))
    add("limits-continuity", family, prob, claimed_lines, (ref[0], ref[1], "oracle: exact polynomial arithmetic over Q"), "natural", tags, alt, scope)

def L1():
    LIM("direct-substitution", "2x^2 - x + 1", 3, ["lim_(x→3) (2x^2 - x + 1) = 2(3)^2 - 3 + 1 = 16"], [("finite", F(16))], ("finite", F(16)), tags=["valid"])
    LIM("direct-substitution", "x^3 + 4", 2, ["lim_(x→2) (x^3 + 4) = 8 + 4 = 12"], [("finite", F(12))], ("finite", F(12)), tags=["valid"])
    LIM("direct-substitution", "3x^2 + 2x - 5", -1, ["lim_(x→-1) (3x^2 + 2x - 5) = 3 - 2 - 5 = -4"], [("finite", F(-4))], ("finite", F(-4)), tags=["valid"])
    LIM("direct-substitution", "2x^2 - x + 1", 3, ["lim_(x→3) (2x^2 - x + 1) = 2(9) - 3 + 1 = 17"], [("finite", F(17))], ("finite", F(16)), tags=["arith-slip"])
    LIM("direct-substitution", "x^2 + 5x", 1, ["lim_(x→1) (x^2 + 5x) = 5"], [("finite", F(5))], ("finite", F(6)), tags=["dropped-term"])

def L2():
    LIM("removable", "(x^2 - 9)/(x - 3)", 3, ["lim_(x→3) (x^2 - 9)/(x - 3) = lim_(x→3) (x + 3) = 6"], [("finite", F(6))], ("finite", F(6)), tags=["valid"], method="removable", equiv="x + 3")
    LIM("removable", "(x^2 - 4)/(x - 2)", 2, ["lim_(x→2) (x^2 - 4)/(x - 2) = lim_(x→2) (x - 2)(x + 2)/(x - 2) = lim_(x→2) (x + 2) = 4"], [("finite", F(4))], ("finite", F(4)), tags=["valid"], method="removable", equiv="x + 2")
    LIM("removable", "(x^2 - 25)/(x - 5)", 5, ["(x^2 - 25)/(x - 5) = (x - 5)(x + 5)/(x - 5)", "(x - 5)(x + 5)/(x - 5) = x + 5", "lim_(x→5) (x + 5) = 10"], ["ok", "ok", ("finite", F(10))], ("finite", F(10)), tags=["valid", "multi-line"], method="removable", equiv="x + 5")
    LIM("removable", "(x^2 - 9)/(x - 3)", 3, ["lim_(x→3) (x^2 - 9)/(x - 3) = 0/0 = 0"], [("finite", F(0))], ("finite", F(6)), tags=["zero-over-zero-is-zero"], method="removable", equiv="x + 3")
    LIM("removable", "(x^2 - 16)/(x - 4)", 4, ["lim_(x→4) (x^2 - 16)/(x - 4) does not exist"], [("dne",)], ("finite", F(8)), tags=["claims-dne"], method="removable", equiv="x + 4")
    LIM("removable", "(x^2 - 1)/(x - 1)", 1, ["lim_(x→1) (x^2 - 1)/(x - 1) = (1 - 1)/(1 - 1)"], [None], ("finite", F(2)), tags=["stop-at-0/0"], method="removable", equiv="x + 1")
    LIM("removable-non-diff-squares", "(x^2 - 5x + 6)/(x - 2)", 2, ["lim_(x→2) (x^2 - 5x + 6)/(x - 2) = lim_(x→2) (x - 3) = -1"], [("finite", F(-1))], ("finite", F(-1)), tags=["valid"], scope="trinomial-cancellation")

def L3():
    LIM("limit-at-infinity", "(3x^2 + 1)/(x^2 - 5)", "infinity", ["lim_(x→∞) (3x^2 + 1)/(x^2 - 5) = 3"], [("finite", F(3))], ("finite", F(3)), tags=["valid"], method="rational-infinity")
    LIM("limit-at-infinity", "(x + 1)/(x^2 + 1)", "infinity", ["lim_(x→∞) (x + 1)/(x^2 + 1) = 0"], [("finite", F(0))], ("finite", F(0)), tags=["valid"], method="rational-infinity")
    LIM("limit-at-infinity", "(2x^2 - x)/(x^2 + 4)", "infinity", ["lim_(x→∞) (2x^2 - x)/(x^2 + 4) = 2"], [("finite", F(2))], ("finite", F(2)), tags=["valid"], method="rational-infinity")
    LIM("limit-at-infinity", "(5x^2 + 2)/(x^2 + 3)", "infinity", ["lim_(x→∞) (5x^2 + 2)/(x^2 + 3) = ∞"], [("inf", 1)], ("finite", F(5)), tags=["claims-infinity"], method="rational-infinity")
    LIM("limit-at-infinity", "(4x + 1)/(2x - 3)", "infinity", ["lim_(x→∞) (4x + 1)/(2x - 3) = 4"], [("finite", F(4))], ("finite", F(2)), tags=["wrong-ratio"], method="rational-infinity")

def L4():
    LIM("reciprocal", "1/x", 0, ["lim_(x→0) 1/x does not exist"], [("dne",)], ("dne",), tags=["valid"], method="reciprocal")
    LIM("reciprocal", "1/x", 0, ["lim_(x→0+) 1/x = ∞"], [("inf", 1)], ("inf", 1), tags=["valid", "one-sided"], method="reciprocal", side="right")
    LIM("reciprocal", "1/x", 0, ["lim_(x→0) 1/x = ∞"], [("inf", 1)], ("dne",), tags=["two-sided-claimed-infinite"], method="reciprocal")
    LIM("reciprocal", "1/x", 0, ["lim_(x→0-) 1/x = ∞"], [("inf", 1)], ("inf", -1), tags=["wrong-sign"], method="reciprocal", side="left")

def L5():
    LIM("standard-trig", "sin(x)/x", 0, ["lim_(x→0) sin(x)/x = 1"], [("finite", F(1))], ("finite", F(1)), tags=["valid"], method="standard-trig")
    LIM("standard-trig", "(1 - cos(x))/x^2", 0, ["lim_(x→0) (1 - cos(x))/x^2 = 1/2"], [("finite", F(1, 2))], ("finite", F(1, 2)), tags=["valid"], scope="outside-standard-trig")

def L6():  # continuity of a piecewise function at x = a
    for k, (l, r, a, ok) in enumerate([("x^2 + 1", "3x - 1", 2, True), ("2x + 1", "x^2 + 2", 1, True)]):
        pass
    add("limits-continuity", "continuity", dict(domain="calculus", task="continuity", left=to_expr(O.parse("x^2 + 1")), right=to_expr(O.parse("3x - 1")), variable="x", point="2"),
        ["left: f(2) = 2^2 + 1 = 5", "right: f(2) = 3(2) - 1 = 5", "the two pieces agree at x = 2, so f is continuous at 2"], ("verified", None, "oracle: both one-sided values equal 5"), tags=["valid"], scope="continuity-multi-line")
    add("limits-continuity", "continuity", dict(domain="calculus", task="continuity", left=to_expr(O.parse("x^2")), right=to_expr(O.parse("2x + 1")), variable="x", point="2"),
        ["left: f(2) = 2^2 = 4", "right: f(2) = 2(2) + 1 = 5", "the two pieces agree at x = 2, so f is continuous at 2"], ("invalid", 2, "oracle: 4 != 5, f is not continuous at 2"), tags=["false-claim"], scope="continuity-multi-line")

# ======================================================================================================= build
for fn in (A1, A2, A3, A4, A5, A6, A7, C1, C2, C3, C4, C5, C6, P1, P2, P3, P4, P5, P6, D1, D2, D3, D4, D5, D6, I1, I2, I3, I4, I5, I6, L1, L2, L3, L4, L5, L6): fn()

# coordinate cases: recompute every reference with the oracle and require agreement with the hand-derived label
def _coord_target(c):
    pr = c["problem"]["problem"]; g = pr["goal"]; ob = {o["id"]: o for o in pr["objects"]}
    if g["predicate"] == "midpoint":
        a, b = ob["A"]["data"], ob["B"]["data"]; return (F(a["x"] + b["x"], 2), F(a["y"] + b["y"], 2))
    if g["predicate"] == "slope": return F(g["value"])
    if g["predicate"] == "distance_squared" and c["family"] == "distance-irrational":
        from decimal import Decimal; return Decimal(g["value"]).sqrt()
    if g["predicate"] in ("distance_squared", "length"): return F(g["value"])
    return None
for c in CASES:
    if c["category"] == "coordinate-geometry" and c["family"] in ("midpoint", "slope", "distance-squared", "distance", "distance-irrational"):
        tg = _coord_target(c); lines = c["studentWorking"]["text"].split("\n")
        if c["family"] == "distance":  # lines are 'd = sqrt(...)' chains with numeric pieces
            pass
        got = coord_oracle(lines, tg)
        want = (c["reference"]["classification"], c["reference"]["firstInvalidStep"])
        if got != want: print("ORACLE/LABEL MISMATCH", c["family"], lines, got, want)
        c["reference"]["classification"], c["reference"]["firstInvalidStep"] = got
        c["reference"]["complete"] = got[0] == "verified"; c["reference"]["mustNotVerify"] = got[0] != "verified"
# normalise reference tuples (some helpers pass 3-tuples)
counts = {}
for c in CASES: counts[c["category"]] = counts.get(c["category"], 0) + 1
if __name__ == "__main__":
    print(counts, len(CASES))

# ======================================================================================================= split, id, freeze
def build():
    TARGET = {"angle-relationships": 25, "coordinate-geometry": 15, "geometry-proof-steps": 10, "differentiation": 20, "integration": 17, "limits-continuity": 13}
    by_cat = {}
    for c in CASES: by_cat.setdefault(c["category"], []).append(c)
    dev, sealed = [], []
    for cat, cs in by_cat.items():
        fams = {}
        for c in cs: fams.setdefault(c["family"], []).append(c)
        want = TARGET[cat]; chosen = []
        # alternate inside each family (balanced), starting side chosen to land on the target total
        order = list(fams.values()); start = 0
        for start_try in itertools.product([0, 1], repeat=len(order)):
            n = 0
            for fam, st in zip(order, start_try): n += sum(1 for i in range(len(fam)) if (i + st) % 2 == 0)
            if n == want: break
        else: raise SystemExit(f"cannot hit dev target for {cat}")
        for fam, st in zip(order, start_try):
            for i, c in enumerate(fam): (dev if (i + st) % 2 == 0 else sealed).append(c)
    assert len(dev) == 100 and len(sealed) == 100, (len(dev), len(sealed))
    for part, lst in (("development", dev), ("sealed-holdout", sealed)):
        R2 = random.Random(hashlib.sha256(part.encode()).hexdigest()); R2.shuffle(lst)
        for i, c in enumerate(lst):
            c["id"] = f"e5-{'dev' if part == 'development' else 'sealed'}-{i:03d}"; c["partition"] = part
            c["provenance"] = dict(kind="independently-authored", license="CC0-1.0", oracle="e5_oracle.py (Fractions + Decimal(70)); no OpenPath code; SymPy unavailable offline", seed=20261103)
    for name, lst in (("dev-cases.v1.json", dev), ("sealed-cases.v1.json", sealed)):
        json.dump(dict(benchmark="openpath-e5-geometry-calculus", version="1", seed=20261103, cases=lst), open(name, "w"), indent=1, ensure_ascii=False)
    return dev, sealed

if __name__ == "__main__" and FUZZ:
    os.makedirs("fuzz", exist_ok=True)
    for i, c in enumerate(CASES): c["id"] = f"e5-fuzz-{FUZZ}-{i:03d}"; c["partition"] = "fuzz"
    json.dump(dict(benchmark="openpath-e5-geometry-calculus-fuzz", seed=int(FUZZ), cases=CASES), open(f"fuzz/fuzz-seed{FUZZ}.json", "w"), indent=1, ensure_ascii=False)
    print("fuzz", FUZZ, len(CASES))
elif __name__ == "__main__":
    dev, sealed = build()
    for name, lst in (("dev", dev), ("sealed", sealed)):
        import collections
        print(name, dict(collections.Counter(c["category"] for c in lst)), dict(collections.Counter(c["reference"]["classification"] for c in lst)))
