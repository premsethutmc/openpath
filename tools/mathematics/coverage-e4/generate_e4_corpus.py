#!/usr/bin/env python3
"""E4 fresh evaluation corpus: 200 student-working cases (100 development / 100 sealed), seed 20261101.
Problems are authored by construction (chosen roots / solutions); every reference label is DERIVED by the independent exact
oracle in e4_oracle.py (parses each student line itself) and asserted against the intended design. Never imports OpenPath.
Categories: radical 45, multivariable 45, rational 35, polynomial 30, alternative-method 25, invalid-intermediate 20."""
import json, random, hashlib, sys, re, itertools
from fractions import Fraction as F
from decimal import Decimal, getcontext
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from e4_oracle import *

R = random.Random(20261101)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
getcontext().prec = 80

# ----------------------------------------------------------------------------- formatting helpers
def sgn_join(terms):
    """terms: list of (coef:int, body:str) with body '' for constant; returns 'x^2 - 5x + 6'."""
    out = ""
    for c, b in terms:
        if c == 0: continue
        a = abs(c); mag = ("" if a == 1 and b else str(a)) + b
        out += (("-" if c < 0 else "") + mag) if not out else (" - " if c < 0 else " + ") + mag
    return out or "0"
def P(coefs, v="x"):
    """coefs highest degree first"""
    n = len(coefs) - 1
    return sgn_join([(c, "" if n - i == 0 else v if n - i == 1 else f"{v}^{n - i}") for i, c in enumerate(coefs)])
def lf(c, v, k):  # (v - r) factor for root r: '(x - 2)' / '(x + 3)' / 'x'
    return f"({v} - {c})" if c > 0 else f"({v} + {-c})" if c < 0 else v
def fr(f):  # fraction -> string without implicit-multiplication ambiguity
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"

# ----------------------------------------------------------------------------- single-variable classifier (oracle semantics)
SOLVED = re.compile(r"^[A-Za-z]\s*(=|!=|<=|>=|<|>)\s*[-+]?\(?[\d./ +\-*()sqrt]*\)?(\s+or\s+[A-Za-z]\s*=\s*.+)*$")
def classify_single(stmt, lines, var="x", extras=()):
    s_rel = split_rel(stmt)
    ex2 = list(extras)
    for ln in [stmt] + [l for l in lines if "=" in l and " or " not in l and "±" not in l] + [l for l in lines if "=" in l and (" or " in l or "±" in l)]:
        try: ex2 += find_roots(ln, var)
        except Exception: pass
        ex2 += branch_values(ln, var)
    U = make_universe(ex2)
    S0 = line_truth(stmt, var, U)
    defined = []
    for u in U:
        try:
            for part in (s_rel[0], s_rel[2]): ev(parse(part), {var: u})
            defined.append(True)
        except Undef: defined.append(False)
    prev = S0; first_invalid = None; lost = None; rels = []; final = None; final_solved = False
    for i, ln in enumerate(lines):
        low = ln.strip().lower()
        if low in ("no solution", "there is no solution"):
            cur = tuple(False for _ in U); claim = "none"
        elif low in ("this holds for all x", "true for all x", "this holds for every x"):
            cur = tuple(True for _ in U); claim = "all"
        else:
            cur = line_truth(ln, var, U); claim = None
        r = relation(prev, cur)
        if claim == "all":
            same_on_defined = all(((c == s) or not d) for c, s, d in zip(cur, S0, defined))
            if cur != S0:
                rels.append("universal-claim");
                if first_invalid is None and not same_on_defined: first_invalid = i
                lost = lost if same_on_defined else lost
                final = ("missing-assumption" if same_on_defined else "invalid-claim")
                prev = cur; final_set = cur; continue
        if r == "incomparable":
            if first_invalid is None: first_invalid = i
            rels.append("invalid")
        elif r == "narrowing":
            if any(s and not c for c, s in zip(cur, S0)):
                if any(s for s in S0) and not any(c and s for c, s in zip(cur, S0)):
                    if first_invalid is None: first_invalid = i      # false at every solution: not a branch choice
                    rels.append("invalid")
                else:
                    if lost is None: lost = i
                    rels.append("narrowing-lost")
            else:
                dropped = [j for j, (p_, c_) in enumerate(zip(prev, cur)) if p_ and not c_]
                if all(not defined[j] for j in dropped) or sum(1 for p_ in prev if p_) <= 8: rels.append("narrowing-extraneous")
                else:
                    if lost is None: lost = i      # an unjustified jump from an infinite set to the answer
                    rels.append("narrowing-unjustified")
        else: rels.append(r)
        prev = cur
        final_set = cur
        final_solved = claim == "none" or bool(SOLVED.match(ln.split(",")[0].strip().replace("±", "+-")))
    final_set = prev
    if final == "missing-assumption" and first_invalid is None: return "missing-assumption", [], rels
    if final == "invalid-claim": return "invalid", [first_invalid], rels
    if first_invalid is not None: return "invalid", [first_invalid], rels
    if lost is not None: return "incomplete", [], rels
    if not final_solved: return "incomplete", [], rels
    if final_set == S0: return "verified", [], rels
    if all(c for c, s in zip(final_set, S0) if s) and any(c and not s for c, s in zip(final_set, S0)): return "invalid", [len(lines) - 1], rels
    if all(not c for c, s in zip(final_set, S0) if s) is False and any(s and not c for c, s in zip(final_set, S0)): return "incomplete", [], rels
    return "invalid", [len(lines) - 1], rels

# ----------------------------------------------------------------------------- case plumbing
CASES = []
ATTEMPT = {}; HAVE = {}; ROUND = [0]; PLAN = {}
def accepting(family):
    ATTEMPT[family] = ATTEMPT.get(family, 0) + (1 if ROUND[0] == 0 else 0)
    return ROUND[0] == 0 or HAVE.get(family, 0) < QUOTA.get(family, 0)
QUOTA = {}
def add(cat, family, stmt, lines, intended, var="x", extras=(), tags=(), problem_extra=None):
    if not accepting(family): return False
    cls, fi, rels = classify_single(stmt, lines, var, extras)
    if cls != intended:
        SEEN.discard(stmt)
        if DEBUG: print("MISMATCH", family, "got", cls, "want", intended, stmt, lines, rels)
        return False
    HAVE[family] = HAVE.get(family, 0) + 1
    CASES.append(dict(category=cat, family=family, area="algebra", problem={"domain": "algebra", "statement": stmt},
                      studentWorking={"format": "natural", "text": "\n".join(lines)},
                      reference=dict(classification=cls, firstInvalidAcceptable=fi, firstInvalidStep=fi[0] if fi else None, lineRelations=rels,
                                     mustNotVerify=cls != "verified", complete=cls == "verified", alternativeMethodValid=cat == "alternative-method" and cls == "verified",
                                     coverage="in-scope", tags=list(tags), derivation="oracle-derived: Decimal(80) truth sets over rational universe k/24 plus designed candidates and every real root found by sign-change scan")))
    return True

def pick_unique(seen, key):
    if key in seen: return False
    seen.add(key); return True

import os
DEBUG = bool(os.environ.get("E4DEBUG"))
SEEN = set()
def _load_old():
    base = __file__.rsplit("/", 2)[0]
    for p in ("end-to-end-e1/frozen-corpus.v1.json", "proof-integrity-e2/dev-cases.v1.json", "proof-integrity-e2/sealed-cases.v1.json", "verification-closure-e3/dev-cases.v1.json", "verification-closure-e3/sealed-cases.v1.json"):
        d = json.load(open(f"{base}/{p}")); d = d["cases"] if isinstance(d, dict) else d
        for c in d:
            if isinstance(c["problem"], dict) and isinstance(c["problem"].get("statement"), str): SEEN.add(c["problem"]["statement"])
