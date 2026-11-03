/**
 * "Inverse operations undo each other": skill mappings and skill-scoped teaching for missing numbers and related facts,
 * one-step equations and missing digits, exercised through the existing pathway machinery (foundationPlan, SliceSession,
 * learnerState, projection). Synthetic learners only; mechanical connections, not educator approval or learner outcomes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INVERSE_PATTERN_CONFIGS, LINEAR_INTRO_CONFIG, MISSING_DIGIT_CONFIG, MISSING_NUMBER_CONFIG } from "../../../packages/learning/src/subskill-config-inverse";
import { connectedSkill, connectionConfig, strategyConnects, validSkillTask } from "../../../packages/learning/src/skill-connections";
import { classifyQuestionWith, projectFromEventsWith } from "../../../packages/learning/src/subskill-projection";
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from "../../../packages/learning/src/foundation";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { orderStrategies, teachable } from "../../../packages/learning/src/intervention";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { rightAnswer } from "../../../packages/learning/src/evidence";
import { runScenario } from "./scenarios";
import { misconception, right, type Learner } from "./learners";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { make, learnerState } from "../../../packages/learning/src/session";
import { SliceSession } from "./session";

const at = Date.parse("2026-01-01T00:00:00Z");
const DAY = 86400000;
const CHOICE = new Set(["acfacts"]);
const wrongFor = (id: string) => { const q = question(id) as { answer: string; options?: string[] }; return q.options ? "ABCD"[("ABCD".indexOf(q.answer) + 1) % q.options.length] : String(Number(q.answer) + 1); };

test("parameter partitions: every served task of a mapped family has exactly one skill (ambiguity classifies as unknown), or is deliberately unmapped", () => {
  for (const config of INVERSE_PATTERN_CONFIGS) {
    const registered = connectionConfig(config.competency)!;
    assert.ok(registered, `${config.competency} registered`);
    assert.equal(registered.mapping, config.mapping);
    for (const fam of new Set(config.subSkills.flatMap((s) => s.families))) for (const p of pool(fam).items) for (const form of ["", ":mc"]) {
      if (form && !FAMILIES.get(fam)!.mc) continue;
      const id = `${p.id}${form}`, skill = connectedSkill(config, id);
      if (fam === "afmissd" && p.params[2] === 1) { assert.equal(skill, null, `${id}: a digit hidden in the result is not undoing`); continue; }
      assert.ok(skill, `${id} is mapped`);
      assert.equal(config.subSkills.filter((x) => x.families.includes(fam) && (x.parameters ?? []).every((c) => c.values.includes(p.params[c.index]))).length, 1, `${id}: exactly one partition matches`);
      assert.ok(validSkillTask(config, skill!, id), `${id}: the shared answer contract accepts the task`);
    }
    for (const s of config.subSkills) assert.equal(connectedSkill(config, s.example), s.id, `${s.id} example`);
  }
  // the meaning of each partition, read from the generated question itself
  const asks = (id: string) => problemOf(id)!.prompt;
  for (const [id, re] of [["gen:acmissing:0,8,7", /□ \+ 7 = 15/], ["gen:acmissing:1,9,18", /27 − □ = 18/], ["gen:acmissing:2,15,6", /□ − 6 = 9/], ["gen:acmissing:3,7,6", /6 × □ = 42/],
    ["gen:acfacts:0,5,0", /Which subtraction fact/], ["gen:acfacts:1,5,1", /Which addition can .* use to check/], ["gen:acfacts:2,5,0", /Which division fact/], ["gen:acfacts:3,5,0", /dividend = divisor × quotient/],
    ["gen:ahone:0,7,12", /x \+ 7 = 19/], ["gen:ahone:1,4,12", /x − 4 = 8/], ["gen:ahone:2,4,9", /4x = 36/], ["gen:ahone:3,4,9", /x ÷ 4 = 9/],
    ["gen:afmissd:0,1,0,0", /^Find the missing digit: \d*□\d* \+/], ["gen:afmissd:9,1,0,1", /^Find the missing digit: \d*□\d* −/]] as const) assert.match(asks(id), re, id);
  assert.ok(pool("afmissd").items.filter((p) => p.params[2] === 1).every((p) => /= \d*□\d*\./.test(p.prompt)), "where 1 hides the digit in the result");
  for (const id of [pool("acplace").items[0].id, pool("afnim").items[0].id, pool("afriver").items[0].id]) assert.equal(classifyQuestionWith(INVERSE_PATTERN_CONFIGS.find((c) => c.competency === problemOf(id)!.competency)!, id).kind, "unknown", id);
});

test("diagnostic predictions are readable for every numeric skill (one answer never diagnoses)", () => {
  for (const config of INVERSE_PATTERN_CONFIGS) for (const s of config.subSkills) {
    if (CHOICE.has(s.families[0])) continue; // choice predictions are option choices, not numbers
    const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id && problemOf(x)!.bugs.some((b) => typeof b.predict === "number"));
    assert.ok(id, s.id);
    const bug = problemOf(id!)!.bugs.find((b) => typeof b.predict === "number")!;
    assert.equal(probeReading(id!, bug.id, String(bug.predict)).reading, "predicted", `${s.id}: ${id} ${bug.id}`);
  }
});

for (const config of INVERSE_PATTERN_CONFIGS) for (const s of config.subSkills) test(`assessment, delayed check and recovery stay on the skill: ${s.id}`, () => {
  const L = new SliceSession(`inv-${s.id}`, config.competency, at);
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config, requirements: [{ skill: s.id, method: false }] };
  const saved = () => withDecisions(L.events, L.decisions);
  let p = foundationPlan(policy, L.learnerId, saved(), L.now);
  const seen = new Set<string>();
  for (let i = 0; i < 12 && p.status !== "shown"; i++) {
    assert.ok(p.question, JSON.stringify(p));
    assert.equal(connectedSkill(config, p.question), s.id, "only this skill's questions count");
    assert.ok(!seen.has(exposureKey(p.question)), "no question is repeated");
    seen.add(exposureKey(p.question));
    assert.equal(L.submit(p.question, question(p.question).answer, "check").credit, true);
    p = foundationPlan(policy, L.learnerId, saved(), L.now);
  }
  assert.equal(p.status, "shown");
  assert.deepEqual(foundationPlan(policy, L.learnerId, JSON.parse(JSON.stringify(saved())).reverse(), L.now), p, "replay from saved events");
  L.now += 8 * DAY;
  p = foundationPlan(policy, L.learnerId, saved(), L.now);
  assert.equal(p.status, "retention"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id, "the delayed check is the same skill");
  assert.ok(!seen.has(exposureKey(p.question)), "the delayed check is a fresh question");
  assert.equal(L.submit(p.question, wrongFor(p.question), "retention").credit, false);
  p = foundationPlan(policy, L.learnerId, saved(), L.now);
  assert.equal(p.status, "recovery"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id);
});

const TAUGHT: Record<string, string> = {
  "missing.box-plus-k@1": "box_plus_k", "missing.n-minus-box@1": "n_minus_box", "missing.box-minus-k@1": "box_minus_k", "missing.k-times-box@1": "k_times_box",
  "facts.subtraction-from-addition@1": "subtraction_fact", "facts.check-subtraction-by-addition@1": "check_by_addition", "facts.division-from-multiplication@1": "division_fact", "facts.dividend-is-divisor-times-quotient@1": "dividend_divisor_quotient",
  "one-step.x-plus-a@1": "x_plus_a", "one-step.x-minus-a@1": "x_minus_a", "one-step.a-times-x@1": "a_times_x", "one-step.x-divided-by-a@1": "x_divided_by_a",
  "digit.missing-in-addend@1": "addend_digit", "digit.missing-in-first-number@1": "first_number_digit",
};
/** published fixes: each addresses a mistake that only its own skill models in the competency */
const FIXES: Record<string, [string, string]> = {
  fix_took_away_again: ["missing.box-minus-k@1", "took-away-again"],
  fix_subtract_coefficient: ["one-step.a-times-x@1", "subtract-coefficient"], fix_add_for_multiply: ["one-step.x-divided-by-a@1", "add-for-multiply"],
};
/** authored but withheld: the mistake is modelled by several skills, and misconception evidence is not keyed by skill */
const WITHHELD: Record<string, [string, string]> = {
  fix_added_both: ["missing.box-plus-k@1", "added-both"], fix_added_both_taken: ["missing.n-minus-box@1", "added-both"],
  fix_same_operation_add: ["one-step.x-plus-a@1", "same-operation"], fix_same_operation_take: ["one-step.x-minus-a@1", "same-operation"],
};
/** the skills of a competency that model each mistake id, over every served task of every family of the competency */
const modelledBy = (competency: string) => {
  const config = INVERSE_PATTERN_CONFIGS.find((c) => c.competency === competency)!, out = new Map<string, Set<string>>();
  for (const [fam, def] of FAMILIES) if (def.competency === competency) for (const p of pool(fam).items) for (const b of p.bugs) {
    if (!out.has(b.id)) out.set(b.id, new Set());
    out.get(b.id)!.add(connectedSkill(config, p.id) ?? `unmapped:${fam}`);
  }
  return out;
};
const configOf = (skill: string) => INVERSE_PATTERN_CONFIGS.find((c) => c.subSkills.some((s) => s.id === skill))!;
/** every "a ∘ b = c" line in the math is true (the substitution checks and the undo steps), read independently */
const sentences = (lines: string[]) => lines.flatMap((l) => [...l.replace(/,(\d{3})/g, "$1").matchAll(/(?<![\d□])(-?\d+) ([+−×÷]) (-?\d+) = (-?\d+)/g)].map((m) => [Number(m[1]), m[2], Number(m[3]), Number(m[4])] as const));
const holds = ([a, op, b, c]: readonly [number, string, number, number]) => (op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b) === c;

