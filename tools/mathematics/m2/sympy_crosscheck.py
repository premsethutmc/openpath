"""Independent SymPy cross-check of the exact verified M2 corpus cases."""
import json
from pathlib import Path
import sympy as s

cases=json.loads(Path(__file__).with_name("independent-cases.v1.json").read_text())["cases"]
checked=failures=0
def exact(v):
 out=s.Rational(v["rational"])
 for t in v.get("radicals",[]):out+=s.Rational(t["coefficient"])*s.root(t["radicand"],t["index"])
 return s.simplify(out)
for c in cases:
 if c["expected"]["classification"]!="verified" or not c["working"]:continue
 p=c["problem"];r=c["working"][-1]["result"];ok=True
 try:
  if p["domain"]=="trigonometry" and p["task"]=="value":ok=s.simplify(exact(r["value"])-getattr(s,p["fn"])(s.pi*s.Rational(p["degrees"],180)))==0
  elif p["domain"]=="exponential-log" and p["task"]=="exponential-equation":
   x=s.Rational(r["values"][0]);ok=s.Rational(p["base"])**(s.Rational(p["left"]["a"])*x+s.Rational(p["left"]["b"]))==s.Rational(p["base"])**s.Rational(p["rightExponent"])
  elif p["domain"]=="exponential-log" and p["task"]=="log-equation":
   x=s.Rational(r["values"][0]);arg=s.Rational(p["argument"]["a"])*x+s.Rational(p["argument"]["b"]);ok=arg>0 and s.simplify(arg-s.Rational(p["base"])**p["rhs"])==0
  elif p["domain"]=="sequence-series" and r["kind"]=="exact":
   a=s.Rational(p["first"]);n=p.get("n",1)
   if p["task"]=="ap-term":want=a+(n-1)*s.Rational(p["difference"])
   elif p["task"]=="ap-sum":want=n*(2*a+(n-1)*s.Rational(p["difference"]))/2
   elif p["task"]=="gp-term":want=a*s.Rational(p["ratio"])**(n-1)
   elif p["task"]=="gp-sum":want=s.summation(a*s.Rational(p["ratio"])**s.Symbol('k'),(s.Symbol('k'),0,n-1))
   else:continue
   ok=s.simplify(exact(r["value"])-want)==0
  elif p["domain"]=="radical" and r["kind"]=="exact":
   if p["task"]=="sqrt":want=s.sqrt(p["radicand"])
   elif p["task"]=="nth-root":want=s.real_root(p["radicand"],p["index"])
   elif p["task"]=="rationalize":want=s.Rational(p["numerator"])/s.sqrt(p["radicand"])
   else:continue
   ok=s.simplify(exact(r["value"])-want)==0
  else:continue
  checked+=1;failures+=not ok
  if not ok:print("FAIL",c["id"])
 except Exception as e:checked+=1;failures+=1;print("ERROR",c["id"],e)
result={"sympy":s.__version__,"checked":checked,"failures":failures}
Path(__file__).with_name("sympy-results.v1.json").write_text(json.dumps(result,indent=2)+"\n")
print(result)
raise SystemExit(bool(failures))