_load_old()
# ----------------------------------------------------------------------------- RADICAL
def radical_single(variant):
    for _ in range(5000):
        c = R.choice([1, 1, 2, 3]); d = R.randint(-5, 5); r = R.randint(-3, 9); e = R.randint(-6, 9)
        if r == e: continue
        a = 2 * c * d + c * c * (r + e); b = d * d - c * c * r * e
        if a == 0 or abs(a) > 30 or abs(b) > 60: continue
        vr, ve = c * r + d, c * e + d
        kind = "ext" if vr >= 0 > ve else "both" if vr >= 0 and ve >= 0 else "none" if vr < 0 and ve < 0 else None
        if kind is None: continue
        if kind == "ext" and vr == 0: continue
        want = {"ok_full": "ext", "ok_short": "ext", "keep_ext": "ext", "wrong_sq": "ext", "stop": "ext", "lost": "both", "both_ok": "both", "none_ok": "none", "none_keep": "none"}[variant]
        if kind != want: continue
        stmt = f"sqrt({P([a, b])}) = {P([c, d])}"
        if not pick_unique(SEEN, stmt): continue
        sq = f"{P([a, b])} = ({P([c, d])})^2"
        quad = f"{P([c * c, 2 * c * d - a, d * d - b])} = 0"
        fac = (f"{c * c}" if c > 1 else "") + f"{lf(r, 'x', 0)}{lf(e, 'x', 0)} = 0"
        cand = f"x = {r} or x = {e}"
        cand_ord = f"x = {e} or x = {r}"
        if variant == "ok_full": return stmt, [stmt, sq, quad, fac, cand, f"x = {r}"], "verified", [r, e]
        if variant == "ok_short": return stmt, [stmt, sq, quad, f"x = {r}"], "verified", [r, e]
        if variant == "keep_ext": return stmt, [stmt, sq, quad, fac, cand], "invalid", [r, e]
        if variant == "wrong_sq": return stmt, [stmt, f"{P([a, b])} = {P([c * c, 0, d * d])}", quad, fac, cand, f"x = {r}"], "invalid", [r, e]
        if variant == "stop": return stmt, [stmt, sq, quad], "incomplete", [r, e]
        if variant == "lost": return stmt, [stmt, sq, quad, fac, f"x = {r}"], "incomplete", [r, e]
        if variant == "both_ok": return stmt, [stmt, sq, quad, fac, cand_ord], "verified", [r, e]
        if variant == "none_ok": return stmt, [stmt, sq, quad, fac, cand, "there is no solution"], "verified", [r, e]
        if variant == "none_keep": return stmt, [stmt, sq, quad, fac, cand], "invalid", [r, e]
    raise RuntimeError(variant)

def radical_two():
    for _ in range(5000):
        u = R.randint(2, 7); v = R.randint(0, u - 1); r = R.randint(-3, 12)
        p, q = u * u - r, v * v - r; S = u + v
        if p == q or abs(p) > 25 or abs(q) > 25: continue
        stmt = f"sqrt(x + {p}) + sqrt(x + {q}) = {S}".replace("+ -", "- ")
        if not pick_unique(SEEN, stmt): continue
        xp, xq = f"x + {p}".replace("+ -", "- "), f"x + {q}".replace("+ -", "- ")
        iso = f"sqrt({xp}) = {S} - sqrt({xq})"
        sq1 = f"{xp} = {S * S} - {2 * S}*sqrt({xq}) + {xq}"
        iso2 = f"{2 * S}*sqrt({xq}) = {S * S + q - p}"
        half = f"sqrt({xq}) = {v}"
        sq2 = f"{xq} = {v * v}"
        return stmt, iso, sq1, iso2, half, sq2, r, (p, q, S, u, v, xp, xq)
    raise RuntimeError("two")

def radical_equal():
    for _ in range(5000):
        a, c = R.randint(1, 6), R.randint(1, 6)
        if a == c: continue
        r = R.randint(-6, 8); A = R.randint(-6, 12)
        b, d = A - a * r, A - c * r
        if abs(b) > 40 or abs(d) > 40: continue
        stmt = f"sqrt({P([a, b])}) = sqrt({P([c, d])})"
        if not pick_unique(SEEN, stmt): continue
        return stmt, a, b, c, d, r, A
    raise RuntimeError("eq")

def radical_quadrad():
    for _ in range(5000):
        d = R.randint(-5, 5); p = R.randint(-6, 6); q = R.randint(-6, 6)
        if p == 2 * d: continue
        num = d * d - q; den = p - 2 * d
        if num % den: continue
        r = num // den
        stmt = f"sqrt({P([1, p, q])}) = {P([1, d])}"
        if not pick_unique(SEEN, stmt): continue
        return stmt, d, p, q, r
    raise RuntimeError("quadrad")

def radical_surd():
    for _ in range(5000):
        k = R.randint(1, 6); m = R.randint(1, 4)
        Dd = 4 * m + 1 + 4 * k
        if int(Dd ** 0.5) ** 2 == Dd: continue
        stmt = f"sqrt({P([1, k])}) = {P([1, -m])}"
        if not pick_unique(SEEN, stmt): continue
        return stmt, k, m, Dd
    raise RuntimeError("surd")

def sqrtdec(n): return Decimal(n).sqrt()

def build_radical():
    plan = (["ok_full"] * 3 + ["ok_short"] * 3 + ["keep_ext"] * 3 + ["wrong_sq"] * 2 + ["stop"] * 1 + ["lost"] * 2 + ["both_ok"] * 2 + ["none_ok"] * 1 + ["none_keep"] * 1)  # 18
    for v in plan:
        stmt, lines, cls, roots = radical_single(v)
        add("radical-extraneous-roots", f"radical-linear/{v}", stmt, lines, cls, extras=[F(x) for x in roots], tags=[v])
    # two radicals (10)
    for v in ["ok", "ok", "ok", "ok_short", "wrong_sq1", "wrong_sq1", "stop", "wrong_final", "wrong_final", "skip_half"]:
        stmt, iso, sq1, iso2, half, sq2, r, (p, q, S, u, vv, xp, xq) = radical_two()
        fin = f"x = {r}"
        if v == "ok": lines, cls = [stmt, iso, sq1, iso2, half, sq2, fin], "verified"
        elif v == "ok_short": lines, cls = [stmt, iso, half, sq2, fin], "verified" if False else None
        elif v == "wrong_sq1": lines, cls = [stmt, iso, f"{xp} = {S * S} + {xq}", iso2, half, sq2, fin], "invalid"
        elif v == "stop": lines, cls = [stmt, iso, sq1, iso2], "incomplete"
        elif v == "wrong_final": lines, cls = [stmt, iso, sq1, iso2, half, sq2, f"x = {r + 1}"], "invalid"
        elif v == "skip_half": lines, cls = [stmt, iso, sq1, half, sq2, fin], "verified"
        if v == "ok_short": lines, cls = [stmt, iso, sq1, iso2, sq2.replace(xq, xq) and f"{xq} = {vv * vv}", fin], "verified"
        add("radical-extraneous-roots", f"radical-two/{v}", stmt, lines, cls, extras=[F(r), F(r + 1)], tags=[v])
    # sqrt = sqrt (7)
    for v in ["ok", "ok", "ok", "nosol_ok", "nosol_keep", "wrong_lin", "keep_neg"]:
        for _ in range(200):
            stmt, a, b, c, d, r, A = radical_equal()
            if (v in ("nosol_ok", "nosol_keep", "keep_neg")) != (A < 0): continue
            break
        sq = f"{P([a, b])} = {P([c, d])}"; lin = f"{P([a - c, 0])} = {d - b}"; fin = f"x = {r}"
        if v == "ok": lines, cls = [stmt, sq, lin, fin], "verified"
        elif v == "nosol_ok": lines, cls = [stmt, sq, lin, fin, "no solution"], "verified"
        elif v == "nosol_keep": lines, cls = [stmt, sq, lin, fin], "invalid"
        elif v == "keep_neg": lines, cls = [stmt, sq, fin], "invalid"
        else: lines, cls = [stmt, sq, f"{P([a - c, 0])} = {b - d}", fin], "invalid"
        if v == "wrong_lin" and (b - d) == (d - b): v = "ok"; cls = "verified"; lines = [stmt, sq, lin, fin]
        add("radical-extraneous-roots", f"radical-equal/{v}", stmt, lines, cls, extras=[F(r)], tags=[v])
    # quadratic radicand (7)
    for v in ["ok", "ok", "ok", "ext_nosol", "ext_nosol_keep", "wrong_sq", "stop"]:
        for _ in range(400):
            stmt, d, p, q, r = radical_quadrad()
            valid = r + d >= 0
            if (v in ("ext_nosol", "ext_nosol_keep")) == valid: continue
            break
        sq = f"{P([1, p, q])} = ({P([1, d])})^2"; lin = f"{P([p - 2 * d, 0])} = {d * d - q}" if True else ""; fin = f"x = {r}"
        if v == "ok": lines, cls = [stmt, sq, lin, fin], "verified"
        elif v == "ext_nosol": lines, cls = [stmt, sq, lin, fin, "no solution"], "verified"
        elif v == "ext_nosol_keep": lines, cls = [stmt, sq, lin, fin], "invalid"
        elif v == "wrong_sq": lines, cls = [stmt, f"{P([1, p, q])} = {P([1, 0, d * d])}", lin, fin], "invalid"
        else: lines, cls = [stmt, sq, lin], "incomplete"
        add("radical-extraneous-roots", f"radical-quadratic-radicand/{v}", stmt, lines, cls, extras=[F(r)], tags=[v])
    # irrational (surd) roots (3)
    for v in ["ok", "keep_both", "stop"]:
        stmt, k, m, Dd = radical_surd()
        S1 = 2 * m + 1
        rp, rm = (Decimal(S1) + sqrtdec(Dd)) / 2, (Decimal(S1) - sqrtdec(Dd)) / 2
        sq = f"{P([1, k])} = ({P([1, -m])})^2"; quad = f"{P([1, -S1, m * m - k])} = 0"
        both = f"x = ({S1} + sqrt({Dd}))/2 or x = ({S1} - sqrt({Dd}))/2"; one = f"x = ({S1} + sqrt({Dd}))/2"
        if v == "ok": lines, cls = [stmt, sq, quad, both, one], "verified"
        elif v == "keep_both": lines, cls = [stmt, sq, quad, both], "invalid"
        else: lines, cls = [stmt, sq, quad], "incomplete"
        add("radical-extraneous-roots", f"radical-surd/{v}", stmt, lines, cls, extras=[rp, rm], tags=[v, "irrational"])