test("teaching: every skill has its own scoped explanation; worked lines undo with the instance's numbers and check the answer", () => {
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[];
  for (const config of INVERSE_PATTERN_CONFIGS) {
    const m = moduleFor(config.competency)!;
    assert.deepEqual(m.strategies.map((st) => st.id).sort(), [...config.subSkills.map((s) => TAUGHT[s.id]), ...Object.entries(FIXES).filter(([, [sk]]) => config.subSkills.some((s) => s.id === sk)).map(([id]) => id)].sort(), config.competency);
    for (const s of config.subSkills) {
      const list = m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, s.id, st));
      assert.deepEqual(list.map((st) => st.id), [TAUGHT[s.id]], `${s.id}: exactly its general explanation without misconception evidence`);
      const st = list[0];
      for (const id of [...st.screens.flatMap((b) => (b.instance ? [b.instance] : [])), st.guided, st.check]) assert.equal(connectedSkill(config, id), s.id, `${st.id}: ${id}`);
      for (const b of st.screens) {
        assert.ok(b.text.every((t) => !/\d/.test(t)), `${st.id}: the explanation states the method, not instance numbers`);
        const math = b.math ?? [];
        const ex = problemOf(b.instance!)!;
        if (CHOICE.has(ex.family)) {
          const options = (ex as { options?: string[] }).options!;
          assert.equal(math.at(-1), `So: ${options["ABCD".indexOf(String(ex.answer))]}`, `${st.id}: ends with the chosen option`);
          const eqs = sentences(math.slice(1));
          assert.ok(eqs.length >= 1 && eqs.every(holds), `${st.id}: the chosen fact is checked true (${math.join(" / ")})`);
        } else {
          const eqs = sentences(math);
          assert.ok(eqs.length >= 2 && eqs.every(holds), `${st.id}: every worked sentence is true (${math.join(" / ")})`);
          assert.match(math.at(-1)!, /^Check: /, `${st.id}: ends with the substitution check`);
          // a missing digit is read off the undone number; every other answer appears in a true sentence
          if (ex.family === "afmissd") assert.ok(math.some((l) => l.endsWith(`the missing digit is ${ex.answer}`)), `${st.id}: the worked lines reach the digit`);
          // the undo step itself (not the check) produces the answer
          else assert.ok(sentences(math.filter((l) => !l.startsWith("Check: "))).some(([, , , c]) => c === Number(ex.answer)), `${st.id}: the undo step produces the answer`);
        }
      }
      const rec = reg.find((r) => r.competency === config.competency && r.strategy === st.id);
      assert.ok(rec && rec.revisions.length > 0 && rec.revisions.every((r) => r.status === "pending_review"), `${st.id}: pending review, never approved`);
    }
  }
});

