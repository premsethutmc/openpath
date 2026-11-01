// S1 synthetic learner simulator: unit, behaviour, determinism, isolation and adversarial tests.
// Run from frontend/: node --import tsx --test ../research/synthetic-learners/test/*.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { phasePool } from "../../../packages/learning/src/families";
import { moduleFor } from "../../../packages/learning/src/content";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { authorizeWorking, workingEvidence } from "../../../packages/learning/src/derivation-interface";
import { readRecords, withDecisions } from "../../../packages/learning/src/records";
import { questionSpec, teachingSpec } from "../../../frontend/src/journey/renderer-adapter";
import { SliceSession } from "../../../frontend/src/journey/session";
import { loadProfile, loadProfiles, PROFILE_IDS, validateProfile } from "../src/profiles";
import { ability, initialState, KINDS, type Profile } from "../src/model";
import { readTask } from "../src/reading";
import { respond, type QuestionView } from "../src/responder";
import { SyntheticLearner, understand } from "../src/learner";
import { SimClock } from "../src/clock";
import { Rng } from "../src/rng";
import { A3Port, visible } from "../src/adapter";
import { SliceFlow } from "../../../frontend/src/journey/flow";
import { COMPETENCY, runJourney, SIM_START } from "../src/harness";

const typed = (f: string, ph = "practice") => phasePool(f, ph as never).filter((q) => !q.endsWith(":w"));
const viewOf = (qid: string): QuestionView => { const f = visible(questionSpec(qid, {}), "question"); if (f.stage !== "question") throw new Error("not a question"); return f.question; };
const perfect = (o: Partial<Profile> = {}): Profile => {
  const p = structuredClone(loadProfile("S001"));
  return { ...p, id: "TEST", skills: Object.fromEntries(KINDS.map((k) => [k, 1])) as Profile["skills"], misconceptions: {}, slip: 0, guess: 0, invalidWorkingWithCorrectAnswer: 0, working: { full: 1, partial: 0, bare: 0, none: 0, unsupportedNotation: 0 }, hints: { seek: 0, help: 0 }, ...o };
};
const ans = (p: Profile, qid: string, seed = 1) => respond(viewOf(qid), initialState(p), p, new Rng(seed));
const FAMILY_KIND: Record<string, string> = { ahone: "one-step", lin: "two-step", lboth: "both-sides", lbrk: "brackets", auleq: "modelling", aulwp: "modelling" };

test("six versioned, valid profiles with distinct seeds", () => {
  const ps = loadProfiles();
  assert.deepEqual(ps.map((p) => p.id), [...PROFILE_IDS]);
  for (const p of ps) { assert.deepEqual(validateProfile(p), []); assert.match(p.version, /^\d+\.\d+\.\d+$/); assert.match(String((p as unknown as { synthetic: string }).synthetic), /not empirical/); }
  assert.equal(new Set(ps.map((p) => p.seed)).size, 6);
});

test("every supported family is read from its visible prompt as the right kind", () => {
  for (const [f, kind] of Object.entries(FAMILY_KIND)) for (const q of typed(f).slice(0, 40)) assert.equal(readTask(viewOf(q).prompt).kind, kind, `${q}: ${viewOf(q).prompt}`);
});

const stmtOf = (prompt: string) => prompt.replace(/^(Solve|Find x:) /, "").replace(/\. What is x\?.*$/, "").replace(/\.( Choose one\.)?$/, "").replace(/−/g, "-").replace(/÷/g, "/");
test("a learner with full knowledge produces right answers (graded by the real grader) and verified working, in every family and phase", () => {
  const p = perfect();
  for (const f of Object.keys(FAMILY_KIND)) for (const ph of ["practice", "check", "retention", "diagnostic"]) for (const q of typed(f, ph).slice(0, 15)) {
    const { r, why } = ans(p, q);
    assert.equal(r.kind, "answer"); if (r.kind !== "answer") continue;
    assert.equal(gradeRequest({ id: q, response: r.answer }).verdict, "correct", `${q} ${viewOf(q).prompt} → ${r.answer} (${JSON.stringify(why.steps)})`);
    if (["ahone", "lin", "lboth", "lbrk"].includes(f) && !q.endsWith(":mc")) assert.equal(workingEvidence(authorizeWorking(stmtOf(viewOf(q).prompt), r.working)), "method-verified", `${q}: ${r.working.join(" | ")}`);
  }
});

