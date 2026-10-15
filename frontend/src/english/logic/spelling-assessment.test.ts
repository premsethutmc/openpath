/**
 * The spelling check by dictation: the word bank, adaptive selection, evidence, misconceptions and history.
 *
 * These are tests of SOFTWARE CORRECTNESS: that the app does what the design says, given its own content and
 * response model. They are not evidence that the words, their difficulty bands or the targeting rule are
 * educationally right; that needs educator review and real pupils' answers (see docs/product/SPELLING_ASSESSMENT.md).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { leafView, scoreCode } from "../../../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "./content.ts";
import type { TraceEvent } from "./events.ts";
import { Learner } from "./learner.ts";
import { feedbackFor, mentionsDictationWord } from "./feedback.ts";
import { classifyError, misconceptionFindings } from "./misconceptions.ts";
import { respond } from "./profile-sim.ts";
import { DICTATION_CAPS, SPELLING_ASSESS, spellingAssessNext, spellingPlan } from "./select.ts";
import { fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent();
const bank = c.dictation.items;

function clock(start = "2026-10-15T09:00:00.000Z") {
  let t = Date.parse(start);
  const f = () => new Date((t += 30_000)).toISOString();
  f.days = (n: number) => (t += n * 86_400_000);
  return f;
}

async function learner(placementRight: (b: number) => boolean, speech = true) {
  const l = await Learner.create(c, new MemoryRepo(), "Sim", "guardian", clock(), `sim-${Math.random().toString(36).slice(2, 8)}`);
  l.speechAvailable = speech;
  l.voiceInfo = speech ? { name: "Test voice", lang: "en-GB", local: true } : null;
  await l.start({ type: "placement" });
  for (let i = 0; i < 40; i++) {
    const cur = await l.current();
    if (!cur.next) break;
    await l.answer(cur.next.item, respond(cur.next.item, placementRight((cur.next.item as Code).b)), { use: cur.next.use });
  }
  return l;
}

/** Run the dictation check: `answer` gives the typed text for each word (null = the right spelling). */
async function assess(l: Learner, answer: (it: Code, k: number) => string | null, delivery: "device_voice" | "adult_reader" = "device_voice") {
  let cur = await l.start({ type: "spelling_assess" }, { delivery });
  const asked: { item: Code; text: string; trace: TraceEvent["selection"]; est: number }[] = [];
  while (cur.next) {
    const it = cur.next.item as Code;
    const est = leafView(l.state.ledger.composite, c.index, it.target, l.clock()).mean;
    const text = answer(it, asked.length) ?? it.answers![0];
    await l.answer(it, { kind: "typed", text }, { use: cur.next.use });
    const tr = l.events.filter((e): e is TraceEvent => e.kind === "trace" && e.item?.id === it.id).at(-1);
    asked.push({ item: it, text, trace: tr?.selection, est });
    cur = await l.current();
  }
  return asked;
}

const ruleError = (it: Code, tag?: string) => Object.entries(it.wrong ?? {}).find(([, t]) => !tag || t === tag)?.[0];

