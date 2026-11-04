"""Related-defect scan for the aofclass pattern (codomain/range/extremum built from endpoint values).
Independent of production code; the stored answer is used only for the final comparison.
  aorange : range of f:R->R quadratic, from vertex & sign of leading coefficient
  aqabs   : absolute max/min on [lo,hi] using endpoints AND every real critical point inside the interval
  apinvf  : Mobius f:(R-{p})->(R-{q}) bijection claim: q must be the horizontal asymptote a/c, p = -d/c (checked by solving f(x)=y)
usage: python3 scan_range_codomain.py <export>/q"""
import sys,json,re
from sympy import symbols,Poly,diff,solveset,S,Rational,nsimplify,sympify,Eq,solve,limit,oo,Interval
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,convert_xor
T=standard_transformations+(implicit_multiplication_application,convert_xor)
x,y=symbols('x y')
def P(s):
    s=s.replace('−','-').replace('²','**2').replace('³','**3').replace('⁴','**4').strip().rstrip('.')
    return parse_expr(s,transformations=T,local_dict={'x':x})
d=sys.argv[1];res={}
def stored_interval(a): return a.replace('−','-')
# --- aorange
bad=[];n=0
for l in open(f'{d}/aorange.jsonl'):
    r=json.loads(l);n+=1
    f=P(re.search(r'f\(x\) = (.*?)\. Write',r['prompt']).group(1))
    p=Poly(f,x);a,b,c=[p.coeff_monomial(x**k) for k in (2,1,0)]
    v=c-b*b/(4*a)
    exp=f'(-oo, {v}]' if a<0 else f'[{v}, oo)'
    got=stored_interval(r['answer']).replace('∞','oo').replace('−','-')
    got=re.sub(r'\s+','',got);exp2=re.sub(r'\s+','',exp)
    if got!=exp2: bad.append((r['id'],r['answer'],exp))
res['aorange']={'n':n,'bad':bad}
# --- aqabs
bad=[];n=0
for l in open(f'{d}/aqabs.jsonl'):
    r=json.loads(l);n+=1
    m=re.search(r'absolute (maximum|minimum) value of f\(x\) = (.*?) on the interval \[(.*?), (.*?)\]',r['prompt'])
    f=P(m.group(2));lo=P(m.group(3));hi=P(m.group(4))
    crit=[c for c in solveset(diff(f,x),x,Interval(lo,hi)) ]
    vals=[f.subs(x,t) for t in [lo,hi]+crit]
    endonly=[f.subs(x,t) for t in [lo,hi]]
    want=max(vals) if m.group(1)=='maximum' else min(vals)
    ends=max(endonly) if m.group(1)=='maximum' else min(endonly)
    if sympify(r['answer'].replace('−','-'))!=want: bad.append((r['id'],r['answer'],str(want)))
    res.setdefault('aqabs_endpoint_only_would_differ',[]).append(r['id']) if ends!=want else None
res['aqabs']={'n':n,'bad':bad}
# --- apinvf Mobius
bad=[];n=0
for l in open(f'{d}/apinvf.jsonl'):
    r=json.loads(l);n+=1
    m=re.search(r'f : ℝ − \{(.*?)\} → ℝ − \{(.*?)\}, f\(x\) = (.*?), is a bijection',r['prompt'])
    if not m: continue
    p=P(m.group(1));q=P(m.group(2));f=P(m.group(3))
    # y in range  <=> x = f^-1(y) exists with x != p: solve f(x)=y
    sol=solve(Eq(f,y),x)
    if len(sol)!=1: bad.append((r['id'],'not one-one',str(sol)));continue
    g=sol[0]
    # excluded domain point must be the pole of f; excluded value must be the only y with no preimage (pole of g)
    pole_f=solve(1/f,x) if False else None
    den_f=f.as_numer_denom()[1];den_g=g.as_numer_denom()[1]
    pf=set(solve(den_f,x));qg=set(solve(den_g,y))
    if pf!={p} or qg!={q}: bad.append((r['id'],f'pole(f)={pf} vs {p}; pole(f^-1)={qg} vs {q}'))
res['apinvf']={'n':n,'bad':bad}
print(json.dumps({k:(v if isinstance(v,list) else {'n':v['n'],'bad':len(v['bad']),'examples':v['bad'][:3]}) for k,v in res.items()} ,ensure_ascii=False,indent=1)[:3000])
json.dump(res,open('scan_range_codomain.result.json','w'),ensure_ascii=False,default=str)
