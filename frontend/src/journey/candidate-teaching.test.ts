import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moduleFor, question } from '../../../packages/learning/src/content';
import { fromTemplate, synthesise, type Blueprint } from '../../../packages/learning/src/library';
import { contentEligibility, addressedMisconception, contentHash } from '../../../packages/learning/src/explanation-review';
import { teachingEligibility } from '../../../packages/learning/src/teaching-contract';
import { teachingScopeFor } from '../../../packages/learning/src/teaching-presentation';
import { phasePool, problemOf, exposureKey } from '../../../packages/learning/src/families';
import { probeReading } from '../../../packages/learning/src/reasoning';
import { hypotheses, investigateContext } from '../../../packages/learning/src/hypotheses';
import { learnerState, make } from '../../../packages/learning/src/session';
import { withDecisions } from '../../../packages/learning/src/records';
import { SliceSession } from './session';

const cases = [
 ['MATH.statistics.median-mode','akmed',['fix_mean_for_median','fix_one_middle']],
 ['MATH.probability.classical','anbag',['fix_colours_equally_likely']],
 ['MATH.number.fraction-models','adfname',['adfname_concept','fix_shaded_to_unshaded','fix_count_only']],
 ['MATH.statistics.scaled-bars','afbar',['fix_assume_tens']],
] as const;
const at=Date.parse('2026-01-01T00:00:00Z');
const source=JSON.parse(readFileSync(new URL('../../../content/learning/blueprints.v1.json',import.meta.url),'utf8'));

