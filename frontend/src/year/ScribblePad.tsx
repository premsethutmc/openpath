/**
 * scribble@1: scratch paper on the screen. The child draws or writes with a finger, as they would in a rough notebook.
 * Nothing here is read, marked, recorded or sent: checked working is typed (the lines above). So it is not help, and it is
 * there in tests too, like paper on the desk. The strokes last for the question and are gone with it.
 *
 * scribble@2: the same rough paper can be typed on (a child who would rather use the keyboard than a finger). The typed
 * notes are as unread as the drawing: they are not the checked working and go nowhere.
 *
 * scribble-grows@1: the paper is never full. A stroke that ends near the bottom adds more room underneath (as turning
 * to a longer page would), up to a long sheet, and "More room" adds it by hand; typed notes grow as they are written.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";

type Stroke = [number, number][];
const W = 640, H = 420, MORE = 280, MOST = H * 5;

export function ScribblePad() {
  const [open, setOpen] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [notes, setNotes] = useState("");
  const [h, setH] = useState(H);
  const grow = () => setH((n) => Math.min(MOST, n + MORE));
  const notesBox = useRef<HTMLTextAreaElement>(null);
  // typed notes: the box is as tall as what is written in it (and a little more), never a fixed window
  useEffect(() => { const t = notesBox.current; if (t) { t.style.height = "auto"; t.style.height = `${t.scrollHeight + 24}px`; } }, [notes, mode, open]);
  const live = useRef<Stroke | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = (all: Stroke[]) => {
    const c = canvas.current, g = c?.getContext("2d");
    if (!c || !g) return;
    g.clearRect(0, 0, W, h);
    g.strokeStyle = getComputedStyle(c).color || "#222";
    g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    for (const s of all) {
      g.beginPath();
      s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (s.length === 1) g.lineTo(s[0][0] + 0.1, s[0][1] + 0.1);
      g.stroke();
    }
  };
  useEffect(() => { if (open && mode === "draw") paint(strokes); }); // eslint-disable-line react-hooks/exhaustive-deps
  const at = (e: PointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * h) / r.height]; };
  const down = (e: PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); live.current = [at(e)]; paint([...strokes, live.current]); };
  const move = (e: PointerEvent<HTMLCanvasElement>) => { if (!live.current) return; live.current.push(at(e)); paint([...strokes, live.current]); };
  const up = () => { if (!live.current) return; const s = live.current; live.current = null; setStrokes((all) => [...all, s]); if (s.some(([, y]) => y > h - MORE * 0.6)) grow(); };
  if (!open) return <button type="button" className="link scribble-open" data-testid="scribble-open" onClick={() => setOpen(true)}><span aria-hidden="true">✏️ </span>Scribble pad</button>;
  return (
    <div className="scribble" data-testid="scribble" data-strokes={strokes.length} data-mode={mode}>
      <div className="kid-taps scribble-modes" role="radiogroup" aria-label="How to use the pad">
        <button type="button" role="radio" aria-checked={mode === "draw"} className={`kid-tap${mode === "draw" ? " on" : ""}`} onClick={() => setMode("draw")}><span aria-hidden="true">✏️ </span>Draw</button>
        <button type="button" role="radio" aria-checked={mode === "type"} className={`kid-tap${mode === "type" ? " on" : ""}`} onClick={() => setMode("type")}><span aria-hidden="true">⌨️ </span>Type</button>
      </div>
      {mode === "draw"
        ? <canvas ref={canvas} width={W} height={h} style={{ aspectRatio: `${W} / ${h}` }} aria-label="Scribble pad: rough work, not checked" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        : <textarea ref={notesBox} className="scribble-notes" rows={6} aria-label="Rough notes: not checked" placeholder="Type anything here. It is only for you." autoComplete="off" autoCorrect="off" spellCheck={false} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      <div className="scribble-bar">
        <span className="small muted">Rough work. Nobody checks this.</span>
        {mode === "draw" && <button type="button" className="link" data-testid="scribble-more" disabled={h >= MOST} onClick={grow}>More room</button>}
        {mode === "draw" && <button type="button" className="link" disabled={!strokes.length} onClick={() => setStrokes((all) => all.slice(0, -1))}>Undo</button>}
        <button type="button" className="link" disabled={mode === "draw" ? !strokes.length : !notes} onClick={() => (mode === "draw" ? (setStrokes([]), setH(H)) : setNotes(""))}>Clear</button>
        <button type="button" className="link" onClick={() => setOpen(false)}>Hide</button>
      </div>
    </div>
  );
}
