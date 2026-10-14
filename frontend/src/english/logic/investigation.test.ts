/**
 * Findings of the Pupil A investigation (docs/product/PUPIL_A_INVESTIGATION.md), pinned as tests.
 *
 * CURRENT BEHAVIOUR tests pass today. They record behaviour the investigation found to be inconsistent with the
 * educational design; each one fails, deliberately, when that behaviour is changed (after approval), and must
 * then be rewritten.
 * KNOWN DEFECT tests are marked `todo`: they state the intended behaviour, fail today, and do not fail the run.
 * Nothing here changes production behaviour.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { leafView } from "../../../../packages/english-core/src/index.ts";
import { loadContent } from "./content.ts";
import { buildReport, diagnose, redactText } from "./diagnostics.ts";
import { Learner } from "./learner.ts";
import { respond } from "./profile-sim.ts";
import { spellingCheckQueue, spellingPatterns } from "./select.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent();
const NOW = "2026-10-14T13:22:40.000Z";

/** A learner after a placement answered right on every question (a high spelling estimate). */
async function placed() {
  let t = Date.parse("2026-10-14T13:17:00.000Z");
  const l = await Learner.create(c, new MemoryRepo(), "Sim", "guardian", () => new Date((t += 10_000)).toISOString(), "sim");
  await l.start({ type: "placement" });
  for (let i = 0; i < 40; i++) {
    const cur = await l.current();
    if (!cur.next) break;
    await l.answer(cur.next.item, respond(cur.next.item, true), { use: cur.next.use });
  }
  return l;
}

const bandOf = (id: string) => {
  const it = c.ctx.content.items.get(id)!;
  return it.kind === "code" ? spellingPatterns(c).find((p) => p.cap === it.target && p.step === it.step)!.band : NaN;
};
const templateOf = (id: string) => (c.ctx.content.items.get(id) as { generated?: { template: string } }).generated?.template;

test("CURRENT BEHAVIOUR (finding S1): spelling-check answers never change the Learner Vector, though recorded as assessment", async () => {
  const l = await placed();
  const caps = ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological", "EN.FND.SPL.homophones"];
  const before = caps.map((cap) => leafView(l.state.ledger.composite, c.index, cap, NOW).mean);
  let cur = await l.start({ type: "spelling_check" });
  let n = 0;
  while (cur.next) {
    await l.answer(cur.next.item, respond(cur.next.item, false), { use: cur.next.use });
    n++;
    cur = await l.current();
  }
  assert.ok(n >= 8, `${n} spelling-check questions`);
  const held = l.state.ledger.decisions.filter((d) => d.observation?.item.startsWith("gen."));
  assert.equal(held.length, n);
  assert.ok(held.every((d) => d.verdict === "held" && d.observation?.use === "assessment"), "recorded as assessment, held as practice");
  assert.deepEqual(caps.map((cap) => leafView(l.state.ledger.composite, c.index, cap, NOW).mean), before, "every answer wrong, estimates unchanged");
});

test("CURRENT BEHAVIOUR (finding S2): the spelling check asks every pattern up to two bands above the estimate, however far below", async () => {
  const l = await placed();
  const v = leafView(l.state.ledger.composite, c.index, "EN.FND.SPL.inflections", NOW);
  const queue = spellingCheckQueue(l.state, c, NOW, true).filter((p) => c.ctx.content.items.get(p.item)!.kind === "code" && (c.ctx.content.items.get(p.item) as { target: string }).target === "EN.FND.SPL.inflections");
  const lowest = Math.min(...queue.map((p) => bandOf(p.item)));
  assert.ok(v.mean - lowest >= 3.5, `estimate ${v.mean.toFixed(2)}, easiest pattern asked at band ${lowest}`);
  assert.equal(queue[0].item, "gen.infl.add_ending.seeing", "the first word is the easiest pattern's");
});

test("CURRENT BEHAVIOUR (finding S3): with speech available, the check still prefers 'add an ending' over hear-and-type", async () => {
  const l = await placed();
  const withSpeech = spellingCheckQueue(l.state, c, NOW, true).map((p) => templateOf(p.item));
  const dictation = withSpeech.filter((t) => t === "hear_spell").length;
  assert.ok(dictation <= 2 && withSpeech.filter((t) => t === "add_ending").length >= 8, `templates: ${withSpeech.join(", ")}`);
});

