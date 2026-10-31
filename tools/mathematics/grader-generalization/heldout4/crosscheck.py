#!/usr/bin/env python3
"""Independent SymPy cross-check for HELDOUT4-corpus.json.

Re-derives from the text alone (statement + lines):
  * whether the item is malformed (strict notation check),
  * per-line relation of each line's real solution set to the previous line's
    (line 0 vs the statement), within the task's stated condition; a line's own
    denominators exclude points from its own solution set,
  * firstInvalid (first line that does not follow; an "implies" step counts as
    invalid unless the extraneous candidates it adds are later discarded),
  * finalAnswerCorrect (null when the last line is not in final-answer form),
and reports every disagreement with the stored labels.
Usage: python3 crosscheck.py [corpus.json]
"""
import json, re, sys, os
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "HELDOUT4-corpus.json")
R = sp.S.Reals
LET = {c: sp.Symbol(c) for c in "abcdefghijklmnopqrstuvwxyz"}
LET["Rational"] = sp.Rational
REL_RE = r"(<=|>=|=|<|>)"

# ---------------------------------------------------------------- notation
ALLOWED = set("0123456789abcdefghijklmnopqrstuvwxyz +-*/^()×÷−.=<>≤≥")

def notation_problems(text, need_rel):
    """Return list of problems; [] means readable. need_rel: True (each
    disjunct must be a relation), False (expression, no relation)."""
    p = []
    parts = re.split(r"\s+or\s+", text.strip())
    if len(parts) > 1 and not need_rel:
        p.append("'or' in expression")
    for t in parts:
        if not t:
            p.append("empty"); continue
        bad = set(t) - ALLOWED
        if bad: p.append("chars %r" % "".join(sorted(bad)))
        d = 0
        for ch in t:
            d += ch == "("; d -= ch == ")"
            if d < 0: break
        if d != 0: p.append("unbalanced brackets")
        if "()" in t.replace(" ", ""): p.append("empty brackets")
        if re.search(r"[a-z]\s*[a-z]", t): p.append("letters adjacent / word")
        if re.search(r"[a-z]\d", t): p.append("letter followed by digit")
        if re.search(r"\d\s+\d", t): p.append("numbers without operator")
        if re.search(r"\.(?!\d)|(?<!\d)\.", t): p.append("stray full stop")
        if re.search(r"[+\-*/^×÷−]\s*[+*/^×÷=<>≤≥)]", t): p.append("operator followed by operator")
        if re.search(r"[(=<>≤≥]\s*[+*/^×÷)]", t): p.append("missing operand")
        if re.search(r"[+\-*/^×÷−(]\s*$", t) or re.search(r"^\s*[+*/^×÷)]", t): p.append("dangling operator")
        # ambiguity
        if re.search(r"/\s*\d+(?:\.\d+)?(?:[a-z(]|\s+(?!or\b)[a-z(])", t): p.append("ambiguous a/bc")
        if re.search(r"\^\s*[\w.]+\s*\^", t): p.append("chained ^")
        if re.search(r"\^\s*\d+\s*/\s*\d", t): p.append("ambiguous a^b/c")
        if re.search(r"/\s*[\w.]+\s*/", t): p.append("chained /")
        t2 = t.replace("≤", "<=").replace("≥", ">=")
        rels = re.findall(REL_RE, t2)
        if need_rel:
            if len(rels) != 1: p.append("%d relation symbols" % len(rels))
            else:
                l, _, r = re.split(REL_RE, t2, maxsplit=1)
                if not l.strip() or not r.strip(): p.append("empty side")
        elif rels:
            p.append("relation in expression")
        if re.search(r"[<>=]\s*[<>=]", t2.replace("<=", "≤").replace(">=", "≥")): p.append("garbled relation")
    return p

# ---------------------------------------------------------------- parsing
def prep(s):
    s = s.replace("×", "*").replace("÷", "/").replace("−", "-").replace("^", "**")
    s = re.sub(r"(\d|\))\s*(?=[a-z(])", r"\1*", s)
    s = re.sub(r"([a-z])\s*(?=\()", r"\1*", s)
    s = re.sub(r"\)\s*(?=\d)", ")*", s)
    s = re.sub(r"\d+\.\d+", lambda m: "Rational('%s')" % m.group(0), s)
    return s

def pexpr(s, ev=True):
    return parse_expr(prep(s), local_dict=LET, evaluate=ev)

