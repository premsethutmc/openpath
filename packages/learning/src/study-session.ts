/** Session bookkeeping only: never input to the estimator or mastery gate. Milliseconds, cumulative snapshots. */
export interface StudyTime { activeMs:number; solvingMs:number; idleMs:number }
export interface StudyAdvice {
 gaps:{competency:string;reason:string;sourceQuestion:string}[];
 morePractice:string[];
 next:{competency:string|null;reason:string};
}
export interface StudySummary extends StudyAdvice {
 attemptIds:string[];correctIds:string[];incorrectIds:string[];pendingIds:string[];competencies:string[];
}
export const ZERO_TIME:StudyTime={activeMs:0,solvingMs:0,idleMs:0};
/** Visible engagement expires after a minute without input; background/closed time is excluded, not called idle. */
export const STUDY_IDLE_MS=60_000;
export class StudyClock {
 time:StudyTime;private last:number;private engaged:number;private visible=true;private solving=false;
 constructor(now:number, initial:StudyTime=ZERO_TIME){this.last=Math.floor(now);this.engaged=Math.floor(now);this.time={...initial};}
 advance(now:number){
  now=Math.floor(Math.max(now,this.last));
  if(this.visible){const active=Math.max(0,Math.min(now,this.engaged+STUDY_IDLE_MS)-this.last);this.time.activeMs+=active;this.time.idleMs+=now-this.last-active;if(this.solving)this.time.solvingMs+=active;}
  this.last=now;return this.snapshot();
 }
 touch(now:number){this.advance(now);this.engaged=Math.floor(now);}
 visibility(now:number,visible:boolean){this.advance(now);this.visible=visible;if(visible)this.engaged=Math.floor(now);}
 mode(now:number,solving:boolean){this.advance(now);this.solving=solving;}
 snapshot(){return Object.fromEntries(Object.entries(this.time).map(([k,v])=>[k,Math.floor(v)])) as unknown as StudyTime;}
}
