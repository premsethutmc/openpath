import json,time
from pathlib import Path
import sympy as s
x,t,u=s.symbols('x t u');rows=[];start=time.perf_counter()
for i in range(40):
 v=[x,t,u][i%3];n=i%6+2;o=2 if i%4==0 else 1;claimed=s.diff(v**n,v,o);rows.append({'id':f'derivative-{i}','kind':'derivative','passed':claimed==s.factorial(n)/s.factorial(n-o)*v**(n-o)})
for i in range(20):
 v=[x,t][i%2];rows.append({'id':f'unary-{i}','kind':'precedence','passed':s.sympify(f'-{v}**2')==-(v**2) and (-v)**2==v**2})
for i in range(20):
 v=[x,t][i%2];rows.append({'id':f'trig-{i}','kind':'function-power','passed':s.trigsimp(s.sin(v)**2+s.cos(v)**2)==1})
for i in range(20):
 v=[x,u][i%2];rows.append({'id':f'radical-{i}','kind':'equivalent-notation','passed':s.sqrt(v+1)==s.Pow(v+1,s.Rational(1,2))})
out={'oracle':'SymPy '+s.__version__,'total':len(rows),'passed':sum(r['passed'] for r in rows),'failed':sum(not r['passed'] for r in rows),'elapsedMs':(time.perf_counter()-start)*1000,'results':rows};Path(__file__).with_name('sympy-crosscheck-results.v1.json').write_text(json.dumps(out,indent=2)+'\n');print({k:out[k] for k in ['oracle','total','passed','failed','elapsedMs']})
