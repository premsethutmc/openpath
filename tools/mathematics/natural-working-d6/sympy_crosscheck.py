import json,time
from pathlib import Path
import sympy as s
x=s.symbols('x');rows=[];t=time.perf_counter()
for i in range(25):
 v=i%7+1;k=i%5+1;c=i%4;rows.append({'id':f'sub-{i}','area':'substitution','passed':s.expand(k*x**2+c).subs(x,v)==k*v*v+c})
for i in range(25):
 a=i+1;M=s.Matrix([[a,a+1],[a+2,a+4]]);rows.append({'id':f'det-{i}','area':'determinant','passed':M.det()==a*(a+4)-(a+1)*(a+2)})
for i in range(25):
 n=i%8+2;rows.append({'id':f'derivative-{i}','area':'derivative','passed':s.diff(x**n,x)==n*x**(n-1)})
for i in range(25):
 v=i%9+1;k=i%4+1;c=i%3;f=k*x+c;rows.append({'id':f'function-{i}','area':'function','passed':f.subs(x,v)==k*v+c})
out={'oracle':'SymPy '+s.__version__,'total':len(rows),'passed':sum(r['passed'] for r in rows),'failed':sum(not r['passed'] for r in rows),'elapsedMs':(time.perf_counter()-t)*1000,'results':rows};Path(__file__).with_name('sympy-crosscheck-results.v1.json').write_text(json.dumps(out,indent=2)+'\n');print({k:out[k] for k in ['oracle','total','passed','failed','elapsedMs']})
