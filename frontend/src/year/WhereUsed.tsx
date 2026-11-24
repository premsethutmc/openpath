/** where-used@1: a door the learner may open, never pushed: one everyday place the skill lives, and one playful question.
 *  Nothing is recorded. */
import { useState } from "react";
import { useFor, type UseArt } from "../../../packages/learning/src/uses";
import { useArtMarks } from "../../../packages/learning/src/lesson-marks";
import { MarksSvg } from "./Scene";

function Art({ art }: { art: UseArt }) {
  return <MarksSvg className="where-used-art" viewBox="0 0 320 176" role="img" aria-label="A drawing of this" marks={useArtMarks(art)} />;
}

export function WhereUsed({ competency }: { competency?: string }) {
  const use = useFor(competency);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  if (!use) return null;
  if (!open) return <button type="button" className="link where-used-open" data-testid="where-used" onClick={() => setOpen(true)}><span aria-hidden="true">🌍 </span>Where is this used?</button>;
  return (
    <aside className="where-used" aria-label="Where this is used">
      <p className="eyebrow">Where is this used?</p>
      <h3>{use.title}</h3>
      {use.art && <Art art={use.art} />}
      {use.lines.map((t) => <p key={t}>{t}</p>)}
      <p className="where-used-q">{use.ask.q}</p>
      <div className="kid-taps" role="radiogroup" aria-label={use.ask.q}>
        {use.ask.choices.map((c, i) => <button key={c} type="button" role="radio" aria-checked={picked === i} className={`kid-tap${picked === i ? " on" : ""}`} onClick={() => setPicked(i)}>{c}</button>)}
      </div>
      {picked !== null && <p className="scene-nudge" role="status">{picked === use.ask.right ? "Yes. " : "Not quite. "}{use.ask.reply}</p>}
      <button type="button" className="link" onClick={() => { setOpen(false); setPicked(null); }}>Close</button>
    </aside>
  );
}
