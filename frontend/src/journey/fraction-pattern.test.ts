/**
 * Fractions: equivalence, comparison and ordering. Skill mappings and skill-scoped explanations added to the two hand-written
 * fraction modules, exercised through the existing pathway machinery (foundationPlan, SliceSession,
 * learnerState, projection). Synthetic learners only; mechanical connections, not educator approval or learner outcomes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EQUIVALENT_FRACTIONS_CONFIG, FRACTION_COMPARISON_CONFIG, FRACTION_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-fractions";
import { connectedSkill, connectionConfig, strategyConnects, validSkillTask } from "../../../packages/learning/src/skill-connections";
import { classifyQuestionWith, projectFromEventsWith } from "../../../packages/learning/src/subskill-projection";
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from "../../../packages/learning/src/foundation";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { orderStrategies, teachable } from "../../../packages/learning/src/intervention";
import { modules } from "../../../packages/learning/src/content";
import { contentHash } from "../../../packages/learning/src/explanation-review";
import { make, learnerState } from "../../../packages/learning/src/session";
import { SliceSession } from "./session";

const at = Date.parse("2026-01-01T00:00:00Z");
const DAY = 86400000;
const CHOICE = new Set(["avfold"]);
/** a wrong answer in the question's own form: another option, the triple reversed, another fraction, another number */
const wrongFor = (id: string) => {
  const q = question(id) as { answer: string; options?: string[] };
  if (q.options) return "ABCDEFGH"[("ABCDEFGH".indexOf(q.answer) + 1) % q.options.length];
  const t = /^\((.*)\)$/.exec(q.answer); if (t) return `(${t[1].split(", ").reverse().join(", ")})`;
  const f = /^(\d+)\/(\d+)$/.exec(q.answer); if (f) return `${Number(f[1]) + 1}/${f[2]}`;
  return String(Number(q.answer) + 1);
};

/** every "a ∘ b = c" line in the math is true (the substitution checks and the undo steps), read independently */
const sentences = (lines: string[]) => lines.flatMap((l) => [...l.replace(/,(\d{3})/g, "$1").matchAll(/(?<![\d□])(-?\d+) ([+−×÷]) (-?\d+) = (-?\d+)/g)].map((m) => [Number(m[1]), m[2], Number(m[3]), Number(m[4])] as const));
const holds = ([a, op, b, c]: readonly [number, string, number, number]) => (op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b) === c;