test("misconception teaching: offered only with evidence of its mistake, only for its skill, and only where the mistake's answer is distinct", () => {
  for (const [id, [skill, bug]] of Object.entries(FIXES)) {
    const config = configOf(skill), m = moduleFor(config.competency)!, fix = m.strategies.find((st) => st.id === id)!;
    assert.equal(fix.addresses, bug, id);
    assert.ok(!m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, skill, st)).includes(fix), `${id}: not general teaching`);
    assert.ok(m.strategies.filter((st) => teachable(m, st, [bug]) && strategyConnects(config, skill, st)).includes(fix), `${id}: offered with ${bug} evidence`);
    for (const other of config.subSkills.filter((s) => s.id !== skill)) assert.ok(!strategyConnects(config, other.id, fix), `${id}: not for ${other.id}`);
    // the contrast: on every taught, guided and checked item the mistake predicts one answer, different from the right one and
    // from every other modelled mistake, so a matching answer is evidence of this mistake only
    for (const q of [fix.screens[0].instance!, fix.guided, fix.check]) {
      const p = problemOf(q.replace(/:mc$/, ""))!, b = p.bugs.find((x) => x.id === bug)!;
      assert.equal(typeof b.predict, "number", q);
      assert.notEqual(b.predict, Number(p.answer), q);
      for (const o of p.bugs.filter((x) => x.id !== bug)) assert.ok(!([o.predict].flat() as unknown[]).includes(b.predict), `${q}: ${o.id} predicts the same answer`);
      assert.equal(probeReading(q.replace(/:mc$/, ""), bug, String(b.predict)).reading, "predicted", q);
    }
    assert.equal(fix.screens[0].math![0], `Not ${problemOf(fix.screens[0].instance!)!.bugs.find((x) => x.id === bug)!.predict}, but ${problemOf(fix.screens[0].instance!)!.answer}`);
    const solved = fix.screens[1].math!, eqs = sentences(solved);
    assert.ok(eqs.length >= 2 && eqs.every(holds) && /^Check: /.test(solved.at(-1)!), `${id}: the solved-correctly lines are true and checked`);
    assert.ok(fix.screens.every((b) => b.text.every((t) => !/\d/.test(t))), `${id}: text without instance numbers`);
  }
  // no fix where the contrast is missing: k × □ has a times-table slip whose predictions overlap
  assert.ok(!moduleFor(MISSING_NUMBER_CONFIG.competency)!.strategies.some((st) => st.addresses && strategyConnects(MISSING_NUMBER_CONFIG, "missing.k-times-box@1", st)));
});

