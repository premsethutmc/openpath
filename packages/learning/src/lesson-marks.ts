/**
 * lesson-marks@1: the drawings of the older maths lesson pages, as data for the engine's one player (Scene.tsx, MarksSvg).
 * Each function works a drawing out from the lesson's own values; the page only says where it goes.
 */
import { marks, mk, type Mark } from "./figure-marks";
import type { UseArt } from "./uses";

/** where-used@2: our own drawings (no photographs). Plain shapes in the page's ink, so they work in light and dark. */
export function useArtMarks(art: UseArt): Mark[] {
  const ink = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const soft = { fill: "var(--brand, #2563eb)", opacity: 0.35 };
  const label = { fill: "currentColor", fontSize: 16, fontWeight: 700, textAnchor: "middle" as const };
  const body =
    art === "tower" ? [mk("line", { x1: "20", y1: "150", x2: "300", y2: "150", ...ink }), mk("g", { transform: "rotate(4 160 150)" }, mk("rect", { x: "140", y: "30", width: "40", height: "120", ...ink }), [55, 80, 105, 130].map((y) => mk("line", { x1: "140", y1: y, x2: "180", y2: y, ...ink, strokeWidth: 1.5 })), mk("rect", { x: "146", y: "14", width: "28", height: "16", ...ink })), mk("line", { x1: "160", y1: "150", x2: "160", y2: "20", ...ink, strokeWidth: 1.5, strokeDasharray: "5 6" }), mk("text", { x: "196", y: "18", ...label }, `4°`), mk("text", { x: "226", y: "142", ...label }, `86°`)] : art === "pixels" ? [[[10, 0, 0], [20, 1, 0], [30, 0, 1], [40, 1, 1]].map(([v, c, r]) => mk("g", {}, mk("rect", { x: 100 + c * 60, y: 25 + r * 60, width: "60", height: "60", fill: "currentColor", opacity: 0.1 + v / 60, stroke: "currentColor", strokeWidth: 2 }), mk("text", { x: 130 + c * 60, y: 61 + r * 60, ...label }, v)))] : art === "dosa" ? [mk("circle", { cx: "160", cy: "85", r: "65", ...ink }), mk("path", { d: "M160 85 L160 20 A65 65 0 0 1 225 85 Z", ...soft }), mk("line", { x1: "95", y1: "85", x2: "225", y2: "85", ...ink }), mk("line", { x1: "160", y1: "20", x2: "160", y2: "150", ...ink })] : art === "fence" ? [mk("rect", { x: "60", y: "35", width: "200", height: "110", ...ink, strokeDasharray: "2 12", strokeWidth: 7 }), mk("rect", { x: "60", y: "35", width: "200", height: "110", ...soft }), mk("text", { x: "160", y: "26", ...label }, `5 m`), mk("text", { x: "286", y: "96", ...label }, `3 m`)] : art === "tiles" ? [[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => mk("rect", { x: 80 + c * 40, y: 25 + r * 40, width: "40", height: "40", ...ink, strokeWidth: 2, fill: (r + c) % 2 ? "var(--brand, #2563eb)" : "none", fillOpacity: 0.3 })))] : art === "ball" ? [mk("line", { x1: "20", y1: "150", x2: "300", y2: "150", ...ink }), mk("path", { d: "M40 150 Q160 -70 280 150", ...ink, strokeDasharray: "4 8" }), mk("circle", { cx: "160", cy: "42", r: "9", fill: "currentColor" })] : art === "triangle345" ? [mk("path", { d: "M70 140 L230 140 L230 20 Z", ...ink }), mk("rect", { x: "214", y: "124", width: "16", height: "16", ...ink, strokeWidth: 2 }), mk("text", { x: "150", y: "162", ...label }, `4`), mk("text", { x: "246", y: "86", ...label }, `3`), mk("text", { x: "136", y: "70", ...label }, `5`)] : [mk("line", { x1: "20", y1: "150", x2: "300", y2: "150", ...ink }), mk("path", { d: "M215 150 L225 60 L235 30 L245 60 L255 150 Z", ...ink }), mk("circle", { cx: "60", cy: "144", r: "6", fill: "currentColor" }), mk("line", { x1: "60", y1: "144", x2: "235", y2: "30", ...ink, strokeWidth: 1.5, strokeDasharray: "5 6" }), mk("text", { x: "96", y: "140", ...label }, `45°`), mk("text", { x: "140", y: "170", ...label }, `50 m`)];
  return marks(body);
}

