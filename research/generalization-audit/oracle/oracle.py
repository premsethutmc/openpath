"""Independent mathematical oracle for the generalization benchmark.

Independent of E7: no E7 code, rules or verdicts are used. Mathematics is read with a no-eval parser (safe_parse.py,
which records natural-domain conditions before simplification) and decided with exact SymPy reasoning (exact.py).
Rules: equivalence only from exact symbolic identity / exact set equality; invalidity only from an exactly re-checked
counterexample or exact disagreement with an exactly computed reference; everything else is 'uncertified'.

Two entry points:
  certify_transition(case) -> {"relation": ..., "evidence": ..., "certified": bool}
  certify_working(case)    -> {"verdict": ..., "facts": {...}, "evidence": ..., "certified": bool}
The benchmark author's declared label is compared with the oracle result by build.py; disagreements must be resolved
before the benchmark is frozen.
"""
from __future__ import annotations
import re
from fractions import Fraction
import sympy as sp
from safe_parse import Ctx, Statement, Unreadable, Ambiguous, parse_statement, glyphs
import exact as X
from exact import (statement_set, cond_set, diff_set, is_empty, pick_point, truth_at, zero_test, expression_relation,
                   multi_expression_relation, expr_conds, limited, certain_sign, value_at, R)

REL_MAP = {"equivalent": "equivalence", "implication": "implication", "invalid": "invalid", "unresolved": None}


def _ctx():
    return Ctx(allow_e_const=True)


def _domain(assumptions, ctx, x):
    D = R
    for a in assumptions or []:
        st = parse_statement(a, ctx)
        if not st.free_symbols() <= {x}:
            continue
        S = statement_set(st, x, R)
        if S is None:
            raise Unreadable(f"assumption {a!r} not representable")
        D = sp.Intersection(D, S)
    return D


# ---------------------------------------------------------------- transitions
def certify_transition(prev, nxt, kind, assumptions=()):
    """kind: 'statement' (solution-set semantics) or 'expression' (functions with natural domains).
    Returns relation in {equivalence, implication, invalid, domain-violation} or None (uncertified)."""
    ctx = _ctx()
    try:
        s1 = parse_statement(prev, ctx)
        c1 = list(s1.conds) + [c for e in s1.exprs for c in expr_conds(e)]
        s2 = parse_statement(nxt, ctx)
        c2 = list(s2.conds) + [c for e in s2.exprs for c in expr_conds(e)]
    except Ambiguous as e:
        return {"relation": "ambiguous", "certified": True, "evidence": f"ambiguous notation: {e}"}
    except Unreadable as e:
        return {"relation": None, "certified": False, "evidence": f"oracle cannot read: {e}"}
    s1.conds, s2.conds = c1, c2
    syms = sorted(s1.free_symbols() | s2.free_symbols(), key=str)
    if kind == "expression":
        if s1.kind != "expr" or s2.kind != "expr":
            return {"relation": None, "certified": False, "evidence": "not expressions"}
        if len(syms) <= 1:
            x = syms[0] if syms else sp.Symbol("x", real=True)
            D = _domain(assumptions, ctx, x)
            r = expression_relation(s1.exprs[0], c1, s2.exprs[0], c2, x, D)
        else:
            pos = {}
            for a in assumptions or []:
                m = re.fullmatch(r"\s*([a-z])\s*>\s*0\s*", a)
                if m:
                    s = ctx.sym(m.group(1))
                    pos[s] = sp.Symbol(s.name, positive=True)
            r = multi_expression_relation(s1.exprs[0].xreplace(pos), c1, s2.exprs[0].xreplace(pos), c2, syms)
        rel = {"equivalent": "equivalence", "implication": "domain-violation", "invalid": "invalid"}.get(r.verdict)
    else:
        if len(syms) != 1:
            if X.equation_ratio(s1, s2):
                return {"relation": "equivalence", "certified": True, "evidence": "constant multiple"}
            return {"relation": None, "certified": False, "evidence": "several variables in statements"}
        x = syms[0]
        D = _domain(assumptions, ctx, x)
        r = X.statement_relation(s1, s2, x, D)
        rel = {"equivalent": "equivalence", "implication": "implication", "invalid": "invalid"}.get(r.verdict)
    return {"relation": rel, "certified": rel is not None, "evidence": f"{r.verdict}: {r.reason}; ce={r.counterexample}; restr={r.required_restrictions}; extra={r.extraneous}; lost={r.lost}"}


