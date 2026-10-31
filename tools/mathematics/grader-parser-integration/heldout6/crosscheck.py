#!/usr/bin/env python3
"""HELDOUT6 cross-check.

Recomputes, from the statement and working text alone, every line's relation,
firstInvalid, finalAnswerCorrect and the expect class (valid and valid-jump are
merged: step granularity is an author judgement, not a SymPy property) under the
HELDOUT6 conventions, and compares with the stored labels.

Conventions implemented:
  * Domain = stated conditions of the task  AND  every task denominator != 0.
    A line's own denominators remove further points from that line.
  * Each line denotes its real solution set inside the domain (solveset over
    S.Reals, never a bare simplify()).  relation[i] compares line i with line
    i-1 (line -1 = the task): equivalent / implies (prev subset of cur) /
    implied-by (cur subset of prev) / neither.
  * Equations: line i is invalid iff it loses a real solution of line i-1 that
    also solves the task; the final line is invalid iff its claimed values
    (taken without the domain filter) include a non-solution of the task.
  * Inequalities: any change of the solution set is invalid.
  * Substitution: each line (or each '='-segment of a line) is a value; any
    change of value is invalid.
  * Malformed (unbalanced brackets, doubled operators/relations, dangling
    operators, stray words, unparsable) is checked before ambiguous
    (n/m juxtaposed, a/bc, a/b/c, a^b^c, a^n/m).
Usage: python3 crosscheck.py [corpus.json]  (writes report to stdout)
"""
import json, re, sys, os
from sympy import (S, Symbol, Eq, Lt, Le, Gt, Ge, Pow, solveset, Interval,
                   FiniteSet, Union, Intersection, Complement, ConditionSet,
                   preorder_traversal, nsimplify, sqrt)
from sympy.parsing.sympy_parser import (parse_expr, standard_transformations,
                                        implicit_multiplication_application,
                                        convert_xor, rationalize)

TR = standard_transformations + (implicit_multiplication_application, convert_xor, rationalize)
RELNAME = {"=": "=", "<": "<", ">": ">", "<=": "<=", ">=": ">="}


class Malformed(Exception):
    pass


class Undecidable(Exception):
    pass


UMAP = {"−": "-", "–": "-", "×": "*", "·": "*", "÷": "/", "²": "^2", "³": "^3",
        "≤": "<=", "≥": ">=", "≠": "!="}


def norm(s):
    for k, v in UMAP.items():
        s = s.replace(k, v)
    s = re.sub(r"√\s*\(", "sqrt(", s)
    s = re.sub(r"√\s*([A-Za-z0-9.]+)", r"sqrt(\1)", s)
    return s.strip()


def check_brackets(s):
    for o, c in ("()", "[]"):
        d = 0
        for ch in s:
            d += ch == o
            d -= ch == c
            if d < 0:
                raise Malformed("unbalanced " + o + c)
        if d:
            raise Malformed("unbalanced " + o + c)


def malformed_checks(s, letters):
    check_brackets(s)
    if re.search(r"=\s*=|<\s*<|>\s*>", s):
        raise Malformed("doubled relation")
    if re.search(r"[+\-*/^]\s*($|[=<>)\]!])", s):
        raise Malformed("dangling operator")
    if re.search(r"(^|[=(\[<>])\s*[*/^]", s):
        raise Malformed("leading operator")
    if re.search(r"[+\-*/^]\s*[+*/^]", s):
        raise Malformed("doubled operator")
    for w in re.findall(r"[A-Za-z]+", s.replace("sqrt", " ")):
        if any(ch not in letters for ch in w):
            raise Malformed("stray word '%s'" % w)


AMB = [
    (r"/\d+(\.\d+)?[A-Za-z(]", "n/m juxtaposed"),
    (r"/(?!sqrt)[A-Za-z][A-Za-z(]", "a/bc"),
    (r"/[\w.]+/", "a/b/c"),
    (r"\^[\w.]+\^", "a^b^c"),
    (r"\^\d+/", "a^n/m"),
]


def ambiguous_check(s):
    t = s.replace(" ", "")
    for pat, why in AMB:
        if re.search(pat, t):
            return why
    return None


def P(s, syms, evaluate=True):
    s = s.replace("[", "(").replace("]", ")")
    try:
        return parse_expr(s, local_dict=syms, transformations=TR, evaluate=evaluate)
    except Exception as e:
        raise Malformed("parse: %s" % e)


def denominators(e):
    out = []
    for n in preorder_traversal(e):
        if isinstance(n, Pow) and n.exp.is_number and n.exp.is_negative:
            out.append(n.base)
    return out


def own_domain(texts, syms, v):
    D = S.Reals
    for t in texts:
        for d in denominators(P(t, syms, evaluate=False)):
            D = Complement(D, solveset(d, v, S.Reals))
    return D


