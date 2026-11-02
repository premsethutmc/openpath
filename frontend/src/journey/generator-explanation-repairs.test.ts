import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FAMILIES, problemOf, explainStep } from '../../../packages/learning/src/families';
import { familySpec, validateFamily } from '../../../packages/learning/src/spec';
import { familyReviewOf, type Registry } from '../../../packages/learning/src/review';
import { familyStepExplanation } from '../../../packages/learning/src/teaching-presentation';
const baselines={aedecc:{count:2916,hash:'aed63615a6b2925a46fae1e60b7359d8674cd0cc32c4147d1a97dd1c50487785',fingerprint:'4d750dcd'},ahid:{count:333,hash:'2cb228eaa6bcf2ef30b15630169397fe58d7abf93999b28345b4f03dfb47cbea',fingerprint:'09bb7499'}};
function parameters(id:string) {
 const f=FAMILIES.get(id)!,out:number[][]=[];
 function visit(p:number[]=[]){if(p.length===f.domain!.length){if(!f.reject(p))out.push(p);return;}const [lo,hi]=f.domain![p.length];for(let n=lo;n<=hi;n++)visit([...p,n]);}
 visit();return out;
}
test('decimal comparison counterexample never asserts that 03 is greater than 5',()=>{
 const f=FAMILIES.get('aedecc')!,p=problemOf('gen:aedecc:0,5,0,3')!;
 assert.equal(p.answer,'0.5');assert.equal(f.validate(p.params,'0.5'),true);
 const bug=p.bugs.find(b=>b.id==='longer-is-larger')!;
 assert.match(bug.says,/More decimal digits do not make 0.03 greater/);
 assert.doesNotMatch(bug.says,/03 is more than 5/);
 for(const [w,t,u,v] of parameters('aedecc')) {
  const b=f.bugs([w,t,u,v])[0];
  if(t>u){assert.ok(10*t>10*u+v);assert.match(b.says,/Compare the tenths first/);assert.doesNotMatch(b.says,/because .* is more than/);}
  assert.equal(f.validate([w,t,u,v],f.solve([w,t,u,v]).answer),true);
 }
});
test('every square-identity step states a true signed equality, including difference of squares',()=>{
 const f=FAMILIES.get('ahid')!;
 const p=problemOf('gen:ahid:1,3,8,1')!;
 assert.equal(explainStep(p,p.steps.find(s=>s.id==='2ab')!),'−2ab = −2 × 3x × 8 = −48x');
 for(const params of parameters('ahid')) {
  const [form,a,b]=params,result=f.solve(params);
  assert.equal(f.validate(params,result.answer),true);
  for(const step of result.steps) {
   const value=String(step.value), coefficient=Number(value.replace(/x²?$/,'' )||1);
   if(step.id==='a2'){assert.equal(coefficient,a*a);assert.doesNotMatch(f.explain(step),/= 1x²$/);}
   if(step.id==='2ab'){assert.equal(coefficient,Number(step.inputs[0])*a*b);assert.equal(Number(step.inputs[0]),form===1?-2:2);assert.ok(familyStepExplanation(problemOf('gen:ahid:'+params.join(','))!,step).startsWith(`${form===1?'−2':'2'} × ${step.inputs[1]} × ${b} = ${String(step.value).replace('-', '−')}`));assert.match(f.explain(step),form===1?/^−2ab = −2 ×/:/^2ab = 2 ×/);}
   if(step.id==='b2'){assert.equal(Number(step.value),(form===2?-1:1)*b*b);assert.equal(step.op,form===2?'negate-square':'square');}
  }
  const [lead,middle,constant]=[a*a,form===2?0:(form===1?-2:2)*a*b,(form===2?-1:1)*b*b];
  for(const x of [-3,0,2,7])assert.ok(lead*x*x+middle*x+constant === (form===2?(a*x+b)*(a*x-b):(a*x+(form===1?-b:b))**2));
 }
});
for(const id of ['aedecc','ahid'] as const)test(`${id}: family validation, unchanged answers/predictions and stale old review`,()=>{
 const f=FAMILIES.get(id)!,ps=parameters(id),before=baselines[id];
 const signature=ps.map(p=>[p,f.solve(p).answer,f.bugs(p).map(b=>[b.id,b.predict])]);
 assert.equal(ps.length,before.count);assert.equal(createHash('sha256').update(JSON.stringify(signature)).digest('hex'),before.hash);
 const report=validateFamily(id);assert.equal(report.ok,true,JSON.stringify(report));
 assert.notEqual(familySpec(id)!.fingerprint,before.fingerprint);
 const reg={schema:'content-review@2',note:'synthetic old review',entries:[{item:`family:${id}`,contentHash:before.fingerprint,state:'released',releasedAt:'2026-01-01',author:'synthetic',history:[]}]} as unknown as Registry;
 assert.notEqual(familyReviewOf(id,reg).state,'released');
});