/** draw@1: the bar graph a child builds: the scale lines with their numbers, and one bar for each label at its height. */
export function barGraphMarks(labels: string[], h: number[], ask: { lines: number; step: number }): Mark[] {
  const W = 60 * labels.length + 50, top = 15, bottom = 195, unit = (bottom - top) / ask.lines;
  return marks([Array.from({ length: ask.lines + 1 }, (_, k) => (
            mk("g", {}, mk("line", { x1: 40, x2: W - 5, y1: bottom - k * unit, y2: bottom - k * unit, stroke: "#d0d7e2", strokeWidth: k ? 1 : 2 }), mk("text", { x: 34, y: bottom - k * unit + 4, fontSize: 10, textAnchor: "end", fill: "#334" }, k * ask.step))
          )), labels.map((l, i) => (
            mk("g", {}, mk("rect", { x: 50 + 60 * i, y: bottom - (h[i] / ask.step) * unit, width: 36, height: (h[i] / ask.step) * unit, style: { fill: "var(--brand, #2563eb)" }, rx: 3 }), mk("text", { x: 68 + 60 * i, y: bottom + 16, fontSize: 10, textAnchor: "middle", fill: "#334" }, l))
          ))]);
}

/** A compact number-line move from start to end: the line, the marks at 0, start and end, and an arrowed hop with its size. */
export function movementLineMarks(start: number, end: number): Mark[] {
  const signed = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));
  const low = Math.min(start, end, 0), high = Math.max(start, end, 0), pad = Math.max(2, Math.ceil((high - low) * .08)), from = low - pad, to = high + pad;
  const x = (value: number) => 24 + ((value - from) / (to - from || 1)) * 312;
  const mid = (x(start) + x(end)) / 2;
  return marks([mk("defs", {}, mk("marker", { id: `movement-arrow-${start}-${end}`, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "5", markerHeight: "5", orient: "auto-start-reverse" }, mk("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#6654cc" }))), mk("line", { x1: "18", y1: "76", x2: "342", y2: "76", stroke: "#252834", strokeWidth: "2" }), [0, start, end].filter((value, index, values) => values.indexOf(value) === index).map((value) => mk("g", {}, mk("line", { x1: x(value), y1: "69", x2: x(value), y2: "83", stroke: "#252834" }), mk("text", { x: x(value), y: "101", textAnchor: "middle" }, signed(value)))), mk("path", { d: `M ${x(start)} 68 Q ${mid} 13 ${x(end)} 68`, fill: "none", stroke: "#6654cc", strokeWidth: "3", markerEnd: `url(#movement-arrow-${start}-${end})` }), mk("circle", { cx: x(start), cy: "76", r: "5", fill: "#6654cc" }), mk("text", { className: "movement-label", x: mid, y: "24", textAnchor: "middle" }, signed(end - start))]);
}

/** A rectangle with its length written above and its width beside it. */
export function labelledRectMarks(length: string, width: string): Mark[] {
  return marks([mk("rect", { x: "55", y: "30", width: "210", height: "105", rx: "2" }), mk("text", { x: "160", y: "22", textAnchor: "middle" }, length), mk("text", { x: "35", y: "88", textAnchor: "middle" }, width)]);
}

/** Rows of dots: one row for each count (an array when the counts are equal, a triangle when they grow by one). */
export function dotRowsMarks(rows: number[], gap: number): Mark[] {
  return marks([rows.flatMap((count, row) => Array.from({ length: count }, (_, col) => mk("circle", { cx: 6 + gap / 2 + col * gap, cy: 6 + gap / 2 + row * gap, r: 8 })))]);
}