test("bank: 60–100 common words on spelling patterns, every one a candidate with its provenance, never marked reviewed", () => {
  assert.ok(bank.length >= 60 && bank.length <= 100, `${bank.length} words`);
  const words = new Set<string>();
  for (const it of bank) {
    const w = it.answers![0];
    assert.equal(it.format, "typed:dictation");
    assert.equal(it.speak, w, `${it.id}: the word spoken is the word to spell`);
    assert.equal(it.answers!.length, 1, `${it.id}: one accepted spelling`);
    assert.ok(!words.has(w), `${w} appears once`);
    words.add(w);
    assert.ok(DICTATION_CAPS.includes(it.target));
    assert.ok(c.ladders.get(it.target)!.some((s) => s.id === it.step), `${it.id}: a known pattern`);
    assert.ok(it.b >= 1 && it.b <= 8);
    assert.ok(it.sentence && new RegExp(`\\b${w}\\b`, "i").test(it.sentence), `${it.id}: the spoken sentence uses the word`);
    assert.equal(it.review, "candidate-unvalidated", `${it.id}: candidate content`);
    assert.equal(it.provenance.reviewed_by, null, `${it.id}: not reviewed`);
    assert.equal(it.evidence_status, undefined, `${it.id}: not marked validated`);
    assert.ok(!/\b(spell|spelt|letters?)\b.*\b[a-z]{4,}\b/.test(it.prompt.replace(/spelt/, "")), `${it.id}: the prompt never shows the word`);
    assert.ok(!it.prompt.toLowerCase().includes(w), `${it.id}: the prompt never contains the word`);
    for (const wrong of Object.keys(it.wrong ?? {})) assert.notEqual(wrong, w);
  }
  // none of these words is an answer to the hand-written spelling questions, so neither can give the other away
  const hand = new Set([...c.handWritten].flatMap((id) => (c.ctx.content.items.get(id) as Code).answers ?? []).map((a) => a.toLowerCase()));
  assert.deepEqual([...words].filter((w) => hand.has(w)), []);
});

test("scoring: the exact spelling is right (capitals, spaces and a full stop ignored); a rule error is wrong and tagged", () => {
  const it = bank.find((i) => i.answers![0] === "stopped")!;
  assert.match(it.id, /^spl\.dict\.\d{3}$/, "the id does not spell the word (it is in the page source)");
  for (const text of ["stopped", " Stopped ", "STOPPED."]) assert.equal(scoreCode(it, { kind: "typed", text }).correct, true, text);
  assert.deepEqual(scoreCode(it, { kind: "typed", text: "stoped" }), { correct: false, misconceptions: ["no_doubling"] });
  assert.deepEqual(scoreCode(it, { kind: "typed", text: "stopt" }), { correct: false, misconceptions: [] });
});

test("no feedback on a dictation word shows another word of the check (right, or any listed wrong spelling)", () => {
  for (const it of bank)
    for (const text of [it.answers![0], ...Object.keys(it.wrong ?? {}), "zzzz"]) {
      const fb = feedbackFor(c, it, { kind: "typed", text });
      assert.ok(!mentionsDictationWord(c, `${fb.explanation} ${fb.variantNote ?? ""}`, it), `${it.answers![0]} / ${text}: "${fb.explanation}"`);
    }
});

test("words already shown elsewhere are not asked: in a question's prompt, or in a lesson that was read", async () => {
  const l = await learner(() => true);
  const words = new Set(bank.map((i) => i.answers![0]));
  // a hand-written question whose prompt contains a dictation word, shown to this learner
  const shown = [...c.handWritten].map((id) => c.ctx.content.items.get(id) as Code).find((i) => (i.prompt.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => words.has(w)))!;
  assert.ok(shown, "such a question exists in the bank");
  const word = (shown.prompt.toLowerCase().match(/[a-z]+/g) ?? []).find((w) => words.has(w))!;
  await l.start({ type: "explore" });
  await l.present(shown, "practice");
  await l.stop();
  const asked = await assess(l, () => null);
  assert.ok(!asked.some((a) => a.item.answers![0] === word), `"${word}" was shown in ${shown.id}, so it is never dictated`);
});

test("a check left unfinished is offered again; a finished one is not", async () => {
  const l = await learner(() => true);
  await l.start({ type: "spelling_assess" });
  const cur = await l.current();
  await l.answer(cur.next!.item, { kind: "typed", text: (cur.next!.item as Code).answers![0] }, { use: "assessment" });
  await l.stop();
  assert.equal(l.plan()[0].type, "spelling_assess", "stopped after one word: offered again");
  await assess(l, () => null);
  assert.notEqual(l.plan()[0]?.type, "spelling_assess");
  const stop = [...l.events].reverse().find((e): e is TraceEvent => e.kind === "trace" && !!e.selection?.spelling && !e.item)!;
  assert.ok(["stopped", "insufficient"].includes(stop.selection!.spelling!.rule) && stop.selection!.spelling!.estimates.length === 2, "the stop is recorded with the final estimates");
});