# ----------------------------------------------------------------------------- RATIONAL
def build_rational():
    # Q1 cancellation with a hole (6)
    for v in ["ok", "ok", "missing", "missing", "stop", "wrong_cancel"]:
        for _ in range(100):
            p = R.choice([x for x in range(-6, 8) if x != 0])
            stmt = f"(x^2 - {p * p})/(x - {p})" .replace("x - -", "x + ") + f" = x + {p}".replace("+ -", "- ")
            stmt = f"({P([1, 0, -p * p])})/({P([1, -p])}) = {P([1, p])}"
            if pick_unique(SEEN, stmt): break
        else: continue
        same = f"{P([1, p])} = {P([1, p])}"; hole = f"x != {p}"
        if v == "ok": lines, cls = [stmt, same, hole], "verified"
        elif v == "missing": lines, cls = [stmt, same, "this holds for all x"], "missing-assumption"
        elif v == "stop": lines, cls = [stmt, same], "incomplete"
        else: lines, cls = [stmt, f"{P([1, 0])} = {P([1, p])}", hole], "invalid"
        add("rational-domain-restrictions", f"rational-hole/{v}", stmt, lines, cls, extras=[F(p)], tags=[v])
    # Q2 shared denominator, one candidate is the excluded value (8)
    for v in ["ok", "ok", "ok_restr", "keep", "keep", "restr_lost", "stop", "wrong_clear"]:
        for _ in range(1000):
            p = R.randint(-5, 6); r2 = R.randint(-6, 8)
            if r2 == p: continue
            m = p + r2; k = R.randint(1, 9); t = -(p * r2) - k
            stmt = f"({P([1, 0, -k])})/({P([1, -p])}) = ({P([m, t])})/({P([1, -p])})"
            if pick_unique(SEEN, stmt): break
        else: continue
        clr = f"{P([1, 0, -k])} = {P([m, t])}"; quad = f"{P([1, -m, -(k + t)])} = 0"; fac = f"{lf(p, 'x', 0)}{lf(r2, 'x', 0)} = 0"
        cand = f"x = {p} or x = {r2}"
        if v == "ok": lines, cls = [stmt, clr, quad, fac, cand, f"x = {r2}"], "verified"
        elif v == "ok_restr": lines, cls = [stmt, f"{clr}, x != {p}", f"{quad}, x != {p}", f"x = {r2}"], "verified"
        elif v == "keep": lines, cls = [stmt, clr, quad, fac, cand], "invalid"
        elif v == "restr_lost": lines, cls = [stmt, clr, quad, f"x = {p}"], "invalid"
        elif v == "stop": lines, cls = [stmt, clr, quad], "incomplete"
        else: lines, cls = [stmt, f"{P([1, 0, -k])} = {P([m, -t])}", quad, fac, cand, f"x = {r2}"], "invalid"
        add("rational-domain-restrictions", f"rational-shared-denominator/{v}", stmt, lines, cls, extras=[F(p), F(r2)], tags=[v])
    # Q3 cross multiplication (10)
    for v in ["ok", "ok", "ok", "ok", "excluded", "excluded", "wrong_expand", "wrong_expand", "stop", "wrong_final"]:
        for _ in range(5000):
            a, b, c, d = (R.randint(-5, 6) for _ in range(4))
            if a + d == b + c: continue
            num, den = c * b - a * d, a + d - b - c
            if num % den: continue
            r = num // den
            if b == d or a == c or (r + b == 0 or r + d == 0) != (v == "excluded"): continue
            stmt = f"({P([1, a])})/({P([1, b])}) = ({P([1, c])})/({P([1, d])})"
            if pick_unique(SEEN, stmt): break
        else: continue
        cross = f"({P([1, a])})({P([1, d])}) = ({P([1, c])})({P([1, b])})"
        exp = f"{P([1, a + d, a * d])} = {P([1, b + c, b * c])}"
        lin = f"{P([a + d - b - c, 0])} = {b * c - a * d}"
        if v == "ok": lines, cls = [stmt, cross, exp, lin, f"x = {r}"], "verified"
        elif v == "excluded": lines, cls = [stmt, cross, exp, lin, f"x = {r}"], "invalid"
        elif v == "wrong_expand": lines, cls = [stmt, cross, f"{P([1, a + d, a + d])} = {P([1, b + c, b * c])}", lin, f"x = {r}"], "invalid"
        elif v == "stop": lines, cls = [stmt, cross, exp, lin], "incomplete"
        else: lines, cls = [stmt, cross, exp, lin, f"x = {r + 1}"], "invalid"
        if v == "wrong_expand" and (a + d) == a * d: lines[2] = lines[2].replace(P([1, a + d, a + d]), P([1, a + d, a * d + 1]))
        add("rational-domain-restrictions", f"rational-cross-multiply/{v}", stmt, lines, cls, extras=[F(r), F(r + 1), F(-b), F(-d)], tags=[v])
    # Q4 sum of fractions over common denominator (9)
    for v in ["ok", "ok", "ok", "ok_restr", "nosol_ok", "nosol_keep", "stop", "wrong_clear", "wrong_final"]:
        for _ in range(5000):
            p, q = R.randint(-5, 5), R.randint(-5, 5)
            if p == q: continue
            sv = R.randint(-8, 8); r2 = F(sv + p + q, 2)
            if (r2 in (F(p), F(q))) != (v in ("nosol_ok", "nosol_keep")): continue
            if r2.denominator != 1 and v not in ("ok_restr",): continue
            if r2.denominator != 1: continue
            stmt = f"1/({P([1, -p])}) + 1/({P([1, -q])}) = {sv}/(({P([1, -p])})({P([1, -q])}))"
            if pick_unique(SEEN, stmt): break
        else: continue
        clear = f"({P([1, -q])}) + ({P([1, -p])}) = {sv}"; lin = f"{P([2, -(p + q)])} = {sv}"; fin = f"x = {fr(r2)}"
        if v in ("ok", "ok_restr"): lines, cls = [stmt, clear + (f", x != {p}" if v == "ok_restr" else ""), lin, fin], "verified"
        elif v == "nosol_ok": lines, cls = [stmt, clear, lin, fin, "no solution"], "verified"
        elif v == "nosol_keep": lines, cls = [stmt, clear, lin, fin], "invalid"
        elif v == "stop": lines, cls = [stmt, clear], "incomplete"
        elif v == "wrong_clear": lines, cls = [stmt, f"({P([1, -q])}) + ({P([1, -p])}) = {sv + 1}", lin, fin], "invalid"
        else: lines, cls = [stmt, clear, lin, f"x = {fr(r2 + 1)}"], "invalid"
        add("rational-domain-restrictions", f"rational-common-denominator/{v}", stmt, lines, cls, extras=[F(p), F(q), r2, r2 + 1], tags=[v])
    # Q5 simple: a/(x - p) = b (2 cases) and x/(x-p) = p/(x-p) (2 cases) -> filler to 35
    for v in ["ok", "hole_nosol"]:
        for _ in range(500):
            p = R.randint(-5, 6)
            if v.startswith("hole"):
                stmt = f"x/({P([1, -p])}) = {p}/({P([1, -p])})"
            else:
                bb = R.randint(2, 6); aa = bb * R.randint(1, 5) ; stmt = f"{aa}/({P([1, -p])}) = {bb}"
            if pick_unique(SEEN, stmt): break
        else: continue
        if v == "ok":
            rr = F(p) + F(aa, bb);
            if rr.denominator != 1: lines = None
            else:
                lines, cls = [stmt, f"{aa} = {bb}({P([1, -p])})", f"{P([bb, -bb * p])} = {aa}", f"x = {rr.numerator}"], "verified"
        elif v == "hole_keep": lines, cls = [stmt, f"x = {p}", "x = " + str(p)], "invalid"
        else: lines, cls = [stmt, f"x = {p}", "no solution"], "verified"
        if lines is None: continue
        add("rational-domain-restrictions", f"rational-simple/{v}", stmt, lines, cls, extras=[F(p)] + ([F(p) + F(aa, bb)] if v == "ok" else []), tags=[v])

