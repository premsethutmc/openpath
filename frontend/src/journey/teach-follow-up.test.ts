/**
 * Consolidation (#112), teaching and follow-up. The automatic app path (SliceFlow: practice entry, recovery, module, later visits),
 * with synthetic learners who are wrong on ONE skill until it is taught; every question and lesson is chosen by the engine.
 *   guided-fresh@1  one-step equations: the learner met 2x = 26 as the practice question, and a_times_x's guided item is the same
 *                   problem ("choose one"), so the block had no guided practice at all. Now a fresh guided question of the same skill.
 *   after-pass@1    right on the check after the lesson, then wrong on that skill alone again and again: the module ended with phase
 *                   "done" and "Right on your own after help: progress, not yet mastery", with no question and no help. Now a pause
 *                   with an honest reason (no other explanation for that skill), which keeps its way back.
 *   same-skill      re-entry after a pause on 10 × □ = 30 asked 18 − □ (another skill of the same family). Now the same skill.
 *   wording         a lesson on the skill itself no longer says "Something this builds on looks shaky, so we go there first".
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { pool, problemKeyOf } from "../../../packages/learning/src/families";
import { connectedSkill, connectionConfig } from "../../../packages/learning/src/skill-connections";
import { moduleFor } from "../../../packages/learning/src/content";
import { learnerState } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { SliceFlow } from "./flow";
import { wrong } from "./learners";

type Mode = "learns" | "never" | "lapses";
interface Step { kind: "q" | "teach" | "end"; phase: string; q?: string; skill?: string | null; right?: boolean; strategy?: string | null; reason?: string; session: string }
const skillOf = (c: string, q: string) => connectedSkill(connectionConfig(c)!, q);

/** the learner is wrong on `skill` until it is taught; then right ("learns"), never right ("never"), or right on the guided question
 *  and the first check after the lesson only ("lapses"). Right on everything else. */
function drive(competency: string, skill: string, start: string, mode: Mode, laters: number[] = [], id = `teach-${mode}-${skill}`) {
  const f = new SliceFlow(start, id, Date.parse("2026-11-04T09:00:00Z"), { entry: "practice" });
  const s = f.session, trail: Step[] = [];
  const target = (q: string) => question(q).competency === competency && skillOf(competency, q) === skill;
  const taught = () => s.events.some((e) => (e as { record?: string; competency?: string }).record === "teach" && (e as { competency: string }).competency === competency);
  let checks = 0;
  const answer = (q: string, activity: string) => {
    if (!target(q) || (mode === "learns" && taught())) return question(q).answer;
    if (mode === "lapses" && taught() && (activity === "guided" || (activity === "check" && checks++ === 0))) return question(q).answer;
    return wrong(q);
  };
  const run = () => {
    for (let i = 0; i < 150 && f.stage !== "summary"; i++) {
      if (f.stage === "question") {
        const q = f.currentQuestion!, phase = f.currentPhase;
        f.on({ type: "answer_submitted", value: answer(q, f.currentActivity), timestamp: 0 } as Parameters<typeof f.on>[0]);
        trail.push({ kind: "q", phase, q, skill: question(q).competency === competency ? skillOf(competency, q) : null, right: s.replies.at(-1)!.credit === true, session: s.session });
      } else {
        const fr = f.frames.at(-1)!;
        if (f.stage === "teaching" && fr.revealed === 1) trail.push({ kind: "teach", phase: "chapter", strategy: fr.strategyId, reason: (fr.spec.teacherGuide as { detail?: string } | undefined)?.detail, session: s.session });
        f.on({ type: "skip_requested", timestamp: 0 } as Parameters<typeof f.on>[0]);
      }
    }
    if (f.ended) trail.push({ kind: "end", phase: f.ended.phase, reason: f.ended.reason, session: s.session });
  };
  run();
  for (const d of laters) { f.later(d); run(); }
  return { f, s, trail };
}
const reloads = (s: SliceFlow["session"], competency: string) => {
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  const re = learnerState(s.learnerId, saved, s.now, { currentSession: s.session });
  assert.equal(re.evidence(competency).status, s.state().evidence(competency).status, "reload: same status");
  assert.deepEqual(re.module(competency), s.state().module(competency), "reload: same next step");
};
const show = (t: Step[]) => t.map((x) => `${x.session} ${x.kind} ${x.phase} ${x.q ?? x.strategy ?? ""} ${x.skill ?? ""} ${x.right === undefined ? "" : x.right ? "R" : "W"} ${x.reason ?? ""}`).join("\n");

