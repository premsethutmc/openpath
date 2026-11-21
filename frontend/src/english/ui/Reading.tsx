/**
 * Reading (logic/reading): choose a skill and a level; learn it from a worked example, practise with hints, then
 * answer two questions you have never seen, on texts you were not taught with. Practice-only: nothing here changes
 * the learner's capability picture.
 */
import { Flag } from "./Flag.tsx";
import { useMemo, useRef, useState } from "react";
import { ReadingEvidence } from "./ReadingEvidence.tsx";
import { ReadingInference } from "./ReadingInference.tsx";
import { COURSE, LEVELS, unitKey, type Course, type Level, type Passage, type SkillId, type Unit } from "../logic/reading/course.ts";
import { asReadingLevel } from "../logic/streams/level-check.ts";
import { ReadingUnitSession, pendingCheck, progress, recommend, statusOf, type Mode, type Progress, type ReadingRecord, type Snapshot, type UnitStatus } from "../logic/reading/session.ts";
import {sentenceChoices} from "../logic/reading/sentences.ts";
import {SENTENCE_FEEDBACK,supportingSets} from "../logic/reading/check-evidence.ts";
import type { Learner } from "../logic/learner.ts";
import { NoteBox } from "./Note.tsx";

const STATUS: Record<UnitStatus, { word: string; cls: string }> = {
  new: { word: "not started", cls: "" },
  learning: { word: "started", cls: "s-check" },
  passed_own: { word: "shown on your own", cls: "s-secure" },
  passed_after_help: { word: "solved after help", cls: "s-ready" },
  needs_practice: { word: "practise again", cls: "s-needs" },
  no_fresh_check: { word: "no new questions left", cls: "s-needs" },
};
const WHY = { step_back: "A step back will make the harder level easier.", practise_again: "One more go at this, then a new check.", next: "Next on your reading path." };

const skillName = (course: Course, id: SkillId) => course.skills.find((s) => s.id === id)!.name;
const levelName = (course: Course, id: Level) => course.levels.find((l) => l.id === id)!.name;

/** The text, with the part to reread marked when a hint or an explanation points at it. */
export function PassageView({ passage, highlight }: { passage: Pick<Passage,"title"|"text">; highlight?: string | null }) {
  return (
    <section className="passage reading-passage" aria-label={`Text: ${passage.title}`}>
      <h2>{passage.title}</h2>
      {passage.text.split(/\n+/).map((para, i) => {
        const at = highlight ? para.indexOf(highlight) : -1;
        return at < 0 || !highlight ? (
          <p key={i}>{para}</p>
        ) : (
          <p key={i}>
            {para.slice(0, at)}
            <mark>{highlight}</mark>
            {para.slice(at + highlight.length)}
          </p>
        );
      })}
    </section>
  );
}