for (const [skill, sid] of [...Object.entries(TAUGHT)]) test(`learner journey: teach ${sid} -> guided -> fresh check -> saved and reloaded, all ${skill}`, () => {
  const config = configOf(skill), competency = config.competency, m = moduleFor(competency)!;
  const L = new SliceSession(`inv-teach-${skill}`, competency, at);
  L.events.push(make.pathway({ learnerId: L.learnerId, sessionId: L.session, at: new Date(at - 1000).toISOString() }, competency));
  const strategy = m.strategies.find((st) => st.id === sid)!;
  L.events.push(make.teach({ learnerId: L.learnerId, sessionId: L.session, at: new Date(++L.now).toISOString() }, competency, strategy.id, "foundation-lesson-review@1"));
  let next = L.state().module(competency);
  assert.equal(next.phase, "guided", JSON.stringify(next)); assert.equal(next.question, strategy.guided);
  assert.equal(connectedSkill(config, next.question!), skill);
  assert.equal(L.submit(next.question!, question(next.question!).answer, "guided").credit, true);
  next = L.state().module(competency);
  assert.equal(next.phase, "check", JSON.stringify(next)); assert.ok(next.question);
  assert.equal(connectedSkill(config, next.question), skill, "the independent check is the taught skill");
  const shown = new Set([strategy.guided, ...strategy.screens.flatMap((b) => (b.instance ? [b.instance] : []))].map(exposureKey));
  assert.ok(!shown.has(exposureKey(next.question)), "the check is fresh: not a taught or guided example");
  const saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(competency), next, "reload keeps the same check");
  assert.equal(L.submit(next.question, question(next.question).answer, "check").credit, true);
  // the saved answers are skill evidence for this skill only; answer credit is not method credit
  const proj = projectFromEventsWith(config, L.learnerId, withDecisions(L.events, L.decisions), L.now);
  const mine = proj.subSkills.find((x) => x.id === skill)!;
  assert.ok(mine.attempts.total >= 1);
  for (const other of proj.subSkills.filter((x) => x.id !== skill)) assert.equal(other.attempts.total, 0, `${other.id} gets no evidence from ${skill}`);
  assert.ok(!JSON.stringify(mine).includes("method-verified"), "no method credit without supported verification");
});

