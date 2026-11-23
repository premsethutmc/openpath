/** picture-tasks@1: the start-here pictures a child taps to answer (and, for the right triangle, drags to explore). */
import { useMemo, useState } from "react";
import type { Picture } from "../../../packages/learning/src/foundations";
import { describe, pictureTasks, rightTap, type PictureTask, type Scene } from "../../../packages/learning/src/foundation-pictures";

const INK = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const T = { fill: "currentColor", fontSize: 13, fontFamily: "inherit" };
type Mark = (id: string) => "" | "right" | "wrong" | "on";

/** One tappable part: its drawing plus a generous invisible target, so a finger can hit a thin line. */
function Part({ id, mark, tap, children, target }: { id: string; mark: Mark; tap: (id: string) => void; children: React.ReactNode; target?: React.ReactNode | "wide" }) {
  return <g className={`pt-part ${mark(id)}`} data-part={id} role="button" tabIndex={0} aria-label={id} onClick={() => tap(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(id); } }}>{children}<g className={target === "wide" ? "pt-target wide" : "pt-target"}>{target === "wide" || !target ? children : target}</g></g>;
}
const line = (d: string) => <path d={d} {...INK} />;

export function ScenePicture({ scene, mark, tap }: { scene: Scene; mark: Mark; tap: (id: string) => void }) {
  const P = (id: string, body: React.ReactNode, target?: React.ReactNode | "wide") => <Part key={id} id={id} mark={mark} tap={tap} target={target}>{body}</Part>;
  const body = (() => {
    switch (scene.kind) {
      case "right-triangle": {
        const left = scene.thetaAt === "left";
        return <>
          {P("bottom", line("M40 150H220"), "wide")}{P("right", line("M220 150V40"), "wide")}{P("slant", line("M40 150L220 40"), "wide")}
          <path d="M205 150v-15h15" {...INK} strokeWidth={1.5} />
          {left ? <><path d="M72 150a32 32 0 0 0-5-17" {...INK} stroke="var(--sh-accent,#e8862a)" /><text x="80" y="143" {...T}>θ</text></> : <><path d="M220 72a32 32 0 0 1-27-15" {...INK} stroke="var(--sh-accent,#e8862a)" /><text x="200" y="84" {...T}>θ</text></>}
        </>;
      }
      case "circle-parts": return <>
        <circle cx="140" cy="100" r="78" {...INK} />
        {P("arc", <path d="M85 155A78 78 0 0 0 195 155" {...INK} stroke="var(--sh-accent,#e8862a)" strokeWidth={5} />, "wide")}
        {P("diameter", line("M62 100H218"), "wide")}{P("chord", line("M84 46L190 40"), "wide")}{P("radius", line("M140 100L185 164"), "wide")}
        {P("centre", <circle cx="140" cy="100" r="5" fill="currentColor" />, <circle cx="140" cy="100" r="16" />)}
      </>;
      case "angle": return <>{P("arm1", line("M50 150H240"), "wide")}{P("arm2", line("M50 150L200 45"), "wide")}{P("vertex", <circle cx="50" cy="150" r="5" fill="currentColor" />, <circle cx="50" cy="150" r="18" />)}<path d="M100 150a50 50 0 0 0-9-29" {...INK} stroke="var(--sh-accent,#e8862a)" /></>;
      case "venn": return <>
        {P("out", <rect x="15" y="15" width="250" height="165" rx="10" {...INK} strokeWidth={1.5} fill="transparent" />)}
        {P("A", <path d="M135 52A58 58 0 1 0 135 148A58 58 0 0 1 135 52Z" {...INK} fill="transparent" />)}
        {P("B", <path d="M135 52A58 58 0 1 1 135 148A58 58 0 0 0 135 52Z" {...INK} fill="transparent" />)}
        {P("AB", <path d="M135 52A58 58 0 0 1 135 148A58 58 0 0 1 135 52Z" {...INK} fill="transparent" />)}
        <text x="34" y="44" {...T}>A</text><text x="236" y="44" {...T}>B</text>
      </>;
      case "unit-circle": return <>
        <circle cx="140" cy="100" r="70" {...INK} /><path d="M50 100H230M140 12V188" {...INK} strokeWidth={1} />
        {[[0, 210, 100], [90, 140, 30], [180, 70, 100], [270, 140, 170]].map(([d, x, y]) => P(`p:${d}`, <circle cx={x} cy={y} r="6" fill="currentColor" />, <circle cx={x} cy={y} r="18" />))}
        <text x="216" y="92" {...T}>(1, 0)</text>
      </>;
      case "tangent-slope": return <>
        <path d="M25 170C80 60 110 40 140 40C170 40 200 60 255 170" {...INK} />
        {[["up", 72, 96], ["top", 140, 40], ["down", 208, 96]].map(([id, x, y]) => P(String(id), <circle cx={x} cy={y} r="6" fill="currentColor" />, <circle cx={x} cy={y} r="20" />))}
      </>;
      case "area-under-curve": return <>
        {P("above", <path d="M90 20H200V69.6Q145 49.9 90 90.6Z" fill="transparent" stroke="none" />)}
        {P("left", <path d="M40 165V140Q65 109.1 90 90.6V165Z" {...INK} strokeWidth={1} fill="transparent" />)}
        {P("under", <path d="M90 165V90.6Q145 49.9 200 69.6V165Z" {...INK} strokeWidth={1} fill="transparent" />)}
        <path d="M30 165H255M40 15V175" {...INK} /><path d="M40 140Q145 10 250 100" {...INK} />
        {P("a", <text x="85" y="186" {...T}>a</text>, <circle cx="90" cy="178" r="15" />)}{P("b", <text x="196" y="186" {...T}>b</text>, <circle cx="200" cy="178" r="15" />)}
      </>;
      case "number-line": return <>
        <path d="M12 100H268" {...INK} />
        {Array.from({ length: 11 }, (_, i) => i - 5).map((n) => P(`n:${n}`, <><path d={`M${140 + n * 23} 91v18`} {...INK} /><text x={140 + n * 23} y="132" textAnchor="middle" {...T}>{n < 0 ? `−${-n}` : n}</text></>, <rect x={140 + n * 23 - 11} y="78" width="22" height="62" />))}
      </>;
      case "coordinate-plane": case "vector-arrow": return <>
        {Array.from({ length: 9 }, (_, i) => i - 4).map((k) => <g key={k}><path d={`M${140 + k * 21} 12V188`} {...INK} strokeWidth={k === 0 ? 2 : 0.5} opacity={k === 0 ? 1 : 0.35} /><path d={`M52 ${100 - k * 21}H228`} {...INK} strokeWidth={k === 0 ? 2 : 0.5} opacity={k === 0 ? 1 : 0.35} /></g>)}
        <text x="232" y="104" {...T}>x</text><text x="145" y="12" {...T}>y</text><text x="126" y="116" {...T} fontSize={11}>O</text>
        {[1, 2, 3, 4].map((k) => <g key={k}><text x={140 + k * 21} y="116" textAnchor="middle" {...T} fontSize={9} opacity={0.7}>{k}</text><text x="131" y={103 - k * 21} textAnchor="end" {...T} fontSize={9} opacity={0.7}>{k}</text></g>)}
        {Array.from({ length: 81 }, (_, i) => [(i % 9) - 4, Math.floor(i / 9) - 4]).map(([x, y]) => P(`p:${x},${y}`, <circle cx={140 + x * 21} cy={100 - y * 21} r="3" fill="currentColor" opacity={0.55} />, <circle cx={140 + x * 21} cy={100 - y * 21} r="10.4" />))}
      </>;
      case "matrix-grid": { const rows = scene.values.length, top = rows === 2 ? 55 : 35, h = rows * 46; return <>
        <path d={`M62 ${top}h-12v${h}h12M218 ${top}h12v${h}h-12`} {...INK} />
        {scene.values.flatMap((r, i) => r.map((v, j) => P(`e:${i + 1},${j + 1}`, <text x={88 + j * 52} y={top + 32 + i * 46} textAnchor="middle" {...T} fontSize={22}>{v}</text>, <rect x={62 + j * 52} y={top + i * 46} width="52" height="46" />)))}
      </>; }
      case "fraction-bar": { const w = 240 / scene.parts; return <>{Array.from({ length: scene.parts }, (_, k) => P(`f:${k}`, <rect x={20 + k * w} y="70" width={w} height="56" {...INK} fill="transparent" />))}</>; }
    }
  })();
  return <svg className="sh-picture pt-scene" viewBox="0 0 280 195" role="group" aria-label="Tap the picture to answer">{body}</svg>;
}

