/** foundations@1: the "Start here" part of a new skill's first lesson: the ideas the lesson relies on, with a picture. */
import { useState } from "react";
import { pictureScene } from "../../../packages/learning/src/foundation-pictures";
import { PictureExplore, PictureRound } from "./PictureTasks";
import { SceneFigure, ScenePlayer } from "./Scene";
import { Figure } from "./Figure";
import { foundationsOf, picturesOf, shownOrder, type FoundationQuestion, type FoundationScreen, type Picture } from "../../../packages/learning/src/foundations";

import { mx } from "./MatrixText";
import { breakItDown, liftFor } from "../../../packages/learning/src/step-scenes";
import { classOfQuestion } from "./StepCoach";
/** The labelled picture of an idea, drawn by the scene engine from its description (foundation-pictures.ts). */
export function FoundationPicture({ kind }: { kind: Picture }) {
  const { scene, state } = pictureScene(kind);
  return <SceneFigure scene={scene} state={state} label={kind.replace(/-/g, " ")} />;
}

/** steps-everywhere@1: a generated lesson's worked question: the question, then each line of working in its own box. */
/** why-taps@1: where a "Why?" or "Break it down" tap is recorded. The app sets it once a learner is known; unset, nothing is kept. */
export const whyTaps: { record?: (competency: string, screen: string, step: number) => void } = {};

/**
 * step-scene@1: what "Break it down" opens for question `qid` (step-scenes.ts, by the question's class). A Class 1–5
 * child gets the counter and the lift when the steps are adding or taking away, and then no written reasons; Class 1–3
 * gets no written reasons at all. Class 6 and up keeps the reasons, with the picture too when the numbers go below 0.
 */
export function stepHelpOf(qid: string | undefined) {
  return qid ? breakItDown(qid, classOfQuestion(qid)) : { scene: null, words: true };
}

export function SteppedMath({ lines, whys, qid, onWhy }: { lines: string[]; whys?: (string[] | null)[] | null; qid?: string; onWhy?: (step: number, all: boolean) => void }) {
  const [help] = useState(() => stepHelpOf(qid));
  // step-why@1: when the question's family gives reasons (and the learner can read them), each step has its own Why? and Break it down opens them all
  const has = help.words && !!whys && whys.length === lines.length - 1 && whys.some(Boolean);
  const scene = help.scene;
  const [open, setOpen] = useState<boolean[]>(() => lines.slice(1).map(() => false));
  const [shown, setShown] = useState(false);
  const all = scene ? shown : has && whys!.every((w, k) => !w || open[k]);
  const toggle = () => {
    if (scene) setShown(!all);
    if (has) setOpen(whys!.map((w) => !all && !!w));
    if (!all) onWhy?.(-1, true);
  };
  return (
    <div className="formula stepped" data-stepped>
      <p className="sh-ask">{mx(lines[0])}</p>
      {(has || scene) && <button type="button" className="sh-show sh-break" aria-pressed={all} onClick={toggle}>{all ? "Show less" : "Break it down"}</button>}
      {scene && shown ? <div className="sh-tally" data-step-scene><ScenePlayer scene={scene} /></div> : null}
      <ol>{lines.slice(1).map((m, k) => (
        <li className="sh-step" key={k}>
          <p className="sh-step-do"><span className="sh-step-n">Step {k + 1}</span></p>
          <div className="sh-step-lines"><div>{mx(m)}</div></div>
          {has && whys![k] && open[k] ? <div className="sh-why" data-why>{whys![k]!.map((w, j) => <p key={j}>{mx(w)}</p>)}</div> : null}
          {has && whys![k] ? <button type="button" className="sh-why-btn" aria-expanded={open[k]} onClick={() => { setOpen(open.map((o, j) => (j === k ? !o : o))); if (!open[k]) onWhy?.(k, false); }}>{open[k] ? "Hide" : "Why?"}</button> : null}
        </li>))}
      </ol>
    </div>
  );
}

/**
 * step-scene@1 where the child works the example ("Work it with me"): for a Class 1–5 question that has the counter and
 * the lift, "Break it down" opens it above the child's own steps, so the child can watch and do the drops first.
 */