# ----------------------------------------------------------------------------- POLYNOMIAL
def build_polynomial():
    # quadratics with integer roots (10)
    for v in ["fac_ok", "fac_ok", "fac_ok", "fac_ok", "fac_ok", "fac_ok", "missing", "missing", "missing", "wrong_fac", "wrong_fac", "lead_ok", "pm_ok"]:
        for _ in range(500):
            r1, r2 = R.randint(-7, 7), R.randint(-7, 7)
            if r1 == r2: continue
            lead = 2 if v == "lead_ok" else 1
            stmt = f"{P([lead, -lead * (r1 + r2), lead * r1 * r2])} = 0"
            if v == "pm_ok":
                k = R.randint(11, 29); stmt = f"x^2 = {k * k}"
            if pick_unique(SEEN, stmt): break
        else: continue
        if v == "pm_ok": lines, cls, ex = [stmt, f"x = ±{k}"], "verified", [F(k), F(-k)]
        else:
            fac = (f"{lead}" if lead > 1 else "") + f"{lf(r1, 'x', 0)}{lf(r2, 'x', 0)} = 0"; both = f"x = {r1} or x = {r2}"; ex = [F(r1), F(r2)]
            if v in ("fac_ok", "lead_ok"): lines, cls = [stmt, fac, both], "verified"
            elif v == "missing": lines, cls = [stmt, fac, f"x = {r1}"], "incomplete"
            else: lines, cls = [stmt, (f"{lead}" if lead > 1 else "") + f"{lf(-r1, 'x', 0)}{lf(r2, 'x', 0)} = 0", both], "invalid"
        add("polynomial-solution-sets", f"polynomial-quadratic/{v}", stmt, lines, cls, extras=ex, tags=[v])
    # missing branch for x^2 = a
    for v in ["sqrt_one_branch", "sqrt_one_branch", "pm_one_branch"]:
        for _ in range(100):
            k = R.randint(12, 31)
            stmt = f"x^2 = {k * k}"
            if pick_unique(SEEN, stmt): break
        else: continue
        lines = [stmt, f"x = {k}"] if v == "sqrt_one_branch" else [stmt, f"x = ±{k}", f"x = {k}"]
        add("polynomial-solution-sets", f"polynomial-sqrt-branch/{v}", stmt, lines, "incomplete", extras=[F(k), F(-k)], tags=[v])
    # surd quadratics via quadratic formula (6)
    for v in ["ok", "ok", "ok", "missing", "wrong_sign", "pm_ok"]:
        for _ in range(500):
            S = R.randint(-9, 9); Pp = R.randint(-9, 9); Dd = S * S - 4 * Pp
            if Dd <= 0 or int(Dd ** 0.5) ** 2 == Dd: continue
            stmt = f"{P([1, -S, Pp])} = 0"
            if pick_unique(SEEN, stmt): break
        else: continue
        rp, rm = (Decimal(S) + sqrtdec(Dd)) / 2, (Decimal(S) - sqrtdec(Dd)) / 2
        disc = f"{S * S} - {4 * Pp}".replace("- -", "+ ") if False else None
        formula = f"x = ({S} + sqrt({Dd}))/2 or x = ({S} - sqrt({Dd}))/2"
        if v == "ok": lines, cls = [stmt, formula], "verified"
        elif v == "pm_ok": lines, cls = [stmt, f"x = ({S} ± sqrt({Dd}))/2"], "verified"
        elif v == "missing": lines, cls = [stmt, f"x = ({S} + sqrt({Dd}))/2"], "incomplete"
        else: lines, cls = [stmt, f"x = ({S} + sqrt({Dd}))/2 or x = (-{S} - sqrt({Dd}))/2".replace("(--", "(") if S != 0 else formula], "invalid" if S != 0 else "verified"
        add("polynomial-solution-sets", f"polynomial-quadratic-formula/{v}", stmt, lines, cls, extras=[rp, rm], tags=[v, "irrational"])
    # cubic / quartic factorable, multiplicity (8)
    for v in ["cubic_ok", "cubic_ok", "cubic_missing", "cubic_wrong", "double_ok", "double_missing", "quartic_ok", "quartic_missing"]:
        for _ in range(500):
            rs = [R.randint(-4, 5) for _ in range(3)]
            if v.startswith("double"): rs = [rs[0], rs[0], rs[1]]
            if v.startswith("quartic"): rs = [R.choice([1, 2, 3]), R.choice([4, 5])]
            if len(set(rs)) < (2 if v.startswith("double") else len(rs)) and not v.startswith("double"): continue
            if v.startswith("quartic"):
                a, b = rs
                stmt = f"{P([1, 0, -(a * a + b * b), a * a * b * b])}".replace("x^3", "x^4") if False else f"x^4 - {a * a + b * b}x^2 + {a * a * b * b} = 0"
            else:
                co = [1]
                for r in rs: co = [x - r * y for x, y in zip(co + [0], [0] + co)]
                stmt = f"{P(co)} = 0"
            if pick_unique(SEEN, stmt): break
        else: continue
        if v.startswith("quartic"):
            a, b = rs
            fac = f"(x^2 - {a * a})(x^2 - {b * b}) = 0"; fac2 = f"{lf(a, 'x', 0)}{lf(-a, 'x', 0)}{lf(b, 'x', 0)}{lf(-b, 'x', 0)} = 0"
            allr = f"x = {a} or x = {-a} or x = {b} or x = {-b}"
            lines, cls = ([stmt, fac, fac2, allr], "verified") if v == "quartic_ok" else ([stmt, fac, fac2, f"x = {a} or x = {b}"], "incomplete")
            ex = [F(a), F(-a), F(b), F(-b)]
        else:
            fac = "".join(lf(r, "x", 0) for r in rs) + " = 0"; uniq = sorted(set(rs)); ex = [F(r) for r in uniq]
            allr = " or ".join(f"x = {r}" for r in uniq)
            if v in ("cubic_ok", "double_ok"): lines, cls = [stmt, fac, allr], "verified"
            elif v in ("cubic_missing", "double_missing"): lines, cls = [stmt, fac, " or ".join(f"x = {r}" for r in uniq[:-1])], "incomplete"
            else: lines, cls = [stmt, fac, " or ".join(f"x = {-r}" for r in uniq)], "invalid"
            if v == "cubic_wrong" and sorted(-r for r in uniq) == uniq: lines[2] = lines[2].replace("x = ", "x = 1") ;
            ex = ex + [F(-r) for r in uniq]
        add("polynomial-solution-sets", f"polynomial-higher/{v}", stmt, lines, cls, extras=ex, tags=[v])

# ----------------------------------------------------------------------------- MULTIVARIABLE (systems, evaluation, expansion)
NAMES = [("x", "y"), ("a", "b"), ("p", "q"), ("u", "v"), ("m", "n"), ("s", "t")]
def lin2(a, b, v, w): return sgn_join([(a, v), (b, w)])
def solve2(a1, b1, c1, a2, b2, c2):
    det = a1 * b2 - a2 * b1
    if det == 0: return None
    return F(c1 * b2 - c2 * b1, det), F(a1 * c2 - a2 * c1, det)

SYS_RECORDS = []
def sys_truth_point(lines_eq, v, w, pt):
    env = {v: pt[0], w: pt[1]}; ok = True
    for ln in lines_eq:
        rel = split_rel(ln)
        try: ok = ok and holds(rel[1], ev(parse(rel[0]), env), ev(parse(rel[2]), env))
        except Undef: return False
    return ok