test("misconception rules produce the modelled errors (the brief's example: 3x + 4 = x + 12)", () => {
  const p = perfect({ skills: { ...perfect().skills, "both-sides": 0 }, misconceptions: { "only-one-side": 1 } });
  const v: QuestionView = { prompt: "Solve 3x + 4 = x + 12. What is x?", input: { type: "numeric" }, hintAvailable: false, hintShown: false };
  const { r } = respond(v, initialState(p), p, new Rng(3));
  assert.equal(r.kind, "answer"); if (r.kind !== "answer") return;
  assert.equal(r.answer, "8/3"); assert.deepEqual(r.working.slice(-2), ["3x = 8", "x = 8/3"]);
  // on a real both-sides question the real grader marks it wrong and the authority finds the false step
  const q = typed("lboth").find((x) => !x.endsWith(":mc"))!; const { r: r2 } = ans(p, q);
  if (r2.kind === "answer") { assert.equal(gradeRequest({ id: q, response: r2.answer }).verdict, "incorrect"); }
  const forgot = perfect({ misconceptions: { "forgot-divide": 1 } }); const lq = typed("lin").find((x) => !x.endsWith(":mc"))!;
  const { r: r3, why } = ans(forgot, lq); assert.ok(why.steps.some((s) => s.outcome === "misconception:forgot-divide")); if (r3.kind === "answer") assert.equal(gradeRequest({ id: lq, response: r3.answer }).verdict, "incorrect");
});