const LIN = "MATH.algebra.linear-intro", AX = "one-step.a-times-x@1";
const MISS = "MATH.algebra.missing-number", KBOX = "missing.k-times-box@1";

test("guided-fresh@1: the guided item was the problem already met (2x = 26): a fresh guided question of the same skill, then a fresh check, a reload and a same-skill delayed check", () => {
  const start = "gen:ahone:2,2,13";
  const st = moduleFor(LIN)!.strategies.find((x) => x.id === "a_times_x")!;
  assert.equal(problemKeyOf(st.guided), problemKeyOf(start), "fixture: the lesson's guided item is the practice problem the learner starts on");
  const { s, trail } = drive(LIN, AX, start, "learns");
  const ti = trail.findIndex((t) => t.kind === "teach" && t.strategy === "a_times_x");
  assert.ok(ti > 0, show(trail));
  const met = new Set(trail.slice(0, ti).flatMap((t) => (t.q ? [problemKeyOf(t.q)] : [])));
  const guided = trail[ti + 1];
  assert.equal(guided.phase, "guided", `guided practice after the lesson:\n${show(trail.slice(ti))}`);
  assert.equal(guided.skill, AX);
  assert.ok(!met.has(problemKeyOf(guided.q!)) && ![st.check, ...st.screens.map((x) => x.instance ?? "")].includes(guided.q!), `${guided.q} is fresh`);
  const check = trail[ti + 2];
  assert.equal(check.phase, "check"); assert.equal(check.skill, AX); assert.ok(check.right);
  assert.ok(![...met, problemKeyOf(guided.q!), problemKeyOf(st.guided)].includes(problemKeyOf(check.q!)), `${check.q} is fresh`);
  reloads(s, LIN);
  s.wait(8);
  const n = s.next(LIN);
  assert.equal(n.phase, "retention", n.reason);
  assert.equal(skillOf(LIN, n.question!), AX, "the delayed check includes the taught skill");
  assert.ok(!trail.some((t) => t.q && problemKeyOf(t.q) === problemKeyOf(n.question!)), "a problem not met before");
});

test("after-pass@1: right once after the lesson, then wrong alone on that skill: never 'done · progress' with no question; an honest pause that reloads the same", () => {
  const { s, trail } = drive(LIN, AX, "gen:ahone:2,2,13", "lapses");
  const s1 = trail.filter((t) => t.session === "s1");
  const ti = s1.findIndex((t) => t.kind === "teach");
  const check = s1.slice(ti).find((t) => t.phase === "check")!;
  assert.ok(check.right && check.skill === AX, show(s1));
  const end = s1.at(-1)!;
  const lastOnSkill = s1.filter((t) => t.kind === "q" && t.skill === AX && t.phase !== "return" && t.phase !== "guided").at(-1)!;
  assert.equal(lastOnSkill.right, false, show(s1));
  assert.equal(end.kind, "end");
  assert.ok(!(end.phase === "done" && /Right on your own after help/.test(end.reason!)), `not "progress" after wrong answers alone:\n${show(s1.slice(ti))}`);
  assert.equal(end.phase, "pause", end.reason);
  assert.match(end.reason!, /not since/);
  reloads(s, LIN);
});

test("re-entry after a pause on 10 × □ is on the same skill; the lesson on the skill itself does not say it goes to what it builds on", () => {
  const start = pool("acmissing").items.map((p) => p.id).filter((id) => skillOf(MISS, id) === KBOX)[3];
  const { s, trail } = drive(MISS, KBOX, start, "never", [8]);
  const lesson = trail.find((t) => t.kind === "teach" && t.strategy === "k_times_box");
  assert.ok(lesson, show(trail));
  assert.ok(!/we go there first/.test(lesson!.reason ?? ""), `lesson reason: ${lesson!.reason}`);
  assert.equal(trail.filter((t) => t.session === "s1").at(-1)!.phase, "pause", show(trail));
  const re = trail.find((t) => t.session === "s2" && t.kind === "q");
  assert.ok(re && re.phase === "reentry", show(trail.filter((t) => t.session === "s2")));
  assert.equal(re!.skill, KBOX, `re-entry ${re!.q} is on the paused skill`);
  assert.ok(!trail.filter((t) => t.session === "s1" && t.q).some((t) => problemKeyOf(t.q!) === problemKeyOf(re!.q!)), "a problem not met before");
  reloads(s, MISS);
});
