import assert from 'node:assert/strict';import {test} from 'node:test';import {readFileSync} from 'node:fs';
import {ARGUMENT_RUBRIC,validateArgumentFeedback,type ArgumentRequest,type ArgumentGatewayInfo} from '../../../../../packages/english-core/src/essay/argument.ts';
const data=JSON.parse(readFileSync(new URL('../../../../../content/english/essay/benchmark/argument-coaching-quality-boundaries-v1.json',import.meta.url),'utf8'));
const info:ArgumentGatewayInfo={available:true,id:'mock',version:'1',model:'mock',rubric:ARGUMENT_RUBRIC,protocols:{observe:'essay-observe.v2'}};
const req:ArgumentRequest={protocol:'essay-observe.v2',rubric:ARGUMENT_RUBRIC,request_id:'test',grade:7,essay:{id:'draft:1',text:data.essay,words:data.essay.split(/\s+/).length},max_observations:8,task_context:{stage:'against',topic:'Libraries',prompt:'Explain your position briefly.'}};
for(const c of data.cases)test(`coaching boundary: ${c.id} (${c.validation})`,()=>{
 const response={evaluator:{id:info.id,version:info.version,model:info.model,rubric:ARGUMENT_RUBRIC,protocol:'essay-observe.v2'},output:{essay_id:'draft:1',rubric:ARGUMENT_RUBRIC,findings:[{area:'evidence',quote:data.quote,question:c.question,hint:c.hint}],not_observable:[]}};
 if(c.validation==='reject')assert.throws(()=>validateArgumentFeedback(response,req,info));
 else {const parsed=validateArgumentFeedback(response,req,info);assert.equal(parsed.status,'observations_only');assert.match(parsed.limitation,/not confirmed learner gaps/);}
});
