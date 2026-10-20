import {
  CONTRACT,
  type Work,
  type WorkStore,
  type Recognizer,
  type Validator,
  type Candidate,
  type Stroke,
  type Point,
  type Layout,
} from "./contract";
import { createWork, validateLayout, validRect } from "./model";
export const unavailableRecognizer: Recognizer = {
  id: "unavailable@1",
  available: () => false,
  async recognize() {
    throw Error(
      "Recognition is unavailable. Type the number or expression instead.",
    );
  },
};
/** Local mock transports input only. Deliberately has no maths correctness or diagnostic implementation. */
export const receiptValidator: Validator = {
  async submit(p) {
    return {
      contract: CONTRACT,
      workId: p.workId,
      revision: p.revision,
      status: "received",
      messages: p.steps.map((s) => ({
        regionId: s.regionId,
        text: `Received: ${s.text}. Mathematical validation is not connected.`,
        kind: "information",
      })),
    };
  },
};
export function restore(text: string): Work {
  if (text.length > 8_000_000)
    throw Error("Draft exceeds the local workspace size limit");
  const w = JSON.parse(text) as Work;
  if (
    !w ||
    w.contract !== CONTRACT ||
    typeof w.id !== "string" ||
    !w.problem ||
    typeof w.problem.id !== "string" ||
    !Number.isFinite(Date.parse(w.updatedAt)) ||
    w.revision < 0 ||
    typeof w.problem.statement !== "string" ||
    !Number.isInteger(w.revision) ||
    !["blank", "grid", "ruled"].includes(w.paper) ||
    !Array.isArray(w.history) ||
    !Array.isArray(w.future) ||
    w.history.length > 60 ||
    w.future.length > 60
  )
    throw Error(
      "Unsupported or damaged writing draft; original storage was not overwritten",
    );
  validateLayout(w.layout);
  for (const s of [w, ...w.history, ...w.future]) {
    if (
      !Array.isArray(s.strokes) ||
      !Array.isArray(s.tokens) ||
      !Array.isArray(s.erased) ||
      !Array.isArray(s.corrections) ||
      s.strokes.length > 10000 ||
      new Set(s.strokes.map((x) => x.id)).size !== s.strokes.length
    )
      throw Error("Invalid draft snapshot");
    let points = 0;
    for (const stroke of s.strokes) {
      if (
        !stroke.id ||
        !["pen", "touch", "mouse"].includes(stroke.pointerType) ||
        !Number.isFinite(stroke.width) ||
        stroke.width <= 0 ||
        !Array.isArray(stroke.points) ||
        !stroke.points.length
      )
        throw Error("Invalid stroke");
      for (const p of stroke.points) {
        points++;
        if (
          ![p.x, p.y, p.t, p.pressure, p.tiltX, p.tiltY, p.twist].every(
            Number.isFinite,
          ) ||
          p.pressure < 0 ||
          p.pressure > 1
        )
          throw Error("Invalid pen sample");
      }
      if (points > 200000) throw Error("Too many pen samples");
    }
    if (new Set(s.tokens.map((t) => t.id)).size !== s.tokens.length)
      throw Error("Duplicate interpreted symbol");
    for (const c of s.corrections) {
      if (
        !c.id ||
        typeof c.from !== "string" ||
        typeof c.to !== "string" ||
        !["keyboard", "keypad"].includes(c.method) ||
        !Number.isFinite(Date.parse(c.at)) ||
        !Array.isArray(c.strokeIds) ||
        c.strokeIds.some((id) => !s.strokes.some((x) => x.id === id))
      )
        throw Error("Invalid correction history");
    }
    for (const t of s.tokens) {
      if (
        typeof t.id !== "string" ||
        typeof t.text !== "string" ||
        !t.text.trim() ||
        t.text.length > 500 ||
        !Number.isInteger(t.createdOrder) ||
        t.createdOrder < 1 ||
        !["manual", "recognition"].includes(t.origin) ||
        !(
          t.confidence === null ||
          (Number.isFinite(t.confidence) &&
            t.confidence >= 0 &&
            t.confidence <= 1)
        ) ||
        !["accepted", "uncertain", "confirmed"].includes(t.status) ||
        !w.layout.regions.some((r) => r.id === t.regionId) ||
        !validRect(t.bounds) ||
        !Array.isArray(t.strokeIds) ||
        t.strokeIds.some((id) => !s.strokes.some((x) => x.id === id))
      )
        throw Error("Invalid interpreted symbol");
    }
    if (s.erased.some((id) => !s.strokes.some((x) => x.id === id)))
      throw Error("Invalid erased stroke reference");
  }
  return w;
}
/** Host may replace with an authenticated draft repository. No new learner or evidence store is created here. */
export class BrowserWorkStore implements WorkStore {
  constructor(
    private storage: Storage,
    private prefix = "openpath:math-input@1:",
  ) {}
  async load(id: string) {
    const s = this.storage.getItem(this.prefix + id);
    const w = s === null ? null : restore(s);
    if (w && w.id !== id) throw Error("Draft identity mismatch");
    return w;
  }
  async save(w: Work) {
    const text = JSON.stringify(w);
    restore(text);
    this.storage.setItem(this.prefix + w.id, text);
  }
}
const segments: Record<string, number[]> = {
  "0": [0, 1, 2, 3, 4, 5],
  "1": [1, 2],
  "2": [0, 1, 6, 4, 3],
  "3": [0, 1, 6, 2, 3],
  "4": [5, 6, 1, 2],
  "5": [0, 5, 6, 2, 3],
  "6": [0, 5, 6, 4, 2, 3],
  "7": [0, 1, 2],
  "8": [0, 1, 2, 3, 4, 5, 6],
  "9": [0, 5, 1, 6, 2, 3],
};
const lines = [
  [
    [0, 0],
    [20, 0],
  ],
  [
    [20, 0],
    [20, 20],
  ],
  [
    [20, 20],
    [20, 40],
  ],
  [
    [0, 40],
    [20, 40],
  ],
  [
    [0, 20],
    [0, 40],
  ],
  [
    [0, 0],
    [0, 20],
  ],
  [
    [0, 20],
    [20, 20],
  ],
];
/** Explicitly synthetic vector traces, not a handwriting model or a recognizer for student ink. */
export function divisionFixture(
  layout: Layout,
  kind: "correct" | "incorrect" | "ambiguous",
) {
  const values = ["126", "3", "0", "7", "6", "1", "19", "18", "1"];
  if (kind === "incorrect") values[4] = "8";
  const strokes: Stroke[] = [],
    candidates: Candidate[] = [];
  let time = 0;
  layout.regions.forEach((r, i) => {
    const text = values[i] ?? "1";
    [...text].forEach((digit, j) => {
      const ids: string[] = [];
      for (const n of segments[digit]) {
        const id = `sample:${kind}:${i}:${j}:${n}`;
        ids.push(id);
        const points: Point[] = lines[n].map(([x, y]) => ({
          x: r.x + 25 + j * 35 + x,
          y: r.y + 12 + y,
          t: (time += 12),
          pressure: 0.6,
          tiltX: 15,
          tiltY: 5,
          twist: 0,
        }));
        strokes.push({
          id,
          pointerType: "pen",
          startedAt: "2026-10-20T10:00:00Z",
          points,
          regionId: r.id,
          width: 3,
          tool: "ink",
          synthetic: true,
        });
      }
      candidates.push({
        id: `sample-token:${i}:${j}`,
        text: digit,
        bounds: { x: r.x + 20 + j * 35, y: r.y + 8, width: 30, height: 50 },
        strokeIds: ids,
        regionId: r.id,
        confidence: kind === "ambiguous" && i === 7 && j === 1 ? 0.52 : 0.98,
        alternatives:
          kind === "ambiguous" && i === 7 && j === 1 ? ["8", "3"] : undefined,
      });
    });
  });
  return { strokes, candidates };
}
export function fixtureWork(
  id: string,
  layout: Layout,
  kind: "correct" | "incorrect" | "ambiguous",
): Work {
  const w = createWork(
    id,
    { id: "division:379:3", statement: "379 ÷ 3" },
    layout,
  );
  w.strokes = divisionFixture(layout, kind).strokes;
  return w;
}
export function fixtureRecognizer(
  kind: "correct" | "incorrect" | "ambiguous",
): Recognizer {
  return {
    id: `synthetic-recognition:${kind}@1`,
    available: () => true,
    async recognize(req, signal) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const expected = divisionFixture(
        {
          id: "fixture",
          version: 1,
          width: 720,
          height: 960,
          regions: req.regions,
        },
        kind,
      );
      if (
        req.strokes.length !== expected.strokes.length ||
        req.strokes.some(
          (s, i) =>
            !s.synthetic ||
            JSON.stringify(s) !== JSON.stringify(expected.strokes[i]),
        )
      )
        throw Error(
          "Synthetic recognizer accepts only its unchanged sample. Type your own writing instead.",
        );
      return {
        revision: req.revision,
        candidates: expected.candidates,
        provider: `synthetic-recognition:${kind}@1`,
      };
    },
  };
}
