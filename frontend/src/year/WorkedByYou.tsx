/**
 * lesson-interactions@1: a lesson's worked example as something the learner does. The working is done one step at a
 * time (each step with a result is entered; "Show me this step" is always there), and then, where the question holds
 * the wrong answers learners give, a "what went wrong?" about one of them. Lesson only: nothing is recorded.
 */
import { useMemo, useState } from "react";
import { mistake } from "../../../packages/learning/src/lesson-interactions";
import { StepCoach } from "./StepCoach";

export function WorkedByYou({ qid }: { qid: string }) {
  const slip = useMemo(() => mistake(qid), [qid]);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = picked === null || !slip ? null : slip.choices[picked];
  return (
    <div className="worked-by-you" data-worked={done ? "done" : "working"}>
      <p className="eyebrow">Work it with me</p>
      <StepCoach qid={qid} startOpen onDone={() => setDone(true)} />
      {slip && done && (
        <div className="slip" data-testid="spot-the-mistake">
          <p className="eyebrow">Spot the mistake</p>
          <p>{slip.ask}</p>
          <div className="recipe-choices slip-choices" role="group" aria-label={slip.ask}>
            {slip.choices.map((c, i) => <button key={c.label} type="button" className={`secondary${picked === i ? " picked" : ""}`} aria-pressed={picked === i} onClick={() => setPicked(i)}>{c.label}</button>)}
          </div>
          {chosen && <p className={`recipe-reply${chosen.right ? " right" : ""}`} role="status">{chosen.reply}</p>}
        </div>
      )}
    </div>
  );
}
