import json
from fractions import Fraction as F
from pathlib import Path
import sympy as s
def rat(x):x=F(x);return str(x.numerator) if x.denominator==1 else f'{x.numerator}/{x.denominator}'
def val(kind,x):
 if kind=='scalar':return {'kind':kind,'value':rat(x)}
 if kind=='radical':return {'kind':kind,'radicand':rat(x)}
 if kind=='boolean':return {'kind':kind,'value':bool(x)}
 if kind=='vector':return {'kind':kind,'value':[rat(z) for z in x]}
 if kind=='matrix':return {'kind':kind,'value':[[rat(z) for z in r] for r in (x.tolist() if hasattr(x,'tolist') else x)]}
 if kind=='system':return x
def wrong(a):
 b=json.loads(json.dumps(a))
 if b['kind']=='scalar':b['value']=rat(F(b['value'])+1)
 elif b['kind']=='radical':b['radicand']=rat(F(b['radicand'])+1)
 elif b['kind']=='boolean':b['value']=not b['value']
 elif b['kind']=='vector':b['value'][0]=rat(F(b['value'][0])+1)
 elif b['kind']=='matrix':b['value'][0][0]=rat(F(b['value'][0][0])+1)
 elif b['kind']=='system':b['status']='none' if b['status']!='none' else 'infinite'
 return b
