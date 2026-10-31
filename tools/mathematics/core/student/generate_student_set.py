#!/usr/bin/env python3
"""generate_student_set.py - seeded, deterministic generator of the FROZEN student-working corpus (student.json).
Labels never come from the generator's intent: every task is run through student_oracle.analyse (SymPy, exact) and
dropped (logged in dropped.json) when SymPy disagrees with the intended outcome."""
import hashlib, json, os, random, re, sys
from fractions import Fraction  # noqa: F401
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import student_oracle as O
from student_oracle import Line, analyse, X
import sympy
from sympy import Rational, Poly, together, fraction, expand, cancel, factor_list, lcm, Integer, S

SEED = 20261026
GEN_VERSION = "1.0"

# ----------------------------------------------------------------- formatting (explicit grammar: x, numbers, + - * / ^, brackets)
def rs(q):
    q = Rational(q)
    return str(q.p) if q.q == 1 else "%d/%d" % (q.p, q.q)

def E(terms):
    """terms: (coef, power) with power 0 const, 1 or True -> x, n -> x^n."""
    out = ""
    for c, pw in terms:
        c = Rational(c)
        if c == 0:
            continue
        pw = int(pw)
        a = abs(c)
        if pw == 0:
            body = rs(a)
        else:
            xs = "x" if pw == 1 else "x^%d" % pw
            if a == 1:
                body = xs
            elif a.q == 1:
                body = "%d*%s" % (a.p, xs)
            elif a.p == 1:
                body = "%s/%d" % (xs, a.q)
            else:
                body = "%d*%s/%d" % (a.p, xs, a.q)
        out += (("-" if c < 0 else "") + body) if not out else (("-" if c < 0 else "+") + body)
    return out or "0"

def eq(l, r):
    return l + "=" + r

def polystr(expr):
    P = Poly(expand(expr), X)
    return E([(c, m[0]) for m, c in P.terms()])

def inner(q):
    return E([(1, 1), (q, 0)])

def outer(p, q):
    i = "(" + inner(q) + ")"
    return i if p == 1 else "-" + i if p == -1 else "%s*%s" % (p, i)

def side_br(p, q, r):
    s = outer(p, q)
    return s + ("" if r == 0 else ("+" if r > 0 else "-") + rs(abs(r)))

def side_neg(p, q, r):
    """r - p*(x+q), p>0"""
    br = "(" + inner(q) + ")"
    t = br if p == 1 else "%s*%s" % (p, br)
    return ("%s-%s" % (rs(r), t)) if r != 0 else "-" + t

def surface(line, rng, mode):
    s = line
    if mode >= 1:
        s = _dropstar(s)
    if mode >= 2:
        s = re.sub(r"\s*=\s*", " = ", s)
        s = re.sub(r"(?<=[\dx)])\s*([+-])\s*(?=[\dx(])", r" \1 ", s)
    if mode >= 3:
        s = s.replace("-", "−").replace("*", "×")
        if rng.random() < 0.4:
            s = s.replace("/", "÷") if not re.search(r"\d/\d", s) or True else s
    return s

def _dropstar(s):
    res = list(s)
    drop = []
    for i, ch in enumerate(s):
        if ch != "*" or not (0 < i < len(s) - 1):
            continue
        if s[i + 1] not in "x(" or not (s[i - 1].isdigit() or s[i - 1] in "x)"):
            continue
        j = i - 1
        if s[j].isdigit():
            while j >= 0 and (s[j].isdigit() or s[j] == "."):
                j -= 1
            st = j + 1
        elif s[j] == "x":
            st = j
        else:
            d = 0
            while j >= 0:
                if s[j] == ")":
                    d += 1
                elif s[j] == "(":
                    d -= 1
                    if d == 0:
                        break
                j -= 1
            st = j
        if st > 0 and s[st - 1] == "/":
            continue
        if st > 0 and s[st - 1] == "^":
            continue
        drop.append(i)
    return "".join(c for i, c in enumerate(s) if i not in set(drop))

# ----------------------------------------------------------------- linear cores, dressing, post lines
def nz(rng, lo, hi, avoid=()):
    while True:
        v = rng.randint(lo, hi)
        if v != 0 and v not in avoid:
            return v

def make_core(rng, c0=False, neg_a=False, big_a=True):
    while True:
        a = nz(rng, -9, 9)
        if big_a and abs(a) < 2:
            continue
        if neg_a and a > -1:
            continue
        c = 0 if c0 else nz(rng, -8, 8)
        if a == c:
            continue
        b = nz(rng, -12, 12)
        if rng.random() < 0.75:
            x0 = rng.randint(-8, 8)
            d = (a - c) * x0 + b
        else:
            d = rng.randint(-15, 15)
        if neg_a and a >= 0:
            continue
        return (a, b, c, d)

def core_str(core):
    a, b, c, d = core
    return eq(E([(a, 1), (b, 0)]), E([(c, 1), (d, 0)]))

def dress(core, rng, n_pre, neg=False):
    a, b, c, d = core
    Rpl = E([(c, 1), (d, 0)])
    info = {}
    if n_pre == 0:
        return core_str(core), [], info
    q = nz(rng, -6, 6)
    if neg:
        p = -a
        r = b - a * q
        # a = -p ; b = r - p*q  => r = b + p*q
        r = b + p * q
        Lbr = side_neg(p, q, r)
        exp_terms = [(r, 0), (a, 1), (a * q, 0)]
    else:
        p = a
        r = b - p * q
        Lbr = side_br(p, q, r)
        exp_terms = [(p, 1), (p * q, 0), (r, 0)]
    info.update(p=p, q=q, r=r, neg=neg)
    if n_pre == 1:
        return eq(Lbr, Rpl), [core_str(core)], info
    expL = E(exp_terms)
    if n_pre == 2 or c == 0 or abs(c) < 2:
        info["expL"] = 1
        return eq(Lbr, Rpl), [eq(expL, Rpl), core_str(core)], info
    t = nz(rng, -5, 5)
    u = d - c * t
    Rbr = side_br(c, t, u)
    info.update(s=c, t=t, u=u, expL=1, expR=2)
    expR = E([(c, 1), (c * t, 0), (u, 0)])
    pre = [eq(expL, Rbr), eq(expL, expR)]
    if n_pre == 3:
        pre.append(core_str(core))
    else:
        pre.append(eq(E([(a, 1), (b, 0)]), expR))
        pre.append(core_str(core))
    return eq(Lbr, Rbr), pre, info

def post(core):
    a, b, c, d = core
    e, f = a - c, d - b
    P1 = eq(E([(a, 1), (-c, 1)]), E([(d, 0), (-b, 0)]))
    P2 = eq(E([(e, 1)]), E([(f, 0)]))
    P3 = "x=" + rs(Rational(f) / e)
    lines = []
    if P1 != P2:
        lines.append(P1)
    lines.append(P2)
    if Rational(e) != 1:
        lines.append(P3)
    return lines

def cont(bad, rng, maxlines=3):
    """consequential continuation: what a student would write after a (possibly wrong) line, solved correctly."""
    try:
        ln = Line(bad)
        Le, Re = ln.members[0]
        f = together(Le - Re)
        num, den = fraction(f)
        out = []
        den = expand(den)
        Lc, Rc = Le, Re
        if den != 1 and den.has(X) or (den != 1 and den.is_Rational and den != 1):
            Lc, Rc = expand(cancel(Le * den)), expand(cancel(Re * den))
            s = eq(polystr(Lc), polystr(Rc))
            if s.replace(" ", "") != bad.replace(" ", ""):
                out.append(s)
        g = expand(Lc - Rc)
        P = Poly(g, X)
        if P.degree() == 1:
            u, v = P.all_coeffs()
            s = eq(E([(u, 1)]), E([(-v, 0)]))
            if not out or out[-1] != s:
                if s.replace(" ", "") != (out[-1] if out else bad).replace(" ", ""):
                    out.append(s)
            if Rational(u) != 1:
                out.append("x=" + rs(Rational(-v) / u))
        elif P.degree() == 0:
            out.append("no solution" if P.as_expr() != 0 else "all real numbers")
        elif P.degree() == 2:
            c_, fl = factor_list(P.as_expr(), X)
            if all(Poly(ff, X).degree() == 1 for ff, _ in fl):
                rts = sorted({Rational(-Poly(ff, X).all_coeffs()[1], Poly(ff, X).all_coeffs()[0]) for ff, _ in fl})
                out.append(" or ".join("x=" + rs(r) for r in rts))
        return out[:maxlines] if rng.random() < 0.8 else out
    except Exception:
        return []

