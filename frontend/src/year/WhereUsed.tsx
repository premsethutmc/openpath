/** where-used@1: a door the learner may open, never pushed: one everyday place the skill lives, and one playful question.
 *  Nothing is recorded. */
import { useState } from "react";
import { useFor, type UseArt } from "../../../packages/learning/src/uses";

/** where-used@2: our own drawings (no photographs). Plain shapes in the page's ink, so they work in light and dark. */
function Art({ art }: { art: UseArt }) {
  const ink = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const soft = { fill: "var(--brand, #2563eb)", opacity: 0.35 };
  const label = { fill: "currentColor", fontSize: 16, fontWeight: 700, textAnchor: "middle" as const };
  const body =
    art === "tower" ? <>
      <line x1="20" y1="150" x2="300" y2="150" {...ink} />
      <g transform="rotate(4 160 150)"><rect x="140" y="30" width="40" height="120" {...ink} />{[55, 80, 105, 130].map((y) => <line key={y} x1="140" y1={y} x2="180" y2={y} {...ink} strokeWidth={1.5} />)}<rect x="146" y="14" width="28" height="16" {...ink} /></g>
      <line x1="160" y1="150" x2="160" y2="20" {...ink} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x="196" y="18" {...label}>4°</text><text x="226" y="142" {...label}>86°</text>
    </> : art === "pixels" ? <>
      {[[10, 0, 0], [20, 1, 0], [30, 0, 1], [40, 1, 1]].map(([v, c, r]) => <g key={v}><rect x={100 + c * 60} y={25 + r * 60} width="60" height="60" fill="currentColor" opacity={0.1 + v / 60} stroke="currentColor" strokeWidth={2} /><text x={130 + c * 60} y={61 + r * 60} {...label}>{v}</text></g>)}
    </> : art === "dosa" ? <>
      <circle cx="160" cy="85" r="65" {...ink} /><path d="M160 85 L160 20 A65 65 0 0 1 225 85 Z" {...soft} />
      <line x1="95" y1="85" x2="225" y2="85" {...ink} /><line x1="160" y1="20" x2="160" y2="150" {...ink} />
    </> : art === "fence" ? <>
      <rect x="60" y="35" width="200" height="110" {...ink} strokeDasharray="2 12" strokeWidth={7} /><rect x="60" y="35" width="200" height="110" {...soft} />
      <text x="160" y="26" {...label}>5 m</text><text x="286" y="96" {...label}>3 m</text>
    </> : art === "tiles" ? <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={80 + c * 40} y={25 + r * 40} width="40" height="40" {...ink} strokeWidth={2} fill={(r + c) % 2 ? "var(--brand, #2563eb)" : "none"} fillOpacity={0.3} />))}
    </> : art === "ball" ? <>
      <line x1="20" y1="150" x2="300" y2="150" {...ink} /><path d="M40 150 Q160 -70 280 150" {...ink} strokeDasharray="4 8" /><circle cx="160" cy="42" r="9" fill="currentColor" />
    </> : art === "triangle345" ? <>
      <path d="M70 140 L230 140 L230 20 Z" {...ink} /><rect x="214" y="124" width="16" height="16" {...ink} strokeWidth={2} />
      <text x="150" y="162" {...label}>4</text><text x="246" y="86" {...label}>3</text><text x="136" y="70" {...label}>5</text>
    </> : <>
      <line x1="20" y1="150" x2="300" y2="150" {...ink} /><path d="M215 150 L225 60 L235 30 L245 60 L255 150 Z" {...ink} />
      <circle cx="60" cy="144" r="6" fill="currentColor" /><line x1="60" y1="144" x2="235" y2="30" {...ink} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x="96" y="140" {...label}>45°</text><text x="140" y="170" {...label}>50 m</text>
    </>;
  return <svg className="where-used-art" viewBox="0 0 320 176" role="img" aria-label="A drawing of this">{body}</svg>;
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
