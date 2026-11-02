/**
 * "One symbol, bar or digit stands for a fixed amount": skill mappings for pictographs, scaled bar charts and place value
 * (tens), exercised through the existing pathway machinery (foundationPlan, SliceSession, learnerState). Synthetic learners
 * only; mechanical connections, not educator approval or learner outcomes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { PICTOGRAPHS_CONFIG, SCALED_BARS_CONFIG, PLACE_VALUE_TENS_CONFIG, SCALE_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-scale";
import { connectedSkill, connectionConfig, strategyConnects, validSkillTask } from "../../../packages/learning/src/skill-connections";
import { classifyQuestionWith, projectFromEventsWith } from "../../../packages/learning/src/subskill-projection";
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from "../../../packages/learning/src/foundation";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { pool, problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { teachable } from "../../../packages/learning/src/intervention";
import { make, learnerState } from "../../../packages/learning/src/session";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { SliceSession } from "./session";
import { readFileSync } from "node:fs";
import { explainStep } from "../../../packages/learning/src/families";
const explainStepText = (id: string) => { const p = problemOf(id.replace(/:mc$/, ""))!; return p.steps.map((x) => explainStep(p, x)).join(" | "); };
const pv0 = () => moduleFor(PLACE_VALUE_TENS_CONFIG.competency)!;

const at = Date.parse("2026-01-01T00:00:00Z");
const DAY = 86400000;

test("parameter partitions: every served task of a mapped family has exactly one skill, or is deliberately unmapped", () => {
  const KEY_ONE = new Set(["acpict", "acpictmore"]);
  for (const config of SCALE_PATTERN_CONFIGS) {
    assert.equal(connectionConfig(config.competency), config, "registered with the existing connection configurations");
    for (const fam of [...new Set(config.subSkills.flatMap((s) => s.families))]) {
      for (const p of pool(fam).items) for (const form of ["", ":mc"]) {
        const id = `${p.id}${form}`;
        const skill = connectedSkill(config, id);
        if (KEY_ONE.has(fam) && p.params[0] === 0) { assert.equal(skill, null, `${id}: a key of 1 uses no unit value`); continue; }
        assert.ok(skill, `${id} is mapped`);
        assert.ok(validSkillTask(config, skill!, id), `${id}: the generator's own validator accepts the answer`);
      }
    }
    for (const s of config.subSkills) assert.equal(connectedSkill(config, s.example), s.id, `${s.id} example`);
  }
  // the meaning of each partition, read from the generated question itself (not from the mapping)
  const asks = (id: string) => problemOf(id)!.prompt;
  assert.match(asks("gen:acpicttab:0,0,0,0"), /How many ● should be drawn/);
  assert.match(asks("gen:acpicttab:0,0,0,1"), /in all\?/);
  assert.match(asks("gen:acpicttab:0,0,0,2"), /largest group/);
  assert.match(asks("gen:acpicthalf:3,27,0,1"), /in all\?/);
  assert.ok(pool("acpicthalf").items.filter((p) => p.params[3] === 0).every((p) => !/in all\?/.test(p.prompt)), "half-symbol rows are row readings, not totals");
  assert.match(asks("gen:afbar:0,1,0"), /How many more/);
  assert.match(asks("gen:afbar:0,2,0"), /together\?/);
  assert.match(asks("gen:aadigit:34,1"), /How many tens/);
  assert.match(asks("gen:aabund:3,1,1"), /left over/);
  // other skills of the competency stay out: number names and digit cards are not unit-value tasks
  for (const id of ["gen:aaword:14", "gen:aagreat:0,0", "gen:aaname:15"]) assert.equal(classifyQuestionWith(PLACE_VALUE_TENS_CONFIG, id).kind, "unknown", id);
});

test("diagnostic predictions are readable as numbers for every skill (the existing reader; one answer never diagnoses)", () => {
  for (const config of SCALE_PATTERN_CONFIGS) for (const s of config.subSkills) {
    const m = moduleFor(config.competency)!;
    const id = pool(s.families[0]).items.map((p) => p.id).find((x) => connectedSkill(config, x) === s.id && problemOf(x)!.bugs.some((b) => b.predict !== null))!;
    const bug = problemOf(id)!.bugs.find((b) => b.predict !== null)!;
    assert.equal(probeReading(id, bug.id, String(bug.predict)).reading, "predicted", `${s.id}: ${id} ${bug.id}`);
    assert.ok(m.chapter.length > 0, "chapter access is unchanged");
  }
});

for (const config of [PICTOGRAPHS_CONFIG, SCALED_BARS_CONFIG, PLACE_VALUE_TENS_CONFIG]) for (const s of config.subSkills) test(`same-skill checks, delayed check and recovery: ${s.id}`, () => {
  const learner = new SliceSession(`scale-${s.id}`, config.competency, at);
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
  assert.deepEqual(foundationPlan(policy, learner.learnerId, JSON.parse(JSON.stringify(saved())).reverse(), learner.now), p, "replay from saved events");
  learner.now += 8 * DAY;
  p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  assert.equal(p.status, "retention"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id, "the delayed check is the same skill");
  assert.ok(!seen.has(p.question.replace(/:mc$/, "")), "the delayed check is a fresh question");
  // a wrong answer in the question's own format (a wrong option letter for multiple choice, another number when typed)
  const q = question(p.question) as { answer: string; options?: string[] };
  const wrong = q.options ? "ABCD"[("ABCD".indexOf(q.answer) + 1) % q.options.length] : String(Number(q.answer) + 1);
  learner.submit(p.question, wrong, "retention");
  p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  assert.equal(p.status, "recovery"); assert.ok(p.question); assert.equal(connectedSkill(config, p.question), s.id);
  assert.equal(projectFromEventsWith(config, learner.learnerId, saved(), learner.now).subSkills.find((x) => x.id === s.id)?.historical.everDemonstrated, true);
});

for (const [config, skill] of [[PICTOGRAPHS_CONFIG, "pictographs.read-with-key@1"], [SCALED_BARS_CONFIG, "scaled-bars.read@1"], [PLACE_VALUE_TENS_CONFIG, "place-value.count-tens@1"]] as const) test(`a correct, fresh, same-skill delayed answer is retained: ${skill}`, () => {
  const learner = new SliceSession(`scale-retained-${skill}`, config.competency, at);
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config, requirements: [{ skill, method: false }] };
  const saved = () => withDecisions(learner.events, learner.decisions);
  let p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  const seen = new Set<string>();
  for (let i = 0; i < 12 && p.status !== "shown"; i++) { seen.add(p.question!.replace(/:mc$/, "")); learner.submit(p.question!, question(p.question!).answer, "check"); p = foundationPlan(policy, learner.learnerId, saved(), learner.now); }
  learner.now += 8 * DAY;
  p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  assert.equal(p.status, "retention");
  // the existing retention policy asks for one or two delayed answers (two unless a module check was sampled); each one is
  // a fresh question of the same skill
  for (let i = 0; i < 3 && p.status === "retention"; i++) {
    assert.ok(!seen.has(p.question!.replace(/:mc$/, "")), "fresh"); assert.equal(connectedSkill(config, p.question!), skill);
    seen.add(p.question!.replace(/:mc$/, ""));
    assert.equal(learner.submit(p.question!, question(p.question!).answer, "retention").credit, true);
    p = foundationPlan(policy, learner.learnerId, saved(), learner.now);
  }
  assert.equal(p.status, "shown", "the delayed check is satisfied; no recovery");
  const proj = projectFromEventsWith(config, learner.learnerId, saved(), learner.now).subSkills.find((x) => x.id === skill)!;
  assert.notEqual(proj.status, "retention-due"); assert.notEqual(proj.status, "recovery-required");
});

test("evidence for one skill never covers another skill of the same pattern", () => {
  const learner = new SliceSession("scale-read-only", PICTOGRAPHS_CONFIG.competency, at);
  for (const id of pool("acpict").items.filter((p) => p.params[0] > 0).slice(0, 4).map((p) => p.id)) learner.submit(id, question(id).answer, "check");
  const policy: FoundationPolicy = { version: FOUNDATION_POLICY, config: PICTOGRAPHS_CONFIG, requirements: [{ skill: "pictographs.compare-rows@1", method: false }] };
  const p = foundationPlan(policy, learner.learnerId, withDecisions(learner.events, learner.decisions), learner.now);
  assert.equal(p.status, "unobserved"); assert.equal(connectedSkill(PICTOGRAPHS_CONFIG, p.question!), "pictographs.compare-rows@1");
  // key-1 rows answer plain counts: they cannot stand in for reading with a key
  const k1 = new SliceSession("scale-key-one", PICTOGRAPHS_CONFIG.competency, at);
  for (const id of pool("acpict").items.filter((p) => p.params[0] === 0).slice(0, 4).map((p) => p.id)) k1.submit(id, question(id).answer, "check");
  const q = foundationPlan({ ...policy, requirements: [{ skill: "pictographs.read-with-key@1", method: false }] }, k1.learnerId, withDecisions(k1.events, k1.decisions), k1.now);
  assert.equal(q.status, "unobserved");
});

const TAUGHT: Record<string, string[]> = {
  "pictographs.read-with-key@1": ["read_with_key:procedural", "table:procedural"], "pictographs.half-symbol@1": ["half_pictures:conceptual"],
  "pictographs.half-symbol-total@1": ["half_pictures_total:procedural"], "pictographs.compare-rows@1": ["compare_rows:procedural"],
  "pictographs.draw-from-table@1": ["draw_from_table:conceptual"], "pictographs.total@1": ["pictograph_total:procedural"], "pictographs.largest-group@1": ["largest_group:procedural"],
  "scaled-bars.read@1": ["skip_count:procedural"], "scaled-bars.difference@1": ["bars_difference:procedural"], "scaled-bars.total@1": ["bars_total:procedural"],
  "place-value.blocks-to-number@1": ["bundles:conceptual", "count_on:procedural"], "place-value.tens-digit-value@1": ["tens_digit_value:conceptual"],
  "place-value.count-tens@1": ["count_tens:conceptual"], "place-value.ones-digit-value@1": ["ones_digit_value:conceptual"],
  "place-value.full-tens@1": ["full_tens:procedural"], "place-value.left-over-ones@1": ["left_over_ones:procedural"], "place-value.grouped-total@1": ["grouped_total:procedural"],
};
const strategiesFor = (config: typeof PICTOGRAPHS_CONFIG, skill: string, evidence: readonly string[] = []) => { const m = moduleFor(config.competency)!; return m.strategies.filter((st) => teachable(m, st, evidence) && strategyConnects(config, skill, st)); };

test("teaching availability: every configured skill has its own eligible, skill-scoped explanation (pending review, not approved)", () => {
  for (const config of SCALE_PATTERN_CONFIGS) for (const s of config.subSkills) {
    const list = strategiesFor(config, s.id);
    assert.deepEqual(list.map((st) => `${st.id}:${st.kind}`), TAUGHT[s.id], s.id);
    for (const st of list) {
      // the worked example, the guided question and the check are all this skill (a key or scale other than 1; one bar kind)
      for (const id of [...st.screens.flatMap((b) => (b.instance ? [b.instance] : [])), st.guided, st.check]) assert.equal(connectedSkill(config, id), s.id, `${st.id}: ${id}`);
      assert.ok(st.screens.every((b) => b.instance), `${st.id}: every screen shows its own worked instance`);
    }
  }
  // half pictures: every taught, guided and checked row really holds a half picture (an odd number of halves)
  const half = moduleFor(PICTOGRAPHS_CONFIG.competency)!.strategies.find((st) => st.id === "half_pictures")!;
  for (const id of [half.screens[0].instance!, half.guided, half.check]) assert.ok(problemOf(id.replace(/:mc$/, ""))!.steps.some((x) => /: (\d*[13579]) halves/.test(explainStepText(id))), id);
  // bundles: the worked lines tie ten loose cubes into another ten
  assert.ok(pv0().strategies.find((st) => st.id === "bundles")!.screens[0].math!.some((l) => /ones = 1 ten and \d+ ones/.test(l)));
  // every one of these explanations is a review candidate: its current revision is pending review, never approved
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8"));
  const recs = (reg.entries as { competency: string; strategy: string; revisions: { status: string }[] }[]).map((e) => ({ ...e, status: e.revisions.at(-1)!.status }));
  for (const config of SCALE_PATTERN_CONFIGS) for (const st of moduleFor(config.competency)!.strategies) {
    const mine = recs.filter((r) => r.competency === config.competency && r.strategy === st.id);
    assert.ok(mine.length > 0 && mine.every((r) => r.status === "pending_review"), `${st.id}: ${mine.map((r) => r.status).join(",")}`);
  }
  // the unscoped prerequisite pointer is not carried over: it could not be aligned to one skill
  for (const config of SCALE_PATTERN_CONFIGS) assert.ok(!moduleFor(config.competency)!.strategies.some((st) => st.id === "check_what_it_uses"), config.competency);
  // blocks-to-number: one example ties ten or more loose ones into another ten; the other counts on fewer than ten
  const pv = moduleFor(PLACE_VALUE_TENS_CONFIG.competency)!;
  assert.ok(problemOf(pv.strategies.find((st) => st.id === "bundles")!.screens[0].instance!)!.params[1] >= 10);
  assert.ok(problemOf(pv.strategies.find((st) => st.id === "count_on")!.screens[0].instance!)!.params[1] < 10);
});

test("misconception teaching waits for its evidence: the assume-tens fix is never offered as general teaching", () => {
  const fix = moduleFor(SCALED_BARS_CONFIG.competency)!.strategies.find((st) => st.id === "fix_assume_tens")!;
  assert.equal(fix.addresses, "assume-tens");
  assert.ok(!strategiesFor(SCALED_BARS_CONFIG, "scaled-bars.read@1").includes(fix), "no evidence: not offered");
  assert.ok(strategiesFor(SCALED_BARS_CONFIG, "scaled-bars.read@1", ["assume-tens"]).includes(fix), "with assume-tens evidence: offered, and only for this skill");
  assert.ok(!strategiesFor(SCALED_BARS_CONFIG, "scaled-bars.total@1", ["assume-tens"]).includes(fix));
  for (const id of [fix.screens[0].instance!, fix.guided, fix.check]) {
    assert.equal(connectedSkill(SCALED_BARS_CONFIG, id), "scaled-bars.read@1");
    const p = problemOf(id.replace(/:mc$/, ""))!;
    assert.ok(p.bugs.some((b) => b.id === "assume-tens" && b.predict !== null && String(b.predict) !== String(p.answer)), `${id}: the wrong answer differs from the right one`);
  }
  // no contrast-dependent fixes (one-each, face-value, value-not-count) are added here: they need contrast declarations
  for (const config of SCALE_PATTERN_CONFIGS) for (const st of moduleFor(config.competency)!.strategies) if (st.addresses) assert.equal(st.id, "fix_assume_tens");
});

for (const config of SCALE_PATTERN_CONFIGS) for (const s of config.subSkills) for (const sid of TAUGHT[s.id].map((x) => x.split(":")[0])) test(`learner journey: teach ${sid} -> guided -> fresh check, all ${s.id}`, () => {
  const competency = config.competency, m = moduleFor(competency)!;
  const L = new SliceSession(`scale-teach-${sid}`, competency, at);
  L.events.push(make.pathway({ learnerId: L.learnerId, sessionId: L.session, at: new Date(at - 1000).toISOString() }, competency));
  const strategy = m.strategies.find((st) => st.id === sid)!;
  L.events.push(make.teach({ learnerId: L.learnerId, sessionId: L.session, at: new Date(++L.now).toISOString() }, competency, strategy.id, "foundation-lesson-review@1"));
  let next = L.state().module(competency);
  assert.equal(next.phase, "guided", JSON.stringify(next)); assert.equal(next.question, strategy.guided);
  assert.equal(connectedSkill(config, next.question!), s.id);
  assert.equal(L.submit(next.question!, question(next.question!).answer, "guided").credit, true);
  next = L.state().module(competency);
  assert.equal(next.phase, "check", JSON.stringify(next)); assert.ok(next.question);
  assert.equal(connectedSkill(config, next.question), s.id, "the independent check is the taught skill");
  const shown = new Set([strategy.guided, ...strategy.screens.flatMap((b) => (b.instance ? [b.instance] : []))].map((x) => x.replace(/:mc$/, "")));
  assert.ok(!shown.has(next.question.replace(/:mc$/, "")), "the check is fresh: not a taught or guided example");
  const saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(competency), next, "reload keeps the same check");
});
