/**
 * scene@3: the one player for every interactive scene (packages/learning/src/scene.ts).
 *
 * The player holds no mathematics. It asks the engine what to draw for the current state, passes touches and slider moves
 * back to the engine, and shows the engine's readout and whether the goal is reached. A scene the engine finds a problem
 * with is not drawn. Reaching a goal writes nothing to the learner's records: a scene is a teaching picture.
 *
 * Every control is also a native slider, so a scene works by keyboard and switch access as well as by finger.
 */
import { createElement, useEffect, useMemo, useRef, useState, type JSX, type PointerEvent, type ReactNode, type SVGProps } from "react";
import type { Mark } from "../../../packages/learning/src/figure-marks";
import { canSpeak, sayAloud } from "./Chintu";
import { check, controls, describe, draw, draggable as follows, frames, grip, initial, met, nudge, pointer, readout, release, sceneBox, set, type Frame, type Scene, type SceneState, type Shape, triedLine } from "../../../packages/learning/src/scene";

function shape(s: Shape, i: number): JSX.Element {
  const c = `sc-${s.role}`;
  // a "roll" text is new each time it changes, so its CSS entrance (the counter's digits rolling) plays on every change
  if (s.t === "text" && s.role.includes("roll")) {
    const t = <text key={`${i}:${s.s}`} className={c} x={s.x} y={s.y} textAnchor="middle">{s.s}</text>;
    // a clipped text is drawn in its own small window (an inner svg hides what is outside it)
    return s.clip ? <svg key={i} x={s.clip.x} y={s.clip.y} width={s.clip.w} height={s.clip.h} viewBox={`${s.clip.x} ${s.clip.y} ${s.clip.w} ${s.clip.h}`} overflow="hidden">{t}</svg> : t;
  }
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
  // frames@1: the pictures between two states (a counter clicking through every number), shown one after another
  const [shown, setShown] = useState<SceneState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // a move made while the counter is still counting (the next tile tapped) waits its turn instead of being lost
  const queued = useRef<SceneState | null>(null);
  // the state as of the last move, for a finger that lifts before the page has drawn its going down (a quick tap)
  const live = useRef(state);
  live.current = state;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // read-aloud@1 (the counter and the lift, for a child who may not read): the prompt is said when the picture opens,
  // a refusal ("Not yet …") when it happens, and the success line when the goal is reached; a speaker button repeats
  const speaks = ok && scene.kind === "tally";
  const refusal = speaks && touched ? nudge(scene, state) : null;
  const [doneNow, setDoneNow] = useState(false);
  useEffect(() => { if (speaks) sayAloud(scene.prompt); }, [speaks, scene]);
  useEffect(() => { if (refusal) sayAloud(refusal); }, [refusal, state.refused]);
  useEffect(() => { if (speaks && doneNow && !scene.quiet) sayAloud(scene.success); }, [speaks, doneNow, scene]);
  if (!ok) return <p className="hint" role="note" data-scene="unavailable">This picture is not available.</p>;

  const gate = scene.first && picked !== scene.first.right ? scene.first : null;
  const cs = controls(scene);
  const draggable = follows(scene) && !gate;
  const finish = (next: SceneState) => { if (met(scene, next)) { if (!reached) onReached?.(); setReached(true); setDoneNow(true); } };
  const apply = (target: SceneState) => {
    if (timer.current) { queued.current = target; live.current = target; return; }
    setTouched(true);
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fr: Frame[] = frames(scene, live.current, target).filter((f, i, all) => i === all.length - 1 || !(still && f.motion));
    const next = fr[fr.length - 1].state;
    live.current = next;
    setState(next);
    if (scene.kind === "array" && scene.log && triedLine(scene, next.r) && !tried.includes(next.r)) setTried([...tried, next.r]);
    if (fr.length === 1) { finish(next); return; }
    // one picture after another; the goal is said once the last one is shown
    const play = (k: number) => {
      if (k >= fr.length - 1) {
        timer.current = null; setShown(null); finish(next);
        const q = queued.current;
        if (q) { queued.current = null; live.current = next; apply(q); }
        return;
      }
      setShown(fr[k].state);
      timer.current = setTimeout(() => play(k + 1), fr[k].ms);
    };
    play(0);
  };
  const box = sceneBox(scene), busy = shown !== null, view = shown ?? state;
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * box.w) / r.width, ((e.clientY - r.top) * box.h) / r.height] as const;
  };
  const move = (e: PointerEvent<SVGSVGElement>) => { const [x, y] = at(e); apply(pointer(scene, live.current, x, y, hold.current)); };
  const letGo = (e: PointerEvent<SVGSVGElement>) => { if (!dragging.current) return; dragging.current = false; const [x, y] = at(e); apply(release(scene, live.current, x, y)); };
  const done = !busy && (reached || met(scene, state));
  // every control is also a native slider (keyboard and switch access); more than two are folded away under the picture
  const sliders = cs.map((c) => (
    <label key={c.key}>
      <span>{c.label}</span>
      <input type="range" min={c.min} max={c.max} step={c.step} value={state[c.key]} disabled={busy} onChange={(e) => apply(set(scene, state, c.key, Number(e.target.value)))} />
    </label>
  ));
  return (
    <figure className="scene" role="group" aria-label={describe(scene)} data-scene={scene.kind} data-scene-done={done ? "yes" : "no"}>
      {/* what to do is read before the picture, not found under it */}
      {!gate && <p className={`scene-goal${done && !scene.quiet ? " done" : ""}`} role="status">{done && !scene.quiet ? scene.success : scene.prompt}{speaks && canSpeak() && <button type="button" className="scene-say" aria-label="Say it again" data-testid="scene-say" onClick={() => sayAloud(refusal ?? (done && !scene.quiet ? scene.success : scene.prompt))}><span aria-hidden="true">🔊</span></button>}</p>}
      {!(gate && gate.hide) && <svg
        viewBox={`0 0 ${box.w} ${box.h}`}
        aria-hidden="true"
        className={draggable ? (scene.kind === "pick" ? "scene-drag scene-tap" : "scene-drag") : undefined}
        onPointerDown={draggable ? (e) => { if (busy && scene.kind !== "tally") return; const [x, y] = at(e); hold.current = grip(scene, live.current, x, y); dragging.current = hold.current >= 0; if (dragging.current) { e.currentTarget.setPointerCapture?.(e.pointerId); move(e); } } : undefined}
        onPointerMove={draggable ? (e) => { if (dragging.current) move(e); } : undefined}
        onPointerUp={draggable ? letGo : undefined}
        onPointerCancel={draggable ? () => { if (!dragging.current) return; dragging.current = false; apply(release(scene, live.current, -box.w, box.h)); } : undefined}
      >
        {draw(scene, view).map(shape)}
      </svg>}
      {/* a refused tile is said right under the picture, big, beside where the tiles are */}
      {speaks && <p className="scene-nudge scene-nudge-big" role="status" data-testid="scene-not-yet">{!done && refusal}</p>}
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
      {gate ? null : cs.length > 2 || scene.kind === "commas" || scene.kind === "pick" || scene.kind === "tally" ? <details className="scene-controls many"><summary>Set by sliders</summary>{sliders}</details> : <div className="scene-controls">{sliders}</div>}
      {!gate && <p className="scene-readout" aria-live="polite">{readout(scene, view)}</p>}
      {tried.length > 0 && (
        <div className="scene-tried" data-testid="scene-tried">
          <p className="small muted">What you have tried</p>
          <ul>{[...tried].sort((a, b) => a - b).map((r) => <li key={r}>{triedLine(scene, r)}</li>)}</ul>
        </div>
      )}
      {!speaks && !done && touched && nudge(scene, state) && <p className="scene-nudge" role="status">{nudge(scene, state)}</p>}
    </figure>
  );
}

/** A scene drawn to be read, not moved: a lesson's labelled picture. The same engine draws it; there is nothing to set. */
export function SceneFigure({ scene, state, label }: { scene: Scene; state?: SceneState; label: string }) {
  return (
    <figure className="scene scene-figure" data-scene-figure={scene.kind}>
      <svg viewBox={`0 0 ${sceneBox(scene).w} ${sceneBox(scene).h}`} role="img" aria-label={label}>{draw(scene, { ...initial(scene), ...state }).map(shape)}</svg>
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
