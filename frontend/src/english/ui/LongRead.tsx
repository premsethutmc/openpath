/**
 * Long reads (logic/reading/long-read): a story in three parts, one part a sitting, two questions after each part
 * and three on the whole story at the end. Each answer shows why. Practice-only.
 */
import { Flag } from "./Flag.tsx";
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { LONG, LongSitting, PARTS, longLevel, longSummary, nextStep, type LongRecord } from "../logic/reading/long-read.ts";
import { asReadingLevel } from "../logic/streams/level-check.ts";

const partName = (part: number) => (part < PARTS ? `Part ${part + 1} of ${PARTS}` : "The whole story");

export function LongRead({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<LongSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<LongRecord[]>([]);
  // the reading level found at the start (Reading level check), raised as stories go well
  const level = () => longLevel(LONG, learner.longRecords(), asReadingLevel(learner.levels().reading?.start) ?? 3);
  const step = nextStep(LONG, learner.longRecords(), level());
  const tick = () => setTick((t) => t + 1);
  const save = async (s: LongSitting) => {
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordLong([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
    tick();
  };
  const begin = () => {
    if (!step) return;
    setSitting(new LongSitting(step.text, step.part));
    scrollTo(0, 0);
  };

  if (!sitting) {
    const sum = longSummary(learner.longRecords());
    return (
      <main className="page vocab long-read" data-phase="intro" aria-labelledby="long-title">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <p className="eyebrow">Reading · Long reads</p>
        <h1 id="long-title" className="hero">
          Long reads
        </h1>
        <p className="sub">A longer story in three parts. Read one part at a time and answer two questions on it. After the last part, three questions on the whole story: what it is about, how a character changes, and what the title means.</p>
        {sum.parts > 0 && (
          <p className="small">
            {sum.finished} {sum.finished === 1 ? "story" : "stories"} finished · {sum.right} of {sum.asked} questions right
          </p>
        )}
        {step ? (
          <div className="tile lilac">
            <p className="small">
              {step.text.theme[0].toUpperCase() + step.text.theme.slice(1)} · {partName(step.part)}
            </p>
            <h2>{step.text.title}</h2>
            <button type="button" className="primary" onClick={begin}>
              {step.part === 0 ? (learner.longRecords().some((r) => r.text === step.text.id && r.part === PARTS) ? "Read it again" : "Start the story") : step.part < PARTS ? `Read part ${step.part + 1}` : "Questions on the whole story"}
            </button>
          </div>
        ) : (
          <p>Every story is read. New stories will come.</p>
        )}
      </main>
    );
  }

  const v = sitting.snapshot();
  const head = (
    <>
      <button type="button" className="link" onClick={() => (setSitting(null), onLeave())}>
        ← Stop
      </button>
      <p className="pill">
        {v.title} · {partName(v.part)}
      </p>
    </>
  );
  if (v.phase === "read")
    return (
      <main className="page vocab long-read" data-phase="read" data-part={v.part}>
        {head}
        {v.part === PARTS && <p className="sub">Look back at the whole story if you need to, then answer three questions on it.</p>}
        <article className="long-text" data-long-text>
          {v.text.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </article>
        <button type="button" className="primary" onClick={() => (sitting.read(), tick(), scrollTo(0, 0))}>
          {v.part === PARTS ? "Answer the questions" : "I have read it: questions"}
        </button>
      </main>
    );
  if (v.phase === "done")
    return (
      <main className="page vocab long-read" data-phase="done">
        {head}
        <h2>
          {v.right} of {v.total} right
        </h2>
        <p>{v.part < PARTS - 1 ? "The story goes on in the next part." : v.part === PARTS - 1 ? "You have read the whole story. Next: three questions on all of it." : "You have finished the story."}</p>
        {failed && (
          <p className="warning" role="alert">
            This could not be saved. Check the connection and try again.
          </p>
        )}
        <button type="button" className="primary" onClick={() => (setSitting(null), tick())}>
          {v.part < PARTS ? "Go on" : "Done"}
        </button>
      </main>
    );
  return (
    <main className="page vocab long-read" data-phase={v.phase} data-question={v.index}>
      {head}
      <p className="small">
        Question {v.index + 1} of {v.total}
      </p>
      <p className="prompt" id="long-question">
        {v.question!.prompt}
      </p>
      <p className="choose-options" role="group" aria-labelledby="long-question">
        {v.question!.options.map((o, i) => (
          <button key={o} type="button" className="choice" data-choice={o} disabled={v.phase === "answered"} data-state={v.answered ? (o === v.answered.right ? "right" : "") : ""} onClick={() => (sitting.answer(i), tick())}>
            {o}
          </button>
        ))}
      </p>
      {v.answered && (
        <div className="dict-feedback" role="status" data-correct={v.answered.correct}>
          <p className={v.answered.correct ? "words-verdict right" : "words-verdict"}>{v.answered.correct ? "✓ Right" : `Not quite: ${v.answered.right}`}</p>
          <p className="small">{v.answered.explain}</p>
          <Flag stream="long" id={`${sitting.text.id}|${v.part}|${v.index}`} />
          <button
            type="button"
            className="primary"
            autoFocus
            onClick={() => {
              sitting.next();
              if (sitting.snapshot().phase === "done") void save(sitting);
              tick();
            }}
          >
            {v.index + 1 < v.total ? "Next question" : "Finish"}
          </button>
        </div>
      )}
    </main>
  );
}
