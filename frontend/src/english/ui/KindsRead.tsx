/**
 * Kinds of text (logic/reading/kinds): a poem, notice, timetable, letter, advert, article, speech, play scene or
 * two texts to compare. Read it, then answer its questions with the text still to hand. Each answer shows why.
 * Practice-only.
 */
import { Flag } from "./Flag.tsx";
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { KINDS, KIND_NAMES, KindSitting, SKILL_NAMES, kindStart, kindsSummary, kindToRead, type KindRecord } from "../logic/reading/kinds.ts";

/**
 * Lines kept as written: a poem's lines and a letter's layout. In a timetable or chart, a block whose lines split into
 * columns (two or more spaces apart) is shown as a table, so it fits a phone without sideways scrolling.
 */
export function KindText({ kind, text }: { kind: string; text: string }) {
  const table = kind === "timetable" || kind === "chart";
  // a line that starts with spaces has an empty first cell (a column of years over a column of names)
  const cells = (block: string) => block.split("\n").map((l) => (/^\s{2,}/.test(l) ? ["", ...l.trim().split(/\s{2,}/)] : l.trim().split(/\s{2,}/)));
  // the first row is a heading when every cell is short and starts with a capital or a digit
  const heading = (r: string[]) => r.length > 1 && r.every((c) => c === "" || (/^[A-Z0-9]/.test(c) && c.split(" ").length <= 2));
  return (
    <article className={table ? "kind-text kind-table" : kind === "poem" ? "kind-text kind-poem" : "kind-text"} data-kind-text={kind}>
      {text.split("\n\n").map((block, i) => {
        const rows = cells(block);
        if (table && rows.length >= 2 && rows.filter((r) => r.length >= 2).length >= 2)
          return (
            <table key={i}>
              <tbody>
                {rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (j === 0 && heading(r) ? <th key={k}>{c}</th> : <td key={k}>{c}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        return <p key={i}>{block}</p>;
      })}
    </article>
  );
}

export function KindsRead({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<KindSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<KindRecord[]>([]);
  const level = kindStart(learner.levels().reading);
  const pick = kindToRead(KINDS, learner.kindRecords(), level);
  const next = pick?.text ?? null;
  const tick = () => setTick((t) => t + 1);
  const save = async (s: KindSitting) => {
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordKind([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
    tick();
  };

  if (!sitting) {
    const sum = kindsSummary(learner.kindRecords());
    return (
      <main className="page vocab kinds-read" data-phase="intro" aria-labelledby="kinds-title">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <p className="eyebrow">Reading · Poems and everyday texts</p>
        <h1 id="kinds-title" className="hero">
          Poems and everyday texts
        </h1>
        <p className="sub">Poems, notices, timetables, letters, adverts, speeches and pairs of texts to compare. Read one, then answer questions on what it says, why it was written and how it is written.</p>
        {sum.texts > 0 && (
          <p className="small">
            {sum.texts} {sum.texts === 1 ? "text" : "texts"} read · {sum.right} of {sum.asked} questions right
            {sum.weak.length > 0 && <> · to work on: {sum.weak.slice(0, 2).map((k) => SKILL_NAMES[k]).join(", ")}</>}
          </p>
        )}
        {next ? (
          <div className="tile lilac">
            <p className="small">{KIND_NAMES[next.kind]}</p>
            <h2>{next.title}</h2>
            <button type="button" className="primary" onClick={() => (setSitting(new KindSitting(next)), scrollTo(0, 0))}>
              {pick?.again ? "Read it again" : "Read it"}
            </button>
          </div>
        ) : (
          <p>Every text is read. New ones will come.</p>
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
        {KIND_NAMES[v.kind]} · {v.title}
      </p>
    </>
  );
  if (v.phase === "read")
    return (
      <main className="page vocab kinds-read" data-phase="read">
        {head}
        <KindText kind={v.kind} text={v.text} />
        <button type="button" className="primary" onClick={() => (sitting.read(), tick(), scrollTo(0, 0))}>
          I have read it: questions
        </button>
      </main>
    );
  if (v.phase === "done")
    return (
      <main className="page vocab kinds-read" data-phase="done">
        {head}
        <h2>
          {v.right} of {v.total} right
        </h2>
        {failed && (
          <p className="warning" role="alert">
            This could not be saved. Check the connection and try again.
          </p>
        )}
        <button type="button" className="primary" onClick={() => (setSitting(null), tick())}>
          Done
        </button>
      </main>
    );
  return (
    <main className="page vocab kinds-read" data-phase={v.phase} data-question={v.index}>
      {head}
      <details className="kind-back">
        <summary>Look back at the text</summary>
        <KindText kind={v.kind} text={v.text} />
      </details>
      <p className="small">
        Question {v.index + 1} of {v.total} · {SKILL_NAMES[v.question!.skill]}
      </p>
      <p className="prompt" id="kind-question">
        {v.question!.prompt}
      </p>
      <p className="choose-options" role="group" aria-labelledby="kind-question">
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
          <Flag stream="kinds" id={`${sitting.text.id}|${v.index}`} />
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