test("speech lost during the check: no unheard word is recorded; an adult reader can take over (recorded)", async () => {
  const l = await learner(() => true);
  await l.start({ type: "spelling_assess" });
  const cur = await l.current();
  l.speechAvailable = false; // reopened on a device without a voice
  assert.equal(l.speechLost(), true);
  await assert.rejects(l.answer(cur.next!.item, { kind: "typed", text: "anything" }, { use: "assessment" }), /cannot say the word/);
  const next = await l.continueWithAdultReader();
  assert.ok(next.next);
  const sessions = l.events.filter((e) => e.kind === "session" && e.type === "spelling_assess");
  assert.deepEqual(sessions.map((e) => e.kind === "session" && e.delivery), ["device_voice", "adult_reader"]);
});

test("evidence: dictation answers count as independent evidence and move the estimate; generated practice words still do not", async () => {
  const l = await learner((b) => b <= 4);
  const before = DICTATION_CAPS.map((cap) => leafView(l.state.ledger.composite, c.index, cap, l.clock()).mean);
  const asked = await assess(l, () => null);
  assert.ok(asked.length >= SPELLING_ASSESS.min);
  const decisions = l.state.ledger.decisions.filter((d) => d.observation?.item.startsWith("spl.dict."));
  assert.equal(decisions.length, asked.length);
  assert.ok(decisions.every((d) => d.verdict === "accepted" && d.observation?.use === "assessment"));
  const after = DICTATION_CAPS.map((cap) => leafView(l.state.ledger.composite, c.index, cap, l.clock()).mean);
  assert.ok(after.some((m, i) => m > before[i] + 0.2), "all right: an estimate rose");
  // evidence kinds stay distinct: the profile counts these as independent
  const inf = l.profile().capabilities.find((x) => x.id === "EN.FND.SPL.inflections")!;
  assert.ok(inf.evidence.independent >= asked.filter((a) => a.item.target === inf.id).length);
});

test("adaptive: each word is chosen after the last answer, near the current estimate, never repeated or already met", async () => {
  for (const right of [true, false]) {
    const l = await learner(() => true);
    const asked = await assess(l, (it) => (right ? null : (ruleError(it) ?? "zzzz")));
    const ids = asked.map((a) => a.item.id);
    assert.equal(new Set(ids).size, ids.length, "no word twice");
    for (const a of asked) {
      assert.ok(a.trace?.spelling, `${a.item.id}: the selection rule is recorded`);
      const w = a.trace!.spelling!.window;
      assert.ok(Math.abs(a.item.b - a.est) <= w + 1e-6, `${a.item.id}: b ${a.item.b} within ±${w} of ${a.est.toFixed(2)} (${a.trace!.spelling!.rule})`);
    }
    // the difficulty follows the answers: rising when right, falling when wrong
    const first = asked[0].item.b;
    const lastFew = asked.slice(-3).reduce((t, a) => t + a.item.b, 0) / 3;
    if (right) assert.ok(lastFew > first, `right: ${first} → ${lastFew.toFixed(2)}`);
    else assert.ok(lastFew < first, `wrong: ${first} → ${lastFew.toFixed(2)}`);
  }
});

