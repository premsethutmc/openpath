"""Independent domain/identity oracle for the symbolic-algebra engine.

Shares NO code with the engine: its own parser, its own exact evaluator (fractions.Fraction), its own derivation state machine.
Semantics are POINTWISE, so no polynomial gcd / radical / cancellation machinery is used anywhere:
  * an expression is *defined* at a point iff evaluating it exactly never divides by zero (0^0 and 0^negative are undefined; exponents must be integers);
  * two lines are an IDENTITY iff they agree at every grid point where both are defined; a single exact differing point is a proof of non-identity;
  * a restriction is LOST by a step iff some point makes the previous line undefined and the new line defined (INTRODUCED: the reverse);
  * a statement 'q != 0' excludes exactly the points where q evaluates to 0.
The grid is finite, so a "no loss" verdict is evidence rather than proof; every disagreement with the engine is inspected by hand.
"""
import itertools, random, re
from fractions import Fraction as F

FUNCS = re.compile(r"\b(?:sin|cos|tan|log|ln|exp|sqrt|abs|min|max|floor|ceil)\b", re.I)
G = [F(-3), F(-2), F(-1), F(-1, 2), F(0), F(1, 2), F(1), F(3, 2), F(2), F(3)]
EXPG = [0, 1, 2, 3, -1, -2]

def norm(s):
    s = s.strip().replace("−", "-").replace("×", "*").replace("·", "*").replace("÷", "/").replace("²", "^2").replace("³", "^3")
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"(\d|[a-zA-Z]|\))(?=[a-zA-Z(])", r"\1*", s)
    s = re.sub(r"\)(?=\d)", ")*", s)
    return s

def parse(src):
    s = norm(src); i = 0
    def peek(): return s[i] if i < len(s) else ""
    def sum_():
        nonlocal i
        l = prod()
        while peek() in ("+", "-"):
            op = s[i]; i += 1; r = prod(); l = (op, l, r)
        return l
    def prod():
        nonlocal i
        l = unary()
        while peek() in ("*", "/"):
            op = s[i]; i += 1; r = unary(); l = (op, l, r)
        return l
    def unary():
        nonlocal i
        if peek() == "-": i += 1; return ("neg", unary())
        return power()
    def power():
        nonlocal i
        b = atom()
        if peek() == "^": i += 1; return ("^", b, unary())
        return b
    def atom():
        nonlocal i
        c = peek()
        if c == "(":
            i += 1; e = sum_()
            assert peek() == ")", "expected )"; i += 1; return e
        if c.isalpha(): i += 1; return ("v", c)
        m = re.match(r"\d+(?:\.\d+)?", s[i:]); assert m, f"bad token at {i} in {s}"
        i += len(m.group(0)); return ("n", F(m.group(0)))
    e = sum_(); assert i == len(s), f"trailing input in {s}"; return e

class Skip(Exception):
    """a point outside the documented symbolic-exponent assumption (a zero base raised to a symbolic exponent that is not a positive integer)"""

def hasv(e):
    return e[0] == "v" or (e[0] == "neg" and hasv(e[1])) or (e[0] not in ("n", "v", "neg") and (hasv(e[1]) or hasv(e[2])))

def consts(e, acc):
    if e[0] == "n": acc.add(e[1])
    elif e[0] == "neg": consts(e[1], acc)
    elif e[0] != "v": consts(e[1], acc); consts(e[2], acc)

def ev(e, p):
    """exact value (Fraction) or None where undefined"""
    t = e[0]
    if t == "n": return e[1]
    if t == "v": return p.get(e[1])
    if t == "neg": a = ev(e[1], p); return None if a is None else -a
    a = ev(e[1], p); b = ev(e[2], p)
    if a is None or b is None: return None
    if t == "+": return a + b
    if t == "-": return a - b
    if t == "*": return a * b
    if t == "/": return None if b == 0 else a / b
    if t == "^":
        if b.denominator != 1 or abs(b) > 64: return None
        k = int(b)
        if hasv(e[2]) and a == 0: return None      # generic reading: 0 to a symbolic exponent is undefined (the exponent's sign is unknown)
        if a == 0 and k <= 0: return None
        return a ** k
    raise ValueError(t)

def vars_of(e, acc=None):
    acc = set() if acc is None else acc
    if e[0] == "v": acc.add(e[1])
    elif e[0] in ("neg",): vars_of(e[1], acc)
    elif e[0] != "n": vars_of(e[1], acc); vars_of(e[2], acc)
    return acc

def expsyms(e, acc=None, inexp=False):
    acc = set() if acc is None else acc
    if e[0] == "v" and inexp: acc.add(e[1])
    elif e[0] == "neg": expsyms(e[1], acc, inexp)
    elif e[0] == "^": expsyms(e[1], acc, inexp); expsyms(e[2], acc, True)
    elif e[0] not in ("n", "v"): expsyms(e[1], acc, inexp); expsyms(e[2], acc, inexp)
    return acc

