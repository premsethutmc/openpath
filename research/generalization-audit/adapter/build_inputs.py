"""Evaluation adapter, step 1: frozen benchmark -> E7 input envelopes (no mathematical decisions).

For each case it produces one primary channel (and secondary channels) in E7's own input formats:
  T/statement  -> answer-first transition   assessAnswerFirst({domain:'algebra', statement: prev[, where A]}, {natural: next})
  T/expression -> unified symbolic route     assessMathematicalWorking({domain:'symbolic', start, assumptions}, [{id:'s0', expression}])
  W/algebra    -> unified natural route      assessMathematicalWorking({domain:'algebra', statement: 'Solve …' …}, {natural: lines})
                  (+ answer-first secondary for solve tasks: the student-facing path)
  W/calculus   -> unified typed-problem + natural working
  W/statement-task -> unified {domain:'calculus', task, statement} + natural working
Text is passed through unchanged. Typed JSON is produced from the oracle's *unevaluated* parse and round-tripped back
to SymPy; a round-trip mismatch is recorded as an adapter defect (class J), never silently passed on. Anything E7's
typed representation cannot express is recorded as 'unrepresentable' (an E7 representation limit, class B).
Usage (from research/generalization-audit): python3 adapter/build_inputs.py frozen/benchmark.json results/adapter-inputs.json
"""
import json, os, re, sys
from fractions import Fraction
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "oracle"))
import sympy as sp  # noqa: E402
from safe_parse import parse_statement, Ctx, Unreadable, Ambiguous  # noqa: E402


class Unrep(Exception):
    pass


CANONICAL = False  # sensitivity variant: fold closed numeric subterms and nested integer powers (same mathematics)


def to_e7(e):
    """SymPy (unevaluated) -> E7 calculus-core Expr JSON."""
    if CANONICAL:
        if not e.free_symbols and not e.is_Atom:
            v = e.doit()
            if v.is_Rational:
                return {"kind": "constant", "value": str(v)}
        if isinstance(e, sp.Pow) and isinstance(e.base, sp.Pow) and e.exp.is_Integer and e.base.exp.is_Integer and e.base.exp > 0:  # (b^m)^n = b^(mn) keeps the domain only for m > 0
            return to_e7(sp.Pow(e.base.base, e.base.exp * e.exp, evaluate=False))
    if e is sp.pi:
        return {"kind": "pi"}
    if e is sp.E:
        return {"kind": "exp", "argument": {"kind": "constant", "value": "1"}}
    if e.is_Symbol:
        return {"kind": "variable", "name": e.name}
    if e.is_Rational:
        return {"kind": "constant", "value": str(e)}
    if isinstance(e, sp.Add):
        return {"kind": "add", "terms": [to_e7(a) for a in e.args]}
    if isinstance(e, sp.Mul):
        return {"kind": "multiply", "factors": [to_e7(a) for a in e.args]}
    if isinstance(e, sp.Pow):
        b, p = e.args
        if b is sp.E:
            return {"kind": "exp", "argument": to_e7(p)}
        if p.is_Integer:
            return {"kind": "power", "base": to_e7(b), "exponent": int(p)}
        if p.is_Rational:
            r = {"kind": "root", "index": int(p.q), "radicand": to_e7(b)}
            return r if p.p == 1 else {"kind": "power", "base": r, "exponent": int(p.p)}
        raise Unrep("symbolic exponent")
    if isinstance(e, sp.exp):
        return {"kind": "exp", "argument": to_e7(e.args[0])}
    if isinstance(e, sp.log):
        if len(e.args) > 1:
            raise Unrep("log base")
        return {"kind": "log", "argument": to_e7(e.args[0])}
    for k, f in (("sin", sp.sin), ("cos", sp.cos), ("tan", sp.tan), ("abs", sp.Abs), ("atan", sp.atan)):
        if isinstance(e, f):
            return {"kind": k, "argument": to_e7(e.args[0])}
    if isinstance(e, sp.sec):
        return {"kind": "power", "base": {"kind": "cos", "argument": to_e7(e.args[0])}, "exponent": -1}
    if isinstance(e, sp.csc):
        return {"kind": "power", "base": {"kind": "sin", "argument": to_e7(e.args[0])}, "exponent": -1}
    if isinstance(e, sp.cot):
        a = to_e7(e.args[0])
        return {"kind": "multiply", "factors": [{"kind": "cos", "argument": a}, {"kind": "power", "base": {"kind": "sin", "argument": a}, "exponent": -1}]}
    raise Unrep(type(e).__name__)


