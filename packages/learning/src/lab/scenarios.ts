/**
 * child-lab@1: the lab's scenarios. Each starts a new child, drives the shipped engine with default settings and returns
 * plain checks (what a struggling learner needs the app to do). The scorecard (content/owner/child-lab.v1.json) records
 * the result of each; a scenario recorded as passing must keep passing (frontend/src/learning/child-lab.test.ts).
 */
import { question } from "../content";
import { problemOf } from "../families";
import { graph } from "../graph";
import { probeReading } from "../reasoning";
import { prerequisiteAfterOwn, questionSupports, recovery, withinGrade } from "../intervention";
import { make } from "../session";
import type { LearningRecord } from "../records";
import { LabChild, SLIPS } from "./slips";
import { freshOf, LabRun } from "./drive";

const IM = "MATH.number.integer-multiply", IA = "MATH.number.integer-add", MT = "MATH.number.multiplication-tables", EXP = "MATH.number.exponents", LD = "MATH.number.long-division";
const SHOWN = ["independent", "transfer", "verified"];
const DISC = "gen:disc:-4,-20"; // x² − 4x − 20 = 0: b² − 4ac = 16 + 80
const FACT78 = /(7 × 8|8 × 7|56 ÷ [78]|× [78] = 56)/;
export interface Check { name: string; ok: boolean }
export interface Result { id: string; title: string; child: string; checks: Check[]; pass: boolean; questions: number; trace: string }
export interface Scenario { id: string; title: string; slips: string[]; run: () => { checks: Check[]; run: LabRun | null; extra?: string } }
const says = (slips: string[], more = "") => [...slips.map((s) => SLIPS[s].says), ...(more ? [more] : [])].join("; ");
const c = (name: string, ok: boolean): Check => ({ name, ok });

