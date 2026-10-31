/**
 * Workstream A3: end-to-end learner journey traces for linear equations (real engine; only learner answers and working scripted).
 * For every explanation shown: the intervention, its evidence basis and review status, whether it was displayed, the recheck (attempted,
 * correct, method evidence), and the learner's verification status and retention requirement afterwards.
 *   node --import tsx scripts/a3-journeys.mts <out.json> <out.md>
 */
import { writeFileSync } from "node:fs";
import { FAMILIES, problemOf } from "../../packages/learning/src/families.ts";
import { question } from "../../packages/learning/src/content.ts";
import { setTeachingMode } from "../../packages/learning/src/explanation-review.ts";
import { learners, misconception, right, wrong, type Learner } from "../src/journey/learners.ts";
import { runScenario, type Scenario } from "../src/journey/scenarios.ts";
/** What a learner writes: each new equation once (not the "do this to both sides" lines), ending with the answer. */
const learnerWorking = (steps: string[], answer: string) => { const w = steps.slice(1).filter((l) => !l.startsWith("Check") && l.split(" = ").length === 2 && !/ [−+] \S+ = .* [−+] \S+$/.test(l) && !/÷/.test(l)); return w.at(-1) === `x = ${answer}` ? w : [...w, `x = ${answer}`]; };

const C = "MATH.algebra.linear-equations";
const persistent = (bug: string, untilTaught = 1): Learner => ({ name: `${bug} until ${untilTaught} explanation(s), then right with working`, act: (v) => {
  if (v.taught >= untilTaught) {
    const p = problemOf(v.q.replace(/:mc$/, ""));
    const t = p && FAMILIES.get(p.family)?.teach?.instance?.(p.params);
    return { answer: right(v.q), ...(t && v.activity === "check" ? { working: learnerWorking(t.worked.steps.map((s) => s.expression), right(v.q)) } : {}) };
  }
  return { answer: misconception(v.q, new Set([bug])) ?? right(v.q) };
} });
const J: { id: string; what: string; s: Scenario; later?: number[]; retentionWrong?: boolean; mode?: "supervised-evaluation" }[] = [
  { id: "J2", what: "two-step equations, right alone", s: { id: "J2", category: 1, start: "gen:lin:2,17,11", learner: () => learners.strong(), expect: {} } },
  { id: "J3", what: "x on both sides: moves an x term without changing its sign", s: { id: "J3", category: 2, start: "gen:lin:2,17,11", learner: () => persistent("x-sign-kept"), expect: {} } },
  { id: "J4", what: "brackets: multiplies only the first term", s: { id: "J4", category: 2, start: "gen:lin:2,17,11", learner: () => persistent("first-term-only"), expect: {} } },
  { id: "J6", what: "two-step: forgets to divide; recovers; remembers 8 days later", s: { id: "J6", category: 2, start: "gen:lin:2,17,11", learner: () => persistent("forgot-divide"), expect: {} }, later: [8] },
  { id: "J7", what: "repeated difficulty, no misconception established (always wrong)", s: { id: "J7", category: 5, start: "gen:lin:2,17,11", learner: () => learners.alwaysWrong(), expect: {} } },
  { id: "J9", what: "fails the first recheck after teaching", s: { id: "J9", category: 5, start: "gen:lin:2,17,11", learner: () => learners.misconception(["forgot-divide"], 2), expect: {} } },
  { id: "J10", what: "fails the delayed check, then recovers", s: { id: "J10", category: 6, start: "gen:lin:2,17,11", learner: () => learners.slipOnRetention(), expect: {} }, later: [8] },
  { id: "J11", what: "supervised evaluation, nothing approved: forgot-divide", s: { id: "J11", category: 2, start: "gen:lin:2,17,11", learner: () => persistent("forgot-divide"), expect: {} }, mode: "supervised-evaluation" },
];
const out: unknown[] = [];
for (const j of J) {
  const prev = setTeachingMode(j.mode ?? "demonstration");
  let r;
  try { r = runScenario({ ...j.s, ...(j.later ? { later: j.later } : {}) }); } finally { setTeachingMode(prev); }
  const evs = r.f.session.events as unknown as { record: string; strategy?: string; at: string; competency?: string }[];
  const recs = r.f.session.state().records;
  const trace = r.f.session.trace;
  const teachEvents = evs.filter((e) => e.record === "teach");
  const reviews = trace.filter((t) => t.component === "explanation-review.contentEligibility").map((t) => ({ ...(t.input as object), ...(t.output as object) })) as { strategy: string; status: string; basis: string; misconceptionEvidence: boolean; label: string }[];
  const auth = trace.filter((t) => t.component === "derivation-interface.authorizeWorking").map((t) => t.output as { status: string; evidence: string });
  const decisions = teachEvents.map((t, i) => {
    const next = teachEvents[i + 1]?.at ?? "9999";
    const recheck = recs.attempts.find((a) => a.at > t.at && a.at < next && a.activity === "check" && a.n === 1 && a.hints === 0);
    const rv = reviews.find((x) => x.strategy === t.strategy);
    const displayed = r.f.frames.some((f) => f.stage === "teaching" && f.strategyId === t.strategy);
    const ai = recheck?.working?.length ? auth.shift() : null;
    return { explanation: t.strategy, basis: rv?.basis ?? null, misconceptionEvidence: rv?.misconceptionEvidence ?? null, review: rv?.status ?? null, label: rv?.label ?? null, displayed, recheck: recheck ? { question: question(recheck.questionId).prompt, attempted: true, correct: recheck.credit === true, method: ai ? ai.evidence : "no working given" } : { attempted: false } };
  });
  const e = r.f.session.state().evidence(C);
  out.push({ id: j.id, what: j.what, mode: j.mode ?? "demonstration", ended: r.f.ended?.phase ?? null, answers: recs.attempts.length, decisions, after: { status: e.status, verified: e.verified, recoveryRequired: e.recoveryRequired, retention: e.retention, retentionDue: e.retentionDueAt ?? null, history: e.retentionHistory.map((h) => h.result) } });
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const md: string[] = ["| Journey | Explanation shown (basis; review) | Displayed | Recheck alone | Correct | Method evidence | After: status / verified / recovery required / retention |", "|---|---|---|---|---|---|---|"];
for (const j of out as { id: string; what: string; ended: string; decisions: { explanation: string; basis: string; review: string; displayed: boolean; recheck: { attempted: boolean; question?: string; correct?: boolean; method?: string } }[]; after: { status: string; verified: boolean; recoveryRequired: boolean; retention: string; history: string[] } }[]) {
  const a = `${j.after.status} / ${j.after.verified} / ${j.after.recoveryRequired} / ${j.after.retention}${j.after.history.length ? ` (${j.after.history.join(", ")})` : ""}; ended ${j.ended}`;
  if (!j.decisions.length) md.push(`| ${j.id} ${j.what} | none | — | — | — | — | ${a} |`);
  j.decisions.forEach((d, i) => md.push(`| ${i ? "" : `${j.id} ${j.what}`} | ${d.explanation} (${d.basis}; ${d.review}) | ${d.displayed ? "yes" : "no"} | ${d.recheck.attempted ? d.recheck.question : "not reached"} | ${d.recheck.attempted ? (d.recheck.correct ? "yes" : "no") : "—"} | ${d.recheck.method ?? "—"} | ${i === j.decisions.length - 1 ? a : ""} |`));
}
writeFileSync(process.argv[3], md.join("\n") + "\n");
console.log("journeys", out.length);
