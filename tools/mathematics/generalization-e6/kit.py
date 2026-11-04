"""Authoring kit for the E6 corpus. Every student line is produced together with the oracle claim it asserts, from the same AST, so a
text/claim mismatch cannot occur by construction (the E5 corpus had one such generator defect). Verdicts are computed by e6_oracle,
never by OpenPath code."""
import re
from fractions import Fraction as F
from decimal import Decimal
from e6_oracle import *
import e6_oracle as EO

CASES = []

def fr(x):
    x = F(x); return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"

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

# ------------------------------------------------------------------------------------------------ calculus line makers
class St:
    """surface settings of one student"""
    def __init__(s, mode="plain", var="x", dstyle="prime", bare=False, ev="bracket", lim="paren", arrow="→", f="f", y="y", dbar="d"):
        s.mode, s.var, s.dstyle, s.bare, s.ev, s.lim, s.arrow, s.f, s.y = mode, var, dstyle, bare, ev, lim, arrow, f, y

def P(st, ast, ctx=0): return pp(ast, st.mode, ctx)
def asAst(m): return X(str(m)) if isinstance(m, (int, F)) else X(m) if isinstance(m, str) else m
def bound(st, b):
    a = asAst(b); t = pp(a, "plain")
    if re.fullmatch(r"[A-Za-z]+", t): return pp(a, st.mode)
    return t if re.fullmatch(r"\d+", t) else "{" + pp(a, st.mode) + "}" if st.mode == "latex" else "(" + t + ")"

def dtext(st, of, v):
    """text of the derivative of `of` (name 'f' / 'y' / expression string or AST) w.r.t. v"""
    L = st.mode == "latex"
    if of in (st.f, st.y) and isinstance(of, str):
        if of == st.f and st.dstyle in ("prime", "latex-prime", "dd"):
            if st.dstyle == "dd": return (r"\frac{d}{d%s}%s(%s)" % (v, of, v)) if L else f"d/d{v}[{of}({v})]"
            return f"{of}'({v})"
        if st.dstyle == "leib" or of == st.y: return (rf"\frac{{d{of}}}{{d{v}}}" if L else f"d{of}/d{v}")
        return f"{of}'({v})"
    ex = P(st, asAst(of))
    if st.dstyle == "prime" and st.mode != "latex": return f"({ex})'"
    if L: return rf"\frac{{d}}{{d{v}}}\left({ex}\right)"
    return f"d/d{v}[{ex}]" if st.dstyle != "leib" else f"d/d{v}({ex})"