def classify_system(vars_, solution_space, lines):
    """solution_space: ('unique', point) | ('none',) | ('line', eq-lambda points list). Line truth is evaluated on the whole space (sample points)."""
    kind = solution_space[0]
    def space_points():
        if kind == "unique": return [solution_space[1]]
        if kind == "line": return solution_space[1]
        return []
    def conj_parts(ln):
        ln = ln.strip()
        if ln.startswith("(") and "=" in ln and re.match(r"^\(\s*\w\s*,\s*\w\s*\)\s*=\s*\(.*\)$", ln):
            lv = [t.strip() for t in ln[1:ln.index(")")].split(",")]; rv = ln[ln.index("=") + 1:].strip()[1:-1].split(",")
            return [f"{a} = {b.strip()}" for a, b in zip(lv, rv)]
        return [p.strip() for p in re.split(r"\s+and\s+|,\s*", ln)]
    first_invalid = None; concl = {}; final_all_assign = False; partial = [False]
    for i, ln in enumerate(lines):
        if ln.strip().lower() in ("no solution", "there is no solution"):
            if kind != "none" and first_invalid is None: first_invalid = i
            concl = {"none": True}; continue
        parts = conj_parts(ln)
        pts = space_points()
        for part in parts:
            rel = split_rel(part)
            if kind == "none":
                continue   # nothing holds at an empty set; lines are vacuous implications
            oks = []
            for pt in pts:
                env = dict(zip(vars_, pt))
                try: oks.append(holds(rel[1], ev(parse(rel[0]), env), ev(parse(rel[2]), env)))
                except Undef: oks.append(False)
            if oks and not all(oks):
                if kind == "line" and any(oks): partial[0] = True          # holds on only part of the solution set: a narrowing, not a falsehood
                elif first_invalid is None: first_invalid = i
        assigns = {}
        for part in parts:
            m = re.match(r"^([A-Za-z])\s*=\s*(-?\d+(?:/\d+)?)$", part)
            if m: assigns[m.group(1)] = F(m.group(2))
        concl = assigns if (assigns and len(assigns) == len(parts)) or (concl.get("none") is None and assigns and len(assigns) == len(parts)) else concl
        if assigns and len(assigns) == len(parts): concl = {**{k: v for k, v in concl.items() if k not in assigns}, **assigns} if i > 0 and concl and "none" not in concl else assigns
        elif not assigns: concl = {}
    if first_invalid is not None: return "invalid", [first_invalid]
    if kind == "none":
        if concl.get("none"): return "verified", []
        return ("invalid", [len(lines) - 1]) if concl else ("incomplete", [])
    if kind == "unique":
        if concl.get("none"): return "invalid", [len(lines) - 1]
        if set(concl) >= set(vars_): return ("verified", []) if all(concl[v_] == solution_space[1][k] for k, v_ in enumerate(vars_)) else ("invalid", [len(lines) - 1])
        return "incomplete", []
    if kind == "line":
        if concl.get("none"): return "invalid", [len(lines) - 1]
        if partial[0] or set(concl) >= set(vars_): return "incomplete", []     # one point is not the solution set
        last = split_rel(lines[-1])
        if last and last[1] == "=" and not concl and (set(variables(parse(last[0]))) | set(variables(parse(last[2])))): return "verified", []   # a nontrivial equation true on the whole line defines it
        return "incomplete", []
    return "incomplete", []

def add_system(family, stmt, lines, intended, vars_, space, tags=()):
    if not accepting(family): return False
    cls, fi = classify_system(vars_, space, lines)
    if cls != intended: SEEN.discard(stmt); return False
    HAVE[family] = HAVE.get(family, 0) + 1
    CASES.append(dict(category="multivariable-algebra", family=family, area="algebra", problem={"domain": "algebra", "statement": stmt},
                      studentWorking={"format": "natural", "text": "\n".join(lines)},
                      reference=dict(classification=cls, firstInvalidAcceptable=fi, firstInvalidStep=fi[0] if fi else None, lineRelations=[], mustNotVerify=cls != "verified", complete=cls == "verified",
                                     alternativeMethodValid=False, coverage="in-scope", tags=list(tags), derivation="oracle-derived: exact Fraction solution of the system; each line evaluated on every sample point of the solution space")))

def fmt_sub(e, v):  # a value substituted into an expression: wrap negatives
    s = fr(e); return f"({s})" if (e < 0 or "/" in s) else s