# ----------------------------------------------------------------- task assembly and SymPy-labelling
TASKS, DROPPED, SEEN = [], [], set()

def rngfor(fam, i):
    return random.Random("%d-%s-%d" % (SEED, fam, i))

def pick_mode(rng):
    return rng.choices([0, 1, 2, 3], [0.2, 0.35, 0.25, 0.2])[0]

def swap(eqs):
    l, r = eqs.split("=")
    return r + "=" + l

def maybe_pad(rng, problem, lines, k, prob=0.3):
    """prepend a valid 'swap sides' line (problem is the swapped form): shifts k by one."""
    if k is not None and k <= 4 and rng.random() < prob and " or " not in problem:
        return swap(problem), [problem] + lines, k + 1
    return problem, lines, k

def drop(fam, tid, intent, reason, problem, lines):
    DROPPED.append({"id": tid, "family": fam, "intent": intent, "reason": reason, "problem": problem, "lines": lines})

def emit(fam, idx, problem, lines, intent, rng, notes="", mode=None, ambiguous_ok=False, cls=None):
    tid = "%s-%04d" % (fam, idx)
    if not lines:
        return False
    if mode is None:
        mode = pick_mode(rng)
    slines = [surface(l, rng, mode) for l in lines]
    key = (problem, tuple(slines))
    if key in SEEN:
        drop(fam, tid, intent, "duplicate", problem, slines)
        return False
    try:
        a = analyse(problem, slines, "lr")
        b = analyse(problem, slines, "tight")
    except Exception as e:  # problem itself unreadable / outside scope
        drop(fam, tid, intent, "analysis failed: %s: %s" % (type(e).__name__, e), problem, slines)
        return False
    ka, kb = O.verdict_key(a), O.verdict_key(b)
    exp = None
    if ambiguous_ok:
        if ka != kb:
            exp = {"status": "ambiguous", "first_invalid": None, "invalid_at": None, "error_class": None,
                   "final_verdict": "n/a"}
            if intent.get("status") not in (None, "ambiguous"):
                drop(fam, tid, intent, "readings agree but ambiguity intended", problem, slines)
                return False
        else:
            if intent.get("status") == "ambiguous":
                drop(fam, tid, intent, "readings agree (no ambiguity)", problem, slines)
                return False
            if not any(O.readings_differ(s) for s in slines):
                drop(fam, tid, intent, "no reading-sensitive line", problem, slines)
                return False
    else:
        if ka != kb or a["step_labels"] != b["step_labels"]:
            drop(fam, tid, intent, "reading-dependent labels in an unambiguous family", problem, slines)
            return False
    # intent vs SymPy
    chk = {"status": a["status"], "first_invalid": a["first_invalid"], "invalid_at": a["invalid_at"],
           "final_verdict": a["final_verdict"]}
    if exp is None or not ambiguous_ok or ka == kb:
        for kk, vv in intent.items():
            if kk in chk and chk[kk] != vv:
                drop(fam, tid, intent, "SymPy disagrees: %s intended %r, computed %r" % (kk, vv, chk[kk]), problem, slines)
                return False
    if intent.get("no_invalid_labels") and "invalid" in a["step_labels"]:
        drop(fam, tid, intent, "an invalid step precedes/accompanies the unsupported line", problem, slines)
        return False
    if intent.get("require_label"):
        i, lab = intent["require_label"]
        if a["step_labels"][i - 1] != lab:
            drop(fam, tid, intent, "step %d label %s != %s" % (i, a["step_labels"][i - 1], lab), problem, slines)
            return False
    if exp is None:
        exp = {"status": a["status"], "first_invalid": a["first_invalid"], "invalid_at": a["invalid_at"],
               "error_class": cls if a["status"] == "invalid" and a["invalid_at"] == "step" else
               (intent.get("final_class") if a["invalid_at"] == "final-claim" else None),
               "final_verdict": a["final_verdict"]}
    exp["step_flags"] = a["step_flags"]
    exp["step_labels"] = a["step_labels"]
    if a["unsupported_lines"]:
        exp["unsupported_lines"] = a["unsupported_lines"]
    if exp["status"] == "ambiguous":
        names = ("status", "first_invalid", "invalid_at", "final_verdict")
        exp["readings"] = {"left-to-right": dict(zip(names, ka), step_labels=a["step_labels"]),
                           "tight-denominator": dict(zip(names, kb), step_labels=b["step_labels"])}
    elif ambiguous_ok:
        exp["readings_agree"] = True
    SEEN.add(key)
    TASKS.append({"id": tid, "family": fam, "problem": problem, "lines": slines, "expected": exp,
                  "truth": {"solution_set": a["truth"].to_json(), "excluded": [str(v) for v in a["excluded"]]},
                  "notes": notes})
    return True

def finish_B(rng, prefix, bad, recover_tail, k_extra=0):
    """assemble prefix + bad + (recovery | consequential continuation)"""
    k = len(prefix) + 1
    r = rng.random()
    if recover_tail and r < 0.3:
        tail = list(recover_tail)
    elif r < 0.45:
        tail = []
    else:
        tail = cont(bad, rng)
    return prefix + [bad] + tail, k

# ----------------------------------------------------------------- class generators for linear problems
def g_sign(rng):
    core = make_core(rng)
    a, b, c, d = core
    n = rng.choice([0, 0, 1, 2, 3])
    prob, pre, info = dress(core, rng, n)
    v = rng.choice([1, 2])
    bad = eq(E([(a, 1), (-c, 1)]), E([(d, 0), (b, 0)])) if v == 1 else eq(E([(a, 1), (c, 1)]), E([(d, 0), (-b, 0)]))
    P = post(core)
    lines, k = finish_B(rng, pre, bad, P[1:] if len(P) > 1 else [])
    return prob, lines, k, "moved %s across '=' without changing its sign" % ("the constant" if v == 1 else "the x-term")

def g_onesided(rng):
    core = make_core(rng)
    a, b, c, d = core
    n = rng.choice([0, 0, 1, 2, 3])
    prob, pre, info = dress(core, rng, n)
    v = rng.choice([1, 2])
    bad = eq(E([(a, 1)]), E([(c, 1), (d, 0)])) if v == 1 else eq(E([(a, 1), (b, 0)]), E([(c, 1)]))
    lines, k = finish_B(rng, pre, bad, post(core)[1:])
    return prob, lines, k, "deleted a constant from one side only"

def g_partdiv(rng):
    core = make_core(rng, c0=True)
    a, b, c, d = core
    n = rng.choice([0, 0, 1, 2])
    prob, pre, info = dress(core, rng, n)
    v = rng.choice([1, 2])
    bad = eq(E([(1, 1), (b, 0)]), rs(Rational(d) / a)) if v == 1 else eq(E([(1, 1), (Rational(b) / a, 0)]), rs(d))
    rec = [eq("x", rs(Rational(d - b) / a))]
    lines, k = finish_B(rng, pre, bad, rec)
    return prob, lines, k, "divided by %d but not every term" % a

def g_partdist(rng):
    while True:
        core = make_core(rng)
        if abs(core[0]) >= 2:
            break
    a, b, c, d = core
    n = rng.choice([2, 2, 3, 4])
    prob, pre, info = dress(core, rng, n)
    if "expL" not in info:
        return None
    p, q, r = info["p"], info["q"], info["r"]
    badL = E([(p, 1), (q, 0), (r, 0)])
    # rebuild the expand line: right side as in pre[0]
    Rside = pre[0].split("=")[1]
    bad = eq(badL, Rside)
    lines, k = finish_B(rng, [], bad, pre[1:] + post(core))
    return prob, lines, k, "k*(x+q) expanded to k*x+q (second term not multiplied)"

def g_distsign(rng):
    core = make_core(rng, neg_a=True, big_a=False)
    a, b, c, d = core
    n = rng.choice([2, 2, 3, 4])
    prob, pre, info = dress(core, rng, n, neg=True)
    if "expL" not in info:
        return None
    q, r = info["q"], info["r"]
    Rside = pre[0].split("=")[1]
    bad = eq(E([(r, 0), (a, 1), (-a * q, 0)]), Rside)
    lines, k = finish_B(rng, [], bad, pre[1:] + post(core))
    return prob, lines, k, "sign of the second term not changed when removing a bracket preceded by minus"

