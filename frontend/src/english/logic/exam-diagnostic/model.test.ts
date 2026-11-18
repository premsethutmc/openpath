import assert from 'node:assert/strict';
import {test} from 'node:test';
import {analyseSyntheticWriting, EXAM_WRITING_RUBRIC, type SyntheticWritingPost} from './model.ts';
const text = 'The learner write a short response about public transport. The response explains why reliable buses matter to workers and students. It also considers the cost of improving services and the benefits for the community.';
const info = {available:true,id:'synthetic-gateway',version:'test@1',model:'simulated',rubric:EXAM_WRITING_RUBRIC,protocols:{observe:'essay-observe.v2' as const,rewrite:'essay-rewrite.v2' as const}};
const observation = {competency:'EN.GRM.VERB.sva',kind:'error',quote:'learner write',correction:'learner writes',explanation:'The singular subject requires a singular verb.',confidence:'high',verification:'required'};
function transport(change: (output: Record<string, unknown>) => void = () => {}, provenance = info): SyntheticWritingPost {
  return async body => {
    assert.equal(body.data_use, 'synthetic_test'); assert.equal(body.task, 'observe');
    const request = body.request as {essay:{id:string};rubric:string};
    assert.equal(request.rubric,EXAM_WRITING_RUBRIC);
    const output = {essay_id:request.essay.id,rubric:request.rubric,observations:[observation],not_observable:[]};
    change(output);
    return {output,evaluator:{...provenance,protocol:'essay-observe.v2'}};
  };
}
test('synthetic gateway yields tentative check candidates, no score or mastery', async () => {
  const result = await analyseSyntheticWriting(text,info,transport());
  assert.equal(result.status,'observations_only');
  assert.equal(result.observations[0].requiresCheck,true);
  assert.equal(result.observations[0].skill,'subject_verb_agreement');
  assert.equal('mastery' in result,false); assert.equal('score' in result,false);
});
test('refuses real learner data and Grade 8 gateway before transmission', async () => {
  let calls = 0; const post: SyntheticWritingPost = async () => {calls++;return {};};
  await assert.rejects(analyseSyntheticWriting(text,info,post,'real_learner'),/not enabled/);
  await assert.rejects(analyseSyntheticWriting(text,{...info,rubric:'openpath.g8-writing@2'},post),/not configured/);
  await assert.rejects(analyseSyntheticWriting(text,{...info,available:false},post),/not configured/);
  assert.equal(calls,0);
});
test('slips, low confidence and style never request diagnosis', async () => {
  for (const patch of [{possible_slip:true},{confidence:'low'},{kind:'style',verification:'not_required'}]) {
    const result = await analyseSyntheticWriting(text,info,transport(o=>{o.observations=[{...observation,...patch}];}));
    assert.equal(result.observations[0].requiresCheck,false);
  }
});
test('rejects ungrounded, unsupported and injection-shaped output', async () => {
  for (const patch of [{quote:'invented quotation'},{competency:'administrator'},{action:'grant_access'},{correction:'learner write'},{possible_slip:'false'},{kind:'style',verification:'required'}]) {
    await assert.rejects(analyseSyntheticWriting(text,info,transport(o=>{o.observations=[{...observation,...patch}];})));
  }
  await assert.rejects(analyseSyntheticWriting(text,info,transport(o=>{o.score=99;})));
  await assert.rejects(analyseSyntheticWriting(text,info,transport(o=>{o.observations=Array(9).fill(observation);})));
});
test('fails closed on gateway provenance mismatch or outage; no pattern fallback', async () => {
  await assert.rejects(analyseSyntheticWriting(text,info,transport(()=>{},{...info,model:'other'})),/different configuration/);
  await assert.rejects(analyseSyntheticWriting(text,info,async()=>{throw new Error('offline');}),/offline/);
});