/** A few tap-the-picture questions, made new for each visit. */
export function PictureRound({ kind, seed }: { kind: Picture; seed: number }) {
  const tasks = useMemo(() => pictureTasks(kind, seed), [kind, seed]);
  const [i, setI] = useState(0);
  const [tapped, setTapped] = useState<string[]>([]);
  const [shade, setShade] = useState<string[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  if (!tasks.length) return null;
  if (i >= tasks.length) return <section className="sh-card sh-done" role="status"><p><b>You can read the picture.</b> Come back any time: the questions change.</p></section>;
  const t: PictureTask = tasks[i], bar = t.count !== undefined, last = tapped[tapped.length - 1];
  const right = bar ? checked === true : last !== undefined && rightTap(t, last);
  const mark: Mark = (id) => (bar ? (shade.includes(id) ? (checked === true ? "right" : "on") : "") : tapped.includes(id) ? (rightTap(t, id) ? "right" : "wrong") : "");
  const tap = (id: string) => { if (right) return; if (bar) { setChecked(null); setShade(shade.includes(id) ? shade.filter((x) => x !== id) : [...shade, id]); } else if (!tapped.includes(id)) setTapped([...tapped, id]); };
  const said = bar ? (checked === null ? null : checked ? `Yes. ${shade.length} of ${(t.scene as { parts: number }).parts} parts are shaded.` : `Not quite: ${shade.length} part${shade.length === 1 ? " is" : "s are"} shaded. ${t.hint}`) : last === undefined ? null : right ? `Yes. That is ${describe(t.scene, last)}.` : `Not quite. You tapped ${describe(t.scene, last)}. ${t.hint}`;
  return (
    <section className="sh-card pt" data-picture-task={kind}>
      <p className="sh-eyebrow">On the picture · {i + 1} of {tasks.length}</p>
      <h3>{t.prompt}</h3>
      <ScenePicture scene={t.scene} mark={mark} tap={tap} />
      {bar && !right && <button type="button" className="sh-show" onClick={() => setChecked(rightTap(t, "", shade.length))}>Check</button>}
      {said && <p className={right ? "sh-feedback good" : "sh-feedback"} role="status">{said}</p>}
      {right && <button type="button" className="sh-show" onClick={() => { setTapped([]); setShade([]); setChecked(null); setI(i + 1); }}>{i + 1 < tasks.length ? "Next" : "Finish"}</button>}
    </section>
  );
}

/** Drag to see it: change the angle and the size of a right triangle; the three ratios follow the angle only. */
export function TriangleExplore() {
  const [deg, setDeg] = useState(35);
  const [size, setSize] = useState(10);
  const rad = (deg * Math.PI) / 180, adj = size * Math.cos(rad), opp = size * Math.sin(rad), k = 18;
  const ax = 30, ay = 170, bx = ax + adj * k, by = ay, cy = ay - opp * k, f = (v: number, d = 1) => v.toFixed(d);
  return (
    <section className="sh-card pt-explore" data-triangle-explore>
      <p className="sh-eyebrow">Move it and watch</p>
      <h3>Change the size: the ratios stay. Change the angle: they move.</h3>
      <svg className="sh-picture" viewBox="0 0 280 195" role="img" aria-label={`Right triangle with angle ${deg} degrees and hypotenuse ${size}`}>
        <path d={`M${ax} ${ay}H${bx}V${cy}Z`} {...INK} /><path d={`M${bx - 10} ${by}v-10h10`} {...INK} strokeWidth={1.5} />
        <text x={ax + 26} y={ay - 5} {...T}>θ</text>
      </svg>
      <p className="pt-readout">θ = {deg}° · opposite {f(opp)} · adjacent {f(adj)} · hypotenuse {f(size)}</p>
      <label className="pt-slider">Angle θ<input type="range" min={15} max={70} value={deg} onChange={(e) => setDeg(Number(e.target.value))} aria-label="Angle" /></label>
      <label className="pt-slider">Size<input type="range" min={6} max={13} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Size" /></label>
      <div className="sh-example"><div>sin θ = opposite ÷ hypotenuse = {f(opp)} ÷ {f(size)} = {f(Math.sin(rad), 2)}</div><div>cos θ = adjacent ÷ hypotenuse = {f(adj)} ÷ {f(size)} = {f(Math.cos(rad), 2)}</div><div>tan θ = opposite ÷ adjacent = {f(opp)} ÷ {f(adj)} = {f(Math.tan(rad), 2)}</div></div>
    </section>
  );
}
