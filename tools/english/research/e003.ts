/**
 * E003: paired, synthetic, real-ledger comparison. Research-only, no application wiring.
 * Run: node tools/english/research/e003.ts
 * Node >=22.18 (TypeScript stripping). Uses actual Ledger.rebuild and binaryUpdate.
 */
import assert from "node:assert/strict";
import { Ledger, binaryUpdate, logistic, rng, gaussian, pCorrect } from "../../../packages/english-core/src/index.ts";
import type { Estimate, ItemParams, EvidenceEvent, CodeItem } from "../../../packages/english-core/src/index.ts";
import { loadContext } from "../load.ts";

type Mode = "matched" | "slip" | "session";
type Model = "baseline" | "robust";
type Row = {scenario:Mode; model:Model; learners:number; coverage80:number; logloss:number; brier:number; falseMastery:number; missedMastery:number; avgIntervalWidth:number};
const MODELS:Model[]=["baseline","robust"];
const MODES:Mode[]=["matched","slip","session"];
const N=120, TRAIN=20, HOLDOUT=10;
const seed=20261016;
const z80=1.2815515655446004;
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const robustP=(theta:number,p:ItemParams)=>.10+.80*pCorrect(theta,p);

/** Stateless contamination likelihood with Fisher scoring; no session state. */
export function robustUpdate(est:Estimate,p:ItemParams,correct:boolean):Estimate {
  const L=logistic(p.a*(est.mean-p.b));
  const P=.10+.80*(p.c+(1-p.c)*L);
  const deriv=.80*(1-p.c)*p.a*L*(1-L);
  const score=(correct ? 1/P : -1/(1-P))*deriv;
  const info=deriv*deriv/(P*(1-P));
  const variance=1/(1/est.variance+info);
  return {mean:est.mean+variance*score,variance};
}

function simulate(mode:Mode, learner:number) {
  const random=rng(seed + learner*101 + MODES.indexOf(mode)*100000);
  const theta=clamp(4+1.5*gaussian(random),1,8);
  const ctx=loadContext({framework:"0.1.0"});
  const capability=ctx.index.leafIds[0];
  const items:CodeItem[]=[];
  const events:EvidenceEvent[]=[];
  const holdout:{p:ItemParams;y:boolean}[]=[];
  let shock=false;
  for(let t=0;t<TRAIN+HOLDOUT;t++){
    const b=2+5*random();
    const p={a:1.15,b,c:0};
    const item:CodeItem={id:`research.e003.${learner}.${t}`,version:1,target:capability,format:"typed:research",b,a:p.a,prompt:"Synthetic answer (research only)",answers:["yes"]};
    items.push(item);
    if(t%5===0)shock=random()<.25;
    let prob=pCorrect(theta,p);
    if(mode==="slip")prob=.10+.80*prob;
    if(mode==="session" && shock)prob*=.15;
    const y=random()<prob;
    if(t<TRAIN){
      events.push({kind:"evidence",id:`e003:${learner}:${t}`,at:new Date(Date.UTC(2026,0,1,0,t)).toISOString(),session:`s${Math.floor(t/5)}`,item:{id:item.id,version:1},response:{kind:"typed",text:y?"yes":"no"}});
    } else holdout.push({p,y});
  }
  // Inject synthetic items into the actual content index. The ledger still scores them itself.
  for(const item of items)ctx.content.items.set(item.id,{kind:"code",...item});
  return {ctx,theta,events,holdout,capability};
}
function score(mode:Mode,model:Model):Row {
  let covered=0,loss=0,brier=0,fp=0,fn=0,width=0;
  for(let learner=0;learner<N;learner++){
    const {ctx,theta,events,holdout,capability}=simulate(mode,learner);
    const updater=model==="robust"?robustUpdate:binaryUpdate;
    const ledger=Ledger.rebuild({...ctx,researchBinaryUpdate:updater},`synthetic-${learner}`,events);
    const replay=Ledger.rebuild({...ctx,researchBinaryUpdate:updater},`synthetic-${learner}`,events);
    assert.deepEqual(ledger.composite,replay.composite,"non-deterministic replay");
    assert.deepEqual(ledger.decisions,replay.decisions,"non-deterministic decisions");
    assert.equal(ledger.composite.nodes[capability].directN,TRAIN,"unexpected held evidence");
    const e=ledger.composite.nodes[capability].direct;
    const sd=Math.sqrt(e.variance);
    covered+=Number(theta>=e.mean-z80*sd && theta<=e.mean+z80*sd);
    width+=2*z80*sd;
    const estimatedMastery=e.mean-z80*sd>=5;
    fp+=Number(estimatedMastery && theta<5);
    fn+=Number(!estimatedMastery && theta>=5);
    for(const {p,y} of holdout){
      let pred=model==="robust"?robustP(e.mean,p):pCorrect(e.mean,p);
      // Future session shock is unobserved; evaluate marginal probability.
      if(mode==="session")pred=.75*pred+.25*.15*pred;
      pred=clamp(pred,1e-8,1-1e-8);
      loss+=-(y?Math.log(pred):Math.log(1-pred));
      brier+=(Number(y)-pred)**2;
    }
  }
  return {scenario:mode,model,learners:N,coverage80:covered/N,logloss:loss/(N*HOLDOUT),brier:brier/(N*HOLDOUT),falseMastery:fp/N,missedMastery:fn/N,avgIntervalWidth:width/N};
}
const rows=MODES.flatMap(scenario=>MODELS.map(model=>score(scenario,model)));
console.log(JSON.stringify({protocol:"E003-real-ledger-v1",seed,train:TRAIN,holdout:HOLDOUT,rows},null,2));
