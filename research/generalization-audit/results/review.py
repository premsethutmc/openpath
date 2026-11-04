"""Manual review of every decisive failure (false acceptance, false rejection, misgrade) after reading the case and
E7's output. Writes results/review.json (failure class overrides with a one-line finding). Run once; deterministic."""
import json
R = {r["id"]: r for r in json.load(open("MATH_GENERALIZATION_RESULTS.json"))}
G = lambda ids, cls, sec, note: {i: {"class": cls, "secondary": sec, "finding": note} for i in ids.split()}
rv = {}
# ---- false acceptances
rv |= G("ADV-0105 CAL-0020 CAL-0056 CAL-0099 CAL-0104 CAL-0154 PRF-0172", "G", "B",
        "correct result, wrongly cited rule; natural-text routes do not read cited reasons, so the work is verified")
rv |= G("ADV-0327", "A", "", "unbalanced bracket 'sqrt(x+1 = 2' silently repaired to sqrt(x+1)=2 and the transition accepted")
rv |= G("CAL-0131", "E", "", "ln(x^2-1)+C accepted as an antiderivative of 2x/(x^2-1) although it is undefined on (-1,1), part of the integrand's domain")
rv |= G("ALG-0178 ALG-0189 ALG-0205 ALG-0221 DOM-0193 DOM-0207 DOM-0209 DOM-0211", "G", "E",
        "E7's own justification records that the final line is defined where the problem was not and the restriction is unstated, yet returns verified")
rv |= G("DOM-0159 DOM-0171 EQN-0200 PRF-0033 PRF-0043", "G", "E", "denominators cleared with no stated exclusion; answer correct; verified")
rv |= G("EQN-0203 PRF-0036 DOM-0189 EQN-0154 PRF-0072", "G", "E",
        "candidate dropped without any visible check; E7 credits its own exact elimination ('proven candidate elimination')")
# ---- false rejections
rv |= G("ALG-0042 ALG-0049 ALG-0060 ALG-0079 ALG-0081 ALG-0086 ALG-0098 ALG-0110 ALG-0112 ALG-0117 ALG-0119 DOM-0007 DOM-0009 DOM-0028 DOM-0036 MUL-0009 MUL-0017 MUL-0027 MUL-0060 ADV-0274",
        "E", "B", "symbolic route reports 'target changes the domain' for an identical domain (numeric reciprocals, roots of constants, nested powers, factored polynomials); form-dependent")
rv |= G("ALG-0057 ALG-0091 ALG-0104 ALG-0109 DOM-0006 DOM-0014 DOM-0027 DOM-0032 FUN-0011 FUN-0028 FUN-0032",
        "E", "B", "restriction supplied as an assumption, yet the symbolic route still reports a domain change")
rv |= G("ADV-0073 DOM-0147 DOM-0153 TRG-0094 FUN-0085", "E", "", "interval assumptions (0<x<pi/2, x>0) not used to discharge poles / absolute values")
rv |= G("DOM-0058 DOM-0066 DOM-0071 DOM-0072 DOM-0076 FUN-0104 FUN-0106 FUN-0108 FUN-0109 FUN-0118 ADV-0301",
        "E", "", "log identity on a domain where it holds (positivity assumed or implied) still requires 'stated obligations'")
rv |= G("MUL-0061 MUL-0062 MUL-0064", "E", "F", "|a+b| -> a+b etc. with a>0, b>0 assumed: assumptions are not composed to establish nonnegativity")
rv |= G("TRG-0032 TRG-0038 TRG-0051 TRG-0072 TRG-0076 TRG-0108 FUN-0061 FUN-0069", "D", "",
        "true trigonometric identity reported INVALID because rational-polynomial normal forms differ (e.g. cos(-x) -> cos x, cos(2pi/3) -> -1/2)")
rv |= G("DOM-0160 DOM-0172 EQN-0199 EQN-0204 FUN-0145 FUN-0147 PRF-0032 PRF-0042 PRF-0044", "E", "",
        "a stated restriction line 'x != a' is treated as a statement in the solution chain, so the next line 'loses solutions'")
