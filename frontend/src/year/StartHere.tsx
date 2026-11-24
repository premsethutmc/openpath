/** foundations@1: the "Start here" part of a new skill's first lesson: the ideas the lesson relies on, with a picture. */
import { useState } from "react";
import { pictureScene } from "../../../packages/learning/src/foundation-pictures";
import { PictureExplore, PictureRound } from "./PictureTasks";
import { SceneFigure } from "./Scene";
import { Figure } from "./Figure";
import { foundationsOf, picturesOf, shownOrder, type FoundationQuestion, type FoundationScreen, type Picture } from "../../../packages/learning/src/foundations";

/** The labelled picture of an idea, drawn by the scene engine from its description (foundation-pictures.ts). */
export function FoundationPicture({ kind }: { kind: Picture }) {
  const { scene, state } = pictureScene(kind);
  return <SceneFigure scene={scene} state={state} label={kind.replace(/-/g, " ")} />;
}

export function FoundationCard({ s }: { s: FoundationScreen }) {
  const [shown, setShown] = useState(false);
  return (
    <section className="sh-card">
      <h3>{s.title}</h3>
      {s.picture ? <FoundationPicture kind={s.picture} /> : null}
      {s.figures?.length ? <div className={`sh-figs${s.figures.length > 1 ? " many" : ""}`}>{s.figures.map((f, i) => <div className="sh-fig" key={i}><Figure v={f.v} /><p className="sh-cap">{f.caption}</p></div>)}</div> : null}
      {s.text.map((t, i) => <p key={i}>{t}</p>)}
      {s.example?.length ? <div className="sh-example">{s.example.map((t, i) => <div key={i}>{t}</div>)}</div> : null}
      {s.check ? <div className="sh-check"><p><b>Quick check:</b> {s.check.question}</p>{shown ? <p className="sh-answer">{s.check.answer}</p> : <button type="button" className="sh-show" onClick={() => setShown(true)}>Show the answer</button>}</div> : null}
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
      <h3>{q.question}</h3>
      <div className="sh-options">
        {shownOrder(q).map((k) => <button key={k} type="button" className={`sh-option${tried.includes(k) ? (k === q.answer ? " right" : " wrong") : ""}`} disabled={right || tried.includes(k)} onClick={() => setTried([...tried, k])}>{q.options[k]}</button>)}
      </div>
      {last !== undefined && <p className={right ? "sh-feedback good" : "sh-feedback"} role="status">{right ? `Yes. ${q.why}` : `Not quite. ${q.wrong[last] || "Look at the idea again and try another choice."}`}</p>}
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
      <p className="sh-eyebrow">{again ? "First, the idea behind this" : "Start here"}</p>
      {all.map((f, k) => { const rounds = [f.practice ?? [], ...(f.rounds ?? [])].filter((r) => r.length), at = rounds.length ? visit[k] % rounds.length : 0; return <div className="sh" key={k}>
        {f.screens.map((s, i) => <FoundationCard key={i} s={s} />)}
        {picturesOf(f).map((p) => <PictureExplore key={p} kind={p} seed={seed + visit[k]} />)}
        {picturesOf(f).map((p, i) => <PictureRound key={p} kind={p} seed={seed + k * 101 + i * 13 + visit[k] * 7919} />)}
        {rounds.length ? <FoundationPractice questions={rounds[at]} onDone={(firstTry) => { if (onRound) onRound(competency, f.concept, at, rounds[at].length, firstTry); else bump(KEY(competency, f.concept)); }} /> : null}
      </div>; })}
    </div>
  );
}
