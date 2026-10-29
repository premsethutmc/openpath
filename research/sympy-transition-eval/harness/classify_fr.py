"""Root-cause classification of every E7 false rejection on the exposed 678 holdout (label 'verified', engine not).

Primary cause = the first blocker in E7's own pipeline (from E7's justification text, traced to the producing code;
see MATH_TRANSITION_ENGINE_AUDIT.md), refined by case content. 'secondary' records what would still block the case if
the primary blocker were removed (by inspection), and 'sympy' records whether the isolated SymPy prototype (B) and
the combined strategy (C1) verified the case. Output: out/e7-false-rejections.json
Codes: 1 parser/representation, 2 equivalence not recognised, 3 valid implication / true side claim not recognised,
4 planner search failure, 5 missing (or mis-specified) transformation rule, 6 domain/assumption handling,
7 unsupported mathematical operation, 8 fixture/expected-result defect, 9 other.
"""
import json, os, re, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
H = os.path.join(ROOT, "tools/mathematics/generalization-e7/holdout/")
OUT = os.path.join(ROOT, "research/sympy-transition-eval/out/")
cases = {c["id"]: c for c in json.load(open(H + "cases.json"))}
e7 = {r["id"]: r for r in json.load(open(OUT + "e7-rows.json"))}
hb = {r["id"]: r for r in json.load(open(OUT + "holdout-results.json"))}
audit = {a["id"]: a for a in json.load(open(H + "audit.json"))}
NAMES = {1: "parser or representation limitation", 2: "valid equivalence not recognised", 3: "valid implication / true side claim not recognised",
         4: "planner search failure", 5: "missing or mis-specified transformation rule", 6: "incorrect domain or assumption handling",
         7: "unsupported mathematical operation", 8: "evaluation fixture or expected-result defect", 9: "other"}

PARSE = re.compile(r"unsupported character|malformed|expected expression|unexpected trailing notation|comma suffix|missing closing parenthesis|"
                   r"solution branches must name|plus-or-minus|conjunction may only join|power exponent must be|PARSE_ERROR|could not be translated|"
                   r"no lossless natural adapter|\(ambiguous\)|more than one plus-or-minus", re.I)
PROOF_TASKS = {"series-convergence", "improper-integral", "limit-squeeze", "epsilon-delta-proof", "fundamental-theorem-derivative", "taylor",
               "double-integral", "continuity", "differentiability", "implicit-differentiation", "parametric-derivative",
               "logarithmic-differentiation", "trigonometric-substitution", "sequence-limit"}
SIDE = re.compile(r"\b(also|note that|aside|incidentally|remark|for reference|unrelated)\b", re.I)