const HANDWRITTEN: Record<string, string[]> = {
  "MATH.number.fraction-comparison": ["same_size_pieces"],
  "MATH.number.equivalent-fractions": ["strip_model", "multiply_both", "times_table_link"],
};
/** skills with a scoped explanation */
const TAUGHT: Record<string, string> = {
  "fraction.compare-same-top@1": "compare_same_top", "fraction.order-same-bottom@1": "order_same_bottom",
  "fraction.order-same-top@1": "order_same_top", "fraction.compare-unlike@1": "compare_unlike", "fraction.order-unlike@1": "order_unlike",
  "fraction.lowest-terms@1": "lowest_terms", "fraction.equal-by-folding@1": "equal_by_folding",
};
/** skills taught by the existing hand-written lesson: no scoped explanation is added (it would displace the lesson) */
const HANDWRITTEN_TEACHES: Record<string, string[]> = {
  "fraction.compare-same-bottom@1": ["same_size_pieces"], "fraction.equivalent-missing-part@1": ["strip_model", "multiply_both"],
};
/** held back with no lesson of its own (none since skill-scope@1) */
const HELD_NO_TEACHING: string[] = [];
/** the fractions written in a prompt or line, as [top, bottom] */
const fracs = (t: string) => [...t.matchAll(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
const value = ([t, b]: readonly [number, number]) => t / b;
/** every "p/q = r/s" in a line holds */
const equalities = (lines: string[]) => lines.flatMap((l) => [...l.matchAll(/(\d+)\/(\d+) = (\d+)\/(\d+)/g)].map((m) => Number(m[1]) * Number(m[4]) === Number(m[2]) * Number(m[3])));

test("independent check of every served comparison and ordering task: the generator's answer is the greater, smaller or sorted fraction(s)", () => {
  for (const fam of ["adfcmp", "adfcmpu"]) for (const p of pool(fam).items) {
    const [x, y] = fracs(p.prompt), greater = /greater/.test(p.prompt);
    const want = (value(x) > value(y)) === greater ? x : y;
    assert.equal(p.answer, `${want[0]}/${want[1]}`, p.id);
  }
  for (const fam of ["adford", "adfordu"]) for (const p of pool(fam).items) {
    const sorted = [...fracs(p.prompt.split(".")[0])].sort((a, b) => value(a) - value(b));
    assert.equal(p.answer, `(${sorted.map(([t, b]) => `${t}/${b}`).join(", ")})`, p.id);
  }
});

const configOf = (skill: string) => FRACTION_PATTERN_CONFIGS.find((c) => c.subSkills.some((s) => s.id === skill))!;

test("parameter partitions: every served task has exactly one skill, or is deliberately unmapped; the shared typed contract accepts it", () => {
  for (const config of FRACTION_PATTERN_CONFIGS) {
    assert.equal(connectionConfig(config.competency)!.mapping, config.mapping);
    for (const fam of new Set(config.subSkills.flatMap((s) => s.families))) for (const p of pool(fam).items) for (const form of ["", ":mc"]) {
      if (form && !FAMILIES.get(fam)!.mc) continue;
      const id = `${p.id}${form}`, skill = connectedSkill(config, id);
      assert.ok(skill, `${id} is mapped`);
      assert.equal(config.subSkills.filter((x) => x.families.includes(fam) && (x.parameters ?? []).every((c) => c.values.includes(p.params[c.index]))).length, 1, `${id}: exactly one partition`);
      assert.ok(validSkillTask(config, skill!, id), `${id}: trusted typed answer (${FAMILIES.get(fam)!.type})`);
    }
    for (const s of config.subSkills) assert.equal(connectedSkill(config, s.example), s.id, `${s.id} example`);
  }
  const asks = (id: string) => problemOf(id)!.prompt;
  for (const [id, re] of [["gen:adfcmp:0,3,1,2,0", /1\/3.*or 2\/3/], ["gen:adfcmp:1,1,2,4,0", /1\/2.*or 1\/4/], ["gen:adford:0,4,2,1,3", /2\/4, 1\/4, 3\/4/], ["gen:adford:1,1,2,3,10", /1\/2, 1\/3, 1\/10/],
    ["gen:adfcmpu:4,5,7,10,0", /4\/5 or 7\/10/], ["gen:adfordu:0,1,6", /in order/], ["gen:eqfrac:1,2,4", /1\/2 = □\/4/], ["gen:avlow:4,5,6", /24\/30 in its lowest terms/], ["gen:avfold:3,5,2", /folded/]] as const) assert.match(asks(id), re, id);
  for (const fam of ["adfnl", "avlike"]) for (const p of pool(fam).items) assert.equal(classifyQuestionWith(FRACTION_PATTERN_CONFIGS.find((c) => c.competency === FAMILIES.get(fam)!.competency)!, p.id).kind, "unknown", p.id);
  // the meaning of mode 0 and mode 1, read from every prompt: one shared bottom number, or one shared top number
  for (const fam of ["adfcmp", "adford"]) for (const p of pool(fam).items) {
    const fr = fracs(p.prompt), tops = new Set(fr.map(([t]) => t)), bottoms = new Set(fr.map(([, b]) => b));
    if (p.params[0] === 0) assert.ok(bottoms.size === 1 && tops.size === fr.length, `${p.id}: same bottom`);
    else assert.ok(tops.size === 1 && bottoms.size === fr.length, `${p.id}: same top`);
  }
});

for (const config of FRACTION_PATTERN_CONFIGS) for (const s of config.subSkills) test(`assessment, delayed check and recovery stay on the skill: ${s.id}`, () => {
  const L = new SliceSession(`fr-${s.id}`, config.competency, at);
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config, requirements: [{ skill: s.id, method: false }] };
  const saved = () => withDecisions(L.events, L.decisions);
  let p = foundationPlan(policy, L.learnerId, saved(), L.now);
  const seen = new Set<string>();
  for (let i = 0; i < 12 && p.status !== "shown"; i++) {
    assert.ok(p.question, JSON.stringify(p));
    assert.equal(connectedSkill(config, p.question), s.id, "only this skill's questions count");
    assert.ok(!seen.has(exposureKey(p.question)), "no question is repeated");
    seen.add(exposureKey(p.question));
    assert.equal(L.submit(p.question, question(p.question).answer, "check").credit, true, `${p.question}: the answer is credited`);
    p = foundationPlan(policy, L.learnerId, saved(), L.now);
  }
  assert.equal(p.status, "shown");
  assert.deepEqual(foundationPlan(policy, L.learnerId, JSON.parse(JSON.stringify(saved())).reverse(), L.now), p, "replay from saved events");
  L.now += 8 * DAY;
  p = foundationPlan(policy, L.learnerId, saved(), L.now);
  assert.equal(p.status, "retention"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id, "the delayed check is the same skill");
  assert.ok(!seen.has(exposureKey(p.question)), "the delayed check is a fresh question");
  assert.equal(L.submit(p.question, wrongFor(p.question), "retention").credit, false, `${p.question}: ${wrongFor(p.question)} is wrong`);
  p = foundationPlan(policy, L.learnerId, saved(), L.now);
  assert.equal(p.status, "recovery"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id);
});

test("teaching: the hand-written lessons are kept; each skill has its own scoped explanation with true worked lines, pending review", () => {
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[];
  for (const config of FRACTION_PATTERN_CONFIGS) {
    const m = moduleFor(config.competency)!;
    // the hand-written explanations are kept unchanged: their content is exactly the latest registered revision
    for (const id of HANDWRITTEN[config.competency]) {
      const st = m.strategies.find((x) => x.id === id)!;
      assert.ok(st, `${id}: kept`);
      const rec = reg.find((r) => r.competency === config.competency && r.strategy === id)!;
      assert.equal(contentHash(config.competency, st), (rec.revisions.at(-1) as unknown as { contentHash: string }).contentHash, `${id}: unchanged`);
    }
    assert.deepEqual(m.strategies.filter((st) => st.scope).map((st) => st.id).sort(), config.subSkills.filter((s) => TAUGHT[s.id]).map((s) => TAUGHT[s.id]).sort());
    assert.ok(!m.strategies.some((st) => st.addresses), "no misconception-specific fix: the modelled fraction mistakes are shared by several skills");
    for (const s of config.subSkills) {
      const list = m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, s.id, st));
      if (HELD_NO_TEACHING.includes(s.id)) { assert.deepEqual(list, [], `${s.id}: teaching held back (reported gap)`); continue; }
      if (HANDWRITTEN_TEACHES[s.id]) {
        // reported, not hidden: the hand-written lesson teaches it with authored questions, which do not connect to the mapping
        assert.deepEqual(list, [], `${s.id}: no skill-connected explanation`);
        for (const id of HANDWRITTEN_TEACHES[s.id]) assert.ok(m.strategies.some((st) => st.id === id), `${id} teaches ${s.id}`);
        continue;
      }
      assert.deepEqual(list.map((st) => st.id), [TAUGHT[s.id]], `${s.id}: exactly its own explanation`);
      const st = list[0], b = st.screens[0], ex = problemOf(b.instance!)!;
      for (const id of [b.instance!, st.guided, st.check]) assert.equal(connectedSkill(config, id), s.id, `${st.id}: ${id}`);
      assert.ok(b.text.every((t) => !/\d/.test(t)), `${st.id}: text without instance numbers`);
      const math = b.math ?? [];
      if (CHOICE.has(ex.family)) assert.equal(math.at(-1), `So: ${(ex as { options?: string[] }).options!["ABCD".indexOf(String(ex.answer))]}`);
      else assert.ok(math.some((l) => l.endsWith(String(ex.answer))), `${st.id}: the worked lines reach the answer ${ex.answer}`);
      const eqs = sentences(math);
      assert.ok(eqs.every(holds), `${st.id}: every whole-number sentence is true (${math.join(" / ")})`);
      assert.ok(equalities(math).every(Boolean), `${st.id}: every fraction equality is true (${math.join(" / ")})`);
      // the worked answer agrees with an independent computation from the instance's own fractions
      if (["adfcmp", "adfcmpu"].includes(ex.family)) { const [x, y] = fracs(ex.prompt), w = (value(x) > value(y)) === /greater/.test(ex.prompt) ? x : y; assert.equal(math.at(-1), `So the answer is ${w[0]}/${w[1]}`); }
      if (["adford", "adfordu"].includes(ex.family)) { const sorted = [...fracs(ex.prompt.split(".")[0])].sort((a, b) => value(a) - value(b)); assert.equal(math.at(-1), `So the answer is (${sorted.map(([t, bb]) => `${t}/${bb}`).join(", ")})`); }
      if (ex.family === "eqfrac") assert.ok(equalities(math).length >= 1 && /^Check by cross-multiplying/.test(math.at(-1)!), `${st.id}: cross-multiplication check`);
      const rec = reg.find((r) => r.competency === config.competency && r.strategy === st.id);
      assert.ok(rec && rec.revisions.length > 0 && rec.revisions.every((r) => r.status === "pending_review"), `${st.id}: pending review, never approved`);
    }
  }
  assert.ok(modules.length > 0);
});

