import assert from 'node:assert/strict';
import {test} from 'node:test';
import {QUESTIONS,PASSAGE,CHECKS,validSession,initialSession,answer,submitWriting} from './session.ts';
import {verifyWritingSkill,WRITING_CHECKS,planWritingChecks} from './verification.ts';

test('persisted skipped writing cannot acquire an orphan revision',()=>{
 let s=initialSession();
 for(const q of QUESTIONS) s=answer(s,q.id,q.answer);
 s=submitWriting(s,'');
 assert.equal(validSession(s),true);
 assert.equal(validSession({...s,revision:'This has no original writing.'}),false);
});
test('reading explanations cite supplied text and every keyed option is valid',()=>{
 for(const q of QUESTIONS){ assert.ok(PASSAGE.includes(q.quote)); assert.ok(q.answer>=0 && q.answer<q.options.length); }
 for(const q of CHECKS){ assert.ok(q.passage.includes(q.quote)); assert.ok(q.answer>=0 && q.answer<q.options.length); }
});
test('exposure prevents a previously revealed writing pair from becoming fresh evidence',()=>{
 const observation={skill:'articles' as const,quote:'a hour',explanation:'Vowel sound',kind:'error' as const,confidence:'high' as const,requiresCheck:true};
 const pair=WRITING_CHECKS.filter(q=>q.skill==='articles');
 const correct=Object.fromEntries(pair.map(q=>[q.id,q.answer]));
 for(const q of pair){
  assert.deepEqual(planWritingChecks([observation],[q.id]),[]);
  const result=verifyWritingSkill('articles',correct,[q.id]);
  assert.equal(result.outcome,'inconclusive'); assert.equal(result.lesson,null);
 }
});
