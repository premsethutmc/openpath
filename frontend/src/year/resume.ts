/** Browser UI cursor/draft only. Attempts, teaching and proficiency remain in the authenticated ledger. */
import {useState,useEffect} from 'react';
export function useResume<T>(key:string|undefined, initial:T) {
 const [value,setValue]=useState<T>(()=>{if(!key)return initial;try{const raw=localStorage.getItem(key);return raw===null?initial:JSON.parse(raw);}catch{return initial;}});
 // Persist initial immutable snapshots too (queue/strategy have no setter calls).
 useEffect(()=>{if(key)try{localStorage.setItem(key,JSON.stringify(value));}catch{}},[key,value]);
 const save=(next:T)=>{setValue(next);if(key)try{localStorage.setItem(key,JSON.stringify(next));}catch{/* The ledger remains authoritative; unavailable storage must not block input. */}};
 return [value,save] as const;
}
