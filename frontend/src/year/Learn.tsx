/**
 * The learning views of My Learning Year: one skill module (Explore → Strategy → Chapter → Practise → Verify), the
 * recovery from a problem the learner is stuck on, and a single question (a challenge or a problem fragment).
 * Every decision comes from the shared engine (moduleState, recovery); these views only show it and record answers.
 */
import { useState } from "react";
import { isCorrect, misconceptionOf, question, type Question, type Screen, type Strategy } from "../../../packages/learning/src/content";
import type { SkillEvidence } from "../../../packages/learning/src/evidence";
import { graph } from "../../../packages/learning/src/graph";
import { moduleState, recovery, type ModulePhase } from "../../../packages/learning/src/intervention";
import { Icon } from "./icons";
import type { LearnerRecords, LearningActivity } from "../../../packages/learning/src/records";

export const LETTERS = ["A", "B", "C", "D"];

export interface Ctx {
  records: LearnerRecords;
  evidence: (id: string) => SkillEvidence;
  now: number;
  session: string;
  saving: boolean;
  answer: (qid: string, response: string, activity: LearningActivity, o?: { hints?: number; context?: string }) => Promise<boolean>;
  teach: (competency: string, strategy: string, rule: string) => Promise<boolean>;
}
export const STATUS_WORD: Record<SkillEvidence["status"], string> = {
  verified: "Verified",
  transfer: "Shown on your own, also on new problems",
  independent: "Shown on your own",
  review: "Review needed",
  guided: "Learning (with help so far)",
  exposure: "Started",
  not_started: "Not started",
};
export const statusClass = (s: SkillEvidence["status"]) => (s === "verified" ? "verified" : s === "independent" || s === "transfer" ? "shown" : s === "not_started" ? "not_started" : "active");

const FLOW = ["Explore", "Strategy", "Chapter", "Practise", "Verify"] as const;
const flowIndex = (p: ModulePhase) => (p === "explore" ? 0 : p === "strategy" ? 1 : p === "chapter" ? 2 : p === "guided" || p === "check" ? 3 : 4);
const activityOf = (phase: ModulePhase, q: Question): LearningActivity =>
  phase === "explore" ? "diagnostic" : phase === "strategy" ? "probe" : phase === "guided" ? "guided" : phase === "check" ? "check" : phase === "retention" ? "retention" : q.role === "transfer" ? "transfer" : "practice";
const COUNTS: Record<LearningActivity, string> = {
  diagnostic: "On your own · a short check to find the starting point",
  probe: "On your own · what you already know",
  guided: "Practice with help · a hint is there if you want it",
  check: "On your own · no hints",
  practice: "On your own",
  transfer: "On your own · a new kind of problem",
  retention: "On your own · delayed check",
  original: "On your own",
  challenge: "On your own · enrichment",
};

interface Fb {
  qid: string;
  response: string;
  right: boolean;
}

/** An answer box for any question type. */
export function AnswerInput({ q, value, setValue, disabled }: { q: Pick<Question, "type" | "options">; value: string; setValue: (v: string) => void; disabled: boolean }) {
  if (q.type === "choice")
    return (
      <div className="options" role="radiogroup" aria-label="Choose one answer">
        {q.options!.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === LETTERS[i]} className={`option ${value === LETTERS[i] ? "picked" : ""}`} disabled={disabled} onClick={() => setValue(LETTERS[i])}>
            <span className="letter">{LETTERS[i]}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
    );
  const label = q.type === "integer" ? "Your answer (a whole number)" : q.type === "fraction" ? "Your answer (a fraction such as 3/4)" : q.type === "set" ? "Your answers, separated by a comma" : "Your answer";
  return (
    <label className="field">
      {label}
      <input aria-label="Your answer" inputMode={q.type === "integer" ? "numeric" : "text"} autoComplete="off" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} placeholder={q.type === "fraction" ? "e.g. 3/4" : q.type === "set" ? "e.g. 2, 5" : "e.g. 12"} />
    </label>
  );
}

function Feedback({ fb, onNext, label = "Continue" }: { fb: Fb; onNext: () => void; label?: string }) {
  const q = question(fb.qid);
  const says = fb.right ? null : misconceptionOf(q, fb.response)?.says;
  return (
    <div className="stack enter">
      <div className={`feedback ${fb.right ? "good" : "bad"}`} role="status">
        <strong>{fb.right ? "Right." : "Not this time."}</strong>
        {says && <p>{says}</p>}
        <p>{q.solution}</p>
      </div>
      <div className="actions sticky">
        <button className="primary" onClick={onNext}>{label}</button>
      </div>
    </div>
  );
}