def mem(st, m):
    """returns (text, oracle-member)"""
    if isinstance(m, str): a = X(m); return P(st, a), a
    if isinstance(m, tuple) and m[0] == "D":
        of = m[1]; v = m[2] if len(m) > 2 else st.var
        ast = ("x", of) if of in (st.f, st.y) and isinstance(of, str) else asAst(of)
        return dtext(st, of, v), ("D", ast, v)
    if isinstance(m, tuple) and m[0] == "M":
        tmpl, ints = m[1], m[2]; ph = "QRST"
        a = X(tmpl.replace("$1", "Q").replace("$2", "R").replace("$3", "S"))
        txt = P(st, a); texts = {}
        for i, im in enumerate(ints):
            t, o = mem(st, im); texts[ph[i]] = (t, o)
        def sub(node):
            if node[0] == "x" and node[1] in texts: return texts[node[1]][1]
            if node[0] in ("c", "pi"): return node
            return (node[0],) + tuple(sub(z) if isinstance(z, tuple) else z for z in node[1:])
        for ch, (t, o) in texts.items(): txt = txt.replace(ch, t if len(ints) == 1 and False else t)
        return txt, sub(a)
    if isinstance(m, tuple) and m[0] == "I":
        a = asAst(m[1]); v = m[2] if len(m) > 2 else st.var
        body = P(st, a)
        if a[0] in ("+", "-") and not st.bare: body = "(" + body + ")" if st.mode != "latex" else rf"\left({body}\right)"
        sp = r" \, " if st.mode == "latex" else " "
        return (rf"\int {body}{sp}d{v}" if st.mode == "latex" else f"∫ {body} d{v}"), ("I", a, v)
    if isinstance(m, tuple) and m[0] == "DI":
        a = asAst(m[1]); v = m[2]; lo, hi = m[3], m[4]; body = P(st, a); Fa = asAst(m[5]) if len(m) > 5 else None
        if a[0] in ("+", "-"): body = "(" + body + ")" if st.mode != "latex" else rf"\left({body}\right)"
        if st.mode == "latex": return rf"\int_{{{pp(asAst(lo))}}}^{{{pp(asAst(hi))}}} {body} \, d{v}", ("DI", a, v, asAst(lo), asAst(hi), Fa)
        return f"∫_{bound(st, lo)}^{bound(st, hi)} {body} d{v}", ("DI", a, v, asAst(lo), asAst(hi), Fa)
    if isinstance(m, tuple) and m[0] == "EV":
        Fa = asAst(m[1]); v = m[2]; lo, hi = m[3], m[4]; body = P(st, Fa)
        if st.mode == "latex": return rf"\left[{body}\right]_{{{pp(asAst(lo))}}}^{{{pp(asAst(hi))}}}", ("EV", Fa, v, asAst(lo), asAst(hi))
        if st.ev == "bar": return f"({body})|_{bound(st, lo)}^{bound(st, hi)}" if Fa[0] in ("+", "-") else f"{body}|_{bound(st, lo)}^{bound(st, hi)}", ("EV", Fa, v, asAst(lo), asAst(hi))
        return f"[{body}]_{bound(st, lo)}^{bound(st, hi)}", ("EV", Fa, v, asAst(lo), asAst(hi))
    if isinstance(m, tuple) and m[0] == "LIM":
        a = asAst(m[1]); v = m[2]; pt = m[3]; side = m[4] if len(m) > 4 else "both"
        ptxt = "∞" if pt == "inf" else "-∞" if pt == "-inf" else pp(asAst(pt), "plain")
        sd = {"both": "", "right": "+", "left": "-"}[side]
        body = P(st, a)
        if a[0] in ("+", "-", "/"): body = "(" + body + ")"
        if st.mode == "latex":
            pl = {"inf": r"\infty", "-inf": r"-\infty"}.get(pt, ptxt) + ({"right": "^+", "left": "^-", "both": ""}[side])
            return rf"\lim_{{{v} \to {pl}}} {body}", ("LIM", a, v, pt, side)
        arrow = st.arrow
        if st.lim == "paren": head = f"lim_({v}{arrow}{ptxt}{sd})"
        elif st.lim == "brace": head = f"lim_{{{v}{arrow}{ptxt}{sd}}}"
        else: head = f"lim {v}{arrow}{ptxt}{sd}"
        return f"{head} {body}", ("LIM", a, v, pt, side)
    if isinstance(m, tuple) and m[0] == "V":
        t = {"inf": "∞", "-inf": "-∞", "dne": "DNE"}[m[1]]
        if m[1] == "dne": return "does not exist", ("V", "dne")
        return (r"\infty" if st.mode == "latex" and m[1] == "inf" else r"-\infty" if st.mode == "latex" else t), ("V", m[1])
    raise ValueError(m)

def eq(st, *members, C=False, Call=False, final=False, restrict=None, lhop=False, prefix="", needs=None, state=None):
    """one equation line: m1 = m2 = ...   (C: '+ C' appended to the last member)"""
    texts, ms = [], []
    for m in members:
        t, o = mem(st, m); texts.append(t); ms.append(o)
    if Call:
        for i, m in enumerate(members):
            if not (isinstance(m, tuple) and m[0] in ("I", "DI", "EV", "D", "LIM", "V")) and not (isinstance(m, tuple) and m[0] == "M"): texts[i] += " + C"
        C = True
    elif C: texts[-1] += " + C"
    return prefix + " = ".join(texts) + (f"  ({state})" if state else ""), dict(k="eq", m=ms, C=C, final=final, restrict=restrict, lhop=lhop, needs=needs, stated=bool(state))

def defn(st, name, expr, kind="fn", let=False):
    a = X(expr); body = P(st, a)
    if kind == "fn": t = f"{name}({st.var}) = {body}"
    else: t = f"{name} = {body}"
    return ("Let " if let else "") + t, dict(k="def", name=name, ast=a)

def prose(text): return text, dict(k="prose")
def concl(text, value, truth): return text, dict(k="concl", value=value, truth=truth, final=True)
def duline(st, name, rhs):
    r = X(rhs); body = "dx" if r == ("c", F(1)) else P(st, r) + f" d{st.var}"
    return f"d{name} = {body}", dict(k="du", name=name, rhs=r)