def chain_set(s, syms, v):
    """'a op b op c' -> solution set over the reals (no domain), is_ineq, sides"""
    parts = re.split(r"(<=|>=|=|<|>)", s)
    sides = [p.strip() for p in parts[0::2]]
    ops = parts[1::2]
    if not ops or any(x == "" for x in sides):
        raise Malformed("empty side / no relation")
    ex = [P(x, syms) for x in sides]
    sol = S.Reals
    for a, op, b in zip(ex, ops, ex[1:]):
        r = {"=": Eq, "<": Lt, ">": Gt, "<=": Le, ">=": Ge}[op](a, b)
        if r is S.true:
            st = S.Reals
        elif r is S.false:
            st = S.EmptySet
        else:
            st = solveset(r if op != "=" else a - b, v, S.Reals)
        if isinstance(st, ConditionSet):
            raise Undecidable("solveset gave ConditionSet for %s" % s)
        sol = Intersection(sol, st)
    return sol, any(o != "=" for o in ops), sides, ex


def seteq(A, B):
    return Complement(A, B) == S.EmptySet and Complement(B, A) == S.EmptySet


def subset(A, B):
    return Complement(A, B) == S.EmptySet


def relation(prev, cur):
    if seteq(prev, cur):
        return "equivalent"
    if subset(prev, cur):
        return "implies"
    if subset(cur, prev):
        return "implied-by"
    return "neither"


PREFIX = re.compile(r"^\s*(?:solve|find)(?:\s+for\s+[a-z])?(?:\s+[a-z](?=\s*:))?\s*:?\s*", re.I)


def parse_statement(st):
    s = st.strip()
    if s.endswith("."):
        s = s[:-1]
    m = re.match(r"^Evaluate\s+(.*)\s+when\s+(.*)$", s)
    m2 = re.match(r"^Given\s+(.*?),\s*find\s+(.*)$", s)
    if m or m2:
        expr, given = (m.group(1), m.group(2)) if m else (m2.group(2), m2.group(1))
        subs = {}
        for g in re.split(r",\s*|\s+and\s+", given):
            a, b = g.split("=")
            subs[norm(a).strip()] = norm(b).strip()
        return {"kind": "sub", "expr": norm(expr), "subs": subs}
    s = PREFIX.sub("", s)
    parts = re.split(r",?\s+for\s+", s, maxsplit=1)
    conds = re.split(r"\s+and\s+|,\s*", parts[1]) if len(parts) > 1 else []
    return {"kind": "solve", "task": norm(parts[0]), "conds": [norm(c) for c in conds]}


ANSWER_NUM = re.compile(r"^-?\d+(\.\d+)?(/\d+)?$")


def line_parts(raw):
    """strip commentary; return list of maths parts and combinator ('or'/'and'), or 'none'"""
    s = raw
    if re.search(r"\bso\b", s):
        s = re.split(r"\bso\b", s)[-1]
    s = PREFIX.sub("", s.strip())
    s = re.sub(r",?\s+for\s+.*$", "", s)
    s = norm(s)
    if re.fullmatch(r"\s*no (real )?solutions?\s*", s, re.I):
        return "none", []
    parts = [p for p in re.split(r"\s+or\s+|\s+and\s+|,\s*", s)]
    comb = "and" if re.search(r"\s+and\s+", s) else "or"
    out = []
    for p in parts:
        if "±" in p:
            out += [p.replace("±", "+", 1), p.replace("±", "-", 1)]
        else:
            out.append(p)
    return comb, out


def solve_item(it):
    st = parse_statement(it["statement"])
    lines = it["lines"]
    if st["kind"] == "sub":
        return sub_item(st, lines)
    task = st["task"]
    letters = set(re.findall(r"[a-z]", task.replace("sqrt", "")))
    assert len(letters) == 1, task
    vname = letters.pop()
    v = Symbol(vname, real=True)
    syms = {vname: v, "sqrt": sqrt}
    # malformed / ambiguous pass
    parsed = []
    for ln in lines:
        comb, parts = line_parts(ln)
        for p in parts:
            malformed_checks(p, {vname})
        parsed.append((comb, parts))
    for comb, parts in parsed:
        for p in parts:
            a = ambiguous_check(p)
            if a:
                return {"expect": "ambiguous", "why": a}
    # task set
    D = S.Reals
    for c in st["conds"]:
        cs, _, _, _ = chain_set(c.replace("!=", "<>"), syms, v) if "!=" not in c else (None, 0, 0, 0)
        if "!=" in c:
            a, b = c.split("!=")
            D = Complement(D, FiniteSet(P(b, syms)))
        else:
            D = Intersection(D, cs)
    tsides = re.split(r"<=|>=|=|<|>", task)
    D = Intersection(D, own_domain(tsides, syms, v))
    Tset, ineq, _, _ = chain_set(task, syms, v)
    Tset = Intersection(Tset, D)
    prev = Tset
    rels, fi = [], None
    final_raw, final_dom, final_answer = None, None, False
    for i, (comb, parts) in enumerate(parsed):
        if comb == "none":
            cur_raw = S.EmptySet
            ans = True
            cur = S.EmptySet
        else:
            sets, ans = [], True
            for p in parts:
                sset, _, sides, ex = chain_set(p, syms, v)
                sset = Intersection(sset, own_domain(sides, syms, v))
                sets.append(sset)
                if not (all(e == v or not e.has(v) for e in ex) and any(e == v for e in ex)):
                    ans = False
            cur_raw = Union(*sets) if comb == "or" else Intersection(*sets)
            cur = Intersection(cur_raw, D)
        r = relation(prev, cur)
        rels.append(r)
        if fi is None:
            if ineq:
                if r != "equivalent":
                    fi = i
            else:
                lost = Intersection(Complement(prev, cur), Tset)
                if lost != S.EmptySet:
                    fi = i
        prev = cur
        final_raw, final_dom, final_answer = cur_raw, cur, ans
    fac = None
    if final_answer:
        if ineq:
            fac = seteq(final_dom, Tset)
        else:
            if fi is None and Complement(final_raw, Tset) != S.EmptySet:
                fi = len(lines) - 1
            fac = seteq(final_raw, Tset)
    if fi is not None:
        exp = "invalid"
    elif not final_answer:
        exp = "incomplete"
    else:
        exp = "valid*"
    return {"expect": exp, "firstInvalid": fi, "finalAnswerCorrect": fac, "relation": rels,
            "task_set": str(Tset), "domain": str(D)}


