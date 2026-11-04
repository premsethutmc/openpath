import json,hashlib
from pathlib import Path
H=Path(__file__).parent;cases=[]
def add(cat,raw,problem=None):
 for i in range(10):cases.append({'id':f'd7-adv-{cat}-{i:02d}','category':cat,'provenance':'independently authored before execution','input':{'format':'latex' if '\\' in raw else 'natural','text':raw},'problem':problem,'mustNotVerify':True})
x={'kind':'variable','name':'x'};x2={'kind':'power','base':x,'exponent':2};calc={'domain':'calculus','task':'derivative','expression':x2,'variable':'x'}
add('incorrect-order',"q''(x)=2x",calc)
add('conflicting-order','d^2y/dx^3=2',calc)
add('missing-parenthesis',"f'(x = 2x",calc)
add('ambiguous-division','1/2x=3',{'domain':'algebra','statement':'solve'})
add('unary-precedence','(-x)^2',{'domain':'symbolic','start':{'kind':'multiply','factors':[{'kind':'constant','value':'-1'},x2]}})
add('nested-functions','f(g(x))')
add('malformed-latex','\\frac{x+1}{')
add('unicode-double-prime','g″(x)=2',calc)
add('symbol-shadowing','a=2\nf(x)=x+1\nf(a)=4',{'domain':'function','task':'evaluate','f':{'kind':'polynomial','coefficients':['1','1']},'input':'2'})
add('excessive-depth','('*40+'x'+')'*40)
assert len(cases)==100
body={'schema':'openpath-notation-d7-adversarial@1','frozenBeforeExecution':True,'cases':cases};t=json.dumps(body,indent=2)+'\n';(H/'adversarial-cases.v1.json').write_text(t);(H/'ADVERSARIAL_SHA256').write_text(hashlib.sha256(t.encode()).hexdigest()+'  adversarial-cases.v1.json\n')
