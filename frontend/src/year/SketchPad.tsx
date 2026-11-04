import { HANDWRITING_ENABLED } from "../writing/features";
/**
 * draw@1: a drawing answer for written tasks a computer cannot mark reliably — graph sketches, constructions and
 * diagrams. The learner draws with a pen, a straight edge (line), a compass (circle) and points; the drawing and an
 * optional note are saved as ONE text response ("draw@1 {json}") that is pending until an educator marks it
 * (written@1). Nothing here judges the drawing. The same renderer shows it to the learner and to the marker, so the
 * educator marks exactly what the learner drew.
 *
 * Coordinates are integers in a 300 × 300 sheet; with axes, the sheet maps onto the task's ranges and the pointer's
 * position is shown in those units, so a learner can place an intercept or a vertex where it belongs.
 */
import { useRef, useState, type JSX, type PointerEvent as RPointerEvent } from "react";

export const DRAW_PREFIX = "draw@1 ";
export const DRAW_LIMIT = 16000;
export type Canvas = { grid?: boolean; axes?: { x: [number, number]; y: [number, number]; step?: number } };
type Stroke = ["p" | "l" | "c" | "d", ...number[]];
export interface Drawing {
  text: string;
  s: Stroke[];
}
const W = 300;
const PAD = 24;

export const isDrawing = (raw: string) => raw.startsWith(DRAW_PREFIX);
export function readDrawing(raw: string): Drawing | null {
  if (!isDrawing(raw)) return null;
  try {
    const d = JSON.parse(raw.slice(DRAW_PREFIX.length)) as Drawing;
    return Array.isArray(d.s) && typeof d.text === "string" ? d : null;
  } catch {
    return null;
  }
}
export const writeDrawing = (d: Drawing) => DRAW_PREFIX + JSON.stringify(d);

/** The sheet's units → task units (with axes). */
function mapping(c?: Canvas) {
  const ax = c?.axes;
  if (!ax) return null;
  const [x0, x1] = ax.x;
  const [y0, y1] = ax.y;
  const X = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD);
  const Y = (y: number) => W - PAD - ((y - y0) / (y1 - y0)) * (W - 2 * PAD);
  const fromX = (px: number) => x0 + ((px - PAD) / (W - 2 * PAD)) * (x1 - x0);
  const fromY = (py: number) => y0 + ((W - PAD - py) / (W - 2 * PAD)) * (y1 - y0);
  return { X, Y, fromX, fromY, x0, x1, y0, y1, step: ax.step ?? 1 };
}

function Background({ c }: { c?: Canvas }) {
  const m = mapping(c);
  const out: JSX.Element[] = [<rect key="bg" x={0} y={0} width={W} height={W} fill="#fff" />];
  if (c?.grid && !m) for (let k = 0; k <= W; k += 20) out.push(<line key={`g${k}`} x1={k} y1={0} x2={k} y2={W} stroke="#e3e9f2" />, <line key={`h${k}`} x1={0} y1={k} x2={W} y2={k} stroke="#e3e9f2" />);
  if (m) {
    for (let x = Math.ceil(m.x0 / m.step) * m.step; x <= m.x1 + 1e-9; x += m.step) out.push(<line key={`gx${x}`} x1={m.X(x)} y1={PAD} x2={m.X(x)} y2={W - PAD} stroke="#e3e9f2" />);
    for (let y = Math.ceil(m.y0 / m.step) * m.step; y <= m.y1 + 1e-9; y += m.step) out.push(<line key={`gy${y}`} x1={PAD} y1={m.Y(y)} x2={W - PAD} y2={m.Y(y)} stroke="#e3e9f2" />);
    const ox = m.x0 <= 0 && m.x1 >= 0 ? m.X(0) : PAD;
    const oy = m.y0 <= 0 && m.y1 >= 0 ? m.Y(0) : W - PAD;
    out.push(<line key="xa" x1={PAD} y1={oy} x2={W - PAD} y2={oy} stroke="#1f2a37" />, <line key="ya" x1={ox} y1={PAD} x2={ox} y2={W - PAD} stroke="#1f2a37" />);
    out.push(<text key="xl" x={W - PAD + 4} y={oy + 4} fontSize={11}>x</text>, <text key="yl" x={ox - 3} y={PAD - 6} fontSize={11}>y</text>);
    const label = (v: number) => (v < 0 ? `−${-v}` : String(v));
    for (let x = Math.ceil(m.x0 / m.step) * m.step; x <= m.x1 + 1e-9; x += m.step) if (Math.abs(x) > 1e-9) out.push(<text key={`nx${x}`} x={m.X(x)} y={oy + 12} fontSize={9} textAnchor="middle" fill="#55606e">{label(x)}</text>);
    for (let y = Math.ceil(m.y0 / m.step) * m.step; y <= m.y1 + 1e-9; y += m.step) if (Math.abs(y) > 1e-9) out.push(<text key={`ny${y}`} x={ox - 4} y={m.Y(y) + 3} fontSize={9} textAnchor="end" fill="#55606e">{label(y)}</text>);
  }
  return <>{out}</>;
}