# ---------------------------------------------------------------- workings
CHECK_WORDS = re.compile(r"check|reject|exclud|extraneous|not valid|discard|outside|substitut|verify|fails|impossible|ok\b", re.I)


def _set(st, x, D):
    return statement_set(st, x, D)


def certify_solve(task, assumptions, olines, raw_text):
    """olines: canonical oracle lines. Each: None (prose), 'claim: <closed statement>', 'restrict: <x != a ...>',
    'scope <cond> | <statement>' (a case line), or a statement about the variable. 'empty' = no solution."""
    ctx = _ctx()
    P = parse_statement(task["statement"], ctx)
    syms = sorted(P.free_symbols(), key=str)
    if len(syms) != 1:
        return certify_system(task, olines)
    x = syms[0]
    D = _domain(assumptions, ctx, x)
    T = _set(P, x, D)
    if T is None:
        return {"verdict": None, "certified": False, "evidence": "task set not computable"}
    facts = {"task_set": str(T), "errors": [], "extraneous_introduced": False, "denominator_cleared": False,
             "restriction_stated": bool(assumptions), "checked": bool(CHECK_WORDS.search(raw_text)), "final": None, "solved_form": False}
    Dp = cond_set([c for c in P.conds if c[0] == "ne0"], x, D)
    prev_ne = Dp
    final = None
    for i, ol in enumerate(olines):
        if ol is None:
            continue
        if ol.startswith("claim:"):
            st = parse_statement(ol[6:], ctx)
            tv = truth_at(st, {}) if not st.free_symbols() else None
            if tv is False:
                facts["errors"].append((i, "false side claim"))
            elif tv is None:
                return {"verdict": None, "certified": False, "evidence": f"claim undecided {ol}"}
            continue
        if ol.startswith("restrict:"):
            st = parse_statement(ol[9:], ctx)
            S = _set(st, x, D)
            facts["restriction_stated"] = True
            if S is None or is_empty(diff_set(Dp if Dp is not None else D, S)) is not True:
                facts["errors"].append((i, "restriction not implied by the task (added assumption)"))
            continue
        scope = None
        if ol.startswith("scope "):
            sc, ol = ol[6:].split("|", 1)
            scope = _set(parse_statement(sc, ctx), x, D)
        if ol.strip() == "empty":
            S, st = sp.S.EmptySet, None
        else:
            st = parse_statement(ol, ctx)
            S = _set(st, x, D)
        if S is None:
            return {"verdict": None, "certified": False, "evidence": f"line set not computable: {ol}"}
        Tl = T if scope is None else sp.Intersection(T, scope)
        Sl = S if scope is None else sp.Intersection(S, scope)
        lost = diff_set(Tl, Sl)
        if is_empty(lost) is False:
            pt = pick_point(lost)
            facts["errors"].append((i, f"loses solution {pt}"))
        if is_empty(diff_set(Sl, Tl)) is False:
            facts["extraneous_introduced"] = True
        if st is not None:
            ne = cond_set([c for c in st.conds if c[0] == "ne0"], x, D)
            if prev_ne is not None and ne is not None and is_empty(diff_set(ne, prev_ne)) is False:
                facts["denominator_cleared"] = True
            prev_ne = ne
        if scope is None:
            final = (st, S)
            if st is not None and _solved(st, x):
                SR = _set(st, x, R)
                outside = diff_set(SR, D) if SR is not None else None
                if outside is not None and is_empty(outside) is False and not CHECK_WORDS.search(raw_text):
                    facts["errors"].append((i, f"stated answer includes values outside the task domain: {outside}"))
    if final is None:
        facts["final"] = None
        verdict = "invalid" if facts["errors"] else "incomplete"
        return {"verdict": verdict, "certified": True, "facts": facts, "evidence": "no concluding statement"}
    st, S = final
    facts["final"] = str(S)
    facts["final_correct"] = is_empty(diff_set(S, T)) is True and is_empty(diff_set(T, S)) is True
    facts["solved_form"] = st is None or _solved(st, x)
    if facts["errors"] or (facts["solved_form"] and not facts["final_correct"]):
        v = "invalid"
    elif not facts["solved_form"]:
        v = "incomplete"
    elif facts["extraneous_introduced"] and not facts["checked"]:
        v = "missing-assumption"
    elif facts["denominator_cleared"] and not facts["restriction_stated"]:
        v = "missing-assumption"
    else:
        v = "verified"
    return {"verdict": v, "certified": True, "facts": facts, "evidence": f"task set {T}; final {S}"}