export function ReadingMap({ course, progress: p, start, onOpen, onBack }: { course: Course; progress: Progress; start?: Level; onOpen: (u: Unit, mode: Mode) => void; onBack: () => void }) {
  const next = recommend(course, p, start);
  const done = [...p.units.values()].filter((u) => u.status === "passed_own" || u.status === "passed_after_help").length;
  return (
    <main className="page reading" aria-labelledby="reading-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Reading</p>
      <h1 id="reading-title" className="hero">
        Read, think, answer
      </h1>
      <p className="sub">Seven reading skills at six levels. Learn each one with an example, practise with hints, then try two new questions on your own.</p>
      {next ? (
        <section className="tile lilac reading-next" aria-labelledby="reading-next-title">
          <p className="kicker">{WHY[next.why]}</p>
          <h2 id="reading-next-title">
            {skillName(course, next.unit.skill)} · {levelName(course, next.unit.level)}
          </h2>
          <p>{course.skills.find((s) => s.id === next.unit.skill)!.blurb}</p>
          <button type="button" className="primary" onClick={() => onOpen(next.unit, "learn")}>
            Start
          </button>
        </section>
      ) : (
        <section className="tile mint" aria-label="All done">
          <h2>Every skill at every level is done.</h2>
          <p>New texts are needed before there is more to check here.</p>
        </section>
      )}
      <h2 className="section-title">All skills and levels</h2>
      <p className="small">
        {done} of {course.skills.length * LEVELS.length} done. Pick any level. “Check me” skips the lesson and goes straight to two new questions.
      </p>
      {course.skills.map((s) => (
        <section key={s.id} className="hub-card plain reading-skill" aria-label={s.name}>
          <h3>{s.name}</h3>
          <p className="small">{s.blurb}</p>
          <ul className="reading-levels">
            {course.levels.map((l) => {
              const unit = { skill: s.id, level: l.id };
              const st = statusOf(p, unit);
              const closed = st === "no_fresh_check" || st === "passed_own" || st === "passed_after_help";
              return (
                <li key={l.id} data-unit={unitKey(unit)}>
                  <span className="reading-level-name">
                    {l.name}
                    <span className={`status ${STATUS[st].cls}`}>{STATUS[st].word}</span>
                  </span>
                  <span className="reading-level-go">
                    <button type="button" className="secondary" onClick={() => onOpen(unit, "learn")}>
                      {st === "new" ? "Learn" : "Learn again"}
                    </button>
                    {!closed && (
                      <button type="button" className="link" onClick={() => onOpen(unit, "check_me")}>
                        Check me
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="small">{course.levels.map((l) => `${l.name}: ${l.about}`).join(" ")}</p>
    </main>
  );
}

export interface UnitHandlers {
  nextStep: () => void;
  startPractice: () => void;
  hint: () => void;
  answerPractice: (i: number) => void;
  nextPractice: () => void;
  answerCheck: (i: number) => void;
  selectCheckAnswer: (i:number)=>void;
  lockCheckAnswer: ()=>void;
  selectCheckEvidence: (sentences:number[])=>void;
  submitCheckEvidence: ()=>void;
  selectPracticeClues:(selected:number[])=>void;
  checkPracticeClues:()=>void;
  closeInterruptedCheck: ()=>void;
  open: (u: Unit, mode: Mode) => void;
  leave: () => void;
}

export function ReadingUnitView({ course, snap, on }: { course: Course; snap: Snapshot; on: UnitHandlers }) {
  const head = (
    <>
      <button type="button" className="link" onClick={on.leave}>
        ← All reading skills
      </button>
      <p className="eyebrow">
        {skillName(course, snap.unit.skill)} · {levelName(course, snap.unit.level)}
      </p>
    </>
  );
  if (snap.phase === "lesson") {
    const { lesson, steps } = snap;
    const last = steps >= lesson.worked.steps.length;
    return (
      <main className="page reading" data-phase="lesson">
        {head}
        <h1 className="hero">{lesson.title}</h1>
        <p className="rule">{lesson.strategy}</p>
        <PassageView passage={snap.passage} />
        <section className="lesson reading-worked" aria-label="Worked example">
          <p className="kicker">Worked example</p>
          <p className="prompt">{lesson.worked.prompt}</p>
          <ol>
            {lesson.worked.steps.slice(0, steps).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {last && (
            <p className="feedback right">
              <span className="verdict">Answer: </span>
              {lesson.worked.answer}
            </p>
          )}
        </section>
        {last ? (
          <button type="button" className="primary" onClick={on.startPractice}>
            Now you try
          </button>
        ) : (
          <button type="button" className="primary" onClick={on.nextStep}>
            Next step ({steps} of {lesson.worked.steps.length})
          </button>
        )}
      </main>
    );
  }
  if (snap.phase === "practice") {
    const p = snap.practice;
    const settled = p.solved || p.revealed;
    return (
      <main className="page reading" data-phase="practice">
        {head}
        <p className="pill">
          Practice {p.index + 1} of {p.total} · hints allowed
        </p>
        <PassageView passage={p.question.passage} highlight={p.highlight} />
        <p className="prompt" id="reading-prompt">
          {p.question.prompt}
        </p>
        <div className="options" role="group" aria-labelledby="reading-prompt">
          {p.question.options.map((o, i) => {
            const crossed = p.wrong.includes(i);
            return (
              <button key={i} type="button" className={`option${crossed ? " is-wrong crossed" : ""}${p.answer?.index === i ? " is-right" : ""}`} disabled={settled || crossed} onClick={() => on.answerPractice(i)}>
                {o}
              </button>
            );
          })}
        </div>
        {p.wrong.length > 0 && !settled && <p className="feedback wrong">Not that one. Read the hint and try again.</p>}
        {p.hints.length > 0 && (
          <ul className="hints reading-hints" aria-label="Hints">
            {p.hints.map((h, i) => (
              <li key={i} className="hint">
                {h}
              </li>
            ))}
            {p.highlight && !settled && <li className="hint">Read the marked part of the text again.</li>}
          </ul>
        )}
        {p.canHint && (
          <button type="button" className="secondary" onClick={on.hint}>
            {p.hints.length ? "Another hint" : "Give me a hint"}
          </button>
        )}
        {p.answer && (
          <>
            <p className={`feedback ${p.solved ? "right" : "wrong"}`}>
              <span className="verdict">{p.solved ? "Yes. " : `The answer is: ${p.question.options[p.answer.index]}. `}</span>
              {p.answer.explain}
            </p>
            {p.clues&&<section aria-label="Connect the clues practice"><h2>Connect the clues</h2><p>The answer has been explained. Now find the sentences that support it together. This is guided practice, not an independent check.</p><fieldset><legend>Choose the clues that work together.</legend>{sentenceChoices(p.question.passage.text).map((text,i)=><label key={i} style={{display:'block',padding:'8px 0'}}><input type="checkbox" disabled={!!p.clues!.finding} checked={p.clues!.selected.includes(i)} onChange={()=>on.selectPracticeClues(p.clues!.selected.includes(i)?p.clues!.selected.filter(x=>x!==i):[...p.clues!.selected,i])}/>{i+1}. {text}</label>)}</fieldset>{!p.clues.finding?<button type="button" disabled={!p.clues.selected.length} onClick={on.checkPracticeClues}>Check these clues</button>:<><p role="status">{SENTENCE_FEEDBACK[p.clues.finding]}</p><p>Supporting sentences: {p.clues.sets!.map(set=>set.map(i=>i+1).join(' + ')).join(' or ')}. Read them together, then compare the other choices.</p></>}</section>}
            <button type="button" className="primary" disabled={!!p.clues&&!p.clues.finding} onClick={on.nextPractice}>
              {p.index + 1 < p.total ? "Next practice question" : "I'm ready for two new questions"}
            </button>
          </>
        )}
      </main>
    );
  }
  if (snap.phase === "check") {
    const q=snap.question,d=snap.draft;
    return <main className="page reading" data-phase="check" data-evidence-stage={d.locked?'evidence':'answer'}>
      {head}<p className="pill">On your own: question {snap.position+1} of {snap.total} · no hints · marked at the end</p>
      <p className="small">{snap.familiar?'You have read this text before; this is a new question, not a new passage.':'This passage was new when this check opened.'} Answers and supporting sentences are recorded separately.</p>
      <PassageView passage={q.passage}/><p className="prompt" id="reading-prompt">{q.prompt}</p>
      {!d.locked?<><div className="options" role="radiogroup" aria-labelledby="reading-prompt">{q.options.map((o,i)=><button key={`${q.id}:${i}`} type="button" role="radio" aria-checked={d.choice===i} className="option" onClick={()=>on.selectCheckAnswer(i)}>{o}</button>)}</div><button type="button" className="primary" disabled={d.choice===null} onClick={on.lockCheckAnswer}>Lock in my answer</button></>:<>
      <p>Your locked answer: {q.options[d.choice!]}</p><fieldset><legend>Tap the sentence or sentences that support your answer.</legend>{sentenceChoices(q.passage.text).map((text,i)=><label key={i} style={{display:'block',padding:'8px 0'}}><input type="checkbox" checked={d.sentences.includes(i)} onChange={()=>on.selectCheckEvidence(d.sentences.includes(i)?d.sentences.filter(x=>x!==i):[...d.sentences,i])}/>{i+1}. {text}</label>)}</fieldset><p className="small">Select only the support you need. There are no hints or marks until both questions are finished.</p><button type="button" className="primary" disabled={!d.sentences.length} onClick={on.submitCheckEvidence}>{snap.position+1<snap.total?'Save evidence and go on':'Save evidence and see results'}</button></>}
    </main>;
  }
  if(snap.phase==='interrupted')return <main className="page reading" data-phase="interrupted">{head}<h1>Saved check needs review</h1><p role="status">{snap.reason}</p><p>Close this attempt to return to the lesson. Your saved selections and reading history stay on record, with no score. Any later check uses questions you have not answered or opened before; previously read text is labelled.</p><button type="button" className="primary" onClick={on.closeInterruptedCheck}>Close this attempt and learn</button></main>;
  if (snap.phase === "no_fresh_check")
    return (
      <main className="page reading" data-phase="no_fresh_check">
        {head}
        <h1 className="hero">No new questions left here</h1>
        <p className="sub">You have already seen every check question for this skill at this level. A question you have seen cannot show what you can do on your own, so none is repeated.</p>
        <button type="button" className="primary" onClick={() => on.open(snap.unit, "learn")}>
          Go over the lesson and practice
        </button>
        <button type="button" className="secondary" onClick={on.leave}>
          Choose another skill
        </button>
      </main>
    );
  const r = snap.result;
  const right = r.review.filter((x) => x.correct).length;
  return (
    <main className="page reading" data-phase="result">
      {head}
      <h1 className="hero">
        {right} of {r.review.length} right
      </h1>
      {r.label ? <p className="pill">{r.label}</p> : <p className="sub">Not yet. Look at what the text says below, then practise once more.</p>}
      <p className="small">{r.scope} {snap.unit.skill==="inference"?"Answer and evidence scores stay separate. This skill advances only when both answers and both complete clue sets are correct.":"This score and level decision count answers only, as before. Supporting evidence is reported separately."}</p>
      {snap.unit.skill==="inference"&&right===r.review.length&&!r.passed&&<p role="status">Your answers are right, but the clue sets are not complete yet. This level has not advanced. Practise connecting all the needed clues, then try new questions if available.</p>}
      <p>{r.review.filter(x=>x.evidenceFinding==='complete').length} of {r.review.filter(x=>x.evidenceFinding).length} assessed evidence selections complete.</p>
      {r.review.map((x) => (
        <section key={x.question.id} className={`feedback ${x.correct ? "right" : "wrong"}`} aria-label={x.question.prompt}>
          <p className="small">{x.question.passage.title}</p>
          <p className="prompt">{x.question.prompt}</p>
          <p>
            <span className="verdict">{x.correct ? "Right: " : "You chose: "}</span>
            {x.question.options[x.choice]}
          </p>
          {!x.correct && (
            <p>
              <span className="verdict">Answer: </span>
              {x.question.options[x.right]}
            </p>
          )}
          <p>{x.explain}</p>
          <blockquote>{x.evidence}</blockquote>
          <Flag stream="reading" id={x.question.id} />
          {x.evidenceFinding?<><p><strong>Evidence: </strong>{SENTENCE_FEEDBACK[x.evidenceFinding]}</p><p>You selected sentences: {x.sentences!.map(i=>i+1).join(', ')}.</p><details><summary>Supporting sentence combinations</summary>{supportingSets(course,course.questions.find(q=>q.id===x.question.id)!).map(set=><blockquote key={set.join(',')}>{set.map(i=>`${i+1}. ${sentenceChoices(x.question.passage.text)[i]}`).join(' ')}</blockquote>)}</details></>:<p>Evidence was not assessed in this answer-only record.</p>}
        </section>
      ))}
      {r.next.kind === "level_up" && (
        <button type="button" className="primary" onClick={() => on.open((r.next as { unit: Unit }).unit, "learn")}>
          Go up to {levelName(course, r.next.unit.level)}
        </button>
      )}
      {r.next.kind === "step_back" && (
        <button type="button" className="primary" onClick={() => on.open((r.next as { unit: Unit }).unit, "learn")}>
          Step back to {levelName(course, r.next.unit.level)} first
        </button>
      )}
      {r.next.kind === "practise_again" && (
        <button type="button" className="primary" onClick={() => on.open(snap.unit, "learn")}>
          Practise again, then two new questions
        </button>
      )}
      {r.next.kind === "no_fresh_check" && <><p className="sub">There are no new check questions left for this skill at this level. You can still go over the lesson and practice.</p><button type="button" onClick={()=>on.open(snap.unit,"learn")}>Review the lesson and practice</button></>}
      {r.next.kind === "skill_complete" && <p className="sub">That is the top level of this skill.</p>}
      <button type="button" className="secondary" onClick={on.leave}>
        All reading skills
      </button>
    </main>
  );
}

export function Reading({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [evidence,setEvidence]=useState(false);
  const [inference,setInference]=useState(false);
  const [session, setSession] = useState<ReadingUnitSession | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const unsaved = useRef<ReadingRecord[]>([]);
  const savingLock=useRef(false);
  const failedSession=useRef<ReadingUnitSession|null>(null);
  const records = learner.readingRecords();
  const p = useMemo(() => progress(COURSE, records), [records.length]);
  /**
   * Store what the step recorded, then show the result (a check question is saved as seen before it is displayed).
   * Records that could not be saved wait in order and go first on the next step.
   */
  const step = async (s: ReadingUnitSession, act?: () => void) => {
    if(savingLock.current)return;
    savingLock.current=true;setSaving(true);
    const before = s.snapshot();
    act?.();
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordReading([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);failedSession.current=null;
    } catch {
      setFailed(true);failedSession.current=s;
    }
    savingLock.current=false;setSaving(false);
    setTick((t) => t + 1);
    onChanged();
    const after = s.snapshot();
    const moved = before.phase !== after.phase || (before.phase === "practice" && after.phase === "practice" && before.practice.index !== after.practice.index) || (before.phase === "check" && after.phase === "check" && before.position !== after.position);
    if (moved || !act) scrollTo(0, 0);
  };
  const open = (u: Unit, mode: Mode) => {
    if(savingLock.current)return;
    if(failedSession.current){const pending=failedSession.current;setSession(pending);void step(pending);return;}
    const s = new ReadingUnitSession(COURSE, u, mode, learner.readingRecords());
    setSession(s);
    void step(s);
  };
  if(inference)return <ReadingInference learner={learner} onBack={()=>setInference(false)} onChanged={onChanged}/>;
  if(evidence)return <ReadingEvidence learner={learner} onBack={()=>setEvidence(false)} onChanged={onChanged}/>;
  if (!session)
    return (
      <>
        <div className="page">{!failedSession.current&&<a className="secondary" href="?experience=causal-reading">Find my next causal-reading step</a>}<button className="secondary" disabled={!!failedSession.current} onClick={()=>setEvidence(true)}>Answer and show why</button><button className="secondary" disabled={!!failedSession.current} onClick={()=>setInference(true)}>Connect the clues</button></div>
        {failedSession.current&&<p role="status">Finish saving your pending reading step before starting another activity. Reopen its check to retry; your unsaved selection is still held here.</p>}
        {COURSE.levels.flatMap(l=>COURSE.skills.map(skill=>({level:l.id,skill:skill.id}))).filter(u=>pendingCheck(records,u)).map(u=><div className="page" key={unitKey(u)}><button className="secondary" onClick={()=>open(u,'check_me')}>Continue saved check: {skillName(COURSE,u.skill)} · {levelName(COURSE,u.level)}</button></div>)}
        <ReadingMap course={COURSE} progress={p} start={asReadingLevel(learner.levels().reading?.start)} onOpen={open} onBack={onLeave} />
        <div className="page reading-note">
          <NoteBox learner={learner} screen="reading" label="Anything confusing or wrong on this screen? Tell us." />
        </div>
      </>
    );
  const s = session;
  if (saving || failed) return <main className="page"><p role={failed?"alert":"status"}>{failed?"This step could not be saved. Its passage is hidden until the reading record is safe.":"Saving your reading step…"}</p>{failed&&<><button onClick={()=>void step(s)}>Retry saving</button><button onClick={()=>setSession(null)}>Back to reading skills</button></>}</main>;
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next step will try again.
        </p>
      )}
      <ReadingUnitView
        key={`${unitKey(s.unit)}:${s.snapshot().phase}`}
        course={COURSE}
        snap={s.snapshot()}
        on={{
          nextStep: () => void step(s, () => s.nextStep()),
          startPractice: () => void step(s, () => s.startPractice()),
          hint: () => void step(s, () => s.hint()),
          answerPractice: (i) => void step(s, () => s.answerPractice(i)),
          nextPractice: () => void step(s, () => s.nextPractice()),
          answerCheck: (i) => void step(s, () => s.answerCheck(i)),
          selectCheckAnswer:(i)=>void step(s,()=>s.selectCheckAnswer(i)),
          lockCheckAnswer:()=>void step(s,()=>s.lockCheckAnswer()),
          selectCheckEvidence:(selected)=>void step(s,()=>s.selectCheckEvidence(selected)),
          submitCheckEvidence:()=>void step(s,()=>s.submitCheckEvidence()),
          closeInterruptedCheck:()=>void step(s,()=>s.closeInterruptedCheck()),
          selectPracticeClues:(selected)=>void step(s,()=>s.selectPracticeClues(selected)),
          checkPracticeClues:()=>void step(s,()=>s.checkPracticeClues()),
          open,
          leave: () => setSession(null),
        }}
      />
      <div className="page reading-note">
        <NoteBox learner={learner} screen={`reading:${unitKey(s.unit)}:${s.snapshot().phase}`} label="Was this text, question or explanation confusing or wrong? Tell us." />
      </div>
    </>
  );
}