/** One question: answer, see feedback. */
export function Ask({ qid, activity, ctx, onAnswered, context, hintAllowed = false, heading }: { qid: string; activity: LearningActivity; ctx: Ctx; onAnswered?: (fb: Fb) => void; context?: string; hintAllowed?: boolean; heading?: string }) {
  const q = question(qid);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  return (
    <div className="qcard enter" key={qid} data-qid={qid}>
      {heading && <p className="eyebrow">{heading}</p>}
      <span className="counted">{COUNTS[activity]}</span>
      <p className="prompt">{q.prompt}</p>
      <AnswerInput q={q} value={value} setValue={setValue} disabled={ctx.saving} />
      {hint && q.hint && <p className="hint">{q.hint}</p>}
      <div className="actions">
        {hintAllowed && q.hint && !hint && <button className="secondary" type="button" onClick={() => setHint(true)}>Show a hint</button>}
        <button
          className="primary"
          disabled={!value.trim() || ctx.saving}
          onClick={async () => {
            const ok = await ctx.answer(qid, value, activity, { hints: hint ? 1 : 0, ...(context ? { context } : {}) });
            if (ok) onAnswered?.({ qid, response: value, right: isCorrect(q, value) });
          }}
        >
          {ctx.saving ? "Saving…" : "Check"}
        </button>
      </div>
    </div>
  );
}

function Picture({ w }: { w: NonNullable<Screen["widget"]> }) {
  if (w.type === "strips") {
    const row = (n: number, shaded: number) => (
      <div className="strip" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n }, (_, i) => <span key={i} className={i < shaded ? "on" : ""} />)}
      </div>
    );
    const top = w.top ?? 2;
    const bottom = w.bottom ?? 4;
    const shaded = w.shaded ?? 1;
    return (
      <figure className="strips" aria-label={`A strip in ${top} parts with ${shaded} shaded, and the same strip in ${bottom} parts`}>
        {row(top, shaded)}
        {row(bottom, Math.round((shaded * bottom) / top))}
      </figure>
    );
  }
  const rows = w.rows ?? 3;
  const cols = w.cols ?? 4;
  return (
    <figure className="array" style={{ gridTemplateColumns: `repeat(${cols}, 14px)` }} aria-label={`${rows} rows of ${cols} dots${w.split ? `, split after ${w.split}` : ""}`}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const second = w.split ? (rows >= cols ? r >= w.split : c >= w.split) : false;
        return <i key={i} className={second ? "second" : ""} />;
      })}
    </figure>
  );
}

function Lesson({ s, onDone, saving }: { s: Strategy | { title: string; screens: Screen[] }; onDone: () => void; saving: boolean }) {
  const [i, setI] = useState(0);
  const sc = s.screens[i];
  const last = i === s.screens.length - 1;
  return (
    <div className="stack enter" key={`${s.title}-${i}`}>
      <div className="panel lesson">
        <p className="eyebrow">{s.title}{s.screens.length > 1 ? ` · ${i + 1} of ${s.screens.length}` : ""}</p>
        <h3>{sc.title}</h3>
        {sc.text.map((t, k) => <p key={k}>{t}</p>)}
        {sc.widget && <Picture w={sc.widget} />}
        {sc.math && <div className="formula">{sc.math.map((m, k) => <span key={k}>{m}</span>)}</div>}
        {sc.tip && <p className="hint">{sc.tip}</p>}
      </div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => setI(i - 1)}>Back</button>}
        <button className="primary" disabled={saving} onClick={() => (last ? onDone() : setI(i + 1))}>{last ? (saving ? "Saving…" : "Try it") : "Next"}</button>
      </div>
    </div>
  );
}

