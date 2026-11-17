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
      </label>
      <button type="button" className="secondary" disabled={!v.trim() || state === "right"} onClick={check}>Check this step</button>
      {state === "right" ? <span className="ws-mark ok" role="status">Yes.</span> : state === "wrong" ? <span className="ws-mark bad" role="status">Not yet. Have another go, or ask to see it.</span> : null}
    </div>
  );
}

export function StepCoach({ qid, onUsed, opener = "I'm stuck" }: { qid: string; onUsed?: () => void; opener?: string }) {
  const steps = useMemo(() => stepsHelp(qid), [qid]);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [told, setTold] = useState(false);
  const [card, setCard] = useState(false);
  if (!steps) return null;
  if (!open) return <button type="button" className="secondary coach-open" onClick={() => { setOpen(true); setTold(true); onUsed?.(); }}>{opener}</button>;
  const now = at < steps.length ? steps[at] : null;
  const needs = now?.needs ? cardFor(now.needs) : null;
  const entry = now ? askOf(now.shown) : null;
  return (
    <div className="coach" data-coach-step={at} data-coach-told={told ? "yes" : "no"}>
      {at > 0 && <ol className="recipe-steps">{steps.slice(0, at).map((s, i) => <li key={i}>{s.shown}</li>)}</ol>}
      {now && !told && <button type="button" className="secondary" onClick={() => setTold(true)}>What do I do next?</button>}
      {now && told && (
        <>
          <p className="coach-next" role="status">{now.next}</p>
          {needs && <button type="button" className="coach-chip" aria-expanded={card} onClick={() => setCard(!card)}>This needs: {needs.name}</button>}
          {needs && card && (
            <aside className="coach-card" aria-label={needs.name}>
              {needs.rule.map((t, i) => <p key={i}>{t}</p>)}
              {needs.example && <><p className="small muted">For example: {needs.example.prompt}</p><ol className="recipe-steps">{needs.example.steps.map((t, i) => <li key={i}>{t}</li>)}</ol></>}
            </aside>
          )}
          {/* step-ask@1: a step with a result is done by the child: they enter it, and a right entry moves on */}
          {entry && <StepEntry key={`${qid}:${at}`} ask={entry} onRight={() => { setAt(at + 1); setTold(false); setCard(false); }} />}
          {/* a calculation the child can be helped to do, before it is shown: the same smaller question a slip would get */}
          {(() => { const ask = smallerOf(now.shown); return ask ? <SmallAsk key={now.shown} ask={ask} after="Now finish this step yourself, or ask to see it." /> : null; })()}
          <button type="button" className="secondary" onClick={() => { setAt(at + 1); setTold(false); setCard(false); }}>{at === steps.length - 1 ? "Show me the last step" : "Show me this step"}</button>
        </>
      )}
      {!now && <p className="small muted">That is every step. Now try it yourself.</p>}
    </div>
  );
}
