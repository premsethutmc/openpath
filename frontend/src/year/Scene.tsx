/**
 * scene@1: the one player for every interactive scene (packages/learning/src/scene.ts).
 *
 * The player holds no mathematics. It asks the engine what to draw for the current state, passes touches and slider moves
 * back to the engine, and shows the engine's readout and whether the goal is reached. A scene the engine finds a problem
 * with is not drawn. Reaching a goal writes nothing to the learner's records: a scene is a teaching picture.
 *
 * Every control is also a native slider, so a scene works by keyboard and switch access as well as by finger.
 */
import { useMemo, useRef, useState, type JSX, type PointerEvent } from "react";
import { SCENE_BOX, check, controls, describe, draw, initial, met, pointer, readout, set, type Scene, type SceneState, type Shape } from "../../../packages/learning/src/scene";

function shape(s: Shape, i: number): JSX.Element {
  const c = `sc-${s.role}`;
  if (s.t === "line") return <line key={i} className={c} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
  if (s.t === "path") return <path key={i} className={c} d={s.d} />;
  if (s.t === "rect") return <rect key={i} className={c} x={s.x} y={s.y} width={s.w} height={s.h} />;
  if (s.t === "circle") return <circle key={i} className={c} cx={s.cx} cy={s.cy} r={s.r} />;
  return <text key={i} className={c} x={s.x} y={s.y} textAnchor="middle">{s.s}</text>;
}

export function ScenePlayer({ scene }: { scene: Scene }) {
  const ok = useMemo(() => check(scene).length === 0, [scene]);
  const [state, setState] = useState<SceneState>(() => (ok ? initial(scene) : {}));
  const [reached, setReached] = useState(false);
  const dragging = useRef(false);
  if (!ok) return <p className="hint" role="note" data-scene="unavailable">This picture is not available.</p>;

  const cs = controls(scene);
  const draggable = cs.some((c) => c.key === "x");
  const apply = (next: SceneState) => { setState(next); if (met(scene, next)) setReached(true); };
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    apply(pointer(scene, state, ((e.clientX - r.left) * SCENE_BOX.w) / r.width, ((e.clientY - r.top) * SCENE_BOX.h) / r.height));
  };
  const done = reached || met(scene, state);
  return (
    <figure className="scene" role="group" aria-label={describe(scene)} data-scene={scene.kind} data-scene-done={done ? "yes" : "no"}>
      <svg
        viewBox={`0 0 ${SCENE_BOX.w} ${SCENE_BOX.h}`}
        aria-hidden="true"
        className={draggable ? "scene-drag" : undefined}
        onPointerDown={draggable ? (e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); at(e); } : undefined}
        onPointerMove={draggable ? (e) => { if (dragging.current) at(e); } : undefined}
        onPointerUp={draggable ? () => { dragging.current = false; } : undefined}
        onPointerCancel={draggable ? () => { dragging.current = false; } : undefined}
      >
        {draw(scene, state).map(shape)}
      </svg>
      <div className="scene-controls">
        {cs.map((c) => (
          <label key={c.key}>
            <span>{c.label}</span>
            <input type="range" min={c.min} max={c.max} step={c.step} value={state[c.key]} onChange={(e) => apply(set(scene, state, c.key, Number(e.target.value)))} />
          </label>
        ))}
      </div>
      <p className="scene-readout" aria-live="polite">{readout(scene, state)}</p>
      <p className={`scene-goal${done ? " done" : ""}`} role="status">{done ? scene.success : scene.prompt}</p>
    </figure>
  );
}
