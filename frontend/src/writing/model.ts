import {
  CONTRACT,
  type Rect,
  type Point,
  type Region,
  type Layout,
  type Work,
  type Stroke,
  type Candidate,
  type RecognitionResult,
  type Snapshot,
  type InputPacket,
} from "./contract";
const copy = <T>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export function createWork(
  id: string,
  problem: Work["problem"],
  layout: Layout,
): Work {
  validateLayout(layout);
  return {
    contract: CONTRACT,
    id,
    problem,
    layout: copy(layout),
    revision: 0,
    updatedAt: now(),
    paper: "grid",
    strokes: [],
    erased: [],
    tokens: [],
    corrections: [],
    history: [],
    future: [],
  };
}
export function validateLayout(l: Layout) {
  if (
    l.version !== 1 ||
    !Number.isFinite(l.width) ||
    !Number.isFinite(l.height) ||
    l.width <= 0 ||
    l.height <= 0 ||
    l.width > 10000 ||
    l.height > 10000
  )
    throw Error("Invalid paper dimensions");
  for (const g of l.guides ?? [])
    if (
      typeof g.text !== "string" ||
      ![g.x, g.y, g.letterSpacing ?? 0].every(Number.isFinite)
    )
      throw Error("Invalid layout guide");
  for (const r of l.rules ?? [])
    if (
      ![r.x1, r.y1, r.x2, r.y2].every(Number.isFinite) ||
      r.x1 < 0 ||
      r.x2 > l.width ||
      r.y1 < 0 ||
      r.y2 > l.height
    )
      throw Error("Invalid layout rule");
  const ids = new Set<string>(),
    orders = new Set<number>();
  for (const r of l.regions) {
    if (
      !r.id ||
      ids.has(r.id) ||
      orders.has(r.order) ||
      !Number.isFinite(r.order) ||
      !validRect(r) ||
      r.x < 0 ||
      r.y < 0 ||
      r.x + r.width > l.width ||
      r.y + r.height > l.height
    )
      throw Error("Invalid or duplicate region");
    ids.add(r.id);
    orders.add(r.order);
  }
}
export function validRect(r: Rect) {
  return (
    [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
    r.width > 0 &&
    r.height > 0
  );
}
export function inside(p: { x: number; y: number }, r: Rect) {
  return (
    p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
  );
}
export function regionAt(p: { x: number; y: number }, regions: Region[]) {
  return regions.find((r) => inside(p, r))?.id ?? null;
}
/** All coordinates are paper units; CSS pixels/zoom never enter persisted strokes. */
export function paperPoint(
  client: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
  view: Rect,
) {
  return {
    x: view.x + ((client.x - box.left) / box.width) * view.width,
    y: view.y + ((client.y - box.top) / box.height) * view.height,
  };
}
function snapshot(w: Work): Snapshot {
  return copy({
    strokes: w.strokes,
    erased: w.erased,
    tokens: w.tokens,
    corrections: w.corrections,
  });
}
export function edit(w: Work, fn: (s: Snapshot) => void): Work {
  const s = snapshot(w);
  fn(s);
  return {
    ...w,
    ...s,
    revision: w.revision + 1,
    updatedAt: now(),
    history: [...w.history, snapshot(w)].slice(-60),
    future: [],
  };
}
export function undo(w: Work): Work {
  const s = w.history.at(-1);
  return !s
    ? w
    : {
        ...w,
        ...copy(s),
        revision: w.revision + 1,
        updatedAt: now(),
        history: w.history.slice(0, -1),
        future: [snapshot(w), ...w.future],
      };
}
export function redo(w: Work): Work {
  const s = w.future[0];
  return !s
    ? w
    : {
        ...w,
        ...copy(s),
        revision: w.revision + 1,
        updatedAt: now(),
        history: [...w.history, snapshot(w)].slice(-60),
        future: w.future.slice(1),
      };
}
export const activeStrokes = (w: Work) =>
  w.strokes.filter((s) => !w.erased.includes(s.id));
export function addStroke(w: Work, s: Stroke): Work {
  if (!s.points.length || w.strokes.some((x) => x.id === s.id))
    throw Error("Invalid stroke");
  return edit(w, (v) => {
    v.strokes.push(copy(s));
  });
}
function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    d = dx * dx + dy * dy;
  const t = d
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d))
    : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function eraseAt(w: Work, p: Point, radius = 12): Work {
  const ids = activeStrokes(w)
    .filter((s) =>
      s.points.some(
        (a, i) => segmentDistance(p, a, s.points[i + 1] ?? a) <= radius,
      ),
    )
    .map((s) => s.id);
  if (!ids.length) return w;
  return edit(w, (s) => {
    s.erased.push(...ids);
    s.tokens = s.tokens.filter(
      (t) => !t.strokeIds.some((id) => ids.includes(id)),
    );
  });
}
/** Clear hides ink without destroying originals referenced by previous corrections. */
export function clear(w: Work): Work {
  return edit(w, (s) => {
    s.erased = s.strokes.map((x) => x.id);
    s.tokens = [];
  });
}
function validateCandidate(c: Candidate, w: Work) {
  const r = w.layout.regions.find((r) => r.id === c.regionId);
  if (
    !c.id ||
    !c.text.trim() ||
    c.text.length > 500 ||
    !r ||
    !validRect(c.bounds) ||
    !inside({ x: c.bounds.x, y: c.bounds.y }, r) ||
    !inside(
      { x: c.bounds.x + c.bounds.width, y: c.bounds.y + c.bounds.height },
      r,
    ) ||
    !(
      c.confidence === null ||
      (Number.isFinite(c.confidence) && c.confidence >= 0 && c.confidence <= 1)
    ) ||
    !c.strokeIds.length ||
    c.strokeIds.some((id) => !activeStrokes(w).some((s) => s.id === id))
  )
    throw Error("Invalid recognition result");
}
export function recognize(
  w: Work,
  result: RecognitionResult,
  threshold: number,
): Work {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw Error("Invalid confidence threshold");
  if (!result.provider) throw Error("Recognition provider is missing");
  if (result.revision !== w.revision)
    throw Error("Stale recognition; original work preserved");
  const ids = new Set<string>();
  for (const c of result.candidates) {
    validateCandidate(c, w);
    if (ids.has(c.id)) throw Error("Duplicate recognition token");
    ids.add(c.id);
  }
  return edit(w, (s) => {
    const protectedTokens = s.tokens.filter((t) => t.status === "confirmed");
    const touched = new Set(result.candidates.flatMap((c) => c.strokeIds));
    s.tokens = s.tokens.filter(
      (t) =>
        t.status === "confirmed" ||
        (!ids.has(t.id) && !t.strokeIds.some((id) => touched.has(id))),
    );
    let order = Math.max(0, ...w.tokens.map((t) => t.createdOrder));
    for (const c of result.candidates) {
      if (
        protectedTokens.some(
          (t) =>
            t.id === c.id || t.strokeIds.some((id) => c.strokeIds.includes(id)),
        )
      )
        continue;
      s.tokens.push({
        ...copy(c),
        status:
          c.confidence !== null && c.confidence >= threshold
            ? "accepted"
            : "uncertain",
        origin: "recognition",
        recognizer: result.provider,
        revision: w.revision + 1,
        createdOrder:
          w.tokens.find((t) => t.id === c.id)?.createdOrder ?? ++order,
      });
    }
  });
}
export function confirm(
  w: Work,
  id: string,
  text: string,
  method: "keyboard" | "keypad" = "keyboard",
): Work {
  const token = w.tokens.find((t) => t.id === id);
  if (!token) throw Error("Missing symbol");
  if (!text.trim() || text.length > 500)
    throw Error("Enter a number or expression (up to 500 characters)");
  return edit(w, (s) => {
    const t = s.tokens.find((t) => t.id === id)!;
    s.corrections.push({
      id: uid(),
      at: now(),
      tokenId: id,
      from: t.text,
      to: text,
      strokeIds: [...t.strokeIds],
      reason: t.status === "uncertain" ? "clarification" : "student-edit",
      method,
    });
    t.text = text;
    t.status = "confirmed";
    t.revision = w.revision + 1;
  });
}
export function manual(
  w: Work,
  regionId: string,
  text: string,
  method: "keyboard" | "keypad" = "keyboard",
): Work {
  const r = w.layout.regions.find((r) => r.id === regionId);
  if (!r) throw Error("Select a writing region");
  if (!text.trim() || text.length > 500)
    throw Error("Enter a number or expression (up to 500 characters)");
  const linked = new Set(w.tokens.flatMap((t) => t.strokeIds));
  const strokes = activeStrokes(w)
    .filter((s) => s.regionId === regionId && !linked.has(s.id))
    .map((s) => s.id);
  return edit(w, (s) => {
    const id = uid();
    s.tokens.push({
      id,
      text,
      bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
      strokeIds: strokes,
      regionId,
      confidence: null,
      status: "confirmed",
      origin: "manual",
      recognizer: null,
      revision: w.revision + 1,
      createdOrder: Math.max(0, ...w.tokens.map((t) => t.createdOrder)) + 1,
    });
    s.corrections.push({
      id: uid(),
      at: now(),
      tokenId: id,
      from: "",
      to: text,
      strokeIds: strokes,
      reason: "clarification",
      method,
    });
  });
}
export function blockers(w: Work): string[] {
  const uncertain = w.tokens
    .filter((t) => t.status === "uncertain")
    .map((t) => `Clarify ${t.id}`);
  const linked = new Set(
    w.tokens
      .filter((t) => t.status !== "uncertain")
      .flatMap((t) => t.strokeIds),
  );
  if (activeStrokes(w).some((s) => !linked.has(s.id)))
    uncertain.push(
      "Some handwriting has no confirmed interpretation. Select its region and type what you meant.",
    );
  return uncertain;
}
/** Preserves region order and symbol positions; host validator determines any mathematical meaning. */
export function packet(w: Work): InputPacket {
  if (blockers(w).length)
    throw Error(
      "Clarify the input before sending; this is not a mathematical error",
    );
  const steps = [...w.layout.regions]
    .sort((a, b) => a.order - b.order)
    .map((r) => {
      const tokens = w.tokens
        .filter((t) => t.regionId === r.id)
        .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
      return {
        regionId: r.id,
        role: r.role,
        order: r.order,
        tokens: copy(tokens),
        text: tokens.map((t) => t.text).join(" "),
      };
    })
    .filter((s) => s.tokens.length);
  if (!steps.length) throw Error("Write or type at least one step");
  return {
    contract: CONTRACT,
    workId: w.id,
    revision: w.revision,
    problem: copy(w.problem),
    layout: copy(w.layout),
    strokes: copy(w.strokes),
    erasedStrokeIds: [...w.erased],
    steps,
    corrections: copy(w.corrections),
    entrySequence: [...w.tokens]
      .sort((a, b) => a.createdOrder - b.createdOrder)
      .map((t) => ({
        tokenId: t.id,
        regionId: t.regionId,
        order: t.createdOrder,
      })),
    provenance: {
      purpose: "formative-input",
      recognitionIsNotMathematicalValidation: true,
      synthetic: w.strokes.some((s) => s.synthetic),
      updatedAt: w.updatedAt,
    },
  };
}
export function freeLayout(kind = "free"): Layout {
  return {
    id: `${kind}@1`,
    version: 1,
    width: 720,
    height: 900,
    regions: [
      {
        id: "working",
        label: "Working",
        order: 0,
        role: "expression",
        x: 20,
        y: 40,
        width: 680,
        height: 840,
      },
    ],
    guides:
      kind === "coordinates"
        ? [
            {
              text: "Coordinate sketch — axes and labels are student input",
              x: 24,
              y: 28,
            },
          ]
        : [],
  };
}
/** Arbitrary operands, layout only; does not calculate quotient or diagnose steps. */
export function divisionLayout(dividend: string, divisor: string): Layout {
  if (
    !/^\d{1,8}$/.test(dividend) ||
    !/^\d{1,6}$/.test(divisor) ||
    Number(divisor) === 0
  )
    throw Error("Use a positive divisor and up to eight dividend digits");
  const roles = [
    ["quotient", "Quotient"],
    ["product-1", "Multiply: first part"],
    ["difference-1", "Subtract: first part"],
    ["bring-down-1", "Bring down a digit"],
    ["product-2", "Multiply: next part"],
    ["difference-2", "Subtract: next part"],
    ["bring-down-2", "Bring down next digit"],
    ["product-3", "Multiply: last part"],
    ["remainder", "Remainder"],
  ];
  return {
    id: "long-division@1",
    version: 1,
    width: 720,
    height: 960,
    guides: [
      { text: divisor, x: 300 - divisor.length * 22 - 20, y: 140 },
      { text: dividend, x: 325, y: 140, letterSpacing: 16 },
    ],
    rules: [
      { x1: 300, y1: 100, x2: 690, y2: 100 },
      { x1: 300, y1: 100, x2: 300, y2: 145 },
    ],
    regions: roles.map(([id, label], i) => ({
      id,
      label,
      role: id.split("-")[0],
      order: i,
      x: 300,
      y: i === 0 ? 35 : 150 + (i - 1) * 85,
      width: 390,
      height: 65,
    })),
  };
}