def smat(A):return [[rat(z) for z in row] for row in A.tolist()]
def make(area,i):
 m=i%10;n=i%5+1;ass=[]
 if area=='vector':
  tasks=['add','subtract','scalar-multiply','dot','cross','magnitude','normalize','projection','parallel','perpendicular','triangle-area'];task=tasks[i%len(tasks)];a=[3,4,0] if task in ('normalize','magnitude') else [n,n+1,n+2];b=[2*n,2*(n+1),2*(n+2)] if task=='parallel' else [n+1,-n,0];d={'a':list(map(str,a)),'b':list(map(str,b)),'scalar':'2'};A=s.Matrix(a);B=s.Matrix(b)
  if task=='add':ans=val('vector',A+B)
  elif task=='subtract':ans=val('vector',A-B)
  elif task=='scalar-multiply':ans=val('vector',2*A)
  elif task=='dot':ans=val('scalar',A.dot(B))
  elif task=='cross':ans=val('vector',A.cross(B))
  elif task=='magnitude':ans=val('radical',A.dot(A))
  elif task=='normalize':ans=val('vector',[F(3,5),F(4,5),0])
  elif task=='projection':ans=val('vector',B*(A.dot(B)/B.dot(B)))
  elif task=='parallel':ans=val('boolean',True)
  elif task=='perpendicular':ans=val('boolean',A.dot(B)==0)
  else:d={'a':['3','0'],'b':['0','4']};ans=val('scalar',6)
 elif area in ('matrix','determinant'):
  A=s.Matrix([[n,1],[2,n+1]]);B=s.Matrix([[1,2],[0,1]]);tasks=['add','subtract','scalar-multiply','multiply','transpose','inverse','commutes'] if area=='matrix' else ['determinant','rank','inverse'];task='inverse' if m==7 else tasks[i%len(tasks)];d={'a':smat(A),'b':smat(B),'scalar':'2'}
  if task=='add':ans=val('matrix',A+B)
  elif task=='subtract':ans=val('matrix',A-B)
  elif task=='scalar-multiply':ans=val('matrix',2*A)
  elif task=='multiply':ans=val('matrix',A*B)
  elif task=='transpose':ans=val('matrix',A.T)
  elif task=='inverse':
   if A.det()==0:A=s.Matrix([[2,1],[1,1]]);d['a']=smat(A)
   ans=val('matrix',A.inv())
  elif task=='commutes':ans=val('boolean',A*B==B*A)
  elif task=='determinant':ans=val('scalar',A.det())
  else:ans=val('scalar',A.rank())
 elif area=='system':
  tasks=['unique','none','infinite'];task='inverse' if m==7 else tasks[i%3]
  if task in ('unique','inverse'):
   A=s.Matrix([[2,1],[1,-1]]);b=s.Matrix([5,1]);ans={'kind':'system','status':'unique','values':[rat(z) for z in A.LUsolve(b)]}
  elif task=='none':A=s.Matrix([[1,1],[2,2]]);b=s.Matrix([1,3]);ans={'kind':'system','status':'none'}
  else:A=s.Matrix([[1,1],[2,2]]);b=s.Matrix([1,2]);ans={'kind':'system','status':'infinite'}
  d={'a':smat(A),'b':[rat(z) for z in b]};task='solve';ass=[]
 p={'domain':'linear-algebra','area':area,'task':task,'data':d,'assumptions':ass}
 if m==7:rule='inverse-method'
 elif area=='vector':rule='dot-product' if task=='dot' else ('cross-product' if task=='cross' else ('geometric-vector' if task in ('parallel','perpendicular','triangle-area','collinear','direction','distance','plane-normal','angle-cosine') else 'component-wise'))
 elif area=='matrix':rule='row-operations' if task in ('inverse','rank') else 'component-wise'
 elif area=='determinant':rule='cofactor-expansion' if task=='determinant' else 'row-operations'
 else:rule=['elimination','substitution','gaussian-elimination','cramers-rule'][i%4]
 good={'id':'s0','rule':rule,'result':ans,'dependencies':[]};bad={'id':'s0','rule':rule,'result':wrong(ans),'dependencies':[]}
 if m<5:w=[good];status='verified';first=None
 elif m in (5,6):w=[bad,{'id':'s1','rule':rule,'result':ans,'dependencies':['s0']}] if m==6 else [bad];status='invalid';first=0
 elif m==7:w=[good];status=('unsupported' if area=='vector' else 'missing-assumption');first=None
 elif m==8:w=[{'id':'s0','rule':'unsupported-matrix-claim','result':ans,'dependencies':[]}];status='unsupported';first=None
 else:w=[{'id':f's{j}','rule':rule,'result':ans,'dependencies':([f's{j-1}'] if j else [])} for j in range(65)];status='resource-exhausted';first=None
 if area=='vector' and i==5:p['task']='add';p['data']={'a':['1','2','3'],'b':['1','2']};w=[{'id':'s0','rule':'component-wise','result':ans,'dependencies':[]}];status='invalid';first=0
 if area=='matrix' and i==5:p['task']='multiply';p['data']={'a':[['1','2','3'],['4','5','6']],'b':[['1','0'],['0','1']]};w=[{'id':'s0','rule':'direct','result':ans,'dependencies':[]}];status='invalid';first=0
 if area=='matrix' and i==15:p['task']='commutes';p['data']={'a':[['1','1'],['0','1']],'b':[['1','0'],['1','1']]};w=[{'id':'s0','rule':'direct','result':{'kind':'boolean','value':True},'dependencies':[]}];status='invalid';first=0
 if area=='determinant' and i==5:p['task']='inverse';p['data']={'a':[['1','2'],['2','4']]};w=[{'id':'s0','rule':'direct','result':ans,'dependencies':[]}];status='invalid';first=0
 return p,w,{'classification':status,'firstInvalidStep':first}
cases=[]
for area in ['vector','matrix','determinant','system']:
 for i in range(100):
  p,w,e=make(area,i);cases.append({'id':f'b2-{area}-{i:03}','area':area,'problem':p,'working':w,'expected':e,'frozenBeforeFinalTuning':len(cases)<100,'oracle':'independent exact SymPy Matrix or Fraction calculation'})
Path(__file__).with_name('independent-cases.v1.json').write_text(json.dumps({'version':'linear-algebra-b2-corpus@1','frozenPrefixCount':100,'cases':cases},indent=2)+'\n');print(len(cases))
