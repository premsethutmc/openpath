/**
 * Consolidation (#112): a learner who gets every "total is exactly k" dice question wrong and every other counting question of
 * MATH.probability.sample-space right, through the real session and engine (the engine chooses every question and lesson).
 *   - the displayed status never reaches "shown on your own" (independent / transfer / verified) while the dice skill has answers alone
 *     that are wrong and none right since (#113 status fix), and a reload gives the same status and next step;
 *   - after the general dice explanation, the recheck alone is a fresh exact-total question: never a "k or more" or "second bigger"
 *     question of the same generator (another skill), never a problem already met relabelled (was: the family-gap path took any
 *     akdice check question, here gen:akdice:3,6,1,3, and its right answer showed "independent").
 * A second learner learns after the explanation: fresh exact-total recheck right alone, then a same-skill delayed check.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { problemKeyOf } from "../../../packages/learning/src/families";
import { connectedSkill, SAMPLE_SPACE_CONFIG } from "../../../packages/learning/src/skill-connections";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { SliceSession } from "./session";

const C = "MATH.probability.sample-space", EXACT = "sample-space.dice-exact-total@1";
const skill = (q: string) => connectedSkill(SAMPLE_SPACE_CONFIG, q);
const wrong = (q: string) => { const x = question(q); return q.endsWith(":mc") ? (x.answer === "A" ? "B" : "A") : "1/2"; };
const SHOWN = ["independent", "transfer", "verified"];

function run(id: string, learnsWhenTaught: boolean) {
  const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession(id, C, at);
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
  const trail: { phase: string; q?: string; right?: boolean; status: string; strategy?: string }[] = [];
  let taught = false;
  for (let i = 0; i < 80; i++) {
    const n = s.next(C);
    if (n.phase === "chapter") { s.taught(n); taught ||= n.strategy!.id.startsWith("akdice"); trail.push({ phase: "chapter", strategy: n.strategy!.id, status: s.state().evidence(C).status }); continue; }
    if (!n.question) { trail.push({ phase: n.phase, status: s.state().evidence(C).status }); break; }
    if (n.phase === "retention") { trail.push({ phase: "retention", q: n.question, status: s.state().evidence(C).status }); break; }
    const q = n.question, activity = n.phase === "explore" ? "diagnostic" : ["guided", "check", "transfer"].includes(n.phase) ? n.phase : moduleFor(C)!.transfer.includes(q) ? "transfer" : "practice";
    const ok = skill(q) !== EXACT || (learnsWhenTaught && taught);
    s.submit(q, ok ? question(q).answer : wrong(q), activity as never, n.context ? { context: n.context } : {});
    trail.push({ phase: activity, q, right: ok, status: s.state().evidence(C).status, ...(n.strategy ? { strategy: n.strategy.id } : {}) });
  }
  return { s, trail };
}
const reloads = (s: SliceSession) => {
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  const re = learnerState(s.learnerId, saved, s.now, { currentSession: s.session });
  assert.equal(re.evidence(C).status, s.state().evidence(C).status, "reload: same status");
  assert.deepEqual(re.module(C), s.state().module(C), "reload: same next step");
};

test("dice always wrong, other counting skills right: never shown on your own; every recheck after dice teaching is an exact-total question", () => {
  const { s, trail } = run("dice-other-skills-weak", false);
  const firstWrong = trail.findIndex((t) => t.q && skill(t.q) === EXACT && !t.right);
  assert.ok(firstWrong >= 0, JSON.stringify(trail));
  for (const t of trail.slice(firstWrong)) assert.ok(!SHOWN.includes(t.status), `status ${t.status} after a wrong dice answer with none right since: ${JSON.stringify(t)}`);
  assert.ok(trail.some((t) => t.phase === "chapter" && t.strategy?.startsWith("akdice")), "the general dice explanation is given");
  const checks = trail.filter((t) => t.phase === "check");
  assert.ok(checks.length >= 1);
  for (const c of checks) assert.equal(skill(c.q!), EXACT, `recheck ${c.q} is on the taught skill`);
  assert.equal(trail.filter((t) => t.phase === "transfer" && trail.indexOf(t) > firstWrong).length, 0, "no transfer question while the dice skill is weak");
  reloads(s);
});

test("learns after the explanation: a fresh exact-total recheck alone, then a same-skill delayed check; reload agrees", () => {
  const { s, trail } = run("dice-other-skills-learns", true);
  const ti = trail.findIndex((t) => t.phase === "chapter" && t.strategy?.startsWith("akdice"));
  assert.ok(ti > 0, JSON.stringify(trail));
  const check = trail.slice(ti).find((t) => t.phase === "check")!;
  assert.ok(check && check.right && skill(check.q!) === EXACT, JSON.stringify(trail.slice(ti)));
  const st = moduleFor(C)!.strategies.find((x) => x.id === trail[ti].strategy)!;
  const before = [...trail.slice(0, trail.indexOf(check)).flatMap((t) => (t.q ? [t.q] : [])), st.guided, ...st.screens.map((x) => x.instance!).filter(Boolean)];
  assert.ok(!before.some((q) => problemKeyOf(q) === problemKeyOf(check.q!)), `${check.q} is fresh`);
  reloads(s);
  s.wait(8);
  const n = s.next(C);
  assert.equal(n.phase, "retention", `${n.phase}: ${n.reason}`);
  assert.equal(skill(n.question!), EXACT, `the delayed check ${n.question} is on the taught dice skill`);
  assert.ok(!trail.some((t) => t.q && problemKeyOf(t.q) === problemKeyOf(n.question!)), "the delayed check is a problem not met before");
  reloads(s);
});