for (const [skill, sid] of Object.entries(TAUGHT)) test(`learner journey: teach ${sid} -> guided -> fresh check -> saved and reloaded, all ${skill}`, () => {
  const config = configOf(skill), competency = config.competency, m = moduleFor(competency)!;
  const L = new SliceSession(`fr-teach-${skill}`, competency, at);
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
  assert.ok(!shown.has(exposureKey(next.question)), "the check is fresh");
  const saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(competency), next, "reload keeps the same check");
  assert.equal(L.submit(next.question, question(next.question).answer, "check").credit, true);
  const proj = projectFromEventsWith(config, L.learnerId, withDecisions(L.events, L.decisions), L.now);
  assert.ok(proj.subSkills.find((x) => x.id === skill)!.attempts.total >= 1);
  for (const other of proj.subSkills.filter((x) => x.id !== skill)) assert.equal(other.attempts.total, 0, `${other.id} gets no evidence from ${skill}`);
  assert.ok(!JSON.stringify(proj.subSkills.find((x) => x.id === skill)).includes("method-verified"), "answer credit is not method credit");
});

test("saved evidence replays under its mapping: order-independent, ledger untouched", () => {
  for (const config of FRACTION_PATTERN_CONFIGS) {
    const L = new SliceSession(`fr-replay-${config.competency}`, config.competency, at);
    for (const s of config.subSkills) { const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id)!; L.submit(id, question(id).answer, "check"); }
    const frozen = JSON.stringify(withDecisions(L.events, L.decisions));
    const p1 = projectFromEventsWith(config, L.learnerId, JSON.parse(frozen), L.now);
    assert.equal(p1.mapping, config.mapping);
    for (const s of config.subSkills) assert.equal(p1.subSkills.find((x) => x.id === s.id)!.attempts.total, 1, s.id);
    assert.deepEqual(projectFromEventsWith(config, L.learnerId, JSON.parse(frozen).reverse(), L.now), p1);
    assert.equal(JSON.stringify(withDecisions(L.events, L.decisions)), frozen);
  }
  assert.deepEqual([FRACTION_COMPARISON_CONFIG.mapping, EQUIVALENT_FRACTIONS_CONFIG.mapping], ["fraction-comparison-subskills@1", "equivalent-fractions-subskills@1"]);
});

