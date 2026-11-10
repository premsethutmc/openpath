/**
 * "Change between units by a fixed factor": skill mappings for money (rupees and paise), length conversion and scale drawings,
 * exercised through the existing pathway machinery (foundationPlan, SliceSession). Synthetic learners only; mechanical
 * connections, not educator approval or learner outcomes. The choice-answer skill remains prepared, not registered; its shared typed contract is supported.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CONVERSION_PATTERN_CONFIGS, LENGTH_CONVERSION_CONFIG, LENGTH_CONVERSION_CONFIG_V1, MONEY_DECIMALS_CONFIG, PREPARED_CHOICE_SKILLS } from "../../../packages/learning/src/subskill-config-conversion";
import { connectedSkill, connectionConfig, strategyConnects, validSkillTask } from "../../../packages/learning/src/skill-connections";
import { classifyQuestionWith, projectFromEventsWith } from "../../../packages/learning/src/subskill-projection";
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
const CHOICE = "length.compare-m-cm@1";

test("parameter partitions: every served task has exactly one skill; the generator's own validator accepts each numeric task", () => {
  for (const config of CONVERSION_PATTERN_CONFIGS) {
    const registered = connectionConfig(config.competency)!;
    assert.ok(registered, "registered with the existing connection configurations");
    // Node 22 may instantiate ESM and CJS configuration modules separately. Check
    // the complete contract and its claim, not incidental object identity.
    const { broadClaim: actualClaim, ...actualContract } = registered;
    const { broadClaim: expectedClaim, ...expectedContract } = config;
    assert.deepEqual(actualContract, expectedContract);
    assert.equal(actualClaim("test evidence"), expectedClaim("test evidence"));
    for (const fam of [...new Set(config.subSkills.flatMap((s) => s.families))]) for (const p of pool(fam).items) for (const form of ["", ":mc"]) {
      if (form && !FAMILIES.get(fam)!.mc) continue; // a choice family has no separate multiple-choice form
      const id = `${p.id}${form}`, skill = connectedSkill(config, id);
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
    if (s.id === CHOICE) continue; // native choice: its predictions are option choices, read by the shared answer contract, not as numbers
    const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id && problemOf(x)!.bugs.some((b) => b.predict !== null && Number.isFinite(Number(b.predict))));
    if (!id) continue; // a skill whose generator states no numeric wrong answer has no prediction to read
    const bug = problemOf(id)!.bugs.find((b) => b.predict !== null && Number.isFinite(Number(b.predict)))!;
    assert.equal(probeReading(id, bug.id, String(bug.predict)).reading, "predicted", `${s.id}: ${id} ${bug.id}`);
  }
});

for (const config of CONVERSION_PATTERN_CONFIGS) for (const s of config.subSkills) test(`same-skill checks, delayed check and recovery: ${s.id}`, () => {
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

test("choice skill registered (length-conversion-subskills@2): trusted native-choice tasks; saved answers replay under each mapping", () => {
  assert.deepEqual(PREPARED_CHOICE_SKILLS, [], "nothing is left prepared-but-unregistered");
  assert.equal(LENGTH_CONVERSION_CONFIG.mapping, "length-conversion-subskills@2");
  assert.ok(LENGTH_CONVERSION_CONFIG.core.includes(CHOICE));
  const id = "gen:acmcmp:1,4,1,0";
  assert.equal(question(id).answer, "B");
  assert.equal(connectedSkill(LENGTH_CONVERSION_CONFIG, id), CHOICE);
  assert.ok(pool("acmcmp").items.every((p) => validSkillTask(LENGTH_CONVERSION_CONFIG, CHOICE, p.id)), "native choice labels use the trusted typed answer contract");
  assert.equal(problemOf(`${id}:mc`), null, "native choice has no separate generated MC form");
  assert.equal(validSkillTask(LENGTH_CONVERSION_CONFIG, CHOICE, `${id}:mc`), false, "invalid variants cannot borrow base-task support");
  // one saved ledger, two mappings: @1 (unmapped, answer credit only) and @2 (registered skill evidence)
  const L = new SliceSession("conv-choice-replay", LENGTH_CONVERSION_CONFIG.competency, at);
  const ids = pool("acmcmp").items.slice(0, 3).map((p) => p.id);
  for (const q of ids) assert.equal(L.submit(q, question(q).answer, "check").credit, true, `${q}: ordinary answer credit`);
  const wrong = ids[0], q0 = question(wrong) as { answer: string; options: string[] };
  assert.equal(L.submit(wrong, "ABC"[("ABC".indexOf(q0.answer) + 1) % q0.options.length], "check").credit, false, "a wrong option is not credited");
  const frozen = JSON.stringify(withDecisions(L.events, L.decisions));
  const v1 = projectFromEventsWith(LENGTH_CONVERSION_CONFIG_V1, L.learnerId, JSON.parse(frozen), L.now);
  const v2 = projectFromEventsWith(LENGTH_CONVERSION_CONFIG, L.learnerId, JSON.parse(frozen), L.now);
  assert.equal(v1.mapping, "length-conversion-subskills@1"); assert.equal(v1.subSkills.find((x) => x.id === CHOICE), undefined, "@1 does not reinterpret the saved answers as skill evidence");
  assert.equal(v2.mapping, "length-conversion-subskills@2");
  const c2 = v2.subSkills.find((x) => x.id === CHOICE)!;
  assert.equal(c2.attempts.total, 4); assert.equal(c2.attempts.independentRight, 3);
  assert.deepEqual(projectFromEventsWith(LENGTH_CONVERSION_CONFIG, L.learnerId, JSON.parse(frozen).reverse(), L.now), v2, "order-independent replay");
  assert.equal(JSON.stringify(withDecisions(L.events, L.decisions)), frozen, "replay does not rewrite the ledger");
  // answer credit is not method or misconception credit
  assert.ok(c2.attempts.total > 0 && !JSON.stringify(c2).includes("method-verified"));
});

const TAUGHT: Record<string, string> = {
  "money.paise-to-rupees@1": "paise_to_rupees", "money.rupees-and-paise-to-paise@1": "rupees_and_paise_to_paise", "money.decimal-rupees-to-paise@1": "decimal_rupees_to_paise",
  "length.cm-to-decimal-m@1": "cm_to_decimal_m", "length.mm-to-decimal-cm@1": "mm_to_decimal_cm", "length.m-to-decimal-km@1": "m_to_decimal_km", "length.decimal-m-to-cm@1": "decimal_m_to_cm",
  "length.m-cm-to-cm@1": "m_cm_to_cm", "length.cm-to-m-cm@1": "cm_to_m_cm", "length.cm-mm-to-mm@1": "cm_mm_to_mm", "length.mm-to-cm-mm@1": "mm_to_cm_mm",
  "length.m-to-km-m@1": "m_to_km_m", "length.m-to-whole-km@1": "m_to_whole_km", "length.mm-to-whole-cm@1": "mm_to_whole_cm", "length.compare-m-cm@1": "compare_m_cm",
  "scale.map-to-real@1": "map_to_real", "scale.real-to-map@1": "real_to_map", "scale.ratio-plan-to-metres@1": "ratio_plan_to_metres", "scale.ratio-map-to-km@1": "ratio_map_to_km",
};

test("teaching availability: each of the 19 skills has exactly its own skill-scoped explanation, pending review", () => {
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[];
  for (const config of CONVERSION_PATTERN_CONFIGS) {
    const m = moduleFor(config.competency)!;
    // no unscoped prerequisite pointer and no unaligned template strategy remains
    assert.deepEqual(m.strategies.map((st) => st.id).sort(), config.subSkills.map((s) => TAUGHT[s.id]).sort(), config.competency);
    for (const s of config.subSkills) {
      const list = m.strategies.filter((st) => teachable(m, st, []) && strategyConnects(config, s.id, st));
      assert.deepEqual(list.map((st) => st.id), [TAUGHT[s.id]], s.id);
      const st = list[0];
      for (const id of [...st.screens.filter((b) => b.section !== "method").flatMap((b) => (b.instance ? [b.instance] : [])), st.guided, st.check]) assert.equal(connectedSkill(config, id), s.id, `${st.id}: ${id}`);
      for (const b of st.screens.filter((b) => b.section !== "method")) {
        const ex = problemOf(b.instance!.replace(/:mc$/, ""))!;
        const own = [ex.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...ex.steps.map((x) => explainStep(ex, x))];
        // a native-choice task adds one line naming the chosen option (its answer is a letter)
        const expected = ex.options ? [...own, `So: ${ex.options["ABCDEFGH".indexOf(String(ex.answer))]}`] : own;
        assert.deepEqual(b.math, expected, `${st.id}: the math lines are the generator's own lines for its instance`);
      }
      assert.ok(st.screens.filter((b) => b.section !== "method").every((b) => b.text.every((t) => !/\d/.test(t))), `${st.id}: explanation text states the method, not instance numbers`);
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

test("prerequisite-only strategies cannot count as target teaching even when examples align", () => {
  // the conversion modules no longer carry the template pointer, so build one from an aligned target strategy: same guided and
  // check questions, only the prerequisite kind or screen role differs
  const m = moduleFor(MONEY_DECIMALS_CONFIG.competency)!;
  const target = m.strategies.find(s => s.id === "paise_to_rupees")!;
  const skill = connectedSkill(MONEY_DECIMALS_CONFIG, target.guided)!;
  assert.equal(skill, "money.paise-to-rupees@1");
  assert.equal(connectedSkill(MONEY_DECIMALS_CONFIG, target.check), skill);
  assert.equal(strategyConnects(MONEY_DECIMALS_CONFIG, skill, target), true, "the target explanation itself connects");
  const pointer = { ...target, id: "check_what_it_uses", kind: "prerequisite" as const, buildsOnPrerequisites: true, screens: [{ title: "What it uses", text: ["Each step builds on another skill."] }] };
  assert.equal(strategyConnects(MONEY_DECIMALS_CONFIG, skill, pointer), false);
  const roleOnly = { ...target, screens: target.screens.map(s => ({ ...s, role: "prerequisite" as const })) };
  assert.equal(strategyConnects(MONEY_DECIMALS_CONFIG, skill, roleOnly), false);
  // template modules still carry the pointer as help: the shared predicate neither removes it nor changes its eligibility
  const tm = moduleFor("MATH.measurement.capacity");
  const tp = tm?.strategies.find(s => s.id === "check_what_it_uses");
  if (tm && tp) assert.equal(teachable(tm, tp, []), true);
});
