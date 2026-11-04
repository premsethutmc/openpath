#!/usr/bin/env python3
import json
from pathlib import Path
cases=[]
def add(cat,i,raw,parse,verdict="unsupported",first=None):cases.append({"id":f"d4-adv-{cat}-{i:02d}","category":cat,"raw":raw,"expectedParseClassification":parse,"expectedMathematicalVerdict":verdict,"expectedFirstInvalidStep":first,"labelAuthority":"independently authored before adversarial execution"})
for i in range(10):add("ambiguous-division",i,f"{i+1}/{i+2}x = 1","ambiguous","ambiguous")
for i in range(10):add("missing-parenthesis",i,f"(x+{i+1} = {i+2}","malformed","malformed")
for i in range(10):add("precedence",i,f"x + {i+2}*y^{2} = 0","parsed")
for i in range(10):add("malformed-latex",i,r"\frac{x+1}{","malformed","malformed")
for i in range(10):add("scoped-symbol",i,f"x_{i} = {i}\nx_{i} + 1 = {i+1}","parsed")
for i in range(10):add("invalid-chain",i,f"x + {i+1} = {i+3}\nx = 3","parsed","invalid",0)
for i in range(10):add("missing-branch",i,f"x^2 = {(i+1)**2}\nx = {i+1}","parsed","incomplete")
for i in range(10):add("invalid-restriction",i,"x != 0\nx/x = 0","parsed","invalid",1)
for i in range(10):add("conflicting-notation",i,"x = ≤ 3","malformed","malformed")
for i in range(10):add("resource",i,"("*40+"x"+")"*40,"resource-exhausted","resource-exhausted")
assert len(cases)==100
Path(__file__).with_name("adversarial-cases.v1.json").write_text(json.dumps({"schema":"openpath-natural-working-adversarial@1","cases":cases},indent=2)+"\n")
