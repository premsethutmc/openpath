// Research only. No application imports, learner input, provider calls or mastery writes.
import fs from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { overlapCandidates, requiredAnnotations } from './scoring.mjs';
let attemptedNetworkCalls = 0;
const deny = () => { attemptedNetworkCalls++; throw Error('Network forbidden in offline benchmark'); };
globalThis.fetch = deny;
http.request = http.get = https.request = https.get = net.connect = net.createConnection = deny;
const {LocalLinter, Dialect} = await import('harper.js');
const {binary} = await import('harper.js/binary');
const source = fs.readFileSync(new URL('../../content/english/essay/benchmark/workspace-writing-acceptance-v2.json', import.meta.url), 'utf8');
const suite = JSON.parse(source);
const result = {engine:'harper.js@3.2.0',suite:suite.id,suiteSha256:crypto.createHash('sha256').update(source).digest('hex'), status:'experimental; unvalidated; no production routing',limitations:['Overlap is only a review candidate, not correct category or valid feedback.','No matched span does not mean correct writing.','Argument quality is not assessed by this grammar checker.','Synthetic reference annotations are AI-authored, not educator validated.'],dialects:[]};
for (const dialect of ['Indian','British']) {
 const linter = new LocalLinter({binary,dialect:Dialect[dialect]});
 const cases=[];
 try {
  for (const c of suite.cases) {
   const organized=await linter.organizedLints(c.text,{language:'plaintext'});
   const raw=Object.entries(organized).flatMap(([rule,lints])=>lints.map(lint=>({rule,lint})));
   const chars=Array.from(c.text);
   const lints=raw.map(({rule,lint:l})=>({rule,start:l.span().start,end:l.span().end,quote:chars.slice(l.span().start,l.span().end).join(''),kind:l.lint_kind(),message:l.message(),suggestions:l.suggestions().map(s=>({kind:s.kind(),text:s.get_replacement_text()}))}));
   const overlaps=q=>overlapCandidates(c.text,q,lints);
   cases.push({id:c.id,kind:c.kind,lints,required:requiredAnnotations(c).map(a=>({...a,overlapCandidates:overlaps(a.quote)})),protected:(c.protected??[]).map(a=>({...a,overlapCandidates:overlaps(a.quote)}))});
  }
 } finally {await linter.dispose();}
 const language=cases.filter(c=>c.kind==='language');
 result.dialects.push({dialect,summary:{cases:cases.length,languageCases:language.length,lints:cases.reduce((n,c)=>n+c.lints.length,0),languageRequired:language.reduce((n,c)=>n+c.required.length,0),languageRequiredWithOverlap:language.reduce((n,c)=>n+c.required.filter(a=>a.overlapCandidates.length).length,0),protectedWithOverlap:cases.reduce((n,c)=>n+c.protected.filter(a=>a.overlapCandidates.length).length,0)},cases});
}
result.attemptedNetworkCalls=attemptedNetworkCalls;
if(attemptedNetworkCalls)throw Error('Offline contract failed');
fs.writeFileSync(new URL('results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.dialects.map(d=>({dialect:d.dialect,...d.summary})),null,2));