test("saved evidence replays under its mapping: order-independent, ledger untouched, stamped with the mapping version", () => {
  for (const config of INVERSE_PATTERN_CONFIGS) {
    const L = new SliceSession(`inv-replay-${config.competency}`, config.competency, at);
    for (const s of config.subSkills) { const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id)!; L.submit(id, question(id).answer, "check"); }
    const frozen = JSON.stringify(withDecisions(L.events, L.decisions));
    const p1 = projectFromEventsWith(config, L.learnerId, JSON.parse(frozen), L.now);
    assert.equal(p1.mapping, config.mapping);
    for (const s of config.subSkills) assert.equal(p1.subSkills.find((x) => x.id === s.id)!.attempts.total, 1, s.id);
    assert.deepEqual(projectFromEventsWith(config, L.learnerId, JSON.parse(frozen).reverse(), L.now), p1);
    assert.equal(JSON.stringify(withDecisions(L.events, L.decisions)), frozen);
  }
  assert.deepEqual(INVERSE_PATTERN_CONFIGS.map((c) => c.mapping), ["missing-number-subskills@1", "linear-intro-subskills@1", "missing-digit-subskills@1"]);
  assert.ok([LINEAR_INTRO_CONFIG, MISSING_DIGIT_CONFIG].every((c) => c.core.length === c.subSkills.length));
});

test("chapter introductions are present and are not counted as skill teaching", () => {
  for (const config of INVERSE_PATTERN_CONFIGS) {
    const m = moduleFor(config.competency)!;
    assert.ok(m.chapter.length >= 1);
    for (const s of config.subSkills) for (const ch of m.chapter) assert.ok(!strategyConnects(config, s.id, { id: "chapter", title: ch.title, kind: "conceptual", needs: [], screens: [ch], guided: "", check: "" } as never), `${ch.title} is not skill teaching`);
  }
});

test("cross-skill safety: a fix is published only when its mistake is modelled by its own skill alone; the others are withheld", () => {
  for (const [id, [skill, bug]] of Object.entries(FIXES)) {
    const by = modelledBy(configOf(skill).competency).get(bug)!;
    assert.deepEqual([...by], [skill], `${id}: ${bug} is modelled only by ${skill}`);
  }
  for (const [id, [skill, bug]] of Object.entries(WITHHELD)) {
    const competency = configOf(skill).competency, by = modelledBy(competency).get(bug)!;
    assert.ok(by.size > 1, `${id}: ${bug} is modelled by ${[...by].join(", ")}`);
    const m = moduleFor(competency)!;
    assert.equal(m.strategies.find((st) => st.id === id), undefined, `${id}: withheld, not in the module`);
    assert.ok(!m.strategies.some((st) => st.addresses === bug), `${id}: no published strategy addresses ${bug}`);
  }
  // every published misconception-specific strategy of the three modules is one of the safe fixes
  for (const c of INVERSE_PATTERN_CONFIGS) for (const st of moduleFor(c.competency)!.strategies) if (st.addresses) assert.ok(FIXES[st.id], `${st.id} is a safe fix`);
});

/** a learner who makes one modelled mistake only on one family's form, until taught; right everywhere else */
const formLearner = (fam: string, bug: string, form: number): Learner => ({ name: `${bug} on ${fam} form ${form}`, act: (v) => {
  const p = problemOf(v.q.replace(/:(mc|w)$/, ""));
  return { answer: v.taught === 0 && p?.family === fam && p.params[0] === form ? (misconception(v.q, new Set([bug])) ?? right(v.q)) : right(v.q) };
} });

