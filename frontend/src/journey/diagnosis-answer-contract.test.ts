import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, problemOf, exposureKey, phasePool } from '../../../packages/learning/src/families';
import { diagnosticScopeAccepts, probeReading, reason, type Observation } from '../../../packages/learning/src/reasoning';

const predicted = (questionId: string, bug: string): Observation => ({ questionId, response: probeReading(questionId, bug).predicted[0] });

test('existing exact and numeric answer readers normalize decimal/money predictions and keep raw observations', () => {
  for (const [qid, bug, answers] of [
    ['gen:aedecc:2,2,0,1', 'longer-is-larger', ['2.01', '201/100', ' 2.010 ']],
    ['gen:acmoneyadd:17,19,11,5,0', 'paise-over-100', ['28.120', '703/25', '28.12']],
    ['gen:acmoneyadd:14,15,18,12,0', 'no-carry', ['32.35', '647/20']],
  ] as const) {
    for (const response of answers) {
      assert.equal(probeReading(qid, bug, response).reading, 'predicted', `${qid}: ${response}`);
      const result = reason(qid, [{ questionId: qid, response }])!;
      assert.equal(result.observed[0].response, response);
      assert.ok(result.observed[0].matches.includes(bug));
      assert.notEqual(result.best?.id, bug, 'one wrong answer cannot establish a misconception');
    }
    for (const response of ['2..01', '1/0', '']) {
      assert.equal(probeReading(qid, bug, response).reading, 'unreadable');
      assert.deepEqual(reason(qid, [{questionId: qid, response}])!.observed[0].matches, []);
    }
  }
});

test('tuple diagnosis preserves order and reuses exact answer equivalence', () => {
  const qid = 'gen:addur:0,84', bug = 'no-carry';
  for (const response of ['(8, 75)', '(16/2, 150/2)', '8,75']) assert.equal(probeReading(qid, bug, response).reading, 'predicted');
  assert.equal(probeReading(qid, bug, '(75,8)').reading, 'other');
  assert.equal(probeReading(qid, bug, '(8,)').reading, 'unreadable');
  assert.equal(probeReading(qid, bug, problemOf(qid)!.answer).reading, 'correct');
  assert.deepEqual(probeReading(qid, bug).predicted, ['(8, 75)']);
});

test('legacy numeric, unordered-set and choice answer behavior remains available', () => {
  const setId='gen:quad:-5,6', p=problemOf(setId)!;
  const bug=p.bugs.find(b => probeReading(setId,b.id).discriminates)!;
  assert.equal(probeReading(setId,bug.id,p.answer.split(',').reverse().join(',')).reading,'correct');
  const guess=probeReading(setId,bug.id).predicted[0];
  assert.equal(probeReading(setId,bug.id,guess).reading,'predicted');
  const qid='gen:pow:3,3:mc', mc=problemOf(qid)!;
  for(const b of mc.bugs){const result=probeReading(qid,b.id);assert.equal(probeReading(qid,b.id,result.predicted[0]).reading,'predicted');assert.match(result.predicted[0],/^[A-D]$/);}
  assert.equal(probeReading(qid,mc.bugs[0].id,mc.answer.toLowerCase()).reading,'correct');
});

test('repeating an exposure cannot establish a misconception, including typed/choice variants', () => {
  const a=predicted('gen:pow:3,3','multiply-for-power');
  const mc=predicted('gen:pow:3,3:mc','multiply-for-power');
  assert.equal(exposureKey(a.questionId),exposureKey(mc.questionId));
  const result=reason(a.questionId,[a,a,mc,a])!;
  assert.notEqual(result.best?.id,'multiply-for-power');
  assert.equal(result.observed.filter(o=>o.matches.includes('multiply-for-power')).length,1);
  assert.equal(result.observed.length,4,'raw observation alignment is preserved');
});

