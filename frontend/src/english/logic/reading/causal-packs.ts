/** Interchangeable language-demand contexts, not calibrated grades or learner levels. */
import {causalItems,type CausalPack} from './causal.ts';
import {EVERYDAY_CAUSAL_PACK} from './causal-pack-everyday.ts';
import {PUBLIC_CAUSAL_PACK} from './causal-pack-public.ts';
import {AUTHORED_LANGUAGE_CHECKS} from './causal-language-checks.ts';
function order(key:string,n:number){
 let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 const values=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);[values[i],values[j]]=[values[j],values[i]];}
 return values;
}
/** Stable authored-version layout, never learner-specific randomisation or a new exposure identity. */
function layout(raw:CausalPack):CausalPack{
 const pack=structuredClone(raw);
 for(const item of causalItems(pack)){
  const choices=order(`${item.id}:choices`,item.options.length);item.options=choices.map(i=>item.options[i]);item.answer=choices.indexOf(item.answer);
  if(item.dimension==='integration'){
   const sentences=order(`${item.id}:sentences`,item.passage.length);item.passage=sentences.map(i=>item.passage[i]);item.sets=item.sets.map(set=>set.map(i=>sentences.indexOf(i)).sort((a,b)=>a-b));
  }
 }
 return pack;
}
/** Append only after the original layout; stripping this field preserves legacy fingerprints. */
function withLanguageChecks(pack:CausalPack):CausalPack{
 const languageChecks=structuredClone(AUTHORED_LANGUAGE_CHECKS[pack.id]);
 if(!languageChecks)throw Error('Missing authored language checks.');
 for(const pair of Object.values(languageChecks))for(const item of Object.values(pair)){
  const choices=order(`${item.id}:choices`,item.options.length);item.options=choices.map(i=>item.options[i]);item.answer=choices.indexOf(item.answer);
 }
 return {...pack,languageChecks};
}
export const CAUSAL_PACKS:readonly CausalPack[]=[withLanguageChecks(layout(EVERYDAY_CAUSAL_PACK)),withLanguageChecks(layout(PUBLIC_CAUSAL_PACK))];