def dvline(st, integrand):
    a = X(integrand); return f"dv = {P(st, a)} d{st.var}", dict(k="dv", ast=a)
def vline(st, expr):
    a = X(expr); return f"v = {P(st, a)}", dict(k="v", ast=a)

# ------------------------------------------------------------------------------------------------ judging
def _num(ast):
    return ev(ast, {})
def judge_lines(claims, var="x"):
    defs = {}; out = []
    for cl in claims:
        k = cl["k"]
        if k == "def": defs[cl["name"]] = cl["ast"]; out.append(True); continue
        if k == "prose": out.append(True); continue
        if k == "concl": out.append(cl["value"] == cl["truth"]); continue
        if k == "du":
            out.append(same_function(diff(subst(defs[cl["name"]], defs), var), subst(cl["rhs"], defs), var, 6) is True); continue
        if k == "dv": defs["__dv"] = cl["ast"]; out.append(True); continue
        if k == "v": out.append(same_function(diff(cl["ast"], var), defs["__dv"], var, 6) is True); defs["v"] = cl["ast"]; continue
        ms = cl["m"]; kinds = {m[0] for m in ms}
        try:
            if kinds <= {"V", "LIM", "c", "pi", "+", "-", "*", "/", "^", "neg", "sqrt", "exp", "ln", "sin", "cos", "tan"} and any(m[0] in ("LIM", "V") for m in ms):
                out.append(_judge_limit_line(ms, cl, defs)); continue
            if any(m[0] in ("DI", "EV") for m in ms):
                out.append(_judge_defint_line(ms, defs)); continue
            # function identity (possibly with D / I members)
            has_int = any(contains_I(m) for m in ms)
            ds = []
            for m in ms:
                if m[0] == "D": ds.append(diff(subst(m[1], defs, keep=(m[2],)), m[2]) if m[2] != var else diff(subst(m[1], defs), var))
                else: ds.append(m)
            ok = True
            for a, b in zip(ds, ds[1:]):
                if has_int:
                    da = sum_I(a, defs, var) if contains_I(a) else diff(subst(a, defs), var)
                    db = sum_I(b, defs, var) if contains_I(b) else diff(subst(b, defs), var)
                    r = same_function(da, db, var, 6)
                else:
                    r = same_function(subst(a, defs), subst(b, defs), var, 6)
                    if r is None:  # constants / too few common points: exact compare of closed forms
                        try: r = abs(ev(subst(a, defs), {}) - ev(subst(b, defs), {})) < TOL
                        except Exception: r = None
                if r is not True: ok = False
            out.append(ok)
        except (Undef, ValueError, ZeroDivisionError, KeyError) as e:
            out.append(False)
    return out

def _val(m, defs):
    if m[0] == "V": return m[1]
    if m[0] == "LIM":
        a = subst(m[1], defs); pt = m[3]
        if pt == "inf": return EO.lim_at_infinity(a, 1, m[2])
        if pt == "-inf": return EO.lim_at_infinity(a, -1, m[2])
        return EO.lim_numeric(a, asFr(pt), m[4], m[2])
    return ev(subst(m, defs), {})
def asFr(pt):
    a = asAst(pt) if not isinstance(pt, tuple) else pt
    return a[1] if a[0] == "c" else F(ev(a, {}))
def _judge_limit_line(ms, cl, defs):
    vals = [_val(m, defs) for m in ms]
    if cl.get("lhop"):
        l = ms[0]; assert l[0] == "LIM" and l[1][0] == "/"
        n, d = l[1][1], l[1][2]
        pt = l[3]
        ln = _val(("LIM", n, l[2], pt, l[4]), defs); ld = _val(("LIM", d, l[2], pt, l[4]), defs)
        zz = isinstance(ln, Decimal) and isinstance(ld, Decimal) and abs(ln) < Decimal(10) ** -12 and abs(ld) < Decimal(10) ** -12
        ii = ln in ("inf", "-inf") and ld in ("inf", "-inf")
        if not (zz or ii): return False
    base = vals[0]
    for v in vals[1:]:
        if isinstance(base, str) or isinstance(v, str):
            if base != v: return False
        elif abs(base - v) > Decimal(10) ** -14 * max(1, abs(base)): return False
    return True
