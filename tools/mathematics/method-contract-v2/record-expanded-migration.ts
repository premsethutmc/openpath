/** Describe expanded synthetic inputs without running any assessment or deriving oracle labels. */
import {readFileSync, writeFileSync} from 'node:fs';
import {fixture as historicalFixture} from '../reasoning-depth-d2/benchmark-fixtures';
import {methodFixture} from './d2-method-fixtures';
import benchmark from '../reasoning-depth-d2/frozen-external-benchmark.v1.json';
import oldU2 from '../unified-u2/independent-cases.v2.json';
import newU2 from './u2.method.v2.json';
const file = new URL('./migration-ledger.v2.json', import.meta.url);
const ledger = JSON.parse(readFileSync(file, 'utf8'));
for (const item of benchmark.cases) {
  const old = historicalFixture(item), next = methodFixture(item);
  const stages = old.working.stages.flatMap((before, index) => JSON.stringify(before) === JSON.stringify(next.working.stages[index]) ? [] : [{index, before, after:next.working.stages[index]}]);
  const row = ledger.cases.find((r: {corpus:string;id:string})=>r.corpus==='d2' && r.id===item.id);
  row.changed = stages.length ? {expandedSyntheticStages:stages} : {};
  row.reasons = stages.length ? ['Supply explicit triangle-sum in synthetic method stages; preserve every D2 expected mathematical label. This does not execute the literal external reference-solution text.'] : ['Expanded input and expected label unchanged.'];
}
const refs: {id:string;u2?:string}[]=[];
for(let i=0;i<20;i++) refs.push({id:`geometry-quadratic-${i}`,u2:`u2-pyth-${String(i<12?i:30+(i-12)%4).padStart(2,'0')}`});
for(let i=0;i<20;i++) refs.push({id:`coordinate-algebra-${i}`});
for(let i=0;i<20;i++) refs.push({id:`similar-rational-${i}`,u2:`u2-sim-${String(i<14?i:30+(i-14)%4).padStart(2,'0')}`});
for(let i=0;i<20;i++) refs.push({id:`function-inequality-${i}`});
for(let i=0;i<20;i++) refs.push({id:`pythagorean-exact-root-${i}`,u2:`u2-pyth-${String(i).padStart(2,'0')}`});
ledger.derivedJourneys = refs.map(r => {
  const before=oldU2.cases.find(c=>c.id===r.u2),after=newU2.cases.find(c=>c.id===r.u2);
  return {...r, changed: !!before && JSON.stringify(before)!==JSON.stringify(after), reason:r.u2?'Uses the cited U2 method-v2 case; other stage and first-failing-domain assertions are unchanged.':'All inputs and expected outcomes unchanged.'};
});
writeFileSync(file,JSON.stringify(ledger,null,2)+'\n');
console.log('Recorded exact expanded D2 changes and all 100 M1/U2 journey dependencies.');