def _solved(st, x):
    if st.kind in ("or", "and"):
        return all(_solved(p, x) for p in st.parts)
    if st.kind != "rel":
        return False
    e = st.exprs
    if len(e) == 2:
        return (e[0] == x and x not in e[1].free_symbols) or (e[1] == x and x not in e[0].free_symbols)
    return len(e) == 3 and e[1] == x and not (e[0].free_symbols | e[2].free_symbols)


def certify_system(task, olines):
    ctx = _ctx()
    P = parse_statement(task["statement"], ctx)
    eqs = _eqs(P)
    syms = sorted(P.free_symbols(), key=str)
    sol = limited(lambda: sp.solve(eqs, syms, dict=True), 4.0)
    if not sol or any(set(s) != set(syms) or any(v.free_symbols for v in s.values()) for s in sol):
        return {"verdict": None, "certified": False, "evidence": "system not finite/exact"}
    errors, final = [], None
    for i, ol in enumerate(olines):
        if ol is None:
            continue
        txt = ol[6:] if ol.startswith("claim:") else ol
        st = parse_statement(txt, ctx)
        for s in sol:
            tv = truth_at(st, s) if st.free_symbols() else truth_at(st, {})
            if tv is False:
                errors.append((i, f"false at solution {s}"))
            if tv is None:
                return {"verdict": None, "certified": False, "evidence": "truth undecided"}
        if not ol.startswith("claim:"):
            final = st if final is None or _eqs(st) is None else final
            final = st
    if errors:
        return {"verdict": "invalid", "certified": True, "facts": {"errors": errors}, "evidence": str(sol)}
    # every variable must be pinned by the concluding lines (all '=' lines with a single variable on the left)
    pinned = set()
    for ol in olines:
        if ol and not ol.startswith("claim:"):
            st = parse_statement(ol, ctx)
            for p in (st.parts if st.kind == "and" else [st]):
                if p.kind == "rel" and p.ops == ["="] and p.exprs[0].is_Symbol and not p.exprs[1].free_symbols:
                    pinned.add(p.exprs[0])
    return {"verdict": "verified" if pinned >= set(syms) else "incomplete", "certified": True, "facts": {"solution": str(sol)}, "evidence": str(sol)}


def _eqs(st):
    if st.kind == "rel" and all(o == "=" for o in st.ops):
        return [sp.Eq(st.exprs[i], st.exprs[i + 1]) for i in range(len(st.ops))]
    if st.kind == "and":
        out = []
        for p in st.parts:
            e = _eqs(p)
            if e is None:
                return None
            out += e
        return out
    return None


