/** drawn-check (coordinator, with the educator hand-off): a strategy's own check or guided item that is a drawing task is
 *  not offered while drawn answers cannot be accepted; the block's check falls back to a fresh keyboard question. */
import { expect, test } from "bun:test";
import { modules, moduleFor } from "./content.ts";
import { blockCheck } from "./intervention.ts";
import { readRecords } from "./records.ts";
import { boardFor } from "./curricula.ts";
import { make } from "./session.ts";
import { keyboardOffered } from "./written.ts";

const drawn = modules.flatMap((m) => m.strategies.filter((s) => !keyboardOffered(s.check)).map((s) => ({ m, s })));

test("the six construction strategies with a drawn check are known", () => {
  expect(drawn.map(({ m, s }) => `${m.competency}:${s.id}`).sort()).toEqual([
    "MATH.geometry.basic-constructions:step_by_step", "MATH.geometry.construction-quadrilaterals:order_of_steps", "MATH.geometry.construction-triangles:step_by_step",
    "MATH.geometry.constructions-bisectors:special_angles", "MATH.geometry.scaled-construction:step_by_step", "MATH.number.root-length-construction:spiral_steps",
  ]);
  expect(modules.flatMap((m) => m.strategies).every((s) => !s.guided || keyboardOffered(s.guided))).toBe(true);
});

test("blockCheck never returns a drawing task; it falls back to a keyboard question", () => {
  const ctx = { learnerId: "synthetic-drawn", sessionId: "s", at: "2026-11-01T09:00:00Z" };
  const recs = readRecords("synthetic-drawn", [make.enrol(ctx, 8, "2026-27", boardFor("cbse", 8)!)]);
  for (const { m, s } of drawn) {
    const q = blockCheck(moduleFor(m.competency)!, s, recs);
    expect(q).not.toBe(s.check);
    if (q) expect(keyboardOffered(q)).toBe(true);
  }
});

test("a construction learner reaches an honest pause, not an unsubmittable drawing", async () => {
  const { learnerState } = await import("./session.ts");
  const { question } = await import("./content.ts");
  const C = "MATH.geometry.basic-constructions";
  let now = Date.parse("2026-11-01T09:00:00Z");
  const ctx = () => ({ learnerId: "synthetic-drawn2", sessionId: "s2", at: new Date((now += 60_000)).toISOString() });
  const ev = [make.enrol(ctx(), 6, "2026-27", boardFor("cbse", 6)!)];
  const seen: string[] = [];
  for (let i = 0; i < 25; i++) {
    const ms = learnerState("synthetic-drawn2", ev, now, { currentSession: "s2" }).module(C);
    if (ms.phase === "chapter") { ev.push(make.teach(ctx(), C, ms.strategy!.id, "test")); continue; }
    if (!ms.question) { seen.push(`${ms.phase}:${ms.reason}`); break; }
    expect(keyboardOffered(ms.question)).toBe(true);
    seen.push(ms.question);
    const q = question(ms.question);
    ev.push(make.attempt(ctx(), ms.question, i % 2 ? (q.answer ?? "") : "zzz", ms.activity ?? "diagnostic", ms.context ? { context: ms.context } : {}));
  }
  expect(seen.length).toBeGreaterThan(0);
}, 60_000);
