/** Audit existing curricula/question pools, never generate or approve a content bank. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {buildDashboard} from '../../packages/learning/src/dashboard-build';
import {boardFor} from '../../packages/learning/src/curricula';
import {learnerState,make} from '../../packages/learning/src/session';
import {moduleFor,question,isCorrect} from '../../packages/learning/src/content';
import {fromPool} from '../../packages/learning/src/intervention';
import {modulePhasePool} from '../../packages/learning/src/library';
import {reviewState} from '../../packages/learning/src/dashboard';
import {activeRegistry} from '../../packages/learning/src/review';
const {releases}=buildDashboard();
const report=releases.filter(r=>[7,10].includes(r.release.grade)).map(r=>{
 const {grade,board}=r.release;const curriculum=boardFor(board,grade)!;
 const st=learnerState('synthetic-coverage',[make.enrol({learnerId:'synthetic-coverage',sessionId:'audit',at:'2026-10-21T12:00:00Z'},grade,'2026-27',curriculum)],Date.parse('2026-10-21T12:00:00Z'));
 const ids=new Map<string,string>();
 for(const c of Object.values(r.competencies)){
  const m=moduleFor(c.evidenceTarget);const q=m&&fromPool(m,'practice',st.records);
  if(c.families.length&&q){assert.ok(isCorrect(question(q),question(q).answer));ids.set(c.id,q);}
 }
 const requirements=Object.values(r.outcomes).map(o=>({id:o.id,text:o.text,coverage:o.class,reason:o.why,methodRequired:o.method,competencies:o.competencies,workingCompetencies:o.competencies.filter(c=>ids.has(c)),writtenTasks:o.written}));
 const families=[...new Map(Object.values(r.competencies).flatMap(c=>c.families).map(f=>[f.id,f])).values()];
 let checkedQuestions=0;
 for(const c of Object.values(r.competencies)){const m=moduleFor(c.evidenceTarget);if(!m?.pool)continue;for(const id of modulePhasePool(m,'practice')){const q=question(id);assert.ok(isCorrect(q,q.answer),id);checkedQuestions++;}}
 return {release:r.release,chapters:r.nodes.map(n=>({id:n.id,title:n.title})),totalRequirements:requirements.length,mappedRequirements:requirements.filter(o=>o.competencies.length).length,mappedCompetencies:Object.keys(r.competencies).length,competenciesWithKeyboardPractice:ids.size,requirementsWithWorkingQuestions:requirements.filter(o=>o.workingCompetencies.length).length,requirementsWithQuestionsForEveryMappedCompetency:requirements.filter(o=>o.competencies.length&&o.competencies.every(c=>ids.has(c))).length,partial:requirements.filter(o=>o.coverage==='partial').length,unsupported:requirements.filter(o=>o.coverage==='unsupported'||o.coverage==='not-implemented').length,awaitingReview:requirements.filter(o=>o.coverage==='awaiting').length,validated:requirements.filter(o=>o.coverage==='validated').length,families:families.length,releasedFamilies:families.filter(f=>reviewState(activeRegistry(),`family:${f.id}`,f.fingerprint)==='released').length,checkedPracticeQuestions:checkedQuestions,requirements};
});
const output=process.argv[2];if(output)writeFileSync(output,JSON.stringify({scope:'Existing mapped requirements, not a claim of complete or educator-approved curriculum. Working questions means at least one mapped competency has grade-eligible keyboard practice. Partial includes method/drawing requirements that cannot be fulfilled by final answers.',curricula:report},null,2)+'\n');
console.table(report.map(({release:r,chapters,requirements,...counts})=>({board:r.board,grade:r.grade,sourceVerified:r.sourceVerified,...counts})));