def certify_expression_chain(task, assumptions, olines):
    """task: {'type': 'simplify'|'expand'|'factor'|'evaluate'|'show', 'start': text, 'target': text (show)}.
    olines: None | 'claim: ...' | expressions (each continues the chain from the previous one)."""
    ctx = _ctx()
    st0 = parse_statement(task["start"], ctx)
    start, c0 = st0.exprs[0], list(st0.conds) + expr_conds(st0.exprs[0])
    syms = sorted(start.free_symbols, key=str)
    x = syms[0] if len(syms) == 1 else None
    D = _domain(assumptions, ctx, x) if x is not None else R
    chain = [(start, c0, task["start"])]
    errors, widened, unrep_restriction = [], False, False
    for i, ol in enumerate(olines):
        if ol is None:
            continue
        if ol.startswith("claim:"):
            st = parse_statement(ol[6:], ctx)
            for a, b in zip(st.exprs, st.exprs[1:]):
                r = _erel(a, list(st.conds) + expr_conds(a), b, list(st.conds) + expr_conds(b), syms, x, D)
                if r.verdict == "invalid":
                    errors.append((i, f"false side identity {a} = {b}"))
                elif r.verdict == "unresolved":
                    return {"verdict": None, "certified": False, "evidence": f"side identity undecided {ol}"}
            continue
        if ol.startswith("restrict:"):
            assumptions = list(assumptions) + [ol[9:]]
            if x is not None:
                S = statement_set(parse_statement(ol[9:], ctx), x, R)
                if S is not None:
                    D = sp.Intersection(D, S)  # a stated restriction narrows the domain for the following links
                else:
                    unrep_restriction = True
            continue
        st = parse_statement(ol, ctx)
        e = st.exprs[0]
        chain.append((e, list(st.conds) + expr_conds(e), ol))
    for k, ((e1, c1, _), (e2, c2, t2)) in enumerate(zip(chain, chain[1:])):
        r = _erel(e1, c1, e2, c2, syms, x, D)
        if r.verdict == "invalid":
            errors.append((k, f"{e1} -> {e2} invalid ({r.counterexample})"))
        elif r.verdict == "implication":
            widened = True
        elif r.verdict != "equivalent":
            return {"verdict": None, "certified": False, "evidence": f"link undecided {e1} -> {e2}: {r.reason}"}
    restricted = any("!=" in glyphs(a) or "<" in a or ">" in a for a in assumptions)
    final_e, _, final_t = chain[-1]
    facts = {"errors": errors, "widened": widened, "restriction_stated": restricted, "final": str(final_e), "links": len(chain) - 1}
    if errors:
        return {"verdict": "invalid", "certified": True, "facts": facts, "evidence": str(errors)}
    if task["type"] == "show":
        tgt = parse_statement(task["target"], ctx).exprs[0]
        r = _erel(final_e, [], tgt, [], syms, x, D)
        if r.verdict not in ("equivalent", "implication"):
            return {"verdict": "incomplete", "certified": True, "facts": facts, "evidence": "target not reached"}
        if not _same_shape(final_t, task["target"]):
            return {"verdict": "incomplete", "certified": True, "facts": facts, "evidence": "the target form is never written"}
    form = _form(task["type"], start, final_t)
    facts["form"] = form
    if form is not True:
        return {"verdict": "incomplete", "certified": True, "facts": facts, "evidence": f"form: {form}"}
    # single variable: links were judged on the domain narrowed by every stated restriction, so a remaining widening
    # means the stated restrictions do not cover the excluded values (e.g. x != 0 stated, x != 1 also needed)
    if widened and unrep_restriction:
        return {"verdict": None, "certified": False, "facts": facts, "evidence": "a stated restriction could not be represented; its coverage is undecided"}
    if widened and (x is not None or not restricted):
        return {"verdict": "missing-assumption", "certified": True, "facts": facts, "evidence": "domain widened, restriction unstated or insufficient"}
    return {"verdict": "verified", "certified": True, "facts": facts, "evidence": "exact identity chain"}


def _erel(e1, c1, e2, c2, syms, x, D):
    if x is not None or not syms:
        return expression_relation(e1, c1, e2, c2, x if x is not None else sp.Symbol("x", real=True), D)
    return multi_expression_relation(e1, c1, e2, c2, syms)


def _flat_factors(w):
    if isinstance(w, sp.Mul):
        out = []
        for a in w.args:
            out += _flat_factors(a)
        return out
    return [w]


def _flat_terms(w):
    if isinstance(w, sp.Add):
        out = []
        for t in w.args:
            out += _flat_terms(t)
        return out
    return [w]


def _canon(e):
    if e.is_Atom:
        return str(e)
    args = [_canon(a) for a in e.args]
    if isinstance(e, (sp.Add, sp.Mul)):
        flat = []
        for a, raw in zip(args, e.args):
            flat += [x for x in (a[1] if isinstance(raw, type(e)) else [a])]
        return (type(e).__name__, tuple(sorted(flat, key=str)))
    return (type(e).__name__, tuple(args))