rv |= G("EQN-0221", "D", "", "a derived contradiction (5=6, hence no solution) is judged as a false claim")
rv |= G("CAL-0061", "A", "", "'sec' is not a known function: parsed as the variable 'sec' times (3x)^2, then the correct derivative is called invalid")
rv |= G("DOM-0214", "A", "", "'cbrt' parsed as a variable; correct arithmetic called invalid ('differ at cbrt = 0')")
rv |= G("LIM-0007 LIM-0012 LIM-0048 LIM-0056 LIM-0057 LIM-0060 LIM-0063", "A", "", "final limit stated with '→' or as a computation is not recognised ('state the value of the limit')")
rv |= G("PRF-0181", "A", "", "'by the chain rule: 3e^(3x)' — the colon label hides the answer")
rv |= G("PRF-0030", "A", "B", "'this holds for every real x' (all-reals conclusion) not recognised as a solved form")
rv |= G("CAL-0141 CAL-0148 CAL-0153", "B", "F", "integration by parts: 'u = x, v = sin(x)' binding line unrepresentable; the '= …' continuation is then compared with v and called invalid")
rv |= G("CAL-0200", "B", "", "auxiliary derivative u' = … is compared with f' and called invalid")
rv |= G("CAL-0080", "B", "", "conditional derivative 'x/|x| for x != 0; not differentiable at 0' not representable as an answer")
rv |= G("ADV-0231", "E", "", "case condition (x -> -oo so |x| = -x) not carried; the division step is called invalid")
# ---- misgrades
rv |= G("ADV-0003 ADV-0014 ADV-0070 ADV-0087 ALG-0126 DOM-0004 DOM-0016 DOM-0021 DOM-0024 DOM-0031 DOM-0057 DOM-0062 DOM-0064 DOM-0065 DOM-0067 DOM-0070 DOM-0080 DOM-0103 DOM-0112 DOM-0134 DOM-0146 DOM-0151 FUN-0015 FUN-0057 FUN-0083 FUN-0093 FUN-0103 FUN-0105 FUN-0107 MUL-0065 TRG-0090 TRG-0091 TRG-0097 TRG-0099",
        "G", "E", "invalid rewrite (values differ or the domain narrows) reported as 'needs an assumption' rather than invalid; not an acceptance")
rv |= G("ADV-0040 ADV-0045 DOM-0173 EQN-0168 EQN-0220 FUN-0141 FUN-0146 INE-0128 INE-0134 PRF-0020 PRF-0031 PRF-0045 PRF-0064 PRF-0107 PRF-0145 PRF-0159 PRF-0160 PRF-0167",
        "D", "", "a working that loses solutions (wrong final answer) is classified 'incomplete' instead of invalid")
rv |= G("DOM-0045 EQN-0123 INE-0013 INE-0030 INE-0037", "E", "", "answer-first transition diagnosis ignores the stated premise ('for x != 1', 'for x < 0') and reports a one-way step")
rv |= G("LIM-0059 LIM-0062 LIM-0064 LIM-0072 LIM-0103", "A", "", "wrong limit stated with '→' is not read; reported incomplete instead of invalid")
rv |= G("CAL-0197", "A", "", "prose 'times the derivative of sin(x)' misread; an unfinished line is called invalid")
rv |= G("PRF-0195", "B", "", "auxiliary u', v' lines compared with f'; unfinished work called invalid")
rv |= G("ADV-0089 ADV-0090 CAL-0060", "G", "", "wrong cited identity ln(x^2)=2ln x 'for all x': E7 reports missing-assumption, which names the actual flaw; label expects invalid")
rv |= G("CAL-0082", "I", "", "ORACLE/LABEL DEFECT: 'f'(x) = 2' for |2x| is false for x<0, so invalid is correct; label insufficient-information. Corrected in r2")
missing = [i for i, r in R.items() if r["outcome"] in ("false-acceptance", "false-rejection", "misgrade") and i not in rv]
extra = [i for i in rv if i not in R or R[i]["outcome"] in ("correct", "safe-abstention")]
print("unreviewed decisive failures:", missing, "| reviewed ids not decisive failures:", extra)
json.dump(rv, open("results/review.json", "w"), indent=1)
print(len(rv), "reviewed")
