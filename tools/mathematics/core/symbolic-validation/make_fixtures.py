"""Builds fixtures/regressions.json: every disagreement/defect found while validating, with seed, class, the minimal reproducer and the ORACLE's label."""
import json, oracle
R = [
 # id, seed, class, problem, lines, note
 ("leading-minus-1", 1, "engine defect", "Factorise -a^3+z^3", ["-(a^3-z^3)"], "verb stripping removed a leading '-' (regex [:,-]); fixed in both engines"),
 ("leading-minus-2", 1, "engine defect", "Expand -3*x - 2-(2*x)", ["3x-2-2x"], "false accept: the leading minus was dropped"),
 ("poly-restriction-stmt", 1, "engine defect", "Simplify (b^2-4)/(b-2)", ["b+2", "b-2 ≠ 0"], "univariate engine only read 'x ≠ number'; polynomial restrictions are now read"),
 ("stray-letter", 1, "engine gap", "Expand (z+1)^2", ["z^2+2*z*c+1"], "a letter not in the problem was refused; now decided (not an identity)"),
 ("symexp-exp-cancels-1", 2, "engine defect", "Simplify (x^2)^(n+1)/(x^2)^(n)", ["(x^2)^(n+1-(n))"], "exponent written with a variable: base != 0 required on both sides"),
 ("symexp-exp-cancels-2", 2, "engine defect", "Simplify ((x+1))^(m+2)/((x+1))^(m)", ["((x+1))^(m+2-(m))"], "same"),
 ("witness-a-minus-3-2", 3, "oracle defect", "Simplify (2*a + 3*z + 3)/(2*a + 3*z + 3)", ["(2a + 3)/(2a + 3)"], "grid lacked a=-3/2; see ORACLE_CORRECTIONS.md C1"),
 ("sqfree-base", 1, "engine defect", "Simplify (a^2+2*a*b+b^2)^n/(a+b)^(2*n)", ["1"], "square-free decomposition of the base so (a+b)^(2n) and ((a+b)^2)^n agree"),
]
out = []
for id_, seed, cls, prob, lines, note in R:
    import re; o = oracle.derive(re.sub(r"^(Simplify|Expand|Factorise)\s+","",prob), lines, [])
    out.append({"id": id_, "seed": seed, "class": cls, "problem": prob, "lines": lines, "note": note, "oracle": {"steps": [s["cls"] for s in o["steps"]], "first_invalid": o["first_invalid"], "final": o["final"]}})
json.dump(out, open("fixtures/regressions.json", "w"), indent=1, ensure_ascii=False)
for x in out: print(x["id"], x["oracle"])