for(const [competency,family,ids] of cases){
 test(`${family}: registered candidates preserve approval gates and task scope`,()=>{
  const m=moduleFor(competency)!;
  for(const id of ids){
   const s=m.strategies.find(s=>s.id===id)!;assert.ok(s,id);
   const t=teachingEligibility(m,s);assert.equal(t.eligible,true,JSON.stringify(t));
   const target=addressedMisconception(s);
   const req={competency,usage:'intervention' as const,misconceptionEvidence:target?[target]:[]};
   const c=contentEligibility(m,s,{...req,mode:'demonstration'});
   assert.equal(c.eligible,true,JSON.stringify(c));assert.equal(c.status,'pending_review');assert.equal(c.educatorApproved,false);
   assert.equal(contentEligibility(m,s,{...req,mode:'supervised-evaluation'}).eligible,false);
   if(target)assert.equal(contentEligibility(m,s,{...req,mode:'demonstration',misconceptionEvidence:[]}).eligible,false);
  }
 });
 if(family!=='adfname' && family!=='afbar')test(`${family}: additive composition preserves the existing template byte for byte`,()=>{
  const bp=source.blueprints.find((b:Blueprint)=>b.competency===competency),base=fromTemplate(family,competency,source.version),m=synthesise(bp,source.version);
  assert.deepEqual({...m,strategies:m.strategies.slice(0,base.strategies.length)},base);
  for(const s of base.strategies)assert.equal(contentHash(competency,m.strategies.find(x=>x.id===s.id)!),contentHash(competency,s));
  const bad=structuredClone(bp);bad.strategies[0].id=base.strategies[0].id;assert.throws(()=>synthesise(bad,source.version),/duplicate strategy/);
  const exposed=structuredClone(bp);exposed.strategies[0].screens[0].instance=base.retention[0];assert.throws(()=>synthesise(exposed,source.version),/reserved exposure/);
 });
 if(family==='afbar')test('afbar: full teaching blueprint preserves the previously integrated total intervention',()=>{
  const m=moduleFor(competency)!,total=m.strategies.find(s=>s.id==='fix_assume_tens')!;
  assert.equal(source.blueprints.find((b:Blueprint)=>b.competency===competency).extendsTemplate,undefined);
  // reworded 2026-11-04 (neutral: "A common mix-up is to take each line as 10", title "…: a common mix-up"); the teaching is otherwise unchanged
  assert.equal(contentHash(competency,total),'sha256:9591acc7830025c793ed235c1623dd3c11d69ffbd1921dbe17e39adf3f1579e1');
  assert.equal(total.scope?.subSkill,'scaled-bars.total@1');
  assert.equal(m.strategies.find(s=>s.id==='fix_assume_tens_read')?.scope?.subSkill,'scaled-bars.read@1');
  assert.ok(!m.strategies.some(s=>s.kind==='prerequisite'),'the new module has target teaching, not a generic prerequisite pointer');
 });
 for(const id of ids.filter(x=>x!=='adfname_concept'))test(`${family}/${id}: real diagnosis selects candidate and fresh resolution survives saved replay`,()=>{
  const m=moduleFor(competency)!,s=m.strategies.find(s=>s.id===id)!,target=s.addresses!;
  const scope=teachingScopeFor(m,s),shown=new Set([s.guided,...s.screens.map(x=>x.instance)].filter(Boolean).map(x=>exposureKey(x!)));
  const diag=phasePool(family,'diagnostic').map(x=>x.replace(/:mc$/,''))
   .filter(x=>scope.accepts(problemOf(x)!)&&!shown.has(exposureKey(x))&&probeReading(x,target).discriminates).slice(0,2);
  assert.equal(diag.length,2);
  const session=new SliceSession(`candidate-${id}`,competency,at);
  session.events.push(make.pathway({learnerId:session.learnerId,sessionId:session.session,at:new Date(at-1000).toISOString()},competency));
  diag.forEach((q,i)=>session.submit(q,probeReading(q,target).predicted[0],i?'diagnostic':'check',i?{context:investigateContext(diag[0])}:{}));
  assert.equal(hypotheses(session.state().selectionRecords).find(h=>h.claim?.explanation===target)?.status,'established');
  let next=session.state().module(competency);assert.equal(next.strategy?.id,id,JSON.stringify(next));
  session.taught(next);
  if(id==='fix_mean_for_median'){
   const delivered=session.events.at(-1)!;
   session.events.splice(session.events.length-1,0,make.teach({learnerId:session.learnerId,sessionId:session.session,at:delivered.at},'MATH.algebra.identities','ahid_concept','synthetic simultaneous unrelated lesson'));
   const outside=phasePool(family,'check').find(q=>!scope.accepts(problemOf(q)!)&&probeReading(q,target).discriminates)!;
   assert.ok(outside);session.submit(outside,question(outside).answer,'check');
   assert.equal(hypotheses(session.state().selectionRecords).find(h=>h.claim?.explanation===target)?.status,'established','an even-count answer cannot resolve an odd-count lesson obligation');
  }
  next=session.state().module(competency);
  assert.equal(next.phase,'check',JSON.stringify(next));assert.ok(next.question);assert.ok(scope.accepts(problemOf(next.question)!));
  assert.ok(![...shown,...diag.map(exposureKey)].includes(exposureKey(next.question)));
  session.submit(next.question,question(next.question).answer,'check');
  assert.equal(hypotheses(session.state().selectionRecords).find(h=>h.claim?.explanation===target)?.status,'resolved');
  const saved=JSON.parse(JSON.stringify(withDecisions(session.events,session.decisions)));
  assert.deepEqual(learnerState(session.learnerId,saved,session.now,{currentSession:session.session}).module(competency),session.state().module(competency));
 });
}

test('non-pathway diagnosis does not count an unrelated declared lesson in the same competency',()=>{
 const c='MATH.statistics.median-mode',s=new SliceSession('legacy-declared-scope',c,at),target='mean-for-median';
 const qs=['gen:akmed:8,5','gen:akmed:51,5'];
 qs.forEach((q,i)=>s.submit(q,probeReading(q,target).predicted[0],i?'diagnostic':'check',i?{context:investigateContext(qs[0])}:{}));
 s.events.push(make.teach({learnerId:s.learnerId,sessionId:s.session,at:new Date(++s.now).toISOString()},c,'fix_one_middle','synthetic unrelated even-count lesson'));
 const h=hypotheses(s.state().selectionRecords).find(h=>h.claim?.explanation===target)!;
 assert.equal(h.status,'established');assert.equal(h.teachingDue,true);assert.equal(h.teaching.strategy,null);
});