test('fraction attribution requires a correct same-denominator contrast, not only two same-numerator errors', () => {
  const bug='bigger-bottom-bigger', ids=['gen:adfcmp:1,1,2,3,0','gen:adfcmp:1,1,4,5,0'];
  const observations=ids.map(id=>predicted(id,bug));
  const before=reason(ids[0],observations)!;
  assert.notEqual(before.status,'established');assert.ok(before.next);
  assert.ok(phasePool('adfcmp','diagnostic').includes(before.next!));
  const contrast=problemOf(before.next!)!;assert.equal(contrast.params[0],0);assert.equal(contrast.params[4],0);
  const wrong=predicted(contrast.id,'more-parts-wrong-way');
  assert.notEqual(reason(ids[0],[...observations,wrong])!.status,'established');
  const after=reason(ids[0],[...observations,{questionId:contrast.id,response:contrast.answer}])!;
  assert.equal(after.status,'established');assert.equal(after.best?.id,bug);
  const otherDirection='gen:adfcmp:0,7,2,3,1';
  assert.notEqual(reason(ids[0],[...observations,{questionId:otherDirection,response:problemOf(otherDirection)!.answer}])!.status,'established');
});

test('area and perimeter two-sides evidence stays task-scoped and seeks the distinguishing contrast', () => {
  const bug='two-sides';
  for(const need of [0,1]) {
    const ids=[`gen:aeperar:${need},3,5,0`,`gen:aeperar:${need},4,7,0`];
    const observations=ids.map(id=>predicted(id,bug));
    const before=reason(ids[0],observations)!;
    assert.notEqual(before.status,'established');assert.ok(before.next);
    const contrast=problemOf(before.next!)!;assert.equal(contrast.params[0],1-need);assert.equal(contrast.params[3],0);
    const after=reason(ids[0],[...observations,{questionId:contrast.id,response:contrast.answer}])!;
    assert.equal(after.status,'established');assert.equal(after.best?.id,bug);
    const mixed=reason(ids[0],[observations[0],predicted(`gen:aeperar:${1-need},4,7,0`,bug)])!;
    assert.notEqual(mixed.status,'established');assert.deepEqual(mixed.observed[1].matches,[]);
    const differentContext=reason(ids[0],[observations[0],predicted(`gen:aeperar:${need},4,7,1`,bug)])!;
    assert.notEqual(differentContext.status,'established');assert.deepEqual(differentContext.observed[1].matches,[]);
  }
});

test('adaptive investigation reaches a declared contrast and a second scoped observation without a bespoke question list', () => {
  for(const [root, bug] of [['gen:adfcmp:1,1,2,3,0','bigger-bottom-bigger'],['gen:aeperar:0,3,5,0','two-sides'],['gen:aeperar:1,3,5,0','two-sides']]) {
    const observations=[predicted(root,bug)], original=problemOf(root)!;
    for(let i=0;i<3;i++) {
      const state=reason(root,observations)!;
      if(state.status==='established') break;
      assert.ok(state.next,JSON.stringify(state));
      const next=problemOf(state.next!)!;
      const sameTask=next.params[0]===original.params[0];
      observations.push(sameTask?predicted(next.id,bug):{questionId:next.id,response:next.answer});
    }
    const result=reason(root,observations)!;
    assert.equal(result.status,'established',JSON.stringify(result));
    assert.equal(result.best?.id,bug);
    assert.equal(new Set(observations.map(o=>exposureKey(o.questionId))).size,observations.length);
  }
});


test('equivalent predictions from competing causes do not establish either cause', () => {
  const result=reason('gen:pow:2,4',[{questionId:'gen:pow:2,4',response:'8'},{questionId:'gen:pow:3,3',response:'18/2'}])!;
  assert.notEqual(result.status,'established');
  assert.ok(result.observed.every(o=>o.matches.includes('multiply-for-power')&&o.matches.includes('one-factor-short')));
  assert.equal(result.observed[1].response,'18/2');
});

