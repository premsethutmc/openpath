/** Server-only compatibility adapter. Python owns geometric rule judgments; existing exact arithmetic reads numeric expressions. */
import { createHash } from 'node:crypto';
import { requestGeometryWorker, stopGeometryWorkers } from '../geometry-worker';
import { geometryTask, GEOMETRY_AUTHORITY } from '../geometry-task';
import { question } from '../content';
import { parseTree } from '../rewrite-registry';
import { evalTree } from '../derivation-authority';
import type { WorkingAssessment } from './working';
export { stopGeometryWorkers };
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rules:Record<string,string>={'triangle sum':'triangle-sum','triangle-sum':'triangle-sum','angle sum':'triangle-sum','straight line':'straight-line','straight-line':'straight-line','linear pair':'straight-line','vertical opposite':'vertical-opposite','vertical-opposite':'vertical-opposite','vertically opposite':'vertical-opposite','exterior angle':'exterior-angle','exterior-angle':'exterior-angle','complementary':'complementary','supplementary':'supplementary','given':'given'};
function rational(text:string):string|null {
  if(!/^[\d\s+\-*/().]+$/.test(text)) return null;
  try {const t=parseTree(text);const r=t&&evalTree(t);return r && 'n' in r && 'd' in r ? `${r.n}/${r.d}`:null;}catch{return null;}
}
export async function geometryWorking(qid:string,lines:readonly string[],response:string,base:WorkingAssessment,options:{root:string;python:string;timeoutMs?:number}):Promise<WorkingAssessment> {
  const task=geometryTask(qid); if(!task || !lines.length || base.status!=='unsupported') return base;
  const binding=digest({policy:GEOMETRY_AUTHORITY,qid,task,lines,response});
  const common={...base,statement:question(qid).prompt,provenance:{schema:'working-provenance@1' as const,questionId:qid,competency:question(qid).competency,checker:'geometry-reasoner',version:GEOMETRY_AUTHORITY,reasoning:'not-established' as const},versions:{...base.versions,authority:GEOMETRY_AUTHORITY},certificates:[] as string[],replayed:false,replayedLines:0};
  const fallback=(reason:string):WorkingAssessment=>({...common,status:'unsupported',methodEvidence:'no-method-evidence',reason});
  const steps:{id:string;statement:{predicate:string;args:string[];value:string};cited_theorem?:string;cited_step_ids:string[]}[]=[];
  let arithmeticError:number|null=null;
  const knownNumbers=new Set(['90','180',...task.problem.facts.filter(f=>f.predicate==='angle_measure').map(f=>String(f.value))]);
  for(const [i,raw] of lines.entries()) {
    const text=raw.replace(/[−–]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/°/g,'').trim();
    const reasonMatch=/\s*\(([a-z][a-z -]*)\)\s*$/i.exec(text);
    const body=reasonMatch?text.slice(0,reasonMatch.index):text;
    const m=/^(?:∠|angle\s+)?([A-Dx])\s*=\s*(.+)$/i.exec(body);
    if(!m) return fallback('This notation needs clarification. Use a named angle, an exact value and a reason in parentheses; your original working is saved.');
    const name=m[1].toLowerCase()==='x'?task.problem.goal.args[0]:m[1].toUpperCase();
    const expressions=m[2].split('=').map(v=>v.trim());
    // Parsing does not invent a connection between an arbitrary true calculation and the geometric rule.
    if(expressions.some(e=>!/^[-+]?\d+(?:\/\d+)?$/.test(e) && (e.match(/\d+(?:\.\d+)?/g)??[]).some(n=>!knownNumbers.has(n)))) return fallback('This calculation uses quantities not established in the given facts or earlier lines. Show that intermediate step; no method judgment is made.');
    const values=expressions.map(rational);
    if(values.some(v=>v===null)) return fallback('This expression is outside the supported exact arithmetic notation. Your working is saved.');
    if(values.some(v=>v!==values[0])) arithmeticError??=i;
    const whole=values.at(-1)!.match(/^(-?\d+)\/1$/);if(whole)knownNumbers.add(whole[1]);
    const reason=reasonMatch?.[1].trim().toLowerCase();
    steps.push({id:`s${i}`,statement:{predicate:'angle_measure',args:[name],value:values.at(-1)!},...(reason?{cited_theorem:rules[reason]??reason}:{}),cited_step_ids:[]});
  }
  try {
    const raw=await requestGeometryWorker(options.root,options.python,{...task,steps},options.timeoutMs??1200,{workerCount:1,maxQueue:8}) as any;
    if(raw?.authorityVersion!==GEOMETRY_AUTHORITY || !Array.isArray(raw.steps) || raw.steps.length!==lines.length) return fallback('The geometry checker response could not be authenticated. Your answer and working are saved.');
    const verdicts=raw.geometry?.native_verdicts;
    if(!Array.isArray(verdicts) || verdicts.length!==lines.length) return fallback('The geometry checker did not return a complete assessment.');
    const invalid=verdicts.findIndex((v:string)=>v==='invalid'||v==='contradictory');
    const first=arithmeticError===null?invalid:invalid<0?arithmeticError:Math.min(invalid,arithmeticError);
    const checked=verdicts.every((v:string)=>v==='verified');
    const bare=steps.length===1 && !steps[0].cited_theorem && steps[0].statement.args[0]===task.problem.goal.args[0] && /^[^=]+=\s*[-+]?\d+(?:\/\d+)?\s*°?\s*$/.test(lines[0]);
    const status=bare?'answer-only':first>=0?'invalid':checked?(raw.outcome==='verified'?'verified':'partial'):'unsupported';
    const last=steps.at(-1)!;const goal=task.problem.goal;
    const claimed=last.statement.args[0]===goal.args[0]?last.statement.value:null;
    return {...common,status,methodEvidence:status==='verified'?'method-verified':status==='invalid'?'method-false-step':'no-method-evidence',
      completeness:status==='verified'?'complete':'incomplete',
      lines:lines.map((text,i)=>({text,status:i===first?'invalid':verdicts[i]==='verified'?'certified-geometry':bare?'answer-only':'unsupported',move:steps[i].cited_theorem??null})),
      firstInvalid:bare||first<0?null:{index:first,text:lines[first],from:first?lines[first-1]:question(qid).prompt,reason:first===arithmeticError?'The values on this equality line differ.':raw.steps[first]?.explanation??raw.summary,lost:null,gained:null},
      workingAnswer:claimed?{claimed,correct:claimed===rational(String(goal.value))}:null,agreesWithResponse:claimed&&rational(response)?claimed===rational(response):null,
      certificates:status==='verified'?[binding,digest(raw)]:[],replayed:status==='verified',replayedLines:status==='verified'?lines.length:0,
      reason:bare?'A conclusion alone is answer evidence, not a demonstrated method.':raw.summary,
      provenance:{...common.provenance,reasoning:status==='verified'?'demonstrated':status==='invalid'?'refuted':'not-established'}};
  }catch{return fallback('The geometry checker was unavailable or exceeded its time limit. Your answer is graded separately and your working is saved; try again or review the lesson.');}
}

/** Re-execute the same bound request under the current Python authority. Historic decisions are never overwritten. */
export async function replayGeometryWorking(d:{questionId:string;response:{raw:string;working:string[]};working?:WorkingAssessment}, options:{root:string;python:string;timeoutMs?:number}) {
  const w=d.working;
  if(!w || w.provenance?.checker!=='geometry-reasoner') return 'failed-replay';
  if(w.provenance.version!==GEOMETRY_AUTHORITY) return 'historical-version-not-replayable';
  const again=await geometryWorking(d.questionId,d.response.working,d.response.raw,{...w,status:'unsupported'},options);
  return JSON.stringify(again)===JSON.stringify(w)?'replayable-current':'failed-replay';
}
