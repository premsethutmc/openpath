#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
H=Path(__file__).parent
C=lambda v:{'kind':'constant','value':str(v)};V=lambda n:{'kind':'variable','name':n};P=lambda x,n:{'kind':'power','base':x,'exponent':n};M=lambda *x:{'kind':'multiply','factors':list(x)};A=lambda *x:{'kind':'add','terms':list(x)}
def item(i,cat,raw,fmt='natural',parse='parsed',relation=None,problem=None,assessment=None,note='independently authored before D7 implementation'):
 return {'id':f'd7-{cat}-{i:03d}','category':cat,'provenance':note,'input':{'format':fmt,'text':raw},'expectedParse':parse,'expectedRelation':relation,'problem':problem,'expectedAssessment':assessment}
cats={k:[] for k in ['derivative','function','implicit','equivalence','multiline','adversarial']}
# Derivatives: varied symbols, variables, orders, and notations. The five exposed g-prime cases are separate regressions, not copied here.
funcs=['p','q','R','velocity','phi']; vars=['x','t','u','s','z']
for i in range(60):
 f=funcs[i%len(funcs)];v=vars[(i//len(funcs))%len(vars)];n=i%5+2;order=2 if 30<=i<50 else 1;partial=i>=50
 expr=P(V(v),n); coef=n*(n-1) if order==2 else n; exp=n-order; result=C(str(coef)) if exp==0 else M(C(str(coef)),P(V(v),exp))
 if partial:
  raw=(f'\\frac{{\\partial {f}}}{{\\partial {v}}} = {n}{v}^{n-1}' if i%2 else f'∂{f}/∂{v} = {n}{v}^{n-1}'); rel={'kind':'derivative','functionName':f,'dependent':f,'variable':v,'order':1,'partial':True}; assess='unsupported'
 elif order==2:
  styles=[f"{f}''({v}) = {coef}{v}^{exp}",f'{f}′′({v}) = {coef}{v}^{exp}',f'\\frac{{d^2 {f}}}{{d{v}^2}} = {coef}{v}^{exp}',f'd^2{f}/d{v}^2 = {coef}{v}^{exp}'];raw=styles[i%4];rel={'kind':'derivative','functionName':f if '(' in raw else None,'dependent':f,'variable':v,'order':2,'partial':False};assess='verified'
 else:
  styles=[f"{f}'({v}) = {coef}{v}^{exp}",f'{f}′({v}) = {coef}{v}^{exp}',f'{f}^{{\\prime}}({v}) = {coef}{v}^{exp}',f'd{f}/d{v} = {coef}{v}^{exp}',f'\\frac{{d{f}}}{{d{v}}} = {coef}{v}^{exp}',f'\\frac{{d}}{{d{v}}}{f}({v}) = {coef}{v}^{exp}'];raw=styles[i%6];rel={'kind':'derivative','functionName':f if ('(' in raw and ('/' not in raw or raw.startswith('\\frac{d}{')) ) else None,'dependent':f,'variable':v,'order':1,'partial':False};assess='verified'
 problem={'domain':'calculus','task':'derivative','expression':expr,'variable':v,'order':order}
 cats['derivative'].append(item(i,'derivative',raw,'latex' if '\\' in raw else 'natural',relation=rel,problem=problem,assessment=assess))
# Function application/definition. Typed interpretation records symbol and nested argument text; supported polynomial evaluations are assessed.
for i in range(40):
 f=['P','q','rate','F'][i%4];v=['x','t','u'][i%3];k=i%4+1;c=i%3;value=i%6+1;out=k*value+c
 if i<28:
  raw=f'{f}({v}) = {k}{v} + {c}\n{f}({value}) = {out}';rel={'kind':'function','functionName':f,'argument':str(value),'nested':False};problem={'domain':'function','task':'evaluate','f':{'kind':'polynomial','coefficients':[str(c),str(k)]},'input':str(value)};assess='verified'
 else:
  inner=['g(x)','sin(x)','x+1'][i%3];raw=f'{f}({inner})';rel={'kind':'function','functionName':f,'argument':inner,'nested':True};problem=None;assess=None
 cats['function'].append(item(i,'function',raw,relation=rel,problem=problem,assessment=assess))
# Precedence/implicit multiplication, plus genuine ambiguity.
for i in range(40):
 v=['x','t','y'][i%3];style=i%8
 if style==0:raw=f'-{v}^2';expr=M(C('-1'),P(V(v),2));cl='parsed'
 elif style==1:raw=f'(-{v})^2';expr=P(M(C('-1'),V(v)),2);cl='parsed'
 elif style==2:raw=f'2{v}^2';expr=M(C('2'),P(V(v),2));cl='parsed'
 elif style==3:raw=f'2({v}+1)^2';expr=M(C('2'),P(A(V(v),C('1')),2));cl='parsed'
 elif style==4:raw=f'(x+{i%4+1})(x-{i%3+1})';expr=None;cl='parsed'
 elif style==5:raw=f'2sin({v})';expr=M(C('2'),{'kind':'sin','argument':V(v)});cl='parsed'
 elif style==6:raw=f'{v}sqrt({v}+1)';expr=M(V(v),{'kind':'root','radicand':A(V(v),C('1')),'index':2});cl='parsed'
 else:raw=f'1/2{v}';expr=None;cl='ambiguous'
 cats['implicit'].append(item(i,'implicit',raw,parse=cl,relation={'kind':'expression','expression':expr} if expr else None))
# Equivalent spellings; reference is mathematical interpretation rather than textual AST identity.
for i in range(40):
 v=['x','a','t'][i%3];kind=i%4
 if kind==0: variants=[f'sqrt({v}+1)',f'√({v}+1)',f'\\sqrt{{{v}+1}}'];raw=variants[(i//4)%3];expr={'kind':'root','radicand':A(V(v),C('1')),'index':2}
 elif kind==1: variants=[f'{v}^2',f'{v}²',f'{v}^{{2}}'];raw=variants[(i//4)%3];expr=P(V(v),2)
 elif kind==2: variants=[f'sin^2({v})',f'(sin({v}))^2',f'\\sin^2({v})'];raw=variants[(i//4)%3];expr=P({'kind':'sin','argument':V(v)},2)
 else: variants=[f'ln({v}^2+1)',f'log({v}²+1)',f'\\ln({v}^2+1)'];raw=variants[(i//4)%3];expr={'kind':'log','argument':A(P(V(v),2),C('1'))}
 cats['equivalence'].append(item(i,'equivalence',raw,'latex' if '\\' in raw else 'natural',relation={'kind':'expression','expression':expr}))
# Multiline complete working, including invalid final lines.
for i in range(30):
 v=['x','t','u'][i%3];n=i%4+2;wrong=i>=20;answer=n+1 if wrong else n;raw=f"p'({v}) = {answer}{v}^{n-1}";problem={'domain':'calculus','task':'derivative','expression':P(V(v),n),'variable':v};cats['multiline'].append(item(i,'multiline',raw,relation={'kind':'derivative','functionName':'p','dependent':'p','variable':v,'order':1,'partial':False},problem=problem,assessment='invalid' if wrong else 'verified'))
# Ambiguous, malformed, resource and syntactically valid but mathematically invalid inputs.
for i in range(40):
 s=i%4
 if s==0:raw=f'1/{i%7+2}x = 3';cl='ambiguous'
 elif s==1:raw='\\frac{x+1}{';cl='malformed'
 elif s==2:raw='('*40+'x'+')'*40;cl='resource-exhausted'
 else:raw="q'(x) = 99x";cl='parsed'
 prob={'domain':'calculus','task':'derivative','expression':P(V('x'),2),'variable':'x'} if s==3 else None;assessment='invalid' if s==3 else None;rel={'kind':'derivative','functionName':'q','dependent':'q','variable':'x','order':1,'partial':False} if s==3 else None
 cats['adversarial'].append(item(i,'adversarial',raw,'latex' if '\\' in raw else 'natural',cl,rel,prob,assessment))
assert [len(cats[k]) for k in cats]==[60,40,40,40,30,40]
# fixed per-category holdout counts total 75
hc={'derivative':18,'function':12,'implicit':12,'equivalence':12,'multiline':9,'adversarial':12};dev=[];hold=[]
for k,items in cats.items(): cut=len(items)-hc[k];dev+=items[:cut];hold+=items[cut:]
assert len(dev)==175 and len(hold)==75
def write(name,cases,sealed):
 body={'schema':'openpath-notation-d7-benchmark@1','frozenBeforeImplementation':True,'sealedUntilFinalEvaluation':sealed,'cases':cases};text=json.dumps(body,indent=2)+'\n';(H/name).write_text(text);return hashlib.sha256(text.encode()).hexdigest()
d=write('development-cases.v1.json',dev,False);h=write('sealed-holdout-cases.v1.json',hold,True);(H/'FROZEN_SHA256').write_text(f'{d}  development-cases.v1.json\n{h}  sealed-holdout-cases.v1.json\n');print(len(dev),len(hold),d,h)