def points(vs, es, n_rand=2500, seed=1, extra=()):
    vs = sorted(vs); rng = random.Random(seed)
    grid = sorted(set(G) | {c for c in extra} | {-c for c in extra})
    if len(grid) > 28: grid = sorted(set(G) | set(sorted(extra)[:6]) | {-c for c in sorted(extra)[:6]})
    dom = lambda v: EXPG if v in es else grid
    size = 1
    for v in vs: size *= len(dom(v))
    if size <= 4000:
        for combo in itertools.product(*[dom(v) for v in vs]): yield dict(zip(vs, [F(c) for c in combo]))
    else:
        for _ in range(n_rand): yield {v: F(rng.choice(dom(v))) for v in vs}
        for _ in range(n_rand // 2):   # structured: equal / opposite letters make a-b, a+b vanish
            base = {v: F(rng.choice(dom(v))) for v in vs}
            if len(vs) >= 2 and not any(v in es for v in vs[:2]): base[vs[1]] = base[vs[0]] * rng.choice([1, -1])
            yield base

STMT = re.compile(r"(?:≠|!=)")
def split_line(raw):
    body = re.sub(r"\b(?:and|for|where|when|provided|if|with)\b", ",", raw)
    segs, depth, cur = [], 0, ""
    for ch in body:
        if ch == "(": depth += 1
        if ch == ")": depth -= 1
        if depth == 0 and ch in ",;": segs.append(cur); cur = ""
        else: cur += ch
    segs.append(cur)
    exprs, stmts = [], []
    for sg in [x.strip() for x in segs if x.strip()]:
        sg = sg.strip("() ") if STMT.search(sg) and sg.startswith("(") else sg
        if STMT.search(sg):
            a, b = STMT.split(sg, maxsplit=1); stmts.append((parse(a), parse(b)))
        else: exprs.append(sg)
    return (exprs[0] if exprs else ""), stmts

def derive(original, lines, declared=()):
    """Oracle verdict for a whole derivation. Returns per-step classes and final domain facts."""
    O = parse(original)
    parsed = []
    for ln in lines:
        ex, st = split_line(ln)
        sides = [parse(x) for x in ex.split("=")] if ex else []
        parsed.append((ex, sides, st))
    allv = set(vars_of(O)); es = set(expsyms(O))
    for ex, sides, st in parsed:
        for s in sides: allv |= vars_of(s); es |= expsyms(s)
        for a, b in st: allv |= vars_of(a) | vars_of(b)
    for a, b in declared: allv |= vars_of(a) | vars_of(b)
    cs = set()
    for ex_, sides_, st_ in parsed:
        for s_ in sides_: consts(s_, cs)
        for a_, b_ in st_: consts(a_, cs); consts(b_, cs)
    consts(O, cs); cs = {c for c in cs if c.denominator == 1 and 0 < abs(c) <= 50}
    cs |= {c / k for c in list(cs) for k in (2, 3)}  # roots of linear restrictions such as 2a+3 != 0 (a = -3/2)
    pts = list(points(allv, es, extra=cs))
    def skipped(p):
        try:
            for e_ in [O] + [s_ for _, sides_, _ in parsed for s_ in sides_]: ev(e_, p)
            return False
        except Skip: return True
    stated = [(a, b) for a, b in declared]
    excl = lambda p, S: any((ev(a, p) is not None and ev(b, p) is not None and ev(a, p) == ev(b, p)) for a, b in S)
    prev, prev_ok = O, True; steps = []; mains = []; first_invalid = None
    for k, (ex, sides, st) in enumerate(parsed):
        stated = stated + st
        if not sides:
            steps.append({"cls": "statement" if st else "empty"}); continue
        ref = prev if prev_ok else O
        chain = [ref] + [sides[0]] + sides[1:]
        links = [(chain[0], chain[1])] + [(sides[j], sides[j + 1]) for j in range(len(sides) - 1)]
        differs = False; lost = False; intro_bad = False; intro_cond = False; unsupported = False
        for a, b in links:
            for p in pts:
                va, vb = ev(a, p), ev(b, p)
                if va is not None and vb is not None and va != vb: differs = True; break
            if differs: break
        if differs:
            steps.append({"cls": "invalid"}); prev = sides[-1]; prev_ok = False
            if first_invalid is None: first_invalid = k + 1
            continue
        for a, b in links:
            for p in pts:
                da, db = ev(a, p) is not None, ev(b, p) is not None
                if da and not db and ev(O, p) is not None and not excl(p, stated):   # introduced, original allowed it, nobody excluded it
                    intro_bad = True
                elif da and not db and ev(O, p) is not None and excl(p, stated): intro_cond = True
                elif (not da) and db and not excl(p, stated): lost = True
        if intro_bad:
            steps.append({"cls": "invalid"}); prev = sides[-1]; prev_ok = False
            if first_invalid is None: first_invalid = k + 1
            continue
        cls = "conditional" if (intro_cond or lost) else "valid"
        steps.append({"cls": cls}); prev = sides[-1]; prev_ok = True; mains.append(sides[-1])
    final = {"missing": False, "narrowed": False}
    if first_invalid is None and mains:
        last = mains[-1]
        for p in pts:
            if ev(O, p) is None and ev(last, p) is not None and not excl(p, stated): final["missing"] = True; break
        for (a, b) in stated:   # narrowed: excludes a point where the original and EVERY written main line are defined
            for p in pts:
                if ev(a, p) is not None and ev(b, p) is not None and ev(a, p) == ev(b, p) and ev(O, p) is not None and all(ev(m, p) is not None for m in mains):
                    final["narrowed"] = True; break
    return {"steps": steps, "first_invalid": first_invalid, "final": final}

def relation(a, b):
    A, B = parse(a), parse(b); vs = vars_of(A) | vars_of(B); es = expsyms(A) | expsyms(B)
    diff = agree = False
    for p in points(vs, es):
        try: va, vb = ev(A, p), ev(B, p)
        except Skip: continue
        if va is None or vb is None: continue
        if va != vb: diff = True
        else: agree = True
    return "not-identity" if diff else "identity", agree