test("correct answers reached through invalid working, bare answers, partial working, unsupported notation", () => {
  const lq = typed("lin").filter((x) => !x.endsWith(":mc"))[3], stmt = stmtOf(viewOf(lq).prompt);
  const get = (p: Profile) => { const { r } = ans(p, lq); assert.equal(r.kind, "answer"); return r as { kind: "answer"; answer: string; working: string[] }; };
  const inv = get(perfect({ invalidWorkingWithCorrectAnswer: 1 }));
  assert.equal(gradeRequest({ id: lq, response: inv.answer }).verdict, "correct"); assert.equal(workingEvidence(authorizeWorking(stmt, inv.working)), "method-false-step");
  const bare = get(perfect({ working: { full: 0, partial: 0, bare: 1, none: 0, unsupportedNotation: 0 } }));
  assert.equal(bare.working.length, 1); assert.equal(workingEvidence(authorizeWorking(stmt, bare.working)), "no-method-evidence");
  const part = get(perfect({ working: { full: 0, partial: 1, bare: 0, none: 0, unsupportedNotation: 0 } }));
  assert.equal(part.working.length, 2); assert.notEqual(authorizeWorking(stmt, part.working).status, "invalid");
  const uns = get(perfect({ working: { full: 1, partial: 0, bare: 0, none: 0, unsupportedNotation: 1 } }));
  assert.match(uns.working.join(" "), / [-+] \d+ = .* [-+] \d+|\//); assert.notEqual(workingEvidence(authorizeWorking(stmt, uns.working)), "method-false-step");
});

test("with unsupported notation, a misconception's error stays on the line where it is made", () => {
  const cases: [string, Partial<Profile["misconceptions"]>][] = [["lboth", { "only-one-side": 1 }], ["lbrk", { "first-term-only": 1 }], ["lin", { "added-not-subtracted": 1 }], ["ahone", { "inverse-operation": 1 }]];
  for (const [f, mis] of cases) for (const q of typed(f).filter((x) => !x.endsWith(":mc")).slice(0, 12)) {
    const p = perfect({ misconceptions: mis as Profile["misconceptions"], working: { full: 1, partial: 0, bare: 0, none: 0, unsupportedNotation: 1 } });
    const { r, why } = ans(p, q); assert.equal(r.kind, "answer"); if (r.kind !== "answer") continue;
    const plain = ans(perfect({ misconceptions: mis as Profile["misconceptions"] }), q).r as { working: string[] };
    const errAt = why.steps.findIndex((s) => s.outcome.startsWith("misconception:"));
    if (errAt < 0) continue;   // this question offers no opportunity for the misconception
    const a = authorizeWorking(stmtOf(viewOf(q).prompt), r.working);
    assert.equal(a.status, "invalid", `${q}: ${r.working.join(" | ")}`);
    assert.ok(r.working.includes(plain.working[Math.min(errAt, plain.working.length - 1)]) || f === "ahone", `${q}: the erroneous step is written plainly: ${r.working.join(" | ")} vs ${plain.working.join(" | ")}`);
  }
});

test("guessed multiple-choice answers are options, without working; unknown prompts are guessed", () => {
  const g = perfect({ guess: 1 });
  for (const q of typed("lin").filter((x) => x.endsWith(":mc")).slice(0, 10)) { const { r, why } = ans(g, q); assert.equal(why.mode, "guessed"); if (r.kind === "answer") { assert.ok(viewOf(q).input.choices!.some((c) => c.id === r.answer)); assert.deepEqual(r.working, []); } }
  const { why } = respond({ prompt: "Two students solved equations…", input: { type: "numeric" }, hintAvailable: false, hintShown: false }, initialState(perfect()), perfect(), new Rng(1));
  assert.equal(why.mode, "not-understood");
});

test("assisted vs independent: a hint is asked where offered; assisted answers do not count as independent practice; a guess is not practice", () => {
  const g = new SyntheticLearner(perfect({ guess: 1, skills: { ...perfect().skills, "two-step": 0.3 } }), new SimClock(SIM_START), 5); const g0 = g.hiddenSnapshot().skill["two-step"];
  g.respond(viewOf(typed("lin").find((x) => !x.endsWith(":mc"))!)); g.observeFeedback("incorrect"); assert.deepEqual(g.hiddenSnapshot().skill["two-step"], g0);
  const p = perfect({ skills: { ...perfect().skills, "two-step": 0 }, hints: { seek: 1, help: 1 } });
  const L = new SyntheticLearner(p, new SimClock(SIM_START), 5);
  const v = viewOf(typed("lin").find((x) => !x.endsWith(":mc"))!);
  assert.equal(L.respond({ ...v, hintAvailable: true }).kind, "hint");
  const before = L.hiddenSnapshot().skill["two-step"];
  const r = L.respond({ ...v, hintAvailable: true, hintShown: true }); assert.equal(r.kind, "answer");
  L.observeFeedback("correct");
  assert.deepEqual(L.hiddenSnapshot().skill["two-step"], before, "assisted practice is not independent consolidation");
});

test("learning is drawn, not guaranteed: success, partial, none; only what the explanation addresses improves", () => {
  const S002 = loadProfile("S002"), outcomes = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) { const L = new SyntheticLearner(S002, new SimClock(SIM_START), seed); L.observeTeaching({ title: "x on both sides", text: "" }); outcomes.add(String((L.hiddenTrace().at(-1)!.detail as { outcome: string }).outcome)); }
  assert.deepEqual([...outcomes].sort(), ["full", "none", "partial"]);
  const yes = new SyntheticLearner({ ...S002, instruction: { ...S002.instruction, full: 1, partial: 0 } }, new SimClock(SIM_START), 1);
  const a0 = yes.hiddenSnapshot(); yes.observeTeaching({ title: "x on both sides", text: "" }); const a1 = yes.hiddenSnapshot();
  assert.ok(ability(a1, "both-sides") > ability(a0, "both-sides"));
  assert.ok(ability(a1, "brackets") - ability(a0, "brackets") < (ability(a1, "both-sides") - ability(a0, "both-sides")) / 5, "an explanation of another kind barely helps");
  const no = new SyntheticLearner({ ...S002, instruction: { ...S002.instruction, full: 0, partial: 0 } }, new SimClock(SIM_START), 1);
  const b0 = no.hiddenSnapshot(); no.observeTeaching({ title: "x on both sides", text: "" }); assert.deepEqual(no.hiddenSnapshot().skill, b0.skill, "failed learning changes nothing");
  const unread = new SyntheticLearner({ ...S002, instruction: { ...S002.instruction, full: 1, partial: 0 } }, new SimClock(SIM_START), 1);
  const c0 = unread.hiddenSnapshot(); unread.observeTeaching({ title: "Some unrelated page", text: "" });
  assert.deepEqual(unread.hiddenSnapshot().skill, c0.skill, "being shown something the learner cannot place teaches nothing");
  assert.deepEqual(understand({ title: "Multiply every term in the bracket", text: "" }), { kind: "brackets", misconception: "first-term-only", title: "Multiply every term in the bracket" });
});

