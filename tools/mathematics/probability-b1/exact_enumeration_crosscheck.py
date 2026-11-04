import itertools,json,math,statistics
from fractions import Fraction as F
rows=[]
def add(area,i,a,b):rows.append({'id':f'{area}-{i}','area':area,'expected':str(a),'enumerated':str(b),'match':a==b})
for i in range(50):
 n=i%6+3;r=i%3+1
 if i%2:add('combinatorics',i,math.perm(n,r),len(list(itertools.permutations(range(n),r))))
 else:add('combinatorics',i,math.comb(n,r),len(list(itertools.combinations(range(n),r))))
for i in range(50):
 outcomes=list(itertools.product(range(1,7),repeat=2));event=[z for z in outcomes if (sum(z)+i)%3==0];add('probability',i,F(len(event),len(outcomes)),sum((F(1,len(outcomes)) for _ in event),F()))
for i in range(50):
 p=F(i%4+1,6);pmf=[(0,1-p),(1,p)];mean=sum((F(x)*q for x,q in pmf),F());var=sum(((F(x)-mean)**2*q for x,q in pmf),F());add('distribution',i,p*(1-p),var)
for i in range(50):
 xs=[F(1),F(2),F(i%5+2),F(7)];mean=sum(xs,F())/len(xs);direct=sum((z-mean)**2 for z in xs)/len(xs);identity=sum(z*z for z in xs)/len(xs)-mean*mean;add('statistics',i,direct,identity)
out={'version':'probability-b1-exact-enumeration@1','total':len(rows),'matched':sum(r['match'] for r in rows),'results':rows};assert out['total']==200 and out['matched']==200
open(__file__.replace('exact_enumeration_crosscheck.py','exact-enumeration-results.v1.json'),'w').write(json.dumps(out,indent=2)+'\n');print({'total':out['total'],'matched':out['matched']})