def excluded(s, v):
    """Real zeros of denominators of the unevaluated expression."""
    e = pexpr(s, ev=False)
    out = set()
    for n in sp.preorder_traversal(e):
        if isinstance(n, sp.Pow) and n.exp.is_number and n.exp < 0 and n.base.has(v):
            out |= set(sp.solveset(sp.simplify(n.base), v, R))
    return sp.FiniteSet(*out)

def rel_set(t, v, cond):
    t = t.replace("≤", "<=").replace("≥", ">=")
    l, op, r = re.split(REL_RE, t, maxsplit=1)
    L, Rr = pexpr(l), pexpr(r)
    ex = excluded(l, v) | excluded(r, v)
    rel = {"=": sp.Eq, "<": sp.Lt, ">": sp.Gt, "<=": sp.Le, ">=": sp.Ge}[op](L, Rr)
    if rel is sp.true: S = R
    elif rel is sp.false: S = sp.S.EmptySet
    else: S = sp.solveset(rel, v, R)
    return sp.Intersection(sp.Complement(S, ex), cond)

def line_set(line, v, cond):
    S = sp.S.EmptySet
    for t in re.split(r"\s+or\s+", line.strip()):
        S = sp.Union(S, rel_set(t, v, cond))
    return S

def is_empty(S):
    S = sp.simplify(S) if not isinstance(S, sp.Set) else S
    e = S.is_empty
    if e is None:
        raise ValueError("undecidable emptiness: %s" % S)
    return e

def subset(A, B):
    return is_empty(sp.Complement(A, B))

def relation(P, C):
    a, b = subset(P, C), subset(C, P)
    if a and b: return "equivalent"
    if a: return "implies"
    if b: return "implied-by"
    return "neither"

def parse_statement(st):
    m = re.match(r"^(Solve|Simplify|Expand|Factorise)(?:\s+for\s+([a-z])\s*:)?\s+(.*?)"
                 r"(?:\s+for\s+([a-z])\s*(≠|>|<|≥|≤)\s*(-?\d+(?:/\d+)?))?$", st.strip())
    if not m: return None
    kind, var, body, cv, cop, cval = m.groups()
    return kind, var, body, (cv, cop, cval) if cv else None

# ---------------------------------------------------------------- final forms
def final_form_eq(line, v):
    for t in re.split(r"\s+or\s+", line.strip()):
        t = t.replace("≤", "<=").replace("≥", ">=")
        l, op, r = re.split(REL_RE, t, maxsplit=1)
        if pexpr(l) != v or pexpr(r).has(v): return False
    return True

def n_terms_unevaluated(s):
    e = pexpr(s, ev=False)
    return len(sp.Add.make_args(e)), e

def final_form_expr(kind, line, v):
    if kind == "Factorise":
        e = pexpr(line, ev=False)
        if not isinstance(e, (sp.Mul, sp.Pow)): return False
        facs = []
        for f in sp.Mul.make_args(e):
            if isinstance(f, sp.Pow) and f.exp.is_Integer and f.exp > 0: f = f.base
            if f.has(v): facs.append(sp.expand(f))
        return all(sp.Poly(f, v).is_irreducible for f in facs)
    ev = pexpr(line)
    n, d = sp.fraction(sp.together(ev))
    if d.has(v):
        return sp.degree(sp.gcd(n, d), v) == 0
    if "(" in line: return False
    k, _ = n_terms_unevaluated(line)
    return k == len(sp.Add.make_args(sp.expand(ev)))

