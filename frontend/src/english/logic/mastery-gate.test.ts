/**
 * The approved evidence rules: C′ (the mastery gate), the stricter misconception resolution, and direct spelling
 * demonstrated by dictation alone. Histories are synthetic (mastery-scenarios.ts) and run through the app's own
 * engine, ledger and profile.
 *
 * These are tests of SOFTWARE CORRECTNESS: that the app applies the approved rules to a given record and says what
 * it applied. They are not evidence that the thresholds or the question difficulties are right; those are drafts
 * (mastery-policy.ts) awaiting review and real pupils' answers.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { leafView } from "../../../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "./content.ts";
import { buildReport, diagnose } from "./diagnostics.ts";
import type { TraceEvent } from "./events.ts";
import { Learner } from "./learner.ts";
import { qualifyingAnswers } from "./mastery.ts";
import { DICTATION_CAPS, MASTERY_GATE, RESOLUTION, SINGLE_FORMAT_DEMONSTRATION } from "./mastery-policy.ts";
import { CAP, DICTATION_SCENARIOS, MASTERY_SCENARIOS, RESOLUTION_SCENARIOS, type Day, finder, finding, history, judge } from "./mastery-scenarios.ts";
import { learningPath } from "./path.ts";
import { learnerProfile } from "./profile.ts";
import { respond } from "./profile-sim.ts";
import { fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent();
const scenario = (id: string) => [...MASTERY_SCENARIOS, ...DICTATION_SCENARIOS, ...RESOLUTION_SCENARIOS].find((x) => x[0] === id)![2];

async function assertReplay(l: Learner, repo: MemoryRepo) {
  const now = l.clock();
  const reopened = await Learner.open(c, repo, l.profileId, () => now);
  const a = learnerProfile(fold(c, l.events), c, now);
  const b = learnerProfile(fold(c, reopened.events), c, now);
  assert.deepEqual(b.capabilities.map((x) => [x.id, x.standing, x.mastery, x.gate?.passed ?? null, x.notYetShown]), a.capabilities.map((x) => [x.id, x.standing, x.mastery, x.gate?.passed ?? null, x.notYetShown]));
  assert.deepEqual(b.plan.today, a.plan.today);
}

test("S1–S6: the gate decides what is called shown, and at which level; the engine's estimate and level are untouched and stay visible", async () => {
  // passed: at the engine's own level. S4 is shown at the lower level its answers support (2.5), not at the estimate (3)
  const expected: Record<string, { standing: string; passed: boolean; shown: number | null }> = {
    S1: { standing: "shown", passed: true, shown: 3 },
    S2: { standing: "developing", passed: false, shown: null },
    S3: { standing: "shown", passed: true, shown: 5 },
    S4: { standing: "shown", passed: false, shown: 2.5 },
    S5: { standing: "shown", passed: true, shown: 2.5 },
    S6: { standing: "shown", passed: true, shown: 3.5 },
  };
  for (const [id, , days] of MASTERY_SCENARIOS) {
    const { l, repo } = await history(days, c);
    const j = judge(l, c);
    assert.ok(j.engineLevel !== null, `${id}: the engine demonstrates a level (the claim being tested)`);
    assert.equal(j.gate!.level, j.engineLevel, `${id}: the gate tests the engine's own level`);
    assert.equal(j.standing, expected[id].standing, `${id}: ${j.gate!.missing.join(" ")}`);
    assert.equal(j.gate!.passed, expected[id].passed, id);
    assert.equal(j.profile.levels.demonstrated, expected[id].shown, id);
    assert.equal(j.profile.levels.estimated, j.engineLevel, `${id}: the estimate is the engine's, unchanged`);
    if (expected[id].shown === null) {
      // estimated ability, demonstrated performance and verified mastery are three different things
      assert.equal(j.mastery, null, `${id}: no mastery claim of any kind`);
      assert.match(j.profile.notYetShown!, new RegExp(`estimate supports about level ${j.engineLevel}, but it is not called shown yet`));
      assert.ok(j.profile.estimate.headline.length > 0, `${id}: the estimate is still reported`);
      assert.equal(j.profile.shownLevel, null);
    } else {
      assert.equal(j.mastery, "provisional", `${id}: shown on draft questions is provisional`);
      assert.equal(j.profile.notYetShown, null);
      assert.equal(j.profile.shownLevel, expected[id].shown);
      assert.equal(j.profile.higherNotYetShown !== null, expected[id].shown! < j.engineLevel!, `${id}: the gap to the estimate is said when there is one`);
    }
    await assertReplay(l, repo);
  }
});

test("S2 and S4: right answers on easier questions never show a harder level; the gate says exactly what is missing", async () => {
  const s2 = judge((await history(scenario("S2"), c)).l, c);
  assert.equal(s2.gate!.atLevel.length, 1);
  assert.match(s2.gate!.missing[0], /1 recent right answer at level 2 or harder \(difficulty ≥ 1\.75\).*2 are needed/);
  const s4 = judge((await history(scenario("S4"), c)).l, c);
  assert.equal(s4.profile.evidence.independentRight, 4, "4 of 6 right: a lifetime share would have allowed it");
  assert.equal(s4.gate!.atLevel.length, 0, "every right answer was on an easier question than level 3");
  assert.deepEqual(s4.gate!.next && { kind: s4.gate!.next.kind, atLeast: (s4.gate!.next as { atLeast: number }).atLeast }, { kind: "diagnostic", atLeast: 2.75 });
});

test("S5 alternating right and wrong at one level: the gate allows the level the engine supports (2.5), and the record keeps every wrong answer", async () => {
  const { l } = await history(scenario("S5"), c);
  const j = judge(l, c);
  assert.equal(j.standing, "shown");
  assert.equal(j.gate!.window.filter((a) => !a.correct).length, 3, "the three wrong answers are in the window the gate read");
  assert.equal(j.gate!.contradictions.length, 0, "none is on a question at or below level 1.5 (L − 1)");
});

test("a recent wrong answer on a clearly easier question blocks the claim; one is probed, two or more lead to practice", async () => {
  const one = judge((await history([...scenario("S3"), { answers: [["pointed", false]] }], c)).l, c);
  assert.equal(one.gate!.passed, false);
  assert.equal(one.gate!.contradictions.length, 1);
  assert.equal(one.gate!.next!.kind, "diagnostic");
  const two = judge((await history([...scenario("S3"), { answers: [["pointed", false], ["talked", false]] }], c)).l, c);
  assert.equal(two.gate!.contradictions.length, 2);
  assert.equal(two.gate!.next!.kind, "practice");
  assert.match(two.gate!.missing[0], /stays among the latest 6 answers until newer answers replace it/);
});

test("improvement after teaching: answers before the latest lesson are history for the claim, never erased", async () => {
  const { l } = await history(scenario("S1"), c);
  const j = judge(l, c);
  const lesson = l.events.find((e) => e.kind === "lesson")!;
  assert.equal(j.gate!.since, lesson.at);
  // the lesson taught doubling: earlier answers on doubling patterns are history; earlier answers on unrelated
  // patterns (y to i) keep their place in the window
  const before = j.gate!.window.filter((a) => a.at < lesson.at);
  assert.ok(before.every((a) => a.pattern === "y_to_i"), `before the lesson, only unrelated patterns stay: ${before.map((a) => a.pattern).join(", ")}`);
  assert.ok(j.gate!.superseded >= 4, "the doubling answers before the lesson are superseded");
  assert.equal(qualifyingAnswers(l.state, c, CAP).length, 10, "all ten answers are still in the record");
  assert.equal(j.standing, "shown");
  // a lesson on doubling with nothing on their own since: the doubling answers are history, but the answers on
  // unrelated patterns still support a level, which stands (a lesson changes the claim only where it taught)
  const t = judge((await history([...scenario("S3"), { lesson: true, answers: [] }], c)).l, c);
  assert.ok(t.gate!.superseded > 0);
  assert.ok(t.gate!.window.every((a) => !["double_short", "stress_doubling", "exceptions"].includes(a.pattern ?? "")), "no doubling answer from before the lesson");
  // a lesson on the very patterns of every answer: nothing stands, the claim waits for a fresh check
  const all = judge((await history([{ answers: [["stopped", true], ["dropped", true], ["shopping", true], ["clapped", true], ["grabbed", true], ["forgotten", true]] }, { lesson: true, answers: [] }], c)).l, c);
  assert.notEqual(all.standing, "shown");
  assert.equal(all.profile.levels.demonstrated, null);
  assert.equal(all.gate!.next!.kind, "fresh_check");
  assert.match(all.gate!.missing[0], /No answers on their own since the lesson/);
  // a lesson whose pattern is not known: the conservative rule, every earlier answer on the skill is history
  const unknown = judge((await history([...scenario("S3"), { lesson: "not_a_known_step", answers: [] }], c)).l, c);
  assert.equal(unknown.gate!.window.length, 0);
  assert.notEqual(unknown.standing, "shown");
  assert.ok(unknown.profile.strengths.some((x) => /^Shown earlier, at about level 5 .*not currently shown/.test(x)), unknown.profile.strengths.join(" | "));
});

test("repeated questions and repeated words never count twice", async () => {
  // the same question again: recorded, kept out of the evidence window
  const { l } = await history([...scenario("S3"), { answers: [["forgotten", true], ["beginning", true]] }], c);
  const j = judge(l, c);
  assert.equal(new Set(j.gate!.window.map((a) => a.item)).size, j.gate!.window.length, "no question twice in the window");
  assert.equal(new Set(j.gate!.atLevel.map((a) => a.item)).size, j.gate!.atLevel.length);
  // the same word on a different question (a copy of the content with a second item for one word; nothing on disk changes)
  const c2 = structuredClone(c);
  const orig = c2.dictation.items.find((i) => i.answers![0] === "forgotten")!;
  const copy = { ...orig, id: "test.copy.forgotten" } as Code;
  c2.ctx.content.items.set(copy.id, copy);
  c2.ctx.content.byCapability.get(CAP)!.push(copy);
  c2.dictation.items.push(copy as never);
  const word = finder(c2);
  const h = await history([{ answers: [["hurried", true], ["happier", true], ["opened", true]] }], c2);
  await h.l.start({ type: "spelling_assess" });
  await h.l.answer(word("forgotten"), { kind: "typed", text: "forgotten" }, { use: "assessment" });
  await h.l.answer(copy, { kind: "typed", text: "forgotten" }, { use: "assessment" });
  await h.l.stop();
  const qa = qualifyingAnswers(h.l.state, c2, CAP);
  assert.equal(qa.filter((a) => a.word === "forgotten").length, 2, "both answers are in the record");
  assert.equal(qa.find((a) => a.item === copy.id)!.repeatedWord, true);
  const g = judge(h.l, c2).gate;
  if (g) assert.ok(!g.atLevel.some((a) => a.item === copy.id), "the repeated word is not a new question at level");
});

test("assisted answers and answers straight after a lesson never establish mastery: the claim rests only on answers given alone", async () => {
  // S3's two hardest right answers given with help instead: the level cannot rest on them
  const days: Day[] = [{ answers: [["stopped", true], ["running", true], ["hurried", true], ["cried", true], ["forgotten", true, { assisted: true }], ["beginning", true, { assisted: true }]] }];
  const { l } = await history(days, c);
  const qa = qualifyingAnswers(l.state, c, CAP);
  const helped = new Set([finder(c)("forgotten").id, finder(c)("beginning").id]);
  assert.equal(qa.length, 4);
  assert.ok(!qa.some((a) => helped.has(a.item)), "helped answers are not qualifying answers");
  const j = judge(l, c);
  assert.ok(!j.gate || !j.gate.window.some((a) => helped.has(a.item)), "never in the evidence window");
  // the same record without the helped answers: the same estimate, level and standing (help adds nothing)
  const alone = judge((await history([{ answers: days[0].answers.slice(0, 4) }], c)).l, c);
  assert.deepEqual([j.engineLevel, j.standing, j.gate?.atLevel.map((a) => a.item)], [alone.engineLevel, alone.standing, alone.gate?.atLevel.map((a) => a.item)]);
  // after teaching in the same session: recorded as improvement, never in the gate's window
  const t = await history([{ lesson: true, answers: [["stopped", true], ["dropped", true], ["hurried", true], ["forgotten", true]] }], c);
  assert.equal(qualifyingAnswers(t.l.state, c, CAP).length, 0);
  assert.notEqual(judge(t.l, c).standing, "shown");
});

test("later-day retention: confirmed needs the existing retention check; a check is due only on a level the gate supported", async () => {
  const due = judge((await history([...scenario("S3"), { gap: 10, answers: [] }], c)).l, c);
  assert.equal(due.standing, "check_due");
  const kept = judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", true], ["regretted", true], ["happier", true]] }], c)).l, c);
  assert.equal(kept.engineStatus, "verified");
  assert.equal(kept.standing, "confirmed");
  const lost = judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", false], ["regretted", false], ["happier", false]] }], c)).l, c);
  assert.equal(lost.standing, "not_kept");
  // D3 never passed the gate at any level: ten days later its engine level is overdue, but "check due" would claim it
  // was shown
  const s2 = judge((await history([...scenario("D3"), { gap: 10, answers: [] }], c)).l, c);
  assert.equal(s2.engineStatus, "overdue");
  assert.equal(s2.standing, "developing");
  assert.ok(s2.gate && !s2.gate.passed, "the unsupported level is still tested, and its gap reported");
  assert.ok(!s2.profile.strengths.some((t) => /Shown earlier/.test(t)));
  // S4 was shown at 2.5 (within the retention tolerance of the engine's 3): its later check is due
  const s4 = judge((await history([...scenario("S4"), { gap: 10, answers: [] }], c)).l, c);
  assert.equal(s4.standing, "check_due");
});

test("candidate vs educator-approved content: C′ met on draft questions stays provisional; verified needs approved questions behind the claim and a later check", async () => {
  const draft = judge((await history(scenario("S3"), c)).l, c);
  assert.equal(draft.mastery, "provisional");
  assert.match(draft.profile.masteryNote!, /0 of the 2 right answers at level, on approved questions/);
  const approved = structuredClone(c);
  // H-V3: an approved version also says when it was released; only answers given after it can verify
  for (const it of approved.ctx.content.items.values()) if (it.kind === "code" && it.target === CAP) Object.assign(it as Code, { evidence_status: "validated", released_at: "2026-01-01T00:00:00.000Z" });
  const ok = judge((await history(scenario("S3"), approved)).l, approved);
  assert.equal(ok.standing, draft.standing, "the same answers: the same standing");
  // verification@2: approved questions are necessary, not sufficient; the level must also be kept at a later check
  assert.equal(ok.mastery, "provisional");
  assert.equal(ok.profile.masteryBasis, "approved");
  assert.match(ok.profile.masteryNote!, /verified only after the level is kept at a later check/);
  const kept = judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", true], ["regretted", true], ["happier", true]] }], approved)).l, approved);
  assert.equal(kept.standing, "confirmed");
  assert.equal(kept.mastery, "verified", "approved questions and kept at a later check: verified");
  assert.match(kept.profile.masteryNote!, /answered after their release, and kept at a later check .* two different fresh questions/);
  // H-V3: the same approval, released only after these answers were given: never retroactively verified
  const late = structuredClone(c);
  for (const it of late.ctx.content.items.values()) if (it.kind === "code" && it.target === CAP) Object.assign(it as Code, { evidence_status: "validated", released_at: "2027-01-01T00:00:00.000Z" });
  const lateKept = judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", true], ["regretted", true], ["happier", true]] }], late)).l, late);
  assert.deepEqual([lateKept.standing, lateKept.mastery, lateKept.profile.masteryBasis], ["confirmed", "provisional", "approved"]);
  // approved with no release recorded: never assumed released
  const unreleased = structuredClone(c);
  for (const it of unreleased.ctx.content.items.values()) if (it.kind === "code" && it.target === CAP) (it as Code).evidence_status = "validated";
  assert.equal(judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", true], ["regretted", true], ["happier", true]] }], unreleased)).l, unreleased).mastery, "provisional");
  // the same later check on draft questions: confirmed, but still not verified
  const keptDraft = judge((await history([...scenario("S3"), { gap: 8, answers: [["admitted", true], ["regretted", true], ["happier", true]] }], c)).l, c);
  assert.deepEqual([keptDraft.standing, keptDraft.mastery], ["confirmed", "provisional"]);
  assert.ok(c.dictation.items.every((i) => i.evidence_status !== "validated" && i.review === "candidate-unvalidated"), "nothing on disk was approved");
});

test("dictation alone can demonstrate direct spelling, with word and pattern diversity instead of a second format; other skills still need two formats", async () => {
  assert.deepEqual(Object.keys(SINGLE_FORMAT_DEMONSTRATION).sort(), [...DICTATION_CAPS].sort());
  assert.ok(Object.values(SINGLE_FORMAT_DEMONSTRATION).every((f) => f.length === 1 && f[0] === "typed:dictation"));
  assert.equal(c.index.framework.policy.demonstrated_min_contexts, 2, "the two-format rule itself is unchanged");
  const d1 = judge((await history(scenario("D1"), c)).l, c);
  assert.equal(leafView((await history(scenario("D1"), c)).l.state.ledger.composite, c.index, CAP, "2026-10-03T00:00:00.000Z").contexts.length, 1, "one question format only");
  assert.equal(d1.standing, "shown");
  assert.equal(d1.gate!.singleFormat, true);
  assert.ok(d1.gate!.words >= MASTERY_GATE.singleFormat.minWords && d1.gate!.patterns.length >= MASTERY_GATE.singleFormat.minPatterns);
  assert.equal(d1.mastery, "provisional", "candidate words: provisional even though C′ is met");
  // D2: at the estimate (4.5) the right answers are all one pattern; at 3.5 they span two: shown at 3.5
  const d2 = judge((await history(scenario("D2"), c)).l, c);
  assert.equal(d2.standing, "shown");
  assert.deepEqual([d2.profile.levels.estimated, d2.profile.levels.demonstrated], [4.5, 3.5]);
  assert.match(d2.gate!.missing.join(" "), /Shown by dictation only: .* 1 spelling pattern/);
  assert.deepEqual(d2.gate!.next && (d2.gate!.next as { avoidPatterns?: string[] }).avoidPatterns, d2.gate!.patterns, "the next words come from other patterns");
  // D3: one pattern at every level: nothing shown, however many words are right
  const d3 = judge((await history(scenario("D3"), c)).l, c);
  assert.notEqual(d3.standing, "shown");
  assert.equal(d3.profile.levels.demonstrated, null);
});

test("R1–R4: two right answers resolve a misconception only at the difficulty of the error and on a later day; every status lists its answers", async () => {
  const want: Record<string, [string, number | null]> = { R1: ["resolved_below", 5.75], R2: ["resolved", null], R3: ["improving", null], R4: ["resolved", null] };
  for (const [id, , days] of RESOLUTION_SCENARIOS) {
    const { l } = await history(days, c);
    const f = finding(l, c);
    assert.equal(f.status, want[id][0], `${id}: ${f.reason}`);
    assert.equal(f.below, want[id][1], id);
    assert.equal(f.support, "suspected", `${id}: one error is the evidence for it, whatever happened after`);
    const ids = new Set(l.state.ledger.decisions.map((d) => d.id));
    for (const a of [...f.errors, ...f.laterRight]) assert.ok(ids.has(a.decision), `${id}: ${a.item} traces to a ledger decision`);
    assert.equal(f.needed, Math.max(...f.errors.map((e) => e.b)) - RESOLUTION.belowHardest);
  }
  // R1 in words: never "resolved", never presented as a confirmed problem either
  const r1 = judge((await history(scenario("R1"), c)).l, c).profile;
  assert.ok(r1.difficulties.some((t) => /resolved below level 5\.75/.test(t)), r1.difficulties.join(" | "));
  assert.ok(!r1.difficulties.some((t) => /A pattern in wrong answers/.test(t)));
});

test("a later matching error contradicts a resolution; supported keeps its evidence through improving and resolved", async () => {
  const two: Day[] = [{ answers: [["admitted", "admited"], ["forgotten", "forgoten"]] }];
  const sup = finding((await history(two, c)).l, c);
  assert.deepEqual([sup.support, sup.status], ["supported", "supported"]);
  const res = finding((await history([...two, { answers: [["regretted", true], ["permitted", true]] }], c)).l, c);
  assert.deepEqual([res.support, res.status], ["supported", "resolved"]);
  const again = finding((await history([...two, { answers: [["regretted", true], ["permitted", true]] }, { answers: [["committed", "commited"]] }], c)).l, c);
  assert.deepEqual([again.support, again.status], ["supported", "supported"], "the new error is the latest: nothing since points the other way");
  assert.equal(again.errors.length, 3);
});

test("the planner keeps learning going: it collects the missing evidence at the right difficulty, says why, and the check fills the gap", async () => {
  // a pupil who is right up to about 3.6 and slips on some easier questions (placement, then the dictation check)
  let t = Date.parse("2026-10-15T09:00:00.000Z");
  const clock = Object.assign(() => new Date((t += 30_000)).toISOString(), { days: (n: number) => (t += n * 86_400_000) });
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, "Sim", "guardian", clock, "loop");
  l.speechAvailable = true;
  l.voiceInfo = { name: "Test voice", lang: "en-GB", local: true };
  const h = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const right = (it: Code) => it.b <= 3.6 && h(it.id) % 3 !== 0;
  const run = async (step: Parameters<Learner["start"]>[0]) => {
    let cur = await l.start(step, step.type === "spelling_assess" ? { delivery: "device_voice" } : {});
    const asked: Code[] = [];
    for (let i = 0; i < 40 && (cur.lesson || cur.next); i++) {
      if (cur.lesson) {
        await l.finishLesson(cur.lesson.id, true);
        cur = await l.current();
        continue;
      }
      const it = cur.next!.item as Code;
      asked.push(it);
      await l.answer(it, respond(it, right(it)), { use: cur.next!.use });
      cur = await l.current();
    }
    return asked;
  };
  await run({ type: "placement" });
  await run({ type: "spelling_assess" });
  clock.days(1);
  const p = l.profile();
  const gaps = p.capabilities.filter((x) => x.notYetShown);
  assert.ok(gaps.length > 0, "this pupil has a level the estimate supports but the evidence does not yet");
  const act = p.activities.find((a) => a.recommendation?.action === "evidence_check")!;
  assert.ok(act, `Today offers an evidence check: ${p.activities.map((a) => a.recommendation?.action).join(", ")}`);
  const cap = p.capabilities.find((x) => x.id === act.step.capability)!;
  assert.equal(act.step.target!.atLeast, cap.gate!.level - MASTERY_GATE.atLevelBelow);
  assert.equal(act.step.target!.atMost, cap.gate!.level + MASTERY_GATE.diagnosticAbove, "not far above the level: never a wall of hard questions");
  assert.match(act.recommendation!.why, /cannot be called shown yet/);
  // labels agree everywhere: profile, Today, Progress (overview), Journey and the developer report
  const { overview } = l.overview();
  for (const x of gaps) {
    assert.ok(!overview.shown.some((y) => y.id === x.id), `${x.id}: not listed as shown`);
    const line = learningPath(p, [x.id], new Set(), null, true)[0].line;
    assert.match(line, /more answers on your own at that level are needed/);
  }
  for (const x of overview.shown) assert.equal(x.mastery, "provisional", "shown on draft questions: provisional, never verified");
  const d = await diagnose(c, { pupil: { id: l.profileId, name: "Sim" }, events: l.events, now: l.clock() });
  for (const x of gaps) {
    const row = d.retention.find((r) => r.capability === x.id)!;
    assert.equal(row.standing, x.standing);
    assert.equal(row.gate, "not passed");
  }
  assert.match(buildReport(d).text, /evidence gate \(C′\) not passed/);
  // start it: the plan's reason and the difficulty range are recorded with the session; every question is in range
  const asked = await run(act.step);
  const planTrace = l.events.filter((e): e is TraceEvent => e.kind === "trace" && !!e.plan).at(-1)!.plan!;
  assert.deepEqual(planTrace.target, act.step.target);
  assert.ok(planTrace.gaps?.[cap.id], "the gap that led to it is in the trace");
  assert.ok(asked.length > 0);
  for (const it of asked) assert.ok(it.b >= act.step.target!.atLeast! - 1e-9 && it.b <= act.step.target!.atMost! + 1e-9, `${it.id} b ${it.b} in range`);
  const seenBefore = new Set(qualifyingAnswers(fold(c, l.events.slice(0, -asked.length * 4)), c, cap.id).map((a) => a.item));
  for (const it of asked) assert.ok(!seenBefore.has(it.id), "never a question asked before");
  await assertReplay(l, repo);
});

test("historical records: the rules are recomputed from the record, nothing is written, and a replay gives the same result", async () => {
  const { l, repo } = await history([...scenario("S3"), ...scenario("R1")], c);
  const before = JSON.stringify(l.events);
  l.profile();
  l.overview();
  await diagnose(c, { pupil: { id: l.profileId, name: "Sim" }, events: l.events, now: l.clock() });
  assert.equal(JSON.stringify(l.events), before, "reading the profile writes nothing");
  await assertReplay(l, repo);
});

test("practice-only words (generated, not yet checked) are recorded but never enter the evidence gate", async () => {
  const { l } = await history(scenario("S2"), c);
  const before = qualifyingAnswers(l.state, c, CAP).length;
  let cur = await l.start({ type: "spelling_practice", capability: CAP, step: "stress_doubling" });
  let n = 0;
  while ((cur.lesson || cur.next) && n < 20) {
    if (cur.lesson) await l.finishLesson(cur.lesson.id, true);
    else {
      const it = cur.next!.item as Code;
      await l.answer(it, respond(it, true), { use: cur.next!.use });
      n++;
    }
    cur = await l.current();
  }
  assert.ok(n > 0, "practice words were answered");
  assert.equal(qualifyingAnswers(l.state, c, CAP).length, before, "no practice answer qualifies");
  assert.notEqual(judge(l, c).standing, "shown");
});

test("review fixes: confirmed needs the retention gap after the first claim the gate supported, not after the engine's own first level", async () => {
  // day 1: the engine demonstrates a level from one easy pattern, which the gate supports at no level; 8 days later
  // the gate supports a level for the first time in the very session the engine treats as its later check
  const { l } = await history([...scenario("D3"), { gap: 8, answers: [["forgotten", true], ["opened", true]] }], c);
  const j = judge(l, c);
  assert.equal(j.engineStatus, "verified");
  assert.ok(j.profile.levels.demonstrated !== null);
  assert.equal(j.standing, "shown", "first supported now: shown, with a first later check still to come");
  assert.match(j.profile.retention, /First check from 2026-10-(1[7-9]|2\d)/, "at least the gap after the first supported claim (10 October)");
});

test("review fixes: one right answer keeps a supported misconception's teaching priority; resolved below needs a later day too", async () => {
  const { spellingPlan } = await import("./select.ts");
  const two: Day[] = [{ answers: [["stopped", "stoped"], ["dropped", "droped"]] }, { answers: [["clapped", true]] }];
  const { l } = await history(two, c);
  const f = finding(l, c);
  assert.deepEqual([f.support, f.status], ["supported", "improving"]);
  const p = spellingPlan(l.state, c, l.clock(), true).find((x) => x.cap === CAP && x.step === "double_short");
  if (p) assert.ok(p.reasons.some((r) => /mistakes on separate questions points here/.test(r)), p.reasons.join(" | "));
  // an error on a hard word, then right on two easy words in the same session: improving, not "resolved below"
  const same = finding((await history([{ answers: [["admitted", "admited"], ["stopped", true], ["clapped", true]] }], c)).l, c);
  assert.equal(same.status, "improving");
});

test("review fixes: going on with an adult reader keeps the evidence check's skill, range and remaining length", async () => {
  const { l } = await history(scenario("D2"), c);
  const target = { atLeast: 4.25, atMost: 5.5, avoidPatterns: ["y_to_i"], why: "test" };
  let cur = await l.start({ type: "spelling_assess", capability: CAP, purpose: "assess", target }, { delivery: "device_voice" });
  await l.answer(cur.next!.item, { kind: "typed", text: (cur.next!.item as Code).answers![0] }, { use: "assessment" });
  l.speechAvailable = false;
  cur = await l.continueWithAdultReader();
  const ev = l.state.open!.event;
  assert.deepEqual([ev.capability, ev.target, ev.delivery, ev.length], [CAP, target, "adult_reader", MASTERY_GATE.checkLength - 1]);
});