test('later probes inherit the original task scope and duplicate corrections are not fresh contrasts', () => {
  const root='gen:aeperar:0,3,5,0';
  assert.equal(diagnosticScopeAccepts(root,'gen:aeperar:0,4,7,0','two-sides'),true);
  assert.equal(diagnosticScopeAccepts(root,'gen:aeperar:1,4,7,0','two-sides'),false);
  assert.equal(diagnosticScopeAccepts(root,'gen:aeperar:0,4,7,1','two-sides'),false);
  assert.equal(diagnosticScopeAccepts(root,'gen:aeperar:0,4,7,0','unknown'),false);
  const obs=[predicted(root,'two-sides'),predicted('gen:aeperar:0,4,7,0','two-sides')];
  const contrast=reason(root,obs)!.next!;
  const result=reason(root,[...obs,predicted(contrast,'two-sides'),{questionId:contrast,response:problemOf(contrast)!.answer}])!;
  assert.notEqual(result.status,'established');
  assert.equal(result.observed.at(-1)!.right,true,'raw correctness remains truthful even when duplicate evidence is ignored');
});


test('an unrelated first response cannot establish security or a cause for the requested root', () => {
  const root='gen:aeperar:0,3,5,0', unrelated='gen:pow:3,3';
  assert.equal(reason(root,[{questionId:unrelated,response:problemOf(unrelated)!.answer}]),null);
  assert.equal(reason(root,[predicted(unrelated,'multiply-for-power'),predicted('gen:pow:4,3','multiply-for-power')]),null);
});

test('malformed or mismatched declared evidence fails closed without a legacy fallback', () => {
  const family=FAMILIES.get('aeperar')!, original=family.bugs;
  const root='gen:aeperar:0,3,5,0', candidate='gen:aeperar:0,4,7,0';
  const good={scope:[{index:0,values:[0]}],correctContrasts:[[{index:0,values:[1]}]]};
  for(const evidence of [null,{}, {...good,scope:null},{...good,scope:[{index:0}]},{...good,scope:[{index:0,values:['0']}]},{...good,scope:[{index:0,values:[1]}]},{...good,correctContrasts:[]},{...good,correctContrasts:[null]},{...good,correctContrasts:[[{index:0,values:[]}]]}]) {
    try {
      family.bugs=p=>original(p).map(b=>({...b,evidence} as typeof b));
      assert.equal(diagnosticScopeAccepts(root,candidate,'two-sides'),false);
      assert.equal(reason(root,[{questionId:root,response:'8'},{questionId:candidate,response:'11'}]),null);
    } finally {family.bugs=original;}
  }
  assert.equal(diagnosticScopeAccepts(root,candidate,'two-sides'),true);
});


test('follow-ups cannot establish an explanation absent from the original task', () => {
  const result=reason('gen:cint:0,8,7',[
    {questionId:'gen:cint:0,8,7',response:'54'},
    {questionId:'gen:pow:4,3',response:'12'},
    {questionId:'gen:pow:5,3',response:'15'},
  ])!;
  assert.notEqual(result.status,'established');
  assert.equal(result.best,null);
});

test('known sampled answer types remain an explicit uncertain result rather than a null-family error', () => {
  const qid='gen:aqfp:0,2,3,3', p=problemOf(qid)!;
  assert.equal(p.type,'expression');
  const state=reason(qid,[{questionId:qid,response:p.answer}])!;
  assert.ok(state);assert.equal(state.status,'uncertain');assert.equal(state.best,null);assert.equal(state.next,null);
  assert.deepEqual(state.observed[0].matches,[]);
  const probe=probeReading(qid,p.bugs[0].id,p.answer);
  assert.equal(probe.discriminates,false);assert.equal(probe.correct,null);assert.equal(probe.reading,'unreadable');
  assert.equal(reason('gen:no-such-family:1',[]),null);
});
