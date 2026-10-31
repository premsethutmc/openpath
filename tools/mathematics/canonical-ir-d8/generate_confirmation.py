import json,hashlib
from pathlib import Path
H=Path(__file__).parent;V=lambda n:{'kind':'variable','name':n};P=lambda x,n:{'kind':'power','base':x,'exponent':n};cases=[]
def add(i,cat,l,r,same,kind='direct'):cases.append({'id':f'd8-confirm-{cat}-{i}','category':cat,'provenance':'new evaluation set frozen after the additive meaning/provenance separation','inputKind':kind,'left':l,'right':r,'expectedSameIdentity':same})
for i in range(5):v=['a','b','m','n','q'][i];add(i,'notation',{'format':'natural','text':f'{v}²'},{'format':'latex','text':f'{v}^{{2}}'},True,'natural')
for i in range(5):v=['a','b','m','n','q'][i];add(i,'derivative',{'format':'natural','text':f"r'({v})=2{v}"},{'format':'latex','text':f'r^{{\\prime}}({v})=2{v}'},True,'natural')
for i in range(5):add(i,'scope',{'mathematicalType':'integral','value':{'integrand':P(V('s'),i+1),'boundVariable':'s'}},{'mathematicalType':'integral','value':{'integrand':P(V('w'),i+1),'boundVariable':'w'}},True)
for i in range(5):base={'mathematicalType':'symbolic-expression','value':P(V('x'),-1),'domainRestrictions':['nonzero:x']};add(i,'domain',base,{**base,'domainRestrictions':[]},False)
for i in range(5):base={'mathematicalType':'exact-scalar','value':str(i+1),'symbol':{'name':'x','scope':'s'},'verificationStatus':'verified'};add(i,'binding',base,{**base,'verificationStatus':'unverified'},False)
for i in range(5):base={'mathematicalType':'proof-claim','value':P(V('x'),2),'dependencies':['p'],'verificationStatus':'verified'};add(i,'certificate',base,{**base,'dependencies':['forged']},False)
body={'schema':'openpath-canonical-ir-confirmation@1','frozenBeforeExecution':True,'cases':cases};t=json.dumps(body,indent=2)+'\n';(H/'post-refinement-confirmation-cases.v1.json').write_text(t);(H/'CONFIRMATION_SHA256').write_text(hashlib.sha256(t.encode()).hexdigest()+'  post-refinement-confirmation-cases.v1.json\n')
