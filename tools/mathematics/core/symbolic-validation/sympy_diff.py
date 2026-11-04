"""SymPy differential: identity verdict of the engine vs SymPy, for single-step identity cases (valid / invalid / symbolic-exponent families).
Symbols are declared positive=True, matching the engine's documented symbolic-exponent assumption (positive bases). Domain verdicts are NOT judged
here (SymPy auto-cancels common factors, so it cannot see restrictions): those are judged only by oracle.py."""
import json, sys, signal, re
sys.path.insert(0, "/home/claude/vendor/sympy"); sys.path.insert(0, "/home/claude/vendor/mpmath")
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
from multiprocessing import Pool
T = standard_transformations + (implicit_multiplication_application, convert_xor)
L = {c: sp.Symbol(c, positive=True) for c in "abcdefghijklmnopqrstuvwxyz"}
class TO(Exception): pass
def alarm(*_): raise TO()
def P(s): return parse_expr(s, local_dict=L, transformations=T)
def verdict(case):
    sp_ = case["problem"].split(" ", 1)[1]; line = case["lines"][0]
    signal.signal(signal.SIGALRM, alarm); signal.alarm(8)
    try:
        a, b = P(sp_), P(line); d = a - b
        d = sp.powsimp(sp.expand_power_base(sp.expand(d), force=True), force=True)
        if d == 0: return "identity"
        d = sp.simplify(sp.cancel(sp.together(d)))
        if d == 0: return "identity"
        # a non-zero difference could still be zero (undetected); test numerically at exact rational points before calling it a non-identity
        vs = sorted(d.free_symbols, key=str)
        for t in range(6):
            pt = {v: sp.Rational(t + 2, 3) + (i + 1) for i, v in enumerate(vs)}
            if sp.simplify(d.subs(pt)) != 0: return "not-identity"
        return "undecided"
    except TO: return "timeout"
    except Exception as e: return "error:" + type(e).__name__
    finally: signal.alarm(0)
def work(c): return c["id"], verdict(c)
if __name__ == "__main__":
    cases, engines = [], {}
    for k in range(1, len(sys.argv) - 1, 2):
        cs = json.load(open(sys.argv[k])); en = {r["id"]: r for r in json.load(open(sys.argv[k + 1]))}
        for c in cs:
            e = en.get(c["id"])
            if c["kind"] in ("valid", "invalid", "symexp") and len(c["lines"]) == 1 and "≠" not in c["lines"][0] and e and e.get("steps") and e["steps"][0] != "unsupported":
                cc = dict(c); cc["id"] = f"{sys.argv[k]}|{c['id']}"; cases.append(cc); engines[cc["id"]] = e["steps"][0]
    with Pool(2) as p: res = p.map(work, cases, chunksize=10)
    import collections; tab = collections.Counter(); fix = []; byk = collections.defaultdict(collections.Counter)
    by = {c["id"]: c for c in cases}
    for id_, v in res:
        eng = "identity" if engines[id_] in ("valid", "no-change", "valid-with-obligation") else "not-identity"
        kind = by[id_]["kind"]
        if v in ("timeout", "undecided") or v.startswith("error"): tab["sympy-" + v.split(":")[0]] += 1; byk[kind]["sympy-" + v.split(":")[0]] += 1; continue
        if v == eng: tab["agree"] += 1; byk[kind]["agree"] += 1
        else: tab["DISAGREE"] += 1; byk[kind]["DISAGREE"] += 1; fix.append({"id": id_, "sympy": v, "engine": eng, "case": by[id_]})
    print(dict(tab)); print({k: dict(v) for k, v in byk.items()})
    json.dump(fix, open("data/sympy-disagreements.json", "w"), indent=1)
