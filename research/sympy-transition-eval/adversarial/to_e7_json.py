"""SymPy (unevaluated parse) -> OpenPath typed expression JSON, so the E7 symbolic route can be run on the same inputs."""
import sys, json, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "verifier"))
import sympy as sp
from safe_parse import parse_statement, Ctx


def conv(e):
    if e.is_Symbol:
        return {"kind": "variable", "name": e.name}
    if e.is_Integer or e.is_Rational:
        return {"kind": "constant", "value": str(e)}
    if e is sp.S.NegativeOne:
        return {"kind": "constant", "value": "-1"}
    if isinstance(e, sp.Add):
        return {"kind": "add", "terms": [conv(a) for a in e.args]}
    if isinstance(e, sp.Mul):
        return {"kind": "multiply", "factors": [conv(a) for a in e.args]}
    if isinstance(e, sp.Pow):
        b, p = e.args
        if p.is_Integer:
            return {"kind": "power", "base": conv(b), "exponent": int(p)}
        if p.is_Rational and p.p == 1:
            return {"kind": "root", "index": int(p.q), "radicand": conv(b)}
        if p.is_Rational and p.p == -1:
            return {"kind": "power", "base": {"kind": "root", "index": int(p.q), "radicand": conv(b)}, "exponent": -1}
        raise ValueError("power")
    for k, f in (("sin", sp.sin), ("cos", sp.cos), ("tan", sp.tan), ("exp", sp.exp), ("log", sp.log), ("abs", sp.Abs), ("atan", sp.atan)):
        if isinstance(e, f):
            if k == "log" and len(e.args) > 1:
                raise ValueError("log base")
            return {"kind": k, "argument": conv(e.args[0])}
    raise ValueError(type(e).__name__)


def to_json(text):
    try:
        with sp.evaluate(False):
            st = parse_statement(text, Ctx(allow_e_const=False))
        if st.kind != "expr" or len(st.exprs) != 1:
            return None
        return conv(st.exprs[0])
    except Exception:  # noqa: BLE001
        return None


if __name__ == "__main__":
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transitions.json")
    cs = json.load(open(p))
    for c in cs:
        if c["task"] == "expression":
            c["e7"] = {"start": to_json(c["prev"]), "next": to_json(c["next"])}
    json.dump(cs, open(p, "w"), indent=1)
    print(sum(1 for c in cs if c.get("e7") and c["e7"]["start"] and c["e7"]["next"]), "expression cases convertible")