def _same_shape(a_text, b_text):
    """The written final line is the target form (same unevaluated structure up to the order of terms/factors):
    '2 + 6x^2' matches '6x^2+2'; 'x^3+3x^2+3x+1-(x^3-3x^2+3x-1)' does not match '6x^2+2'."""
    try:
        with sp.evaluate(False):
            w = parse_statement(a_text, _ctx()).exprs[-1]
            t = parse_statement(b_text, _ctx()).exprs[-1]
    except (Unreadable, Ambiguous, IndexError):
        return False
    return _canon(w) == _canon(t)


def _has_unexpanded(w):
    for a in sp.preorder_traversal(w):
        if isinstance(a, sp.Pow) and isinstance(a.base, sp.Add) and a.exp.is_Integer and a.exp > 1:
            return True
        if isinstance(a, sp.Mul) and sum(1 for f in _flat_factors(a) if isinstance(f, sp.Add) and f.free_symbols) >= 1 and \
                sum(1 for f in _flat_factors(a) if f.free_symbols) >= 2:
            return True
    return False


def _form(kind, start, final_text):
    try:
        with sp.evaluate(False):
            w = parse_statement(final_text, _ctx()).exprs[-1]
    except (Unreadable, Ambiguous, IndexError):
        return "unreadable final"
    if kind == "expand":
        return "not expanded" if _has_unexpanded(w) else True
    if kind == "factor":
        fs = _flat_factors(w)
        if len([f for f in fs if f.free_symbols]) < 1 or not isinstance(w, (sp.Mul, sp.Pow)):
            return "not a product"
        for f in fs:
            b = f.base if isinstance(f, sp.Pow) else f
            if b.free_symbols and b.is_polynomial() and len(sp.factor_list(sp.expand(b))[1]) > 1:
                return "reducible factor"
        return True
    if kind == "simplify":
        n, d = sp.fraction(w)
        g = limited(lambda: sp.gcd(sp.expand(n), sp.expand(d)), 1.0)
        if g is not None and g.free_symbols:
            return "common factor remains"
        return True
    if kind == "evaluate":
        return True if w.doit().is_Rational or w.doit().is_number else "not a number"
    return True


# ---------------------------------------------------------------- calculus
def _ref(task, ctx):
    v = ctx.sym(task.get("var", "x"))
    f = parse_statement(task["f"], ctx).exprs[0]
    t = task["type"]
    if t == "derivative":
        return v, f, sp.diff(f, v)
    if t == "indefinite-integral":
        return v, f, f
    if t == "definite-integral":
        a, b = (parse_statement(s, ctx).exprs[0] for s in (task["a"], task["b"]))
        val = limited(lambda: sp.integrate(f, (v, a, b)), 6.0)
        return v, f, val
    if t == "limit":
        to = sp.oo if task["to"] in ("oo", "infinity") else (-sp.oo if task["to"] in ("-oo", "-infinity") else parse_statement(task["to"], ctx).exprs[0])
        side = {"left": "-", "right": "+"}.get(task.get("side", "both"), "+-")
        val = limited(lambda: sp.limit(f, v, to, side), 6.0)
        # cross-check: a second method (series / numeric approach) must agree in sign/size, else uncertified
        return v, f, val
    raise Unreadable(t)