test("misconception persistence and change depend on the profile and on the explanation delivered", () => {
  const S003 = loadProfile("S003");
  const stubborn = new SyntheticLearner({ ...S003, instruction: { ...S003.instruction, full: 1, partial: 0, misconceptionResponse: 0 } }, new SimClock(SIM_START), 1);
  stubborn.observeTeaching({ title: "Multiply every term in the bracket", text: "" });
  assert.equal(stubborn.hiddenSnapshot().misconception["first-term-only"], S003.misconceptions["first-term-only"]);
  const open = new SyntheticLearner({ ...S003, instruction: { ...S003.instruction, full: 1, partial: 0, misconceptionResponse: 1 } }, new SimClock(SIM_START), 1);
  open.observeTeaching({ title: "x on both sides", text: "" });   // general explanation: does not target first-term-only
  assert.equal(open.hiddenSnapshot().misconception["first-term-only"], S003.misconceptions["first-term-only"]);
  open.observeTeaching({ title: "Multiply every term in the bracket", text: "" });
  assert.ok(open.hiddenSnapshot().misconception["first-term-only"]! < S003.misconceptions["first-term-only"]!);
});

test("forgetting over simulated days, faster for the forgetful learner; recovery can succeed or fail", () => {
  const S006 = loadProfile("S006"), S001 = loadProfile("S001");
  const f = new SyntheticLearner({ ...S006, instruction: { ...S006.instruction, full: 1, partial: 0 } }, new SimClock(SIM_START), 2);
  f.observeTeaching({ title: "Undo one step at a time", text: "" }); const taught = ability(f.hiddenSnapshot(), "two-step");
  f.advance(14); const after = ability(f.hiddenSnapshot(), "two-step");
  assert.ok(after < taught - 0.2, `forgetful: ${taught} → ${after}`);
  const s = new SyntheticLearner(S001, new SimClock(SIM_START), 2); const s0 = ability(s.hiddenSnapshot(), "two-step"); s.advance(14);
  assert.ok(s0 - ability(s.hiddenSnapshot(), "two-step") < 0.02);
  f.observeTeaching({ title: "Undo one step at a time", text: "" }); assert.ok(ability(f.hiddenSnapshot(), "two-step") > after, "recovery succeeds when instruction lands");
  const fail = new SyntheticLearner({ ...S006, instruction: { ...S006.instruction, full: 0, partial: 0 } }, new SimClock(SIM_START), 2); fail.advance(14);
  const x = ability(fail.hiddenSnapshot(), "two-step"); fail.observeTeaching({ title: "Undo one step at a time", text: "" }); assert.equal(ability(fail.hiddenSnapshot(), "two-step"), x, "recovery can fail");
});

