/** foundations@1: the "Start here" part of a new skill's first lesson: the ideas the lesson relies on, with a picture. */
import { useState } from "react";
import { pictureScene } from "../../../packages/learning/src/foundation-pictures";
import { PictureExplore, PictureRound } from "./PictureTasks";
import { SceneFigure } from "./Scene";
import { foundationsOf, picturesOf, roundFor, shownOrder, type FoundationQuestion, type FoundationScreen, type Picture } from "../../../packages/learning/src/foundations";

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
      {s.text.map((t, i) => <p key={i}>{t}</p>)}
      {s.example?.length ? <div className="sh-example">{s.example.map((t, i) => <div key={i}>{t}</div>)}</div> : null}
      {s.check ? <div className="sh-check"><p><b>Quick check:</b> {s.check.question}</p>{shown ? <p className="sh-answer">{s.check.answer}</p> : <button type="button" className="sh-show" onClick={() => setShown(true)}>Show the answer</button>}</div> : null}
    </section>
  );
}

/** foundation-practice@1: the idea's own questions, one at a time. A wrong choice says what went wrong and can be tried again. */
export function FoundationPractice({ questions, onDone }: { questions: FoundationQuestion[]; onDone?: () => void }) {
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
      {right && <button type="button" className="sh-show" onClick={() => { if (tried.length === 1) setFirstTry(firstTry + 1); setTried([]); setI(i + 1); if (i + 1 >= questions.length) onDone?.(); }}>{i + 1 < questions.length ? "Next question" : "Finish"}</button>}
    </section>
  );
}

/** How many times this idea's practice was finished on this device (so the next visit gets the next round). Never evidence. */
const KEY = (competency: string, concept: string) => `openpath:start-here:${competency}:${concept}`;
const visits = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const bump = (k: string) => { try { localStorage.setItem(k, String(visits(k) + 1)); } catch { /* private mode: the same round next time */ } };

/** In front of a new skill's first lesson: nothing when the skill has no start-here teaching. */
export function StartHere({ competency }: { competency: string }) {
  const all = foundationsOf(competency);
  // one draw per visit: the picture questions and the round of questions stay the same while the page is open
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [visit] = useState(() => all.map((f) => visits(KEY(competency, f.concept))));
  if (!all.length) return null;
  return (
    <div className="sh" data-start-here={competency}>
      <p className="sh-eyebrow">Start here</p>
      {all.map((f, k) => <div className="sh" key={k}>
        {f.screens.map((s, i) => <FoundationCard key={i} s={s} />)}
        {picturesOf(f).map((p) => <PictureExplore key={p} kind={p} seed={seed + visit[k]} />)}
        {picturesOf(f).map((p, i) => <PictureRound key={p} kind={p} seed={seed + k * 101 + i * 13 + visit[k] * 7919} />)}
        {roundFor(f, visit[k]).length ? <FoundationPractice questions={roundFor(f, visit[k])} onDone={() => bump(KEY(competency, f.concept))} /> : null}
      </div>)}
    </div>
  );
}