def sub_item(st, lines):
    letters = set(st["subs"].keys())
    syms = {k: Symbol(k) for k in letters}
    syms["sqrt"] = sqrt
    for ln in lines:
        s = norm(ln)
        s = re.sub(r"^\s*=", "", s)
        malformed_checks(s, letters)
    for ln in lines:
        s = re.sub(r"^\s*=", "", norm(ln))
        a = ambiguous_check(s)
        if a:
            return {"expect": "ambiguous", "why": a}
    subs = {syms[k]: P(val, syms) for k, val in st["subs"].items()}
    target = nsimplify(P(st["expr"], syms).subs(subs))
    prev = target
    rels, fi = [], None
    last_seg = None
    for i, ln in enumerate(lines):
        s = re.sub(r"^\s*=", "", norm(ln))
        segs = [x.strip() for x in s.split("=")]
        if any(x == "" for x in segs):
            raise Malformed("empty segment")
        ok = True
        for seg in segs:
            val = nsimplify(P(seg, syms).subs(subs))
            if (val - prev).simplify() != 0:
                ok = False
            prev = val
            last_seg = seg
        rels.append("equivalent" if ok else "neither")
        if not ok and fi is None:
            fi = i
    ans = bool(ANSWER_NUM.match(last_seg.replace(" ", "")))
    fac = ((prev - target).simplify() == 0) if ans else None
    exp = "invalid" if fi is not None else ("incomplete" if not ans else "valid*")
    return {"expect": exp, "firstInvalid": fi, "finalAnswerCorrect": fac, "relation": rels,
            "task_set": "value %s" % target}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "HELDOUT6-corpus.json")
    items = json.load(open(path, encoding="utf-8"))
    dis, undec, n = [], [], 0
    ids = set()
    for it in items:
        n += 1
        probs = []
        if it["id"] in ids:
            probs.append("duplicate id")
        ids.add(it["id"])
        if it["working"].split("\n") != it["lines"]:
            probs.append("lines != working split")
        if len(it["relation"]) != len(it["lines"]):
            probs.append("relation length")
        try:
            r = solve_item(it)
        except Malformed as e:
            r = {"expect": "malformed", "why": str(e)}
        except Undecidable as e:
            undec.append((it["id"], str(e)))
            print("%-14s UNDECIDABLE %s" % (it["id"], e))
            continue
        if r["expect"] in ("malformed", "ambiguous"):
            r.update(firstInvalid=None, finalAnswerCorrect=None, relation=["n/a"] * len(it["lines"]))
        exp = it["expect"]
        exp_cmp = "valid*" if exp in ("valid", "valid-jump") else exp
        if r["expect"] != exp_cmp:
            probs.append("expect %s vs computed %s (%s)" % (exp, r["expect"], r.get("why", "")))
        for k in ("firstInvalid", "finalAnswerCorrect", "relation"):
            if r[k] != it[k]:
                probs.append("%s label=%s computed=%s" % (k, it[k], r[k]))
        status = "OK " if not probs else "DIS"
        print("%-14s %s %-11s fi=%-4s fac=%-5s rel=%s %s" % (
            it["id"], status, it["expect"], r["firstInvalid"], r["finalAnswerCorrect"],
            ",".join(x[:3] for x in r["relation"]), r.get("why", "") or r.get("task_set", "")))
        for p in probs:
            print("    ! " + p)
        if probs:
            dis.append(it["id"])
    print("\nitems=%d disagreements=%d undecidable=%d" % (n, len(dis), len(undec)))
    if dis:
        print("disagreeing ids: " + ", ".join(dis))
    return 1 if dis else 0


if __name__ == "__main__":
    sys.exit(main())
