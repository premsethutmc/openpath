/**
 * Notes, charts and maps (logic/study): make notes and a summary from a passage, read a bar chart and order an
 * analytical paragraph about it, and read a road map and its directions. Practice-only.
 */
import { useRef, useState } from "react";
import { Flag } from "./Flag.tsx";
import type { Learner } from "../logic/learner.ts";
import { KIND_TITLES, STUDY_SKILL_NAMES, StudySitting, chartFor, mapFor, nextStudy, notesFor, studySummary, type ChartTask, type MapTask, type OwnResult, type StudyRecord, type StudyTask } from "../logic/study/study.ts";

/** A line graph: one point per label, joined, each with its figure. */
function LineChart({ c }: { c: ChartTask }) {
  const max = Math.max(...c.values);
  const min = Math.min(...c.values);
  const lo = Math.max(0, min - (max - min) * 0.3);
  const x = (i: number) => 40 + (i * 280) / (c.labels.length - 1);
  const y = (v: number) => 170 - ((v - lo) / (max - lo || 1)) * 140;
  return (
    <figure className="study-chart" data-chart={c.id} data-type="line">
      <figcaption>
        {c.title} ({c.unit})
      </figcaption>
      <svg viewBox="0 0 350 215" role="img" aria-label={`${c.title}: ${c.labels.map((l, i) => `${l} ${c.values[i]}`).join(", ")}`}>
        <line x1="30" y1="175" x2="335" y2="175" stroke="#b9c2cf" />
        <polyline points={c.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--accent, #2f6fd6)" strokeWidth="3" />
        {c.values.map((v, i) => (
          <g key={c.labels[i]}>
            <circle cx={x(i)} cy={y(v)} r="4" fill="var(--accent, #2f6fd6)" />
            <text x={x(i)} y={y(v) - 9} fontSize="12" textAnchor="middle" fill="currentColor">
              {v}
            </text>
            <text x={x(i)} y="195" fontSize="11" textAnchor="middle" fill="currentColor">
              {c.labels[i].length > 5 && !/^\d+$/.test(c.labels[i]) ? c.labels[i].slice(0, 3) : c.labels[i]}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** A horizontal bar chart: labels on the left, each bar with its figure, so it fits a phone. */
export function BarChart({ c }: { c: ChartTask }) {
  if (c.type === "line") return <LineChart c={c} />;
  const max = Math.max(...c.values);
  const row = 34;
  const h = c.labels.length * row + 30;
  return (
    <figure className="study-chart" data-chart={c.id}>
      <figcaption>
        {c.title} ({c.unit})
      </figcaption>
      <svg viewBox={`0 0 340 ${h}`} role="img" aria-label={`${c.title}: ${c.labels.map((l, i) => `${l} ${c.values[i]}`).join(", ")}`}>
        {c.labels.map((l, i) => {
          const w = Math.round((c.values[i] / max) * 190);
          const y = 10 + i * row;
          return (
            <g key={l}>
              <text x="92" y={y + 18} textAnchor="end" fontSize="13" fill="currentColor">
                {l}
              </text>
              <rect x="100" y={y + 4} width={w} height="20" rx="3" fill="var(--accent, #2f6fd6)" />
              <text x={106 + w} y={y + 18} fontSize="13" fill="currentColor">
                {c.values[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** A street map: roads north to south, streets west to east, each place on its corner. North is up. */
export function StreetMap({ m }: { m: MapTask }) {
  const gx = (x: number) => 60 + x * 80;
  const gy = (y: number) => 40 + y * 70;
  const w = gx(m.cols.length - 1) + 60;
  const h = gy(m.rows.length - 1) + 50;
  return (
    <figure className="study-map" data-map={m.id}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Map: ${m.places.map((p) => `${p.name} at ${m.cols[p.x]} and ${m.rows[p.y]}`).join("; ")}`}>
        <text x={w - 20} y="16" fontSize="12" fill="currentColor" textAnchor="middle">
          N ↑
        </text>
        {m.rows.map((r, y) => (
          <g key={r}>
            <line x1={gx(0) - 20} y1={gy(y)} x2={gx(m.cols.length - 1) + 20} y2={gy(y)} stroke="#b9c2cf" strokeWidth="8" strokeLinecap="round" />
            <text x={gx(0) - 22} y={gy(y) - 8} fontSize="9" fill="currentColor">
              {r}
            </text>
          </g>
        ))}
        {m.cols.map((c, x) => (
          <g key={c}>
            <line x1={gx(x)} y1={gy(0) - 20} x2={gx(x)} y2={gy(m.rows.length - 1) + 20} stroke="#b9c2cf" strokeWidth="8" strokeLinecap="round" />
            <text x={gx(x) + 6} y={gy(m.rows.length - 1) + 34} fontSize="9" fill="currentColor" transform={`rotate(-20 ${gx(x) + 6} ${gy(m.rows.length - 1) + 34})`}>
              {c}
            </text>
          </g>
        ))}
        {m.places.map((p) => (
          <g key={p.name} data-place={p.name}>
            <circle cx={gx(p.x)} cy={gy(p.y)} r="7" fill="#e07a1f" />
            <text x={gx(p.x) + 9} y={gy(p.y) + 16} fontSize="11" fontWeight="600" fill="currentColor">
              {p.name}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function Material({ task }: { task: StudyTask }) {
  if (task.kind === "chart") return <BarChart c={chartFor(task.id)} />;
  if (task.kind === "map") return <StreetMap m={mapFor(task.id)} />;
  return (
    <article className="kind-text" data-passage={task.id}>
      {notesFor(task.id).text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </article>
  );
}

export function StudySkills({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<StudySitting | null>(null);
  const [, setTick] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [own, setOwn] = useState("");
  const [ownCheck, setOwnCheck] = useState<OwnResult | null>(null);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<StudyRecord[]>([]);
  const tick = () => setTick((t) => t + 1);
  const records = learner.studyRecords();
  const save = async (s: StudySitting) => {
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordStudy([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
    tick();
  };
  const start = (t: StudyTask) => (setSitting(new StudySitting(t)), setPicked([]), setOwn(""), setOwnCheck(null), scrollTo(0, 0));

  if (!sitting) {
    const sum = studySummary(records);
    const kinds = (["notes", "chart", "map"] as const).map((k) => ({ k, next: nextStudy(records, k) }));
    return (
      <main className="page vocab study" data-phase="intro" aria-labelledby="study-title">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <p className="eyebrow">Reading and writing · Study skills</p>
        <h1 id="study-title" className="hero">
          Notes, charts and maps
        </h1>
        <p className="sub">Make notes and a summary from a passage, read a bar chart and build a paragraph about it, and find your way on a road map.</p>
        {sum.tasks > 0 && (
          <p className="small" data-summary>
            {sum.tasks} {sum.tasks === 1 ? "task" : "tasks"} done · {sum.right} of {sum.asked} right
            {sum.weak.length > 0 && <> · to work on: {sum.weak.slice(0, 2).map((k) => STUDY_SKILL_NAMES[k]).join(", ")}</>}
          </p>
        )}
        {kinds.map(({ k, next }) => (
          <div key={k} className="tile lilac" data-kind={k}>
            <p className="small">{KIND_TITLES[k]}</p>
            {next ? (
              <>
                <h2>{next.title}</h2>
                <button type="button" className="primary" onClick={() => start(next)}>
                  Start: {KIND_TITLES[k]}
                </button>
              </>
            ) : (
              <p>All done. New ones will come.</p>
            )}
          </div>
        ))}
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
        {KIND_TITLES[sitting.task.kind]} · {sitting.task.title}
      </p>
    </>
  );
  if (v.phase === "read")
    return (
      <main className="page vocab study" data-phase="read">
        {head}
        <Material task={sitting.task} />
        <button type="button" className="primary" onClick={() => (sitting.read(), tick(), scrollTo(0, 0))}>
          {sitting.task.kind === "notes" ? "I have read it: make notes" : "I have looked: questions"}
        </button>
      </main>
    );
  if (v.phase === "own")
    return (
      <main className="page vocab study" data-phase="own">
        {head}
        <h2>{sitting.task.kind === "notes" ? "Now write your own summary" : sitting.task.kind === "chart" ? "Now write your own paragraph" : "Now write your own directions"}</h2>
        <p className="prompt">{sitting.ownTask()}</p>
        {sitting.task.kind !== "notes" && (
          <details className="kind-back" open>
            <summary>{sitting.task.kind === "chart" ? "The chart" : "The map"}</summary>
            <Material task={sitting.task} />
          </details>
        )}
        <p className="small">The app checks it by rule and tells you what to fix; it does not keep what you write.</p>
        <textarea aria-label="What you write" rows={sitting.task.kind === "notes" ? 5 : 7} value={own} onChange={(e) => (setOwn(e.target.value), setOwnCheck(null))} />
        <p className="small" data-words>
          {own.trim() ? own.trim().split(/\s+/).length : 0} words
        </p>
        {ownCheck && (
          <ul className="writing-notes" data-own-check data-passed={ownCheck.passed} data-of={ownCheck.checks.length}>
            {ownCheck.checks.map((c) => (
              <li key={c.id} data-check={c.id} data-ok={c.ok}>
                {c.ok ? "✓ " : "✗ "}
                {c.note}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="secondary" disabled={!own.trim()} onClick={() => setOwnCheck(sitting.writeOwn(own))}>
          Check what I wrote
        </button>
        <button type="button" className="primary" onClick={() => (sitting.finish(), void save(sitting))}>
          {ownCheck ? "Finish" : "Skip and finish"}
        </button>
      </main>
    );
  if (v.phase === "done")
    return (
      <main className="page vocab study" data-phase="done">
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

  const s = v.step!;
  return (
    <main className="page vocab study" data-phase={v.phase} data-step={v.index} data-skill={s.skill}>
      {head}
      <details className="kind-back" open={sitting.task.kind !== "notes"}>
        <summary>{sitting.task.kind === "notes" ? "Look back at the passage" : sitting.task.kind === "chart" ? "The chart" : "The map"}</summary>
        <Material task={sitting.task} />
      </details>
      <p className="small">
        Step {v.index + 1} of {v.total} · {STUDY_SKILL_NAMES[s.skill]}
      </p>
      <p className="prompt" id="study-question">
        {s.prompt}
      </p>
      {s.kind === "choose" && (
        <p className="choose-options" role="group" aria-labelledby="study-question">
          {s.options.map((o, i) => (
            <button key={o} type="button" className="choice" disabled={v.phase === "answered"} data-state={v.answered ? (i === s.answer ? "right" : "") : ""} onClick={() => (sitting.choose(i), tick())}>
              {o}
            </button>
          ))}
        </p>
      )}
      {s.kind === "pick" && (
        <>
          <p className="choose-options" role="group" aria-labelledby="study-question">
            {s.options.map((o, i) => (
              <button key={o} type="button" className="choice" aria-pressed={picked.includes(i)} disabled={v.phase === "answered"} data-state={v.answered ? (s.answer.includes(i) ? "right" : "") : picked.includes(i) ? "on" : ""} onClick={() => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i])}>
                {picked.includes(i) ? "✓ " : ""}
                {o}
              </button>
            ))}
          </p>
          {v.phase === "step" && (
            <button type="button" className="primary" disabled={!picked.length} onClick={() => (sitting.pick(picked), tick())}>
              Check my notes
            </button>
          )}
        </>
      )}
      {s.kind === "order" && (
        <>
          <ol className="study-order" data-order>
            {picked.map((i) => (
              <li key={i}>{s.parts[i]}</li>
            ))}
          </ol>
          {v.phase === "step" && (
            <>
              <p className="choose-options" role="group" aria-label="Sentences to place">
                {s.parts.map((p, i) =>
                  picked.includes(i) ? null : (
                    <button key={p} type="button" className="choice" onClick={() => setPicked([...picked, i])}>
                      {p}
                    </button>
                  ),
                )}
              </p>
              <button type="button" className="link" disabled={!picked.length} onClick={() => setPicked(picked.slice(0, -1))}>
                Undo
              </button>
              <button type="button" className="primary" disabled={picked.length !== s.parts.length} onClick={() => (sitting.order(picked), tick())}>
                Check the order
              </button>
            </>
          )}
        </>
      )}
      {v.answered && (
        <div className="dict-feedback" role="status" data-correct={v.answered.correct}>
          <p className={v.answered.correct ? "words-verdict right" : "words-verdict"}>{v.answered.correct ? "✓ Right" : "Not quite"}</p>
          {!v.answered.correct && <p className="small">Answer: {v.answered.answer}</p>}
          <p className="small">{v.answered.explain}</p>
          <Flag stream="study" id={`${sitting.task.id}|${v.index}`} />
          <button
            type="button"
            className="primary"
            autoFocus
            onClick={() => {
              sitting.next();
              setPicked([]);
              if (sitting.snapshot().phase === "done") void save(sitting);
              tick();
              scrollTo(0, 0);
            }}
          >
            {v.index + 1 < v.total ? "Next" : "Now write your own"}
          </button>
        </div>
      )}
    </main>
  );
}
