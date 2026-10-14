/**
 * The five-capability pilot content (PR #24): integrity of the questions, passages, pools and lessons, the
 * separation of teaching from assessment, and the selection rules that keep reserved questions for their use.
 * These check the content's form and the software's behaviour, never its educational quality: every question
 * and lesson here awaits educator review.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Code, loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { testClock } from "./journey-sim.ts";
import { respond, runSession, start } from "./profile-sim.ts";
import { onlyFor } from "./select.ts";
import { MemoryRepo } from "./store.ts";
import { fold } from "./state.ts";
import pilotItems from "../../../../content/english/pilot/items.json";
import pilotPassages from "../../../../content/english/pilot/passages.json";
import manifest from "../../../../content/english/pilot/manifest.json";
import reviews from "../../../../content/english/pilot/reviews.json";

const c = loadContent();
const CAPS = c.pilot.capabilities;
const bank = [...c.handWritten].map((id) => c.ctx.content.items.get(id) as Code).filter((i) => CAPS.includes(i.target));
const fw = c.index.leaves;
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/**
 * What a reserved question must not reveal in a lesson. Spelling: the answer word itself. Grammar: the completed
 * sentence (a key like "are" or "the" is in every grammar lesson; the sentence is what would be given away).
 * Reading: the passage (checked separately). Choice items: the keyed option when it is a sentence.
 */
const keyText = (i: Code): string[] => {
  if (i.target === "EN.FND.SPL.inflections") return i.format.startsWith("typed") ? i.answers!.slice(0, 1) : [i.options![i.answer!]];
  if (i.passage) return [];
  if (i.format.startsWith("typed")) return [(i.prompt.split(":").slice(1).join(":") || i.prompt).replace("___", i.answers![0])];
  return i.answer !== undefined && i.options ? [i.options[i.answer]] : [];
};
const pool = (id: string) => c.pilot.pools.get(id)?.pool;

test("PC-1 every pilot question is unique: ids, prompts within a capability, and the new passages", () => {
  const ids = bank.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const cap of CAPS) {
    // the same prompt wording may recur ("Which sentence is correct?"); the question as a whole must not
    const prompts = bank.filter((i) => i.target === cap).map((i) => `${i.passage ?? ""}|${norm(i.prompt)}|${(i.options ?? []).map(norm).join("/")}|${(i.answers ?? []).join("/")}`);
    assert.equal(new Set(prompts).size, prompts.length, `${cap}: duplicated prompt`);
  }
  const pids = (pilotPassages as { id: string; text: string }[]).map((p) => p.id);
  assert.equal(new Set(pids).size, pids.length);
  const texts = (pilotPassages as { text: string }[]).map((p) => norm(p.text));
  assert.equal(new Set(texts).size, texts.length, "no passage repeated");
  // the new passages carry exactly one question each: no two answers come from one passage
  for (const p of pids) assert.equal((pilotItems as { passage?: string }[]).filter((i) => i.passage === p).length, 1, p);
});

test("PC-2 every answer key is valid: options in range and distinct, typed answers given, wrong answers never accepted", () => {
  for (const i of bank) {
    if (i.options) assert.equal(new Set(i.options.map(norm)).size, i.options.length, `${i.id}: duplicate options`);
    if (i.format.startsWith("choice")) assert.ok(i.answer! >= 0 && i.answer! < i.options!.length, i.id);
    if (i.format.startsWith("typed")) {
      assert.ok(i.answers && i.answers.length > 0 && i.answers.every((a) => a.trim().length > 0), i.id);
      for (const w of Object.keys(i.wrong ?? {})) assert.ok(!i.answers!.map((a) => a.toLowerCase()).includes(w.toLowerCase()), `${i.id}: "${w}" is both right and wrong`);
    }
    for (const k of Object.keys(i.distractor_tags ?? {})) assert.ok(Number(k) !== i.answer && Number(k) < (i.options?.length ?? 0), `${i.id}: distractor ${k}`);
    if (i.passage) assert.ok(c.ctx.content.passages.has(i.passage), `${i.id}: unknown passage`);
  }
});

