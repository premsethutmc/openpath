import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTRACT, type Point, type Stroke, type Candidate } from "./contract";
import {
  createWork,
  divisionLayout,
  freeLayout,
  addStroke,
  activeStrokes,
  eraseAt,
  undo,
  redo,
  clear,
  paperPoint,
  regionAt,
  recognize,
  confirm,
  manual,
  packet,
  blockers,
  validateLayout,
} from "./model";
import {
  BrowserWorkStore,
  restore,
  fixtureWork,
  fixtureRecognizer,
  receiptValidator,
  unavailableRecognizer,
} from "./adapters";
const layout = divisionLayout("379", "3");
const fresh = () =>
  createWork("test", { id: "division:379:3", statement: "379 ÷ 3" }, layout);
const point = (x = 330, y = 55): Point => ({
  x,
  y,
  t: 5,
  pressure: 0.4,
  tiltX: 22,
  tiltY: 4,
  twist: 20,
});
const stroke = (id = "s1"): Stroke => ({
  id,
  points: [point(), point(350)],
  regionId: "quotient",
  pointerType: "pen",
  tool: "ink",
  startedAt: "2026-10-20T01:00:00Z",
  width: 3,
});
const candidate = (confidence: number | null = 0.95): Candidate => ({
  id: "c1",
  regionId: "quotient",
  bounds: { x: 320, y: 40, width: 50, height: 50 },
  strokeIds: ["s1"],
  text: "2",
  confidence,
});
const result = (
  w: ReturnType<typeof fresh>,
  confidence: number | null = 0.95,
) => ({
  provider: "test@1",
  revision: w.revision,
  candidates: [candidate(confidence)],
});
test("pen metadata and replay survive immutable edits; region mapping is geometric", () => {
  const original = fresh(),
    w = addStroke(original, stroke());
  assert.equal(original.strokes.length, 0);
  assert.deepEqual(w.strokes[0], stroke());
  assert.equal(regionAt(point(), layout.regions), "quotient");
  assert.equal(regionAt(point(1, 1), layout.regions), null);
  assert.deepEqual(restore(JSON.stringify(w)), w);
});
test("eraser hits segments between sparse samples; undo, redo and clear retain originals", () => {
  const w = addStroke(fresh(), stroke());
  const erased = eraseAt(w, point(340), 2);
  assert.equal(activeStrokes(erased).length, 0);
  assert.equal(erased.strokes.length, 1);
  assert.equal(activeStrokes(undo(erased)).length, 1);
  assert.equal(activeStrokes(redo(undo(erased))).length, 0);
  assert.equal(activeStrokes(clear(w)).length, 0);
  assert.equal(undo(clear(w)).strokes.length, 1);
});
test("paper coordinates align after resizing and zoom/pan", () => {
  assert.deepEqual(
    paperPoint(
      { x: 160, y: 200 },
      { left: 10, top: 20, width: 300, height: 400 },
      { x: 100, y: 50, width: 360, height: 480 },
    ),
    { x: 280, y: 266 },
  );
  assert.deepEqual(
    paperPoint(
      { x: 310, y: 380 },
      { left: 10, top: 20, width: 600, height: 800 },
      { x: 100, y: 50, width: 360, height: 480 },
    ),
    { x: 280, y: 266 },
  );
});
for (const [confidence, threshold, expected] of [
  [0.9, 0.9, "accepted"],
  [0.899, 0.9, "uncertain"],
  [null, 0.9, "uncertain"],
  [0.98, 0.99, "uncertain"],
  [1, 1, "accepted"],
] as const)
  test(`confidence ${confidence}, threshold ${threshold} gives ${expected}`, () => {
    const w = addStroke(fresh(), stroke()),
      read = recognize(w, result(w, confidence), threshold);
    assert.equal(read.tokens[0].status, expected);
    assert.deepEqual(read.strokes, w.strokes);
    if (expected === "uncertain") assert.throws(() => packet(read), /Clarify/);
  });
