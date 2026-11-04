import json,hashlib
from pathlib import Path
H=Path(__file__).parent
C=lambda v:{'kind':'constant','value':str(v)};V=lambda n:{'kind':'variable','name':n};P=lambda x,n:{'kind':'power','base':x,'exponent':n};A=lambda *x:{'kind':'add','terms':list(x)};M=lambda *x:{'kind':'multiply','factors':list(x)}
def case(i,cat,left,right,same,kind='direct',note='independently authored before D8 implementation'):
 return {'id':f'd8-{cat}-{i:03d}','category':cat,'provenance':note,'inputKind':kind,'left':left,'right':right,'expectedSameIdentity':same}
cats={k:[] for k in ['notation','function-derivative','scope','domain','binding','certificate']}
# Equivalent and deliberately distinct parser inputs.
for i in range(40):
 v=['x','t','u','z'][i%4];k=i%5
 if k==0:l={'format':'natural','text':f'{v}^2'};r={'format':'latex','text':f'{v}^{{2}}'};same=True
 elif k==1:l={'format':'natural','text':f'sqrt({v}+1)'};r={'format':'latex','text':f'\\sqrt{{{v}+1}}'};same=True
 elif k==2:l={'format':'natural','text':f'sin^2({v})'};r={'format':'natural','text':f'(sin({v}))^2'};same=True
 elif k==3:l={'format':'natural','text':f'{v}+1'};r={'format':'natural','text':f'1+{v}'};same=True
 else:l={'format':'natural','text':f'{v}^2'};r={'format':'natural','text':f'{v}^3'};same=False
 cats['notation'].append(case(i,'notation',l,r,same,'natural'))
# Derivative/function identities. The exposed partial and nested metadata shapes are represented here.
for i in range(40):
 f=['f','g','rate','phi'][i%4];v=['x','t'][i%2];k=i%5
 if k==0:l={'format':'natural','text':f"{f}'({v})=2{v}"};r={'format':'latex','text':f'{f}^{{\\prime}}({v})=2{v}'};same=True
 elif k==1:l={'format':'natural','text':f"{f}'({v})=2{v}"};r={'format':'natural','text':f"{f}''({v})=2{v}"};same=False
 elif k==2:l={'format':'natural','text':f'∂{f}/∂{v}=2{v}'};r={'format':'latex','text':f'\\frac{{\\partial {f}}}{{\\partial {v}}}=2{v}'};same=True
 elif k==3:l={'format':'natural','text':f'{f}({v}+1)'};r={'format':'natural','text':f'{f}(1+{v})'};same=True
 else:l={'format':'natural','text':f'{f}(g({v}))'};r={'format':'natural','text':f'{f}({v})'};same=False
 cats['function-derivative'].append(case(i,'function-derivative',l,r,same,'natural'))
# Scope: bound renaming is allowed only when capture-free; free variable names remain semantic.
for i in range(30):
 k=i%3
 if k==0:l={'mathematicalType':'integral','value':{'integrand':P(V('x'),2),'boundVariable':'x'}};r={'mathematicalType':'integral','value':{'integrand':P(V('u'),2),'boundVariable':'u'}};same=True
 elif k==1:l={'mathematicalType':'symbolic-expression','value':A(V('x'),V('y'))};r={'mathematicalType':'symbolic-expression','value':A(V('x'),V('z'))};same=False
 else:l={'mathematicalType':'integral','value':{'integrand':A(V('x'),V('u')),'boundVariable':'x'}};r={'mathematicalType':'integral','value':{'integrand':A(V('u'),V('u')),'boundVariable':'u'}};same=False
 cats['scope'].append(case(i,'scope',l,r,same))
# Restrictions and branch/domain data participate in identity.
for i in range(30):
 expr=M(A(P(V('x'),2),C('-1')),P(A(V('x'),C('-1')),-1));k=i%3
 l={'mathematicalType':'symbolic-expression','value':expr,'domainRestrictions':['nonzero:x-1'],'assumptions':['real:x']}
 if k==0:r={'mathematicalType':'symbolic-expression','value':expr,'domainRestrictions':['nonzero:x-1'],'assumptions':['real:x']};same=True
 elif k==1:r={'mathematicalType':'symbolic-expression','value':expr,'domainRestrictions':[],'assumptions':['real:x']};same=False
 else:r={'mathematicalType':'symbolic-expression','value':expr,'domainRestrictions':['nonzero:x-1'],'assumptions':['complex:x']};same=False
 cats['domain'].append(case(i,'domain',l,r,same))
# Binding identity includes type, scoped symbol, restrictions, obligations, and verification status.
for i in range(30):
 k=i%5;base={'mathematicalType':'exact-scalar','value':'3','symbol':{'name':'x','scope':'stage-a'},'assumptions':[],'domainRestrictions':[],'outstandingObligations':[],'verificationStatus':'verified'};other=json.loads(json.dumps(base));same=True
 if k==1:other['symbol']['scope']='stage-b';same=False
 elif k==2:other['mathematicalType']='probability';same=False
 elif k==3:other['verificationStatus']='unverified';same=False
 elif k==4:other['outstandingObligations']=['prove:x>0'];same=False
 cats['binding'].append(case(i,'binding',base,other,same))
# Certificate claims: digest/provenance do not create mathematical identity; claim metadata does.
for i in range(30):
 k=i%5;base={'mathematicalType':'proof-claim','value':{'before':P(V('x'),2),'after':P(V('x'),2)},'assumptions':['real:x'],'domainRestrictions':[],'dependencies':['problem'],'verificationStatus':'verified'};other=json.loads(json.dumps(base));same=True
 if k==1:other['value']['after']=P(V('x'),3);same=False
 elif k==2:other['assumptions']=[];same=False
 elif k==3:other['dependencies']=['forged'];same=False
 elif k==4:other['verificationStatus']='unverified';same=False
 cats['certificate'].append(case(i,'certificate',base,other,same))
assert [len(cats[k]) for k in cats]==[40,40,30,30,30,30]
hc={'notation':12,'function-derivative':12,'scope':9,'domain':9,'binding':9,'certificate':9};dev=[];hold=[]
for k,items in cats.items():cut=len(items)-hc[k];dev+=items[:cut];hold+=items[cut:]
assert len(dev)==140 and len(hold)==60
def write(name,cases,sealed):
 body={'schema':'openpath-canonical-ir-benchmark@1','frozenBeforeImplementation':True,'sealedUntilFinalEvaluation':sealed,'cases':cases};t=json.dumps(body,indent=2)+'\n';(H/name).write_text(t);return hashlib.sha256(t.encode()).hexdigest()
d=write('development-cases.v1.json',dev,False);h=write('sealed-holdout-cases.v1.json',hold,True);(H/'FROZEN_SHA256').write_text(f'{d}  development-cases.v1.json\n{h}  sealed-holdout-cases.v1.json\n');print(len(dev),len(hold),d,h)
