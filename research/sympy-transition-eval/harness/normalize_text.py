"""Syntactic front-end normalisation only (no mathematical decisions), to measure how much of E7's false-rejection
backlog is a parsing problem: clauses split onto their own lines, labels ('check:', 'multiply by 6:') and prose words
around a statement removed, 'name =' prefixes removed, pure prose dropped. Output: out/cases-normalized.json."""
import json, os, sys, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "research/sympy-transition-eval/verifier"))
from cases import split_clauses, strip_words, clean_math, has_math, EMPTY  # noqa: E402
H = os.path.join(ROOT, "tools/mathematics/generalization-e7/holdout/")
cases = json.load(open(H + "cases.json"))
out, changed = [], 0
for c in cases:
    w = c["studentWorking"]
    text = w["text"] if isinstance(w, dict) and w.get("format") == "natural" else ("\n".join(w) if isinstance(w, list) and all(isinstance(s, str) for s in w) else None)
    if text is None:
        out.append(c); continue
    lines = []
    for cl in split_clauses(text):
        if EMPTY.search(cl.raw):
            lines.append("no solution"); continue
        core = clean_math(strip_words(cl.raw)[0])[0] if not cl.raw.strip().startswith("=") else cl.raw.strip()
        if core and has_math(core):
            lines.append(core + (" + C" if re.search(r"\+\s*C\s*$", cl.raw) else ""))
    new = "\n".join(lines) if lines else text
    changed += new != text
    out.append({**c, "studentWorking": {"format": "natural", "text": new}})
json.dump(out, open(os.path.join(ROOT, "research/sympy-transition-eval/out/cases-normalized.json"), "w"))
print(changed, "workings changed")