test("cross-skill regression (recorded evidence): added-both shown on □ + k cannot authorise a targeted fix for n − □; ordinary teaching, fresh checks and replay still work", () => {
  const MISSN = MISSING_NUMBER_CONFIG.competency, m = moduleFor(MISSN)!;
  // 1. the engine itself investigates the learner's answers on one form only (□ + k) and records the finding
  const r = runScenario({ id: "cross-skill", category: 2, start: "gen:acmissing:0,8,7", learner: () => formLearner("acmissing", "added-both", 0), expect: {} });
  const L = r.f.session, records = L.state().records;
  const h = hypotheses(records).find((x) => x.claim?.explanation === "added-both");
  assert.ok(h && ["established", "resolved"].includes(h.status), `recorded evidence for added-both: ${JSON.stringify(hypotheses(records).map((x) => [x.status, x.claim?.explanation]))}`);
  const supporting = records.attempts.filter((a) => h!.provenance.attempts.includes(a.id) && !rightAnswer(a));
  assert.ok(supporting.length >= 2 && supporting.every((a) => connectedSkill(MISSING_NUMBER_CONFIG, a.questionId) === "missing.box-plus-k@1"), `the mistakes were all on □ + k: ${supporting.map((a) => a.questionId)}`);
  // nothing addressing added-both was taught (the fixes are withheld); what was taught is ordinary teaching
  for (const t of L.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]) if (t.competency === MISSN) assert.equal(m.strategies.find((st) => st.id === t.strategy)?.addresses, undefined, t.strategy);
  // 2. move to the other form (n − □): the recorded finding authorises nothing targeted there; its ordinary teaching remains
  const ids = ["added-both"], N = "missing.n-minus-box@1";
  assert.deepEqual(m.strategies.filter((st) => teachable(m, st, ids) && strategyConnects(MISSING_NUMBER_CONFIG, N, st)).map((st) => st.id), ["n_minus_box"]);
  assert.ok(orderStrategies(m, { asked: [], posterior: {}, next: null, result: "conceptual", confidence: 1, policy: "test" } as never, records, ids).every((st) => !st.addresses), "the engine's own ordering offers no targeted fix");
  // the reason the cross-skill fixes are withheld (reproducer for shared-engine work): the engine's gate and ordering take the
  // mistake id alone, never the skill whose answers produced it. Given an id, a registered targeted fix is ordered first on
  // records that hold no answer of its skill at all: here the published □ − k fix, on records from □ + k answers only.
  assert.ok(!records.attempts.some((a) => connectedSkill(MISSING_NUMBER_CONFIG, a.questionId) === "missing.box-minus-k@1" && !rightAnswer(a)));
  assert.equal(orderStrategies(m, { asked: [], posterior: {}, next: null, result: "conceptual", confidence: 1, policy: "test" } as never, records, ["took-away-again"])[0]?.id, "fix_took_away_again", "mistake-id-only gating");
  // 3. ordinary teaching of n − □ still runs on these same records: teach → guided → fresh check → reload
  const strategy = m.strategies.find((st) => st.id === "n_minus_box")!;
  L.events.push(make.pathway({ learnerId: L.learnerId, sessionId: L.session, at: new Date(++L.now).toISOString() }, MISSN));
  L.events.push(make.teach({ learnerId: L.learnerId, sessionId: L.session, at: new Date(++L.now).toISOString() }, MISSN, strategy.id, "foundation-lesson-review@1"));
  let next = L.state().module(MISSN);
  assert.equal(next.phase, "guided", JSON.stringify(next)); assert.equal(next.question, strategy.guided);
  assert.equal(L.submit(next.question!, question(next.question!).answer, "guided").credit, true);
  next = L.state().module(MISSN);
  assert.equal(next.phase, "check", JSON.stringify(next)); assert.ok(next.question);
  assert.equal(connectedSkill(MISSING_NUMBER_CONFIG, next.question), N, "a fresh check of n − □");
  assert.ok(!records.attempts.some((a) => exposureKey(a.questionId) === exposureKey(next.question!)), "fresh: not answered before");
  const saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(MISSN), next, "saved replay keeps the same check");
  assert.equal(L.submit(next.question, question(next.question).answer, "check").credit, true);
  const proj = projectFromEventsWith(MISSING_NUMBER_CONFIG, L.learnerId, withDecisions(L.events, L.decisions), L.now);
  assert.ok(proj.subSkills.find((x) => x.id === N)!.attempts.independentRight >= 1);
});

test("a published fix is reached only through its own skill's recorded evidence: took-away-again on □ − k", () => {
  const MISSN = MISSING_NUMBER_CONFIG.competency;
  const r = runScenario({ id: "own-skill", category: 2, start: "gen:acmissing:2,15,6", learner: () => formLearner("acmissing", "took-away-again", 2), expect: {} });
  const records = r.f.session.state().records;
  const h = hypotheses(records).find((x) => x.claim?.explanation === "took-away-again")!;
  assert.ok(h && ["established", "resolved"].includes(h.status));
  assert.ok(records.attempts.filter((a) => h.provenance.attempts.includes(a.id) && !rightAnswer(a)).every((a) => connectedSkill(MISSING_NUMBER_CONFIG, a.questionId) === "missing.box-minus-k@1"));
  const taught = (r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]).filter((t) => t.competency === MISSN).map((t) => t.strategy);
  assert.ok(taught.includes("fix_took_away_again"), `taught: ${taught}`);
});