# Hand-assigned after reading each case and E7's step-level output (geometry, typed rule contracts, special cases).
OVERRIDE = {
    "h7-calcD-021": (3, "a true evaluation line ('At x=1 this value is 6') is not recognised", ""),
    "h7-calcI-013": (7, "definite-integral substitution with transformed bounds is not supported by the natural route", ""),
    "h7-calcI-014": (7, "definite-integral substitution with transformed bounds is not supported", ""),
    "h7-calcI-015": (7, "odd-function symmetry argument is not a supported operation", ""),
    "h7-calcL-001": (7, "limit claims ('as x -> 0, sin(5x)/(5x) -> 1') are not evaluated by the natural route", ""),
    "h7-calcL-004": (7, "limit claims at infinity ('2/x -> 0') are not evaluated", ""),
    "h7-calcL-009": (7, "L'Hôpital / one-sided limit claims are not evaluated", ""),
    "h7-calcL-022": (7, "squeeze-based limit claims are not evaluated", ""),
    "h7-calcL-024": (7, "difference-quotient argument for a limit is not evaluated", ""),
    "h7-typed-014": (7, "standard-limit claim ('sin(u)/u -> 1') is not evaluated", ""),
    "h7-calcL-007": (6, "case condition 'for x > 0' is not carried into |x| = x", "plus one-sided limit (7)"),
    "h7-calcL-026": (6, "case conditions for |x-1| are not carried; one-sided limits then unsupported", "plus one-sided limits (7)"),
    "h7-typed-010": (1, "'F(3) - F(0)' refers to a function named in prose ('An antiderivative is x^3/3'); not representable", ""),
    "h7-algA-023": (6, "the restriction line 'x≠1' is read as a statement that narrows the solution set ('lost solutions')", ""),
    "h7-algB-003": (2, "x^3-8 = (x-2)(x^2+2x+4) parsed but the independent checker cannot establish the factorisation identity", ""),
    "h7-calcD-028": (6, "case analysis of |x|: 'Case x>0: |x| = x' is judged without the case condition, so it is called invalid", "assumption scope"),
    "h7-dom-013": (1, "'4! 6!' (juxtaposed factorials) is misread; the true chain is then judged invalid", ""),
    "h7-dom-018": (1, "'P(no six) = 125/216' is read as a claim about the requested probability (91/216) and called invalid", "sub-quantity naming"),
    "h7-dom-040": (1, "'let (a + bi)(1 - 2i) = 3 + i' is not representable; line 2 then judged invalid", ""),
    "h7-dom-001": (7, "outcome enumeration as evidence for a favourable count is not an operation the probability adapter supports", ""),
    "h7-dom-045": (5, "remainder theorem (remainder = p(2)) is not a rule of the polynomial adapter", ""),
    "h7-dom-046": (5, "synthetic division is not a rule of the polynomial adapter", ""),
    "h7-dom-011": (1, "final line is a chain 'Var = E[X^2] - mu^2 = 21 - 16 = 5'; the adapter expects a single reduced number", "answer contract"),
    "h7-geo-003": (1, "line 2 mixes prose and a computation ('angles of a triangle add to 180°, so C = ...')", ""),
    "h7-geo-006": (3, "a true extra arithmetic line ('Also 2 × 47° = 94°') blocks certification", ""),
    "h7-geo-011": (1, "'Suppose C = x. Then ... (angle sum), so x = 70°' is a multi-sentence line with a local variable", ""),
    "h7-geo-014": (3, "a true extra arithmetic line ('Also 72° − 48° = 24°') blocks certification", ""),
    "h7-geo-021": (5, "'C = B = 50° (AB = AC)' — base angles of an isosceles triangle cited by its hypothesis, not by a rule name the binder knows", ""),
    "h7-geo-022": (5, "'B = C because AB = AC' — isosceles base-angle step not bound to a rule", ""),
    "h7-geo-028": (1, "two claims on one line joined by ', so'", ""),
    "h7-geo-029": (5, "exterior angle theorem is not in the rule set; step judged 'assumed without being given'", ""),
    "h7-geo-034": (3, "a true extra angle-sum line blocks certification", "plus exterior-angle step (5)"),
    "h7-geo-035": (5, "'(angle sum)' citation for ∠ACB is not accepted as a justification", ""),
    "h7-geo-037": (1, "claim and justification in one clause ('∠a2 = 115°, corresponding angles on parallel lines')", ""),
    "h7-geo-046": (1, "conditional sentence form ('If l1 ∥ l2, then ... Here ... so a2 = a1 = 64°')", ""),
    "h7-geo-047": (5, "line 2 cites 'linear pair' for a3 using a2, a fact derived on line 1; the cited-rule check uses only given facts", ""),
    "h7-geo-048": (1, "one sentence with three claims and two citations", ""),
    "h7-geo-053": (5, "as geo-047 (derived fact not available to the cited-rule check)", "true side line (3)"),
    "h7-geo-059": (5, "'vertical' cited for ∠BOD = ∠AOC where ∠AOC was derived on line 1; cited-rule check uses given facts only", ""),
    "h7-geo-063": (1, "claim chain inside a sentence ('∠ABD + ∠DBC = 180°, so ∠DBC = ...')", ""),
    "h7-geo-066": (7, "triangle congruence (SSS) conclusions are outside the natural geometry binder", ""),
    "h7-geo-068": (7, "triangle congruence (ASA) conclusion unsupported", ""),
    "h7-geo-072": (7, "triangle congruence (SAS) conclusion unsupported", ""),
    "h7-geo-073": (7, "triangle congruence (SAS) conclusion unsupported", "true side inequality (3)"),
    "h7-geo-077": (8, "independent audit labels this 'incomplete' (AB = √169 asserted without the distance computation); the label says verified", "audit disagreement"),
    "h7-typed-073": (6, "inverse step requires an invertibility obligation the submission does not state (det shown nowhere); label accepts it", "possible label question (8)"),
    "h7-typed-076": (6, "combination task carries unrelated data fields; required assumptions reported as not established", ""),
}


