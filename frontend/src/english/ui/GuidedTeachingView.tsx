import type {GuidedTeachingState} from '../logic/exam-diagnostic/guided-teaching.ts';
export type TeachingAction='start'|'hint'|'answer'|'retry'|'reveal'|'complete';
/** Shared supported-practice UI. Never used to score independent reassessment. */
export function GuidedTeachingView({snapshot,onAction}:{snapshot:GuidedTeachingState<string>;onAction:(action:TeachingAction,index?:number)=>void}){
 return <section data-supported-teaching="1"><p>{snapshot.lesson.title}. {snapshot.lesson.scope}</p><p>Supported learning only. Finishing this lesson does not establish understanding or change your independent results.</p>
 {snapshot.phase==='example'&&<section><h4>Worked example</h4><p>{snapshot.lesson.workedExample.prompt}</p><p>{snapshot.lesson.workedExample.answer}</p><ol>{snapshot.lesson.workedExample.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><button onClick={()=>onAction('start')}>Try guided practice</button></section>}
 {snapshot.practice&&snapshot.phase!=='complete'&&<section><fieldset disabled={snapshot.phase!=='practice'}><legend>{snapshot.practice.prompt}</legend>{snapshot.practice.options.map((option,i)=><button key={i} onClick={()=>onAction('answer',i)}>{option}</button>)}</fieldset>{snapshot.hint&&<p>Hint: {snapshot.hint}</p>}{snapshot.phase==='practice'&&<><button onClick={()=>onAction('hint')}>Show a hint</button><button onClick={()=>onAction('reveal')}>Show the worked answer</button></>}</section>}
 {snapshot.feedback&&snapshot.phase==='feedback'&&<section><p>{snapshot.feedback.explanation}</p>{snapshot.feedback.expected&&<p>Worked answer: {snapshot.feedback.expected}</p>}{!snapshot.feedback.correct&&!snapshot.feedback.expected?<><button onClick={()=>onAction('retry')}>Try again with support</button><button onClick={()=>onAction('reveal')}>Show the worked answer</button></>:<button onClick={()=>onAction('complete')}>Finish supported lesson</button>}</section>}
 {snapshot.phase==='complete'&&<p>Supported lesson complete. Now use unseen questions to check the idea without hints.</p>}
 </section>;
}