def perturb(line, rng):
    nums = [m for m in re.finditer(r"(?<![\d.^])\d+(?![\d.])", line) if not line[max(0, m.start() - 1):m.start()] == "^"]
    rng.shuffle(nums)
    for m in nums:
        v = int(m.group())
        for dl in rng.sample([1, -1, 2, -2, 3], 5):
            nv = v + dl
            if nv < 0 or (nv == 0 and line[max(0, m.start() - 1):m.start()] in "/*"):
                continue
            return line[:m.start()] + str(nv) + line[m.end():]
    return None

def g_slip(rng):
    core = make_core(rng)
    n = rng.choice([0, 0, 1, 2, 3])
    prob, pre, info = dress(core, rng, n, neg=(core[0] < 0 and rng.random() < 0.3) and n >= 2)
    full = pre + post(core)
    j = rng.randint(1, min(5, len(full)))
    bad = perturb(full[j - 1], rng)
    if bad is None:
        return None
    pfx = full[:j - 1]
    lines, k = finish_B(rng, pfx, bad, full[j:])
    return prob, lines, k, "correct step with one number changed (line %d)" % j

def g_unbal(rng):
    while True:
        core = make_core(rng)
        if abs(core[0] - core[2]) >= 2:
            break
    n = rng.choice([0, 1, 2, 3])
    prob, pre, info = dress(core, rng, n)
    P = post(core)
    e, f = core[0] - core[2], core[3] - core[1]
    full = pre + P
    bad = "x=" + rs(f)
    return prob, full[:-1] + [bad], len(full), "divided the left side by %d only" % e

def g_inverse(rng):
    while True:
        core = make_core(rng)
        if abs(core[0] - core[2]) >= 2:
            break
    n = rng.choice([0, 1, 2, 3])
    prob, pre, info = dress(core, rng, n)
    P = post(core)
    e, f = core[0] - core[2], core[3] - core[1]
    full = pre + P
    bad = "x=" + rs(Rational(e) * f)
    return prob, full[:-1] + [bad], len(full), "undid multiplication by %d by multiplying again" % e

def g_unknownfactor(rng):
    p, q = rng.sample([v for v in range(-6, 7) if v not in (0, 1)], 2)
    r = nz(rng, -6, 6)
    fac = E([(1, 1), (-r, 0)])
    form = rng.choice(["plain", "plain", "const", "frac", "rev"])
    pre = []
    if form == "plain":
        prob = eq("%s*(%s)" % (p, fac), "%s*(%s)" % (q, fac))
    elif form == "rev":
        prob = eq("%s*(%s)" % (p, fac), "(%s)*%s" % (fac, q))
    elif form == "const":
        s = nz(rng, -9, 9)
        prob = eq("%s*(%s)%s" % (p, fac, "+%d" % s if s > 0 else str(s)), "%s*(%s)%s" % (q, fac, "+%d" % s if s > 0 else str(s)))
        pre = [eq("%s*(%s)" % (p, fac), "%s*(%s)" % (q, fac))]
    else:
        m, n_ = rng.sample([2, 3, 4, 5, 6], 2)
        prob = eq("(%s)/%d" % (fac, m), "(%s)/%d" % (fac, n_))
        pre = []
        p, q = Rational(1, m), Rational(1, n_)
    if form == "frac":
        bad = eq("1/%d" % m, "1/%d" % n_)
    elif form == "rev":
        bad = eq(str(p), str(q))
    else:
        bad = eq(str(p), str(q))
    lines = pre + [bad]
    if rng.random() < 0.7:
        lines.append("no solution")
    k = len(pre) + 1
    return prob, lines, k, "divided both sides by (x%+d), which is 0 at the solution x=%d" % (-r, r)


# ----------------------------------------------------------------- rational / fraction templates: (problem, correct lines)
def sp(m):
    return ('+%d' % m) if m > 0 else str(m)

def fx(r):          # "(x-r)" bracket text
    return "(" + inner(-r) + ")"

def lastsolve(coef, rhs):
    """lines for coef*x = rhs  (coef may be 1)"""
    return ["x=" + rs(Rational(rhs) / coef)]

def T_R1(rng):
    r, n, m = nz(rng, -5, 5), nz(rng, -9, 9), nz(rng, -6, 6)
    prob = eq("%s/%s" % (n, fx(r)), str(m))
    L = [eq(str(n), "%s*%s" % (m, fx(r))), eq(str(n), E([(m, 1), (-m * r, 0)])), eq(E([(m, 1)]), E([(n, 0), (m * r, 0)]))]
    if m != 1:
        L.append("x=" + rs(Rational(n + m * r, m)))
    return prob, L, dict(r=r, n=n, m=m)

def T_R1b(rng):
    r, n, m, p = nz(rng, -5, 5), nz(rng, -9, 9), nz(rng, -6, 6), rng.choice([2, 3, 4, 5, 7])
    prob = eq("%s/%s" % (n, fx(r)), "%s/%d" % (m, p))
    L = [eq("%s*%d" % (n, p), "%s*%s" % (m, fx(r))), eq(str(n * p), E([(m, 1), (-m * r, 0)])),
         eq(E([(m, 1)]), E([(n * p, 0), (m * r, 0)])), "x=" + rs(Rational(n * p + m * r, m))]
    return prob, L, dict(r=r, n=n, m=m, p=p)

def T_R2(rng):
    r, s = rng.sample([v for v in range(-5, 6) if v != 0], 2)
    a, b = rng.sample([v for v in range(-7, 8) if v != 0], 2)
    prob = eq("%s/%s" % (a, fx(r)), "%s/%s" % (b, fx(s)))
    L = [eq("%s*%s" % (a, fx(s)), "%s*%s" % (b, fx(r))),
         eq(E([(a, 1), (-a * s, 0)]), E([(b, 1), (-b * r, 0)])),
         eq(E([(a, 1), (-b, 1)]), E([(a * s, 0), (-b * r, 0)])),
         eq(E([(a - b, 1)]), E([(a * s - b * r, 0)]))]
    if a - b != 1:
        L.append("x=" + rs(Rational(a * s - b * r, a - b)))
    return prob, L, dict(r=r, s=s, a=a, b=b)

def T_R3(rng, n=None, n_eq_r=False):
    r, m = nz(rng, -5, 5), nz(rng, -6, 6, avoid=(1,))
    n = r if n_eq_r else (nz(rng, -9, 9) if n is None else n)
    prob = eq("x/%s" % fx(r), "%s/%s%s" % (n, fx(r), sp(m)))
    L = [eq("x", "%s%s*%s" % (n, sp(m), fx(r))), eq("x", E([(n, 0), (m, 1), (-m * r, 0)])),
         eq(E([(1, 1), (-m, 1)]), E([(n, 0), (-m * r, 0)])), eq(E([(1 - m, 1)]), E([(n - m * r, 0)]))]
    if 1 - m != 1:
        L.append("x=" + rs(Rational(n - m * r, 1 - m)))
    return prob, L, dict(r=r, n=n, m=m)

def T_R4(rng, m=None):
    r = nz(rng, -6, 6)
    m = nz(rng, -9, 9) if m is None else m
    prob = eq("(%s)/%s" % (E([(1, 2), (-r * r, 0)]), fx(r)), str(m))
    L = [eq(E([(1, 1), (r, 0)]), str(m)), "x=" + rs(m - r)]
    return prob, L, dict(r=r, m=m)

def T_R5(rng, k=None):
    r = rng.randint(1, 5)
    k = nz(rng, -9, 9) if k is None else k
    prob = eq("1/%s+1/%s" % (fx(r), fx(-r)), "%s/(%s)" % (k, E([(1, 2), (-r * r, 0)])))
    L = [eq("%s+%s" % (fx(-r), fx(r)), str(k)), eq("2*x", str(k)), "x=" + rs(Rational(k, 2))]
    return prob, L, dict(r=r, k=k)