# ---------------------------------------------------------------- per item
def analyse(it):
    st = parse_statement(it["statement"])
    expr_task = st is not None and st[0] != "Solve"
    probs = []
    if st is None:
        probs.append("statement: unreadable task")
    else:
        sp_ = notation_problems(st[2], need_rel=not expr_task)
        probs += ["statement: " + x for x in sp_]
    for i, ln in enumerate(it["lines"]):
        probs += ["line %d: %s" % (i, x) for x in notation_problems(ln, need_rel=not expr_task)]
    if probs:
        return {"malformed": True, "why": probs}
    kind, var, body, cond = st
    syms = set()
    for s in [body] + it["lines"]:
        for t in re.split(r"\s+or\s+|<=|>=|≤|≥|=|<|>", s):
            if t.strip(): syms |= pexpr(t).free_symbols
    v = sp.Symbol(var) if var else (list(syms)[0] if len(syms) == 1 else None)
    if v is None or len(syms) > 1:
        return {"malformed": True, "why": ["not single-variable: %s" % syms]}
    C = R
    if cond:
        cval = sp.Rational(cond[2])
        C = {"≠": sp.Complement(R, sp.FiniteSet(cval)), ">": sp.Interval.open(cval, sp.oo),
             "<": sp.Interval.open(-sp.oo, cval), "≥": sp.Interval(cval, sp.oo),
             "≤": sp.Interval(-sp.oo, cval)}[cond[1]]
    lines = it["lines"]
    if expr_task:
        prev = pexpr(body); base = prev
        rels = []
        for ln in lines:
            cur = pexpr(ln)
            rels.append("equivalent" if sp.cancel(sp.together(cur - prev)) == 0 else "neither")
            prev = cur
        fi = next((i for i, r in enumerate(rels) if r == "neither"), None)
        if not final_form_expr(kind, lines[-1], v): fac = None
        else: fac = sp.cancel(sp.together(pexpr(lines[-1]) - base)) == 0
        return {"malformed": False, "relation": rels, "firstInvalid": fi, "finalAnswerCorrect": fac}
    S0 = line_set(body, v, C)
    sets = [S0] + [line_set(ln, v, C) for ln in lines]
    rels = [relation(sets[i], sets[i + 1]) for i in range(len(lines))]
    # first invalid
    hard = None
    for i, r in enumerate(rels):
        if r == "neither" or (r == "implied-by" and not subset(S0, sets[i + 1])):
            hard = i; break
    end = hard if hard is not None else len(lines)
    soft = None
    for i in range(end):
        if rels[i] == "implies":
            extra = sp.Complement(sp.Complement(sets[i + 1], sets[i]), S0)
            if is_empty(extra): continue
            discarded = any(is_empty(sp.Intersection(extra, sets[j + 1])) for j in range(i + 1, end))
            if not discarded:
                soft = i; break
    cands = [x for x in (hard, soft) if x is not None]
    fi = min(cands) if cands else None
    if not final_form_eq(lines[-1], v): fac = None
    else: fac = subset(sets[-1], S0) and subset(S0, sets[-1])
    return {"malformed": False, "relation": rels, "firstInvalid": fi, "finalAnswerCorrect": fac,
            "S0": S0, "final": sets[-1]}

def main():
    items = json.load(open(PATH, encoding="utf-8"))
    dis, undecided = [], []
    for it in items:
        try:
            a = analyse(it)
        except Exception as e:  # SymPy could not decide
            undecided.append((it["id"], repr(e)))
            continue
        lab_mal = it["expect"] == "malformed"
        if a["malformed"] != lab_mal:
            dis.append((it["id"], "malformed? script=%s label=%s %s" % (a["malformed"], lab_mal, a.get("why", ""))))
            continue
        if lab_mal:
            if it["firstInvalid"] is not None or it["finalAnswerCorrect"] is not None or any(r != "n/a" for r in it["relation"]):
                dis.append((it["id"], "malformed item must have null labels and n/a relations"))
            continue
        if a["relation"] != it["relation"]:
            dis.append((it["id"], "relation script=%s label=%s" % (a["relation"], it["relation"])))
        if a["firstInvalid"] != it["firstInvalid"]:
            dis.append((it["id"], "firstInvalid script=%s label=%s" % (a["firstInvalid"], it["firstInvalid"])))
        if a["finalAnswerCorrect"] != it["finalAnswerCorrect"]:
            dis.append((it["id"], "finalAnswerCorrect script=%s label=%s" % (a["finalAnswerCorrect"], it["finalAnswerCorrect"])))
        exp = it["expect"]
        want_fi_null = exp in ("valid", "valid-jump", "incomplete")
        if want_fi_null != (a["firstInvalid"] is None):
            dis.append((it["id"], "expect=%s but script firstInvalid=%s" % (exp, a["firstInvalid"])))
        if exp in ("valid", "valid-jump") and a["finalAnswerCorrect"] is not True:
            dis.append((it["id"], "expect=%s but script finalAnswerCorrect=%s" % (exp, a["finalAnswerCorrect"])))
        if exp == "incomplete" and a["finalAnswerCorrect"] is not None:
            dis.append((it["id"], "expect=incomplete but last line is in final-answer form"))
    print("items checked: %d" % len(items))
    print("disagreements: %d" % len(dis))
    for d in dis: print("  DISAGREE %s: %s" % d)
    print("undecided by SymPy: %d" % len(undecided))
    for u in undecided: print("  UNDECIDED %s: %s" % u)
    print("note: 'valid' vs 'valid-jump' (number of operations per line) is not checked by this script.")
    return 1 if dis or undecided else 0

if __name__ == "__main__":
    sys.exit(main())
