/** Device-local protection only, not a cross-device or tamper-proof assessment ledger. */
export const EXPOSURE_KEY='openpath.exam-exposure@1';
type ExposureStorage=Pick<Storage,'getItem'|'setItem'>;
export function exposureStore(storage:ExposureStorage){
 let expected=storage.getItem(EXPOSURE_KEY);
 const parse=(raw:string|null):string[]=>{
  if(raw===null)return [];
  const parsed:unknown=JSON.parse(raw);
  if(!Array.isArray(parsed)||parsed.some(x=>typeof x!=='string')||parsed.length>1000)throw Error('Exposure history cannot be read.');
  return [...new Set(parsed)];
 };
 let seen=parse(expected);
 const check=()=>{if(storage.getItem(EXPOSURE_KEY)!==expected)throw Error('Exposure history changed in another tab. Restart in one tab only.');};
 return {
  read(){check();return [...seen];},
  claim(ids:readonly string[]){
   check();const next=[...new Set([...seen,...ids])];
   if(next.length>1000)throw Error('Exposure history is full.');
   const raw=JSON.stringify(next);storage.setItem(EXPOSURE_KEY,raw);
   expected=raw;seen=next;
  },
 };
}
