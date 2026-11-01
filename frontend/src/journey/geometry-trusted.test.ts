import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { gradeRequest } from '../../../packages/learning/src/server-grader';
import { geometryWorking, replayGeometryWorking, stopGeometryWorkers } from '../../../packages/learning/src/grading/geometry-working';
import { geometryTask } from '../../../packages/learning/src/geometry-task';
const options={root:new URL('../../../research/geometry-reasoner',import.meta.url).pathname,python:'python3'};
after(()=>stopGeometryWorkers());
async function assess(id:string,working:string[],response:string) {const d=gradeRequest({id,working,response}).decision!;assert.ok(d.working);return {...d,working:await geometryWorking(id,working,response,d.working,options)};}
test('actual authority checks triangle and both valid exterior methods; replay binds exact working',async()=>{
 for(const [id,lines,response] of [
  ['gen:ahtri:36,26',['x = 180 - 36 - 26 = 118 (triangle sum)'],'118'],
  ['gen:ahext:40,65,0',['D = 105 (exterior angle)'],'105'],
  ['gen:ahext:40,65,0',['C = 75 (triangle sum)','D = 105 (straight line)'],'105'],
  ['gen:ahext:40,65,1',['B = 65 (exterior angle)'],'65'],
  ['gen:afcross:60,0',['x = 60 (vertically opposite)'],'60'],
  ['gen:afpair:0,40',['x = 50 (complementary)'],'50'],
 ] as [string,string[],string][]) {
  const d=await assess(id,lines,response);assert.equal(d.working.status,'verified',JSON.stringify(d.working));assert.equal(d.working.methodEvidence,'method-verified');
  assert.equal(await replayGeometryWorking(d,options),'replayable-current');
  assert.equal(await replayGeometryWorking({...d,response:{...d.response,working:['x = 999 (triangle sum)']}},options),'failed-replay');
 }
});
test('answer and method remain separate; unsupported never becomes false',async()=>{
 const invalid=await assess('gen:ahtri:36,26',['x = 128 (triangle sum)'],'118');assert.equal(invalid.verdict,'correct');assert.equal(invalid.working.status,'invalid');
 const wrong=await assess('gen:ahtri:36,26',['x = 118 (triangle sum)'],'119');assert.equal(wrong.verdict,'incorrect');assert.equal(wrong.working.status,'verified');assert.equal(wrong.working.agreesWithResponse,false);
 for(const line of ['x = 118','x = 119']) {const d=await assess('gen:ahtri:36,26',[line],'118');assert.equal(d.working.status,'answer-only');assert.equal(d.working.firstInvalid,null);}
 for(const line of ['x = 118 (my alternate construction)','∠Q = 118 (triangle sum)','Use the picture','x = 999 - 881 (triangle sum)']) {const d=await assess('gen:ahtri:36,26',[line],'118');assert.equal(d.working.status,'unsupported',line);assert.equal(d.working.firstInvalid,null);}
 const arithmetic=await assess('gen:ahtri:36,26',['x = 180 - 36 - 26 = 119 (triangle sum)'],'118');assert.equal(arithmetic.working.status,'invalid');
 const opposite=await assess('gen:afcross:60,0',['x = 120 (straight line)'],'60');assert.equal(opposite.working.status,'invalid');
});
test('timeout and wrong domain preserve existing common assessment; no hidden geometry in algebra',async()=>{
 const d=gradeRequest({id:'gen:ahtri:36,26',response:'118',working:['x = 118 (triangle sum)']}).decision!;
 const w=await geometryWorking(d.questionId,d.response.working,d.response.raw,d.working!,{...options,timeoutMs:0});assert.equal(w.status,'unsupported');assert.equal(w.firstInvalid,null);assert.match(w.reason,/time limit/);
 const linear=gradeRequest({id:'le-ref-3x-19-4',response:'5',working:['3x = 15','x = 5']}).decision;
 assert.ok(linear?.working); assert.deepEqual(await geometryWorking(linear.questionId,linear.response.working,'5',linear.working,options),linear.working);
 assert.equal(geometryTask('gen:aaadd:1,2'),null);assert.equal(geometryTask('gen:afcross:60,2'),null);
});

 test('only matching trusted correct-answer methods contribute to geometry evidence',async()=>{
  const {SliceSession}=await import('./session');
  const {withDecisions}=await import('../../../packages/learning/src/records');
  const {projectFromEventsWith}=await import('../../../packages/learning/src/subskill-projection');
  const {TRIANGLE_PROPERTIES_CONFIG}=await import('../../../packages/learning/src/subskill-config-geometry');
  for(const [line,response,verified,falseStep] of [['x = 118 (triangle sum)','118',1,0],['x = 128 (triangle sum)','118',0,1],['x = 118 (triangle sum)','119',0,0],['x = 118','118',0,0]] as const) {
   const s=new SliceSession('geometry-evidence',TRIANGLE_PROPERTIES_CONFIG.competency,Date.parse('2026-01-01T00:00:00Z'));
   s.submit('gen:ahtri:36,26',response,'check',{working:[line]});
   const d=await assess('gen:ahtri:36,26',[line],response);
   const es=withDecisions(s.events,s.decisions).map(e=>e.record==='attempt'?{...e,decision:{...d,attemptId:e.id,decidedBy:'server' as const}}:e);
   const projected=projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG,s.learnerId,es,s.now);
   const skill=projected.subSkills.find(x=>x.id.includes('angle-sum'))!;
   assert.equal(skill.method.verified,verified);assert.equal(skill.method.falseStep,falseStep);
   const forged=es.map(e=>e.record==='attempt'?{...e,decision:{...e.decision!,working:{...d.working,provenance:{...d.working.provenance!,competency:'MATH.number.addition'}}}}:e);
   assert.equal(projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG,s.learnerId,forged,s.now).subSkills.find(x=>x.id.includes('angle-sum'))!.method.verified,0);
  }
 });
test('an active slow Python request times out, terminates, and leaves answer credit intact',async()=>{
 const {shutdownGeometryWorkerPools,geometryWorkerDiagnostics}=await import('../../../packages/learning/src/geometry-worker');
 await shutdownGeometryWorkerPools(0);
 process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID='gen:ahtri:36,26';process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS='500';
 try {
  const d=gradeRequest({id:'gen:ahtri:36,26',response:'118',working:['x = 118 (triangle sum)']}).decision!;
  const w=await geometryWorking(d.questionId,d.response.working,d.response.raw,d.working!,{...options,timeoutMs:30});
  assert.equal(d.verdict,'correct');assert.equal(w.status,'unsupported');assert.equal(w.firstInvalid,null);
  assert.equal(geometryWorkerDiagnostics(options.root,options.python,{workerCount:1,maxQueue:8}).workerBusy,0);
 }finally {delete process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID;delete process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS;await shutdownGeometryWorkerPools(0);}
});
