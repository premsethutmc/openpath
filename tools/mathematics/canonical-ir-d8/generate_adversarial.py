import json,hashlib
from pathlib import Path
H=Path(__file__).parent;C=lambda v:{'kind':'constant','value':str(v)};V=lambda n:{'kind':'variable','name':n};P=lambda x,n:{'kind':'power','base':x,'exponent':n};cases=[]
def add(cat,left,right,same=False):
 for i in range(10):cases.append({'id':f'd8-adv-{cat}-{i:02d}','category':cat,'provenance':'independently authored before execution','left':left(i) if callable(left) else left,'right':right(i) if callable(right) else right,'expectedSameIdentity':same})
der=lambda order,var='x':{'mathematicalType':'natural-relation','value':{'kind':'derivative','notation':'ignored','functionName':'f','dependent':'f','variable':var,'order':order,'partial':False,'result':V(var)}}
add('changed-derivative-order',der(1),der(2));add('changed-variable',der(1,'x'),der(1,'t'))
add('variable-capture',{'mathematicalType':'integral','value':{'integrand':{'kind':'add','terms':[V('x'),V('u')]},'boundVariable':'x'}},{'mathematicalType':'integral','value':{'integrand':{'kind':'add','terms':[V('u'),V('u')]},'boundVariable':'u'}})
add('free-substitution',{'mathematicalType':'symbolic-expression','value':V('x')},{'mathematicalType':'symbolic-expression','value':V('y')})
base=lambda:{'mathematicalType':'symbolic-expression','value':P(V('x'),-1),'assumptions':['real:x'],'domainRestrictions':['nonzero:x'],'verificationStatus':'verified'}
add('missing-exclusion',lambda i:base(),lambda i:{**base(),'domainRestrictions':[]});add('real-complex-domain',lambda i:base(),lambda i:{**base(),'assumptions':['complex:x']})
add('principal-branch',{'mathematicalType':'complex-expression','value':{'operation':'sqrt','argument':V('z'),'branch':'principal'}},{'mathematicalType':'complex-expression','value':{'operation':'sqrt','argument':V('z'),'branch':'multivalued'}})
add('matrix-dimensions',{'mathematicalType':'matrix','value':{'kind':'matrix','value':[['1','0'],['0','1']],'rows':2,'columns':2}},{'mathematicalType':'matrix','value':{'kind':'matrix','value':[['1','0','0'],['0','1','0']],'rows':2,'columns':3}})
add('probability-assumption',{'mathematicalType':'probability','value':'1/2','assumptions':['independent:A,B']},{'mathematicalType':'probability','value':'1/2','assumptions':[]})
add('altered-dependencies',{'mathematicalType':'proof-claim','value':V('x'),'dependencies':['p'],'verificationStatus':'verified'},{'mathematicalType':'proof-claim','value':V('x'),'dependencies':['forged'],'verificationStatus':'verified'})
add('forged-verification',{'mathematicalType':'proof-claim','value':V('x'),'verificationStatus':'verified'},{'mathematicalType':'proof-claim','value':V('x'),'verificationStatus':'unverified'})
add('serialization-collision',{'mathematicalType':'metadata','value':{'a':'b,c','d':'e'}},{'mathematicalType':'metadata','value':{'a':'b','c,d':'e'}})
add('source-separation',{'mathematicalType':'symbolic-expression','value':V('x'),'source':{'line':1}},{'mathematicalType':'symbolic-expression','value':V('x'),'source':{'line':99}},True)
add('unverified-binding',{'mathematicalType':'exact-scalar','value':'3','symbol':{'name':'x','scope':'p'},'verificationStatus':'verified'},{'mathematicalType':'exact-scalar','value':'3','symbol':{'name':'x','scope':'p'},'verificationStatus':'unverified'})
add('type-confusion',{'mathematicalType':'exact-scalar','value':'1/2'},{'mathematicalType':'probability','value':'1/2'})
assert len(cases)==150
body={'schema':'openpath-canonical-ir-adversarial@1','frozenBeforeExecution':True,'cases':cases};t=json.dumps(body,indent=2)+'\n';(H/'adversarial-cases.v1.json').write_text(t);(H/'ADVERSARIAL_SHA256').write_text(hashlib.sha256(t.encode()).hexdigest()+'  adversarial-cases.v1.json\n')
