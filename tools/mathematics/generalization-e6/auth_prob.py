from kit import *
CAT = "probability-combinatorics"
R = lambda v: (G_(v), "real")

def build():
    S = lambda m: St(m)
    # ---------------------------------------------------------------- counting
    s = S("unicode")
    addn(CAT, "combination-factorials", bprob("combinatorics", "combination", dict(n=8, r=3), ["unordered"]),
         [nline(s, "C(8,3)", "8!/(3!*5!)", "(8*7*6)/(3*2*1)", "56", final=True)], "verified", env={}, goal=R(56), tags=["valid"])
    s = S("plain")
    addn(CAT, "permutation-arrangements", bprob("combinatorics", "permutation", dict(n=7, r=3), ["ordered"]),
         [nline(s, "Pm(7,3)", "7!/(7-3)!", "7!/4!", "7*6*5", "210", final=True)], "verified", env={}, goal=R(210), tags=["valid"])
    s = S("implicit")
    addn(CAT, "factorial-books", bprob("combinatorics", "factorial", dict(n=6)),
         [nline(s, "6!", "6*5*4*3*2*1", "720", final=True)], "verified", env={}, goal=R(720), tags=["valid"])
    s = S("latex")
    addn(CAT, "arrangement-repetition-pin", bprob("combinatorics", "arrangement-repetition", dict(n=10, r=4), ["ordered"]),
         [nline(s, "10^4", "10000", final=True)], "verified", env={}, goal=R(10000), tags=["valid", "latex"])
    s = S("unicode")
    addn(CAT, "circular-table", bprob("combinatorics", "circular", dict(n=5), ["ordered"]),
         [nline(s, "(5-1)!", "4!", "24", final=True)], "verified", env={}, goal=R(24), tags=["valid"])
    s = S("plain")
    addn(CAT, "inclusion-exclusion-counts", bprob("combinatorics", "inclusion-exclusion", dict(a=25, b=18, intersection=7)),
         [nline(s, "NU", "25 + 18 - 7", "36", final=True, names={"NU": "n(A union B)"})], "verified", env={"NU": G_(36)}, goal=R(36), tags=["valid"])
    s = S("implicit")
    addn(CAT, "combination-symmetry", bprob("combinatorics", "combination", dict(n=8, r=3), ["unordered"]),
         [nline(s, "C(8,3)", "C(8,5)", "8!/(5!*3!)", "56", final=True)], "verified", env={}, goal=R(56), alt=True, tags=["valid", "alternative"])
    # ---------------------------------------------------------------- probability valid
    s = S("plain")
    addn(CAT, "finite-prime-die", bprob("probability", "finite", dict(favourable=3, total=6), ["equiprobable"]),
         [nline(s, "PP", "3/6", "1/2", final=True, names={"PP": "P(prime)"})], "verified", env={"PP": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["valid"])
    s = S("unicode")
    addn(CAT, "complement-rain", bprob("probability", "complement", dict(pa="3/8")),
         [ndef(s, "PA", "3/8", restate=True), nline(s, "PAc", "1 - PA", "1 - 3/8", "5/8", final=True)], "verified", env={"PA": G_(F(3, 8)), "PAc": G_(F(5, 8))}, goal=R(F(5, 8)), tags=["valid"])
    s = S("latex")
    addn(CAT, "union-general", bprob("probability", "union", dict(pa="1/2", pb="1/3", pab="1/6")),
         [nline(s, "PU", "PA + PB - PAB", "1/2 + 1/3 - 1/6", "2/3", final=True)], "verified", env={"PA": G_(F(1, 2)), "PB": G_(F(1, 3)), "PAB": G_(F(1, 6)), "PU": G_(F(2, 3))}, goal=R(F(2, 3)), tags=["valid", "latex"])
    s = S("plain")
    addn(CAT, "exclusive-union-stated", bprob("probability", "exclusive-union", dict(pa="1/5", pb="3/10")),
         [assume("A and B are mutually exclusive.", "mutually-exclusive"), nline(s, "PU", "PA + PB", "1/5 + 3/10", "1/2", req=["mutually-exclusive"], final=True)], "verified", env={"PA": G_(F(1, 5)), "PB": G_(F(3, 10)), "PU": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["valid", "stated-assumption"])
    s = S("unicode")
    addn(CAT, "independent-stated", bprob("probability", "independent-intersection", dict(pa="2/3", pb="3/4")),
         [assume("Assume the events A and B are independent.", "independent"), nline(s, "PAB", "PA*PB", "(2/3)*(3/4)", "1/2", req=["independent"], final=True)], "verified", env={"PA": G_(F(2, 3)), "PB": G_(F(3, 4)), "PAB": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["valid", "stated-assumption"])
    s = S("implicit")
    addn(CAT, "conditional-definition", bprob("probability", "conditional", dict(pab="1/8", pb="1/2")),
         [nline(s, "PAgB", "PAB/PB", "(1/8)/(1/2)", "1/4", final=True)], "verified", env={"PAB": G_(F(1, 8)), "PB": G_(F(1, 2)), "PAgB": G_(F(1, 4))}, goal=R(F(1, 4)), tags=["valid"])
    s = S("unicode")
    nmb = {"PDpos": "P(D|+)", "PposD": "P(+|D)", "PD": "P(D)", "Ppos": "P(+)"}
    addn(CAT, "bayes-test", bprob("probability", "bayes", dict(prior="1/100", likelihood="9/10", evidence="3/50")),
         [nline(s, "PDpos", "PposD*PD/Ppos", "(9/10)*(1/100)/(3/50)", "3/20", final=True, names=nmb)], "verified",
         env={"PD": G_(F(1, 100)), "PposD": G_(F(9, 10)), "Ppos": G_(F(3, 50)), "PDpos": G_(F(3, 20))}, goal=R(F(3, 20)), tags=["valid", "bayes"])
    s = S("plain")
    addn(CAT, "total-probability", bprob("probability", "total", dict(terms=[dict(prior="1/100", likelihood="9/10"), dict(prior="99/100", likelihood="1/20")])),
         [nline(s, "Ppos", "(9/10)*(1/100) + (1/20)*(99/100)", "9/1000 + 99/2000", "117/2000", final=True, names={"Ppos": "P(+)"})], "verified", env={"Ppos": G_(F(117, 2000))}, goal=R(F(117, 2000)), tags=["valid"])
    s = S("implicit")
    addn(CAT, "binomial-mean", bprob("distribution", "binomial-mean", dict(n=20, p="3/10")),
         [nline(s, "EX", "20*(3/10)", "6", final=True, names={"EX": "E[X]"})], "verified", env={"EX": G_(6)}, goal=R(6), tags=["valid"])
    s = S("unicode")
    addn(CAT, "binomial-variance", bprob("distribution", "binomial-variance", dict(n=12, p="1/4")),
         [nline(s, "VX", "12*(1/4)*(1 - 1/4)", "12*(1/4)*(3/4)", "9/4", final=True, names={"VX": "Var(X)"})], "verified", env={"VX": G_(F(9, 4))}, goal=R(F(9, 4)), tags=["valid"])
    s = S("plain")
    addn(CAT, "pmf-mean-weighted", bprob("distribution", "pmf-mean", dict(values=["0", "1", "2"], probabilities=["1/4", "1/2", "1/4"])),
         [nline(s, "EX", "0*(1/4) + 1*(1/2) + 2*(1/4)", "0 + 1/2 + 1/2", "1", final=True, names={"EX": "E[X]"})], "verified", env={"EX": G_(1)}, goal=R(1), tags=["valid"])
    s = S("implicit")
    addn(CAT, "mean-five-values", bprob("statistics", "mean", dict(values=["4", "8", "6", "10", "12"])),
         [nline(s, "M", "(4 + 8 + 6 + 10 + 12)/5", "40/5", "8", final=True, names={"M": "mean"})], "verified", env={"M": G_(8)}, goal=R(8), tags=["valid"])
    s = S("unicode")
    addn(CAT, "median-even-count", bprob("statistics", "median", dict(values=["3", "9", "4", "7", "5", "8"])),
         [sorted_line("Ordered data: 3, 4, 5, 7, 8, 9", [3, 4, 5, 7, 8, 9], [3, 9, 4, 7, 5, 8]), nline(s, "MD", "(5 + 7)/2", "6", final=True, names={"MD": "median"})], "verified", env={"MD": G_(6)}, goal=R(6), tags=["valid"])
    s = S("plain")
    addn(CAT, "population-variance", bprob("statistics", "population-variance", dict(values=["2", "4", "4", "4", "5", "5", "7", "9"]), ["population"]),
         [ndef(s, "mu", "40/8", names={}), nline(s, "VAR", "((2-mu)^2 + 3*(4-mu)^2 + 2*(5-mu)^2 + (7-mu)^2 + (9-mu)^2)/8", "(9 + 3 + 0 + 4 + 16)/8", "32/8", "4", final=True, names={"VAR": "variance", "mu": "mu"})], "verified",
         env={"VAR": G_(4)}, goal=R(4), tags=["valid"])
    s = S("implicit")
    addn(CAT, "complement-method-flips", bprob("probability", "finite", dict(favourable=7, total=8), ["equiprobable", "independent"]),
         [nline(s, "PH", "1 - PN", "1 - (1/2)^3", "1 - 1/8", "7/8", final=True, names={"PH": "P(at least one head)", "PN": "P(no head)"})], "verified", env={"PH": G_(F(7, 8)), "PN": G_(F(1, 8))}, goal=R(F(7, 8)), alt=True, tags=["valid", "alternative", "complement"])
    s = S("plain")
    addn(CAT, "err-combination-as-permutation", bprob("combinatorics", "combination", dict(n=8, r=3), ["unordered"]),
         [nline(s, "C(8,3)", "8*7*6", "336", final=True)], "invalid", env={}, goal=R(56), tags=["wrong-formula"])
    s = S("implicit")
    addn(CAT, "err-permutation-slip", bprob("combinatorics", "permutation", dict(n=7, r=3), ["ordered"]),
         [nline(s, "Pm(7,3)", "7*6*5", "200", final=True)], "invalid", env={}, goal=R(210), tags=["arithmetic"])
    s = S("unicode")
    addn(CAT, "err-conditional-inverted", bprob("probability", "conditional", dict(pab="1/8", pb="1/2")),
         [nline(s, "PAgB", "PB/PAB", "(1/2)/(1/8)", "4", final=True)], "invalid", env={"PAB": G_(F(1, 8)), "PB": G_(F(1, 2)), "PAgB": G_(F(1, 4))}, goal=R(F(1, 4)), tags=["wrong-formula"])
    s = S("plain")
    addn(CAT, "err-bayes-no-evidence", bprob("probability", "bayes", dict(prior="1/100", likelihood="9/10", evidence="3/50")),
         [nline(s, "PDpos", "PposD*PD", "(9/10)*(1/100)", "9/1000", final=True, names={"PDpos": "P(D|+)", "PposD": "P(+|D)", "PD": "P(D)"})], "invalid",
         env={"PD": G_(F(1, 100)), "PposD": G_(F(9, 10)), "PDpos": G_(F(3, 20))}, goal=R(F(3, 20)), tags=["wrong-formula"])
    s = S("implicit")
    addn(CAT, "err-complement-slip", bprob("probability", "complement", dict(pa="3/8")),
         [nline(s, "PAc", "1 - 3/8", "3/8", final=True)], "invalid", env={"PAc": G_(F(5, 8))}, goal=R(F(5, 8)), tags=["arithmetic"])
    s = S("unicode")
    addn(CAT, "err-union-overlap-ignored", bprob("probability", "union", dict(pa="1/2", pb="1/3", pab="1/6")),
         [nline(s, "PU", "PA + PB", "1/2 + 1/3", "5/6", final=True)], "invalid", env={"PA": G_(F(1, 2)), "PB": G_(F(1, 3)), "PU": G_(F(2, 3))}, goal=R(F(2, 3)), tags=["wrong-formula"])
    s = S("plain")
    addn(CAT, "err-binomial-variance-forgot-q", bprob("distribution", "binomial-variance", dict(n=12, p="1/4")),
         [nline(s, "VX", "12*(1/4)", "3", final=True, names={"VX": "Var(X)"})], "invalid", env={"VX": G_(F(9, 4))}, goal=R(F(9, 4)), tags=["wrong-formula"])
    s = S("implicit")
    addn(CAT, "err-mean-divisor", bprob("statistics", "mean", dict(values=["4", "8", "6", "10", "12"])),
         [nline(s, "M", "(4 + 8 + 6 + 10 + 12)/4", "40/4", "10", final=True, names={"M": "mean"})], "invalid", env={"M": G_(8)}, goal=R(8), tags=["arithmetic"])
    s = S("unicode")
    addn(CAT, "final-ok-after-invalid-middle", bprob("probability", "conditional", dict(pab="1/8", pb="1/2")),
         [nline(s, "PAgB", "PAB*PB", "1/16"), nline(s, "PAgB", "PAB/PB", "(1/8)/(1/2)", "1/4", final=True)], "invalid", env={"PAB": G_(F(1, 8)), "PB": G_(F(1, 2)), "PAgB": G_(F(1, 4))}, goal=R(F(1, 4)), first_ok=[0], tags=["correct-final-after-error"])
    s = S("plain")
    addn(CAT, "err-pmf-mean-unweighted", bprob("distribution", "pmf-mean", dict(values=["1", "2", "3"], probabilities=["1/2", "1/3", "1/6"])),
         [nline(s, "EX", "(1 + 2 + 3)/3", "2", final=True, names={"EX": "E[X]"})], "invalid", env={"EX": G_(F(5, 3))}, goal=R(F(5, 3)), tags=["wrong-formula"])
    s = S("implicit")
    addn(CAT, "err-pmf-mean-coincidence", bprob("distribution", "pmf-mean", dict(values=["0", "1", "2"], probabilities=["1/4", "1/2", "1/4"])),
         [nline(s, "EX", "(0 + 1 + 2)/3", "1", final=True, names={"EX": "E[X]"})], "invalid", env={"EX": G_(1)}, goal=R(1),
         ref_override=("invalid", 0, "the unweighted average (0+1+2)/3 equals E[X]=1 only by coincidence; it is not the definition sum x*p(x), so the method is wrong although the number is right"), tags=["wrong-formula", "numeric-coincidence"])
    s = S("unicode")
    addn(CAT, "err-median-even", bprob("statistics", "median", dict(values=["3", "9", "4", "7", "5", "8"])),
         [sorted_line("Ordered data: 3, 4, 5, 7, 8, 9", [3, 4, 5, 7, 8, 9], [3, 9, 4, 7, 5, 8]), nline(s, "MD", "5", final=True, names={"MD": "median"})], "invalid", env={"MD": G_(6)}, goal=R(6), tags=["wrong-formula"])
    s = S("unicode")
    addn(CAT, "missing-independence", bprob("probability", "independent-intersection", dict(pa="2/3", pb="3/4")),
         [nline(s, "PAB", "PA*PB", "(2/3)*(3/4)", "1/2", req=["independent"], final=True)], "missing-assumption", env={"PA": G_(F(2, 3)), "PB": G_(F(3, 4)), "PAB": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["missing-assumption", "independence"])
    s = S("plain")
    addn(CAT, "missing-equiprobable", bprob("probability", "finite", dict(favourable=3, total=6)),
         [nline(s, "PE", "3/6", "1/2", req=["equiprobable"], final=True, names={"PE": "P(even)"})], "missing-assumption", env={"PE": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["missing-assumption", "equiprobable"])
    s = S("implicit")
    addn(CAT, "missing-exclusivity", bprob("probability", "exclusive-union", dict(pa="1/5", pb="3/10")),
         [nline(s, "PU", "PA + PB", "1/5 + 3/10", "1/2", req=["mutually-exclusive"], final=True)], "missing-assumption", env={"PA": G_(F(1, 5)), "PB": G_(F(3, 10)), "PU": G_(F(1, 2))}, goal=R(F(1, 2)), tags=["missing-assumption", "exclusivity"])
    s = S("unicode")
    addn(CAT, "missing-unordered", bprob("combinatorics", "combination", dict(n=10, r=4)),
         [nline(s, "C(10,4)", "10!/(4!*6!)", "210", req=["unordered"], final=True)], "missing-assumption", env={}, goal=R(210), tags=["missing-assumption", "unordered"])
    # ---------------------------------------------------------------- incomplete
    s = S("plain")
    addn(CAT, "incomplete-prose-bayes", bprob("probability", "bayes", dict(prior="1/100", likelihood="9/10", evidence="3/50")),
         [prose("Use Bayes' theorem")], "incomplete", env={}, goal=R(F(3, 20)), tags=["prose-only"])
    s = S("implicit")
    addn(CAT, "incomplete-formula-only", bprob("probability", "conditional", dict(pab="1/8", pb="1/2")),
         [nline(s, "PAgB", "PAB/PB")], "incomplete", env={"PAB": G_(F(1, 8)), "PB": G_(F(1, 2)), "PAgB": G_(F(1, 4))}, goal=R(F(1, 4)), tags=["no-final-line"])
    s = S("unicode")
    addn(CAT, "incomplete-unevaluated-factorials", bprob("combinatorics", "combination", dict(n=8, r=3), ["unordered"]),
         [nline(s, "C(8,3)", "8!/(3!*5!)", final=True)], "incomplete", env={}, goal=R(56), tags=["not-evaluated"])
    s = S("plain")
    addn(CAT, "incomplete-expected-value-substituted", bprob("distribution", "binomial-mean", dict(n=20, p="3/10")),
         [nline(s, "EX", "20*(3/10)", final=True, names={"EX": "E[X]"})], "incomplete", env={"EX": G_(6)}, goal=R(6), tags=["not-evaluated"])
    # ---------------------------------------------------------------- unsupported / ambiguous
    add(CAT, "unsupported-markov-chain", dict(domain="probability-statistics", area="distribution", task="markov-steady-state", data={}),
        [("pi P = pi with pi = (a, b) and a + b = 1", dict(k="prose")), ("a = 0.6, b = 0.4", dict(k="prose"))],
        "unsupported", ref_override=("unsupported", None, "Markov-chain stationary distributions are outside B1"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "unsupported-normal-tail", dict(domain="probability-statistics", area="distribution", task="normal-probability", data=dict(mean="0", sd="1", x="1")),
        [("P(X < 1) = 0.8413", dict(k="prose"))],
        "unsupported", ref_override=("unsupported", None, "normal-distribution tail probabilities are outside exact B1"), tags=["out-of-scope"], scope="out-of-scope")
    add(CAT, "ambiguous-comma-event", bprob("probability", "independent-intersection", dict(pa="1/2", pb="1/3"), ["independent"]),
        [("P(A, B) = 1/6", dict(k="prose"))],
        "ambiguous", ref_override=("ambiguous", None, "P(A, B) could denote a joint probability or a pair notation; it is not defined"), tags=["ambiguous"], scope="ambiguous")
