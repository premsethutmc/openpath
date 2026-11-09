/** Rebuild the comparison against the adaptive candidate; exact text and question options for educator review. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { moduleFor, question } from '../../packages/learning/src/content';
import { contentHash, currentRevision, chapterExplanation } from '../../packages/learning/src/explanation-review';
const base = '08a6d5aa97aee22fb8025940341334be5f43e120';
const old = JSON.parse(execFileSync('git', ['show', `${base}:content/learning/library.v1.json`], {encoding:'utf8', maxBuffer: 32*1024*1024}));
const lines = ['# Calculus teacher comparison', '', `Compared with adaptive candidate ${base}. All revised teaching remains pending educator review.`, '',
  'Review the selected strategy, not just the chapter. The browser evidence identifies which strategy the engine actually showed. Machine arithmetic checks and synthetic success do not demonstrate student understanding.', ''];
for (const cid of ['MATH.calculus.derivatives','MATH.calculus.integration-methods']) {
  const m = moduleFor(cid)!; const before = old.modules.find((x: any) => x.competency === cid);
  for (const s of [chapterExplanation(m), ...m.strategies]) {
    const prev = s.id === 'chapter' ? {screens:before.chapter} : before.strategies.find((x:any)=>x.id===s.id);
    lines.push(`## ${cid}#${s.id}`, '', `Revision: ${contentHash(cid,s)}`, `Status: ${currentRevision(m,s)?.revision.status ?? 'unregistered'}`, '', '### Before', '');
    for (const sc of prev.screens) lines.push(`**${sc.title}**`, ...sc.text, ...(sc.math ?? []).map((x:string)=>`- ${x}`), '');
    lines.push('### Revised student screens', '');
    for (const [i, sc] of s.screens.entries()) lines.push(`**${i+1}. ${sc.title}**`, ...sc.text, ...(sc.math ?? []).map(x=>`- ${x}`), `Example: ${sc.instance ?? 'prerequisite illustration'}`, '');
    if (s.id !== 'chapter') for (const [label,id] of [['Guided',s.guided],['Independent recheck',s.check]]) {
      const q = question(id); lines.push(`**${label}: ${id}**`, q.prompt, ...(q.options??[]).map((x,i)=>`${'ABCD'[i]}. ${x}`), `Answer: ${q.answer}`, '');
    }
  }
}
const dir = new URL('../../docs/calculus-teacher-review/', import.meta.url); mkdirSync(dir,{recursive:true});
writeFileSync(new URL('COMPARISON.md',dir), lines.join('\n')+'\n');
console.log('Wrote docs/calculus-teacher-review/COMPARISON.md');