test("adaptive: two pupils with the same placement diverge after one different answer", async () => {
  const runs = [];
  for (const firstRight of [true, false]) {
    let t = Date.parse("2026-10-15T09:00:00.000Z");
    const l = await Learner.create(c, new MemoryRepo(), "Sim", "guardian", () => new Date((t += 30_000)).toISOString(), "same");
    l.speechAvailable = true;
    await l.start({ type: "placement" });
    for (let i = 0; i < 40; i++) {
      const cur = await l.current();
      if (!cur.next) break;
      await l.answer(cur.next.item, respond(cur.next.item, (cur.next.item as Code).b <= 4.5), { use: cur.next.use });
    }
    runs.push((await assess(l, (it, k) => (k === 0 && !firstRight ? "zzzz" : null))).map((a) => a.item.id));
  }
  assert.equal(runs[0][0], runs[1][0], "the same first word");
  assert.notDeepEqual(runs[0].slice(1, 4), runs[1].slice(1, 4), "different words after one different answer");
});

test("follow-up: a rule error is followed by a different word on the same pattern; one error stays a suspicion", async () => {
  const l = await learner((b) => b <= 3.5);
  let done = false;
  const asked = await assess(l, (it) => {
    const wrong = !done && ruleError(it);
    if (wrong) done = true;
    return wrong || null;
  });
  const k = asked.findIndex((a) => a.text !== a.item.answers![0]);
  assert.ok(k >= 0, "a rule error was made");
  const next = asked[k + 1];
  assert.equal(next.trace?.spelling?.rule, "follow_up");
  assert.equal(next.item.step, asked[k].item.step, "same pattern");
  assert.notEqual(next.item.id, asked[k].item.id, "a different word");
  const tag = asked[k].item.wrong![asked[k].text];
  const f = misconceptionFindings(l.state, c).find((x) => x.misconception === tag)!;
  assert.equal(f.status, "suspected", "one error, then right on the follow-up: a suspicion only");
  // the parent never reads it as a pattern: "possibly" while the engine still lists it, nothing once it fades
  const said = l.profile().capabilities.find((x) => x.id === asked[k].item.target)!.difficulties.join(" ");
  assert.doesNotMatch(said, /A pattern in wrong answers/);
  if (leafView(l.state.ledger.composite, c.index, asked[k].item.target, l.clock()).misconceptions.some((m) => m.id === tag)) assert.match(said, /Possibly .*one wrong answer so far, not yet a pattern/);
});

test("misconceptions: suspected after one error, supported after errors on two questions, resolved after two later right answers", async () => {
  const l = await learner((b) => b <= 3.5);
  const doubling = bank.filter((i) => i.step === "double_short");
  const run = async (items: Code[], text: (it: Code) => string) => {
    await l.start({ type: "spelling_assess" });
    for (const it of items) {
      await l.answer(it, { kind: "typed", text: text(it) }, { use: "assessment" });
    }
    await l.stop();
  };
  const status = () => misconceptionFindings(l.state, c).find((x) => x.misconception === "no_doubling")?.status;
  await run(doubling.slice(0, 1), (it) => ruleError(it, "no_doubling")!);
  assert.equal(status(), "suspected");
  await run(doubling.slice(1, 2), (it) => ruleError(it, "no_doubling")!);
  assert.equal(status(), "supported");
  await run(doubling.slice(2, 4), (it) => it.answers![0]);
  assert.equal(status(), "resolved");
  // a typo is not a rule error, so it never supports a misconception
  assert.equal(classifyError("stopped", "stopepd", false, c.words), "possible_typo");
  assert.equal(classifyError("stopped", "stoppex", false, c.words), "possible_typo", "x is next to d on the keyboard");
  assert.equal(classifyError("stopped", "stoped", true, c.words), "rule_error");
  assert.equal(classifyError("recycling", "recyling", false, c.words), "spelling_error");
  assert.equal(classifyError("hurried", "worried", false, c.words), "other_word", "a different word: possibly misheard");
});

test("insufficient content: when no unused word is within reach, the check stops and says so instead of asking anything else", async () => {
  const l = await learner(() => true);
  // a record where every dictation word has already been met
  const met = { ...l.state, wordsSeen: new Set([...l.state.wordsSeen, ...bank.map((i) => i.answers![0])]) };
  await l.start({ type: "spelling_assess" });
  const choice = spellingAssessNext(met, c, l.state.open!, l.clock());
  assert.equal(choice.next, null);
  assert.equal(choice.stop, "insufficient");
  assert.match(choice.note!, /more reviewed words are needed/);
});

