/** Bounded regeneration of two repaired algorithm classes and their version-locked review metadata. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fromTemplate } from '../src/library';
import { validateModule } from '../src/validate';
import { modules } from '../src/content';
import { familySpec, validateFamily } from '../src/spec';
import { sync, syncFamily, itemOf, familyItem } from '../src/review';
const root = new URL('../../../content/learning/', import.meta.url);
const read=(name:string)=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const write=(name:string,data:unknown,pretty=true)=>writeFileSync(new URL(name,root),JSON.stringify(data,null,pretty?1:undefined)+'\n');
const families=['aaadd','adcol3'];
if(process.argv.includes('--sync-metadata')) {
 // A fresh process reads the regenerated modules, rather than cached JSON imports from before the write.
 const library=read('library.v1.json'), specs=read('family-specs.v1.json'), generated=read('generated.v1.json'), registry=read('review.v1.json');
 const at=new Date().toISOString();
 for(const family of families) {
  const index=specs.families.findIndex((s:any)=>s.id===family);
  if(index<0||!generated.families[family])throw Error(`Missing existing metadata for ${family}`);
  const validation=validateFamily(family);if(!validation.ok)throw Error(`Invalid family ${family}`);
  const spec={...familySpec(family)!,validation};
  specs.families[index]=spec;
  // These teaching-only edits leave the question/answer pool unchanged; its version fingerprint still changes.
  generated.families[family].fingerprint=spec.fingerprint;
  const fi=registry.entries.findIndex((e:any)=>e.item===familyItem(family));
  if(fi<0)throw Error(`Missing existing family review ${family}`);
  registry.entries[fi]=syncFamily(registry.entries[fi],family,at);
  const source=library.modules.find((m:any)=>m.provenance?.family===family);
  const module=modules.find(m=>m.competency===source?.competency);
  if(!module)throw Error(`Missing existing module ${family}`);
  const mi=registry.entries.findIndex((e:any)=>e.item===itemOf(module.competency));
  if(mi<0)throw Error(`Missing existing module review ${family}`);
  registry.entries[mi]=sync(registry.entries[mi],module,source.provenance.author,at);
 }
 write('family-specs.v1.json',specs);write('generated.v1.json',generated,false);write('review.v1.json',registry);
 console.log('Synchronized two family/module fingerprints; preserved history and reset changed content to draft.');
} else {
 const data=read('library.v1.json');
 let changed=0;
 data.modules=data.modules.map((m:any)=>{
  const family=m.provenance?.family;
  if(!families.includes(family))return m;
  const next=fromTemplate(family,m.competency,m.provenance.blueprintVersion);
  const errors=validateModule(next);if(errors.length)throw Error(errors.join('\n'));
  changed++;return next;
 });
 if(changed!==2)throw Error(`Expected two existing template modules, found ${changed}`);
 write('library.v1.json',data);
 execFileSync(process.execPath,[...process.execArgv,fileURLToPath(import.meta.url),'--sync-metadata'],{stdio:'inherit'});
 console.log('Regenerated two existing draft lessons. No educator approval or quarantine entry changed.');
}