/** A right triangle with its two short sides a, b and its long side c written on it; a side that is asked for shows "?". */
export function rightTriangleMarks(r: { a: number | null; b: number | null; c: number | null }): Mark[] {
  return marks([mk("polygon", { points: "80,160 280,160 80,30" }), mk("polyline", { points: "80,144 96,144 96,160", fill: "none" }), mk("text", { x: "180", y: "182", textAnchor: "middle" }, r.b === null ? "b = ?" : `b = ${r.b}`), mk("text", { x: "72", y: "98", textAnchor: "end" }, r.a === null ? "a = ?" : `a = ${r.a}`), mk("text", { x: "190", y: "86", textAnchor: "start", className: r.c === null ? "asked" : "" }, r.c === null ? "c = ?" : `c = ${r.c}`)]);
}

const wedge = (cx: number, cy: number, from: number[], to: number[], radius = 28) => {
  const start = Math.atan2(from[1]-cy, from[0]-cx), end = Math.atan2(to[1]-cy, to[0]-cx);
  const delta = Math.atan2(Math.sin(end-start), Math.cos(end-start));
  return `M ${cx} ${cy} L ${cx+radius*Math.cos(start)} ${cy+radius*Math.sin(start)} A ${radius} ${radius} 0 0 ${delta>0?1:0} ${cx+radius*Math.cos(end)} ${cy+radius*Math.sin(end)} Z`;
};
/** The triangle ABC with C at (cx, cy); with the proof, the line through C parallel to AB and the three angles laid side by side on it. */
export function triangleAngleMarks(cx: number, cy: number, angles: readonly number[] | null, proof: boolean, COLORS: readonly string[]): Mark[] {
  return marks([proof && angles && mk("g", {}, [[[cx-100,cy],[40,280],COLORS[0]],[[40,280],[310,280],COLORS[2]],[[310,280],[cx+100,cy],COLORS[1]]].map(([from,to,color])=>mk("path", { d: wedge(cx,cy,from as number[],to as number[]), fill: String(color), fillOpacity: "0.22", stroke: String(color) }))), mk("polygon", { points: `40,280 310,280 ${cx},${cy}`, fill: "#eee8ff", fillOpacity: "0.45", stroke: "#34415a", strokeWidth: "2.5" }), proof && angles && [mk("path", { d: `M 12 ${cy} H 338`, stroke: "#6b7280", strokeDasharray: "6 5", strokeWidth: "2" }), mk("text", { x: "15", y: Math.max(14,cy-12), fontSize: "12" }, `parallel to AB`), mk("text", { x: cx-34, y: cy+15, fontSize: "13" }, `A`), mk("text", { x: cx+20, y: cy+24, fontSize: "13" }, `B`), mk("text", { x: "48", y: "303", fontSize: "12" }, `A + C + B make a straight angle at C`)], [[40,280,'A',COLORS[0]],[310,280,'B',COLORS[1]],[cx,cy,'C',COLORS[2]]].map(([x,y,label,color])=>mk("g", {}, mk("circle", { cx: Number(x), cy: Number(y), r: "5", fill: String(color) }), mk("text", { x: Number(x)+(label==='C'?-14:8), y: Number(y)+(label==='C'?-8:-8), fill: String(color), fontSize: "17", fontWeight: "bold" }, label)))]);
}

/** One whole cut into equal parts, with the first `selected` of them shaded. */
export function fractionStripMarks(parts: number, selected: number): Mark[] {
  return marks([Array.from({ length: parts }, (_, i) => (
                                mk("rect", { x: (i * 280) / parts, y: "2", width: 280 / parts, height: "36", fill: i < selected ? "#6755df" : "#fff", stroke: "#203047" })
                              ))]);
}