def classify(i):
    c, r = cases[i], e7[i]
    j = r["justification"]
    p = c["problem"]
    task = p.get("task", "")
    text = c["studentWorking"]["text"] if isinstance(c["studentWorking"], dict) else c["studentWorking"]
    typed = isinstance(c["studentWorking"], list) and c["studentWorking"] and isinstance(c["studentWorking"][0], dict)
    if i in OVERRIDE:
        code, why, sec = OVERRIDE[i]
        return code, why, sec, "manual"
    if typed and r["final"] == "invalid":
        return 5, "typed step names a method (substitution, parts, chain rule, symmetry, fundamental theorem); the rule-form kernel rejects the method's form although the claimed result is exactly right", "", "rule"
    if typed and "outside bounded exact calculus rules" in j:
        return 7, "typed limit claim with a named method ('standard limit', 'factor', 'degree comparison', 'one-sided limits') is outside the bounded calculus rules", "", "rule"
    if typed and "no bounded exact strategy" in j:
        return 2, "typed symbolic transformation (2 sin x cos x -> sin 2x) not proved by the bounded strategies", "", "rule"
    if p.get("domain") == "calculus" and task in PROOF_TASKS:
        return 7, f"calculus task '{task}' (proof-style or method-specific) has no verifier in the natural route", ("parser (1) also: " + j[:80]) if PARSE.search(j) else "", "rule"
    if PARSE.search(j):
        sec = ""
        if isinstance(text, str):
            if re.search(r"\bcase\b|\bif\b.*\bthen\b", text, re.I):
                sec = "case analysis (6/7)"
            elif "system" in p.get("statement", "").lower():
                sec = "linear system (7)"
            elif SIDE.search(text):
                sec = "true side claim (3)"
        return 1, f"E7 parse/representation: {j[:150]}", sec, "rule"
    if SIDE.search(text if isinstance(text, str) else "") and ("could not be verified (unsupported)" in j or "state the" in j or r["final"] == "incomplete"):
        return 3, f"a true extra line (side claim) is not set aside: {j[:120]}", "", "rule"
    if p.get("domain") == "calculus" and isinstance(text, str) and len(text.split("\n")) == 1 and "could not be verified (unsupported)" in j:
        if task == "limit":
            return 7, "bare limit value: the natural route cannot evaluate this limit (transcendental / non-polynomial)", "", "rule"
        return 2, "bare final answer: the natural route does not establish that the stated antiderivative/value answers the task", "", "rule"
    if p.get("domain") == "calculus" and "could not be verified (unsupported)" in j:
        return 2, f"natural calculus working: a line's identity is not established ({j[:120]})", "", "rule"
    if "incomplete" == r["final"] and "state the value of the limit" in j:
        return 1, "'tends to 3/1 = 3' is not recognised as stating the limit", "", "rule"
    if r["final"] == "incomplete":
        return 1, f"answer contract not recognised: {j[:120]}", "", "rule"
    if "could not be verified (unsupported)" in j:
        return 3, f"a line is not established: {j[:120]}", "", "rule"
    return 9, j[:160], "", "rule"


rows = []
for i, r in e7.items():
    if r["exp"] == "verified" and r["final"] != "verified":
        code, why, sec, how = classify(i)
        c = cases[i]
        rows.append({"id": i, "category": r["cat"], "engine": r["final"], "rootCause": code, "rootCauseName": NAMES[code], "evidence": why,
                     "secondary": sec, "classifiedBy": how, "e7Justification": r["justification"][:240],
                     "problem": c["problem"].get("statement") or c["problem"].get("task") or c["problem"].get("domain"),
                     "working": (c["studentWorking"]["text"] if isinstance(c["studentWorking"], dict) else json.dumps(c["studentWorking"]))[:300],
                     "sympyB": hb[i]["B"], "sympyReason": hb[i]["B_reason"][:200], "combinedC1": hb[i]["C1"],
                     "reproduce": f"bun research/sympy-transition-eval/e7-dump.ts out.json  # then select id {i}"})
json.dump(rows, open(OUT + "e7-false-rejections.json", "w"), indent=1)
cnt = collections.Counter(r["rootCause"] for r in rows)
print(len(rows), {f"{k} {NAMES[k]}": v for k, v in sorted(cnt.items())})
tab = collections.defaultdict(lambda: collections.Counter())
for r in rows:
    tab[r["rootCause"]][r["sympyB"] == "verified"] += 1
print({k: dict(v) for k, v in sorted(tab.items())})
print(collections.Counter((r["category"], r["rootCause"]) for r in rows).most_common(40))
