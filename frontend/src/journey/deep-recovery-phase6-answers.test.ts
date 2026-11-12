/**
 * Phase 6 (worker A): every simulated wrong answer the corrected simulation can give is graded WRONG by the SERVER (its own
 * family.learning._decide, deployed default mode "shadow" and "unified"), never unresolved. One item per question family and answer
 * format reachable from the two goal skills (and the prerequisites the simulations use). Also records how often the OLD helper
 * (learners.ts wrong) was unresolved on the server. Needs the local backend (python + vendor); skipped, loudly, without it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { walkSupports } from "../../../packages/learning/src/graph";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { wrong as oldWrong } from "./learners";
import { shapedWrong } from "./wrong-answers";
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
// The deep-recovery research prototype is defined over the earlier stop ("#115's stop": every explanation tried, then a person),
// so these tests run with prereq-after-own@1 off, and with integers as the skill that has no teachable lesson (a fixture now
// that the real integers lesson is repaired).
usePrerequisiteAfterOwn(false);
useUnteachableFixture(["MATH.number.integers"]);

const ROOT = new URL("../../../", import.meta.url).pathname;
const vendorRoot = join(homedir(), ".cache/openpath-vendor");
const vendor = existsSync(vendorRoot) ? readdirSync(vendorRoot).map((d) => join(vendorRoot, d)).join(":") : "";

/** one question per family and format (and each fixed item's skill) reachable by the simulations */
export function sampleItems(perKey = 1): string[] {
  const skills = new Set<string>();
  for (const s of ["MATH.calculus.integration-methods", "MATH.calculus.indefinite-integrals", "MATH.algebra.partial-fractions", "MATH.algebra.polynomials", "MATH.algebra.logarithms", "MATH.algebra.linear-two-variables", "MATH.algebra.linear-systems", "MATH.algebra.factor-theorem", "MATH.algebra.linear-equations"]) { skills.add(s); for (const w of walkSupports(s, 99)) skills.add(w.id); }
  const keys = new Map<string, string[]>();
  for (const s of skills) {
    const m = moduleFor(s);
    if (!m) continue;
    for (const id of [...m.diagnostics, ...m.practice, ...m.transfer, ...(["diagnostic", "practice", "check"] as const).flatMap((ph) => modulePhasePool(m, ph).slice(0, 40))]) {
      const b = id.replace(/:(mc|w)$/, "");
      const k = b.startsWith("gen:") ? `${b.split(":")[1]}${id.endsWith(":mc") ? ":mc" : ""}` : `fixed:${s}:${question(b).type}`;
      const l = keys.get(k) ?? [];
      if (l.length < perKey) { l.push(id); keys.set(k, l); }
    }
  }
  return [...keys.values()].flat();
}

export function serverVerdicts(reqs: { id: string; response: string }[]): { id: string; response: string; shadow: string; unified: string }[] | null {
  if (!vendor) return null;
  const r = spawnSync("python3", [join(ROOT, "research/deep-recovery/results/phase6-sim/server_verdicts.py")], { cwd: join(ROOT, "backend"), input: JSON.stringify(reqs), env: { ...process.env, PYTHONPATH: vendor }, encoding: "utf8", maxBuffer: 1 << 26, timeout: 600_000 });
  if (r.status !== 0) throw new Error(`server helper failed: ${r.stderr.slice(-800)}`);
  return JSON.parse(r.stdout);
}

test("every corrected simulated wrong answer is graded incorrect by the server (shadow and unified), never unresolved", { timeout: 900_000 }, (t) => {
  const items = sampleItems();
  assert.ok(items.length > 250, `${items.length} family/format samples`);
  const shaped = items.map((id) => ({ id, ...shapedWrong(id) }));
  const fallbacks = shaped.filter((x) => x.source === "fallback-old");
  const v = serverVerdicts([...shaped.map((x) => ({ id: x.id, response: x.answer })), ...items.map((id) => ({ id, response: oldWrong(id) }))]);
  if (!v) { t.skip("local backend vendor not found: server verdicts not checked"); return; }
  const mine = v.slice(0, items.length), old = v.slice(items.length);
  const bad = mine.filter((x) => x.shadow !== "incorrect" || x.unified !== "incorrect");
  assert.deepEqual(bad, [], `corrected answers not graded incorrect by the server (fallbacks: ${fallbacks.length})`);
  assert.deepEqual(fallbacks.map((x) => x.id), [], "every sampled item has a shaped wrong answer (no fallback to the old helper)");
  const oldUnresolved = old.filter((x) => x.shadow === "unresolved");
  // documents the defect being fixed: the old helper produced answers the deployed server could not read
  assert.ok(oldUnresolved.length > 0, "the old helper produced unresolved answers on the server");
  t.diagnostic(`samples ${items.length}; corrected incorrect in both modes ${mine.length - bad.length}; old helper unresolved (shadow) ${oldUnresolved.length}: ${[...new Set(oldUnresolved.map((x) => x.id.split(":")[1] ?? x.id))].join(",")}`);
});