test("clarification changes only ambiguous token, preserves ink and does not ask again on recognition", () => {
  const w = addStroke(fresh(), stroke()),
    read = recognize(w, result(w, 0.4), 0.9),
    fixed = confirm(read, "c1", "3", "keypad"),
    again = recognize(fixed, result(fixed, 0.3), 0.9);
  assert.equal(again.tokens[0].text, "3");
  assert.equal(again.tokens[0].status, "confirmed");
  assert.equal(again.corrections.length, 1);
  assert.equal(again.tokens[0].createdOrder, read.tokens[0].createdOrder);
  assert.deepEqual(again.corrections[0].strokeIds, ["s1"]);
  assert.deepEqual(again.strokes, w.strokes);
  assert.equal(blockers(again).length, 0);
});
test("student may correct a confident recognition without mathematical penalty", () => {
  const w = addStroke(fresh(), stroke()),
    read = recognize(w, result(w), 0.9),
    fixed = confirm(read, "c1", "7");
  assert.equal(fixed.corrections[0].reason, "student-edit");
  assert.equal(packet(fixed).steps[0].text, "7");
  assert.ok(!("correct" in packet(fixed)));
});
test("unavailable recognition permits complete typed division in fixed region order", async () => {
  assert.equal(unavailableRecognizer.available(), false);
  await assert.rejects(
    unavailableRecognizer.recognize(
      {
        contract: CONTRACT,
        workId: "a",
        revision: 0,
        strokes: [],
        regions: [],
      },
      new AbortController().signal,
    ),
    /unavailable/,
  );
  let w = fresh();
  for (const [i, text] of [
    "126",
    "3",
    "0",
    "7",
    "6",
    "1",
    "19",
    "18",
    "1",
  ].entries())
    w = manual(w, layout.regions[i].id, text);
  const p = packet(w);
  assert.equal(p.steps.length, 9);
  assert.equal(p.strokes.length, 0);
  assert.ok(
    p.steps.every((s) =>
      s.tokens.every((t) => t.origin === "manual" && t.confidence === null),
    ),
  );
  assert.equal(
    (await receiptValidator.submit(p, new AbortController().signal)).status,
    "received",
  );
});
test("manual entry links only unrecognized ink, leaving previously interpreted tokens intact", () => {
  let w = addStroke(fresh(), stroke());
  w = recognize(w, result(w), 0.9);
  w = addStroke(w, { ...stroke("s2"), points: [point(380), point(390)] });
  assert.throws(() => packet(w), /Clarify/);
  w = manual(w, "quotient", "6");
  assert.deepEqual(w.tokens[1].strokeIds, ["s2"]);
  assert.equal(w.tokens[0].text, "2");
  assert.equal(blockers(w).length, 0);
});
test("late, invalid, duplicate and unknown-stroke recognitions fail without changing work", () => {
  const w = addStroke(fresh(), stroke());
  assert.throws(
    () => recognize(w, { ...result(w), revision: 0 }, 0.9),
    /Stale/,
  );
  assert.throws(() => recognize(w, result(w), NaN), /threshold/);
  assert.throws(
    () =>
      recognize(
        w,
        { ...result(w), candidates: [candidate(), candidate()] },
        0.9,
      ),
    /Duplicate/,
  );
  assert.throws(
    () =>
      recognize(
        w,
        {
          ...result(w),
          candidates: [{ ...candidate(), strokeIds: ["unknown"] }],
        },
        0.9,
      ),
    /Invalid/,
  );
  assert.throws(() => recognize(w, result(w, 1.1), 0.9), /Invalid/);
  assert.equal(w.tokens.length, 0);
});
test("erasing interpreted strokes invalidates linked tokens; corrections remain historical", () => {
  let w = addStroke(fresh(), stroke());
  w = confirm(recognize(w, result(w), 0.9), "c1", "3");
  w = eraseAt(w, point());
  assert.equal(w.tokens.length, 0);
  assert.equal(w.corrections.length, 1);
  assert.deepEqual(w.corrections[0].strokeIds, ["s1"]);
  assert.equal(undo(w).tokens[0].text, "3");
});
test("fixture adapter never recognizes student ink; ambiguity localized to one digit", async () => {
  const w = fixtureWork("synthetic", layout, "ambiguous"),
    r = fixtureRecognizer("ambiguous"),
    req = {
      contract: CONTRACT,
      workId: w.id,
      revision: w.revision,
      strokes: w.strokes,
      regions: layout.regions,
    };
  const recognized = recognize(
    w,
    await r.recognize(req, new AbortController().signal),
    0.9,
  );
  assert.equal(
    recognized.tokens.filter((t) => t.status === "uncertain").length,
    1,
  );
  assert.equal(
    recognized.tokens.filter((t) => t.status === "uncertain")[0].regionId,
    "product-3",
  );
  await assert.rejects(
    r.recognize({ ...req, strokes: [stroke()] }, new AbortController().signal),
    /only its unchanged sample/,
  );
});
test("incorrect intermediate digit is transported unchanged, never diagnosed by input layer", async () => {
  const w = fixtureWork("synthetic", layout, "incorrect"),
    r = fixtureRecognizer("incorrect"),
    read = recognize(
      w,
      await r.recognize(
        {
          contract: CONTRACT,
          workId: w.id,
          revision: w.revision,
          strokes: w.strokes,
          regions: layout.regions,
        },
        new AbortController().signal,
      ),
      0.9,
    ),
    p = packet(read);
  assert.equal(p.steps.find((s) => s.regionId === "product-2")!.text, "8");
  assert.ok(
    (
      await receiptValidator.submit(p, new AbortController().signal)
    ).messages.every((m) => m.kind === "information"),
  );
});
test("draft store restores history, rejects unsupported/corrupt data and reports quota failures", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  } as Storage;
  const s = new BrowserWorkStore(storage);
  let w = manual(fresh(), "remainder", "1");
  await s.save(w);
  w = (await s.load(w.id))!;
  assert.equal(w.tokens[0].text, "1");
  assert.equal(undo(w).tokens.length, 0);
  assert.throws(
    () => restore(JSON.stringify({ ...w, contract: "future@9" })),
    /Unsupported/,
  );
  assert.throws(
    () =>
      restore(
        JSON.stringify({
          ...w,
          layout: { ...layout, regions: [{ ...layout.regions[0], width: -5 }] },
        }),
      ),
    /region/,
  );
  const fail = new BrowserWorkStore({
    ...storage,
    setItem: () => {
      throw Error("quota");
    },
  } as Storage);
  await assert.rejects(fail.save(w), /quota/);
});
test("configurable layouts accept arbitrary division and free writing without changing learner engine", () => {
  assert.equal(
    divisionLayout("92814", "17")
      .guides!.map((g) => g.text)
      .join("÷"),
    "17÷92814",
  );
  assert.throws(() => divisionLayout("1", "0"));
  assert.throws(() =>
    validateLayout({
      ...layout,
      regions: [layout.regions[0], layout.regions[0]],
    }),
  );
  assert.equal(freeLayout("algebra").regions[0].role, "expression");
});
test("contract exposes spatial worksheet and original entry sequence without scoring fields", () => {
  let w = manual(fresh(), "remainder", "1");
  w = manual(w, "quotient", "126");
  const p = packet(w);
  assert.equal(p.contract, CONTRACT);
  assert.deepEqual(
    p.steps.map((s) => s.regionId),
    ["quotient", "remainder"],
  );
  assert.deepEqual(
    p.entrySequence.map((s) => s.regionId),
    ["remainder", "quotient"],
  );
  assert.equal(p.provenance.recognitionIsNotMathematicalValidation, true);
  assert.ok(!("mastery" in p) && !("eligible" in p));
});
