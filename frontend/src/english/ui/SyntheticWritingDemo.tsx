import { useState } from 'react';
import { SyntheticWritingWorkflow, SYNTHETIC_WRITING_SAMPLE } from '../logic/exam-diagnostic/workflow';

type Snapshot = ReturnType<SyntheticWritingWorkflow['snapshot']>;
const label = (skill: string) => skill.replaceAll('_', ' ');
export function SyntheticWritingDemo() {
  const [workflow] = useState(() => new SyntheticWritingWorkflow());
  const [state, setState] = useState(() => workflow.snapshot());
  const [error, setError] = useState('');
  function act(action: () => void) {
    try { action(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'This example could not continue.'); }
    setState(workflow.snapshot());
  }
  async function analyse() {
    const pending = workflow.analyse();
    setState(workflow.snapshot());
    try { await pending; setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'The simulated response could not be checked.'); }
    setState(workflow.snapshot());
  }
  return <section data-synthetic-writing-demo="1" aria-labelledby="synthetic-writing-heading">
    <h2 id="synthetic-writing-heading">Developer example: simulated writing checks</h2>
    <p>This separate offline example uses only the fixed invented paragraph below, never your writing. No real model runs, no API request is sent, and there is no essay score. Your saved writing remains unassessed.</p>
    <blockquote>{SYNTHETIC_WRITING_SAMPLE}</blockquote>
    {(error || state.error) && <p role="alert">{error || state.error}</p>}
    <SyntheticWritingDemoView state={state} onAnalyse={() => { void analyse(); }} onAnswer={(id,index) => act(() => workflow.answer(id,index))} onFinish={() => act(() => workflow.finishChecks())} onReset={() => act(() => workflow.reset())} />
  </section>;
}
export function SyntheticWritingDemoView({state,onAnalyse,onAnswer,onFinish,onReset}:{state:Snapshot;onAnalyse:()=>void;onAnswer:(id:string,index:number)=>void;onFinish:()=>void;onReset:()=>void}) {
  const question = state.checks.find(q => state.answers[q.id] === undefined);
  return <>
    {state.phase === 'idle' && <button type="button" onClick={onAnalyse}>Run fixed simulated example</button>}
    {state.phase === 'analysing' && <p role="status">Checking the simulated response…</p>}
    {(state.phase === 'checks' || state.phase === 'results') && <section>
      <h3>Simulated observations, not confirmed gaps</h3>
      {state.observations.map((o,i) => <article key={i}><p>Candidate area: {label(o.skill)}</p><blockquote>{o.quote}</blockquote>
        {state.phase === 'results' && <><p>Fixture suggestion: {o.correction}</p><p>{o.explanation}</p></>}
      </article>)}
      <p>The fixture only suggests which checks to ask. Matching a quotation does not prove a linguistic judgement.</p>
    </section>}
    {state.phase === 'checks' && <section>
      <h3>Answer separate questions</h3><p>These prototype checks are not calibrated exam items. Explanations stay hidden until you finish. Answers in this example are not saved.</p>
      {question ? <fieldset key={question.id}><legend>{question.prompt}</legend>{question.options.map((option,i) => <button key={i} type="button" onClick={() => onAnswer(question.id,i)}>{option}</button>)}</fieldset> : <button type="button" onClick={onFinish}>Show deterministic check results</button>}
    </section>}
    {state.phase === 'results' && <section>
      <h3>Deterministic check results</h3>
      {state.checks.length === 0 && <p>No fresh pair is available. Previously shown items are not fresh evidence.</p>}
      {state.results.map(row => <article key={row.skill}><h4>{label(row.skill)}</h4><p>{row.outcome === 'needs_practice' ? 'Practice suggested on these checks' : row.outcome === 'no_gap_shown' ? 'No gap shown on these checks' : 'Inconclusive evidence'}</p><p>{row.scope}</p>{row.lesson && <><h5>Targeted lesson</h5><p>{row.lesson}</p></>}</article>)}
      {state.checks.map(q => <details key={q.id}><summary>{q.prompt}</summary><p>Matching answer: {q.options[q.answer]}</p><p>{q.explanation}</p></details>)}
    </section>}
    {state.phase !== 'idle' && <button type="button" className="secondary" onClick={onReset}>Reset simulated example</button>}
    <p className="small">Reset keeps track of exposed questions during this visit. Reloading clears this example; repeated questions are practice, not fresh evidence.</p>
  </>;
}
