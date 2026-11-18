import assert from 'node:assert/strict';import {test} from 'node:test';
import {openArgumentConceptLearner} from './argument-concept-learner.ts';import {withArgumentConceptContent} from './argument-concept-content.ts';
import {loadContent} from '../content.ts';import {Learner} from '../learner.ts';import {MemoryRepo} from '../store.ts';
const clock=()=> '2026-11-18T09:00:00.000Z';
async function fixture(repo=new MemoryRepo(),id='source'){
 const base=loadContent(),source=await Learner.create(base,repo,'Synthetic source','learner',clock,id,'this_device_only');return {source,repo,content:withArgumentConceptContent(base)};
}
test('concurrent mounts share one in-flight concept creation, then later opens reload saved state',async()=>{
 const {source,repo,content}=await fixture();
 const a=openArgumentConceptLearner(source,content),b=openArgumentConceptLearner(source,content);assert.equal(a,b);
 const [first,second]=await Promise.all([a,b]);assert.equal(first,second);
 assert.equal((await repo.load(first.profileId)).filter(e=>e.kind==='profile').length,1);
 await first.note('concept-test','saved after creation');
 const reopened=await openArgumentConceptLearner(source,content);assert.notEqual(reopened,first);assert.ok(reopened.events.some(e=>e.kind==='note'&&e.text==='saved after creation'));
 assert.equal((await repo.load(source.profileId)).filter(e=>e.kind==='profile').length,1);
});
test('failed initialization clears its in-flight entry and supports an explicit retry',async()=>{
 const {source,repo,content}=await fixture();const load=repo.load.bind(repo);let fail=true;
 repo.load=async id=>{if(fail&&id.endsWith(':argument-concepts'))throw Error('Synthetic storage unavailable');return load(id);};
 await assert.rejects(openArgumentConceptLearner(source,content),/storage unavailable/);fail=false;
 const opened=await openArgumentConceptLearner(source,content);assert.equal(opened.profileId,'source:argument-concepts');assert.equal((await load(opened.profileId)).filter(e=>e.kind==='profile').length,1);
});
test('deduplication is scoped by repository and profile rather than a global learner cache',async()=>{
 const a=await fixture(),b=await fixture();const cSource=await Learner.create(loadContent(),a.repo,'Other synthetic','learner',clock,'other','this_device_only');
 const [one,two,three]=await Promise.all([openArgumentConceptLearner(a.source,a.content),openArgumentConceptLearner(b.source,b.content),openArgumentConceptLearner(cSource,a.content)]);
 assert.notEqual(one,two);assert.notEqual(one,three);assert.equal(three.profileId,'other:argument-concepts');
});
test('failed create retries safely whether profile append failed before or after persistence',async()=>{
 for(const committed of [false,true]){
  const {source,repo,content}=await fixture();const append=repo.append.bind(repo);let fail=true;
  repo.append=async(id,event)=>{if(fail&&id.endsWith(':argument-concepts')&&event.kind==='profile'){fail=false;if(committed)await append(id,event);throw Error('Synthetic create failure');}await append(id,event);};
  await assert.rejects(openArgumentConceptLearner(source,content),/create failure/);
  const reopened=await openArgumentConceptLearner(source,content);
  assert.equal((await repo.load(reopened.profileId)).filter(e=>e.kind==='profile').length,1);
 }
});
