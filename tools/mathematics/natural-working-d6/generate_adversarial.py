import json,hashlib
from pathlib import Path
H=Path(__file__).parent
C=lambda v:{'kind':'constant','value':str(v)};V=lambda n:{'kind':'variable','name':n};P=lambda x,n:{'kind':'power','base':x,'exponent':n}
c=[]
def add(cat,problem,raw,expected):
 for i in range(10):c.append({'id':f'd6-adv-{cat}-{i:02d}','category':cat,'provenance':'independently-authored before execution','problem':problem(i) if callable(problem) else problem,'raw':raw(i) if callable(raw) else raw,'expectedNonAcceptance':expected})
add('invalid-symbolic',lambda i:{'domain':'symbolic','start':P(V('x'),2)},lambda i:f'x={i+2}\ny=x^2\ny={i+3}','invalid')
add('invalid-function',lambda i:{'domain':'function','task':'evaluate','f':{'kind':'polynomial','coefficients':['1','2']},'input':str(i+1)},lambda i:f'a={i+1}\nf(x)=2x+1\nf(a)={2*(i+1)+2}','invalid')
add('invalid-derivative',lambda i:{'domain':'calculus','task':'derivative','expression':P(V('x'),i%4+2),'variable':'x'},lambda i:f"f'(x)={i%4+1}x^{i%4+1}",'invalid')
add('missing-integration-constant',{'domain':'calculus','task':'indefinite-integral','integrand':{'kind':'multiply','factors':[C(2),V('x')]},'variable':'x'},'\\int 2x \\, dx = x^2','invalid')
add('wrong-vector',lambda i:{'domain':'linear-algebra','area':'vector','task':'add','data':{'a':['1','2'],'b':['3','4']}},'u=[1,2]\nv=[3,4]\nu+v=[5,6]','invalid')
add('wrong-determinant',{'domain':'linear-algebra','area':'determinant','task':'determinant','data':{'a':[['1','2'],['3','4']]}},'M=[[1,2],[3,4]]\ndet(M)=2','invalid')
add('singular-inverse',{'domain':'linear-algebra','area':'matrix','task':'inverse','data':{'a':[['1','2'],['2','4']]}},'M=[[1,2],[2,4]]\nM^-1=[[1,0],[0,1]]','unsupported')
add('wrong-complex',{'domain':'complex-polynomial','area':'arithmetic','task':'modulus','data':{'a':{'re':'3','im':'4'}}},'z=3+4i\n|z|=4','invalid')
add('wrong-probability',{'domain':'probability-statistics','area':'probability','task':'complement','data':{'pa':'1/3'}},'P(A)=1/3\nP(not A)=1/3','invalid')
add('missing-geometry-assumption',{'domain':'geometry','problem':{'objects':[{'id':'AB','kind':'segment','data':{}}],'facts':[],'conditions':[],'goal':{'predicate':'length_squared','args':['AB'],'value':25}}},'AB=5\nAB^2=25','missing-assumption')
add('wrong-cross-substitution',{'domain':'symbolic','start':{'kind':'add','terms':[V('x'),C(1)]}},'x=3\ny=x+1\ny=5','invalid')
add('ambiguous-division',{'domain':'algebra','statement':'solve'},lambda i:f'1/{i+2}x = 3','ambiguous')
add('malformed-latex',{'domain':'symbolic','start':V('x')},lambda i:'\\frac{x+1}{','malformed')
add('resource-input',{'domain':'algebra','statement':'solve'},lambda i:'x+'*5000+'1','resource-exhausted')
add('unsupported-operation',{'domain':'calculus','task':'limit','expression':{'kind':'log','argument':V('x')},'variable':'x','approach':'0','side':'right'},'lim x->0+ log(x) = -infinity','unsupported')
assert len(c)==150
body={'schema':'openpath-d6-adversarial@1','frozenBeforeExecution':True,'cases':c};t=json.dumps(body,indent=2)+'\n';(H/'adversarial-cases.v1.json').write_text(t);(H/'ADVERSARIAL_SHA256').write_text(hashlib.sha256(t.encode()).hexdigest()+'  adversarial-cases.v1.json\n')