def T_R6(rng, d=None, target=None):
    r, s = rng.sample([v for v in range(-5, 6) if v != 0], 2)
    a, b = nz(rng, -6, 6), nz(rng, -6, 6)
    c = nz(rng, -6, 6, avoid=(a + b,))
    d = nz(rng, -9, 9) if d is None else d
    if target is not None:
        root = r if target == "r" else s
        d = (a + b - c) * root - a * s - b * r
    prob = eq("%s/%s%s/%s" % (a, fx(r), sp(b), fx(s)), "(%s)/(%s*%s)" % (E([(c, 1), (d, 0)]), fx(r), fx(s)))
    L = [eq("%s*%s%s*%s" % (a, fx(s), sp(b), fx(r)), E([(c, 1), (d, 0)])),
         eq(E([(a, 1), (-a * s, 0), (b, 1), (-b * r, 0)]), E([(c, 1), (d, 0)])),
         eq(E([(a + b - c, 1)]), E([(d, 0), (a * s, 0), (b * r, 0)])),
         "x=" + rs(Rational(d + a * s + b * r, a + b - c))]
    return prob, L, dict(r=r, s=s, a=a, b=b, c=c, d=d)

def T_R7(rng):
    p, q = rng.sample([v for v in range(-6, 7) if v != 0], 2)
    m = nz(rng, -5, 5, avoid=(1,))
    prob = eq("(%s)/(%s)" % (inner(p), inner(q)), str(m))
    L = [eq(inner(p), "%s*(%s)" % (m, inner(q))), eq(inner(p), E([(m, 1), (m * q, 0)])),
         eq(E([(1, 1), (-m, 1)]), E([(m * q, 0), (-p, 0)])), eq(E([(1 - m, 1)]), E([(m * q - p, 0)]))]
    if 1 - m != 1:
        L.append("x=" + rs(Rational(m * q - p, 1 - m)))
    return prob, L, dict(p=p, q=q, m=m)

def T_R8(rng):
    while True:
        p, q, u, v = [nz(rng, -6, 6) for _ in range(4)]
        if len({q, v}) == 2 and p != q and u != v and p + v - u - q != 0:
            break
    prob = eq("(%s)/(%s)" % (inner(p), inner(q)), "(%s)/(%s)" % (inner(u), inner(v)))
    L = [eq("(%s)*(%s)" % (inner(p), inner(v)), "(%s)*(%s)" % (inner(u), inner(q))),
         eq(E([(1, 2), (p + v, 1), (p * v, 0)]), E([(1, 2), (u + q, 1), (u * q, 0)])),
         eq(E([(p + v, 1), (p * v, 0)]), E([(u + q, 1), (u * q, 0)])),
         eq(E([(p + v - u - q, 1)]), E([(u * q - p * v, 0)])),
         "x=" + rs(Rational(u * q - p * v, p + v - u - q))]
    return prob, L, dict(p=p, q=q, u=u, v=v)

def term_frac(q, m):
    return ("(%s)/%d" % (inner(q), m)) if q != 0 else "x/%d" % m

def T_F2(rng):
    m1, m2 = rng.sample([2, 3, 4, 5, 6], 2)
    q1, q2 = rng.choice([0, nz(rng, -5, 5)]), rng.choice([0, nz(rng, -5, 5)])
    d = nz(rng, -9, 9)
    Lc = int(lcm(m1, m2))
    k1, k2 = Lc // m1, Lc // m2
    prob = eq("%s+%s" % (term_frac(q1, m1), term_frac(q2, m2)), str(d))
    def mul(k, q):
        if k == 1:
            return inner(q) if q else "x"
        return "%s*(%s)" % (k, inner(q)) if q else E([(k, 1)])
    t1, t2 = mul(k1, q1), mul(k2, q2)
    clear = eq("%s+%s" % (t1, t2), str(Lc * d))
    A = k1 + k2
    B = k1 * q1 + k2 * q2
    L = [clear, eq(E([(A, 1), (B, 0)]), str(Lc * d))]
    if B != 0:
        L.append(eq(E([(A, 1)]), E([(Lc * d, 0), (-B, 0)])))
    if A != 1:
        L.append("x=" + rs(Rational(Lc * d - B, A)))
    return prob, L, dict(m1=m1, m2=m2, q1=q1, q2=q2, d=d, Lc=Lc, k1=k1, k2=k2, t1=t1, t2=t2, A=A, B=B)

def T_F3(rng):
    m, n = rng.sample([2, 3, 4, 5, 6, 7], 2)
    q, u = nz(rng, -5, 5), nz(rng, -5, 5)
    prob = eq("(%s)/%d" % (inner(q), m), "(%s)/%d" % (inner(u), n))
    L = [eq("%d*(%s)" % (n, inner(q)), "%d*(%s)" % (m, inner(u))),
         eq(E([(n, 1), (n * q, 0)]), E([(m, 1), (m * u, 0)])),
         eq(E([(n - m, 1)]), E([(m * u - n * q, 0)]))]
    if n - m != 1:
        L.append("x=" + rs(Rational(m * u - n * q, n - m)))
    return prob, L, dict(m=m, n=n, q=q, u=u)

def T_F4(rng):
    m = rng.choice([2, 3, 4, 5, 6])
    b, d = nz(rng, -9, 9), nz(rng, -9, 9)
    prob = eq(E([(Rational(1, m), 1), (b, 0)]), str(d))
    L = [eq("x/%d" % m, E([(d, 0), (-b, 0)])), "x=" + rs(m * (d - b))]
    return prob, L, dict(m=m, b=b, d=d)

def T_F5(rng):
    """(x+q)/m + k = d"""
    m = rng.choice([2, 3, 4, 5])
    q, k, d = nz(rng, -5, 5), nz(rng, -6, 6), nz(rng, -8, 8)
    prob = eq("(%s)/%d%s" % (inner(q), m, ("+%d" % k) if k > 0 else str(k)), str(d))
    L = [eq("%s+%d" % (inner(q), m * k) if m * k > 0 else "%s%d" % (inner(q), m * k), str(m * d)),
         eq(E([(1, 1), (q + m * k, 0)]), str(m * d)), "x=" + rs(m * d - q - m * k)]
    return prob, L, dict(m=m, q=q, k=k, d=d)

# ----------------------------------------------------------------- class generators for rational / fraction problems
def bad_pack(rng, prob, L, bad, idx, why, pre=0):
    """lines = L[:idx] + bad + tail ; idx = number of correct lines before the bad one"""
    lines, k = finish_B(rng, L[:idx], bad, L[idx + 1:])
    return prob, lines, k, why

def g_addden(rng):
    c = rng.choice(["F2", "R5", "R6"])
    if c == "F2":
        prob, L, i = T_F2(rng)
        bad = eq("(%s)/%d" % (E([(2, 1), (i["q1"] + i["q2"], 0)]), i["m1"] + i["m2"]), str(i["d"]))
        return bad_pack(rng, prob, L, bad, 0, "(a)/b+(c)/d written as (a+c)/(b+d)")
    if c == "R5":
        prob, L, i = T_R5(rng)
        bad = eq("2/(2*x)", "%s/(%s)" % (i["k"], E([(1, 2), (-i["r"] ** 2, 0)])))
        return bad_pack(rng, prob, L, bad, 0, "1/(x-r)+1/(x+r) written as 2/(2x)")
    prob, L, i = T_R6(rng)
    bad = eq("%s/(%s)" % (i["a"] + i["b"], E([(2, 1), (-i["r"] - i["s"], 0)])),
             "(%s)/(%s*%s)" % (E([(i["c"], 1), (i["d"], 0)]), fx(i["r"]), fx(i["s"])))
    return bad_pack(rng, prob, L, bad, 0, "added numerators and denominators of the two fractions")

def g_cross(rng):
    c = rng.choice(["R2", "R2", "R8", "R1b", "F3"])
    if c == "R2":
        prob, L, i = T_R2(rng)
        bad = eq("%s*%s" % (i["a"], fx(i["r"])), "%s*%s" % (i["b"], fx(i["s"]))) if rng.random() < 0.7 else \
            eq("%s*%s" % (i["a"], i["b"]), "%s*%s" % (fx(i["r"]), fx(i["s"])))
    elif c == "R8":
        prob, L, i = T_R8(rng)
        bad = eq("(%s)*(%s)" % (inner(i["p"]), inner(i["q"])), "(%s)*(%s)" % (inner(i["u"]), inner(i["v"])))
    elif c == "R1b":
        prob, L, i = T_R1b(rng)
        bad = eq("%s*%s" % (i["n"], fx(i["r"])), "%s*%d" % (i["m"], i["p"]))
    else:
        prob, L, i = T_F3(rng)
        bad = eq("(%s)*%d" % (inner(i["q"]), i["m"]), "(%s)*%d" % (inner(i["u"]), i["n"]))
    return bad_pack(rng, prob, L, bad, 0, "cross-multiplied to numerator*denominator = numerator*denominator")

