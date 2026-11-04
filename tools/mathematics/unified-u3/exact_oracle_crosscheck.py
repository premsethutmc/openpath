"""300 exact SymPy cross-checks. These are supplemental, never corpus-label generation."""
import json,time
import sympy as s
x,y=s.symbols("x y", real=True); positive=s.symbols("p",positive=True); results=[]
def record(area,i,expected,actual,note): results.append({"id":f"{area}-{i:03}","area":area,"expected":expected,"actual":bool(actual),"match":expected==bool(actual),"note":note})
for i in range(50):
 a=i%9+1;b=i%7-3;lhs=s.expand((a*x+b)*(x+y));rhs=a*x**2+a*x*y+b*x+b*y+(1 if i%2 else 0);record("polynomial-rational",i,i%2==0,s.cancel(lhs-rhs)==0,"exact expansion")
for i in range(50):
 n=i%5+1;lhs=s.sin(n*x)**2+s.cos(n*x)**2;rhs=1+(1 if i%2 else 0);record("trigonometry",i,i%2==0,s.trigsimp(lhs-rhs)==0,"Pythagorean identity")
for i in range(50):
 n=i%7+1;lhs=s.log(positive**n);rhs=n*s.log(positive)+(1 if i%2 else 0);record("log-exp",i,i%2==0,s.simplify(s.expand_log(lhs,force=True)-rhs)==0,"positive-domain log power")
for i in range(50):
 n=i%8+1;lhs=s.sqrt((n*x)**2);rhs=n*s.Abs(x)+(1 if i%2 else 0);record("radicals",i,i%2==0,s.simplify(lhs-rhs)==0,"principal root")
for i in range(50):
 n=i%6+2;f=x**n+s.sin(x);candidate=n*x**(n-1)+s.cos(x)+(1 if i%2 else 0);record("calculus",i,i%2==0,s.simplify(s.diff(f,x)-candidate)==0,"exact derivative")
for i in range(50):
 n=i%6+1;sol=s.solveset(s.sin(x)-s.Rational(1,2),x,domain=s.S.Reals);candidate=sol if i%2==0 else s.FiniteSet(s.pi/6);record("solution-sets",i,i%2==0,sol==candidate,"complete periodic set versus principal value")
summary={"version":"unified-math-u3-oracle@1","total":len(results),"matched":sum(r["match"] for r in results),"inconclusive":0,"byArea":{a:sum(r["area"]==a for r in results) for a in sorted({r["area"] for r in results})},"results":results}
assert summary["total"]==300 and summary["matched"]==300
open(__file__.replace("exact_oracle_crosscheck.py","exact-oracle-results.v1.json"),"w").write(json.dumps(summary,indent=2)+"\n")
print(json.dumps({k:v for k,v in summary.items() if k!="results"}))
