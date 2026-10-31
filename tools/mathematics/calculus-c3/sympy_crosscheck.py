"""Independent SymPy checks of verified C3 mathematical identities."""
import json
from pathlib import Path
import sympy as s
x,u=s.symbols('x u',real=True)
def E(a):
 k=a['kind']
 if k=='constant':return s.Rational(a['value'])
 if k=='variable':return {'x':x,'u':u}[a['name']]
 if k=='add':return sum(map(E,a['terms']))
 if k=='multiply':return s.prod(map(E,a['factors']))
 if k=='power':return E(a['base'])**a['exponent']
 return getattr(s,k)(E(a['argument']))
cases=json.loads(Path(__file__).with_name('independent-cases.v1.json').read_text())['cases'];checked=failures=0
for c in cases:
 if c['expected']['classification']!='verified':continue
 p=c['problem'];w=c['working'];ok=True
 try:
  if p['task']=='substitution':
   setup=w[0]['claim'];sub=E(setup['expression']);du=E(setup['differential']);trans=E(setup['transformedIntegrand']);ok=s.simplify(s.diff(sub,x)-du)==0 and s.simplify(trans.subs(u,sub)*du-E(p['integrand']))==0
  elif p['task']=='integration-by-parts':
   z=w[0]['claim'];ok=s.simplify(E(z['u'])*E(z['dv'])-E(p['integrand']))==0 and s.simplify(s.diff(E(z['u']),x)-E(z['du']))==0 and s.simplify(s.diff(E(z['v']),x)-E(z['dv']))==0 and s.simplify(s.diff(E(w[-1]['claim']['expression']),x)-E(p['integrand']))==0
  elif p['task']=='partial-fractions':
   # The engine's exact polynomial identity is cross-checked independently by SymPy.apart.
   den=s.Integer(1)
   for f in p['linearFactors']:den*=((x-s.Rational(f['root']))**f['multiplicity'])
   for f in p['quadraticFactors']:den*=x*x+s.Rational(f['p'])*x+s.Rational(f['q'])
   num=sum(s.Rational(a)*x**i for i,a in enumerate(p['numerator']));z=w[0]['claim'];rhs=sum(s.Rational(a)*x**i for i,a in enumerate(z['quotient']))
   for t in z['linearTerms']:rhs+=s.Rational(t['coefficient'])/(x-s.Rational(t['root']))**t['power']
   for t in z['quadraticTerms']:rhs+=(s.Rational(t['linear'])*x+s.Rational(t['constant']))/(x*x+s.Rational(t['p'])*x+s.Rational(t['q']))
   ok=s.cancel(num/den-rhs)==0
  elif p['task']=='lhopital':
   z=w[0]['claim'];ok=E(z['numerator']).subs(x,s.Rational(p['approach']))==0 and E(z['denominator']).subs(x,s.Rational(p['approach']))==0 and s.simplify(s.diff(E(z['numerator']),x)-E(z['derivedNumerator']))==0 and s.simplify(s.diff(E(z['denominator']),x)-E(z['derivedDenominator']))==0
  elif p['task']=='piecewise-integral':
   want=sum(s.integrate(E(z['integrand']),(x,s.Rational(z['lower']),s.Rational(z['upper']))) for z in p['pieces']);ok=s.Rational(w[0]['claim']['total'])==want
  elif p['task']=='improper-family' and p['family']=='p-tail':
   a=s.Rational(p['parameter']);want=a>1;ok=w[0]['claim']['converges']==want
  else:continue
  checked+=1;failures+=not ok
  if not ok:print('FAIL',c['id'])
 except Exception as e:checked+=1;failures+=1;print('ERROR',c['id'],e)
result={'sympy':s.__version__,'checked':checked,'failures':failures};Path(__file__).with_name('sympy-results.v1.json').write_text(json.dumps(result,indent=2)+'\n');print(result);raise SystemExit(bool(failures))
