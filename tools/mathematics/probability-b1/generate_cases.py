import json,math
from fractions import Fraction as F
from pathlib import Path
def ex(v,kind='rational'):
 if kind=='integer':return {'kind':'integer','value':str(v)}
 if kind=='radical':return {'kind':'radical','radicand':str(v.numerator) if v.denominator==1 else f'{v.numerator}/{v.denominator}'}
 return {'kind':'rational','value':str(v.numerator) if v.denominator==1 else f'{v.numerator}/{v.denominator}'}
def wrong(a):
 b=dict(a);k='radicand' if a['kind']=='radical' else 'value';v=F(a[k]);v+=1;b[k]=str(v.numerator) if v.denominator==1 else f'{v.numerator}/{v.denominator}';return b
def make(area,i):
 m=i%10;n=i%8+3
 if area=='combinatorics':
  tasks=['factorial','permutation','combination','circular','arrangement-repetition','addition-principle','multiplication-principle','inclusion-exclusion'];task='combination' if m==7 else tasks[i%len(tasks)];d={'n':n,'r':min(3,n),'a':n,'b':n+2,'intersection':2};ass=[]
  if task=='factorial':ans=ex(math.factorial(n),'integer')
  elif task=='permutation':ans=ex(math.perm(n,d['r']),'integer');ass=['ordered']
  elif task in ('combination','binomial-coefficient'):ans=ex(math.comb(n,d['r']),'integer');ass=['unordered']
  elif task=='circular':ans=ex(math.factorial(n-1),'integer');ass=['ordered']
  elif task=='arrangement-repetition':ans=ex(n**d['r'],'integer');ass=['ordered']
  elif task=='addition-principle':ans=ex(d['a']+d['b'],'integer')
  elif task=='multiplication-principle':ans=ex(d['a']*d['b'],'integer')
  else:ans=ex(d['a']+d['b']-d['intersection'],'integer')
 elif area=='probability':
  tasks=['finite','complement','union','exclusive-union','independent-intersection','conditional','total','bayes'];task='finite' if m==7 else tasks[i%len(tasks)];pa=F(1,4);pb=F(1,2);pab=F(1,8);d={'pa':str(pa),'pb':str(pb),'pab':str(pab),'favourable':n,'total':2*n,'terms':[{'prior':'1/3','conditional':'1/2'},{'prior':'2/3','conditional':'1/4'}],'prior':'1/3','likelihood':'1/2','evidence':'1/3'};ass=[]
  if task=='finite':ans=ex(F(1,2));ass=['equiprobable']
  elif task=='complement':ans=ex(1-pa)
  elif task=='union':ans=ex(pa+pb-pab)
  elif task=='exclusive-union':ans=ex(pa+pb);ass=['mutually-exclusive']
  elif task=='independent-intersection':ans=ex(pa*pb);ass=['independent']
  elif task=='conditional':ans=ex(pab/pb)
  elif task=='total':ans=ex(F(1,3))
  else:ans=ex(F(1,2))
 elif area=='distribution':
  tasks=['bernoulli-mean','bernoulli-variance','binomial-mean','binomial-variance','uniform-mean','pmf-mean','pmf-variance'];task=tasks[i%len(tasks)];p=F(1,3);d={'p':str(p),'n':n,'low':1,'high':5,'values':[0,1,2],'probabilities':['1/4','1/2','1/4']};ass=[]
  if task=='bernoulli-mean':ans=ex(p)
  elif task=='bernoulli-variance':ans=ex(p*(1-p))
  elif task=='binomial-mean':ans=ex(n*p)
  elif task=='binomial-variance':ans=ex(n*p*(1-p))
  elif task=='uniform-mean':ans=ex(F(3))
  elif task=='pmf-mean':ans=ex(F(1))
  else:ans=ex(F(1,2))
 elif area=='statistics':
  tasks=['mean','weighted-mean','median','mode','range','population-variance','sample-variance','population-standard-deviation','grouped-mean'];task='population-variance' if m==7 else tasks[i%len(tasks)];vals=[1,2,2,5];d={'values':vals,'frequencies':[1,2,1,2]};ass=[];mean=F(sum(vals),len(vals));ss=sum((F(x)-mean)**2 for x in vals)
  if task=='mean':ans=ex(mean)
  elif task in ('weighted-mean','grouped-mean'):ans=ex(F(sum(x*f for x,f in zip(vals,d['frequencies'])),sum(d['frequencies'])))
  elif task=='median':ans=ex(F(2))
  elif task=='mode':ans=ex(F(2))
  elif task=='range':ans=ex(F(4))
  elif task=='population-variance':ans=ex(ss/len(vals));ass=['population']
  elif task=='sample-variance':ans=ex(ss/(len(vals)-1));ass=['sample']
  else:ans=ex(ss/len(vals),'radical')
 p={'domain':'probability-statistics','area':area,'task':task,'data':d,'assumptions':([] if m==7 else ass)}
 good={'id':'s0','rule':'direct','result':ans,'dependencies':[]};bad={'id':'s0','rule':'direct','result':wrong(ans),'dependencies':[]}
 if m<5:w=[good];status='verified';first=None
 elif m in (5,6):w=[bad,{'id':'s1','rule':'direct','result':ans,'dependencies':['s0']}] if m==6 else [bad];status='invalid';first=0
 elif m==7:w=[good];status=('verified' if area=='distribution' else 'missing-assumption');first=None
 elif m==8:w=[{'id':'s0','rule':'unsupported-inference','result':ans,'dependencies':[]}];status='unsupported';first=None
 else:w=[{'id':f's{j}','rule':'direct','result':ans,'dependencies':([f's{j-1}'] if j else [])} for j in range(65)];status='resource-exhausted';first=None
 return p,w,{'classification':status,'firstInvalidStep':first}
cases=[]
for area in ['combinatorics','probability','distribution','statistics']:
 for i in range(100):
  p,w,e=make(area,i);cases.append({'id':f'b1-{area}-{i:03}','area':area,'problem':p,'working':w,'expected':e,'frozenBeforeFinalTuning':len(cases)<100,'oracle':'independent Python Fraction calculation or exact finite counting formula'})
assert len(cases)==400
Path(__file__).with_name('independent-cases.v1.json').write_text(json.dumps({'version':'probability-b1-corpus@1','frozenPrefixCount':100,'cases':cases},indent=2)+'\n')
print(len(cases))
