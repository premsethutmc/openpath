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
import { explainStep, exposureKey, FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { teachable } from "../../../packages/learning/src/intervention";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { SliceSession } from "./session";
import { make, learnerState } from "../../../packages/learning/src/session";
import { readFileSync } from "node:fs";

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

const TAUGHT: Record<string, string> = {
  "money.paise-to-rupees@1": "paise_to_rupees", "money.rupees-and-paise-to-paise@1": "rupees_and_paise_to_paise", "money.decimal-rupees-to-paise@1": "decimal_rupees_to_paise",
  "length.cm-to-decimal-m@1": "cm_to_decimal_m", "length.mm-to-decimal-cm@1": "mm_to_decimal_cm", "length.m-to-decimal-km@1": "m_to_decimal_km", "length.decimal-m-to-cm@1": "decimal_m_to_cm",
  "length.m-cm-to-cm@1": "m_cm_to_cm", "length.cm-to-m-cm@1": "cm_to_m_cm", "length.cm-mm-to-mm@1": "cm_mm_to_mm", "length.mm-to-cm-mm@1": "mm_to_cm_mm",
  "length.m-to-km-m@1": "m_to_km_m", "length.m-to-whole-km@1": "m_to_whole_km", "length.mm-to-whole-cm@1": "mm_to_whole_cm",
  "scale.map-to-real@1": "map_to_real", "scale.real-to-map@1": "real_to_map", "scale.ratio-plan-to-metres@1": "ratio_plan_to_metres", "scale.ratio-map-to-km@1": "ratio_map_to_km",
};

test("teaching availability: each of the 18 skills has exactly its own skill-scoped explanation, pending review", () => {
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[];
  for (const config of CONVERSION_PATTERN_CONFIGS) {
    const m = moduleFor(config.competency)!;
    // no unscoped prerequisite pointer and no unaligned template strategy remains
    assert.deepEqual(m.strategies.map((st) => st.id).sort(), config.subSkills.map((s) => TAUGHT[s.id]).sort(), config.competency);
    for (const s of config.subSkills) {
      const list = m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, s.id, st));
      assert.deepEqual(list.map((st) => st.id), [TAUGHT[s.id]], s.id);
      const st = list[0];
      for (const id of [...st.screens.flatMap((b) => (b.instance ? [b.instance] : [])), st.guided, st.check]) assert.equal(connectedSkill(config, id), s.id, `${st.id}: ${id}`);
      for (const b of st.screens) {
        const ex = problemOf(b.instance!.replace(/:mc$/, ""))!;
        assert.deepEqual(b.math, [ex.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...ex.steps.map((x) => explainStep(ex, x))], `${st.id}: the math lines are the generator's own lines for its instance`);
      }
      assert.ok(st.screens.every((b) => b.text.every((t) => !/\d/.test(t))), `${st.id}: explanation text states the method, not instance numbers`);
      const ex = problemOf(st.screens[0].instance!)!;
      assert.ok(Number(ex.answer) !== 0 && Number(ex.answer) !== 1 && !/\b0 (paise|cm|mm|m)\b/.test(ex.prompt), `${st.id}: the worked example is not trivial`);
      // ratio scales: the taught items never use a scale where the multiplication and the unit change cancel (1 : 100 to metres, 1 : 100000 to km)
      if (st.id.startsWith("ratio_")) for (const id of [st.screens[0].instance!, st.guided, st.check]) assert.ok(!/scale 1 : 100(000)?\./.test(problemOf(id.replace(/:mc$/, ""))!.prompt), `${st.id}: ${id}`);
      const rec = reg.find((r) => r.competency === config.competency && r.strategy === st.id);
      assert.ok(rec && rec.revisions.length > 0 && rec.revisions.every((r) => r.status === "pending_review"), `${st.id}: every revision pending review, never approved`);
    }
  }
});

for (const config of CONVERSION_PATTERN_CONFIGS) for (const s of config.subSkills) test(`learner journey: teach ${TAUGHT[s.id]} -> guided -> fresh check, all ${s.id}`, () => {
  const competency = config.competency, m = moduleFor(competency)!;
  const L = new SliceSession(`conv-teach-${s.id}`, competency, at);
  L.events.push(make.pathway({ learnerId: L.learnerId, sessionId: L.session, at: new Date(at - 1000).toISOString() }, competency));
  const strategy = m.strategies.find((st) => st.id === TAUGHT[s.id])!;
  L.events.push(make.teach({ learnerId: L.learnerId, sessionId: L.session, at: new Date(++L.now).toISOString() }, competency, strategy.id, "foundation-lesson-review@1"));
  let next = L.state().module(competency);
  assert.equal(next.phase, "guided", JSON.stringify(next)); assert.equal(next.question, strategy.guided);
  assert.equal(connectedSkill(config, next.question!), s.id);
  assert.equal(L.submit(next.question!, question(next.question!).answer, "guided").credit, true);
  next = L.state().module(competency);
  assert.equal(next.phase, "check", JSON.stringify(next)); assert.ok(next.question);
  assert.equal(connectedSkill(config, next.question), s.id, "the independent check is the taught skill");
  const shown = new Set([strategy.guided, ...strategy.screens.flatMap((b) => (b.instance ? [b.instance] : []))].map(exposureKey));
  assert.ok(!shown.has(exposureKey(next.question)), "the check is fresh: not a taught or guided example (same exposure)");
  const saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(competency), next, "reload keeps the same check");
});
