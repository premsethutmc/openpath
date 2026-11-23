/**
 * The Journey and Progress tabs, built on the five daily activities (Words, Reading, Listening, Spelling, Grammar):
 * where the learner is on each one's ladder and what moves them up (Journey), and what they have done (Progress).
 * The older journey's skill-by-skill view stays below each, folded away.
 */
import { levelLine } from "../logic/vocabulary/size-check.ts";
import { useState, type ReactNode } from "react";
import type { Learner } from "../logic/learner.ts";
import { childSummary } from "../logic/parent-view.ts";
import { streamRows } from "../logic/streams/streams.ts";
import { summary as wordsSummary } from "../logic/vocabulary/daily-words.ts";

export function Folded({ title, hint, children, start = false }: { title: string; hint: string; children: ReactNode; start?: boolean }) {
  const [open, setOpen] = useState(start);
  return (
    <>
      <button type="button" className="fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="small">{open ? "Hide" : hint}</span>
      </button>
      {open && <div>{children}</div>}
    </>
  );
}

/** Journey: each daily activity as a ladder, the learner's step marked, and the rule that moves them up. */
export function DailyPath({ learner, onLevelCheck }: { learner: Learner; onLevelCheck?: () => void }) {
  if (!learner.levels().done)
    return (
      <div className="tile peach" data-daily-path="none">
        <b>First, find your level</b>
        <p>Your path starts with Find my level on Home: four short parts, about ten minutes. Then each activity shows its own ladder here.</p>
        {onLevelCheck && (
          <button type="button" className="primary" onClick={onLevelCheck}>
            Find my level
          </button>
        )}
      </div>
    );
  const rows = streamRows(learner, learner.clock());
  return (
    <ul className="daily-path" aria-label="Your English, activity by activity">
      {rows.map((r) => (
        <li key={r.id} data-stream={r.id} data-at={r.at}>
          <p className="daily-path-name">
            <span aria-hidden="true">{r.icon} </span>
            <b>{r.name}</b> · {r.level}
          </p>
          <ol className="ladder" aria-label={`${r.name}: level ${r.at} of ${r.of}`}>
            {Array.from({ length: r.of }, (_, i) => i + 1).map((n) => (
              <li key={n} data-state={n < r.at ? "done" : n === r.at ? "now" : "later"} aria-current={n === r.at ? "step" : undefined}>
                {n}
              </li>
            ))}
          </ol>
          <p className="small">
            <b>Next:</b> {r.next}
          </p>
          <p className="small">
            <b>To move up:</b> {r.up}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Progress: this week's days and what has been done in each daily activity. */
export function DailyProgress({ learner }: { learner: Learner }) {
  const s = childSummary(learner, learner.clock());
  const lines: [string, string][] = [];
  if (s.first) lines.push(["🐱 First words", `${s.first.met} of ${s.first.total} words found, ${s.first.sure} sure`]);
  const w = wordsSummary(learner.wordLearnRecords(), learner.clock(), learner.dayFn());
  if (w.learnt + w.learning) lines.push(["🌱 Words", `${w.learnt} learnt, ${w.learning} still learning${s.words ? `; word check: ${levelLine(s.words.band)}` : ""}`]);
  else if (s.words) lines.push(["🌱 Words", `Word check: ${levelLine(s.words.band)}`]);
  if (s.reading) lines.push(["📖 Reading", `${s.reading.passed} ${s.reading.passed === 1 ? "skill" : "skills"} passed${s.reading.needsPractice.length ? `; more practice: ${s.reading.needsPractice.join("; ")}` : ""}`]);
  if (s.written) lines.push(["✏️ Written answers", `${s.written.right} of ${s.written.answered} right`]);
  if (s.long) lines.push(["📚 Long reads", `${s.long.parts} ${s.long.parts === 1 ? "part" : "parts"} read, ${s.long.finished} ${s.long.finished === 1 ? "story" : "stories"} finished`]);
  if (s.dictation) lines.push(["🎧 Listen and write", `${s.dictation.perfectFirst} of ${s.dictation.sentences} sentences right first time`]);
  if (s.listening) lines.push(["👂 Listen and answer", `${s.listening.right} of ${s.listening.asked} questions right`]);
  if (s.grammar) lines.push(["🧩 Grammar", `${s.grammar.right} of ${s.grammar.answered} sentences right${s.grammar.weak.length ? `; look again at: ${s.grammar.weak.join(", ")}` : ""}`]);
  if (s.writing) lines.push(["✍️ Syllabus tasks", `${s.writing.tasks} done${s.writing.pieces ? `, ${s.writing.words} words written` : ""}`]);
  return (
    <section className="daily-progress" aria-labelledby="daily-progress-title">
      <h2 id="daily-progress-title">Your English</h2>
      <div className="stats" aria-label="This week">
        <div className="stat">
          <b>{s.englishDays}</b>
          <small>of the last 7 days with English</small>
        </div>
        <div className="stat">
          <b>{s.daysPractisedThisWeek}</b>
          <small>with spelling</small>
        </div>
      </div>
      {lines.length ? (
        <ul className="daily-progress-list">
          {lines.map(([name, text]) => (
            <li key={name}>
              <b>{name}:</b> {text}
            </li>
          ))}
        </ul>
      ) : (
        <div className="tile">
          <b>Nothing yet</b>
          <p>What you do in each activity shows here: words learnt, skills passed, sentences right.</p>
        </div>
      )}
    </section>
  );
}
