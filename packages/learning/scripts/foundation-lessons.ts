/** Bounded regeneration of the two repaired algorithm classes; never grants content review. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fromTemplate } from '../src/library';
import { validateModule } from '../src/validate';
const file = new URL('../../../content/learning/library.v1.json', import.meta.url);
const data=JSON.parse(readFileSync(file,'utf8'));
let changed=0;
data.modules=data.modules.map((m:any)=>{
 const family=m.provenance?.family;
 if(!['aaadd','adcol3'].includes(family))return m;
 const next=fromTemplate(family,m.competency,m.provenance.blueprintVersion);
 const errors=validateModule(next);if(errors.length)throw Error(errors.join('\n'));
 changed++;return next;
});
if(changed!==2)throw Error(`Expected two existing template modules, found ${changed}`);
writeFileSync(file,JSON.stringify(data,null,1)+'\n');
console.log('Regenerated two existing draft lessons. No educator approval or quarantine entry changed.');