def build_systems():
    def unit_sys():
        for _ in range(5000):
            v, w = R.choice(NAMES)
            a1, b1, a2, b2 = (R.randint(-4, 4) for _ in range(4))
            p, q = R.randint(-5, 5), R.randint(-5, 5)
            if 0 in (a1, b1, a2, b2) or a1 * b2 == a2 * b1: continue
            c1, c2 = a1 * p + b1 * q, a2 * p + b2 * q
            if abs(c1) > 25 or abs(c2) > 25: continue
            if abs(a1) != 1 and abs(b1) != 1 and abs(a2) != 1 and abs(b2) != 1: continue
            e1, e2 = f"{lin2(a1, b1, v, w)} = {c1}", f"{lin2(a2, b2, v, w)} = {c2}"
            stmt = f"{e1} and {e2}"
            if pick_unique(SEEN, stmt): return v, w, a1, b1, c1, a2, b2, c2, F(p), F(q), e1, e2, stmt
        raise RuntimeError("sys")
    # substitution (10): variants
    for var in ["ok", "ok", "ok", "ok_pair_line", "ok_tuple", "wrong_expand", "wrong_backsub", "only_first", "wrong_pair", "ok"]:
        v, w, a1, b1, c1, a2, b2, c2, p, q, e1, e2, stmt = unit_sys()
        # isolate a unit-coefficient variable from some equation
        choices = [(1, v, a1, b1, c1, a2, b2, c2, w), (1, w, b1, a1, c1, b2, a2, c2, v), (2, v, a2, b2, c2, a1, b1, c1, w), (2, w, b2, a2, c2, b1, a1, c1, v)]
        choices = [ch for ch in choices if abs(ch[2]) == 1]
        _, iv, ai, bi, ci, aj, bj, cj, ow = R.choice(choices)
        # iv = (ci - bi*ow)/ai
        c0, c1_ = F(ci, ai), F(-bi, ai)            # iv = c0 + c1_*ow
        if c0.denominator != 1 or c1_.denominator != 1: continue
        c0, c1_ = int(c0), int(c1_)
        iso = f"{iv} = {sgn_join([(c0, ''), (c1_, ow)]) if c0 else sgn_join([(c1_, ow)])}"
        subst = f"{aj}({sgn_join([(c0, ''), (c1_, ow)])}) + {bj}{ow} = {cj}".replace("+ -", "- ")
        if abs(aj) == 1: subst = f"{'-' if aj < 0 else ''}({sgn_join([(c0, ''), (c1_, ow)])}) + {bj}{ow} = {cj}".replace("+ -", "- ")
        k = aj * c1_ + bj; m = aj * c0
        expand = f"{sgn_join([(k, ow), (m, '')])} = {cj}"
        if k == 0: continue
        simp = f"{sgn_join([(k, ow)])} = {cj - m}"
        val_ow = F(cj - m, k)
        val_iv = c0 + c1_ * val_ow
        ow_line = f"{ow} = {fr(val_ow)}"
        back = f"{iv} = {sgn_join([(c0, '')]) if c0 else ''}{'' if not c0 else (' + ' if c1_ > 0 else ' - ')}{abs(c1_) if abs(c1_) != 1 else ''}{'*' if abs(c1_) != 1 else ''}{fmt_sub(val_ow, ow)}".replace("= + ", "= ").replace("= - ", "= -") if c0 else f"{iv} = {c1_}*{fmt_sub(val_ow, ow)}"
        iv_line = f"{iv} = {fr(val_iv)}"
        pt = {v: p, w: q}
        sol = ("unique", (p, q))
        final = f"{v} = {fr(pt[v])} and {w} = {fr(pt[w])}"
        base = [e1, e2, iso, subst, expand, simp, ow_line, back, iv_line]
        if var == "ok": lines, cls = base + [final], "verified"
        elif var == "ok_pair_line": lines, cls = base + [f"{v} = {fr(pt[v])}, {w} = {fr(pt[w])}"], "verified"
        elif var == "ok_tuple": lines, cls = base + [f"({v}, {w}) = ({fr(pt[v])}, {fr(pt[w])})"], "verified"
        elif var == "wrong_expand":
            bad = f"{sgn_join([(k, ow), (m + 1, '')])} = {cj}"
            lines, cls = [e1, e2, iso, subst, bad, simp, ow_line, back, iv_line, final], "invalid"
        elif var == "wrong_backsub":
            lines, cls = base[:-1] + [f"{iv} = {fr(val_iv + 1)}", final], "invalid"
        elif var == "only_first": lines, cls = base[:7], "incomplete"
        else: lines, cls = base + [f"{v} = {fr(pt[v] + 1)} and {w} = {fr(pt[w])}"], "invalid"
        add_system(f"system-substitution/{var}", stmt, lines, cls, [v, w], sol, tags=[var])
    # elimination (10)
    for var in ["ok", "ok", "ok", "ok", "ok_noecho", "wrong_combine", "wrong_scale", "incomplete_x_only", "wrong_final", "ok", "ok", "ok_noecho"]:
        for _ in range(5000):
            v, w, a1, b1, c1, a2, b2, c2, p, q, e1, e2, stmt = unit_sys()
            lcm = abs(a1 * a2) // __import__("math").gcd(a1, a2)
            m1, m2 = lcm // a1, lcm // a2
            if abs(m1) > 6 or abs(m2) > 6: continue
            break
        s1 = f"{lin2(a1 * m1, b1 * m1, v, w)} = {c1 * m1}"; s2 = f"{lin2(a2 * m2, b2 * m2, v, w)} = {c2 * m2}"
        # subtract second from first: eliminate v
        bw = b1 * m1 - b2 * m2; cw = c1 * m1 - c2 * m2
        if bw == 0: continue
        comb = f"{sgn_join([(bw, w)])} = {cw}"
        wv = F(cw, bw); wline = f"{w} = {fr(wv)}"
        bs = f"{sgn_join([(a1, v), (b1, '')]) if False else ''}"
        backeq = f"{sgn_join([(a1, v)])} + {b1}*{fmt_sub(wv, w)} = {c1}".replace("+ -", "- ")
        back2 = f"{sgn_join([(a1, v)])} = {fr(c1 - b1 * wv)}"
        vv = (c1 - b1 * wv) / a1; vline = f"{v} = {fr(vv)}"
        final = f"{v} = {fr(vv)} and {w} = {fr(wv)}"
        base = [e1, e2, s1, s2, comb, wline, backeq, back2, vline]
        sol = ("unique", (p, q) if True else None)
        # the oracle space uses (v,w) order
        if var in ("ok",): lines, cls = base + [final], "verified"
        elif var == "ok_noecho": lines, cls = [e1, e2, s1, s2, comb, wline, vline, final], "verified"
        elif var == "wrong_combine": lines, cls = [e1, e2, s1, s2, f"{sgn_join([(bw, w)])} = {cw + 1}", wline, backeq, back2, vline, final], "invalid"
        elif var == "wrong_scale": lines, cls = [e1, e2, f"{lin2(a1 * m1, b1 * m1, v, w)} = {c1 * m1 + 1}", s2, comb, wline, backeq, back2, vline, final], "invalid"
        elif var == "incomplete_x_only": lines, cls = base[:6], "incomplete"
        else: lines, cls = base + [f"{v} = {fr(vv)} and {w} = {fr(wv + 1)}"], "invalid"
        add_system(f"system-elimination/{var}", stmt, lines, cls, [v, w], sol, tags=[var])
    # 3x3 elimination (5): solution chosen, rows built, lines = reduced system
    for var in ["ok", "ok", "wrong_reduce", "incomplete", "ok"]:
        for _ in range(5000):
            vs = R.choice([("x", "y", "z"), ("a", "b", "c")]); sol3 = tuple(R.randint(-3, 4) for _ in range(3))
            rows = [[R.randint(-3, 3) for _ in range(3)] for _ in range(3)]
            # exact determinant check
            det = (rows[0][0] * (rows[1][1] * rows[2][2] - rows[1][2] * rows[2][1]) - rows[0][1] * (rows[1][0] * rows[2][2] - rows[1][2] * rows[2][0]) + rows[0][2] * (rows[1][0] * rows[2][1] - rows[1][1] * rows[2][0]))
            if det == 0 or any(all(c == 0 for c in r_) for r_ in rows): continue
            if abs(rows[0][0]) != 1: continue
            rhs = [sum(rw[i] * sol3[i] for i in range(3)) for rw in rows]
            if max(abs(x) for x in rhs) > 20: continue
            eqs = [f"{sgn_join([(rw[i], vs[i]) for i in range(3)])} = {rhs[j]}" for j, rw in enumerate(rows)]
            stmt = " and ".join(eqs)
            if pick_unique(SEEN, stmt): break
        else: continue
        # eliminate vs[0] using row0 from rows 1,2
        red = []
        for j in (1, 2):
            f_ = rows[j][0] * rows[0][0]       # multiply row0 by rows[j][0]/rows[0][0] (|rows[0][0]|=1)
            f_ = rows[j][0] // rows[0][0]
            nr = [rows[j][i] - f_ * rows[0][i] for i in range(3)]; nrhs = rhs[j] - f_ * rhs[0]
            red.append((nr, nrhs))
        l1 = f"{sgn_join([(red[0][0][1], vs[1]), (red[0][0][2], vs[2])])} = {red[0][1]}"; l2 = f"{sgn_join([(red[1][0][1], vs[1]), (red[1][0][2], vs[2])])} = {red[1][1]}"
        if "0 = " in l1 or "0 = " in l2 or l1.startswith("0") or l2.startswith("0"):
            continue
        lines = list(eqs) + [l1, l2]
        for k, name in ((2, vs[2]), (1, vs[1]), (0, vs[0])):
            pass
        lines += [f"{vs[2]} = {sol3[2]}", f"{vs[1]} = {sol3[1]}", f"{vs[0]} = {sol3[0]}"]
        fin = f"{vs[0]} = {sol3[0]} and {vs[1]} = {sol3[1]} and {vs[2]} = {sol3[2]}"
        if var == "ok": lines2, cls = lines + [fin], "verified"
        elif var == "wrong_reduce":
            bad = f"{sgn_join([(red[0][0][1], vs[1]), (red[0][0][2], vs[2])])} = {red[0][1] + 1}"
            lines2, cls = [*eqs, bad, l2, *lines[len(eqs) + 2:], fin], "invalid"
        else: lines2, cls = lines[:len(eqs) + 2], "incomplete"
        add_system3(f"system-3x3/{var}", stmt, lines2, cls, list(vs), sol3, tags=[var])
    # dependent / inconsistent (4)
    for var in ["dep_single_pair", "dep_param_ok", "incons_ok", "incons_pair"]:
        v, w = R.choice(NAMES); k = R.randint(2, 4); c = R.randint(1, 8);
        a1, b1 = R.choice([(1, 1), (1, 2), (2, 1), (1, -1)])
        stmt = f"{lin2(a1, b1, v, w)} = {c} and {lin2(a1 * k, b1 * k, v, w)} = {c * k + (0 if var.startswith('dep') else 1)}"
        stmt = stmt
        if not pick_unique(SEEN, stmt): continue
        if var.startswith("dep"):
            pts = [(F(t), F(c - a1 * t, b1)) for t in range(-3, 4)]
            space = ("line", pts)
            if var == "dep_single_pair": lines, cls = [stmt.split(" and ")[0], stmt.split(" and ")[1], f"{lin2(a1 * k, b1 * k, v, w)} = {c * k}", f"{v} = 1 and {w} = {fr(F(c - a1, b1))}"], "incomplete"
            else: lines, cls = stmt.split(" and ") + [f"{sgn_join([(b1, w)])} = {sgn_join([(c, ''), (-a1, v)])}"], "verified"
            if var == "dep_param_ok":
                # solved form is only complete when it is the whole solution set; parametric line equals the solution set
                cls = "verified"
        else:
            space = ("none",)
            zero = f"0 = 1"
            lines = stmt.split(" and ") + [f"{lin2(a1 * k, b1 * k, v, w)} = {c * k}", zero, "no solution"] if var == "incons_ok" else stmt.split(" and ") + [f"{v} = 1 and {w} = {fr(F(c - a1, b1))}"]
            cls = "verified" if var == "incons_ok" else "invalid"
        add_system(f"system-degenerate/{var}", stmt, lines, cls, [v, w], space, tags=[var])
    # evaluation / substitution (8) and expansion (6) + two nonlinear systems (2)
    build_eval_expand()

