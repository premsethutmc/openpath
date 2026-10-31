#!/usr/bin/env python3
"""Independent exact checks for the supported frozen algebra/trigonometry subset."""
import json,re
from pathlib import Path
import sympy as s
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,convert_xor
T=standard_transformations+(implicit_multiplication_application,convert_xor)
data=json.loads(Path(__file__).with_name("frozen-natural-working-cases.v1.json").read_text());checks=[]
def expr(x):return parse_expr(re.sub(r"(?<=\d)(?=[A-Za-z])","*",x),transformations=T,evaluate=True)
for c in data["cases"]:
 if c["category"]=="algebra-equations":
  lines=c["raw"].splitlines()
  if c["id"].endswith(tuple(f"{i:03d}" for i in range(0,60,3))):
   x=s.symbols("x");lhs,rhs=lines[0].split("=");value=s.solve(s.Eq(expr(lhs),expr(rhs)),x);claimed=expr(lines[-1].split("=")[1]);ok=claimed in value
  elif int(c["id"][-3:])%3==1:ok=s.expand(expr(lines[0])-expr(lines[1]))==0
  else:
   x=s.symbols("x");lhs,rhs=lines[0].split("=");sol=set(s.solve(s.Eq(expr(lhs),expr(rhs)),x));claimed={expr(lines[1].split("=")[1])};ok=claimed<sol
  checks.append({"id":c["id"],"exact":bool(ok)})
 if c["category"]=="trigonometry-functions" and int(c["id"][-3:])%2==0:
  a,b=c["raw"].splitlines();checks.append({"id":c["id"],"exact":s.trigsimp(expr(a)-expr(b))==0})
out={"oracle":"SymPy 1.14 exact symbolic evaluation","checks":len(checks),"passed":sum(x["exact"] for x in checks),"failed":[x for x in checks if not x["exact"]]};Path(__file__).with_name("sympy-crosscheck-results.v1.json").write_text(json.dumps(out,indent=2)+"\n");print(out)