test("PC-3 capability and difficulty mapping: a pilot capability, a difficulty on the 1–8 scale, a known step, defined misconceptions", () => {
  for (const i of bank) {
    assert.ok(i.b >= 1 && i.b <= 8, `${i.id}: difficulty ${i.b}`);
    const allowed = new Set((fw.get(i.target)?.misconceptions ?? []).map((m) => m.id));
    for (const t of [...Object.values(i.wrong ?? {}), ...Object.values(i.distractor_tags ?? {}), ...(i.addresses ?? [])]) assert.ok(allowed.has(t), `${i.id}: misconception ${t} not defined for ${i.target}`);
    const steps = new Set(bank.filter((x) => x.target === i.target && pool(x.id) === "diagnosis" && !x.id.startsWith("plt.")).map((x) => x.step));
    const lessonSteps = new Set([...c.lessons.values()].filter((l) => l.capability === i.target).map((l) => l.step));
    assert.ok(steps.has(i.step) || lessonSteps.has(i.step!), `${i.id}: step ${i.step} is neither an existing step nor a lesson step`);
  }
});

test("PC-4 review status and provenance: every new question is a candidate awaiting review; nothing is marked approved", () => {
  for (const i of pilotItems as Code[]) {
    assert.equal(i.review, "candidate-unvalidated", i.id);
    assert.equal(i.evidence_status, undefined, `${i.id}: no validation status is set by this PR`);
    assert.equal(c.pilot.pools.get(i.id)?.origin, "new-pr24", i.id);
  }
  for (const i of bank) assert.ok(pool(i.id), `${i.id} has a reserved use`);
  assert.match((manifest as { status: string }).status, /awaiting educator review/);
  assert.deepEqual(reviews, [], "no review decisions are recorded until an educator makes them");
});

test("PC-5 enough reserved questions at the easier levels for diagnosis, confirmation and a later check", () => {
  for (const cap of CAPS) {
    const at = (p: string) => bank.filter((i) => i.target === cap && pool(i.id) === p && i.b <= 4).length;
    assert.ok(at("diagnosis") >= 3, `${cap}: diagnosis ${at("diagnosis")}`);
    assert.ok(at("confirmation") >= 4, `${cap}: confirmation ${at("confirmation")}`);
    assert.ok(at("retention") >= 4, `${cap}: retention ${at("retention")}`);
  }
});

test("PC-6 teaching and assessment are separate: no lesson shows the answer to a question kept for confirmation or a later check, and reading lessons use their own texts", () => {
  for (const cap of CAPS) {
    const lessons = [...c.lessons.values()].filter((l) => l.capability === cap);
    const taught = norm(lessons.map((l) => [l.rule, l.tip ?? "", ...l.examples.map((e) => `${e.text} ${e.note ?? ""}`), l.check.prompt, ...l.check.options, l.check.explain].join(" ")).join(" "));
    for (const i of bank.filter((x) => x.target === cap)) {
      const p = pool(i.id);
      // a reserved question's key must never appear in its capability's lessons
      if (p === "confirmation" || p === "retention")
        for (const k of keyText(i)) assert.ok(!new RegExp(`\\b${norm(k)}\\b`).test(taught), `${i.id} (${p}): "${k}" is taught in a lesson`);
      // no question's sentence is a lesson example word for word (any pool)
      const sentence = norm(i.prompt.replace(/___/g, ""));
      if (sentence.split(" ").length >= 5) assert.ok(!taught.includes(sentence), `${i.id}: the prompt is a lesson sentence`);
      if (i.passage) assert.ok(!taught.includes(norm(c.ctx.content.passages.get(i.passage)!.text).slice(0, 60)), `${i.id}: passage used in a lesson`);
    }
  }
});

test("PC-7 selection keeps each reserved question for its use", () => {
  const s = fold(c, []);
  const assess = onlyFor(s, c, "assess");
  const practice = onlyFor(s, c, "practice");
  const confirm = onlyFor(s, c, "confirm");
  const retention = onlyFor(s, c, "retention");
  for (const i of bank) {
    const p = pool(i.id)!;
    assert.equal(assess.has(i.id), p === "diagnosis", `${i.id} for a first check`);
    assert.equal(practice.has(i.id), p === "diagnosis" || p === "practice", `${i.id} in teaching`);
    assert.equal(confirm.has(i.id), p === "confirmation", `${i.id} for confirmation`);
    assert.equal(retention.has(i.id), p === "retention", `${i.id} for a later check`);
  }
  // capabilities outside the pilot are unaffected: every question is usable as before
  const other = [...c.handWritten].filter((id) => !c.pilot.pools.has(id));
  assert.ok(other.length > 700 && other.every((id) => assess.has(id) && confirm.has(id) && retention.has(id)));
});


