/**
 * scene@3: the one player for every interactive scene (packages/learning/src/scene.ts).
 *
 * The player holds no mathematics. It asks the engine what to draw for the current state, passes touches and slider moves
 * back to the engine, and shows the engine's readout and whether the goal is reached. A scene the engine finds a problem
 * with is not drawn. Reaching a goal writes nothing to the learner's records: a scene is a teaching picture.
 *
 * Every control is also a native slider, so a scene works by keyboard and switch access as well as by finger.
 */
import { createElement, useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent, type PointerEvent, type ReactNode, type SVGProps } from "react";
import type { Mark } from "../../../packages/learning/src/figure-marks";
import { canSpeak, sayAloud } from "./Chintu";
import { Playback, type PlayHooks } from "../../../packages/learning/src/scene-play";
import { check, controls, cue, describe, draw, draggable as follows, grip, initial, isLift, met, ownStart, remind, remindMs, nudge, pointer, press, readout, release, sceneBox, set, tallyOrder, type Scene, type SceneState, type Shape, triedLine } from "../../../packages/learning/src/scene";

/** lift@1: the lift's ding as it reaches a floor (`high` for the ground floor). Quietly nothing where there is no sound. */
let audio: AudioContext | null = null;
function ding(high: boolean) {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    audio ??= new C();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.frequency.value = high ? 1046 : 784;
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(audio.destination); o.start(); o.stop(t + 0.35);
  } catch { /* no sound */ }
}

/** `onTap`: what Enter or Space does on a thing the learner taps (boxes@1); such a shape is a focusable button. */
function shape(s: Shape, i: number, onTap?: (i: number, e: KeyboardEvent<SVGElement>) => void): JSX.Element {
  const c = `sc-${s.role}`;
  if (s.t === "rect" && s.tap) {
    const k = s.tap.i;
    return <rect key={`tap${k}`} className={c} x={s.x} y={s.y} width={s.w} height={s.h} rx={12} role="button" tabIndex={0} aria-label={s.tap.label} data-tap={k}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap?.(k, e); } }} />;
  }
  // a "roll" text is new each time it changes, so its CSS entrance (the counter's digits rolling) plays on every change
  if (s.t === "text" && s.role.includes("roll")) {
    const t = <text key={`${i}:${s.s}`} className={c} x={s.x} y={s.y} textAnchor="middle">{s.s}</text>;
    // a clipped text is drawn in its own small window (an inner svg hides what is outside it)
    return s.clip ? <svg key={i} x={s.clip.x} y={s.clip.y} width={s.clip.w} height={s.clip.h} viewBox={`${s.clip.x} ${s.clip.y} ${s.clip.w} ${s.clip.h}`} overflow="hidden">{t}</svg> : t;
  }
  if (s.t === "line") return <line key={i} className={c} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
  if (s.t === "path") return <path key={i} className={c} d={s.d} />;
  if (s.t === "rect") return <rect key={i} className={c} x={s.x} y={s.y} width={s.w} height={s.h} />;
  if (s.t === "circle" && s.tap) {
    const k = s.tap.i;
    return <circle key={`tap${k}`} className={c} cx={s.cx} cy={s.cy} r={s.r} role="button" tabIndex={0} aria-label={s.tap.label} data-tap={k}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap?.(k, e); } }} />;
  }
  if (s.t === "circle") return <circle key={i} className={c} cx={s.cx} cy={s.cy} r={s.r} />;
  return <text key={i} className={c} x={s.x} y={s.y} textAnchor="middle">{s.s}</text>;
}

/**
 * `speakNow`: the picture was opened by a tap ("Break it down"), so its instruction is said at once; otherwise it is said
 * at the learner's first touch on or near the picture (never as the page opens). `young`: a Class 1–3 child, who gets no
 * "Set by sliders" (the focused picture still answers the arrow keys).
 */
