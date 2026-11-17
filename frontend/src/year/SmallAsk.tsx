import { useState } from "react";
import type { Simpler } from "../../../packages/learning/src/working";

/** teach-there@1: the smaller question for a slipped step, asked under the step itself. A right answer says so and leaves
 *  the child to mend the step; two wrong ones show it worked. Made on the device from the step's own numbers. */
export function SmallAsk({ ask, after = "Now put that right in your step." }: { ask: Simpler; after?: string }) {
  const [v, setV] = useState("");
  const [tries, setTries] = useState(0);
  const n = v.trim() === "" ? null : Number(v.trim());
  const right = n !== null && n === ask.answer;
  const shown = ask.ask.includes("× ?") ? ask.ask.replace("?", String(ask.answer)) : ask.ask.replace("= ?", `= ${ask.answer}`);
  return (
    <div className="ws-help" data-step-help={right ? "right" : tries >= 2 ? "shown" : "asked"}>
      <span className="ws-q" aria-hidden="true">?</span>
      <span>{ask.lead}</span>
      <label className="ws-ask">
        <span>{ask.ask}</span>
        <input aria-label="A smaller question" inputMode="numeric" autoComplete="off" value={v} disabled={right} onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} onBlur={() => { if (n !== null && !right) setTries(tries + 1); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (n !== null && !right) setTries(tries + 1); } }} />
      </label>
      {right ? <span className="ws-mark ok" role="status">Yes. {after}</span> : tries >= 2 ? <span className="ws-mark" role="status">{shown}. {after}</span> : tries === 1 ? <span className="ws-mark bad" role="status">Not yet. Have another go.</span> : null}
    </div>
  );
}
