import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, problemOf } from '../../../packages/learning/src/families';
import { familySteps } from '../../../packages/learning/src/teaching-contract';
import { moduleFor } from '../../../packages/learning/src/content';
import { contentEligibility } from '../../../packages/learning/src/explanation-review';
test('small-addition explanations and unit jumps match every supported pair',()=>{
 const f=FAMILIES.get('aaadd')!;
 for(let a=1;a<=19;a++)for(let b=1;b<=20-a;b++){
  const p=problemOf(`gen:aaadd:${a},${b}`)!;assert.ok(p);
  const v=f.teach!.visual!([a,b]) as {jumps:number[][]};
  assert.equal(v.jumps.length,b);assert.deepEqual(v.jumps[0],[a,a+1]);assert.deepEqual(v.jumps.at(-1),[a+b-1,a+b]);
  const text=f.teach!.alternatives!.find(x=>x.id==='make_ten')!.textFor!([a,b]).join(' ');
  assert.ok(text.includes(`= ${a+b}.`));
  if(a+b<10)assert.match(text,/no full ten/);
  assert.equal(familySteps(p)?.worked.verified,true);
 }
 assert.match(f.teach!.method,/first number/);
 const m=moduleFor('MATH.number.addition')!;
 assert.ok(m.strategies.some(s=>s.title==='Use a ten when it helps'));
 assert.ok(m.strategies.every(s=>!JSON.stringify(s).includes('8 + 5 = 8 + 2 + 3')));
});
test('column algorithms compose final place values for generated additions and subtractions',()=>{
 const f=FAMILIES.get('adcol3')!;let count=0;
 for(let a=103;a<999;a+=29)for(let b=107;b<999;b+=43)for(const op of [0,1]){
  const p=problemOf(`gen:adcol3:${a},${b},${op}`);if(!p)continue;
  const last=p.steps.at(-1)!;assert.equal(last.id,'compose');
  assert.equal(last.inputs.reduce<number>((sum,n)=>sum+Number(n),0),Number(p.answer));
  assert.equal(Number(p.answer),op?a-b:a+b);assert.equal(familySteps(p)?.worked.verified,true);count++;
 }
 assert.ok(count>300);
 const exemplar=problemOf('gen:adcol3:193,678,0')!;
 assert.deepEqual(exemplar.steps.at(-1)?.inputs,[800,70,1]);
 assert.match(familySteps(exemplar)!.worked.steps.at(-1)!.expression,/800.*70.*1.*871/);
 const m=moduleFor('MATH.number.multi-digit-add-subtract')!;
 assert.ok(JSON.stringify(m).includes('Put the place values together'));
 for(const s of m.strategies) { const eligible=contentEligibility(m,s,{competency:m.competency,usage:'lesson'}); assert.equal(eligible.educatorApproved,false); assert.equal(eligible.eligible,true,eligible.label); }
});