def add_system3(family, stmt, lines, intended, vars_, sol, tags=()):
    if not accepting(family): return False
    cls, fi = classify_system(vars_, ("unique", tuple(F(x) for x in sol)), lines)
    if cls != intended: SEEN.discard(stmt); return False
    HAVE[family] = HAVE.get(family, 0) + 1
    CASES.append(dict(category="multivariable-algebra", family=family, area="algebra", problem={"domain": "algebra", "statement": stmt},
                      studentWorking={"format": "natural", "text": "\n".join(lines)},
                      reference=dict(classification=cls, firstInvalidAcceptable=fi, firstInvalidStep=fi[0] if fi else None, lineRelations=[], mustNotVerify=cls != "verified", complete=cls == "verified",
                                     alternativeMethodValid=False, coverage="in-scope", tags=list(tags), derivation="oracle-derived: exact Fraction solution of the system; each line evaluated at the unique solution")))

# evaluation: 'EXPR when a = 2 and b = -3'
def poly_expand(e_str, vars_):
    """oracle polynomial expansion -> dict(monomial tuple -> Fraction) using sample interpolation-free symbolic expansion."""
    ast = parse(e_str)
    def ex(n):
        k = n[0]
        if k == "c": return {tuple(0 for _ in vars_): n[1]}
        if k == "x": return {tuple(1 if u == n[1] else 0 for u in vars_): F(1)}
        if k == "neg": return {m: -c for m, c in ex(n[1]).items()}
        if k in ("+", "-"):
            a, b = ex(n[1]), ex(n[2]); out = dict(a)
            for m, c in b.items(): out[m] = out.get(m, 0) + (c if k == "+" else -c)
            return {m: c for m, c in out.items() if c != 0}
        if k == "*":
            a, b = ex(n[1]), ex(n[2]); out = {}
            for m1, c1 in a.items():
                for m2, c2 in b.items():
                    m = tuple(x + y for x, y in zip(m1, m2)); out[m] = out.get(m, 0) + c1 * c2
            return {m: c for m, c in out.items() if c != 0}
        if k == "^":
            base = ex(n[1]); out = {tuple(0 for _ in vars_): F(1)}
            for _ in range(n[2]): out = ex(("*", ("poly", out), ("poly", base)))
            return out
        if k == "poly": return n[1]
        raise ValueError(k)
    # support embedded poly nodes
    return ex(ast)
_old_ex = None

def build_eval_expand():
    # evaluation cases
    for var in ["ok", "ok", "ok", "wrong_line", "wrong_line", "partial", "wrong_final", "ok_symbolic_first"]:
        for _ in range(500):
            v, w = R.choice(NAMES); av, bw = R.randint(-4, 5), R.randint(-4, 5)
            c1, c2, c3 = R.randint(1, 4), R.randint(-3, 3), R.randint(1, 3)
            expr = sgn_join([(c1, f"{v}^2"), (c2, f"{v}{w}"), (c3, f"{w}^2")])
            stmt = f"{expr} when {v} = {av} and {w} = {bw}"
            if pick_unique(SEEN, stmt): break
        else: continue
        val = c1 * av * av + c2 * av * bw + c3 * bw * bw
        def num(x): return f"({x})" if x < 0 else str(x)
        sub = f"{c1}*{num(av)}^2 + ({c2})*{num(av)}*{num(bw)} + {c3}*{num(bw)}^2"
        mid = f"{c1 * av * av} + ({c2 * av * bw}) + {c3 * bw * bw}"
        lines = [expr, sub, mid, str(val)]
        if var == "wrong_line": lines, cls = [expr, sub, f"{c1 * av * av + 1} + ({c2 * av * bw}) + {c3 * bw * bw}", str(val)], "invalid"
        elif var == "partial": lines, cls = [expr, sub, mid], "incomplete"
        elif var == "wrong_final": lines, cls = [expr, sub, mid, str(val + 1)], "invalid"
        elif var == "ok_symbolic_first": lines, cls = [sub, mid, str(val)], "verified"
        else: cls = "verified"
        # oracle: value of every line under bindings
        env = {v: F(av), w: F(bw)}
        vals = []
        for ln in lines:
            try: vals.append(ev(parse(ln), env))
            except Undef: vals.append(None)
        want = Decimal(val)
        first = next((i for i, x in enumerate(vals) if x is None or abs(x - want) > TOL), None)
        got = "invalid" if first is not None else ("verified" if re.fullmatch(r"-?\d+", lines[-1].strip()) else "incomplete")
        if got != cls or not accepting(f"evaluation/{var}"): SEEN.discard(stmt); continue
        HAVE[f"evaluation/{var}"] = HAVE.get(f"evaluation/{var}", 0) + 1
        CASES.append(dict(category="multivariable-algebra", family=f"evaluation/{var}", area="algebra", problem={"domain": "algebra", "statement": stmt},
                          studentWorking={"format": "natural", "text": "\n".join(lines)},
                          reference=dict(classification=cls, firstInvalidAcceptable=[first] if first is not None else [], firstInvalidStep=first, lineRelations=[], mustNotVerify=cls != "verified", complete=cls == "verified",
                                         alternativeMethodValid=False, coverage="in-scope", tags=[var], derivation="oracle-derived: every line evaluated exactly under the stated bindings")))
    # expansion cases
    for var in ["ok", "ok", "ok", "wrong_expand", "unexpanded_final", "wrong_final"]:
        for _ in range(500):
            v, w = R.choice(NAMES); k1, k2 = R.randint(1, 3), R.randint(-3, 3)
            if k2 == 0: continue
            e = f"({P([k1, 0], v)[:-2] if False else (str(k1) if k1 > 1 else '')}{v} + {k2}{w})^2".replace("+ -", "- ")
            stmt = f"Expand {e}"
            if pick_unique(SEEN, stmt): break
        else: continue
        exp_ = sgn_join([(k1 * k1, f"{v}^2"), (2 * k1 * k2, f"{v}{w}"), (k2 * k2, f"{w}^2")])
        mid = f"({e[1:-3] if False else (str(k1) if k1 > 1 else '') + v})^2 + 2*{(str(k1) if k1 > 1 else '') + v}*{k2 if k2 > 0 else '(' + str(k2) + ')'}{w} + ({k2}{w})^2"
        mid = f"{('(' + str(k1) + v + ')') if k1 > 1 else v}^2 + 2*{('(' + str(k1) + v + ')') if k1 > 1 else v}*{('(' + str(k2) + w + ')')} + ({k2}{w})^2"
        base = [e, mid, exp_]
        if var == "ok": lines, cls = base, "verified"
        elif var == "wrong_expand": lines, cls = [e, mid, sgn_join([(k1 * k1, f"{v}^2"), (k1 * k2, f"{v}{w}"), (k2 * k2, f"{w}^2")])], "invalid"
        elif var == "unexpanded_final": lines, cls = [e, mid], "incomplete"
        else: lines, cls = [e, mid, sgn_join([(k1 * k1, f"{v}^2"), (2 * k1 * k2, f"{v}{w}"), (k2 * k2 + 1, f"{w}^2")])], "invalid"
        vs = [v, w]
        target = poly_expand(e, vs)
        first = None
        for i, ln in enumerate(lines):
            ok = True
            for _t in range(25):
                env = {v: F(R.randint(-9, 9)), w: F(R.randint(-9, 9))}
                if abs(ev(parse(ln), env) - ev(parse(e), env)) > TOL: ok = False; break
            if not ok and first is None: first = i
        got = "invalid" if first is not None else ("verified" if "(" not in lines[-1] and set(poly_expand(lines[-1], vs)) and len(re.findall(r"[+-]", lines[-1].lstrip("-"))) + 1 == len(target) else "incomplete")
        if got != cls or not accepting(f"expansion/{var}"): SEEN.discard(stmt); continue
        HAVE[f"expansion/{var}"] = HAVE.get(f"expansion/{var}", 0) + 1
        CASES.append(dict(category="multivariable-algebra", family=f"expansion/{var}", area="algebra", problem={"domain": "algebra", "statement": stmt},
                          studentWorking={"format": "natural", "text": "\n".join(lines)},
                          reference=dict(classification=cls, firstInvalidAcceptable=[first] if first is not None else [], firstInvalidStep=first, lineRelations=[], mustNotVerify=cls != "verified", complete=cls == "verified",
                                         alternativeMethodValid=False, coverage="in-scope", tags=[var], derivation="oracle-derived: polynomial identity by exact evaluation at 25 random rational points; final form must be fully expanded")))

