#!/usr/bin/env python3
import json
from pathlib import Path
import sympy as s
x=s.symbols("x");checks=[]
def add(area,i,ok):checks.append({"id":f"d5-oracle-{area}-{i:02d}","area":area,"exact":bool(ok)})
for i in range(20):
 add("function",i,(x**2+i).subs(x,i+1)==(i+1)**2+i)
 n=i%8+2;add("derivative",i,s.diff(x**n,x)==n*x**(n-1))
 k=i+1;add("integral",i,s.diff(s.integrate(k*x,x),x)==k*x)
 a=s.Matrix([i,i+1]);b=s.Matrix([i+2,i+3]);add("vector",i,a+b==s.Matrix([2*i+2,2*i+4]))
 A=s.Matrix([[i+1,i+2],[i+3,i+4]]);add("determinant",i,A.det()==-2)
 triples=[(3,4,5),(5,12,13),(8,15,17),(7,24,25),(20,21,29)];u,v,m=triples[i%len(triples)];add("complex-modulus",i,s.sqrt(u*u+v*v)==m)
out={"oracle":f"SymPy {s.__version__} exact arithmetic","checks":len(checks),"passed":sum(z["exact"] for z in checks),"failed":[z for z in checks if not z["exact"]]};Path(__file__).with_name("sympy-crosscheck-results.v1.json").write_text(json.dumps(out,indent=2)+"\n");print(out)
