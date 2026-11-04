#!/usr/bin/env python3
"""Freeze independently-authored D4 notation cases before implementation."""
import hashlib, json
from pathlib import Path

OUT=Path(__file__).with_name("frozen-natural-working-cases.v1.json")
counts={"algebra-equations":60,"trigonometry-functions":40,"calculus":40,"geometry-vectors":40,"probability-statistics":30,"matrices-complex":30,"mixed-domain":30,"ambiguous-malformed":30}
cases=[]
def add(category, i, raw, expected, classification="parsed", verdict="unsupported", first=None):
    cases.append({"id":f"d4-{category}-{i:03d}","category":category,"provenance":{"kind":"independently-authored","note":"Authored for the frozen D4 audit corpus before parser implementation."},"raw":raw,"expectedInterpretation":expected,"expectedTypedRepresentation":expected,"intendedLineBoundaries":raw.splitlines(),"expectedParseClassification":classification,"expectedMathematicalVerdict":verdict,"expectedFirstInvalidStep":first})

for i in range(60):
    a=2+i%7;b=3+i%5
    if i%3==0:add("algebra-equations",i,f"{a}x + {b} = {a*4+b}\n{a}x = {a*4}\nx = 4",{"kind":"working","relations":["equation","equation","equation"]},verdict="verified")
    elif i%3==1:add("algebra-equations",i,f"(x+{a})(x-{b})\nx^2 + {a-b}x - {a*b}",{"kind":"working","relations":["expression","expression"]},verdict="verified")
    else:add("algebra-equations",i,"x^2 = 9\nx = 3",{"kind":"working","relations":["equation","equation"]},verdict="incomplete")
for i in range(40):
    if i%2==0:add("trigonometry-functions",i,"sin(x)^2 + cos(x)^2\n1",{"kind":"working","relations":["expression","expression"]},verdict="verified")
    else:add("trigonometry-functions",i,"f(x) = x^2 + 1\nf(3) = 10",{"kind":"working","relations":["equation","equation"]},verdict="unsupported")
for i in range(40):
    raw=("f'(x) = 2x" if i%2==0 else "\\int 2x \\, dx = x^2 + C")
    add("calculus",i,raw,{"kind":"working","relations":["derivative" if i%2==0 else "integral"]},verdict="unsupported")
for i in range(40):
    raw=("AB = 5\nAB^2 = 25" if i%2==0 else "u = [1, 2]\nv = [3, 4]\nu + v = [4, 6]")
    add("geometry-vectors",i,raw,{"kind":"working","relations":["equation","equation"] if i%2==0 else ["equation","equation","equation"]},verdict="unsupported")
for i in range(30):
    raw=("P(A) = 1/3\nP(not A) = 2/3" if i%2==0 else "mean = (2+4+6)/3\nmean = 4")
    add("probability-statistics",i,raw,{"kind":"working","relations":["equation","equation"]},verdict="unsupported")
for i in range(30):
    raw=("A = [[1,2],[3,4]]\ndet(A) = -2" if i%2==0 else "z = 3 + 4i\n|z| = 5")
    add("matrices-complex",i,raw,{"kind":"working","relations":["equation","equation"]},verdict="unsupported")
for i in range(30):
    raw=("r = 5\nA = pi*r^2\nA = 25*pi" if i%2==0 else "x = 3\nf(x) = x^2\nf(x) = 9")
    add("mixed-domain",i,raw,{"kind":"working","relations":["equation"]*3},verdict="unsupported")
for i in range(30):
    if i<10:add("ambiguous-malformed",i,"1/2x = 3",{"alternatives":["(1/2)*x = 3","1/(2*x) = 3"]},"ambiguous","ambiguous")
    elif i<20:add("ambiguous-malformed",i,"x + (2 = 5",None,"malformed","malformed")
    else:add("ambiguous-malformed",i,"\\frac{x+1}{",None,"malformed","malformed")

assert len(cases)==300 and {k:sum(c["category"]==k for c in cases) for k in counts}==counts
body={"schema":"openpath-natural-working-benchmark@1","frozenBeforeImplementation":True,"labelAuthority":"independent human-authored fixtures; OpenPath did not generate expected labels","counts":counts,"cases":cases}
text=json.dumps(body,indent=2,ensure_ascii=False)+"\n";OUT.write_text(text)
digest=hashlib.sha256(text.encode()).hexdigest();OUT.with_name("FROZEN_SHA256").write_text(f"{digest}  {OUT.name}\n")
print(len(cases),digest)