test("PC-8 a confirming check uses only confirmation questions; a later check only retention questions; one question per passage", async () => {
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "PC8", "guardian", clock, "p-pc8");
  await start(l, () => true);
  for (const [purpose, want] of [
    ["confirm", "confirmation"],
    ["retention", "retention"],
  ] as const) {
    for (const cap of CAPS) {
      const r = await runSession(l, { type: "check", capability: cap, purpose }, () => true);
      assert.ok(r.asked.length > 0, `${cap} ${purpose}: questions available`);
      for (const id of r.asked) assert.equal(pool(id), want, `${cap} ${purpose}: ${id}`);
      const passages = r.asked.map((id) => (c.ctx.content.items.get(id) as Code).passage).filter(Boolean);
      assert.equal(new Set(passages).size, passages.length, `${cap}: one question per passage`);
    }
  }
  // the first-look check on a reading capability: diagnosis questions, never two from one passage
  const r = await runSession(l, { type: "check", capability: "EN.RDG.SUM.main_idea", purpose: "assess" }, () => true);
  const ps = r.asked.map((id) => (c.ctx.content.items.get(id) as Code).passage);
  assert.equal(new Set(ps).size, ps.length);
  for (const id of r.asked) assert.equal(pool(id), "diagnosis");
});

test("PC-9 exhaustion: when the confirmation questions run out, the check ends with nothing asked and the plan offers it no longer", async () => {
  const l = await Learner.create(c, new MemoryRepo(), "PC9", "guardian", testClock(), "p-pc9");
  await start(l, () => true);
  const cap = "EN.GRM.VERB.sva";
  for (let k = 0; k < 6; k++) await runSession(l, { type: "check", capability: cap, purpose: "confirm" }, () => true);
  const last = await runSession(l, { type: "check", capability: cap, purpose: "confirm" }, () => true);
  assert.equal(last.asked.length, 0, "no confirmation question left");
  const profile = l.profile();
  const snap = profile.capabilities.find((x) => x.id === cap)!;
  assert.equal(snap.content.confirm, 0);
  assert.ok(!profile.activities.some((a) => a.step.capability === cap && a.step.purpose === "confirm"));
});

test("PC-10 the child journey on a pilot reading capability: diagnosis, a lesson, practice, a fresh confirming check, and a later check", async () => {
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "PC10", "guardian", clock, "p-pc10");
  const MAIN = "EN.RDG.SUM.main_idea";
  const DETAIL = "EN.RDG.LIT.locate_detail";
  await start(l, () => true);
  for (let k = 0; k < 2; k++) await runSession(l, { type: "check", capability: DETAIL, purpose: "assess" }, () => true); // the prerequisite, shown
  await runSession(l, { type: "check", capability: MAIN, purpose: "assess" }, () => false); // diagnosis: found hard
  let p = l.profile();
  const teach = p.activities.find((a) => a.step.capability === MAIN)!;
  assert.deepEqual([teach.kind, teach.step.type], ["keep_learning", "guided"]);
  const lessonRun = await runSession(l, teach.step, () => true); // lesson, then practice
  for (const id of lessonRun.asked) assert.ok(["diagnosis", "practice"].includes(pool(id)!), `practice in teaching: ${id}`);
  p = l.profile();
  const cap = p.capabilities.find((x) => x.id === MAIN)!;
  assert.equal(cap.standing, "improving");
  const confirm = p.activities.find((a) => a.step.capability === MAIN)!;
  assert.equal(confirm.step.purpose, "confirm");
  const conf = await runSession(l, confirm.step, () => true);
  for (const id of conf.asked) assert.equal(pool(id), "confirmation");
  clock.days(10);
  const later = l.profile().activities.find((a) => a.step.capability === MAIN);
  if (later) {
    assert.equal(later.step.purpose, "retention");
    const r = await runSession(l, later.step, () => true);
    for (const id of r.asked) assert.equal(pool(id), "retention");
  }
  void respond;
});

test("PC-11 a skill is never reported as shown while its own answers are mostly wrong, even if the engine supports a low level", async () => {
  const l = await Learner.create(c, new MemoryRepo(), "PC11", "guardian", testClock(), "p-pc11");
  await start(l, () => true);
  const MAIN = "EN.RDG.SUM.main_idea";
  for (let k = 0; k < 2; k++) await runSession(l, { type: "check", capability: "EN.RDG.LIT.locate_detail", purpose: "assess" }, () => true);
  await runSession(l, { type: "check", capability: MAIN, purpose: "assess" }, () => false);
  const cap = l.profile().capabilities.find((x) => x.id === MAIN)!;
  assert.equal(cap.evidence.independentRight, 0);
  assert.equal(cap.standing, "found_hard");
  assert.deepEqual(cap.strengths.filter((t) => /Shown on their own/.test(t)), []);
});
