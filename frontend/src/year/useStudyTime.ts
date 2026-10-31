import {useEffect,useRef,useState,type RefObject} from 'react';
import {StudyClock,ZERO_TIME,type StudyAdvice,type StudyTime} from '../../../packages/learning/src/study-session';
import type {StudyRecord,StudyUpdate} from '../../../packages/learning/src/session';
export type SaveStudy=(update:StudyUpdate)=>Promise<StudyRecord|null>;
const valid=(v:unknown):v is StudyTime=>!!v&&typeof v==='object'&&['activeMs','solvingMs','idleMs'].every(k=>Number.isSafeInteger((v as any)[k])&&(v as any)[k]>=0)&&(v as StudyTime).solvingMs<=(v as StudyTime).activeMs;
export function useStudyTime(planId:string,latest:StudyRecord|undefined,save:SaveStudy,root:RefObject<HTMLElement|null>){
 const cacheKey=`openpath.study-time@1:${planId}`;
 const [clock]=useState(()=>{
  let initial=latest?.time??ZERO_TIME;
  // Restore cumulative totals only. Never replay a wall-clock gap or a previous page's monotonic origin.
  try{const cached=JSON.parse(localStorage.getItem(cacheKey)??'null');if(latest?.phase!=='ended'&&valid(cached)&&cached.activeMs>=initial.activeMs&&cached.solvingMs>=initial.solvingMs&&cached.idleMs>=initial.idleMs&&cached.solvingMs-initial.solvingMs<=cached.activeMs-initial.activeMs)initial=cached;}catch{}
  return new StudyClock(performance.now(),initial);
 });
 const current=useRef(latest);if(latest&&(!current.current||latest.revision>current.current.revision))current.current=latest;
 const saver=useRef(save);saver.current=save;
 const pending=useRef<Promise<unknown>>(Promise.resolve());
 const [time,setTime]=useState(clock.snapshot()),[error,setError]=useState(''),[ending,setEnding]=useState(false),[ready,setReady]=useState(!!latest);
 const stopped=useRef(latest?.phase==='ended');
 const store=()=>{const t=clock.snapshot();try{localStorage.setItem(cacheKey,JSON.stringify(t));}catch{}setTime(t);return t;};
 const snapshot=(phase:'active'|'ended'='active',advice?:StudyAdvice)=>{
  const job=pending.current.then(async()=>{
   if(current.current?.phase==='ended')return current.current;
   const last=current.current;
   const t=clock.snapshot();
   if(phase==='active'&&last&&Object.keys(t).every(k=>t[k as keyof StudyTime]===last.time[k as keyof StudyTime]))return last;
   const record=await saver.current({planId,revision:last?last.revision+1:0,phase:last?phase:'start',time:last?t:{...ZERO_TIME},...(phase==='ended'&&last?{advice}: {})});
   if(!record){setError('Session timing was not saved. Retry before leaving.');return null;}
   current.current=record;setReady(true);setError('');return record;
  });
  pending.current=job.catch(()=>null);return job;
 };
 const finish=async(advice:StudyAdvice)=>{
  clock.advance(performance.now());clock.visibility(performance.now(),false);store();stopped.current=true;setEnding(true);
  if(!current.current&&!(await snapshot())){setEnding(false);return null;}
  const r=await snapshot('ended',advice);setEnding(false);return r;
 };
 useEffect(()=>{
  let live=true;
  if(current.current?.phase==='ended')return;
  clock.visibility(performance.now(),!document.hidden);
  void snapshot().then(()=>{if(live)void snapshot();});
  const mode=()=>clock.mode(performance.now(),!!root.current?.querySelector('.qcard[data-qid]'));
  const observer=new MutationObserver(mode);if(root.current)observer.observe(root.current,{childList:true,subtree:true});mode();
  // Native capture must not render React before an input's own onChange runs.
  const touch=()=>{if(!document.hidden){clock.touch(performance.now());try{localStorage.setItem(cacheKey,JSON.stringify(clock.snapshot()));}catch{}}};
  const visibility=()=>{clock.visibility(performance.now(),!document.hidden&&!stopped.current);store();void snapshot();};
  const hide=()=>{clock.visibility(performance.now(),false);store();void snapshot();};
  const tick=setInterval(()=>{if(!stopped.current){clock.advance(performance.now());store();}},1000);
  const checkpoint=setInterval(()=>{if(!stopped.current)void snapshot();},15_000);
  for(const name of ['pointerdown','keydown','input','scroll'])root.current?.addEventListener(name,touch,{passive:true,capture:true});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);
  return ()=>{live=false;clearInterval(tick);clearInterval(checkpoint);observer.disconnect();for(const name of ['pointerdown','keydown','input','scroll'])root.current?.removeEventListener(name,touch,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);clock.visibility(performance.now(),false);try{localStorage.setItem(cacheKey,JSON.stringify(clock.snapshot()));}catch{}void snapshot();};
 },[planId]);
 return {time,ready,error,ending,closing:stopped.current,finish,checkpoint:()=>{clock.advance(performance.now());store();return snapshot();}};
}