test("after a mistake on a hand-taught skill the designed lesson is chosen, for either diagnosis kind (skill-scope@1)", () => {
  const first = (competency: string, qid: string, wrong: string, kind: string) => {
    const L = new SliceSession(`fr-order-${competency}-${kind}`, competency, at);
    assert.equal(L.submit(qid, wrong, "check").credit, false);
    return orderStrategies(moduleFor(competency)!, { asked: [], posterior: {}, next: null, result: kind, confidence: 1, policy: "test" } as never, L.state().records, [])[0]?.id;
  };
  assert.equal(first("MATH.number.equivalent-fractions", "gen:eqfrac:2,4,8", "6", "conceptual"), "strip_model");
  assert.equal(first("MATH.number.equivalent-fractions", "gen:eqfrac:2,4,8", "6", "procedural"), "multiply_both");
  assert.equal(first("MATH.number.fraction-comparison", "gen:adfcmp:0,3,1,2,0", "1/3", "conceptual"), "same_size_pieces");
  // before skill-scope@1 the procedural same-bottom ORDERING explanation (another skill) came first here
  assert.equal(first("MATH.number.fraction-comparison", "gen:adfcmp:0,3,1,2,0", "1/3", "procedural"), "same_size_pieces");
  // and a same-top mistake gets the same-top explanation
  assert.equal(first("MATH.number.fraction-comparison", "gen:adfcmp:1,1,2,4,0", "1/4", "conceptual"), "compare_same_top");
});
