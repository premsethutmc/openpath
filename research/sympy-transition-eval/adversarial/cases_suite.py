"""Independent case-level adversarial suite (whole workings), authored for this evaluation, not drawn from the holdout.
Expected labels use the E7 vocabulary and were fixed before B/C were run on this file."""
import json, os

S = []


def add(cid, statement, lines, exp, why):
    S.append({"id": cid, "problem": {"domain": "algebra", "statement": statement}, "studentWorking": {"format": "natural", "text": "\n".join(lines)}, "exp": exp, "why": why})


add("ca-01", "3x-7=11", ["3x=18", "x=6"], "verified", "")
add("ca-02", "3x-7=11", ["3x=4", "x=4/3"], "invalid", "sign error")
add("ca-03", "3x-7=11", ["3x=18", "x=18-12", "x=6"], "invalid", "x=18-12 is not 18/3: right value, wrong arithmetic")
add("ca-04", "x^2-7x+10=0", ["(x-2)(x-5)=0", "x=2 or x=5"], "verified", "")
add("ca-05", "x^2-7x+10=0", ["(x-2)(x-5)=0", "x=5"], "invalid", "lost root 2")
add("ca-06", "x^2-7x+10=0", ["(x-2)(x-5)=0"], "incomplete", "not solved")
add("ca-07", "x^2=5x", ["x=5"], "invalid", "divided by x")
add("ca-08", "x^2=5x", ["x^2-5x=0", "x(x-5)=0", "x=0 or x=5"], "verified", "")
add("ca-09", "sqrt(x+6)=x", ["x+6=x^2", "(x-3)(x+2)=0", "x=3 or x=-2", "check x=-2: sqrt(4)=2, not -2, rejected", "x=3"], "verified", "checked")
add("ca-10", "sqrt(x+6)=x", ["x+6=x^2", "(x-3)(x+2)=0", "x=3 or x=-2"], "invalid", "extraneous root kept")
add("ca-11", "sqrt(x+6)=x", ["x+6=x^2", "(x-3)(x+2)=0", "x=3"], "missing-assumption", "dropped -2 without a check")
add("ca-12", "2/(x-1)=4/(x+1)", ["x != 1 and x != -1", "2(x+1)=4(x-1)", "2x+2=4x-4", "x=3"], "verified", "restrictions stated")
add("ca-13", "2/(x-1)=4/(x+1)", ["2(x+1)=4(x-1)", "2x+2=4x-4", "x=3"], "missing-assumption", "denominators cleared without restriction")
add("ca-14", "x/(x-2)=2/(x-2)", ["x != 2", "x=2", "but x=2 is excluded, so there is no solution"], "verified", "")
add("ca-15", "x/(x-2)=2/(x-2)", ["x=2"], "invalid", "x=2 is excluded")
add("ca-16", "-3x+2>8", ["-3x>6", "x<-2"], "verified", "")
add("ca-17", "-3x+2>8", ["-3x>6", "x>-2"], "invalid", "inequality not reversed")
add("ca-18", "x^2-x-12<0", ["(x-4)(x+3)<0", "-3<x<4"], "verified", "")
add("ca-19", "x^2-x-12<0", ["(x-4)(x+3)<0", "x<4"], "invalid", "lower bound lost")
add("ca-20", "|x+2|=7", ["x+2=7 or x+2=-7", "x=5 or x=-9"], "verified", "")
add("ca-21", "|x+2|=7", ["x+2=7", "x=5"], "invalid", "lost -9")
add("ca-22", "2^(x+1)=16", ["2^(x+1)=2^4", "x+1=4", "x=3"], "verified", "")
add("ca-23", "x^2+4x+1=0", ["(x+2)^2=3", "x+2=±sqrt(3)", "x=-2±sqrt(3)"], "verified", "completing the square")
add("ca-24", "x^2+4x+1=0", ["(x+2)^2=5", "x=-2±sqrt(5)"], "invalid", "wrong constant")
add("ca-25", "Simplify (x^2-9)/(x^2+3x)", ["(x-3)(x+3)/(x(x+3))", "(x-3)/x, x != 0 and x != -3"], "verified", "")
add("ca-26", "Simplify (x^2-9)/(x^2+3x)", ["(x-3)(x+3)/(x(x+3))"], "incomplete", "common factor not cancelled")
add("ca-27", "Simplify (x^2-9)/(x^2+3x)", ["(x-3)(x+3)/(x(x+3))", "(x-3)/x"], "missing-assumption", "excluded value -3 not stated")
add("ca-28", "Factor x^2-x-20", ["x^2-x-20 = (x-5)(x+4)"], "verified", "")
add("ca-29", "Factor x^2-x-20", ["x^2-x-20 = (x+5)(x-4)"], "invalid", "signs swapped")
add("ca-30", "Expand (2x-3)^2", ["(2x-3)^2 = 4x^2-12x+9"], "verified", "")
add("ca-31", "Expand (2x-3)^2", ["(2x-3)^2 = 4x^2+9"], "invalid", "cross term dropped")
add("ca-32", "Evaluate 51^2 - 49^2", ["51^2 - 49^2 = (51-49)(51+49)", "= 2 * 100", "= 200"], "verified", "")
add("ca-33", "Evaluate 51^2 - 49^2", ["51^2 - 49^2 = (51-49)(51+49)", "= 2 * 100", "= 2000"], "invalid", "arithmetic slip")
add("ca-34", "Solve the system x+y=10, x-y=4", ["2x=14", "x=7", "y=3"], "verified", "")
add("ca-35", "Solve the system x+y=10, x-y=4", ["2x=14", "x=7", "y=4"], "invalid", "y wrong")
add("ca-36", "ln(x)+ln(x-3)=ln(4)", ["ln(x(x-3))=ln(4)", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1", "x=-1 is outside the domain x>3, rejected", "x=4"], "verified", "")
add("ca-37", "ln(x)+ln(x-3)=ln(4)", ["ln(x(x-3))=ln(4)", "x^2-3x-4=0", "(x-4)(x+1)=0", "x=4 or x=-1"], "invalid", "-1 outside the domain kept")
add("ca-38", "5x+2=17", ["5x=15", "x=3", "Also 7*8=54."], "invalid", "false side claim")
add("ca-39", "5x+2=17", ["5x=15", "x=3", "Also 7*8=56."], "verified", "true side claim")
add("ca-40", "x^3-4x=0", ["x(x^2-4)=0", "x(x-2)(x+2)=0", "x=0, 2 or -2"], "verified", "")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cases-suite.json")
    json.dump(S, open(out, "w"), indent=1)
    print(len(S), "cases ->", out)