/** One skill, end to end, as the engine directs. */
export function Module({ competency, ctx, onExit, embedded = false, onFeedback }: { competency: string; ctx: Ctx; onExit: () => void; embedded?: boolean; onFeedback?: (fb: Fb) => void }) {
  const [own, setOwn] = useState<Fb | null>(null);
  const fb = onFeedback ? null : own;
  const setFb = (f: Fb | null) => (onFeedback ? f && onFeedback(f) : setOwn(f));
  const ev = ctx.evidence(competency);
  const ms = moduleState(competency, ctx.records, ev, ctx.now, ctx.session);
  const name = graph.get(competency).name;
  const step = flowIndex(ms.phase);
  const stepper = (
    <ol className="flow" aria-label="Steps of this skill">
      {FLOW.map((f, k) => (
        <li key={f} className={k === step ? "here" : k < step ? "past" : ""} aria-current={k === step ? "step" : undefined}>{f}</li>
      ))}
    </ol>
  );
  const head = (
    <>
      {!embedded && <p className="eyebrow">Skill</p>}
      {embedded ? <h2>{name}</h2> : <h1>{name}</h1>}
      <div className="year-meta"><span className={`chip status-${statusClass(ev.status)}`}>{STATUS_WORD[ev.status]}</span></div>
      {stepper}
    </>
  );
  if (fb) return <div className="stack">{head}<Feedback fb={fb} onNext={() => setFb(null)} /></div>;
  if (ms.phase === "unavailable") return <div className="stack">{head}<p className="why">{ms.reason}</p><button className="secondary wide" onClick={onExit}>Back</button></div>;
  if (ms.phase === "chapter" && ms.strategy)
    return (
      <div className="stack">
        {head}
        <p className="why">{ms.reason}</p>
        <Lesson s={ms.strategy} saving={ctx.saving} onDone={() => ctx.teach(competency, ms.strategy!.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis")} />
      </div>
    );
  if (ms.question)
    return (
      <div className="stack">
        {head}
        <p className="why">{ms.reason}</p>
        <Ask key={ms.question} qid={ms.question} activity={activityOf(ms.phase, question(ms.question))} ctx={ctx} hintAllowed={ms.phase === "guided"} onAnswered={setFb} />
      </div>
    );
  // done or pause
  return (
    <div className="stack">
      {head}
      <div className={`feedback ${ms.phase === "pause" ? "bad" : "good"}`} role="status">
        <strong>{ms.phase === "pause" ? "Let's pause this one" : STATUS_WORD[ev.status]}</strong>
        <p>{ms.reason}</p>
        <p className="small">On your own: {ev.independent.right} right of {ev.independent.total}. With help: {ev.assisted.right} right of {ev.assisted.total}.</p>
      </div>
      {!embedded && <button className="secondary wide" onClick={onExit}>Back to the year</button>}
    </div>
  );
}

/** A problem the learner is stuck on: try it, find the supporting skill that is missing, learn it, come back. */
export function Recovery({ original, ctx, onExit }: { original: string; ctx: Ctx; onExit: () => void }) {
  const [fb, setFb] = useState<Fb | null>(null);
  const r = recovery(original, ctx.records, ctx.evidence, ctx.now, ctx.session);
  const q = question(original);
  const trace = (
    <div className="trace" aria-label="What this problem uses">
      {r.supports.map((s) => {
        const e = ctx.evidence(s.id);
        return (
          <div key={s.id} className={`trace-row ${statusClass(e.status)} ${r.active === s.id ? "now" : ""}`}>
            <Icon glyph={e.status === "verified" ? "✓" : e.status === "independent" || e.status === "transfer" ? "★" : e.status === "not_started" ? "○" : e.status === "review" ? "↻" : "◐"} />
            <span className="trace-text"><b>{graph.get(s.id).name}</b><span>{s.assessable ? STATUS_WORD[e.status] : "No questions yet"} · {s.depth === 1 ? "used directly" : `used by ${graph.get(s.via ?? "").name.toLowerCase()}`}</span></span>
          </div>
        );
      })}
    </div>
  );
  if (fb) return <div className="stack"><p className="eyebrow">{fb.qid === original ? "The problem" : graph.get(question(fb.qid).competency).name}</p><Feedback fb={fb} onNext={() => setFb(null)} /></div>;
  if (r.phase === "attempt" || r.phase === "return")
    return (
      <div className="stack">
        <p className="eyebrow">{r.phase === "return" ? "Back to the original problem" : "A problem you are stuck on"}</p>
        <h1>{graph.get(q.competency).name}</h1>
        {r.phase === "return" && <p className="why">The skill it needed is in place now. Try the original problem again. A second attempt counts as work with help, not on your own.</p>}
        <Ask qid={original} activity="original" ctx={ctx} context={`recovery:${original}`} onAnswered={setFb} />
      </div>
    );
  if (r.phase === "support" && r.active)
    return (
      <div className="stack">
        <p className="eyebrow">Finding what this problem needs</p>
        <h1>{graph.get(q.competency).name}</h1>
        <p className="why">{r.reason}</p>
        {trace}
        <div className="panel"><Module key={r.active} competency={r.active} ctx={ctx} onExit={onExit} embedded onFeedback={setFb} /></div>
      </div>
    );
  return (
    <div className="stack">
      <h1>{graph.get(q.competency).name}</h1>
      <div className={`feedback ${r.phase === "escalate" ? "bad" : "good"}`} role="status">
        <strong>{r.phase === "solved" ? "Solved on your own" : r.phase === "solved_after_help" ? "Solved after help" : "Ask for help with this one"}</strong>
        <p>{r.reason}</p>
      </div>
      {trace}
      <button className="secondary wide" onClick={onExit}>Back to the year</button>
    </div>
  );
}

/** One question on its own (an enrichment challenge, or a fragment of an advanced problem). */
export function Single({ qid, ctx, onExit, heading, note }: { qid: string; ctx: Ctx; onExit: () => void; heading: string; note?: string }) {
  const [fb, setFb] = useState<Fb | null>(null);
  const done = ctx.records.attempts.find((a) => a.questionId === qid);
  return (
    <div className="stack">
      <p className="eyebrow">{heading}</p>
      {note && <p className="why">{note}</p>}
      {fb ? <Feedback fb={fb} onNext={onExit} label="Back to the year" /> : done ? (
        <>
          <div className={`feedback ${isCorrect(question(qid), done.response) ? "good" : "bad"}`}><strong>Answered: {done.response}</strong><p>{question(qid).solution}</p></div>
          <button className="secondary wide" onClick={onExit}>Back to the year</button>
        </>
      ) : <Ask qid={qid} activity="challenge" ctx={ctx} onAnswered={setFb} />}
    </div>
  );
}