test("speech: without a voice the check cannot start silently; an adult reader can, and both are recorded", async () => {
  const l = await learner(() => true, false);
  await assert.rejects(l.start({ type: "spelling_assess" }), /needs speech/);
  const asked = await assess(l, () => null, "adult_reader");
  assert.ok(asked.length > 0);
  const session = l.events.find((e) => e.kind === "session" && e.type === "spelling_assess")!;
  assert.ok(session.kind === "session");
  assert.equal(session.delivery, "adult_reader");
  assert.deepEqual(session.speech, { available: false, enabled: true, voice: null });
  // no definition clue or other substitute is ever asked in the check
  assert.ok(asked.every((a) => a.item.format === "typed:dictation"));
});

test("history: records made before dictation replay exactly, and an unfinished old check still resumes its fixed list", async () => {
  const l = await learner(() => true);
  await l.start({ type: "spelling_check" });
  const first = await l.current();
  await l.answer(first.next!.item, respond(first.next!.item, false), { use: first.next!.use });
  await l.answer((await l.current()).next!.item, respond((await l.current()).next!.item, true), { use: "assessment" });
  const events = structuredClone(l.events);
  const queue = (events.find((e) => e.kind === "session" && e.type === "spelling_check") as { queue: { item: string }[] }).queue;
  // the old check is resumed where it stopped, from its stored list
  const repo = new MemoryRepo();
  await repo.replaceAll("p", events);
  const again = await Learner.open(c, repo, "p", l.clock);
  const cur = await again.current();
  assert.equal(cur.next!.item.id, queue[2].item, "the third word of the stored list");
  // rebuilding the record gives the same estimates as before (nothing relabelled)
  assert.deepEqual(fold(c, events).ledger.composite, l.state.ledger.composite);
  // and the plan now offers the dictation check
  assert.equal(again.plan()[0].type, "spelling_assess");
});

test("simulated pupils (model check, not validity): the estimate moves towards each pupil's level, including guessers and inconsistent pupils", async () => {
  const P = (theta: number, b: number) => 1 / (1 + Math.exp(-1.3 * (theta - b)));
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pupils = [
    { name: "weak", theta: 2.5 },
    { name: "middle", theta: 4.5 },
    { name: "strong", theta: 6.5 },
    { name: "inconsistent (true 5, 25% careless slips)", theta: 5, slip: 0.25 },
    { name: "guesser (typing at random half the time, true 5)", theta: 5, guess: 0.5 },
  ];
  const rows: string[] = [];
  for (const p of pupils) {
    const l = await learner((b) => rand() < P(p.theta, b));
    const before = leafView(l.state.ledger.composite, c.index, "EN.FND.SPL.inflections", l.clock()).mean;
    await assess(l, (it) => {
      if (p.guess && rand() < p.guess) return "xyz";
      if (p.slip && rand() < p.slip) return "zzzz";
      return rand() < P(p.theta, it.b) ? null : (ruleError(it) ?? "zzzz");
    });
    const after = leafView(l.state.ledger.composite, c.index, "EN.FND.SPL.inflections", l.clock());
    rows.push(`${p.name}: ${before.toFixed(2)} → ${after.mean.toFixed(2)} ± ${after.sd.toFixed(2)}`);
    if (!p.guess && !p.slip) assert.ok(Math.abs(after.mean - p.theta) < Math.abs(before - p.theta) + 0.5, `${p.name}: ${rows.at(-1)}`);
    if (p.guess || p.slip) assert.ok(after.mean < p.theta + 0.5, `${p.name}: random or careless answers never inflate the estimate (${rows.at(-1)})`);
  }
  // printed for the record; the numbers depend on the model's own assumptions
  console.log(rows.join("\n"));
});

