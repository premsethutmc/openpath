/** Full shared graph inventory, deterministic and read-only; connected means mechanical, never educator approval. */
import { graph } from '../../packages/learning/src/graph';
import { moduleFor } from '../../packages/learning/src/content';
import { modulePhasePool } from '../../packages/learning/src/library';
import { FAMILIES, problemOf, exposureKey } from '../../packages/learning/src/families';
import { connectionConfig, connectionStrategies, validSkillTask, connectedSkill } from '../../packages/learning/src/skill-connections';
import { teachable } from '../../packages/learning/src/intervention';
import { expectedWorkingAuthority } from '../../packages/learning/src/grading/working';
import { quarantined } from '../../packages/learning/src/question-status';
const rows = graph.competencies.slice().sort((a,b)=>a.id.localeCompare(b.id,'en')).map((c)=> {
  const m=moduleFor(c.id), config=connectionConfig(c.id);
  const families=[...FAMILIES.values()].filter(f=>f.competency===c.id).map(f=>f.id).sort();
  const content = m ? {chapterScreens:m.chapter.length, strategies:m.strategies.length, eligibleStrategies:m.strategies.filter(st=>teachable(m,st,[])).map(st=>st.id)} : null;
  const examples = m ? [...new Set([...m.diagnostics,...m.strategies.flatMap(st=>[st.guided,st.check])])] : [];
  const working = {scope:'Existing diagnostic/guided/check examples only; not whole-family certification',supported:examples.filter(id=>!!expectedWorkingAuthority(id)),unsupported:examples.filter(id=>!expectedWorkingAuthority(id))};
  if(!m || !config) return {competency:c.id,families,status:!m?'missing-module':'missing-skill-metadata',content,working,skills:[]};
  const check=[...new Set([...modulePhasePool(m,'check'),...m.practice,...m.diagnostics,...m.strategies.map(s=>s.check)])].filter(id=>!quarantined(id));
  const retention=[...new Set([...modulePhasePool(m,'retention'),...m.retention])].filter(id=>!quarantined(id));
  const skills=config.subSkills.map(s=>{
    const checks=check.filter(id=>validSkillTask(config,s.id,id));
    const delayed=retention.filter(id=>validSkillTask(config,s.id,id));
    const strategies=connectionStrategies(m,config,s.id).filter(st=>teachable(m,st,[]));
    const taught=new Set(strategies.flatMap(st=>[st.guided,...st.screens.flatMap(b=>b.instance?[b.instance]:[])]).map(exposureKey));
    const fresh=checks.filter(id=>!taught.has(exposureKey(id)));
    const diagnoses=[...new Set(checks.flatMap(id=>problemOf(id.replace(/:(mc|w)$/,''))?.bugs.filter(b=>b.predict!==null).map(b=>b.id)??[]))].sort();
    const gaps=[...(!strategies.length?['missing-eligible-teaching']:[]),...(!fresh.length?['missing-fresh-check']:[]),...(!delayed.length?['missing-retention']:[]),...(!diagnoses.length?['missing-diagnostic-predictions']:[])];
    return {skill:s.id,parameters:s.parameters??[],status:gaps.length?'gap':'connected-answer-chain',gaps,strategies:strategies.map(st=>st.id),freshChecks:fresh.length,retention:delayed.length,diagnosticPredictions:diagnoses,working:checks.some(id=>!!expectedWorkingAuthority(id))?'bounded-checker-available':'unsupported',examples:{check:fresh[0]??null,retention:delayed[0]??null}};
  });
  const unmappedFamilies=families.filter(f=>!config.subSkills.some(s=>s.families.includes(f)));
  const unclassifiedQuestions=check.filter(id=>!connectedSkill(config,id)).length;
  return {competency:c.id,families,content,working,status:skills.every(s=>s.status==='connected-answer-chain')&&!unmappedFamilies.length&&!unclassifiedQuestions?'connected-configured-skills':'partial',mapping:config.mapping,unmappedFamilies,unclassifiedQuestions,skills};
});
console.log(JSON.stringify({schema:'math-skill-connections@1',scope:'Every competency in the shared mathematics graph; unconfigured skills remain gaps.',meaning:'Mechanical task/teaching/check/retention connections only. Diagnostic predictions are hypotheses, not learner diagnoses. Review eligibility is not educator approval. No curriculum completion claim.',counts:Object.fromEntries([...new Set(rows.map(r=>r.status))].sort().map(status=>[status,rows.filter(r=>r.status===status).length])),rows},null,2));