def pbk(v):
    return str(v) if v > 0 else "(%d)" % v

def g_cancel(rng):
    if rng.random() < 0.55:
        prob, L, i = T_R7(rng)
        bad = eq("%s/%s" % (i["p"], pbk(i["q"])), str(i["m"]))
        L2 = [eq(str(i["p"]), "%s*%s" % (i["m"], pbk(i["q"])))]
    else:
        prob, L, i = T_R8(rng)
        bad = eq("%s/%s" % (i["p"], pbk(i["q"])), "%s/%s" % (i["u"], pbk(i["v"])))
        L2 = [eq("%s*%s" % (i["p"], pbk(i["v"])), "%s*%s" % (i["u"], pbk(i["q"])))]
    lines, k = finish_B(rng, [], bad, [])
    if len(lines) == 1 and rng.random() < 0.7:
        lines += L2 + ["no solution"] if rng.random() < 0.6 else L2
    return prob, lines, k, "cancelled the additive x from (x+p)/(x+q)"

def g_dropden(rng):
    c = rng.choice(["R3", "R7", "R2"])
    if c == "R3":
        prob, L, i = T_R3(rng)
        bad = eq("x", "%s/%s%s" % (i["n"], fx(i["r"]), sp(i["m"])))
    elif c == "R7":
        prob, L, i = T_R7(rng)
        bad = eq(inner(i["p"]), str(i["m"]))
    else:
        prob, L, i = T_R2(rng)
        bad = eq(str(i["a"]), "%s/%s" % (i["b"], fx(i["s"])))
    return bad_pack(rng, prob, L, bad, 0, "deleted a denominator containing x from one side only")

def g_partclear(rng):
    c = rng.choice(["R3", "F2", "F5"])
    if c == "R3":
        prob, L, i = T_R3(rng)
        bad = eq("x", "%s%s" % (i["n"], sp(i["m"])))
    elif c == "F2":
        prob, L, i = T_F2(rng)
        bad = eq("%s+%s" % (i["t1"], i["t2"]), str(i["d"]))
    else:
        prob, L, i = T_F5(rng)
        bad = eq("%s+%s" % (inner(i["q"]), i["k"]) if i["k"] > 0 else "%s%s" % (inner(i["q"]), i["k"]), str(i["d"]))
    return bad_pack(rng, prob, L, bad, 0, "multiplied only the fractional terms by the common denominator")

def _frac_two(rng, which):
    prob, L, i = T_F4(rng)
    if which == "unb":
        bad = "x=" + rs(i["d"] - i["b"])
        why = "multiplied the left side by %d only" % i["m"]
    else:
        bad = "x=" + rs(Rational(i["d"] - i["b"], i["m"]))
        why = "undid division by %d by dividing again" % i["m"]
    return prob, L[:1] + [bad], 2, why

def g_unb2(rng):
    return _frac_two(rng, "unb")

def g_inv2(rng):
    return _frac_two(rng, "inv")

B_CLASSES = {
    "sign-error-moving-term": [g_sign],
    "one-sided-term-removal": [g_onesided],
    "partial-division": [g_partdiv],
    "partial-distribution": [g_partdist],
    "distribute-sign-error": [g_distsign],
    "add-denominators": [g_addden],
    "cross-multiply-straight": [g_cross],
    "cancel-additive-term": [g_cancel],
    "inverse-operation": [g_inverse, g_inv2],
    "partial-clearing": [g_partclear],
    "drop-denominator": [g_dropden],
    "unbalanced-multiplication": [g_unbal, g_unb2],
    "divided-by-unknown-factor": [g_unknownfactor],
    "arithmetic-slip": [g_slip],
}

COUNTS = {}

def nid(fam):
    COUNTS[fam] = COUNTS.get(fam, 0)
    return COUNTS[fam] + 1

def ok(fam):
    COUNTS[fam] = COUNTS.get(fam, 0) + 1

def run_B(per_class):
    for cls, gens in B_CLASSES.items():
        got, att = 0, 0
        while got < per_class and att < per_class * 60:
            att += 1
            rng = rngfor("B-" + cls, att)
            res = rng.choice(gens)(rng)
            if res is None:
                continue
            prob, lines, k, why = res
            prob, lines, k = maybe_pad(rng, prob, lines, k, 0.4)
            if k > 5:
                continue
            if emit("B", nid("B"), prob, lines, {"status": "invalid", "first_invalid": k, "invalid_at": "step"}, rng,
                    notes=cls + ": " + why, cls=cls):
                ok("B")
                got += 1

