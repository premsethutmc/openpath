/**
 * Decision traces and the developer's diagnostic report: traces record what the engine actually did, never change
 * the Learner Vector, are labelled "not recorded" where missing, and reports are read-only and redacted by default.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Item, type Response, leafView } from "../../../../packages/english-core/src/index.ts";
import { loadContent } from "./content.ts";
import { NOT_RECORDED, buildReport, diagnose, planChange } from "./diagnostics.ts";
import type { AppEvent, TraceEvent } from "./events.ts";
import { Learner } from "./learner.ts";
import { learnerProfile } from "./profile.ts";
import { fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";
import { pending, record, setSender } from "./telemetry.ts";

const content = loadContent();

function testClock(start = "2026-10-13T09:00:00.000Z") {
  let t = Date.parse(start);
  return () => {
    t += 60_000;
    return new Date(t).toISOString();
  };
}

function answerFor(item: Item, right: boolean): Response {
  if (item.kind !== "code") throw new Error("code items only");
  const f = item.format.split(":")[0];
  if (f === "choice") return { kind: "choice", choice: right ? item.answer! : (item.answer! + 1) % item.options!.length };
  if (f === "typed") return { kind: "typed", text: right ? item.answers![0] : (Object.keys(item.wrong ?? {})[0] ?? "arun@example.org") };
  if (f === "order") return { kind: "order", order: right ? item.answer_order! : [...item.answer_order!].reverse() };
  if (f === "match") return { kind: "match", pairs: right ? item.answer_pairs! : [...item.answer_pairs!].reverse() };
  return { kind: "multi", choices: right ? item.answer_set! : [0] };
}

async function run(l: Learner, right: (i: number) => boolean) {
  for (let i = 0; i < 60; i++) {
    const cur = await l.current();
    if (cur.lesson) {
      await l.finishLesson(cur.lesson.id, true);
      continue;
    }
    if (!cur.next) return;
    await l.answer(cur.next.item, answerFor(cur.next.item, right(i)), { use: cur.next.use });
  }
  throw new Error("session did not end");
}

/** Arun: placement with a mix of answers, then Today's first activity and a spelling check. */
async function arun() {
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(content, repo, "Arun", "guardian", clock, "pupil-7f3a");
  await l.start({ type: "placement" });
  await run(l, (i) => i % 3 !== 0);
  const first = l.profile().activities[0];
  await l.start(first.step);
  await run(l, (i) => i % 2 === 0);
  await l.start({ type: "spelling_check" });
  await run(l, (i) => i % 2 === 1);
  return { l, repo };
}

const traces = (events: AppEvent[]) => events.filter((e): e is TraceEvent => e.kind === "trace");

test("every question shown has a trace recorded with it, naming exactly that question and what the engine knew then", async () => {
  const { l } = await arun();
  const events = l.events;
  const presented = events.filter((e) => e.kind === "presented");
  assert.ok(presented.length > 15);
  for (const p of presented) {
    const t = traces(events).find((x) => x.presented === p.id);
    assert.ok(t?.selection, `trace for ${p.id}`);
    assert.equal(t.item?.id, p.item.id);
    const at = events.indexOf(p);
    assert.equal(events[at + 1], t, "recorded straight after the question was shown");
    if (t.selection.selector === "engine") {
      assert.equal(t.selection.chosen?.item, p.item.id, "the chosen candidate is the question shown");
      // what it "knew" is the engine's estimate at that moment, rebuilt from the record before the question
      const before = fold(content, events.slice(0, at));
      for (const k of t.selection.knew ?? []) {
        const v = leafView(before.ledger.composite, content.index, k.capability, t.at);
        assert.ok(Math.abs(v.mean - k.mean) < 0.001 && Math.abs(v.sd - k.sd) < 0.001, `${k.capability} at ${p.id}`);
      }
      for (const a of t.selection.alternatives ?? []) assert.ok(a.score <= t.selection.chosen!.score && a.whyNot, "alternatives scored no higher, with a reason");
    } else {
      assert.equal(t.selection.selector, "queue");
      const session = events.find((e) => e.kind === "session" && e.session === p.session);
      assert.ok(session?.kind === "session" && session.queue);
      assert.equal(session.queue[t.selection.queue!.position - 1].item, p.item.id, "queue position names the question shown");
    }
  }
});

test("a plan trace records what Today offered at the moment each session was started", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(content, repo, "Arun", "guardian", clock, "pupil-1");
  await l.start({ type: "placement" });
  await run(l, () => true);
  const offered = l.profile().activities;
  await l.start(offered[0].step);
  const plan = traces(l.events).filter((t) => t.plan).at(-1)!.plan!;
  assert.deepEqual(plan.offered.map((o) => o.title), offered.map((a) => a.title));
  assert.equal(plan.startedRank, 0);
  const at = l.events.findIndex((e) => e.kind === "trace" && e.plan === plan);
  assert.equal(l.events[at + 1].kind, "session", "recorded just before the session it explains");
});

