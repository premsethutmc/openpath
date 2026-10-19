/**
 * The content system: family-level approval (spec@1, review@2), automatic exclusion, reapproval after a generator
 * change, assessment depth from released pools (depth@1), and repeated exposure never counting as fresh evidence.
 * Synthetic learners, synthetic reviewers, test registries only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules, question } from "../../../packages/learning/src/content";
import { FAMILIES, exposureKey, inPool, phaseOf, phasePool, pool, problemOf, resetPools } from "../../../packages/learning/src/families";
import { useRegistry } from "../../../packages/learning/src/evidence";
import { moduleState } from "../../../packages/learning/src/intervention";
import { poolDepth } from "../../../packages/learning/src/library";
import { releaseOf, resetFingerprints } from "../../../packages/learning/src/review";
import { familySpec, validateFamily } from "../../../packages/learning/src/spec";
import { sampleReleases } from "../../../packages/learning/src/curricula";
import { Driver, right, type Answerer } from "./driver";
import { releasedRegistry } from "./released";

const T0 = Date.parse("2026-11-02T09:00:00Z");
const fams = [...FAMILIES.values()].filter((f) => f.domain).map((f) => f.id);

test("every family specification validates: deterministic, property-based and boundary checks", () => {
  for (const f of fams) {
    const v = validateFamily(f);
    assert.deepEqual([...v.deterministic.failures, ...v.property.failures, ...v.boundary.failures], [], f);
    assert.ok(v.deterministic.checked === pool(f).items.length && v.property.cases >= 400 && v.boundary.cases >= 4, f);
    const s = familySpec(f)!;
    assert.equal(s.fingerprint, familySpec(f)!.fingerprint, `${f}: the fingerprint is deterministic`);
    assert.ok(s.examples.length >= 1 && s.poolSize > 0, f);
    // phases partition the pool: a delayed-check question is never also a practice question
    const parts = (["diagnostic", "check", "practice", "retention"] as const).map((ph) => new Set(phasePool(f, ph).map(exposureKey)));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const x of parts[i]) assert.ok(!parts[j].has(x), `${f}: ${x} in two phases`);
  }
});

test("a released family validates its whole pool; outside the approved domain nothing is released", () => {
  useRegistry(releasedRegistry(["mmul"], []));
  try {
    assert.ok(releaseOf("gen:mmul:47,6"), "inside the domain: released");
    assert.ok(releaseOf("gen:mmul:47,6:mc"), "both formats");
    assert.equal(releaseOf("gen:mmul:47,1"), undefined, "outside the domain");
    assert.equal(releaseOf("gen:mmul:40,6"), undefined, "excluded by the specification (a multiple of 10)");
    assert.equal(releaseOf("gen:mul:7,8"), undefined, "another family is not released");
  } finally {
    useRegistry(null);
  }
});

test("a material generator change makes the approval stale (reapproval needed); a failing item is excluded automatically", () => {
  const def = FAMILIES.get("rperim")!;
  const reg = releasedRegistry(["rperim"], []);
  useRegistry(reg);
  const prompt = def.prompt;
  const validate = def.validate;
  try {
    assert.ok(releaseOf("gen:rperim:7,3"));
    // a wording change is material: the fingerprint changes, the release no longer applies
    def.prompt = (p) => prompt(p).replace("perimeter", "distance around");
    resetPools();
    resetFingerprints();
    assert.equal(releaseOf("gen:rperim:7,3"), undefined, "a changed generator is not released until approved again");
    def.prompt = prompt;
    resetPools();
    resetFingerprints();
    assert.ok(releaseOf("gen:rperim:7,3"), "back to the approved specification");
    // an item whose answer fails the independent check is excluded from the pool, never offered
    def.validate = (p, v) => !(p[0] === 7 && p[1] === 3) && validate(p, v);
    resetPools();
    resetFingerprints();
    assert.equal(inPool("gen:rperim:7,3"), false);
    assert.ok(pool("rperim").excluded.some((e) => e.params.join(",") === "7,3"));
    assert.ok(familySpec("rperim")!.excluded.length === 1);
  } finally {
    def.prompt = prompt;
    def.validate = validate;
    resetPools();
    resetFingerprints();
    useRegistry(null);
  }
});

test("depth: two early mistakes do not exhaust a released module; fresh checks continue until the shared record can verify", () => {
  const comp = "MATH.number.multi-multiplication";
  useRegistry(releasedRegistry(["mmul", "mul"], [comp]));
  try {
    const d = new Driver("synthetic-depth", T0);
    d.enrol(4, "2026-27", sampleReleases.find((r) => r.grade === 4)!);
    let slips = 0;
    const twoMistakes: Answerer = (q, phase) => {
      if (phase === "explore" && slips < 2) {
        slips++;
        const p = problemOf(q)!;
        return String(Number(p.answer) + 10);
      }
      return right(q, phase);
    };
    d.work(comp, twoMistakes, { max: 60 });
    assert.ok(d.trace.some((t) => t.startsWith("teach:")), "the mistakes led to teaching");
    assert.equal(d.state().evidence(comp).engineRetention, "not_demonstrated", "answers right after teaching do not demonstrate (the shared engine's rule)");
    // the next visit: fresh questions from the released pool, alone
    d.newSession(1);
    d.work(comp, right, { max: 30 });
    const ev = d.state().evidence(comp);
    assert.ok(["independent", "transfer"].includes(ev.status), ev.status);
    assert.notEqual(ev.engineRetention, "not_demonstrated", `the shared record demonstrated it: ${d.trace.join(" ")}`);
    const ids = d.state().records.attempts.map((a) => exposureKey(a.questionId));
    assert.equal(new Set(ids).size, ids.length, "never the same problem twice");
    d.newSession(7.05);
    d.work(comp, right, { max: 20 });
    assert.equal(d.state().evidence(comp).status, "verified", "verified on released content after seven full days");
    // the delayed check came from the delayed-check part of the pool
    const ret = d.state().records.attempts.filter((a) => a.activity === "retention");
    assert.ok(ret.length >= 2 && ret.every((a) => phaseOf(a.questionId) === "retention"));
  } finally {
    useRegistry(null);
  }
});

test("repeated exposure is never independent evidence: the other format of a seen problem counts as help", () => {
  const d = new Driver("synthetic-repeat", T0);
  d.enrol(4, "2026-27", sampleReleases.find((r) => r.grade === 4)!);
  d.answer("gen:mmul:47,6", "282", "practice");
  d.answer("gen:mmul:47,6:mc", question("gen:mmul:47,6:mc").answer, "check");
  const [a, b] = d.state().records.attempts;
  assert.equal(a.n, 1);
  assert.equal(b.n, 2, "the multiple-choice form of the same problem is a second sight");
  const ev = d.state().evidence("MATH.number.multi-multiplication");
  assert.equal(ev.independent.total, 1);
  assert.equal(ev.assisted.total, 1);
});

test("depth limits are reported, never papered over", () => {
  const root = modules.find((m) => m.competency === "MATH.number.square-roots")!;
  const d = poolDepth(root)!;
  assert.equal(d.sufficient, false, "a family of 24 problems cannot supply every phase");
  assert.ok(d.short.length > 0);
  const big = poolDepth(modules.find((m) => m.competency === "MATH.algebra.linear-equations")!)!;
  assert.equal(big.sufficient, true);
});

test("every module's questions come from the right part of its family's pool, and the parts never overlap", () => {
  for (const m of modules.filter((x) => x.pool)) {
    const fam = m.pool!.family;
    const inFamily = (q: string) => q.startsWith(`gen:${fam}:`);
    const where = (qs: string[], phase: string) => {
      for (const q of qs.filter(inFamily)) assert.equal(phaseOf(q), phase, `${m.competency}: ${q} should be from the ${phase} part`);
    };
    where(m.diagnostics, "diagnostic");
    where(m.strategies.map((s) => s.check), "check");
    where([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.guided)], "practice");
    where(m.retention, "retention");
  }
});

test("an exhausted pool: the module stops, never repeats a problem, and never reports mastery it has not seen", () => {
  const comp = "MATH.number.square-roots";
  useRegistry(releasedRegistry(["root", "mul"], [comp]));
  try {
    const d = new Driver("synthetic-exhausted", T0);
    d.enrol(8, "2026-27", sampleReleases.find((r) => r.grade === 8)!);
    // a learner who keeps getting it wrong: the module teaches, then stops when its explanations and questions run out
    for (let visit = 0; visit < 6; visit++) {
      d.work(comp, (q) => String(Number(question(q).answer.replace(/\D/g, "") || 0) + 3), { max: 40 });
      d.newSession(1);
    }
    const st = d.state();
    const keys = st.records.attempts.map((a) => exposureKey(a.questionId));
    assert.equal(new Set(keys).size, keys.length, "no problem asked twice");
    const ms = moduleState(comp, st.records, st.evidence(comp), d.now, d.session);
    assert.ok(["pause", "done"].includes(ms.phase) || !ms.question, `the module stops: ${ms.phase} ${ms.reason}`);
    assert.ok(!["independent", "transfer", "verified"].includes(st.evidence(comp).status), "wrong answers never become mastery");
    assert.ok(keys.length <= pool("root").items.length + 6, "it cannot ask more problems than exist");
  } finally {
    useRegistry(null);
  }
});

test("repeated questions cannot create false mastery: the same problems answered again and again stay one exposure each", () => {
  const comp = "MATH.number.multi-multiplication";
  useRegistry(releasedRegistry(["mmul", "mul"], [comp]));
  try {
    const d = new Driver("synthetic-repeater", T0);
    d.enrol(4, "2026-27", sampleReleases.find((r) => r.grade === 4)!);
    // one problem, right, twenty times, in both formats, over several visits
    for (let k = 0; k < 20; k++) {
      if (k % 5 === 0) d.newSession(1);
      const id = k % 2 ? "gen:mmul:47,6:mc" : "gen:mmul:47,6";
      d.answer(id, question(id).answer, "check");
    }
    const ev = d.state().evidence(comp);
    assert.equal(ev.independent.total, 1, "one exposure counts once");
    assert.equal(ev.status, "guided", "never shown on your own from one problem");
    assert.equal(ev.engineRetention, "not_demonstrated", "the shared engine does not demonstrate it either");
    d.newSession(8);
    assert.notEqual(d.state().evidence(comp).status, "verified");
  } finally {
    useRegistry(null);
  }
});

test("one pipeline for every grade: no grade-specific branch in the learning engine", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("../../../packages/learning/src/", import.meta.url);
  const offenders: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    readFileSync(new URL(f, dir), "utf8").split("\n").forEach((line, i) => {
      // a comparison of a grade with a fixed number decides behaviour by grade
      if (/\bgrade\s*(===|==|!==|<=|>=|<|>)\s*\d/.test(line) && !line.trim().startsWith("//")) offenders.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  // the only one: which goals show an exam plan (a goal's own rule, not a curriculum's)
  assert.deepEqual(offenders.map((o) => o.split(":")[0]), ["goals.ts"], offenders.join("\n"));
  // and the same path gives a working module for the Grade 4, 10 and 12 books
  for (const [grade, id, comp] of [[4, "openpath-sample-mathematics-grade-4", "MATH.number.multi-multiplication"], [10, "board-b-sample-mathematics-class-10", "MATH.algebra.factorisation"], [12, "openpath-sample-mathematics-grade-12", "MATH.calculus.integration-methods"]] as const) {
    const d = new Driver(`synthetic-pipe-${grade}`, T0);
    d.enrol(grade, "2026-27", sampleReleases.find((r) => r.id === id)!);
    const st = d.state();
    assert.ok(st.summary!.tiles.length > 0);
    assert.equal(moduleState(comp, st.records, st.evidence(comp), d.now, d.session).phase, "explore", `Grade ${grade}`);
  }
});