export function LiftHelp({ qid, onOpen }: { qid: string; onOpen?: () => void }) {
  const [scene] = useState(() => liftFor(qid, classOfQuestion(qid)));
  const [open, setOpen] = useState(false);
  if (!scene) return null;
  return (
    <div className="sh-lift" data-lift-help>
      <button type="button" className="secondary sh-lift-btn" aria-pressed={open} onClick={() => { setOpen(!open); if (!open) onOpen?.(); }}>{open ? "Show less" : <><span aria-hidden="true" className="sh-lift-icon">▲▼</span> Break it down</>}</button>
      {open && <div className="sh-tally" data-step-scene><ScenePlayer scene={scene} /></div>}
    </div>
  );
}

/** break-it-down@1: a worked problem, one step at a time. Each step can show its reason; one button shows them all. */
function Steps({ steps, cases, where, words = true }: { steps: NonNullable<FoundationScreen["steps"]>; cases?: boolean; where?: [string, string]; words?: boolean }) {
  const [open, setOpen] = useState<boolean[]>(() => steps.map(() => false));
  const all = open.every(Boolean);
  // step-scene@1's class rule: a Class 1–3 child sees the steps, not written reasons (no "Why?", no "Break it down")
  if (!words) return (
    <div className="sh-steps" data-steps>
      <ol>{steps.map((st, i) => <li key={i} className="sh-step"><p className="sh-step-do"><span className="sh-step-n">{cases ? "Example" : "Step"} {i + 1}</span> {mx(st.do)}</p><div className="sh-step-lines">{st.lines.map((l, j) => <div key={j}>{mx(l)}</div>)}</div></li>)}</ol>
    </div>
  );
  return (
    <div className="sh-steps" data-steps>
      <button type="button" className="sh-show sh-break" aria-pressed={all} onClick={() => { setOpen(steps.map(() => !all)); if (!all && where) whyTaps.record?.(where[0], where[1], -1); }}>{all ? "Show less" : "Break it down"}</button>
      <ol>
        {steps.map((st, i) => (
          <li key={i} className="sh-step">
            <p className="sh-step-do"><span className="sh-step-n">{cases ? "Example" : "Step"} {i + 1}</span> {mx(st.do)}</p>
            <div className="sh-step-lines">{st.lines.map((l, j) => <div key={j}>{mx(l)}</div>)}</div>
            {open[i] ? <div className="sh-why" data-why>{st.why.map((w, j) => <p key={j}>{mx(w)}</p>)}</div> : null}
            <button type="button" className="sh-why-btn" aria-expanded={open[i]} onClick={() => { setOpen(open.map((o, j) => (j === i ? !o : o))); if (!open[i] && where) whyTaps.record?.(where[0], where[1], i); }}>{open[i] ? "Hide" : "Why?"}</button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** `cls`: the class the entry is written for; Class 1–3 gets the steps without written reasons. */
export function FoundationCard({ s, competency, cls }: { s: FoundationScreen; competency?: string; cls?: number }) {
  const [shown, setShown] = useState(false);
  return (
    <section className="sh-card">
      <h3>{s.title}</h3>
      {s.picture ? <FoundationPicture kind={s.picture} /> : null}
      {s.scene ? <ScenePlayer scene={s.scene} /> : null}
      {s.figures?.length ? <div className={`sh-figs${s.figures.length > 1 ? " many" : ""}`}>{s.figures.map((f, i) => <div className="sh-fig" key={i}><Figure v={f.v} /><p className="sh-cap">{f.caption}</p></div>)}</div> : null}
      {s.text.map((t, i) => <p key={i}>{mx(t)}</p>)}
      {s.ask ? <p className="sh-ask">{mx(s.ask)}</p> : null}
      {s.steps?.length ? <Steps steps={s.steps} cases={s.stepsAre === "cases"} where={competency ? [competency, s.title] : undefined} words={!(cls !== undefined && cls <= 3)} /> : null}
      {s.after?.map((t, i) => <p key={`a${i}`} className="sh-after">{mx(t)}</p>)}
      {s.example?.length ? <div className="sh-example">{s.example.map((t, i) => <div key={i}>{mx(t)}</div>)}</div> : null}
      {s.check ? <div className="sh-check"><p><b>Quick check:</b> {mx(s.check.question)}</p>{shown ? <p className="sh-answer">{mx(s.check.answer)}</p> : <button type="button" className="sh-show" onClick={() => setShown(true)}>Show the answer</button>}</div> : null}
    </section>
  );
}

/** foundation-practice@1: the idea's own questions, one at a time. A wrong choice says what went wrong and can be tried again. */
export function FoundationPractice({ questions, onDone }: { questions: FoundationQuestion[]; onDone?: (firstTry: number) => void }) {
  const [i, setI] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [firstTry, setFirstTry] = useState(0);
  if (i >= questions.length) return <section className="sh-card sh-done" role="status"><h3>You have got the idea</h3><p>{firstTry} of {questions.length} right the first time. The lesson is next.</p></section>;
  const q = questions[i], last = tried[tried.length - 1], right = last === q.answer;
  return (
    <section className="sh-card sh-practice" data-foundation-practice>
      <p className="sh-eyebrow">Now you try · {i + 1} of {questions.length}</p>
      <h3>{mx(q.question)}</h3>
      <div className="sh-options">
        {shownOrder(q).map((k) => <button key={k} type="button" className={`sh-option${tried.includes(k) ? (k === q.answer ? " right" : " wrong") : ""}`} disabled={right || tried.includes(k)} onClick={() => setTried([...tried, k])}>{mx(q.options[k])}</button>)}
      </div>
      {last !== undefined && <p className={right ? "sh-feedback good" : "sh-feedback"} role="status">{mx(right ? `Yes. ${q.why}` : `Not quite. ${q.wrong[last] || "Look at the idea again and try another choice."}`)}</p>}
      {right && <button type="button" className="sh-show" onClick={() => { const got = firstTry + (tried.length === 1 ? 1 : 0); setFirstTry(got); setTried([]); setI(i + 1); if (i + 1 >= questions.length) onDone?.(got); }}>{i + 1 < questions.length ? "Next question" : "Finish"}</button>}
    </section>
  );
}

/** understanding@1 for a page with no learner record (the owner's view): finished rounds are counted on this device only. */
const KEY = (competency: string, concept: string) => `openpath:start-here:${competency}:${concept}`;
const visits = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const bump = (k: string) => { try { localStorage.setItem(k, String(visits(k) + 1)); } catch { /* private mode: the same round next time */ } };
type Done = readonly { competency: string; concept: string }[];

/**
 * In front of a skill's lesson: nothing when the skill has no start-here teaching. With a learner's record (`done`,
 * `onRound`) the round shown is the one after those already finished, on any device, and each finished round is saved
 * (understanding@1). `again`: shown to a learner who is being taught the skill again.
 */
export function StartHere({ competency, done, onRound, again }: { competency: string; done?: Done; onRound?: (competency: string, concept: string, round: number, asked: number, firstTry: number) => unknown; again?: boolean }) {
  const all = foundationsOf(competency);
  // one draw per visit: the picture questions and the round of questions stay the same while the page is open
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [visit] = useState(() => all.map((f) => (done ? done.filter((d) => d.competency === competency && d.concept === f.concept).length : visits(KEY(competency, f.concept)))));
  if (!all.length) return null;
  return (
    <div className="sh" data-start-here={competency}>
      <p className="sh-eyebrow">{again ? "First, the idea behind this" : all.some((f) => f.lesson) ? "Learn it step by step" : "Start here"}</p>
      {all.map((f, k) => { const rounds = [f.practice ?? [], ...(f.rounds ?? [])].filter((r) => r.length), at = rounds.length ? visit[k] % rounds.length : 0; return <div className="sh" key={k}>
        {f.screens.map((s, i) => <FoundationCard key={i} s={s} competency={competency} cls={f.class} />)}
        {picturesOf(f).map((p) => <PictureExplore key={p} kind={p} seed={seed + visit[k]} />)}
        {picturesOf(f).map((p, i) => <PictureRound key={p} kind={p} seed={seed + k * 101 + i * 13 + visit[k] * 7919} />)}
        {rounds.length ? <FoundationPractice questions={rounds[at]} onDone={(firstTry) => { if (onRound) onRound(competency, f.concept, at, rounds[at].length, firstTry); else bump(KEY(competency, f.concept)); }} /> : null}
      </div>; })}
    </div>
  );
}