def _judge_defint_line(ms, defs):
    # truth = F(hi) - F(lo) from the first EV member's own F when it is a valid antiderivative of the DI integrand
    di = next((m for m in ms if m[0] == "DI" and (len(m) <= 5 or m[5] is None)), None)
    truth = None
    if di:
        evm = next((m for m in ms if m[0] == "EV" and m[2] == di[2]), None)
        if evm:
            if same_function(diff(evm[1], evm[2]), di[1], di[2], 6) is True:
                truth = ev(evm[1], {evm[2]: ev(evm[4], {})}) - ev(evm[1], {evm[2]: ev(evm[3], {})})
            else: return False
    vals = []
    for m in ms:
        if m[0] == "DI":
            if len(m) > 5 and m[5] is not None:
                if same_function(diff(m[5], m[2]), m[1], m[2], 6) is not True: return False
                vals.append(ev(m[5], {m[2]: ev(m[4], {})}) - ev(m[5], {m[2]: ev(m[3], {})}))
            else: vals.append(None)
        elif m[0] == "EV":
            v = m[2]; vals.append(ev(m[1], {v: ev(m[4], {})}) - ev(m[1], {v: ev(m[3], {})}))
        else: vals.append(ev(subst(m, defs), {}))
    cs = [v for v in vals if v is not None]
    if truth is not None: cs.append(truth)
    return all(abs(cs[0] - v) < TOL * max(1, abs(cs[0])) for v in cs[1:])

def verdict(claims, goal, var="x", restate=None):
    """returns (classification, firstInvalidStep, note). goal: ('deriv', truth_ast) | ('anti', integrand_ast) | ('num', Decimal) | ('lim', value) """
    flags = judge_lines(claims, var)
    # a restatement of the problem function must match the problem (first line only; names f,g,h,r,y)
    if restate is not None and claims and claims[0]["k"] == "def" and claims[0]["name"] in ("f", "g", "h", "r", "y") and flags[0]:
        if same_function(claims[0]["ast"], restate, var, 6) is not True: flags[0] = False
    if not all(flags):
        i = flags.index(False); return "invalid", i, "claim false"
    nm = [i for i, c in enumerate(claims) if c.get("needs") and not c.get("stated")]
    if nm: return "missing-assumption", None, f"restriction {claims[nm[0]]['needs']} not stated (line {nm[0]})"
    # completeness
    fin = [i for i, c in enumerate(claims) if c.get("final")]
    if not fin: return "incomplete", None, "no final answer line"
    if goal[0] == "cont":
        support = [c for c in claims if c["k"] not in ("prose", "concl")]
        return ("verified", None, "") if support and claims[fin[-1]]["k"] == "concl" else ("incomplete", None, "conclusion without demonstrated work")
    c = claims[fin[-1]]; last = c["m"][-1]
    kind = goal[0]
    if kind == "deriv":
        if last[0] in ("D", "I", "DI", "EV", "LIM"): return "incomplete", None, "unevaluated operator in final"
        if same_function(last, goal[1], var, 6) is not True: return "incomplete", None, "final member is not the goal"
        return "verified", None, ""
    if kind == "anti":
        if contains_I(last): return "incomplete", None, "integral remains"
        if same_function(diff(last, var), goal[1], var, 6) is not True: return "incomplete", None, "final antiderivative is not the goal"
        if not c["C"]: return "missing-assumption", None, "no +C"
        if c.get("restrict"): return "missing-assumption", None, "domain restriction unstated"
        return "verified", None, ""
    if kind == "num":
        if last[0] in ("DI", "EV", "LIM", "D", "I"): return "incomplete", None, "unevaluated"
        v = ev(last, {})
        if abs(v - goal[1]) > TOL * max(1, abs(goal[1])): return "incomplete", None, "final value not the goal"
        if goal[2] and not _closed(last): return "incomplete", None, "not a simplified numeral"
        return "verified", None, ""
    if kind == "lim":
        if last[0] == "V": return ("verified", None, "") if last[1] == goal[1] else ("incomplete", None, "")
        if last[0] == "LIM": return "incomplete", None, "limit unevaluated"
        v = ev(last, {}); return ("verified", None, "") if isinstance(goal[1], Decimal) and abs(v - goal[1]) < Decimal(10) ** -14 else ("incomplete", None, "")
    raise ValueError(kind)