# ----------------------------------------------------------------------------- run
def build_alt():
    CAT = "alternative-method"
    def A(family, stmt, lines, extras=(), var="x"):
        return add(CAT, "alt:" + family, stmt, lines, "verified", var=var, extras=extras, tags=["alternative"])
    for _ in range(3):
        for _t in range(100):
            a, k = R.randint(-5, 6), R.randint(1, 6)
            stmt = f"{P([1, -2 * a, a * a - k * k])} = 0"
            if pick_unique(SEEN, stmt): break
        else: continue
        A("complete-square", stmt, [stmt, f"{P([1, -2 * a, 0])} = {k * k - a * a}", f"(x - {a})^2 = {k * k}".replace("- -", "+ ").replace("(x - 0)", "x"), f"x = {a + k} or x = {a - k}"], [F(a + k), F(a - k)])
    for _ in range(2):
        for _t in range(100):
            c = R.randint(2, 19); stmt = f"x^2 = {c}x"
            if pick_unique(SEEN, stmt): break
        else: continue
        A("factor-out", stmt, [stmt, f"x^2 - {c}x = 0", f"x(x - {c}) = 0", f"x = 0 or x = {c}"], [F(0), F(c)])
    for _ in range(2):
        stmt, iso, sq1, iso2, half, sq2, r, (p, q, S, u, v_, xp, xq) = radical_two()
        isoB = f"sqrt({xq}) = {S} - sqrt({xp})"; sq1B = f"{xq} = {S * S} - {2 * S}*sqrt({xp}) + {xp}"
        iso2B = f"{2 * S}*sqrt({xp}) = {S * S + p - q}"; halfB = f"sqrt({xp}) = {u}"; sq2B = f"{xp} = {u * u}"
        A("radical-other-radical-first", stmt, [stmt, isoB, sq1B, iso2B, halfB, sq2B, f"x = {r}"], [F(r)])
    for _ in range(2):
        for _t in range(2000):
            a, b, c = R.randint(-5, 6), R.randint(-5, 5), R.randint(2, 5)
            if c == 1: continue
            num, den = c * b - a, 1 - c
            if num % den: continue
            r = num // den
            if r + b == 0: continue
            stmt = f"({P([1, a])})/({P([1, b])}) = {c}"
            if pick_unique(SEEN, stmt): break
        else: continue
        A("rational-multiply-through", stmt, [stmt, f"{P([1, a])} = {c}({P([1, b])})", f"{P([1, a])} = {P([c, c * b])}", f"{P([1 - c, 0])} = {c * b - a}", f"x = {r}"], [F(r), F(-b)])
    for _ in range(2):
        for _t in range(200):
            k, a, t = R.randint(2, 5), R.randint(-6, 6), R.randint(-6, 6)
            stmt = f"-{k}x + {a} > {-k * t + a}".replace("+ -", "- ")
            if pick_unique(SEEN, stmt): break
        else: continue
        A("negative-division", stmt, [stmt, f"-{k}x > {-k * t}", f"x < {t}"], [F(t)])
    for _ in range(2):
        for _t in range(200):
            k, a, t = R.randint(2, 5), R.randint(-6, 6), R.randint(-6, 6)
            stmt = f"-{k}x + {a} > {-k * t + a}".replace("+ -", "- ")
            if pick_unique(SEEN, stmt): break
        else: continue
        A("move-terms", stmt, [stmt, f"{a} - {-k * t + a} > {k}x".replace("- -", "+ "), f"{k}x < {-(-k * t)}", f"x < {t}"], [F(t)])

def main():
    global QUOTA
    for rnd in range(60):
        ROUND[0] = rnd
        for fn in (build_radical, build_rational, build_polynomial, build_systems, build_alt):
            try: fn()
            except (RuntimeError, ZeroDivisionError, KeyError, IndexError, ValueError, UnboundLocalError, TypeError) as ex_:
                if DEBUG and rnd < 2: import traceback; print('EXC', fn.__name__, repr(ex_)); traceback.print_exc(limit=-2)
        if rnd == 0: PLAN.update(ATTEMPT); QUOTA = {k: v * 2 for k, v in ATTEMPT.items()}
        if all(HAVE.get(k, 0) >= v for k, v in QUOTA.items()): break
    return CASES

def assemble():
    by = {}
    for c in CASES: by.setdefault(c["family"], []).append(c)
    primary, pool = [], []
    for fam, lst in by.items():
        n = PLAN.get(fam, len(lst))
        primary += lst[:n]; pool += lst[n:]
    cats = {}
    for c in primary: cats.setdefault(c["category"], []).append(c)
    # alternative-method: dedicated scripts + valid pool cases from other families, one per family round-robin
    alt = list(cats.get("alternative-method", []))
    cand = [c for c in pool if c["reference"]["classification"] == "verified" and not c["family"].startswith("alt:")]
    byfam = {}
    for c in cand: byfam.setdefault(c["family"].split("/")[0], []).append(c)
    used = set()
    while len(alt) < 25:
        progressed = False
        for fam in sorted(byfam):
            if byfam[fam] and len(alt) < 25:
                c = byfam[fam].pop(0); c = dict(c); c["category"] = "alternative-method"; c["reference"] = dict(c["reference"], alternativeMethodValid=True, tags=c["reference"]["tags"] + ["pool-alternative"])
                alt.append(c); used.add(id_of(c)); progressed = True
        if not progressed: break
    cats["alternative-method"] = alt
    # invalid intermediate reasoning: wrong-step variants (final answer usually correct)
    prefer = ("wrong_sq", "wrong_expand", "wrong_fac", "wrong_clear", "wrong_combine", "wrong_scale", "wrong_line", "wrong_sq1", "wrong_backsub")
    inv = [c for c in pool if c["reference"]["classification"] == "invalid" and any(t in prefer for t in c["reference"]["tags"]) and id_of(c) not in used]
    byfam = {}
    for c in inv: byfam.setdefault(c["family"].split("/")[0], []).append(c)
    chosen = []
    while len(chosen) < 20:
        progressed = False
        for fam in sorted(byfam):
            if byfam[fam] and len(chosen) < 20:
                c = dict(byfam[fam].pop(0)); c["category"] = "invalid-intermediate-reasoning"; chosen.append(c); progressed = True
        if not progressed: break
    if len(chosen) < 20:
        have = {id_of(c) for c in chosen}
        extra = [c for c in pool if c["reference"]["classification"] == "invalid" and id_of(c) not in have and id_of(c) not in used]
        for c in extra[: 20 - len(chosen)]:
            c = dict(c); c["category"] = "invalid-intermediate-reasoning"; chosen.append(c)
    cats["invalid-intermediate-reasoning"] = chosen
    return cats
def id_of(c): return (c["problem"]["statement"], c["studentWorking"]["text"])

TARGET = {"radical-extraneous-roots": (45, 22), "multivariable-algebra": (45, 23), "rational-domain-restrictions": (35, 18), "polynomial-solution-sets": (30, 15), "alternative-method": (25, 12), "invalid-intermediate-reasoning": (20, 10)}
def freeze(outdir):
    cats = assemble(); dev, sealed = [], []
    for cat, (n, ndev) in TARGET.items():
        lst = cats[cat]
        assert len(lst) == n, (cat, len(lst), n)
        lst = sorted(lst, key=lambda c: (c["family"], R.random()))
        d = lst[0::2][: ndev] if len(lst[0::2]) >= ndev else lst[0::2]
        rest = [c for c in lst if all(c is not x for x in d)]
        if len(d) < ndev: d += rest[: ndev - len(d)]; rest = [c for c in lst if all(c is not x for x in d)]
        dev += d; sealed += rest
    assert len(dev) == 100 and len(sealed) == 100, (len(dev), len(sealed))
    for part, arr in (("dev", dev), ("sealed", sealed)):
        R.shuffle(arr)
        for i, c in enumerate(arr):
            c["id"] = f"e4-{part}-{i:03d}"; c["partition"] = "development" if part == "dev" else "sealed-holdout"
            c["provenance"] = dict(kind="independently-authored", license="CC0-1.0", oracle="e4_oracle.py (Fractions + Decimal(80)); no OpenPath code; SymPy unavailable offline")
        json.dump(dict(benchmark="openpath-e4-verified-coverage", version="1", seed=20261101, cases=arr), open(f"{outdir}/{part}-cases.v1.json", "w"), indent=1)
    return dev, sealed

if __name__ == "__main__":
    main()
    import collections, hashlib, datetime
    dev, sealed = freeze(OUT)
    print({k: len(v) for k, v in assemble().items()})
    for part, arr in (("dev", dev), ("sealed", sealed)):
        print(part, collections.Counter(c["category"] for c in arr), collections.Counter(c["reference"]["classification"] for c in arr))
