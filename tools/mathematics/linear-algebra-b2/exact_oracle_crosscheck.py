import json,random
import sympy as s
random.seed(1729);rows=[]
def add(area,i,a,b):rows.append({'id':f'{area}-{i}','area':area,'expected':str(a),'oracle':str(b),'match':a==b})
for i in range(50):
 a=s.Matrix([i%5+1,2,3]);b=s.Matrix([2,-1,i%3]);add('vector',i,a.dot(b),sum(a[j]*b[j] for j in range(3)))
for i in range(50):
 A=s.Matrix([[i%4+1,2],[3,4]]);B=s.Matrix([[2,1],[1,i%3+1]]);manual=s.Matrix([[sum(A[r,k]*B[k,c] for k in range(2)) for c in range(2)]for r in range(2)]);add('matrix',i,A*B,manual)
for i in range(50):
 A=s.Matrix([[i%5+1,2,1],[0,3,1],[2,1,4]]);manual=A[0,0]*(A[1,1]*A[2,2]-A[1,2]*A[2,1])-A[0,1]*(A[1,0]*A[2,2]-A[1,2]*A[2,0])+A[0,2]*(A[1,0]*A[2,1]-A[1,1]*A[2,0]);add('determinant',i,A.det(),manual)
for i in range(50):
 A=s.Matrix([[i%7+1,1],[2,3]]);b=s.Matrix([i+2,4]);expected='unique' if A.det()!=0 else ('none' if A.row_join(b).rank()>A.rank() else 'infinite');oracle='none' if A.row_join(b).rank()>A.rank() else ('unique' if A.rank()==2 else 'infinite');add('system',i,expected,oracle)
out={'version':'linear-algebra-b2-oracle@1','total':len(rows),'matched':sum(r['match'] for r in rows),'results':rows};assert out['total']==200 and out['matched']==200
open(__file__.replace('exact_oracle_crosscheck.py','exact-oracle-results.v1.json'),'w').write(json.dumps(out,indent=2)+'\n');print({'total':out['total'],'matched':out['matched']})
