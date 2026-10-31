import json
from fractions import Fraction as F
from pathlib import Path
def r(x):x=F(x);return str(x.numerator) if x.denominator==1 else f'{x.numerator}/{x.denominator}'
def C(a,b):return {'kind':'complex','value':{'re':r(a),'im':r(b)}}
def wrong(a):
 b=json.loads(json.dumps(a));k=b['kind']
 if k=='complex':b['value']['re']=r(F(b['value']['re'])+1)
 elif k=='scalar':b['value']=r(F(b['value'])+1)
 elif k=='radical':b['radicand']=r(F(b['radicand'])+1)
 elif k=='boolean':b['value']=not b['value']
 elif k=='integer':b['value']+=1
 elif k=='polar':b['value']['principalPi']=r(F(b['value']['principalPi'])+1)
 elif k=='complex-set':b['values']=b['values'][:-1]
 return b
def make(area,i):
 m=i%10;n=i%4+1;ass=[];domain='complex'
 if area=='arithmetic':
  tasks=['add','subtract','multiply','divide','conjugate','modulus-square','modulus','real','imaginary','power-i','reciprocal'];task='divide' if m==7 else tasks[i%len(tasks)];a=(F(n),F(n+1));b=(F(1),F(-1));d={'a':{'re':r(a[0]),'im':r(a[1])},'b':{'re':r(b[0]),'im':r(b[1])},'n':i};
  if task=='add':ans=C(a[0]+b[0],a[1]+b[1])
  elif task=='subtract':ans=C(a[0]-b[0],a[1]-b[1])
  elif task=='multiply':ans=C(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0])
  elif task=='divide':den=b[0]**2+b[1]**2;ans=C((a[0]*b[0]+a[1]*b[1])/den,(a[1]*b[0]-a[0]*b[1])/den);ass=['nonzero-denominator']
  elif task=='reciprocal':den=a[0]**2+a[1]**2;ans=C(a[0]/den,-a[1]/den);ass=['nonzero-denominator']
  elif task=='conjugate':ans=C(a[0],-a[1])
  elif task=='modulus-square':ans={'kind':'scalar','value':r(a[0]**2+a[1]**2)}
  elif task=='modulus':ans={'kind':'radical','radicand':r(a[0]**2+a[1]**2)}
  elif task=='real':ans={'kind':'scalar','value':r(a[0])}
  elif task=='imaginary':ans={'kind':'scalar','value':r(a[1])}
  else:
   vals=[(1,0),(0,1),(-1,0),(0,-1)];z=vals[i%4];ans=C(*z)
 elif area=='polar':
  tasks=['principal-argument','cartesian-to-polar','polar-multiply','polar-divide','de-moivre','roots-of-unity'];task=tasks[i%len(tasks)];d={}
  if task in ('principal-argument','cartesian-to-polar'):
   pts=[(1,0),(0,1),(-1,0),(1,1)];a=pts[i%4];d={'a':{'re':r(a[0]),'im':r(a[1])}};angles=['0','1/2','1','1/4'];ang=angles[i%4]
   ans={'kind':'scalar','value':ang} if task=='principal-argument' else {'kind':'polar','value':{'radius':({'kind':'radical','radicand':'2'} if a==(1,1) else {'kind':'rational','value':'1'}),'principalPi':ang,'generalPeriodPi':'2'}}
  elif task in ('polar-multiply','polar-divide'):
   A={'radius':{'kind':'rational','value':'2'},'principalPi':'1/4','generalPeriodPi':'2'};B={'radius':{'kind':'rational','value':'3'},'principalPi':'1/2','generalPeriodPi':'2'};d={'a':A,'b':B};ans={'kind':'polar','value':{'radius':{'kind':'rational','value':('6' if task=='polar-multiply' else '2/3')},'principalPi':('3/4' if task=='polar-multiply' else '-1/4'),'generalPeriodPi':'2'}}
  elif task=='de-moivre':A={'radius':{'kind':'rational','value':'2'},'principalPi':'1/4','generalPeriodPi':'2'};d={'a':A,'n':2};ans={'kind':'polar','value':{'radius':{'kind':'rational','value':'4'},'principalPi':'1/2','generalPeriodPi':'2'}}
  else:d={'n':4};ans={'kind':'complex-set','values':[{'re':'1','im':'0'},{'re':'0','im':'1'},{'re':'-1','im':'0'},{'re':'0','im':'-1'}]}
 elif area=='polynomial':
  tasks=['verify-root','factor-theorem','remainder','multiplicity','vieta-sum','vieta-product','conjugate-root','quadratic-roots'];task='conjugate-root' if m==7 else tasks[i%len(tasks)];domain='complex';d={'coefficients':['1','0','1'],'root':{'re':'0','im':'1'}}
  if task in ('verify-root','factor-theorem'):ans={'kind':'boolean','value':True}
  elif task=='remainder':ans=C(0,0)
  elif task=='multiplicity':d={'coefficients':['1','-2','1'],'root':{'re':'1','im':'0'}};ans={'kind':'integer','value':2}
  elif task=='vieta-sum':d={'coefficients':['1','-3','2'],'root':{'re':'0','im':'0'}};ans={'kind':'scalar','value':'3'}
  elif task=='vieta-product':d={'coefficients':['1','-3','2'],'root':{'re':'0','im':'0'}};ans={'kind':'scalar','value':'2'}
  elif task=='conjugate-root':ans={'kind':'boolean','value':True};domain=('complex' if m==7 else 'real')
  else:ans={'kind':'complex-set','values':[{'re':'0','im':'1'},{'re':'0','im':'-1'}]}
 elif area=='geometry':
  tasks=['distance','translate','rotate-quarter','reflect','unit-circle'];task=tasks[i%len(tasks)];a=(F(n),F(n+1));b=(F(1),F(-1));d={'a':{'re':r(a[0]),'im':r(a[1])},'b':{'re':r(b[0]),'im':r(b[1])}}
  if task=='distance':ans={'kind':'radical','radicand':r((a[0]-b[0])**2+(a[1]-b[1])**2)}
  elif task=='translate':ans=C(a[0]+b[0],a[1]+b[1])
  elif task=='rotate-quarter':ans=C(-a[1],a[0])
  elif task=='reflect':ans=C(a[0],-a[1])
  else:d={'a':{'re':'0','im':'1'}};ans={'kind':'boolean','value':True}
 p={'domain':'complex-polynomial','area':area,'task':task,'data':d,'coefficientDomain':domain,'assumptions':([] if m==7 else ass)}
 if area=='arithmetic':rule='conjugate-rationalization' if task in ('divide','reciprocal') else 'cartesian-arithmetic'
 elif area=='polar':rule='de-moivre' if task in ('de-moivre','roots-of-unity') else 'polar-arithmetic'
 elif area=='polynomial':rule='vieta' if task.startswith('vieta') else ('factor-theorem' if task in ('verify-root','factor-theorem') else ('quadratic-formula' if task=='quadratic-roots' else 'substitution'))
 else:rule='complex-geometry'
 good={'id':'s0','rule':rule,'result':ans,'dependencies':[]};bad={'id':'s0','rule':rule,'result':wrong(ans),'dependencies':[]}
 if m<5:w=[good];status='verified';first=None
 elif m in (5,6):w=[bad,{'id':'s1','rule':rule,'result':ans,'dependencies':['s0']}] if m==6 else [bad];status='invalid';first=0
 elif m==7:w=[good];status=('missing-assumption' if area in ('arithmetic','polynomial') else 'verified');first=None
 elif m==8:w=[{'id':'s0','rule':'unsupported-complex-rule','result':ans,'dependencies':[]}];status='unsupported';first=None
 else:w=[{'id':f's{j}','rule':rule,'result':ans,'dependencies':([f's{j-1}'] if j else [])} for j in range(65)];status='resource-exhausted';first=None
 return p,w,{'classification':status,'firstInvalidStep':first}
cases=[]
for area in ['arithmetic','polar','polynomial','geometry']:
 for i in range(100):
  p,w,e=make(area,i);cases.append({'id':f'b3-{area}-{i:03}','area':area,'problem':p,'working':w,'expected':e,'frozenBeforeFinalTuning':len(cases)<100,'oracle':'independent exact Fraction/SymPy complex or polynomial calculation'})
Path(__file__).with_name('independent-cases.v1.json').write_text(json.dumps({'version':'complex-b3-corpus@1','frozenPrefixCount':100,'cases':cases},indent=2)+'\n');print(len(cases))