def from_e7(n):
    k = n["kind"]
    if k == "pi":
        return sp.pi
    if k == "variable":
        return sp.Symbol(n["name"], real=True)
    if k == "constant":
        return sp.Rational(Fraction(n["value"]))
    if k == "add":
        return sp.Add(*[from_e7(a) for a in n["terms"]])
    if k == "multiply":
        return sp.Mul(*[from_e7(a) for a in n["factors"]])
    if k == "power":
        return sp.Pow(from_e7(n["base"]), n["exponent"])
    if k == "root":
        return sp.root(from_e7(n["radicand"]), n["index"]) if n["index"] % 2 == 0 else sp.real_root(from_e7(n["radicand"]), n["index"])
    return {"sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "exp": sp.exp, "log": sp.log, "abs": sp.Abs, "atan": sp.atan}[k](from_e7(n["argument"]))


def json_of(text):
    """(json, defect) for one expression text."""
    try:
        with sp.evaluate(False):
            st = parse_statement(text, Ctx(allow_e_const=True))
        if st.kind != "expr" or len(st.exprs) != 1:
            return None, "not a single expression"
        j = to_e7(st.exprs[0])
    except Unrep as e:
        return None, f"unrepresentable: {e}"
    except (Unreadable, Ambiguous) as e:
        return None, f"unreadable by adapter: {e}"
    except Exception as e:  # noqa: BLE001 - a SymPy failure inside the adapter is an adapter defect, recorded as such
        return None, f"unreadable by adapter: {type(e).__name__}"
    # round trip: E7 JSON must denote exactly the oracle's (evaluated) expression
    ref = parse_statement(text, Ctx(allow_e_const=True)).exprs[0]
    back = from_e7(j)
    d = sp.simplify(sp.expand(back - ref))
    if d != 0:
        return None, f"ADAPTER-DEFECT round trip {back} != {ref}"
    return j, None


def assumption_json(a):
    """'x > 0' -> E7 SymbolicAssumption; only single linear constraints are expressible."""
    g = a.replace("≠", "!=").replace("≥", ">=").replace("≤", "<=")
    m = re.fullmatch(r"\s*(.+?)\s*(!=|>=|<=|>|<)\s*(.+?)\s*", g)
    if not m:
        raise Unrep("assumption form")
    lhs, op, rhs = m.groups()
    st = parse_statement(f"({lhs})-({rhs})", Ctx())
    d = st.exprs[0]
    kind = {"!=": "nonzero", ">": "positive", ">=": "nonnegative", "<": "positive", "<=": "nonnegative"}[op]
    if op in ("<", "<="):
        d = -d
    return {"kind": kind, "expression": to_e7(d)}


def statement_with(s, assumptions):
    return s if not assumptions else f"{s} for {' and '.join(assumptions)}"


INSTR = {"simplify": "Simplify", "expand": "Expand", "factor": "Factor", "evaluate": "Evaluate"}


def channels(c):
    out, notes = {}, []
    if c["kind"] == "transition":
        prev, nxt = c["statement"], c["working"][0]
        if c["transitionKind"] == "statement":
            out["answer-first-transition"] = {"problem": {"domain": "algebra", "statement": statement_with(prev, c["assumptions"])},
                                              "working": {"format": "natural", "text": nxt}}
            primary = "answer-first-transition"
        else:
            a, ea = json_of(c["oracle"]["prev"])
            b, eb = json_of(c["oracle"]["next"])
            asm, easm = [], None
            try:
                asm = [assumption_json(x) for x in c["assumptions"]]
            except (Unrep, Unreadable) as e:
                easm = f"unrepresentable: assumption {e}"
            err = ea or eb or easm
            if err:
                out["unified-symbolic"] = {"unavailable": err}
            else:
                prob = {"domain": "symbolic", "start": a}
                if asm:
                    prob["assumptions"] = asm
                out["unified-symbolic"] = {"problem": prob, "working": [{"id": "s0", "expression": b}]}
            primary = "unified-symbolic"
        return primary, out, notes
    t = c["task"]
    text = "\n".join(c["working"])
    nat = {"format": "natural", "text": text}
    ty = t["type"]
    if ty in ("solve", "system"):
        stmt = t["statement"] if ty == "solve" else (t["statement"] if t["statement"].lower().startswith("solve") else "Solve the system " + t["statement"])
        out["unified-natural"] = {"problem": {"domain": "algebra", "statement": statement_with(stmt, c["assumptions"])}, "working": nat}
        if ty == "solve":
            out["answer-first"] = {"problem": {"domain": "algebra", "statement": statement_with(stmt, c["assumptions"])}, "working": nat}
    elif ty in INSTR:
        out["unified-natural"] = {"problem": {"domain": "algebra", "statement": statement_with(f"{INSTR[ty]} {t['start']}", c["assumptions"])}, "working": nat}
    elif ty == "show":
        out["unified-natural"] = {"problem": {"domain": "algebra", "statement": statement_with(f"Show that {t['start']} = {t['target']}", c["assumptions"])}, "working": nat}
    elif ty in ("derivative", "indefinite-integral", "definite-integral", "limit"):
        f, err = json_of(t["f"])
        prob = {"domain": "calculus", "task": ty, "variable": t.get("var", "x")}
        try:
            if err:
                raise Unrep(err)
            if ty == "derivative":
                prob["expression"] = f
            elif ty == "limit":
                prob["expression"] = f
                to = t["to"]
                prob["approach"] = "infinity" if to in ("oo", "infinity") else "-infinity" if to in ("-oo", "-infinity") else rat(to)
                prob["side"] = t.get("side", "both")
            else:
                prob["integrand"] = f
                if ty == "definite-integral":
                    prob["lower"], prob["upper"] = rat(t["a"]), rat(t["b"])
            out["unified-natural"] = {"problem": prob, "working": nat}
        except Unrep as e:
            out["unified-natural"] = {"unavailable": str(e) if str(e).startswith(("unrep", "ADAPTER", "unread", "not ")) else f"unrepresentable: {e}"}
    elif ty == "statement-task":
        out["unified-natural"] = {"problem": {"domain": "calculus", "task": t["calculusTask"], "statement": t["statement"]}, "working": nat}
    else:
        out["unified-natural"] = {"unavailable": f"adapter has no mapping for task {ty}"}
    return "unified-natural", out, notes


def rat(s):
    st = parse_statement(s, Ctx())
    v = st.exprs[0]
    if not v.is_Rational:
        raise Unrep(f"bound {s} is not rational")
    return str(v)


def main(bench, outp):
    B = json.load(open(bench))
    rows = []
    for c in B:
        primary, ch, notes = channels(c)
        rows.append({"id": c["id"], "primary": primary, "channels": ch})
    json.dump(rows, open(outp, "w"))
    import collections
    print(len(rows), collections.Counter(r["primary"] for r in rows),
          collections.Counter(("unavailable:" + v["unavailable"].split(":")[0]) for r in rows for v in r["channels"].values() if "unavailable" in v))


if __name__ == "__main__":
    if "--canonical" in sys.argv:
        CANONICAL = True
        sys.argv.remove("--canonical")
    main(sys.argv[1], sys.argv[2])
