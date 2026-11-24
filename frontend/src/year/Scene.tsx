/**
 * scene@3: the one player for every interactive scene (packages/learning/src/scene.ts).
 *
 * The player holds no mathematics. It asks the engine what to draw for the current state, passes touches and slider moves
 * back to the engine, and shows the engine's readout and whether the goal is reached. A scene the engine finds a problem
 * with is not drawn. Reaching a goal writes nothing to the learner's records: a scene is a teaching picture.
 *
 * Every control is also a native slider, so a scene works by keyboard and switch access as well as by finger.
 */
import { createElement, useMemo, useRef, useState, type JSX, type PointerEvent, type ReactNode, type SVGProps } from "react";
import type { Mark } from "../../../packages/learning/src/figure-marks";
import { SCENE_BOX, check, controls, describe, draw, draggable as follows, grip, initial, met, nudge, pointer, readout, set, type Scene, type SceneState, type Shape, triedLine } from "../../../packages/learning/src/scene";

function shape(s: Shape, i: number): JSX.Element {
  const c = `sc-${s.role}`;
  if (s.t === "line") return <line key={i} className={c} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
  if (s.t === "path") return <path key={i} className={c} d={s.d} />;
  if (s.t === "rect") return <rect key={i} className={c} x={s.x} y={s.y} width={s.w} height={s.h} />;
  if (s.t === "circle") return <circle key={i} className={c} cx={s.cx} cy={s.cy} r={s.r} />;
  return <text key={i} className={c} x={s.x} y={s.y} textAnchor="middle">{s.s}</text>;
}

export function ScenePlayer({ scene, onReached }: { scene: Scene; onReached?: () => void }) {
  const ok = useMemo(() => check(scene).length === 0, [scene]);
  const [state, setState] = useState<SceneState>(() => (ok ? initial(scene) : {}));
  const [reached, setReached] = useState(false);
  // nudge@1: said only once the learner has moved something (not before they have tried)
  const [touched, setTouched] = useState(false);
  // decide@1: the picture stays still until the learner has made its one choice
  const [picked, setPicked] = useState<number | null>(null);
  // tried@1: the numbers of rows tried so far, in the order they were first tried
  const [tried, setTried] = useState<number[]>([]);
  const dragging = useRef(false);
  const hold = useRef(0);
  if (!ok) return <p className="hint" role="note" data-scene="unavailable">This picture is not available.</p>;

  const gate = scene.first && picked !== scene.first.right ? scene.first : null;
  const cs = controls(scene);
  const draggable = follows(scene) && !gate;
  const apply = (next: SceneState) => { setTouched(true); setState(next); if (scene.kind === "array" && scene.log && triedLine(scene, next.r) && !tried.includes(next.r)) setTried([...tried, next.r]); if (met(scene, next)) { if (!reached) onReached?.(); setReached(true); } };
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * SCENE_BOX.w) / r.width, ((e.clientY - r.top) * SCENE_BOX.h) / r.height] as const;
  };
  const move = (e: PointerEvent<SVGSVGElement>) => { const [x, y] = at(e); apply(pointer(scene, state, x, y, hold.current)); };
  const done = reached || met(scene, state);
  // every control is also a native slider (keyboard and switch access); more than two are folded away under the picture
  const sliders = cs.map((c) => (
    <label key={c.key}>
      <span>{c.label}</span>
      <input type="range" min={c.min} max={c.max} step={c.step} value={state[c.key]} onChange={(e) => apply(set(scene, state, c.key, Number(e.target.value)))} />
    </label>
  ));
  return (
    <figure className="scene" role="group" aria-label={describe(scene)} data-scene={scene.kind} data-scene-done={done ? "yes" : "no"}>
      {/* what to do is read before the picture, not found under it */}
      {!gate && <p className={`scene-goal${done && !scene.quiet ? " done" : ""}`} role="status">{done && !scene.quiet ? scene.success : scene.prompt}</p>}
      {!(gate && gate.hide) && <svg
        viewBox={`0 0 ${SCENE_BOX.w} ${SCENE_BOX.h}`}
        aria-hidden="true"
        className={draggable ? (scene.kind === "pick" ? "scene-drag scene-tap" : "scene-drag") : undefined}
        onPointerDown={draggable ? (e) => { const [x, y] = at(e); hold.current = grip(scene, state, x, y); dragging.current = hold.current >= 0; if (dragging.current) { e.currentTarget.setPointerCapture?.(e.pointerId); move(e); } } : undefined}
        onPointerMove={draggable ? (e) => { if (dragging.current) move(e); } : undefined}
        onPointerUp={draggable ? () => { dragging.current = false; } : undefined}
        onPointerCancel={draggable ? () => { dragging.current = false; } : undefined}
      >
        {draw(scene, state).map(shape)}
      </svg>}
      {gate && (
        <div className="scene-first" data-testid="scene-first">
          <p className="scene-goal">{gate.ask}</p>
          <div className="kid-taps" role="radiogroup" aria-label={gate.ask}>
            {gate.choices.map((c, i) => <button key={c} type="button" className={`kid-tap${picked === i ? " on" : ""}`} role="radio" aria-checked={picked === i} onClick={() => setPicked(i)}>{c}</button>)}
          </div>
          {picked !== null && <p className="scene-nudge" role="status">{gate.why[picked]}</p>}
        </div>
      )}
      {/* commas are dragged where they sit; their sliders are for a keyboard or a switch, so they are folded away too */}
      {gate ? null : cs.length > 2 || scene.kind === "commas" || scene.kind === "pick" ? <details className="scene-controls many"><summary>Set by sliders</summary>{sliders}</details> : <div className="scene-controls">{sliders}</div>}
      {!gate && <p className="scene-readout" aria-live="polite">{readout(scene, state)}</p>}
      {tried.length > 0 && (
        <div className="scene-tried" data-testid="scene-tried">
          <p className="small muted">What you have tried</p>
          <ul>{[...tried].sort((a, b) => a - b).map((r) => <li key={r}>{triedLine(scene, r)}</li>)}</ul>
        </div>
      )}
      {!done && touched && nudge(scene, state) && <p className="scene-nudge" role="status">{nudge(scene, state)}</p>}
    </figure>
  );
}

/** A scene drawn to be read, not moved: a lesson's labelled picture. The same engine draws it; there is nothing to set. */
export function SceneFigure({ scene, state, label }: { scene: Scene; state?: SceneState; label: string }) {
  return (
    <figure className="scene scene-figure" data-scene-figure={scene.kind}>
      <svg viewBox={`0 0 ${SCENE_BOX.w} ${SCENE_BOX.h}`} role="img" aria-label={label}>{draw(scene, { ...initial(scene), ...state }).map(shape)}</svg>
    </figure>
  );
}

/** figure-marks@1: a question's picture, drawn from the engine's marks (figure-marks.ts). The one place they are drawn. */
const mark = (k: Mark | string | number, i: number): ReactNode => (typeof k === "object" ? createElement(k.tag, { ...k.at, key: i }, ...k.kids.map(mark)) : k);
export function FigureMarks({ w, h, marks, label }: { w: number; h: number; marks: Mark[]; label: string }) {
  return (
    <figure className="figure" aria-label={label} role="img">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: Math.min(w, 420) }} aria-hidden="true">{marks.map(mark)}</svg>
    </figure>
  );
}

/** lesson-marks@1: any drawing the engine has worked out, in the svg the page asks for. */
export function MarksSvg({ marks, ...svg }: { marks: Mark[] } & SVGProps<SVGSVGElement>) {
  return <svg {...svg}>{marks.map(mark)}</svg>;
}