/** The graph of y = ax² + bx + c on axes from −X to X and −Y to Y, with a dot at each real root that is in view. */
export function parabolaMarks(a: number, b: number, c: number, Y: number, roots: number[]): Mark[] {
  const W = 320, H = 220, X = 6;
  const sx = (x: number) => ((x + X) / (2 * X)) * W;
  const sy = (y: number) => H / 2 - (y / Y) * (H / 2);
  const pts: string[] = [];
  for (let i = 0; i <= 240; i++) {
    const x = -X + (2 * X * i) / 240;
    const y = a * x * x + b * x + c;
    pts.push(`${sx(x).toFixed(1)},${sy(Math.max(-3 * Y, Math.min(3 * Y, y))).toFixed(1)}`);
  }
  return marks([mk("line", { x1: 0, y1: sy(0), x2: W, y2: sy(0), className: "axis" }), mk("line", { x1: sx(0), y1: 0, x2: sx(0), y2: H, className: "axis" }), [-4, -2, 2, 4].map((t) => mk("text", { x: sx(t), y: sy(0) + 14, className: "tick" }, String(t).replace("-", "−"))), mk("polyline", { points: pts.join(" "), className: "curve" }), roots.filter((r) => Math.abs(r) <= X).map((r) => mk("circle", { cx: sx(r), cy: sy(0), r: 5, className: "root" }))]);
}

/** A bar for each x in xs, as tall as (x + p)² + q; the chosen x and the lowest bar are marked. */
export function minimumBarsMarks(xs: number[], p: number, q: number, x: number): Mark[] {
  const centre = -p, f = (v: number) => (v + p) ** 2 + q, top = f(xs[0]), W = 300, H = 150, bw = W / xs.length;
  return marks([xs.map((v, i) => {
          const h = (f(v) / top) * H;
          return (
            mk("g", {}, mk("rect", { x: i * bw + 4, y: H - h, width: bw - 8, height: h, className: v === x ? "mbar on" : v === centre ? "mbar min" : "mbar" }), mk("text", { x: i * bw + bw / 2, y: H + 14, className: "tile-label" }, String(v).replace("-", "−")))
          );
        })]);
}

/** Algebra tiles for x² + bx: the x-by-x square, strips on the right and at the bottom, the missing corner, and the unit tiles put in it. */
export function algebraTilesMarks(right: number, bottom: number, filled: number): Mark[] {
  const X = 120, u = 12, pad = 22, corner = right * bottom;
  const tiles: Mark[] = [];
  for (let k = 0; k < Math.min(filled, corner); k++) {
    const c = k % Math.max(right, 1), r = Math.floor(k / Math.max(right, 1));
    tiles.push(mk("rect", { x: pad + X + c * u, y: pad + X + r * u, width: u, height: u, className: "tile-unit" }));
  }
  return marks([mk("text", { x: pad + X / 2, y: pad - 7, className: "tile-label" }, `x`), mk("text", { x: pad - 12, y: pad + X / 2, className: "tile-label" }, `x`), mk("rect", { x: pad, y: pad, width: X, height: X, className: "tile-x2" }), mk("text", { x: pad + X / 2, y: pad + X / 2 + 6, className: "tile-name" }, `x²`), Array.from({ length: right }, (_, i) => mk("rect", { x: pad + X + i * u, y: pad, width: u, height: X, className: "tile-x" })), Array.from({ length: bottom }, (_, j) => mk("rect", { x: pad, y: pad + X + j * u, width: X, height: u, className: "tile-x" })), corner > 0 && filled < corner && mk("rect", { x: pad + X, y: pad + X, width: right * u, height: bottom * u, className: "tile-gap" }), tiles, right > 0 && mk("text", { x: pad + X + (right * u) / 2, y: pad - 7, className: "tile-label" }, right), bottom > 0 && mk("text", { x: pad - 12, y: pad + X + (bottom * u) / 2 + 4, className: "tile-label" }, bottom)]);
}

/* fraction bars: fractions as bars cut into equal parts, for addition, comparison and equivalence */
const BAR_COLORS = [
  { fill: "#4a8fe7", stroke: "#3570b8", label: "A" },
  { fill: "#e7824a", stroke: "#b86435", label: "B" },
  { fill: "#47b87a", stroke: "#358f5e", label: "Result" },
];

const BAR_HEIGHT = 48;
const BAR_GAP = 16;
const LABEL_WIDTH = 48;
const BAR_WIDTH = 280;

interface FractionInfo {
  numerator: number;
  denominator: number;
}