export const SCENARIOS: Scenario[] = [
  { id: "S01", title: "Class 10: a sign slip behind x² − 4x − 20 = 0 is found and taught", slips: ["signMul"], run: () => {
    const run = new LabRun("lab-s01", new LabChild(["signMul"]), { grade: 10 }); run.recover(DISC, 60);
    return { run, checks: [c("integer multiplication is checked", run.seen().has(IM)), c("the sign slip is repaired", !run.child.active.has("signMul"))] };
  } },
  { id: "S02", title: "Class 5: 126 ÷ 7 with a 7 × 8 slip: the fact itself is asked and repaired", slips: ["fact78"], run: () => {
    const run = new LabRun("lab-s02", new LabChild(["fact78"]), { grade: 5 }); const r = run.recover("gen:ldiv:18,7", 60);
    return { run, checks: [c("not sent to multi-digit multiplication", !run.seen().has("MATH.number.multi-multiplication") && !r.supports.some((x) => x.id === "MATH.number.multi-multiplication")), c("a 7 × 8 fact is asked", run.asked().some((id) => FACT78.test(question(id).prompt))), c("the slip is repaired", run.child.active.size === 0), c("long division not marked learned while the slip remains", run.child.active.size === 0 || !SHOWN.includes(run.status(LD)))] };
  } },
  { id: "S03", title: "Old mastery, recent mistakes: the skill is checked again", slips: ["tables78"], run: () => {
    const child = new LabChild([]); const run = new LabRun("lab-s03", child, { grade: 5 });
    for (const id of ["mt-d1", "mt-d2", "mt-p1", "gen:mul:9,7", "gen:mul:6,8"]) run.answer(id, "practice", "history", "history", MT);
    run.later(40); child.active.set("tables78", SLIPS.tables78);
    for (const id of [freshOf(run, "mul", (x) => /7 × 8|8 × 7|7 × 7/.test(question(x).prompt)), freshOf(run, "mul", (x) => /× 8 =|8 ×/.test(question(x).prompt))]) if (id) run.answer(id, "practice", "recent", "recent", MT);
    run.recover("gen:ldiv:18,7", 40);
    return { run, checks: [c("times tables are checked again", run.seen().has(MT))] };
  } },
  { id: "S04", title: "Times tables known on other facts: the exact fact 126 ÷ 7 needs is still asked", slips: ["fact78"], run: () => {
    const run = new LabRun("lab-s04", new LabChild(["fact78"]), { grade: 5 });
    for (const id of ["mt-d2", "gen:mul:9,6", "gen:mul:4,3", "gen:mul:6,6"]) run.answer(id, "practice", "history", "history", MT);
    run.recover("gen:ldiv:18,7", 40);
    return { run, checks: [c("a 7 × 8 fact is asked", run.asked().some((id) => FACT78.test(question(id).prompt))), c("the slip is repaired", run.child.active.size === 0)] };
  } },
  { id: "S05", title: "Same gap found two ways (by its mistake, or by checking supports): same treatment", slips: ["powAsMul"], run: () => {
    const mk = (id: string, explained: boolean) => { const ch = new LabChild(["powAsMul"], { teachingWorks: false, override: (q) => { if (!q.startsWith("gen:disc:")) return null; if (!explained) return "1"; const pr = probeReading(q.replace(/:(mc|w)$/, ""), "negative-square"); return pr.discriminates ? pr.predicted[0] : null; } }); return new LabRun(id, ch, { grade: 10 }); };
    const a = mk("lab-s05a", true); a.recover("gen:disc:-12,-20", 90); const b = mk("lab-s05b", false); b.recover("gen:disc:-12,-20", 90);
    const below = (x: LabRun) => [...x.seen()].some((s) => s === MT || s === "MATH.number.equal-groups" || s === "MATH.number.addition");
    return { run: a, checks: [c("exponents reached both ways", a.seen().has(EXP) && b.seen().has(EXP)), c("both ways check the skill underneath before stopping", below(a) === below(b))] };
  } },
  { id: "S06", title: "A first answer right after a hint or the worked solution is never 'on your own'", slips: [], run: () => {
    const checks: Check[] = [];
    for (const o of [{ hints: 1 }, { solution: true }]) {
      const run = new LabRun("lab-s06", new LabChild([]), { grade: 10 });
      run.events.push(make.attempt(run.ctx(), DISC, question(DISC).answer, "original", o) as LearningRecord);
      const s = run.state(); const r = recovery(DISC, s.records, s.evidence, run.now, run.session);
      checks.push(c(`with ${"hints" in o ? "a hint" : "the solution"}: not 'solved on your own'`, r.phase !== "solved"));
    }
    return { run: null, checks };
  } },
  { id: "S07", title: "A lesson alone is not evidence of learning", slips: ["tables78"], run: () => {
    const run = new LabRun("lab-s07", new LabChild(["tables78"], { teachingWorks: false }), { grade: 5 });
    run.answer("mt-d1", "diagnostic", "pre", "explore", MT); run.answer("gen:ldiv:18,7", "original", "pre", "attempt", null);
    run.teach(MT, "decomposition", "lesson only");
    const g = freshOf(run, "mul", (x) => /7 ×|× 7/.test(question(x).prompt)); if (g) run.answer(g, "guided", "guided", "guided", MT, { hints: 1 });
    return { run, checks: [c("times tables not marked learned", !SHOWN.includes(run.status(MT)))] };
  } },
  { id: "S08", title: "A repair is proven by a new question the child has not seen", slips: ["tables78"], run: () => {
    const run = new LabRun("lab-s08", new LabChild(["tables78"]), { grade: 5 }); const r = run.recover("gen:ldiv:18,7", 80);
    const lesson = run.rows.findIndex((x) => x.prompt.startsWith("LESSON"));
    const fresh = run.rows.some((t) => t.qid && t.qid !== "gen:ldiv:18,7" && question(t.qid).competency === LD && t.activity !== "guided" && t.right && lesson >= 0 && lesson < t.n);
    return { run, checks: [c("recovery ends solved", ["solved_after_help", "solved_on_retry"].includes(r.phase)), c("a new long-division question is answered right after the lesson", fresh)] };
  } },
  { id: "S09", title: "Two slips at once on the discriminant (sign of a product, subtracting a negative)", slips: ["signMul", "subNeg"], run: () => {
    const run = new LabRun("lab-s09", new LabChild(["signMul", "subNeg"]), { grade: 10 }); run.recover(DISC, 70);
    return { run, checks: [c("integer multiplication is checked", run.seen().has(IM)), c("integer addition is checked", run.seen().has(IA))] };
  } },
  { id: "S10", title: "Stopping halfway and coming back the next day: nothing repeated, same outcome", slips: ["tables78"], run: () => {
    const a = new LabRun("lab-s10", new LabChild(["tables78"]), { grade: 5 }); const ra = a.recover("gen:ldiv:18,7", 80);
    const b = new LabRun("lab-s10", new LabChild(["tables78"]), { grade: 5 }); b.recover("gen:ldiv:18,7", 6); b.later(1); const rb = b.recover("gen:ldiv:18,7", 80);
    const ex = b.asked().filter((q) => q !== "gen:ldiv:18,7").map((q) => q.replace(/:(mc|w)$/, ""));
    return { run: b, checks: [c("no question asked twice", ex.every((q, i) => ex.indexOf(q) === i)), c("same outcome as without the break", rb.phase === ra.phase)] };
  } },
  { id: "S11", title: "Teaching does not take: the app stops in time and claims nothing", slips: ["tables78"], run: () => {
    const run = new LabRun("lab-s11", new LabChild(["tables78"], { teachingWorks: false }), { grade: 5 }); const r = run.recover("gen:ldiv:18,7", 120);
    return { run, checks: [c("stops for a teacher or parent", r.phase === "escalate"), c("within 60 steps", run.rows.length < 60), c("times tables not marked learned", !SHOWN.includes(run.status(MT))), c("long division not marked learned", !SHOWN.includes(run.status(LD)))] };
  } },
  { id: "S12", title: "Forgotten a week later: the delayed check catches it", slips: ["tables78"], run: () => {
    const run = new LabRun("lab-s12", new LabChild(["tables78"], { forgetAfterDays: 5 }), { grade: 5 }); run.recover("gen:ldiv:18,7", 80);
    run.later(9); const ms = run.state().module(MT, false); if (ms.question) run.answer(ms.question, ms.activity ?? "retention", "day 9", ms.phase, MT);
    const ev = run.state().evidence(MT);
    return { run, checks: [c("the delayed check notices", ms.phase === "retention" || ev.retention === "due" || ev.retention === "failed" || ev.status === "review")] };
  } },
  { id: "S13", title: "Class 10 matrix multiplication: the right foundations are checked", slips: ["signMul"], run: () => {
    const run = new LabRun("lab-s13", new LabChild(["signMul"]), { grade: 10 }); const id = "gen:apmmul:-3,-3,1,-2,4,-1,5,0";
    const sup = questionSupports(id, run.state().records).map((s) => s.id); run.recover(id, 40);
    return { run, checks: [c("not sent to inverse functions or sequences", !sup.includes("MATH.algebra.inverse-functions") && !sup.includes("MATH.algebra.geometric-sequences")), c("integer multiplication is a support", sup.includes(IM)), c("matrices are a Class 10 skill in Tamil Nadu", graph.get("MATH.algebra.matrices").gradeRange[0] <= 10 && withinGrade(run.state().records, id))] };
  } },
  { id: "S14", title: "Class 10 child opens the discriminant normally: sign slip found, nothing overclaimed", slips: ["signMul"], run: () => {
    const run = new LabRun("lab-s14", new LabChild(["signMul"]), { grade: 10 }); run.learn("MATH.algebra.quadratic-discriminant", 100);
    return { run, checks: [c("default settings", prerequisiteAfterOwn()), c("integer multiplication is checked", run.seen().has(IM)), c("discriminant not marked learned while the slip remains", run.child.active.size === 0 || !SHOWN.includes(run.status("MATH.algebra.quadratic-discriminant")))] };
  } },
  { id: "S15", title: "Class 2: adding without carrying (47 + 38 = 75) is found and taught", slips: ["noCarry"], run: () => {
    const run = new LabRun("lab-s15", new LabChild(["noCarry"]), { grade: 2 }); run.recover("gen:addr:47,38", 60);
    return { run, checks: [c("carrying is checked", run.seen().has("MATH.number.addition-regroup")), c("the slip is repaired", run.child.active.size === 0), c("adding with carrying not marked learned while the slip remains", run.child.active.size === 0 || !SHOWN.includes(run.status("MATH.number.addition-regroup")))] };
  } },
  { id: "S16", title: "Class 2: smaller-from-larger subtraction (52 − 27 = 35) is found and taught", slips: ["smallerFromLarger"], run: () => {
    const run = new LabRun("lab-s16", new LabChild(["smallerFromLarger"]), { grade: 2 }); run.recover("gen:acsub2:52,27", 60);
    return { run, checks: [c("borrowing is checked", run.seen().has("MATH.number.subtraction-regroup")), c("the slip is repaired", run.child.active.size === 0)] };
  } },
  { id: "S17", title: "A child who guesses is never told it worked on its own, and stops for help", slips: [], run: () => {
    const run = new LabRun("lab-s17", new LabChild([], { guesser: true }), { grade: 10 }); const r = run.recover(DISC, 80);
    return { run, checks: [c("not 'solved on your own'", r.phase !== "solved"), c("the discriminant not marked learned", !SHOWN.includes(run.status("MATH.algebra.quadratic-discriminant"))), c("stops for a teacher or parent", r.phase === "escalate")] };
  } },
];

export function runScenario(s: Scenario): Result {
  const { checks, run, extra } = s.run();
  return { id: s.id, title: s.title, child: s.id === "S17" ? "guesses every answer" : s.id === "S06" ? "answers right with help" : says(s.slips), checks, pass: checks.every((x) => x.ok), questions: run?.questions() ?? 0, trace: (run?.trace() ?? "") + (extra ? `\n${extra}` : "") };
}
export const problemExists = (id: string) => !!problemOf(id.replace(/:(mc|w)$/, ""));