def _closed(a):
    """a numeral in simple closed form (no operators other than the form a/b, -a, k*pi style, ln/exp of numbers)"""
    return a[0] in ("c", "pi", "exp", "ln", "sqrt") or (a[0] == "neg" and _closed(a[1])) or (a[0] in ("*", "/", "+", "-") and _closed(a[1]) and _closed(a[2]) and a[0] in ("*", "/") and a[1][0] != "c" or False) or (a[0] == "/" and a[1][0] == "c" and a[2][0] == "c") or (a[0] in ("+", "-") and a[1][0] in ("c", "exp", "ln") and a[2][0] in ("c", "exp", "ln", "*") ) or (a[0] == "*" and a[1][0] == "c" and a[2][0] in ("pi", "exp", "ln", "sqrt"))

# ------------------------------------------------------------------------------------------------ case registry
def add(cat, fam, problem, lines, expect, *, goal=None, var="x", restate=None, tags=(), alt=False, scope="in-scope", ref_override=None, first_ok=None, fmt="natural", note=""):
    """lines: list of (text, claim). expect: expected classification (the author's intent) - asserted against the oracle verdict."""
    texts = [t for t, _ in lines]; claims = [c for _, c in lines]
    if ref_override is not None: cls, fi, why = ref_override[0], ref_override[1], "hand-adjudicated: " + ref_override[2]
    else: cls, fi, why = verdict(claims, goal, var, restate)
    assert cls == expect, f"[{cat}/{fam}] oracle says {cls} ({why}); author expected {expect}\n" + "\n".join(texts)
    CASES.append(dict(category=cat, family=fam, problem=problem, studentWorking=dict(format=fmt, text="\n".join(texts)),
                      reference=dict(classification=cls, firstInvalidStep=fi, firstInvalidAcceptable=([fi] if fi is not None else []) if first_ok is None else first_ok,
                                     alternativeMethodValid=bool(alt), complete=cls == "verified", rationale=why or note, coverage=scope), tags=list(tags)))

# ------------------------------------------------------------------------------------------------ problems
def dprob(expr, var="x"): return dict(domain="calculus", task="derivative", expression=to_expr(X(expr)), variable=var)
def iprob(expr, var="x"): return dict(domain="calculus", task="indefinite-integral", integrand=to_expr(X(expr)), variable=var)
def diprob(expr, lo, hi, var="x"): return dict(domain="calculus", task="definite-integral", integrand=to_expr(X(expr)), variable=var, lower=str(lo), upper=str(hi))
def cprob(task, left, right, pt, var="x"): return dict(domain="calculus", task=task, left=to_expr(X(left)), right=to_expr(X(right)), variable=var, point=str(pt))
def lprob(expr, pt, side="both", var="x"): return dict(domain="calculus", task="limit", expression=to_expr(X(expr)), variable=var, approach=str(pt), side=side)

# ------------------------------------------------------------------------------------------------ number chains (probability / complex)
def G_(x): return EO.G(F(x))
def names_for(mode, extra=None):
    inter = {"plain": "P(A and B)", "unicode": "P(A∩B)", "latex": r"P(A \cap B)", "implicit": "P(A∩B)"}[mode]
    uni = {"plain": "P(A or B)", "unicode": "P(A∪B)", "latex": r"P(A \cup B)", "implicit": "P(A∪B)"}[mode]
    cond = lambda a, b: f"P({a}|{b})" if mode != "latex" else rf"P({a} \mid {b})"
    d = dict(PA="P(A)", PB="P(B)", PAB=inter, PU=uni, PAgB=cond("A", "B"), PBgA=cond("B", "A"), PAc="P(A')" if mode in ("unicode", "implicit") else "P(not A)" if mode == "plain" else r"P(A^c)")
    d.update(extra or {})
    return d
def nline(st, *members, req=(), final=False, names=None, canon="real", prefix="", suffix=""):
    trees = [NX(m) for m in members]
    nm_ = names if names is not None else names_for(st.mode)
    text = prefix + " = ".join(ppn(t, st.mode, nm_) for t in trees) + suffix
    return text, dict(k="nc", m=trees, req=set(req), final=final, canon=canon)
def assume(text, what): return text, dict(k="assume", what=what)
def ndef(st, name, expr, restate=False, names=None, let=False):
    t = NX(expr); nm_ = names if names is not None else names_for(st.mode)
    return ("Let " if let else "") + f"{name} = {ppn(t, st.mode, nm_)}", dict(k="ndef", name=name, tree=t, restate=restate)
