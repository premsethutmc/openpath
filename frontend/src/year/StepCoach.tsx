/**
 * step-help@1: "I'm stuck" on a question in practice, and the working after a wrong answer. The help comes one rung at a
 * time and only when asked for: what to do next (no numbers worked), then, where the step leans on another skill, a chip
 * that opens that skill's own rule and an example ("This needs: Use multiplication facts"), a smaller question where
 * the step is a plain calculation, then the step itself.
 * Everything is made on the device from the question's own verified steps (`packages/learning/src/step-help.ts`).
 * Practice and feedback only: never in a test.
 */
import { useMemo, useState } from "react";
import { cardFor, stepsHelp } from "../../../packages/learning/src/step-help";
import { smallerOf } from "../../../packages/learning/src/working";
import { SmallAsk } from "./SmallAsk";
import { askOf, judge, type StepAsk } from "../../../packages/learning/src/step-ask";
import { clipFor } from "../../../packages/learning/src/clips";
import { gradeOfQuestion, problemOf } from "../../../packages/learning/src/families";
import { allSkills } from "./try-skills";
import { Chintu } from "./Chintu";

export const LAST_CHINTU_CLASS = 5;
/** The class a question belongs to: its own (where a type marks some of its questions as later work), else the first
 *  class in which any board's book teaches its skill. Null when neither is known. */
let FIRST_CLASS: Map<string, number> | null = null;
/** The first class in which any board's book teaches a skill, or null. */
export function classOfSkill(competency: string | undefined): number | null {
  if (!competency) return null;
  if (!FIRST_CLASS) { FIRST_CLASS = new Map(); for (const k of allSkills()) if ((FIRST_CLASS.get(k.competency) ?? 99) > k.release.grade) FIRST_CLASS.set(k.competency, k.release.grade); }
  return FIRST_CLASS.get(competency) ?? null;
}
export function classOfQuestion(qid: string): number | null {
  const base = qid.replace(/:(mc|w)$/, ""), own = gradeOfQuestion(base);
  if (own !== null) return own;
  const p = problemOf(base);
  if (!p) return null;
  return classOfSkill(p.competency);
}

function ClipButton({ competency }: { competency: string | null }) {
  const clip = clipFor(competency);
  const [open, setOpen] = useState(false);
  if (!clip) return null;
  if (!open) return <button type="button" className="secondary coach-clip" data-testid="coach-clip" onClick={() => setOpen(true)}><span aria-hidden="true">▶ </span>Watch: {clip.title} ({clip.seconds < 60 ? `${clip.seconds} s` : `${Math.round(clip.seconds / 60)} min`})</button>;
  return <video className="coach-video" src={clip.url} controls autoPlay playsInline preload="metadata" aria-label={clip.title} />;
}

/** step-ask@1: the step with its result left out, for the child to enter. Right moves on by itself; wrong says so and
 *  leaves the smaller question and "Show me this step" to help. Nothing is recorded: it is part of the help. */
function StepEntry({ ask, onRight }: { ask: StepAsk; onRight: () => void }) {
  const [v, setV] = useState("");
  const [state, setState] = useState<"" | "right" | "wrong">("");
  const check = () => {
    if (!v.trim() || state === "right") return;
    if (judge(ask, v)) { setState("right"); setTimeout(onRight, 700); } else setState("wrong");
  };
  return (
    <div className="step-entry" data-step-entry={state || "asked"}>
      <label>
        <span>{ask.lead}</span>
        <input aria-label="Your answer for this step" inputMode={/^[\d.]+$/.test(ask.value) ? "decimal" : "text"} autoComplete="off" value={v} disabled={state === "right"}
          onChange={(e) => { setV(e.target.value); setState(""); }} onBlur={check} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); check(); } }} />
        {ask.unit && <span className="step-unit">{ask.unit}</span>}
      </label>
      <button type="button" className="secondary" disabled={!v.trim() || state === "right"} onClick={check}>Check this step</button>
      {state === "right" ? <span className="ws-mark ok" role="status">Yes.</span> : state === "wrong" ? <span className="ws-mark bad" role="status">Not yet. Have another go, or ask to see it.</span> : null}
    </div>
  );
}

