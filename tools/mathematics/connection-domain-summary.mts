/** Summarize the full frozen connection audit; no generation or experimental activation. */
import { readFileSync } from 'node:fs';
import { graph } from '../../packages/learning/src/graph';
const audit=JSON.parse(readFileSync(new URL('../../docs/math-skill-connections/audit.v1.json',import.meta.url),'utf8'));
const byDomain=new Map<string, any>();
for(const row of audit.rows) {
 const c=graph.get(row.competency),domain=c.domain??c.strand;
 const d=byDomain.get(domain)??{domain,competencies:0,missingModule:0,missingSkillMetadata:0,partialSkillConnections:0,connectedAnswerChains:0,noEligibleGeneralTeaching:0,withBoundedWorkingExamples:0,withoutBoundedWorkingExamples:0};
 d.competencies++;
 if(row.status==='missing-module')d.missingModule++;
 if(row.status==='missing-skill-metadata')d.missingSkillMetadata++;
 if(row.status==='partial')d.partialSkillConnections++;
 d.connectedAnswerChains+=row.skills.filter((s:any)=>s.status==='connected-answer-chain').length;
 if(row.content&&!row.content.eligibleStrategies.length)d.noEligibleGeneralTeaching++;
 if(row.content){if(row.working.supported.length)d.withBoundedWorkingExamples++;else d.withoutBoundedWorkingExamples++;}
 byDomain.set(domain,d);
}
console.log(JSON.stringify({schema:'math-connection-domains@1',source:'audit.v1.json',limits:'Teaching counts use existing demonstration eligibility, not educator approval or exact-skill alignment. Working counts inspect only existing diagnostic/guided/check examples; absent working support does not mean answer grading is unavailable. This report does not exhaustively certify answer grading or curriculum completeness.',domains:[...byDomain.values()].sort((a,b)=>a.domain.localeCompare(b.domain,'en'))},null,2));