def concl_n(text, value, truth): return text, dict(k="concl", value=value, truth=truth, final=True)
def sorted_line(text, listed, data): return text, dict(k="sorted", listed=listed, data=data)

def judge_numbers(claims, env0, assumed0=()):
    env = dict(env0); assumed = set(assumed0); flags = []; missing = []
    for i, cl in enumerate(claims):
        k = cl["k"]
        if k == "assume": assumed.add(cl["what"]); flags.append(True); continue
        if k == "prose": flags.append(True); continue
        if k == "concl": flags.append(cl["value"] == cl["truth"]); continue
        if k == "sorted": flags.append(cl["listed"] == sorted(cl["data"]) ); continue
        if k == "ndef":
            try:
                v = EO.nev(cl["tree"], env)
                if cl["restate"]: flags.append(env.get(cl["name"]) == v)
                else: env[cl["name"]] = v; flags.append(True)
            except (KeyError, ValueError, ZeroDivisionError): flags.append(False)
            continue
        if k == "nc":
            try: ok = EO.nchain_ok(cl["m"], env)
            except (KeyError, ValueError, ZeroDivisionError): ok = False
            flags.append(ok)
            if ok and (cl["req"] - assumed): missing.append(i)
            continue
        raise ValueError(k)
    return flags, missing

def verdict_numbers(claims, env0, goal, assumed0=(), restrict_ok=True):
    """goal = (value G or bool, canon kind)  -- the typed answer"""
    flags, missing = judge_numbers(claims, env0, assumed0)
    if not all(flags): i = flags.index(False); return "invalid", i, "claim false"
    if missing: return "missing-assumption", None, f"assumption not established (line {missing[0]})"
    fin = [i for i, c in enumerate(claims) if c.get("final")]
    if not fin: return "incomplete", None, "no final line"
    c = claims[fin[-1]]
    if c["k"] == "concl": return ("verified", None, "") if any(x["k"] in ("nc", "ndef") for x in claims) else ("incomplete", None, "bare conclusion")
    last = c["m"][-1]
    try: v = EO.nev(last, env0) if not _has_name(last) else None
    except (KeyError, ValueError, ZeroDivisionError): v = None
    if v is None:
        try: v = EO.nev(last, {**env0})
        except Exception: return "incomplete", None, "final member not evaluable"
    if v != goal[0]: return "incomplete", None, "final member is not the answer"
    canon = {"real": EO.is_canonical_real, "complex": EO.is_canonical_complex, "surd": EO.is_canonical_surd}[goal[1]]
    if not canon(last): return "incomplete", None, "final member is not a canonical numeral"
    return "verified", None, ""
def _has_name(t): return t[0] == "v" or any(_has_name(a) for a in t[1:] if isinstance(a, tuple))

def addn(cat, fam, problem, lines, expect, *, env, goal, assumed=(), tags=(), alt=False, scope="in-scope", ref_override=None, first_ok=None, note=""):
    texts = [t for t, _ in lines]; claims = [c for _, c in lines]
    if ref_override is not None: cls, fi, why = ref_override[0], ref_override[1], "hand-adjudicated: " + ref_override[2]
    else: cls, fi, why = verdict_numbers(claims, env, goal, set(assumed) | set(problem.get("assumptions", [])))
    assert cls == expect, f"[{cat}/{fam}] oracle says {cls} ({why}); author expected {expect}\n" + "\n".join(texts)
    CASES.append(dict(category=cat, family=fam, problem=problem, studentWorking=dict(format="natural", text="\n".join(texts)),
                      reference=dict(classification=cls, firstInvalidStep=fi, firstInvalidAcceptable=([fi] if fi is not None else []) if first_ok is None else first_ok,
                                     alternativeMethodValid=bool(alt), complete=cls == "verified", rationale=why or note, coverage=scope), tags=list(tags)))

def bprob(area, task, data, assumptions=()):
    p = dict(domain="probability-statistics", area=area, task=task, data=data)
    if assumptions: p["assumptions"] = list(assumptions)
    return p
def cxprob(area, task, data, assumptions=(), domain=None):
    p = dict(domain="complex-polynomial", area=area, task=task, data=data)
    if assumptions: p["assumptions"] = list(assumptions)
    if domain: p["coefficientDomain"] = domain
    return p
def cxv(re, im): return dict(re=str(re), im=str(im))