function FractionBar({
  fraction,
  colorIndex,
  y,
  width,
  highlight,
}: {
  fraction: FractionInfo;
  colorIndex: number;
  y: number;
  width: number;
  highlight?: number; // how many segments to highlight
}): Mark {
  const { numerator, denominator } = fraction;
  const color = BAR_COLORS[colorIndex % BAR_COLORS.length];
  const segW = width / denominator;
  const filled = highlight ?? numerator;

  return mk("g", {}, mk("text", { x: 0, y: y + BAR_HEIGHT / 2 + 5, className: "lr-frac-label", fill: "var(--lr-text)", fontSize: "15", fontWeight: "600" }, `${numerator}/${denominator}`), Array.from({ length: denominator }, (_, i) => (
        mk("rect", { x: LABEL_WIDTH + i * segW, y: y, width: segW - 2, height: BAR_HEIGHT, rx: 4, fill: i < filled ? color.fill : "var(--lr-surface-warm, #f5f0e8)", stroke: i < filled ? color.stroke : "var(--lr-border, #d4c9b8)", strokeWidth: 1.5, opacity: i < filled ? 1 : 0.5 })
      )));
}
/** The bars for one or two fractions; for an addition, the result bar under a line. Returns the box they need as well. */
export function fractionBarsMarks(params: { fractions: FractionInfo[]; operation: string; showEquivalent?: boolean }): { width: number; height: number; marks: Mark[] } {
  const { fractions, operation, showEquivalent } = params;
  const barCount = fractions.length + (operation === "add" ? 1 : 0);
  const totalHeight = barCount * (BAR_HEIGHT + BAR_GAP) + 24;
  const svgWidth = LABEL_WIDTH + BAR_WIDTH + 16;

  // For addition: compute result
  let resultFraction: FractionInfo | null = null;
  if (operation === "add" && fractions.length === 2) {
    const [a, b] = fractions;
    if (a.denominator === b.denominator) {
      resultFraction = { numerator: a.numerator + b.numerator, denominator: a.denominator };
    } else {
      // Cross multiply for common denominator
      const cd = a.denominator * b.denominator;
      resultFraction = {
        numerator: a.numerator * b.denominator + b.numerator * a.denominator,
        denominator: cd,
      };
    }
  }
  return { width: svgWidth, height: totalHeight, marks: marks([fractions.map((f, i) => (
          mk("g", {}, FractionBar({ fraction: f, colorIndex: i, y: i * (BAR_HEIGHT + BAR_GAP) + 8, width: BAR_WIDTH }))
        )), fractions.length === 2 && (
          mk("text", { x: svgWidth / 2, y: (BAR_HEIGHT + BAR_GAP) - 2, textAnchor: "middle", fontSize: "18", fontWeight: "bold", fill: "var(--lr-text-muted, #666)" }, operation === "add" ? "+" : operation === "subtract" ? "−" : operation === "compare" ? "vs" : "")
        ), resultFraction && (
          [mk("line", { x1: LABEL_WIDTH, y1: fractions.length * (BAR_HEIGHT + BAR_GAP) - 4, x2: LABEL_WIDTH + BAR_WIDTH, y2: fractions.length * (BAR_HEIGHT + BAR_GAP) - 4, stroke: "var(--lr-border-strong, #888)", strokeWidth: 2 }), FractionBar({ fraction: resultFraction, colorIndex: 2, y: fractions.length * (BAR_HEIGHT + BAR_GAP) + 8, width: BAR_WIDTH }), mk("text", { x: 0, y: fractions.length * (BAR_HEIGHT + BAR_GAP) - 8, fontSize: "13", fill: "var(--lr-text-muted, #666)" }, `=`)]
        ), showEquivalent && resultFraction && resultFraction.numerator > 1 && (
          mk("text", { x: LABEL_WIDTH + BAR_WIDTH + 8, y: fractions.length * (BAR_HEIGHT + BAR_GAP) + BAR_HEIGHT / 2 + 12, fontSize: "12", fill: "var(--lr-text-muted, #666)" }, `= ${simplify(resultFraction.numerator, resultFraction.denominator)}`)
        )]) };
}
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function simplify(num: number, den: number): string {
  const g = gcd(num, den);
  const sn = num / g;
  const sd = den / g;
  if (sd === 1) return `${sn}`;
  return `${sn}/${sd}`;
}