function Strokes({ s }: { s: Stroke[] }) {
  return (
    <>
      {s.map((st, i) => {
        const [t, ...n] = st;
        if (t === "p") return <polyline key={i} points={Array.from({ length: n.length >> 1 }, (_, k) => `${n[2 * k]},${n[2 * k + 1]}`).join(" ")} fill="none" stroke="#2f6fde" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
        if (t === "l") return <line key={i} x1={n[0]} y1={n[1]} x2={n[2]} y2={n[3]} stroke="#1f2a37" strokeWidth={2} />;
        if (t === "c") return <circle key={i} cx={n[0]} cy={n[1]} r={Math.hypot(n[2] - n[0], n[3] - n[1])} fill="none" stroke="#3aa17e" strokeWidth={2} />;
        return <circle key={i} cx={n[0]} cy={n[1]} r={4} fill="#c4536b" />;
      })}
    </>
  );
}

const describe = (d: Drawing) => {
  const n = (t: string) => d.s.filter((x) => x[0] === t).length;
  const parts = [n("p") && `${n("p")} freehand line${n("p") > 1 ? "s" : ""}`, n("l") && `${n("l")} straight line${n("l") > 1 ? "s" : ""}`, n("c") && `${n("c")} circle${n("c") > 1 ? "s" : ""} or arc${n("c") > 1 ? "s" : ""}`, n("d") && `${n("d")} point${n("d") > 1 ? "s" : ""}`].filter(Boolean);
  return `A drawing: ${parts.length ? parts.join(", ") : "nothing drawn"}.`;
};

/** A drawing as it was handed in (the learner's record and the marker's queue). */
export function SketchView({ raw, canvas }: { raw: string; canvas?: Canvas }) {
  const d = readDrawing(raw);
  if (!d) return <blockquote className="response">{raw}</blockquote>;
  return (
    <figure className="sketch">
      <svg viewBox={`0 0 ${W} ${W}`} role="img" aria-label={describe(d)} className="sketch-sheet">
        <Background c={canvas} />
        <Strokes s={d.s} />
      </svg>
      {d.text && <figcaption><blockquote className="response">{d.text}</blockquote></figcaption>}
    </figure>
  );
}