// ------------------------------------------------------------------ approved policy A and B

test("A: a skill shown on draft questions is provisional, never presented as verified; approved questions make it verified", async () => {
  const run = async (content: typeof c) => {
    let t = Date.parse("2026-10-15T09:00:00.000Z");
    const l = await Learner.create(content, new MemoryRepo(), "Sim", "guardian", () => new Date((t += 30_000)).toISOString(), "a");
    l.speechAvailable = true;
    await l.start({ type: "placement" });
    for (let i = 0; i < 40; i++) {
      const cur = await l.current();
      if (!cur.next) break;
      await l.answer(cur.next.item, respond(cur.next.item, true), { use: cur.next.use });
    }
    let cur = await l.start({ type: "spelling_assess" });
    while (cur.next) {
      await l.answer(cur.next.item, { kind: "typed", text: (cur.next.item as Code).answers![0] }, { use: "assessment" });
      cur = await l.current();
    }
    return l.profile().capabilities.find((x) => x.id === "EN.FND.SPL.inflections")!;
  };
  const draft = await run(c);
  assert.ok(["shown", "confirmed"].includes(draft.standing), draft.standing);
  assert.equal(draft.mastery, "provisional");
  assert.match(draft.masteryNote!, /not yet approved/);
  assert.ok(draft.strengths.some((t) => /Provisionally shown.*not a verified result/.test(t)));
  assert.ok(!draft.strengths.some((t) => /Verified/.test(t)));
  // the same answers on questions an educator has approved: verified (a copy of the content; nothing on disk changes)
  const approved = structuredClone(c);
  for (const it of approved.ctx.content.items.values()) if (it.kind === "code" && it.target === "EN.FND.SPL.inflections") (it as Code).evidence_status = "validated";
  const verified = await run(approved);
  assert.equal(verified.standing, draft.standing, "the standing and the plan are unchanged: only the claim differs");
  assert.equal(verified.mastery, "verified");
  assert.ok(verified.strengths.some((t) => /Verified on educator-approved questions/.test(t)));
});

test("B: one misspelt word is a suspicion to probe, not a reason to teach; errors on separate words may lead to teaching", async () => {
  const l = await learner((b) => b <= 3.5);
  const doubling = bank.filter((i) => i.step === "double_short");
  const reasonsFor = () => spellingPlan(l.state, c, l.clock(), true).find((p) => p.cap === "EN.FND.SPL.inflections" && p.step === "double_short")!;
  await l.start({ type: "spelling_assess" });
  await l.answer(doubling[0], { kind: "typed", text: Object.keys(doubling[0].wrong!)[0] }, { use: "assessment" });
  await l.stop();
  const one = reasonsFor();
  assert.ok(one.reasons.some((r) => /a suspicion/.test(r)) && one.reasons.some((r) => /to be probed, not yet taught/.test(r)), one.reasons.join(" | "));
  assert.ok(!one.reasons.some((r) => /misspelt|mistakes on separate/.test(r)), "nothing that the plan reads as a reason to teach");
  await l.start({ type: "spelling_assess" });
  await l.answer(doubling[1], { kind: "typed", text: Object.keys(doubling[1].wrong!)[0] }, { use: "assessment" });
  await l.stop();
  const two = reasonsFor();
  assert.ok(two.reasons.some((r) => /2 words with this pattern were misspelt/.test(r)) && two.reasons.some((r) => /mistakes on separate questions points here \(no doubling\)/.test(r)), two.reasons.join(" | "));
  assert.ok(two.priority > one.priority + 3, "corroborated: a reason to teach");
  // the statuses keep their evidence: which questions, when
  const f = misconceptionFindings(l.state, c).find((x) => x.misconception === "no_doubling")!;
  assert.equal(f.status, "supported");
  assert.deepEqual(f.errors.map((e) => e.item), [doubling[0].id, doubling[1].id]);
});