export function ScenePlayer({ scene, onReached, speakNow = false, young = false }: { scene: Scene; onReached?: () => void; speakNow?: boolean; young?: boolean }) {
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
  // the tile tapped while the lift is still moving: shown taken (faded, ticked) until its turn
  const [taken, setTaken] = useState<number | null>(null);
  // play@1: the moves played one after another; a move made while one plays (the next press, a quick tap) is queued and
  // `live` is that queued state, so the next touch builds on it and none is lost. The hooks always reach this render.
  const hooks = useRef<PlayHooks | null>(null);
  const playback = useRef<Playback | null>(null);
  playback.current ??= new Playback(scene, state, {
    state: (n) => hooks.current!.state(n), show: (p) => hooks.current!.show(p), frame: (f) => hooks.current!.frame(f), done: (n) => hooks.current!.done(n),
    queued: (a, b) => hooks.current!.queued?.(a, b), later: (fn, ms) => setTimeout(fn, ms), stop: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    still: () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  const live = { get current() { return playback.current!.live; } };
  useEffect(() => () => playback.current?.stop(), []);
  // read-aloud@1 (the counter and the lift, for a child who may not read): the prompt is said when the picture opens,
  // a refusal ("Not yet …") when it happens, and the success line when the goal is reached; a speaker button repeats
  // boxes@1 speaks every move: each picture of a move can carry a line (Frame.say), and the speaker repeats the last one
  // lift@1: the lift ride speaks every line itself, from its frames (and has its own Start), so nothing else is said
  const lift = ok && isLift(scene);
  // sort@1: the button sort, like the lift, has its own Start and Again, says its lines one after another, and reminds
  const own = ok && ownStart(scene);
  const talks = ok && (scene.kind === "boxes" || own);
  const speaks = ok && (scene.kind === "tally" || talks);
  const refusal = speaks && touched ? nudge(scene, state) : null;
  const lastSaid = useRef<string | null>(null);
  // boxes@1: the instruction is said at the first tap and that tap still counts, so the two are said as one line
  const pre = useRef<string | null>(null);
  // lift@1: its lines wait for the one being said (a floor word never cuts "Down, not up."); Start and Again begin afresh
  const say = (t?: string, fresh = false) => { if (!t) return; const line = pre.current ? `${pre.current} ${t}` : t; pre.current = null; lastSaid.current = line; sayAloud(line, undefined, own && !fresh); };
  const [doneNow, setDoneNow] = useState(false);
  // said after a tap only: as the page opens it would talk before the child has done anything (and Android Chrome blocks it)
  const said = useRef(false);
  const sayFirst = () => { if (speaks && !own && !said.current) { said.current = true; lastSaid.current = scene.prompt; sayAloud(scene.prompt); } };
  // boxes@1: the first tap only starts (says what to do), where the phone can speak: the mock's "Start"
  const starting = () => { if (!talks || own || said.current || !canSpeak()) return false; said.current = true; pre.current = scene.prompt; return false; };
  useEffect(() => { if (speakNow) sayFirst(); }, [speakNow, speaks, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (refusal && !talks) sayAloud(refusal); }, [refusal, state.refused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (speaks && !talks && doneNow && !scene.quiet) sayAloud(scene.success); }, [speaks, talks, doneNow, scene]);
  const reachedNow = useRef(false);
  // lift@1: stuck in the middle of a ride (nothing pressed for 6 s), the move is said again, a few times at most
  useEffect(() => {
    if (!own || shown !== null) return;
    const line = remind(scene, state);
    if (!line) return;
    let n = 0;
    const id = setInterval(() => { if (++n > 3) { clearInterval(id); return; } lastSaid.current = line; sayAloud(line, undefined, true); }, remindMs(scene));
    return () => clearInterval(id);
  }, [own, shown, state, scene]);
  if (!ok) return <p className="hint" role="note" data-scene="unavailable">This picture is not available.</p>;

  const gate = scene.first && picked !== scene.first.right ? scene.first : null;
  const cs = controls(scene);
  const draggable = follows(scene) && !gate;
  hooks.current = {
    state: (next) => {
      setTouched(true); setState(next);
      if (scene.kind === "array" && scene.log && triedLine(scene, next.r)) setTried((t) => (t.includes(next.r) ? t : [...t, next.r]));
    },
    show: setShown,
    frame: (f) => { say(f.say, f.fresh); if (f.sound) ding(f.sound === 2); },
    done: (next) => { setTaken(null); if (met(scene, next)) { if (!reachedNow.current) onReached?.(); reachedNow.current = true; setReached(true); setDoneNow(true); } },
    // a tile tapped while the counter is still counting is shown taken until its turn
    queued: (from, to) => { if (scene.kind === "tally" && !lift) { const was = tallyOrder(scene, from), now = tallyOrder(scene, to); if (now.length > was.length) setTaken(now[now.length - 1]); } },
    later: () => null,
  };
  const apply = (target: SceneState) => { playback.current!.apply(target); };
  const box = sceneBox(scene), busy = shown !== null, view = shown && taken !== null ? { ...shown, taken: taken + 1 } : shown ?? state;
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * box.w) / r.width, ((e.clientY - r.top) * box.h) / r.height] as const;
  };
  const move = (e: PointerEvent<SVGSVGElement>) => { const [x, y] = at(e); apply(pointer(scene, live.current, x, y, hold.current)); };
  const letGo = (e: PointerEvent<SVGSVGElement>) => { if (!dragging.current) return; dragging.current = false; const [x, y] = at(e); apply(release(scene, live.current, x, y)); };
  // (a lift ride can be ridden Again: it is done only while it stands at the end)
  const done = !busy && (own ? met(scene, state) : reached || met(scene, state));
  // boxes@1 by keyboard: Enter on a thing is a tap; focus stays on that thing, or goes to the first one left
  const tapKey = (i: number, e: KeyboardEvent<SVGElement>) => {
    if (starting() || (busy && !own)) return;
    const svg = e.currentTarget.ownerSVGElement;
    apply(press(scene, live.current, i));
    setTimeout(() => { const el = svg?.querySelector<SVGElement>(`[data-tap="${i}"]`) ?? svg?.querySelector<SVGElement>("[data-tap]"); el?.focus(); }, 0);
  };
  const line = cue(scene, view);
  // every control is also a native slider (keyboard and switch access); more than two are folded away under the picture
  const sliders = cs.map((c) => (
    <label key={c.key}>
      <span>{c.label}</span>
      <input type="range" min={c.min} max={c.max} step={c.step} value={state[c.key]} disabled={busy} onChange={(e) => apply(set(scene, state, c.key, Number(e.target.value)))} />
    </label>
  ));
  return (
    <figure className="scene" role="group" aria-label={describe(scene)} data-scene={scene.kind} data-scene-done={done ? "yes" : "no"} data-look={lift ? "lift" : undefined}
      onPointerDown={speaks ? sayFirst : undefined}
      {...(scene.kind === "tally" ? {
        // the lift by keyboard: the picture takes focus, and the arrow keys put a tile in (→ ↑) or take the last out (← ↓);
        // on a lift ride ↑ and ↓ are its two buttons, and Enter is Start
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
          if (lift) {
            const b = e.key === "ArrowUp" ? 0 : e.key === "ArrowDown" ? 1 : e.key === "Enter" ? 2 : -1;
            if (b < 0 || e.target !== e.currentTarget) return;
            e.preventDefault(); apply(press(scene, live.current, b)); return;
          }
          const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (!d || e.target !== e.currentTarget) return;
          e.preventDefault(); sayFirst();
          const n = Math.max(0, Math.min(scene.tiles.length, (live.current.dropped ?? 0) + d));
          if (n !== (live.current.dropped ?? 0)) apply(set(scene, live.current, "dropped", n));
        },
      } : {})}>
      {/* what to do is read before the picture, not found under it */}
      {!gate && <p className={`scene-goal${done && !scene.quiet ? " done" : ""}`} role="status">{done && !scene.quiet && !own ? scene.success : line ?? scene.prompt}{speaks && canSpeak() && <button type="button" className="scene-say" aria-label="Say it again" data-testid="scene-say" onPointerDown={(e) => e.stopPropagation()} onClick={() => { said.current = true; if (talks) { sayAloud(lastSaid.current ?? (own ? "Tap Start." : scene.prompt)); return; } sayAloud(refusal ?? (done && !scene.quiet ? scene.success : scene.prompt)); }}><span aria-hidden="true">🔊</span></button>}</p>}
      {!(gate && gate.hide) && <svg
        viewBox={`0 0 ${box.w} ${box.h}`}
        aria-hidden={talks ? undefined : "true"}
        className={draggable ? (scene.kind === "pick" ? "scene-drag scene-tap" : scene.kind === "boxes" || own ? "scene-drag scene-things" : "scene-drag") : undefined}
        onPointerDown={draggable ? (e) => { if (starting() || (busy && scene.kind !== "tally" && !own)) return; const [x, y] = at(e); hold.current = grip(scene, live.current, x, y); dragging.current = hold.current >= 0; if (!dragging.current && pre.current && !(e.target as Element).closest?.("[data-tap]")) { const p = pre.current; pre.current = null; lastSaid.current = p; sayAloud(p); } if (dragging.current) { e.currentTarget.setPointerCapture?.(e.pointerId); move(e); } } : undefined}
        onPointerMove={draggable ? (e) => { if (dragging.current) move(e); } : undefined}
        onPointerUp={draggable ? letGo : undefined}
        onPointerCancel={draggable ? () => { if (!dragging.current) return; dragging.current = false; apply(release(scene, live.current, -box.w, box.h)); } : undefined}
      >
        {draw(scene, view).map((d, i) => shape(d, i, tapKey))}
      </svg>}
      {/* lift@1: the sum so far, big, right under the building (as in the mock) */}
      {lift && <p className="scene-readout" aria-live="polite">{readout(scene, view)}</p>}
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
      {gate || lift || (young && (scene.kind === "tally" || talks)) ? null : cs.length > 2 || scene.kind === "commas" || scene.kind === "pick" || scene.kind === "tally" || talks ? <details className="scene-controls many"><summary>Set by sliders</summary>{sliders}</details> : <div className="scene-controls">{sliders}</div>}
      {!gate && !lift && <p className="scene-readout" aria-live="polite">{readout(scene, view)}</p>}
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
      <svg viewBox={`0 0 ${sceneBox(scene).w} ${sceneBox(scene).h}`} role="img" aria-label={label}>{draw(scene, { ...initial(scene), ...state }).map((d, i) => shape(d, i))}</svg>
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