def certify_calculus(task, olines):
    """olines: None | 'claim: A = B' (identity in the variable, checked exactly) | 'final: <answer>' (the stated answer;
    for indefinite integrals include '+ C' if the student wrote it)."""
    ctx = _ctx()
    v, f, ref = _ref(task, ctx)
    if ref is None or (isinstance(ref, sp.Basic) and ref.has(sp.Integral, sp.Limit)):
        return {"verdict": None, "certified": False, "evidence": "reference not computable"}
    if task["type"] == "limit" and ref not in (sp.oo, -sp.oo) and not _numeric_limit_agrees(f, v, task, ref):
        return {"verdict": None, "certified": False, "evidence": "limit reference not cross-validated"}
    errors, final, plus_c = [], None, False
    D = cond_set(expr_conds(f), v, R) or R
    for i, ol in enumerate(olines):
        if ol is None:
            continue
        if ol.startswith("claim:"):
            st = parse_statement(ol[6:], ctx)
            for a, b in zip(st.exprs, st.exprs[1:]):
                if a.has(sp.Integral) or b.has(sp.Integral):
                    continue
                r = expression_relation(a, list(st.conds) + expr_conds(a), b, list(st.conds) + expr_conds(b), v, D)
                if r.verdict == "invalid":
                    errors.append((i, f"false identity {a} = {b}"))
                elif r.verdict == "unresolved":
                    return {"verdict": None, "certified": False, "evidence": f"identity undecided {a} = {b}"}
        elif ol.startswith("final:"):
            txt = ol[6:]
            plus_c = bool(re.search(r"\+\s*C\s*$", txt))
            txt = re.sub(r"\+\s*C\s*$", "", txt)
            final = parse_statement(txt, ctx).exprs[0]
    facts = {"errors": errors, "reference": str(ref), "final": str(final), "plus_c": plus_c}
    if final is None:
        return {"verdict": "incomplete" if not errors else "invalid", "certified": True, "facts": facts, "evidence": "no final answer"}
    if task["type"] == "indefinite-integral":
        d = sp.diff(final, v) - f
        ok = zero_test(d, v) or zero_test(sp.simplify(d), v)
        if not ok:
            r = expression_relation(sp.diff(final, v), expr_conds(final), f, expr_conds(f), v, D)
            ok = r.verdict in ("equivalent", "implication")
            if not ok and r.verdict != "invalid":
                return {"verdict": None, "certified": False, "evidence": "antiderivative check undecided", "facts": facts}
        DF = cond_set(expr_conds(final), v, R)
        facts["domain_gap"] = DF is not None and is_empty(diff_set(D, DF)) is False
    elif task["type"] == "derivative":
        r = expression_relation(final, expr_conds(final), ref, expr_conds(f), v, D)
        ok = r.verdict in ("equivalent", "implication")
        if r.verdict == "unresolved":
            return {"verdict": None, "certified": False, "evidence": "derivative comparison undecided", "facts": facts}
    else:
        if ref in (sp.oo, -sp.oo):
            ok = final == ref
        else:
            s = certain_sign(final - ref)
            if s is None:
                return {"verdict": None, "certified": False, "evidence": "value comparison undecided", "facts": facts}
            ok = s == 0
    facts["final_correct"] = ok
    if errors or not ok:
        return {"verdict": "invalid", "certified": True, "facts": facts, "evidence": f"reference {ref}"}
    if task["type"] == "indefinite-integral" and not plus_c:
        return {"verdict": "missing-assumption", "certified": True, "facts": facts, "evidence": "constant of integration omitted"}
    if task["type"] == "indefinite-integral" and facts.get("domain_gap"):
        return {"verdict": "missing-assumption", "certified": True, "facts": facts, "evidence": "antiderivative valid on part of the domain"}
    return {"verdict": "verified", "certified": True, "facts": facts, "evidence": f"reference {ref}"}


def _numeric_limit_agrees(f, v, task, ref):
    """Corroboration only (never proof): evaluate f at points approaching the limit point; require closeness."""
    to = task["to"]
    side = task.get("side", "both")
    try:
        r = complex(sp.N(ref, 20))
    except (TypeError, ValueError):
        return False
    pts = []
    if to in ("oo", "infinity"):
        pts = [sp.Integer(10) ** k for k in (6, 8)]
    elif to in ("-oo", "-infinity"):
        pts = [-sp.Integer(10) ** k for k in (6, 8)]
    else:
        a = parse_statement(to, _ctx()).exprs[0]
        hs = [sp.Rational(1, 10**k) for k in (6, 8)]
        pts = ([a + h for h in hs] if side in ("both", "right") else []) + ([a - h for h in hs] if side in ("both", "left") else [])
    for p in pts:
        val = limited(lambda: sp.N(f.subs(v, p), 30), 2.0)
        if val is None or not val.is_number:
            return False
        try:
            if abs(complex(val) - r) > 1e-3 * max(1, abs(r)):
                return False
        except (TypeError, ValueError):
            return False
    return True
