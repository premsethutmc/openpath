import { HANDWRITING_ENABLED } from "./features";
import { useRef, useState, type PointerEvent as ReactPointer } from "react";
import type { Work, Point, Stroke, Rect } from "./contract";
import { activeStrokes, addStroke, eraseAt, regionAt, uid } from "./model";
export type Tool = "ink" | "eraser" | "pan";
const path = (a: Point, b: Point) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
function Ink({ stroke, ghost = false }: { stroke: Stroke; ghost?: boolean }) {
  return (
    <g opacity={ghost ? 0.25 : 1} data-stroke={stroke.id} pointerEvents="none">
      {stroke.points.map((p, i) =>
        i ? (
          <path
            key={i}
            d={path(stroke.points[i - 1], p)}
            strokeWidth={stroke.width * (0.45 + 0.9 * p.pressure)}
          />
        ) : (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={stroke.width / 2}
            fill="currentColor"
            stroke="none"
          />
        ),
      )}
    </g>
  );
}
function InkSurface({
  work,
  onChange,
  tool,
  stylusOnly,
  zoom,
  onZoom,
  selected,
  onSelect,
}: {
  work: Work;
  onChange: (w: Work) => void;
  tool: Tool;
  stylusOnly: boolean;
  zoom: number;
  onZoom: (n: number) => void;
  selected: string;
  onSelect: (r: string) => void;
}) {
  const ref = useRef<SVGSVGElement>(null),
    draft = useRef<Stroke | null>(null),
    current = useRef(work);
  current.current = work;
  const update = (next: Work) => {
    current.current = next;
    onChange(next);
  };
  const [preview, setPreview] = useState<Stroke | null>(null),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(
      new Map<number, { x: number; y: number; type: string }>(),
    ),
    gesture = useRef<{ distance: number; zoom: number } | null>(null),
    owner = useRef<number | null>(null);
  const view: Rect = {
    x: Math.min(pan.x, work.layout.width - work.layout.width / zoom),
    y: Math.min(pan.y, work.layout.height - work.layout.height / zoom),
    width: work.layout.width / zoom,
    height: work.layout.height / zoom,
  };
  const point = (e: PointerEvent): Point => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      ref.current!.getScreenCTM()!.inverse(),
    );
    return {
      x: p.x,
      y: p.y,
      t: e.timeStamp,
      pressure:
        e.pointerType === "mouse"
          ? 0.5
          : Math.max(
              0,
              Math.min(1, Number.isFinite(e.pressure) ? e.pressure : 0.5),
            ),
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      twist: e.twist || 0,
      ...(Number.isFinite(e.tangentialPressure)
        ? { tangentialPressure: e.tangentialPressure }
        : {}),
      ...(Number.isFinite(e.altitudeAngle)
        ? { altitudeAngle: e.altitudeAngle }
        : {}),
      ...(Number.isFinite(e.azimuthAngle)
        ? { azimuthAngle: e.azimuthAngle }
        : {}),
    };
  };
  const touchDistance = () => {
    const a = [...pointers.current.values()].filter((p) => p.type === "touch");
    return a.length === 2 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0;
  };
  function down(e: ReactPointer<SVGSVGElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (
      e.pointerType === "touch" &&
      (stylusOnly ||
        [...pointers.current.values()].some((p) => p.type === "pen"))
    )
      return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
    if (e.pointerType === "pen") {
      for (const [id, p] of pointers.current) {
        if (p.type === "touch") pointers.current.delete(id);
      }
      gesture.current = null;
    }
    if (e.pointerType === "pen" && draft.current?.pointerType === "touch") {
      draft.current = null;
      setPreview(null);
      owner.current = null;
    }
    if (e.pointerType === "touch" && touchDistance()) {
      gesture.current = { distance: touchDistance(), zoom };
      draft.current = null;
      setPreview(null);
      owner.current = null;
      return;
    }
    if (owner.current !== null) return;
    owner.current = e.pointerId;
    const p = point(e.nativeEvent);
    const region = regionAt(p, work.layout.regions);
    if (region) onSelect(region);
    if (tool === "ink") {
      draft.current = {
        id: uid(),
        pointerType:
          e.pointerType === "pen"
            ? "pen"
            : e.pointerType === "touch"
              ? "touch"
              : "mouse",
        startedAt: new Date().toISOString(),
        timeOrigin: performance.timeOrigin,
        pointerId: e.pointerId,
        contact: { width: e.width, height: e.height },
        points: [p],
        regionId: region ?? selected,
        width: 3,
        tool: "ink",
      };
      setPreview({ ...draft.current });
    }
    if (tool === "eraser") update(eraseAt(current.current, p));
  }
  function move(e: ReactPointer<SVGSVGElement>) {
    const old = pointers.current.get(e.pointerId);
    if (!old) return;
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
    if (gesture.current && touchDistance()) {
      onZoom(
        Math.max(
          1,
          Math.min(
            4,
            (gesture.current.zoom * touchDistance()) / gesture.current.distance,
          ),
        ),
      );
      return;
    }
    if (owner.current !== e.pointerId) return;
    if (tool === "pan") {
      const b = ref.current!.getBoundingClientRect();
      setPan((v) => ({
        x: Math.max(
          0,
          Math.min(
            work.layout.width - view.width,
            v.x - ((e.clientX - old.x) / b.width) * view.width,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            work.layout.height - view.height,
            v.y - ((e.clientY - old.y) / b.height) * view.height,
          ),
        ),
      }));
      return;
    }
    if (tool === "eraser") {
      update(eraseAt(current.current, point(e.nativeEvent)));
      return;
    }
    if (draft.current) {
      const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const sample of samples.length ? samples : [e.nativeEvent])
        draft.current.points.push(point(sample));
      setPreview({ ...draft.current, points: [...draft.current.points] });
    }
  }
  function end(e: ReactPointer<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (owner.current !== e.pointerId) return;
    if (draft.current && e.type !== "pointercancel") {
      const s = draft.current;
      s.points.push(point(e.nativeEvent));
      update(addStroke(current.current, s));
    }
    draft.current = null;
    setPreview(null);
    owner.current = null;
  }
  return (
    <svg
      ref={ref}
      className="writing-paper"
      role="img"
      aria-label="Mathematical writing paper. Use finger, pen or mouse; typing controls are below."
      viewBox={`${Math.min(pan.x, work.layout.width - view.width)} ${Math.min(pan.y, work.layout.height - view.height)} ${view.width} ${view.height}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      style={{ aspectRatio: `${work.layout.width}/${work.layout.height}` }}
    >
      <defs>
        <pattern
          id={`paper-${work.id}`}
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d={work.paper === "ruled" ? "M0 25H25" : "M25 0H0V25"}
            fill="none"
            stroke="#ddd9ed"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        width={work.layout.width}
        height={work.layout.height}
        fill={work.paper === "blank" ? "white" : `url(#paper-${work.id})`}
      />
      {work.layout.regions.map((r) => (
        <g key={r.id}>
          <rect
            {...{ x: r.x, y: r.y, width: r.width, height: r.height }}
            fill={selected === r.id ? "#d5f5e633" : "transparent"}
            stroke={selected === r.id ? "#6551c8" : "#cbc5db"}
            strokeDasharray="4 4"
          />
          <text
            x={r.x - 12}
            y={r.y + 35}
            textAnchor="end"
            fontSize="18"
            fill="#403651"
          >
            {r.label}
          </text>
        </g>
      ))}
      {work.layout.rules?.map((r, i) => (
        <line
          key={i}
          {...r}
          stroke="#29233e"
          strokeWidth="2"
          pointerEvents="none"
        />
      ))}
      {work.layout.guides?.map((g, i) => (
        <text
          key={i}
          x={g.x}
          y={g.y}
          fontSize="32"
          fontFamily="monospace"
          letterSpacing={g.letterSpacing ?? 0}
        >
          {g.text}
        </text>
      ))}
      <g
        fill="none"
        stroke="#202138"
        color="#202138"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {activeStrokes(work).map((s) => (
          <Ink key={s.id} stroke={s} />
        ))}
        {preview && <Ink stroke={preview} />}
      </g>
      {work.tokens.map((t) => (
        <g key={t.id} pointerEvents="none">
          <rect
            {...t.bounds}
            fill="none"
            stroke={t.status === "uncertain" ? "#b45309" : "#6551c8"}
            strokeWidth={t.status === "uncertain" ? 3 : 1}
          />
          <text
            x={t.bounds.x}
            y={t.bounds.y - 4}
            fontSize="15"
            fill={t.status === "uncertain" ? "#92400e" : "#4c388d"}
          >
            {t.status === "uncertain" ? "Type this symbol" : t.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Defense in depth for future embeddings and old direct links. */
export function Surface(props: Parameters<typeof InkSurface>[0]) {
  return HANDWRITING_ENABLED ? <InkSurface {...props} /> : null;
}
