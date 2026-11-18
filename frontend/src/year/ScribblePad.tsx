/**
 * scribble@1: scratch paper on the screen. The child draws or writes with a finger, as they would in a rough notebook.
 * Nothing here is read, marked, recorded or sent: checked working is typed (the lines above). So it is not help, and it is
 * there in tests too, like paper on the desk. The strokes last for the question and are gone with it.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";

type Stroke = [number, number][];
const W = 640, H = 420;

export function ScribblePad() {
  const [open, setOpen] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const live = useRef<Stroke | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = (all: Stroke[]) => {
    const c = canvas.current, g = c?.getContext("2d");
    if (!c || !g) return;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = getComputedStyle(c).color || "#222";
    g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    for (const s of all) {
      g.beginPath();
      s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (s.length === 1) g.lineTo(s[0][0] + 0.1, s[0][1] + 0.1);
      g.stroke();
    }
  };
  useEffect(() => { if (open) paint(strokes); }); // eslint-disable-line react-hooks/exhaustive-deps
  const at = (e: PointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
  const down = (e: PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); live.current = [at(e)]; paint([...strokes, live.current]); };
  const move = (e: PointerEvent<HTMLCanvasElement>) => { if (!live.current) return; live.current.push(at(e)); paint([...strokes, live.current]); };
  const up = () => { if (!live.current) return; const s = live.current; live.current = null; setStrokes((all) => [...all, s]); };
  if (!open) return <button type="button" className="link scribble-open" data-testid="scribble-open" onClick={() => setOpen(true)}><span aria-hidden="true">✏️ </span>Scribble pad</button>;
  return (
    <div className="scribble" data-testid="scribble" data-strokes={strokes.length}>
      <canvas ref={canvas} width={W} height={H} aria-label="Scribble pad: rough work, not checked" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className="scribble-bar">
        <span className="small muted">Rough work. Nobody checks this.</span>
        <button type="button" className="link" disabled={!strokes.length} onClick={() => setStrokes((all) => all.slice(0, -1))}>Undo</button>
        <button type="button" className="link" disabled={!strokes.length} onClick={() => setStrokes([])}>Clear</button>
        <button type="button" className="link" onClick={() => setOpen(false)}>Hide</button>
      </div>
    </div>
  );
}
