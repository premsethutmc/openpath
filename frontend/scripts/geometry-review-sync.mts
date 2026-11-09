/** Scoped equivalent of review.ts sync after the geometry-only library edit. Uses the same draft-reset policy. */
import { readFileSync,writeFileSync } from 'node:fs';
import { moduleFor } from '../../packages/learning/src/content';
import { sync,itemOf,type Registry } from '../../packages/learning/src/review';
const path=new URL('../../content/learning/review.v1.json',import.meta.url), registry=JSON.parse(readFileSync(path,'utf8')) as Registry;
const m=moduleFor('MATH.geometry.triangle-properties')!, id=itemOf(m.competency), i=registry.entries.findIndex(e=>e.item===id);
if(i<0)throw new Error('Expected existing geometry review record');
registry.entries[i]=sync(registry.entries[i],m,registry.entries[i].author,new Date().toISOString());
writeFileSync(path,JSON.stringify(registry,null,1)+'\n');
console.log(id,registry.entries[i].state,'(same sync policy; no family or educator decisions)');
