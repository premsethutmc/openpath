/**
 * "Change between units by a fixed factor": skill mappings for money (rupees and paise), length conversion and scale drawings,
 * exercised through the existing pathway machinery (foundationPlan, SliceSession). Synthetic learners only; mechanical
 * connections, not educator approval or learner outcomes. The choice-answer skill is prepared and recorded as blocked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CONVERSION_PATTERN_CONFIGS, LENGTH_CONVERSION_CONFIG, MONEY_DECIMALS_CONFIG, PREPARED_CHOICE_SKILLS } from "../../../packages/learning/src/subskill-config-conversion";
import { connectedSkill, connectionConfig, strategyConnects, validSkillTask } from "../../../packages/learning/src/skill-connections";
import { classifyQuestionWith } from "../../../packages/learning/src/subskill-projection";
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from "../../../packages/learning/src/foundation";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { teachable } from "../../../packages/learning/src/intervention";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { SliceSession } from "./session";

const at = Date.parse("2026-01-01T00:00:00Z");
const DAY = 86400000;
const BLOCKED = "length.compare-m-cm@1";

test("parameter partitions: every served task has exactly one skill; the generator's own validator accepts each numeric task", () => {
  for (const config of CONVERSION_PATTERN_CONFIGS) {
    assert.equal(connectionConfig(config.competency), config, "registered with the existing connection configurations");
    for (const fam of [...new Set([...config.subSkills.flatMap((s) => s.families), ...Object.keys(config.unmapped).filter((f) => f === "acmcmp")])]) for (const p of pool(fam).items) for (const form of ["", ":mc"]) {
      if (form && !FAMILIES.get(fam)!.mc) continue; // a choice family has no separate multiple-choice form
      const id = `${p.id}${form}`, skill = connectedSkill(config, id);
      if (fam === "acmcmp") { assert.equal(skill, null, `${id}: the choice family is prepared, not registered`); continue; }
      assert.ok(skill, `${id} is mapped`);
      assert.ok(validSkillTask(config, skill!, id), `${id}: the generator's own validator accepts the answer`);
    }
    for (const s of config.subSkills) assert.equal(connectedSkill(config, s.example), s.id, `${s.id} example`);
  }
  // the meaning of each partition, read from the generated question itself
  const asks = (id: string) => problemOf(id)!.prompt;
  for (const [id, re] of [["gen:acp2r:2,5", /paise into rupees/], ["gen:acpaise:1,2,0", /₹1 and 10 paise/], ["gen:acpaise:1,3,1", /₹1\.15/],
    ["gen:acdecu:0,38", /cm in metres/], ["gen:acdecu:1,5", /mm in centimetres/], ["gen:acdecu:2,140", /m in kilometres/], ["gen:acdecu:3,120", /m = how many centimetres/],
    ["gen:acmcm:1,4,0", /m 4 cm = how many centimetres/], ["gen:acmcm:1,4,1", /= 1 m and how many cm/], ["gen:acmmkm:0,2,1", /cm 1 mm = how many millimetres/],
    ["gen:acmmkm:1,5,1", /mm = 5 cm and how many mm/], ["gen:acmmkm:2,1,5", /km and how many m/], ["gen:acmmkm:3,1,0", /m = how many kilometres/], ["gen:acmmkm:4,1,0", /mm = how many centimetres/],
    ["gen:aiscale:1,2,0", /really, in km/], ["gen:aiscale:1,2,1", /on the map, in cm/], ["gen:airatio:1,3", /1 : 200.*metres/], ["gen:airatio:5,3", /1 : 50000.*km/],
    ["gen:acmcmp:1,4,1,0", /Which is longer/]] as const) assert.match(asks(id), re, id);
  // money arithmetic is another skill of the competency
  for (const id of [pool("acbill").items[0].id, pool("acmoneyadd").items[0].id, pool("acmoneymul").items[0].id]) assert.equal(classifyQuestionWith(MONEY_DECIMALS_CONFIG, id).kind, "unknown", id);
});

test("diagnostic predictions are readable as numbers for every numeric skill (the existing reader; one answer never diagnoses)", () => {
  for (const config of CONVERSION_PATTERN_CONFIGS) for (const s of config.subSkills) {
    if (s.id === BLOCKED) continue;
    const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id && problemOf(x)!.bugs.some((b) => b.predict !== null && Number.isFinite(Number(b.predict))));
    if (!id) continue; // a skill whose generator states no numeric wrong answer has no prediction to read
    const bug = problemOf(id)!.bugs.find((b) => b.predict !== null && Number.isFinite(Number(b.predict)))!;
    assert.equal(probeReading(id, bug.id, String(bug.predict)).reading, "predicted", `${s.id}: ${id} ${bug.id}`);
  }
});

for (const config of CONVERSION_PATTERN_CONFIGS) for (const s of config.subSkills) if (s.id !== BLOCKED) test(`same-skill checks, delayed check and recovery: ${s.id}`, () => {
  const learner = new SliceSession(`conv-${s.id}`, config.competency, at);
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config, requirements: [{ skill: s.id, method: false }] };
  const saved = () => withDecisions(learner.events, learner.decisions);
  let p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  const seen = new Set<string>();
  for (let i = 0; i < 12 && p.status !== "shown"; i++) {
    assert.ok(p.question, JSON.stringify(p));
    assert.equal(connectedSkill(config, p.question), s.id, "only this skill's questions count");
    assert.ok(!seen.has(p.question.replace(/:mc$/, "")), "no question is repeated");
    seen.add(p.question.replace(/:mc$/, ""));
    assert.equal(learner.submit(p.question, question(p.question).answer, "check").credit, true);
    p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  }
  assert.equal(p.status, "shown");
  learner.now += 8 * DAY;
  p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  assert.equal(p.status, "retention"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id, "the delayed check is the same skill");
  assert.ok(!seen.has(p.question.replace(/:mc$/, "")), "the delayed check is a fresh question");
  const q = question(p.question) as { answer: string; options?: string[] };
  const wrong = q.options ? "ABCD"[("ABCD".indexOf(q.answer) + 1) % q.options.length] : String(Number(q.answer) + 1);
  learner.submit(p.question, wrong, "retention");
  p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  assert.equal(p.status, "recovery"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id);
});

test("blocked (prepared, not registered): the choice-answer skill; reproducer for Codex", () => {
  const [prep] = PREPARED_CHOICE_SKILLS, id = prep.example;
  assert.equal(question(id).answer, "B");
  assert.equal(connectedSkill(LENGTH_CONVERSION_CONFIG, id), null, "not registered, so the runtime never asks or credits it");
  assert.ok(!LENGTH_CONVERSION_CONFIG.subSkills.some((s) => s.id === BLOCKED));
  // what registering it would do today: the task validator refuses every one of its tasks
  const withChoice = { ...LENGTH_CONVERSION_CONFIG, subSkills: [...LENGTH_CONVERSION_CONFIG.subSkills, { ...prep, families: [...prep.families] }] };
  assert.equal(connectedSkill(withChoice, id), BLOCKED);
  assert.ok(pool("acmcmp").items.every((p) => !validSkillTask(withChoice, BLOCKED, p.id)), "validSkillTask: Number(\"B\") is NaN");
  // ...while the foundation runtime would ask and credit it (it reads the stored verdict): runtime and audit would disagree
  const learner = new SliceSession("conv-blocked", LENGTH_CONVERSION_CONFIG.competency, at);
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config: withChoice, requirements: [{ skill: BLOCKED, method: false }] };
  const p = foundationPlan(policy, learner.learnerId, withDecisions(learner.events, learner.decisions), learner.now);
  assert.equal(connectedSkill(withChoice, p.question!), BLOCKED);
  assert.equal(learner.submit(p.question!, question(p.question!).answer, "check").credit, true);
});

test("teaching availability is reported, not substituted: no skill-scoped explanations yet; only an unscoped prerequisite pointer connects by chance", () => {
  const report: Record<string, string[]> = {};
  for (const config of CONVERSION_PATTERN_CONFIGS) { const m = moduleFor(config.competency)!; for (const s of config.subSkills) report[s.id] = m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, s.id, st)).map((st) => st.id); }
  // pinned so that any change in teaching coverage is visible in review
  assert.deepEqual(Object.entries(report).filter(([, v]) => v.length).map(([k, v]) => `${k}=${v.join("+")}`), TAUGHT_NOW);
});
// the template modules' prerequisite pointer (check_what_it_uses) has no skill scope: it "connects" only because its drawn guided
// and check questions happen to share a skill. It names prerequisites; it does not teach the skill. Reported, not counted, in
// the handover (a decision for Codex: whether unscoped prerequisite strategies may count as same-skill teaching).
const TAUGHT_NOW = ["money.decimal-rupees-to-paise@1=check_what_it_uses", "length.cm-to-m-cm@1=check_what_it_uses"];
