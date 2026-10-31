import {writeFileSync} from 'node:fs';
import {programs,replayFoundation,key,instructionalSupport,type FoundationActivity} from '../../packages/mathematics/src/foundation/programs.ts';
import {validateDevelopmentalGraph} from '../../packages/mathematics/src/foundation/graph.ts';
const now='2026-10-19T00:00:00Z',due='2026-10-20T00:00:00Z',learner='synthetic-foundation-report';let serial=0;
const scenarios=programs.map(p=>{
 const events:FoundationActivity[]=[];
 const receipt=(stage:string,action:FoundationActivity['action'],extra:Partial<FoundationActivity>={}):FoundationActivity=>({kind:'math_foundation_activity',id:`report-${serial++}`,at:now,learnerId:learner,sessionId:`math:${learner}:one`,journey:'school',programId:p.id,lessonVersion:'1.0.0',stage,action,elapsedMs:100,...extra});
 for(const stage of p.stages.slice(0,7)){
  if(stage.id==='explore')events.push(receipt(stage.id,'draft',{questionId:'exploration',response:'done'}));
  for(const id of stage.questions)events.push(receipt(stage.id,'answer',{questionId:id,response:p.questions.find(q=>q.id===id)!.answer}));
  events.push(receipt(stage.id,'complete',stage.id==='transfer'?{retentionDueAt:due}:{}));
 }
 const strong=replayFoundation(learner,events,now),resumed=replayFoundation(learner,JSON.parse(JSON.stringify(events)),now);
 const strugglingEvents=p.questions.slice(0,2).map(q=>receipt(q.id==='guided'?'guided':'independent','answer',{questionId:q.id,response:q.commonError}));
 const struggling=replayFoundation(learner,strugglingEvents,now);
 events.push(receipt('concept','complete',{journey:'gre-quant'}));
 const shared=replayFoundation(learner,events,now);
 return {program:p.id,grade:p.grade,competencyId:p.competencyId,completedBeforeReview:strong.progress[key(p.id,'school')].completed.length,totalActivities:p.stages.length,completedAfterResume:resumed.progress[key(p.id,'school')].completed.length,retentionDueAt:strong.progress[key(p.id,'school')].due,schoolCompletionAfterGre:shared.progress[key(p.id,'school')].completed.length,greCompletion:shared.progress[key(p.id,'gre-quant')].completed.length,nativeAnswers:strong.ledger.events.length,directN:strong.ledger.composite.nodes[p.competencyId].directN,sharedStatus:strong.profiles[p.id].status,strongSupport:instructionalSupport(p,strong.progress[key(p.id,'school')]),strugglingSupport:instructionalSupport(p,struggling.progress[key(p.id,'school')]),strugglingStatus:struggling.profiles[p.id].status};
});
const report={syntheticOnly:true,at:now,graph:validateDevelopmentalGraph(),scenarios};
writeFileSync(new URL('../../docs/mathematics/grade1-6/synthetic-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