test("simulated time: deterministic clock, never backwards, no real clock in the simulator", async () => {
  const c = new SimClock(SIM_START); c.advanceDays(1.5); assert.equal(c.now, SIM_START + 1.5 * 86_400_000);
  assert.throws(() => c.advanceDays(-1)); assert.throws(() => new SimClock(NaN));
  const { readdirSync, readFileSync } = await import("node:fs");
  for (const f of readdirSync(new URL("../src/", import.meta.url))) assert.doesNotMatch(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8"), /Date\.now\(|Math\.random\(/, f);
});

test("deterministic responses and hidden transitions; identical full journeys for identical inputs (all six profiles)", () => {
  const v = viewOf(typed("lbrk")[2]), p = loadProfile("S003");
  assert.deepEqual(respond(v, initialState(p), p, new Rng(9)), respond(v, initialState(p), p, new Rng(9)));
  for (const id of PROFILE_IDS) {
    const a = runJourney(loadProfile(id)), b = runJourney(loadProfile(id));
    assert.deepEqual(a.digests, b.digests, id);
    assert.notEqual(runJourney(loadProfile(id), { seed: 77 }).digests.boundary, a.digests.boundary, `${id}: another seed gives another learner`);
  }
  // across processes: the committed traces were written by a separate process (scripts/traces.mts)
  const committed = JSON.parse(readFileSync(new URL("../traces/summary.json", import.meta.url), "utf8")) as { profile: string; digests: unknown }[];
  for (const id of PROFILE_IDS) assert.deepEqual(runJourney(loadProfile(id)).digests, committed.find((c) => c.profile.startsWith(id))!.digests, `${id} matches the separately generated trace`);
});

test("hidden state isolation: nothing hidden crosses the boundary, nothing internal reaches the learner", () => {
  const r = runJourney(loadProfile("S002"));
  const boundary = JSON.stringify(r.boundary), records = JSON.stringify(r.openpath.records);
  assert.doesNotMatch(boundary, /gen:|generatorRef|questionId|"answer":|verdict|evidence|certificate|status/, "the learner sees only learner-visible content");
  assert.doesNotMatch(records, /fragile|stable|misconceptionOrigin|synthetic-learning-model|"seed"/, "no hidden state in OpenPath's records");
  const L = new SyntheticLearner(loadProfile("S001"), new SimClock(SIM_START));
  assert.deepEqual(Object.keys(L).sort(), ["clock", "profile"], "the hidden state is a private field");
  // the learner's answer depends on what it sees, not on the question id: the same prompt under two ids gives the same response
  const q1 = typed("lin")[0], v1 = viewOf(q1);
  const a = respond(v1, initialState(loadProfile("S003")), loadProfile("S003"), new Rng(4)), b = respond({ ...v1 }, initialState(loadProfile("S003")), loadProfile("S003"), new Rng(4));
  assert.deepEqual(a, b);
});

test("historical compatibility: simulator records are ordinary records and replay identically after a restart", () => {
  const r = runJourney(loadProfile("S005"));
  const events = r.openpath.records as never[];
  const keys = new Set(events.filter((e: { record?: string }) => e.record === "attempt").flatMap((e) => Object.keys(e)));
  for (const k of keys) assert.ok(["kind", "id", "at", "learnerId", "sessionId", "record", "questionId", "response", "activity", "hints", "solution", "competency", "context", "working", "assessment"].includes(k), `unexpected attempt field ${k}`);
  const learnerId = (events[0] as { learnerId: string }).learnerId;
  const s = SliceSession.fromEvents(learnerId, COMPETENCY, events, Date.parse("2026-06-01T00:00:00Z"), "s9");
  assert.equal(readRecords(learnerId, events).attempts.length, readRecords(learnerId, withDecisions(s.events, {})).attempts.length);
});

test("adversarial: the simulator cannot create trusted verdicts, certificates or mastery", () => {
  const entry = moduleFor(COMPETENCY)!.diagnostics[0];
  const flow = new SliceFlow(entry, "adversary", SIM_START);
  const port = new A3Port(flow);
  assert.deepEqual(Object.keys(port), ["contract"], "the port exposes nothing but its contract and methods (the flow is private)");
  assert.deepEqual(Object.getOwnPropertyNames(Object.getPrototypeOf(port)).sort(), ["act", "constructor", "frame", "later"]);
  // smuggled fields on an action are dropped: only value and working reach the renderer event
  port.act({ type: "answer", value: "999", working: ["certificate: openpath-derivation-certificate@3 digest 00", "x = 999"], decision: { verdict: "correct", decidedBy: "server" }, credit: true, assessment: { derivationVerified: true }, mastery: "verified" } as never);
  const ev = flow.session.events.at(-1) as unknown as Record<string, unknown> & { assessment?: { derivationVerified?: boolean } };
  assert.equal(ev.response, "999"); assert.equal("credit" in ev, false); assert.equal("mastery" in ev, false); assert.notEqual(ev.assessment?.derivationVerified, true);
  const d = flow.session.decisions[ev.id as string]; assert.equal(d?.verdict, "incorrect"); assert.equal(d?.decidedBy, "server");
  assert.equal(flow.session.replies.at(-1)!.verdict, "incorrect", "the real grader decided");
  const evd = flow.session.state().evidence(COMPETENCY); assert.notEqual(evd.status, "verified"); assert.equal(evd.verified, false);
  // a frame is a copy of visible content: mutating it cannot change OpenPath
  const f = port.frame() as { feedback?: string }; f.feedback = "correct"; assert.notEqual((port.frame() as { feedback?: string }).feedback, "correct");
  // teaching frames carry only title and text
  const m = moduleFor(COMPETENCY)!; const tf = visible(teachingSpec(entry, m.strategies[0], 1, { message: m.strategies[0].title, tone: "neutral" }), "teaching", 1);
  assert.deepEqual(Object.keys((tf as { teaching: object }).teaching).sort(), ["text", "title"]);
});