/** `startOpen`: in a lesson's worked example the steps are there to be done from the start (no button to ask for them);
 *  `onDone` is called when the last step has been done or shown. */
/** one-help@1: in practice the coach lives inside the child's own working ("Work it out step by step"), not beside it:
 *  `shown` opens it from outside (the "I'm stuck" button and the "Help" button in the working are the same thing). */
export function StepCoach({ qid, onUsed, opener = "I'm stuck", startOpen = false, onDone, shown }: { qid: string; onUsed?: () => void; opener?: string; startOpen?: boolean; onDone?: () => void; shown?: boolean }) {
  const steps = useMemo(() => stepsHelp(qid), [qid]);
  // chintu@1: on a question of Classes 1 to 5, Chintu the cat says what to do next
  const buddy = useMemo(() => { const g = classOfQuestion(qid); return g !== null && g <= LAST_CHINTU_CLASS; }, [qid]);
  const [open, setOpen] = useState(startOpen);
  const [at, setAt] = useState(0);
  const [card, setCard] = useState(false);
  if (!steps) return null;
  if (shown === false) return null;
  if (!open && !shown) return <button type="button" className="secondary coach-open" onClick={() => { setOpen(true); onUsed?.(); }}>{opener}</button>;
  const now = at < steps.length ? steps[at] : null;
  // why@1: the rule behind a step can always be opened: the other skill it leans on, or the question's own skill
  const ruleOf = now?.needs ?? now?.rule ?? null;
  const rule = ruleOf ? cardFor(ruleOf) : null;
  const entry = now ? askOf(now.shown) : null;
  // stay-open@1: a step that has been done stays on the page with what was done and why; the next step's "what to do"
  // is there straight away, and an opened rule stays open while the next step uses the same rule
  const advance = () => { const next = steps[at + 1]; if ((next?.needs ?? next?.rule ?? null) !== ruleOf) setCard(false); setAt(at + 1); if (at + 1 >= steps.length) onDone?.(); };
  return (
    <div className="coach" data-coach-step={at}>
      {at > 0 && <ol className="recipe-steps coach-done">{steps.slice(0, at).map((s, i) => <li key={i}><span className="coach-did">{s.next}</span> <span className="coach-shown">{s.shown}</span></li>)}</ol>}
      {now && (
        <>
          {buddy ? <Chintu key={at} say={now.next} /> : <p className="coach-next" role="status">{now.next}</p>}
          {rule && <button type="button" className="coach-chip" aria-expanded={card} onClick={() => setCard(!card)}>{now.needs ? `This needs: ${rule.name}` : card ? "Hide the rule" : "Why? Show me the rule"}</button>}
          {rule && card && (
            <aside className="coach-card" aria-label={rule.name}>
              {rule.rule.map((t, i) => <p key={i}>{t}</p>)}
              {rule.example && <><p className="small muted">For example: {rule.example.prompt}</p><ol className="recipe-steps">{rule.example.steps.map((t, i) => <li key={i}>{t}</li>)}</ol></>}
              {/* clips@1: second-level help, after the written rule; nothing is fetched until it is asked for */}
              <ClipButton key={ruleOf} competency={ruleOf} />
            </aside>
          )}
          {/* step-ask@1: a step with a result is done by the child: they enter it, and a right entry moves on */}
          {entry && <StepEntry key={`${qid}:${at}`} ask={entry} onRight={advance} />}
          {/* a calculation the child can be helped to do, before it is shown: the same smaller question a slip would get */}
          {(() => { const ask = smallerOf(now.shown); return ask ? <SmallAsk key={now.shown} ask={ask} after="Now finish this step yourself, or ask to see it." /> : null; })()}
          <button type="button" className="secondary coach-help" onClick={advance}><span aria-hidden="true">✋ </span>{at === steps.length - 1 ? "Help: show me the last step" : "Help: show me this step"}</button>
        </>
      )}
      {!now && <p className="small muted">{startOpen ? "That is every step." : "That is every step. Now try it yourself."}</p>}
    </div>
  );
}
