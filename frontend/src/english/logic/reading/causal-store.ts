/** One anonymous device record; Web Locks serializes localStorage CAS across tabs. */
import {causalItems,causalView,newCausalSession,restoreCausalSession,transitionCausal,validateCausalPack,type CausalPack,type CausalAction,type CausalSession} from './causal.ts';
export const CAUSAL_STORAGE_KEY='openpath.causal-reading.v1';
export interface CausalStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export interface CausalLocks {request<T>(name:string,callback:()=>Promise<T>):Promise<T>;}
interface DeviceRecord {version:1;sessions:Record<string,CausalSession>;}
export class CausalStore {
 private raw:string|null;private record:DeviceRecord;
 private packs:readonly CausalPack[];private storage:CausalStorage;private locks:CausalLocks|null;private clock:()=>string;
 constructor(packs:readonly CausalPack[],storage:CausalStorage,locks:CausalLocks|null,clock=()=>new Date().toISOString()){
  this.packs=structuredClone(packs);this.storage=storage;this.locks=locks;this.clock=clock;
  packs.forEach(validateCausalPack);const items=packs.flatMap(causalItems);if(new Set(packs.map(p=>p.id)).size!==packs.length||new Set(items.map(i=>i.family)).size!==items.length||new Set(items.map(i=>i.id)).size!==items.length)throw Error('Packs overlap exposure families.');
  this.raw=storage.getItem(CAUSAL_STORAGE_KEY);this.record=this.parse(this.raw);
 }
 private parse(raw:string|null):DeviceRecord{if(raw===null)return {version:1,sessions:{}};const value=JSON.parse(raw);if(value?.version!==1||Object.keys(value).some(k=>!['version','sessions'].includes(k))||!value.sessions||typeof value.sessions!=='object'||Array.isArray(value.sessions))throw Error('Unreadable device reading record.');for(const [id,state] of Object.entries(value.sessions)){const pack=this.pack(id);restoreCausalSession(JSON.stringify(state),pack);}return value;}
 private pack(id:string){const p=this.packs.find(p=>p.id===id);if(!p)throw Error('Unknown reading pack.');return p;}
 view(id:string){const state=this.record.sessions[id];return state?causalView(state,this.pack(id),this.clock()):null;}
 async open(id:string){return this.commit(id,null);}
 async act(id:string,action:CausalAction){return this.commit(id,action);}
 private async commit(id:string,action:CausalAction|null){
  if(!this.locks)throw Error('Safe cross-tab saving is unavailable in this browser. Independent reading progress is disabled.');
  return this.locks.request(CAUSAL_STORAGE_KEY,async()=>{
   const latest=this.storage.getItem(CAUSAL_STORAGE_KEY);
   if(latest!==this.raw){this.record=this.parse(latest);this.raw=latest;throw Error('Reading changed in another tab. The saved state has been refreshed; review it before continuing.');}
   const pack=this.pack(id),current=this.record.sessions[id];if(action&&!current)throw Error('Open this pack before answering.');
   const next=structuredClone(this.record);next.sessions[id]=action?transitionCausal(current,pack,action,this.clock()):current??newCausalSession(pack);
   const raw=JSON.stringify(next);this.storage.setItem(CAUSAL_STORAGE_KEY,raw);
   if(this.storage.getItem(CAUSAL_STORAGE_KEY)!==raw)throw Error('Reading save could not be verified. Reload before continuing.');
   this.record=next;this.raw=raw;return this.view(id)!;
  });
 }
}