/** The drawing pad. `value` and `onChange` carry the whole response ("draw@1 …"). */
function DeferredSketchPad({ value, onChange, canvas, disabled }: { value: string; onChange: (v: string) => void; canvas?: Canvas; disabled?: boolean }) {
  const d = readDrawing(value) ?? { text: "", s: [] };
  const [tool, setTool] = useState<"p" | "l" | "c" | "d">(canvas?.axes ? "p" : "l");
  const [live, setLive] = useState<Stroke | null>(null);
  const [at, setAt] = useState<[number, number] | null>(null);
  const [full, setFull] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const m = mapping(canvas);
  const pt = (e: RPointerEvent<SVGSVGElement>): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [Math.max(0, Math.min(W, Math.round(((e.clientX - r.left) / r.width) * W))), Math.max(0, Math.min(W, Math.round(((e.clientY - r.top) / r.height) * W)))];
  };
  const save = (next: Drawing) => {
    const raw = writeDrawing(next);
    if (raw.length > DRAW_LIMIT) return setFull(true);
    setFull(false);
    onChange(raw);
  };
  const down = (e: RPointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const [x, y] = pt(e);
    svg.current!.setPointerCapture(e.pointerId);
    if (tool === "d") return save({ ...d, s: [...d.s, ["d", x, y]] });
    setLive(tool === "p" ? ["p", x, y] : [tool, x, y, x, y]);
  };
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const [x, y] = pt(e);
    setAt([x, y]);
    if (!live) return;
    if (live[0] === "p") {
      const [lx, ly] = live.slice(-2) as number[];
      if (Math.hypot(x - lx, y - ly) >= 4) setLive([...live, x, y] as Stroke);
    } else setLive([live[0], live[1] as number, live[2] as number, x, y]);
  };
  const up = () => {
    if (!live) return;
    const tiny = live[0] !== "p" && Math.hypot((live[3] as number) - (live[1] as number), (live[4] as number) - (live[2] as number)) < 3;
    if (!tiny && !(live[0] === "p" && live.length < 5)) save({ ...d, s: [...d.s, live] });
    setLive(null);
  };
  const units = (v: number, f: (n: number) => number) => {
    const r = Math.round(f(v) * 10) / 10;
    return r < 0 ? `−${-r}` : String(r);
  };
  const TOOLS: [typeof tool, string][] = [["p", "Pen"], ["l", "Straight edge"], ["c", "Compass"], ["d", "Point"]];
  return (
    <div className="sketchpad">
      <div className="tools" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(([k, name]) => (
          <button key={k} type="button" aria-pressed={tool === k} className={tool === k ? "picked" : ""} disabled={disabled} onClick={() => setTool(k)}>{name}</button>
        ))}
        <button type="button" disabled={disabled || !d.s.length} onClick={() => save({ ...d, s: d.s.slice(0, -1) })}>Undo</button>
        <button type="button" disabled={disabled || !d.s.length} onClick={() => save({ ...d, s: [] })}>Clear</button>
      </div>
      <svg ref={svg} viewBox={`0 0 ${W} ${W}`} className="sketch-sheet" role="img" aria-label={`Drawing sheet${m ? ` with axes from x = ${m.x0} to ${m.x1} and y = ${m.y0} to ${m.y1}` : ""}. ${describe(d)}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setAt(null)} style={{ touchAction: "none" }}>
        <Background c={canvas} />
        <Strokes s={live ? [...d.s, live] : d.s} />
      </svg>
      <p className="small" aria-live="polite">
        {m && at ? `Pointer at (${units(at[0], m.fromX)}, ${units(at[1], m.fromY)}). ` : ""}
        {tool === "l" ? "Drag from one end to the other." : tool === "c" ? "Drag from the centre outwards to set the radius." : tool === "d" ? "Tap to mark a point." : "Draw freely."}
        {full ? " The drawing is as large as it can be: undo something to add more." : ""}
      </p>
      <label className="field">
        A note for your teacher: label what you drew, and give key values (if you cannot draw here, describe your drawing in words — the educator marks either)
        <textarea aria-label="Your note" rows={3} maxLength={4000} value={d.text} disabled={disabled} onChange={(e) => save({ ...d, text: e.target.value })} />
      </label>
    </div>
  );
}

export function SketchPad(props: Parameters<typeof DeferredSketchPad>[0]) { return HANDWRITING_ENABLED ? <DeferredSketchPad {...props} /> : null; }
