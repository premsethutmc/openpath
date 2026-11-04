"""Independent exact SymPy cross-check; student-step labels remain hand-authored."""
import json
from pathlib import Path
import sympy as s
x=s.symbols('x', real=True)
def E(a):
 k=a['kind']
 if k=='constant':return s.Rational(a['value'])
 if k=='variable':return x
 if k=='add':return sum(map(E,a['terms']))
 if k=='multiply':return s.prod(map(E,a['factors']))
 if k=='power':return E(a['base'])**a['exponent']
 return getattr(s,k)(E(a['argument']))
cases=json.loads(Path(__file__).with_name('independent-cases.v1.json').read_text())['cases'];checked=failures=0
for c in cases:
 if c['expected']['classification']!='verified':continue
 p=c['problem'];w=c['working'];ok=True
 try:
  if p['task']=='derivative':ok=s.simplify(E(w[-1]['claim']['value'])-s.diff(E(p['expression']),x,p.get('order',1)))==0
  elif p['task']=='indefinite-integral':ok=w[-1]['claim'].get('constantIncluded') and s.simplify(s.diff(E(w[-1]['claim']['value']),x)-E(p['integrand']))==0
  elif p['task']=='definite-integral':
   if p.get('improper'):want=s.integrate(E(p['integrand']),(x,s.Rational(p['lower']),s.oo))
   else:want=s.integrate(E(p['integrand']),(x,s.Rational(p['lower']),s.Rational(p['upper'])))
   ok=s.simplify(s.Rational(w[-1]['claim']['value'])-want)==0
  elif p['task']=='limit':
   direction={'left':'-','right':'+','both':'+'}.get(p.get('side','both'),'+');at={'infinity':s.oo,'-infinity':-s.oo}.get(p['approach'],s.Rational(p['approach']));want=s.limit(E(p['expression']),x,at,dir=direction);v=w[-1]['claim']['value'];got=s.Rational(v['value']) if v['kind']=='finite' else s.oo if v['kind']=='positive-infinity' else -s.oo if v['kind']=='negative-infinity' else None;ok=got==want
  elif p['task']=='continuity':ok=bool(w[-1]['claim']['value'])==(s.simplify(E(p['left']).subs(x,s.Rational(p['point']))-E(p['right']).subs(x,s.Rational(p['point'])))==0)
  else:continue
  checked+=1;failures+=not ok
  if not ok:print('FAIL',c['id'])
 except Exception as e:checked+=1;failures+=1;print('ERROR',c['id'],e)
result={'sympy':s.__version__,'checked':checked,'failures':failures};Path(__file__).with_name('sympy-results.v1.json').write_text(json.dumps(result,indent=2)+'\n');print(result);raise SystemExit(bool(failures))