test('simulated model concern -> independent checks -> deterministic teaching, not mastery', async () => {
  const {planWritingChecks,verifyWritingSkill} = await import('./verification.ts');
  const result = await analyseSyntheticWriting(text,info,transport());
  const checks = planWritingChecks(result.observations);
  assert.equal(checks.length,2);
  const wrong = Object.fromEntries(checks.map(q=>[q.id,1-q.answer]));
  const correct = Object.fromEntries(checks.map(q=>[q.id,q.answer]));
  const needed = verifyWritingSkill('subject_verb_agreement',wrong);
  assert.equal(needed.outcome,'needs_practice'); assert.ok(needed.lesson); assert.equal(needed.calibrated,false);
  assert.equal(verifyWritingSkill('subject_verb_agreement',correct).outcome,'no_gap_shown');
  assert.equal(verifyWritingSkill('subject_verb_agreement',correct).lesson,null);
  assert.equal(verifyWritingSkill('subject_verb_agreement',{...correct,[checks[0].id]:wrong[checks[0].id]}).outcome,'inconclusive');
  assert.equal(verifyWritingSkill('subject_verb_agreement',{}).outcome,'inconclusive');
  assert.equal(verifyWritingSkill('subject_verb_agreement',wrong,[checks[0].id]).outcome,'inconclusive');
  assert.deepEqual(planWritingChecks(result.observations,[checks[0].id]),[]);
});

test('article checks are independently scored and observed strengths never seed checks', async () => {
  const {planWritingChecks,verifyWritingSkill} = await import('./verification.ts');
  const base = {skill:'articles' as const,quote:'a hour',correction:'an hour',explanation:'Use an before a vowel sound.',kind:'error' as const,confidence:'high' as const,requiresCheck:true};
  const checks = planWritingChecks([base,base]);
  assert.equal(checks.length,2);
  assert.equal(verifyWritingSkill('articles',Object.fromEntries(checks.map(q=>[q.id,1-q.answer]))).outcome,'needs_practice');
  assert.equal(verifyWritingSkill('articles',{[checks[0].id]:NaN,[checks[1].id]:-1}).outcome,'inconclusive');
  assert.deepEqual(planWritingChecks([{...base,kind:'strength'}]),[]);
});


test('preserves explicit not-observable coverage mapped to every supported writing skill', async () => {
  const ids = ['EN.GRM.VERB.sva', 'EN.GRM.NOUN.articles', 'EN.WRITE.source_fidelity', 'EN.WRITE.evidence_reasoning'];
  const result = await analyseSyntheticWriting(text, info, transport(o => {
    o.observations = [];
    o.not_observable = ids;
  }));
  assert.deepEqual(result.notObservable, ['subject_verb_agreement', 'articles', 'source_fidelity', 'evidence_reasoning']);
  assert.deepEqual(result.observations, []);
  const partial = await analyseSyntheticWriting(text, info, transport(o => { o.not_observable = ['EN.WRITE.source_fidelity']; }));
  assert.deepEqual(partial.notObservable, ['source_fidelity']);
  assert.equal(partial.observations[0].skill, 'subject_verb_agreement');
  assert.deepEqual((await analyseSyntheticWriting(text, info, transport())).notObservable, []);
});

test('rejects malformed, duplicate and contradictory not-observable coverage', async () => {
  for (const coverage of [undefined, null, 'EN.GRM.NOUN.articles', ['unknown'], [null], [{}], ['EN.GRM.NOUN.articles', 'EN.GRM.NOUN.articles']]) {
    await assert.rejects(analyseSyntheticWriting(text, info, transport(o => { o.not_observable = coverage; })));
  }
  for (const patch of [{}, {kind:'strength', correction:undefined}, {kind:'style', verification:'not_required'}, {confidence:'low'}]) {
    await assert.rejects(analyseSyntheticWriting(text, info, transport(o => {
      o.observations = [{...observation, ...patch}];
      o.not_observable = ['EN.GRM.VERB.sva'];
    })), /Invalid writing observation coverage/);
  }
});
