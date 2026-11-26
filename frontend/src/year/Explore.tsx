/**
 * explore@1: "What if the numbers change?" under a worked example in a lesson. The learner moves one of the example's own
 * numbers and the question, its picture and its working are made again for the new number by the question family itself
 * (`packages/learning/src/explore.ts`). One number at a time: moving one puts the other back as it was in the example.
 * Lessons only: never in a test, never recorded, never one of the questions a learner is later asked on their own.
 */
import { useMemo, useState } from "react";
import { explored, explorerFor } from "../../../packages/learning/src/explore";
import { Figure } from "./Figure";

import { mx } from "./MatrixText";
export function Explore({ qid }: { qid: string }) {
  const e = useMemo(() => explorerFor(qid), [qid]);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ dial: number; value: number } | null>(null);
  if (!e) return null;
  if (!open) return <button type="button" className="secondary explore-open" onClick={() => setOpen(true)}>What if the numbers change?</button>;
  const now = at ?? { dial: 0, value: e.params[e.dials[0].index] };
  const x = explored(e, now.dial, now.value);
  if (!x) return null;
  return (
    <div className="explore" data-explore={x.changed ? "changed" : "example"}>
      <p className="eyebrow">Change a number and watch</p>
      {e.dials.map((d, i) => {
        const own = e.params[d.index], here = now.dial === i ? now.value : own;
        return (
          <label key={d.index} className="explore-dial">
            <span>{d.shown ? `Change the ${d.shown}` : "Change the question"}</span>
            <input type="range" min={0} max={d.values.length - 1} step={1} value={d.values.indexOf(here)} onChange={(ev) => setAt({ dial: i, value: d.values[Number(ev.target.value)] })} />
          </label>
        );
      })}
      <p className="prompt">{mx(x.prompt)}</p>
      {x.figure && <Figure v={x.figure} />}
      <ol className="recipe-steps">{x.steps.map((t, k) => <li key={k}>{mx(t)}</li>)}</ol>
      <p className="recipe-reply right" role="status">Answer: {x.answer}</p>
      {x.changed && <button type="button" className="secondary" onClick={() => setAt(null)}>Back to the example</button>}
    </div>
  );
}