test("traces never change the Learner Vector, the profile or the plan", async () => {
  const { l } = await arun();
  const now = "2026-10-14T09:00:00.000Z";
  const without = l.events.filter((e) => e.kind !== "trace");
  assert.ok(without.length < l.events.length);
  const a = fold(content, l.events);
  const b = fold(content, without);
  assert.deepEqual(a.ledger.composite, b.ledger.composite);
  assert.deepEqual(a.ledger.decisions, b.ledger.decisions);
  const pa = learnerProfile(a, content, now);
  const pb = learnerProfile(b, content, now);
  assert.deepEqual(pa.capabilities.map((x) => [x.id, x.standing, x.evidence]), pb.capabilities.map((x) => [x.id, x.standing, x.evidence]));
  assert.deepEqual(pa.activities.map((x) => x.title), pb.activities.map((x) => x.title));
});

test("the diagnosis uses the engine's own numbers: the Learner Vector is leafView, each answer's effect is the ledger's decision", async () => {
  const { l } = await arun();
  const now = "2026-10-14T09:00:00.000Z";
  const d = await diagnose(content, { pupil: { id: l.profileId, name: "Arun" }, events: l.events, now });
  const s = fold(content, l.events);
  for (const x of d.learner_vector) {
    const v = leafView(s.ledger.composite, content.index, x.id, now);
    assert.equal(x.estimate.mean, Math.round(v.mean * 100) / 100, x.id);
    assert.equal(x.estimate.sd, Math.round(v.sd * 100) / 100, x.id);
  }
  const qs = d.timeline.filter((e) => e.kind === "question");
  assert.equal(d.tracing.traced, d.tracing.questions, "every question in this record was traced");
  for (const q of qs) {
    if (q.kind !== "question" || !q.effect) continue;
    const ev = l.events.find((e) => e.kind === "evidence" && e.session === q.session && e.item.id === q.item)!;
    const dec = s.ledger.decisions.find((x) => x.source === ev.id)!;
    assert.equal(q.effect.verdict, dec.verdict);
    if (dec.after) assert.equal(q.effect.after!.mean, Math.round(dec.after.mean * 100) / 100);
  }
  assert.ok(d.today.length > 0 && d.next_questions.length === d.today.length);
  assert.ok(d.next_questions.every((n) => n.first !== undefined && !n.error));
});

test("questions and sessions from before tracing are labelled not recorded, never explained after the fact", async () => {
  const { l } = await arun();
  const old = l.events.filter((e) => e.kind !== "trace");
  const d = await diagnose(content, { pupil: { id: l.profileId, name: "Arun" }, events: old, now: "2026-10-14T09:00:00.000Z" });
  assert.equal(d.tracing.traced, 0);
  for (const e of d.timeline) {
    if (e.kind === "question") {
      assert.equal(e.selection, null);
      assert.equal(e.selectionStatus, NOT_RECORDED);
    } else {
      assert.equal(e.plan, null);
      assert.equal(e.planStatus, NOT_RECORDED);
      assert.equal(e.planChange, null);
    }
  }
  const text = buildReport(d).text;
  assert.ok(text.includes(NOT_RECORDED));
  assert.ok(d.issues.some((i) => i.check === "tracing"));
});

test("reports are read-only: the record, the stored copy and the learner are unchanged", async () => {
  const { l, repo } = await arun();
  const before = structuredClone(l.events);
  const stored = structuredClone(await repo.load(l.profileId));
  const d = await diagnose(content, { pupil: { id: l.profileId, name: "Arun" }, events: l.events, now: "2026-10-14T09:00:00.000Z" });
  buildReport(d, { redact: true });
  buildReport(d, { redact: false });
  assert.deepEqual(l.events, before);
  assert.deepEqual(await repo.load(l.profileId), stored);
  assert.equal(l.state.open, null, "no session was started on the learner");
});

test("reports are redacted by default: no name, record id, email or flag note; the full version names the pupil", async () => {
  const { l } = await arun();
  const shown = l.events.find((e) => e.kind === "presented");
  assert.ok(shown?.kind === "presented");
  await l.flag(content.ctx.content.items.get(shown.item.id)!, "Arun's mum: write to parent@example.org");
  const d = await diagnose(content, { pupil: { id: l.profileId, name: "Arun" }, events: l.events, now: "2026-10-14T09:00:00.000Z" });
  const r = buildReport(d);
  const all = r.text + JSON.stringify(r.json);
  assert.equal(r.json.redacted, true);
  for (const secret of ["Arun", "arun", "pupil-7f3a", "@example.org", "parent@", "mum"]) assert.ok(!all.includes(secret), secret);
  assert.ok(r.text.includes("Pupil A"));
  assert.equal(r.json.pupil.flags, 1, "flags are counted, their notes never included");
  const full = buildReport(d, { redact: false });
  assert.ok(full.text.includes("Arun") && full.json.pupil.id === "pupil-7f3a");
  assert.ok(!JSON.stringify(full.json).includes("parent@example.org"), "flag notes are never in a report");
});