# ----------------------------------------------------------------- family A: valid alternative routes
def dec(q):
    q = Rational(q)
    v = q * 10
    sign = "-" if v < 0 else ""
    v = abs(int(v))
    return "%s%d.%d" % (sign, v // 10, v % 10)

def route_linear(rng):
    kind = rng.choice(["std", "std", "merged", "xright", "dbl", "swap", "none", "ident", "dec", "div", "frac"])
    if kind == "dec":
        a, b, c, d = [nz(rng, -19, 19) for _ in range(4)]
        if a == c:
            return None
        fmt = lambda p, q_: dec(Rational(p, 10)) + "*x" + ("+" if q_ > 0 else "-") + dec(Rational(abs(q_), 10))
        prob = eq(fmt(a, b), fmt(c, d))
        core = (a, b, c, d)
        return prob, [core_str(core)] + post(core), "decimal coefficients scaled by 10 first"
    if kind == "div":
        p = nz(rng, -6, 6, avoid=(1,))
        q = nz(rng, -7, 7)
        m = p * nz(rng, -6, 6) if rng.random() < 0.7 else nz(rng, -20, 20)
        prob = eq("%s*(%s)" % (p, inner(q)), str(m))
        if rng.random() < 0.5:
            L = [eq(E([(p, 1), (p * q, 0)]), str(m)), eq(E([(p, 1)]), E([(m, 0), (-p * q, 0)])), "x=" + rs(Rational(m - p * q, p))]
            return prob, L, "expand first"
        L = [eq(inner(q), rs(Rational(m, p))), "x=" + rs(Rational(m, p) - q)]
        return prob, L, "divide first"
    if kind == "frac":
        t = rng.choice([T_F2, T_F3, T_F4, T_F5])
        prob, L, _ = t(rng)
        return prob, L, "fraction cleared by the common denominator"
    if kind == "ident":
        a = nz(rng, -6, 6)
        b = nz(rng, -9, 9)
        d = b if rng.random() < 0.5 else b + nz(rng, -5, 5)
        n = rng.choice([0, 1, 2])
        core = (a, b, a, d)
        prob, pre, _ = dress(core, rng, n) if n else (core_str(core), [], {})
        l1 = eq(E([(a, 1), (-a, 1)]), E([(d, 0), (-b, 0)]))
        L = pre + [l1, eq("0", E([(d - b, 0)])), "all real numbers" if d == b else "no solution"]
        if d == b:
            L = pre + [eq("0", "0"), "all real numbers"]
        return prob, L, "identity / no solution"
    core = make_core(rng)
    n = rng.choice([0, 1, 2, 3, 4])
    prob, pre, info = dress(core, rng, n, neg=(core[0] < 0 and rng.random() < 0.3 and n >= 2))
    a, b, c, d = core
    e, f = a - c, d - b
    P = post(core)
    if kind == "std":
        L = pre + P
    elif kind == "merged":
        L = pre + [eq(E([(e, 1)]), E([(f, 0)]))] + (["x=" + rs(Rational(f, e))] if e != 1 else [])
    elif kind == "xright":
        L = pre + [eq(E([(b, 0), (-d, 0)]), E([(c, 1), (-a, 1)])), eq(E([(b - d, 0)]), E([(c - a, 1)])), "x=" + rs(Rational(b - d, c - a))]
    elif kind == "dbl":
        L = pre + [eq("2*(%s)" % E([(a, 1), (b, 0)]), "2*(%s)" % E([(c, 1), (d, 0)])), core_str(core)] + P
    elif kind == "swap":
        L = pre + [swap(core_str(core))] + [eq(E([(c, 1), (-a, 1)]), E([(b, 0), (-d, 0)])), eq(E([(c - a, 1)]), E([(b - d, 0)])),
                                              "x=" + rs(Rational(b - d, c - a))]
    else:
        L = pre + P
    return prob, L, "linear, route %s" % kind

def route_rational(rng):
    t = rng.choice(["R1", "R1", "R1b", "R2", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R5id", "R4id", "R6c"])
    alt = rng.random() < 0.5
    if t == "R5id":
        r = rng.randint(1, 5)
        prob = eq("1/%s+1/%s" % (fx(r), fx(-r)), "2*x/(%s)" % E([(1, 2), (-r * r, 0)]))
        L = [eq("%s+%s" % (fx(-r), fx(r)), "2*x"), eq("2*x", "2*x"), "all real numbers except %s, %s" % (-r, r)]
        return prob, L, "restricted identity"
    if t == "R4id":
        r = nz(rng, -6, 6)
        prob = eq("(%s)/%s" % (E([(1, 2), (-r * r, 0)]), fx(r)), E([(1, 1), (r, 0)]))
        L = [eq("(x-%d)*(%s)/%s" % (r, inner(r), fx(r)) if r > 0 else "(x+%d)*(%s)/%s" % (-r, inner(r), fx(r)), E([(1, 1), (r, 0)])),
             eq("0", "0"), "all real numbers except %s" % r]
        return prob, L, "restricted identity (cancel a common factor)"
    if t == "R1":
        prob, L, i = T_R1(rng)
        if alt and i["m"] != 0:
            r, n, m = i["r"], i["n"], i["m"]
            pb = lambda v: str(v) if v > 0 else "(%d)" % v
            L = [eq("(%s)/%s" % (inner(-r), pb(n)), "1/%s" % pb(m)),
                 eq(inner(-r), rs(Rational(n, m))), "x=" + rs(r + Rational(n, m))]
    elif t == "R1b":
        prob, L, i = T_R1b(rng)
    elif t == "R2":
        prob, L, i = T_R2(rng)
        if alt:
            r, s, a, b = i["r"], i["s"], i["a"], i["b"]
            L = [eq("%s*%s*%s/%s" % (fx(r), fx(s), a, fx(r)), "%s*%s*%s/%s" % (fx(r), fx(s), b, fx(s)))] + L
    elif t == "R3":
        prob, L, i = T_R3(rng)
        if alt:
            r, n, m = i["r"], i["n"], i["m"]
            L = [eq("(%s)/%s" % (E([(1, 1), (-n, 0)]), fx(r)), str(m)), eq(E([(1, 1), (-n, 0)]), "%s*%s" % (m, fx(r))),
                 eq(E([(1, 1), (-n, 0)]), E([(m, 1), (-m * r, 0)]))] + L[2:]
    elif t == "R4":
        prob, L, i = T_R4(rng)
        r, m = i["r"], i["m"]
        if alt:
            L = [eq(E([(1, 2), (-r * r, 0)]), "%s*%s" % (m, fx(r))), eq("%s*(%s)" % (fx(r), E([(1, 1), (r - m, 0)])), "0"),
                 "x=%s or x=%s" % (rs(r), rs(m - r)), "x=" + rs(m - r)]
        else:
            L = [eq("%s*(%s)/%s" % (fx(r), inner(r), fx(r)), str(m))] + L
    elif t == "R5":
        prob, L, i = T_R5(rng)
        if alt:
            r, k = i["r"], i["k"]
            D = "%s*%s" % (fx(r), fx(-r))
            L = [eq("(%s+%s)/(%s)" % (fx(-r), fx(r), D), "%s/(%s)" % (k, E([(1, 2), (-r * r, 0)]))),
                 eq("2*x/(%s)" % E([(1, 2), (-r * r, 0)]), "%s/(%s)" % (k, E([(1, 2), (-r * r, 0)])))] + L[1:]
    elif t == "R6":
        prob, L, i = T_R6(rng)
        if alt:
            r, s, a, b, c, d = [i[z] for z in "rsabcd"]
            DD = "%s*%s" % (fx(r), fx(s))
            L = [eq("(%s*%s%s*%s)/(%s)" % (a, fx(s), sp(b), fx(r), DD), "(%s)/(%s)" % (E([(c, 1), (d, 0)]), DD))] + L
    elif t == "R6c":
        prob, L, i = T_R6(rng)
    elif t == "R7":
        prob, L, i = T_R7(rng)
    else:
        prob, L, i = T_R8(rng)
    # final answer: if the candidate is excluded, state that there is no solution
    last = L[-1]
    if last.startswith("x=") and " or " not in last:
        pass
    return prob, L, "rational %s%s" % (t, " alt-route" if alt else "")

def build_A(rng):
    r = route_linear(rng) if rng.random() < 0.5 else route_rational(rng)
    if r is None:
        return None
    prob, L, why = r
    return prob, L, why

def run_A(n_total, n_incomplete):
    got = att = 0
    inc = 0
    while got < n_total and att < n_total * 40:
        att += 1
        rng = rngfor("A", att)
        r = build_A(rng)
        if r is None:
            continue
        prob, L, why = r
        trunc = inc < n_incomplete and got % 4 == 3 and len(L) >= 3
        # append 'no solution' when the final candidate is excluded (rational, or degenerate linear)
        if trunc:
            L = L[:rng.randint(1, len(L) - 1)]
            intent = {"status": "valid-incomplete"}
            why += "; stops early"
        else:
            intent = {"status": "valid-complete"}
        if emit("A", nid("A"), prob, L, intent, rng, notes=why):
            ok("A")
            got += 1
            if trunc:
                inc += 1

# ----------------------------------------------------------------- excluded-value builders (shared by A, C)
def excl_case(rng):
    """returns (problem, correct lines up to the raw candidate x=r, r) ; candidate is an excluded value"""
    t = rng.choice(["R4", "R4q", "R3", "R3c", "R6", "R5"])
    if t == "R4":
        r = nz(rng, -6, 6)
        prob, L, i = T_R4(rng, m=2 * r)
        L = ([eq("%s*(%s)/%s" % (fx(r), inner(r), fx(r)), str(2 * r))] if rng.random() < 0.5 else []) + L
        return prob, L, t
    if t == "R4q":
        r = nz(rng, -6, 6)
        prob, L, i = T_R4(rng, m=2 * r)
        L = [eq(E([(1, 2), (-r * r, 0)]), "%d*%s" % (2 * r, fx(r))), eq("%s*%s" % (fx(r), fx(r)), "0"), "x=" + rs(r)]
        return prob, L, t
    if t in ("R3", "R3c"):
        prob, L, i = T_R3(rng, n_eq_r=True)
        if t == "R3c":
            r, m = i["r"], i["m"]
            L = [eq("(%s)/%s" % (E([(1, 1), (-r, 0)]), fx(r)), str(m)), eq(E([(1, 1), (-r, 0)]), "%s*%s" % (m, fx(r))),
                 eq(E([(1, 1), (-r, 0)]), E([(m, 1), (-m * r, 0)]))] + L[2:]
        return prob, L, t
    if t == "R6":
        for _ in range(50):
            prob, L, i = T_R6(rng, target=rng.choice("rs"))
            if abs(i["d"]) < 40:
                return prob, L, t
        return None
    prob, L, i = T_R5(rng, k=None)
    r = i["r"]
    k = 2 * r * rng.choice([1, -1])
    prob, L, i = T_R5(rng, k=k)
    return prob, L, t

def run_A_excl(n):
    got = att = 0
    while got < n and att < n * 40:
        att += 1
        rng = rngfor("Ax", att)
        res = excl_case(rng)
        if res is None:
            continue
        prob, L, t = res
        L = L + (["no solution"] if rng.random() < 1 else [])
        if emit("A", nid("A"), prob, L, {"status": "valid-complete"}, rng, notes="candidate is an excluded value, correctly rejected (no solution)"):
            ok("A")
            got += 1

# ----------------------------------------------------------------- family C
def run_C(n):
    got = att = 0
    while got < n and att < n * 60:
        att += 1
        rng = rngfor("C", att)
        c = rng.choice(["excl", "excl", "excl", "R4c", "ident", "ident2"])
        why = "every step valid; final answer is an excluded value"
        if c == "excl":
            res = excl_case(rng)
            if res is None:
                continue
            prob, L, t = res
        elif c == "R4c":
            r = nz(rng, -6, 6)
            m = nz(rng, -9, 9, avoid=(2 * r,))
            prob, _, _ = T_R4(rng, m=m)
            prob = eq("(%s)/%s" % (E([(1, 2), (-r * r, 0)]), fx(r)), str(m))
            L = [eq(E([(1, 2), (-r * r, 0)]), "%s*%s" % (m, fx(r))), eq("%s*(%s)" % (fx(r), E([(1, 1), (r - m, 0)])), "0"),
                 "x=%s or x=%s" % (rs(r), rs(m - r))]
            why = "both roots of the cleared equation accepted; x=%d is excluded" % r
        elif c == "ident":
            r = rng.randint(1, 5)
            prob = eq("1/%s+1/%s" % (fx(r), fx(-r)), "2*x/(%s)" % E([(1, 2), (-r * r, 0)]))
            L = [eq("%s+%s" % (fx(-r), fx(r)), "2*x"), eq("2*x", "2*x"), "0=0", "all real numbers"]
            why = "identity on the domain; student claims all real numbers (the excluded values are missed)"
        else:
            r = nz(rng, -6, 6)
            if rng.random() < 0.5:
                prob = eq("(%s)/%s" % (E([(1, 2), (-r * r, 0)]), fx(r)), inner(r))
                L = [eq("%s*(%s)/%s" % (fx(r), inner(r), fx(r)), inner(r)), "0=0", "all real numbers"]
            else:
                a = nz(rng, -5, 5)
                prob = eq("%d*x/x" % a, str(a))
                L = [eq(str(a), str(a)), "all real numbers"]
            why = "restricted identity; student claims all real numbers"
        L = [l for l in L]
        if emit("C", nid("C"), prob, L, {"status": "invalid", "first_invalid": None, "invalid_at": "final-claim", "final_verdict": "incorrect"},
                rng, notes=why):
            ok("C")
            got += 1

# ----------------------------------------------------------------- family D
def d_problem(rng):
    t = rng.choice(["lin", "lin", "R1", "R3", "R7", "F4", "F2", "R2", "R6", "R1b"])
    if t == "lin":
        core = make_core(rng)
        return core_str(core)
    return {"R1": T_R1, "R3": T_R3, "R7": T_R7, "F4": T_F4, "F2": T_F2, "R2": T_R2, "R6": T_R6, "R1b": T_R1b}[t](rng)[0]

def run_D(n):
    got = att = 0
    while got < n and att < n * 60:
        att += 1
        rng = rngfor("D", att)
        prob = d_problem(rng)
        try:
            E0, pl = O.problem_domain(prob)
            T = pl.sol(E0)
        except Exception:
            continue
        if T.cof or len(T.pts) > 1:
            continue
        t = rng.choice([v for v in range(-6, 7) if Rational(v) not in E0 and Rational(v) not in T.pts])
        xt = "x" if t == 0 else "(%s)" % inner(-t)
        Ls, Rs = prob.split("=")
        l1 = eq("%s*(%s)" % (xt, Ls), "%s*(%s)" % (xt, Rs))
        l2 = eq("%s*((%s)-(%s))" % (xt, Ls, Rs), "0")
        l3 = "%s=0 or (%s)-(%s)=0" % (xt if t else "x", Ls, Rs)
        if t:
            l3 = "%s=0 or (%s)-(%s)=0" % (inner(-t), Ls, Rs)
        sols = ["x=" + rs(t)] + ["x=" + rs(p) for p in sorted(T.pts)]
        l4 = " or ".join(sols)
        L = [l1, l2, l3, l4]
        d1 = rng.random() < 0.5
        if d1:
            L.append("x=" + rs(sorted(T.pts)[0]) if T.pts else "no solution")
            intent = {"status": "valid-complete", "require_label": (1, "valid-with-obligation")}
            why = "multiplied by (x%+d), x=%d is not excluded; the extra candidate is rejected by the check" % (-t, t)
        else:
            intent = {"status": "invalid", "first_invalid": None, "invalid_at": "final-claim", "final_verdict": "incorrect",
                      "require_label": (1, "valid-with-obligation")}
            why = "multiplied by (x%+d), x=%d is not excluded; the extra candidate x=%d is accepted" % (-t, t, t)
        if rng.random() < 0.3:
            L = L[:1] + L[2:] if False else L
        if emit("D", nid("D"), prob, L, intent, rng, notes=why):
            ok("D")
            got += 1

# ----------------------------------------------------------------- family E: ambiguous notation
def sg(b):
    return ("+%d" % b) if b > 0 else str(b)

def amb_case(rng):
    """-> (problem, lines, kind)  kind in amb / agree"""
    from math import gcd
    t = rng.choice(["E1", "E2", "E3", "E4"])
    if t in ("E1", "E2"):
        while True:
            q = rng.choice([2, 3, 4, 5, 6, 7])
            p = 1 if t == "E1" else rng.choice([2, 3, 4, 5])
            if gcd(p, q) == 1:
                break
        b, d = nz(rng, -9, 9), nz(rng, -9, 9)
        prob = eq(E([(Rational(p, q), 1), (b, 0)]), str(d))
        amb = "%d/%dx" % (p, q)
        plain = "x/%d" % q if p == 1 else "%d*x/%d" % (p, q)
        pick = lambda: amb if rng.random() < 0.7 else plain
        L = [eq(pick() + sg(b), str(d)), eq(pick(), str(d - b)), "x=" + rs(Rational(q * (d - b), p))]
        if amb not in "".join(L):
            L[1] = eq(amb, str(d - b))
        return prob, L, t
    if t == "E3":
        p, q = nz(rng, -9, 9), rng.choice([2, 3, 4, 5])
        d = nz(rng, -6, 6)
        prob = eq("%d/(%d*x)" % (p, q), str(d))
        L = [eq("%d/%dx" % (p, q), str(d)), eq(str(p), E([(q * d, 1)])), "x=" + rs(Rational(p, q * d))]
        return prob, L, t
    q = rng.choice([2, 3, 4, 5])
    c0, d = nz(rng, -6, 6), nz(rng, -6, 6)
    prob = eq("(%s)/%d" % (inner(c0), q), str(d))
    L = [eq("1/%d(%s)" % (q, inner(c0)), str(d)), eq(inner(c0), str(q * d)), "x=" + rs(q * d - c0)]
    return prob, L, t

def run_E(n_amb, n_agree):
    got = att = 0
    while got < n_amb and att < 400:
        att += 1
        rng = rngfor("E", att)
        prob, L, t = amb_case(rng)
        if emit("E", nid("E"), prob, L, {"status": "ambiguous"}, rng, notes="implicit division notation %s: (a/b)*x versus a/(b*x)" % t,
                mode=rng.choice([0, 2, 2, 3]), ambiguous_ok=True):
            ok("E")
            got += 1
    got = att = 0
    while got < n_agree and att < 600:
        att += 1
        rng = rngfor("Eagree", att)
        prob, L, t = amb_case(rng)
        if t in ("E3",):
            continue
        # inject an error in line 1 that does not depend on how 1/2x is read, keep a sensitive later line
        b = None
        if t in ("E1", "E2"):
            m = re.match(r"x/(\d+)\+?(-?\d+)=(-?\d+)", prob.replace("*x", "x")) if False else None
        l0 = prob
        bad = None
        a_, b_ = prob.split("=")
        # wrong line 1: right side shifted (an arithmetic slip on the constant); no juxtaposed division in it
        r = Rational(b_)
        bad = eq(a_, str(r + rng.choice([1, 2, -1, -2, 3])))
        L2 = [bad] + L[1:]
        if emit("E", nid("E"), prob, L2, {"status": "invalid", "first_invalid": 1, "invalid_at": "step"}, rng,
                notes="ambiguous notation present but both readings give the same verdict (error already in line 1)",
                mode=rng.choice([0, 2, 3]), ambiguous_ok=True, cls="arithmetic-slip"):
            ok("E")
            got += 1

# ----------------------------------------------------------------- family F: unsupported lines
def run_F(n):
    got = att = 0
    kinds = ["garble-eq", "garble-op", "garble-q", "sqrt", "irr-quad", "trig", "text", "x-eq-q"]
    while got < n and att < n * 40:
        att += 1
        rng = rngfor("F", att)
        r = route_linear(rng) if rng.random() < 0.6 else route_rational(rng)
        if r is None:
            continue
        prob, L, _ = r
        kind = kinds[got % len(kinds)]
        j = rng.randint(0, len(L) - 1)
        pre, nxt = L[:j], L[j]
        if "=" not in nxt or " or " in nxt:
            continue
        if kind == "garble-eq":
            bad = nxt.replace("=", "==", 1)
        elif kind == "garble-op":
            m = re.search(r"[+-]", nxt)
            if not m:
                continue
            bad = nxt[:m.end()] + "*" + nxt[m.end():]
        elif kind == "garble-q":
            bad = nxt + "?"
        elif kind == "sqrt":
            k_ = rng.choice([2, 3, 5, 7, 9, 16])
            bad = rng.choice(["x=sqrt(%d)" % k_, "x=√%d" % k_, "x^2=%d" % k_ if False else "x=sqrt(%d)" % k_])
        elif kind == "irr-quad":
            k_ = rng.choice([2, 3, 5, 6, 7, 10])
            bad = rng.choice(["x^2=%d" % k_, "x^2-%d=0" % k_, "x^2+%d=0" % k_ if False else "x^2-%d=0" % k_])
        elif kind == "trig":
            bad = rng.choice(["sin(x)=1/2", "x=3*cos(0)", "tan(x)=%d" % rng.randint(1, 5), "x=2*sin(pi/2)"])
        elif kind == "text":
            bad = rng.choice(["see above", "x is about three", "so x equals the same as before", "x = 3 (check)"])
        else:
            bad = rng.choice(["x=?", "?=x", "x= ?"])
        tail = L[j + 1:] if rng.random() < 0.5 else []
        lines = pre + [bad] + tail
        if emit("F", nid("F"), prob, lines, {"status": "unsupported", "no_invalid_labels": True}, rng,
                notes="unsupported line %d (%s)" % (j + 1, kind), mode=rng.choice([0, 1, 2])):
            ok("F")
            got += 1

# ----------------------------------------------------------------- main
FAMILY_TARGETS = {"A": 150, "B": 350, "C": 70, "D": 50, "E": 40, "F": 40}

def build_all():
    run_A(130, 30)
    run_A_excl(20)
    run_B(25)
    run_C(70)
    run_D(50)
    run_E(26, 14)
    run_F(40)

def write_outputs():
    import collections
    order = {f: i for i, f in enumerate("ABCDEF")}
    TASKS.sort(key=lambda t: (order[t["family"]], t["id"]))
    # renumber ids contiguously per family, deterministic
    cnt = {}
    for t in TASKS:
        cnt[t["family"]] = cnt.get(t["family"], 0) + 1
        t["id"] = "%s-%04d" % (t["family"], cnt[t["family"]])
    fam = collections.Counter(t["family"] for t in TASKS)
    cls = collections.Counter(t["expected"]["error_class"] for t in TASKS if t["expected"]["error_class"])
    st = collections.Counter(t["expected"]["status"] for t in TASKS)
    ks = collections.Counter(str(t["expected"]["first_invalid"]) for t in TASKS if t["family"] == "B")
    reasons = collections.Counter(re.sub(r"[-\d]+", "#", d["reason"])[:70] for d in DROPPED)
    meta = {"seed": SEED, "generator_version": GEN_VERSION, "sympy_version": sympy.__version__, "tasks": len(TASKS),
            "counts_per_family": dict(sorted(fam.items())), "counts_per_error_class": dict(sorted(cls.items())),
            "counts_per_status": dict(sorted(st.items())), "first_invalid_distribution_B": dict(sorted(ks.items())),
            "dropped": len(DROPPED), "dropped_reasons": dict(reasons.most_common()),
            "labelling": "student_oracle.py: exact SymPy; step valid iff solution sets on the problem domain are equal",
            "step_labels": ["equivalent", "valid-with-obligation", "valid-discharge", "invalid", "unsupported", "not-assessed"]}
    data = {"meta": meta, "tasks": TASKS}
    txt = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    with open(os.path.join(HERE, "student.json"), "w", encoding="utf-8") as f:
        f.write(txt)
    with open(os.path.join(HERE, "dropped.json"), "w", encoding="utf-8") as f:
        json.dump({"count": len(DROPPED), "reasons": dict(reasons.most_common()), "dropped": DROPPED}, f, ensure_ascii=False, indent=1)
        f.write("\n")
    sha = hashlib.sha256(txt.encode("utf-8")).hexdigest()
    return meta, sha

def write_frozen(meta, sha):
    cl = "\n".join("| %s | %d |" % kv for kv in meta["counts_per_error_class"].items())
    fm = "\n".join("| %s | %d |" % kv for kv in meta["counts_per_family"].items())
    st = "\n".join("| %s | %d |" % kv for kv in meta["counts_per_status"].items())
    txt = f"""# FROZEN: student-working test corpus

This corpus is frozen. Do not edit `student.json`; regenerate only with a new seed/version and a new hash.

- SHA-256 of `student.json`: `{sha}`
- Generator: `generate_student_set.py` v{meta["generator_version"]}, seed `{meta["seed"]}` (per-task RNG = `Random("<seed>-<stream>-<attempt>")`, deterministic; two runs give identical bytes)
- SymPy {meta["sympy_version"]} (exact arithmetic, no floats); labelling engine `student_oracle.py`
- Tasks: {meta["tasks"]}; dropped at generation because SymPy disagreed with the intended label (or duplicate / reading-dependent): {meta["dropped"]} (see `dropped.json`)
- Verify: `PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 check_student_set.py` (exit 1 on any mismatch)

## Counts per family
| family | tasks |
|---|---|
{fm}

## Counts per status
| status | tasks |
|---|---|
{st}

## Counts per error class (family B; the 14 taxonomy ids)
(`arithmetic-slip` also labels the 14 family-E "readings agree" tasks, whose injected error is a constant slip in line 1.)

| class | tasks (all families with error_class set) |
|---|---|
{cl}

## Limitations
- One unknown x only; problems are K05.1 linear equations or K05.2 rational equations (denominators are products of linear factors or numeric; reduced numerator degree <= 1). Quadratic LINES occur only as intermediate steps of such problems and only when all roots are rational.
- Ground truth is semantic (solution sets over R minus excluded values), not a judgement of pedagogy. A step that merely shrinks a solution set is `invalid` unless it discharges an open obligation (`valid-discharge`).
- Lines are read on the problem's own domain; text claims (`no solution`, `all real numbers [except a, b]`) are the only non-equation lines besides `A or B` disjunctions.
- `final_verdict` is also filled for workings that are invalid at a step but whose last line states an answer (correct/incorrect against the true solution set).
- `unsupported` means "an exact evaluator must not certify": sqrt, trig, irreducible quadratics (irrational/complex roots), garbled text. For such tasks `first_invalid` is null; all lines before the unsupported one are valid (checked).
- `ambiguous` tasks (E): the verdict differs between the left-to-right reading `1/2x = (1/2)x` and the tight reading `1/2x = 1/(2x)`; both readings' verdicts are recorded under `expected.readings`. Only implicit multiplication directly after `/` is treated as ambiguous.
- Error positions k are concentrated at 1-3 (see `meta.first_invalid_distribution_B`); k=4,5 are rarer. Families are generated from templates, so surface variety is bounded by the template set (about 30 problem templates, 4 surface styles).
- Decimals appear only in a few family-A linear problems; 3-denominator-factor problems are not represented beyond two distinct linear factors plus their product.
- Not independent of the author's taxonomy: classes were injected by construction and verified by SymPy only to the extent that the injected step is non-equivalent.
"""
    with open(os.path.join(HERE, "FROZEN.md"), "w", encoding="utf-8") as f:
        f.write(txt)

if __name__ == "__main__":
    build_all()
    meta, sha = write_outputs()
    write_frozen(meta, sha)
    print(json.dumps(meta, indent=1))
    print("sha256", sha)