test("CURRENT BEHAVIOUR (finding S4): without speech, a definition clue replaces dictation in the spelling check", async () => {
  const l = await placed();
  const noSpeech = spellingCheckQueue(l.state, c, NOW, false).map((p) => templateOf(p.item));
  assert.ok(noSpeech.includes("meaning_first_letter"));
  assert.ok(!noSpeech.includes("hear_spell"));
});

test("CURRENT BEHAVIOUR (finding L5): one tagged wrong answer makes a misconception active", async () => {
  const l = await placed();
  await l.start({ type: "explore" });
  let cur = await l.current();
  for (let i = 0; i < 20 && cur.next; i++) {
    const it = cur.next.item;
    const tagged = it.kind === "code" && it.format.startsWith("typed") && Object.keys(it.wrong ?? {})[0];
    if (tagged) {
      await l.answer(it, { kind: "typed", text: tagged }, { use: cur.next.use });
      const tag = it.wrong![tagged];
      const m = leafView(l.state.ledger.composite, c.index, it.target, NOW).misconceptions.find((x) => x.id === tag);
      assert.ok(m && m.strength >= c.index.framework.policy.misconception_active, `${tag} active after one answer (strength ${m?.strength})`);
      return;
    }
    await l.answer(it, respond(it, true), { use: cur.next.use });
    cur = await l.current();
  }
  assert.fail("no tagged typed question was asked");
});

test("CURRENT BEHAVIOUR (finding L6): unreviewed (candidate) questions can make a skill 'shown'", async () => {
  const l = await placed();
  for (let k = 0; k < 6; k++) {
    const a = l.profile().activities[0];
    if (!a) break;
    await l.start(a.step, a.step.type === "spelling_assess" ? { delivery: "adult_reader" } : {});
    for (let i = 0; i < 30; i++) {
      const cur = await l.current();
      if (cur.lesson) {
        await l.finishLesson(cur.lesson.id, true);
        continue;
      }
      if (!cur.next) break;
      await l.answer(cur.next.item, respond(cur.next.item, true), { use: cur.next.use });
    }
  }
  const shown = l.profile().capabilities.filter((x) => x.standing === "shown" || x.standing === "confirmed");
  assert.ok(shown.length > 0 && shown.every((x) => x.basis.validated === 0), `${shown.length} shown on draft questions only`);
});

test("FIXED (finding D1): report redaction keeps version identifiers such as en@0.2.0, and still removes emails", async () => {
  const l = await Learner.create(c, new MemoryRepo(), "Arun", "guardian", () => NOW, "p-r");
  const d = await diagnose(c, { pupil: { id: l.profileId, name: "Arun" }, events: l.events, now: NOW });
  assert.equal(buildReport(d).json.versions.framework, c.index.key);
  assert.equal(redactText("write to a.parent@example.co.uk or arun@school.org; framework en@0.2.0, policy development-policy@0-draft", { id: "x", name: "Zz" }), "write to [email] or [email]; framework en@0.2.0, policy development-policy@0-draft");
});

test("FIXED (finding D2): every spelling session records whether speech was available, switched on, and the voice", async () => {
  const l = await placed();
  l.speechAvailable = false;
  await l.start({ type: "spelling_check" });
  const session = [...l.events].reverse().find((e) => e.kind === "session")!;
  assert.ok(session.kind === "session" && session.speech, "the session event records speech availability");
  assert.deepEqual(session.kind === "session" && session.speech, { available: false, enabled: true, voice: null });
  l.speechAvailable = true;
  l.voiceInfo = { name: "Test voice", lang: "en-GB", local: true };
  await l.start({ type: "spelling_assess" });
  const next = [...l.events].reverse().find((e) => e.kind === "session")!;
  assert.deepEqual(next.kind === "session" && [next.delivery, next.speech], ["device_voice", { available: true, enabled: true, voice: { name: "Test voice", lang: "en-GB", local: true } }]);
});