test("plan changes are stated as facts: first suggestion and standings", () => {
  const a = { offered: [{ title: "Commas", kind: "check_learned", action: "assess", capability: "X", priority: 1, why: "w" }], started: { type: "check" }, startedRank: 0, standings: { X: "uncertain" } };
  const b = { ...a, offered: [{ ...a.offered[0], title: "Full stops", capability: "Y" }], standings: { X: "found_hard", Y: "uncertain" } };
  assert.match(planChange(a, a), /stayed "Commas"; no standing changed/);
  assert.match(planChange(a, b), /changed from "Commas" to "Full stops".*X uncertain → found_hard, Y not_checked → uncertain/);
});

test("telemetry: durations and failures are measured without any answer or name, and a failed save is recorded", async () => {
  setSender(null);
  const sent: unknown[] = [];
  setSender(async (batch) => void sent.push(...batch));
  record({ name: "runtime_error", ok: false, detail: new Error("x failed for arun@example.org\nstack") });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(sent.at(-1), { name: "runtime_error", ok: false, detail: "Error: x failed for [email]" });
  const failing = new MemoryRepo();
  const l = await Learner.create(content, failing, "Arun", "guardian", testClock(), "p-f");
  failing.append = async () => {
    throw new Error("disk full");
  };
  await assert.rejects(l.start({ type: "placement" }));
  const seen = [...sent, ...pending()] as { name: string; detail?: string }[];
  assert.ok(seen.some((m) => m.name === "save_failed" && m.detail === "trace: Error"));
  assert.ok(seen.some((m) => m.name === "save_ms") && seen.some((m) => m.name === "rebuild_ms"));
  assert.ok(!JSON.stringify(seen).includes("Arun"));
  setSender(null);
});

test("the doubling journey records its rule planner's decision with each question it shows", async () => {
  const l = await Learner.create(content, new MemoryRepo(), "Arun", "guardian", testClock(), "pupil-j");
  const v = await l.startJourney();
  assert.equal(v.step.kind, "question");
  const t = traces(l.events).at(-1)!;
  assert.equal(t.selection?.selector, "planner");
  assert.equal(t.selection?.planner?.action, v.decision.action);
  assert.equal(t.selection?.planner?.reason, v.decision.reason);
  assert.equal(t.item?.id, v.step.kind === "question" ? v.step.item.id : "");
  const again = l.events.length;
  await l.journey();
  assert.equal(l.events.length, again, "reopening the same question records nothing new");
});

test("redaction works for names in any alphabet and never breaks the JSON", async () => {
  for (const name of ["Zoë", "José", "Ananyā", "True", "Null", "Id"]) {
    const l = await Learner.create(content, new MemoryRepo(), name, "guardian", testClock(), `pupil-${name}`);
    await l.start({ type: "placement" });
    const cur = await l.current();
    await l.answer(cur.next!.item, { kind: "typed", text: `${name.toLowerCase()} wrote this` } as Response, { use: cur.next!.use });
    const d = await diagnose(content, { pupil: { id: l.profileId, name }, events: l.events, now: "2026-10-14T09:00:00.000Z" });
    const r = buildReport(d);
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") strings.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(r.json);
    const word = new RegExp(`(?<![\\p{L}])${name}(?![\\p{L}])`, "iu");
    assert.ok(!word.test(r.text) && !strings.some((x) => word.test(x)), name);
    assert.equal(r.json.pupil.label, "Pupil A");
    assert.equal(r.json.read_only, true, `${name}: keys and values intact`);
  }
});

test("a malformed or foreign event is left out and reported, and cannot break the diagnosis", async () => {
  const { l } = await arun();
  const bad = [...l.events, { kind: "trace", id: "x:1", at: "2026-10-13T12:00:00.000Z", presented: "nope", selection: { selector: "engine", alternatives: "boom" } } as unknown as AppEvent, { kind: "mystery", id: "x:2", at: "2026-10-13T12:00:00.000Z" } as unknown as AppEvent];
  const d = await diagnose(content, { pupil: { id: l.profileId, name: "Arun" }, events: bad, now: "2026-10-14T09:00:00.000Z" });
  const issue = d.issues.find((i) => i.check === "malformed events");
  assert.ok(issue && issue.detail.startsWith("2 event(s)"), issue?.detail ?? "no issue");
  assert.ok(buildReport(d).text.length > 0);
});

test("a trace that cannot be saved never stops the learner", async () => {
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, "Arun", "guardian", testClock(), "p-t");
  const append = repo.append.bind(repo);
  repo.append = async (id, e) => {
    if (e.kind === "trace") throw new Error("too large");
    return append(id, e);
  };
  const cur = await l.start({ type: "placement" });
  assert.ok(cur.next, "the session started and a question is shown");
  await l.answer(cur.next.item, answerFor(cur.next.item, true), { use: cur.next.use });
  assert.equal(l.events.filter((e) => e.kind === "trace").length, 0);
  const d = await diagnose(content, { pupil: { id: "p-t", name: "Arun" }, events: l.events, now: "2026-10-14T09:00:00.000Z" });
  assert.equal(d.timeline.find((e) => e.kind === "question")?.selectionStatus, NOT_RECORDED);
});
