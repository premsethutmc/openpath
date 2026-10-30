/**
 * Adaptive-loop trace (stage A1): synthetic learners driven through the SAME engine functions the app calls
 * (moduleState / recovery for decisions, decide for grading, learnerState for evidence, nextActivity for what next),
 * recording at every step the input, the grading decision, the diagnosis, the teaching chosen, the independent
 * reassessment and the resulting evidence.
 *
 * The learners are behaviour models, not scripts of the outcome: each answers from what it "knows" (a set of skills), and a
 * skill it lacks shows as the wrong answer the content itself attributes to that skill (the family's misconception for that
 * competency). Nothing here names the diagnosis or the teaching the engine should choose. Synthetic only: a trace shows what
 * the program does, never that anyone learned.
 */
import { question, moduleFor } from "../../../packages/learning/src/content";
import { releasesFor } from "../../../packages/learning/src/curricula";
import { assigned } from "../../../packages/learning/src/curriculum";
import { DAY } from "../../../packages/learning/src/evidence";
import { explainStep, problemOf, type Problem } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { needsMarking } from "../../../packages/learning/src/content";
import { selectable } from "../../../packages/learning/src/question-status";
import { teachingLesson } from "../../../packages/learning/src/teaching-contract";
import { teachingScopeFor } from "../../../packages/learning/src/teaching-presentation";
import { familyOf } from "../../../packages/learning/src/intervention";
import { grade } from "../../../packages/learning/src/grading/decision";
import { graph, walkSupports } from "../../../packages/learning/src/graph";
import { investigateContext, moduleState, recovery, type ModuleState } from "../../../packages/learning/src/intervention";
import { checkWorking, canCheckWorking } from "../../../packages/learning/src/working";
import { lessonBlocks } from "../../../packages/learning/src/teaching-contract";
import { make } from "../../../packages/learning/src/session";
import { activityFor, Driver } from "./driver";

export interface Mind {
  name: string;
  /** Skills the learner does not have (every other skill is known). */
  lacks: Set<string>;
  /** First attempts at a question are always wrong; a retry with a hint is right (all success is assisted). */
  hintDependent?: boolean;
  /** An isolated slip: the nth independent answer (1-based) is off by one, with working that shows where. */
  slipAt?: number;
  /** How teaching changes what the learner knows: taught skill X → X is no longer lacked (modelling assumption). */
  learnsFromTeaching?: boolean;
}

const bugsOf = (p: Problem | null) => ((p as unknown as { bugs?: { id: string; competency?: string; predict: number | string }[] })?.bugs ?? []);
/** The wrong answer a missing skill produces on this question: the content's own misconception for that skill, else a
 *  plain wrong value. Returns null when the learner can do the question. */
function wrongFor(mind: Mind, qid: string): string | null {
  const q = question(qid), p = problemOf(qid.replace(/:mc$/, ""));
  const own = graph.evidenceTarget(q.competency);
  const bug = bugsOf(p).find((b) => b.competency && mind.lacks.has(b.competency));
  if (bug) return q.type === "choice" ? (q.answer === "A" ? "B" : "A") : String(bug.predict);
  if (!mind.lacks.has(own) && !mind.lacks.has(q.competency)) return null;
  const anyBug = bugsOf(p)[0];
  if (anyBug && q.type !== "choice") return String(anyBug.predict);
  return q.type === "choice" ? (q.answer === "A" ? "B" : "A") : /^-?\d+$/.test(q.answer) ? String(Number(q.answer) + 1) : "0";
}

export interface TraceStep {
  n: number;
  path: "module" | "recovery" | "practice";
  phase: string;
  reason: string;
  activity?: string;
  question?: string;
  prompt?: string;
  response?: string;
  working?: string[];
  hints?: number;
  grading?: { verdict: string; reason: string; credit: boolean | null; source: string; methodExamined: boolean; firstError: unknown };
  workingCheck?: { valid: boolean; note: string } | null;
  diagnosis?: { result: string | null; confidence: number; asked: number } | null;
  reasoning?: { status: string; best: string | null; competency: string | null; plan: string | null } | null;
  teaching?: { competency: string; strategy: string; kind: string; review: string | null; sections: { title: string; label: string; verified: boolean | null; violations: string[] }[] };
  evidence?: { competency: string; status: string; independent: string; assisted: string; engine: string; retention: string };
}

export function runLearner(mind: Mind, o: { competency: string; grade: number; days?: number; recoveryFrom?: string; entry?: "module" | "practice"; t0: number; maxSteps?: number }) {
  const d = new Driver(`synthetic-${mind.name}`, o.t0);
  // a board release (CBSE or Tamil Nadu) that assigns the competency, before the synthetic sample release
  const release = [...releasesFor(o.grade)].sort((a, b) => Number(!/^(cbse|tn)-/.test(a.id)) - Number(!/^(cbse|tn)-/.test(b.id))).find((r) => assigned(r).some((x) => x.competency === o.competency)) ?? releasesFor(o.grade)[0];
  d.enrol(o.grade, "2026-27", release);
  const steps: TraceStep[] = [];
  let independent = 0;
  const ev = (c: string) => { const e = d.state().evidence(c); return { competency: c, status: e.status, independent: `${e.independent.right}/${e.independent.total}`, assisted: `${e.assisted.right}/${e.assisted.total}`, engine: e.engine, retention: e.retention }; };
  const record = (s: Omit<TraceStep, "n">) => steps.push({ n: steps.length + 1, ...s });
  const attempt = (path: TraceStep["path"], phase: string, reason: string, qid: string, activity: string, extra: { context?: string } = {}, competency = question(qid).competency) => {
    const q = question(qid);
    const independentNow = activity !== "guided";
    let wrong = wrongFor(mind, qid);
    let working: string[] | undefined;
    if (wrong === null && mind.slipAt && independentNow && ++independent === mind.slipAt && /^-?\d+$/.test(q.answer)) {
      // an isolated arithmetic slip in the last line of otherwise right working
      wrong = String(Number(q.answer) - 1);
      const p = problemOf(qid);
      // the learner's lines are the solver's own steps, with the slip in the last one
      // written as plain arithmetic from the solver's own steps (a op b = value), with the slip in the last result
      const OP: Record<string, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };
      working = p ? p.steps.map((st, k) => { const [x, y] = st.inputs; const line = OP[st.op] && typeof x === "number" && typeof y === "number" ? `${x} ${OP[st.op]} ${y} = ${String(st.value)}` : explainStep(p, st); return k === p.steps.length - 1 ? line.replace(new RegExp(`${String(st.value)}$`), wrong!) : line; }) : [wrong];
    }
    const first = mind.hintDependent ? (wrongFor({ ...mind, lacks: new Set([q.competency, graph.evidenceTarget(q.competency)]) }, qid) ?? "0") : wrong ?? q.answer;
    const doOne = (response: string, hints: number) => {
      d.answer(qid, response, activity as never, { hints, context: extra.context, working });
      const g = grade(qid, response, working ?? []);
      const p = problemOf(qid.replace(/:mc$/, ""));
      record({
        path, phase, reason, activity, question: qid, prompt: q.prompt, response, working, hints,
        grading: { verdict: g.decision.verdict, reason: g.decision.reason, credit: g.assessment.credit, source: g.assessment.evidence.source, methodExamined: g.assessment.evidence.methodExamined, firstError: g.assessment.evidence.firstError },
        workingCheck: working && p && canCheckWorking(p) ? (() => { const w = checkWorking(p, working); return { valid: w.valid, note: w.note }; })() : null,
        evidence: ev(graph.evidenceTarget(competency)),
      });
    };
    doOne(first, 0);
    // the app offers "Try again" (with a hint) after a wrong answer; a hint-dependent learner always takes it
    if (mind.hintDependent && first !== q.answer) doOne(q.answer, 1);
  };
  const teach = (path: TraceStep["path"], ms: ModuleState, reason: string) => {
    const m = moduleFor(ms.competency)!, s = ms.strategy!;
    const blocks = lessonBlocks(m).filter((b) => s.screens.some((x) => x.title === b.title));
    d.events.push(make.teach(d.ctx(), ms.competency, s.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis"));
    record({ path, phase: "chapter", reason, teaching: { competency: ms.competency, strategy: s.id, kind: s.kind, review: ms.teachingReview ?? null, sections: blocks.map((b) => ({ title: b.title, label: b.label, verified: b.worked ? b.worked.verified : null, violations: b.violations })) }, diagnosis: ms.diagnosis ? { result: ms.diagnosis.result, confidence: ms.diagnosis.confidence, asked: ms.diagnosis.asked.length } : null, evidence: ev(ms.competency) });
    if (mind.learnsFromTeaching) {
      mind.lacks.delete(ms.competency);
      // a prerequisite-kind explanation is about what the skill builds on: the skills of its own probe questions
      if (s.kind === "prerequisite") for (const id of s.needs) mind.lacks.delete(graph.evidenceTarget(question(id).competency));
    }
  };
  /** One step of recovery from a wrong answer, as the Recovery view does it. Returns false when recovery has nothing more to ask. */
  const recoveryStep = (original: string): boolean => {
    const st = d.state();
    const r = recovery(original, st.records, st.evidence, d.now, d.session);
    const reasoning = r.reasoning ? { status: r.reasoning.status, best: r.reasoning.best?.id ?? null, competency: r.reasoning.best?.competency ?? null, plan: r.plan ? `${r.plan.kind}:${r.plan.competency ?? "-"}` : null } : null;
    if (r.phase === "attempt" || r.phase === "return") { attempt("recovery", r.phase, r.reason, original, "original", { context: `recovery:${original}` }); steps.at(-1)!.reasoning = reasoning; return true; }
    if (r.phase === "investigate") { attempt("recovery", r.phase, r.reason, r.question!, "diagnostic", { context: investigateContext(original) }); steps.at(-1)!.reasoning = reasoning; return true; }
    if (r.phase === "support" || r.phase === "teach") {
      const before = steps.length;
      const ms = moduleStep(r.active!, "recovery", r.established, true);
      if (steps[before]) steps[before].reasoning = reasoning;
      if (ms.phase === "done" || ms.phase === "pause" || (!ms.question && ms.phase !== "chapter")) { record({ path: "recovery", phase: `${r.phase}:${ms.phase}`, reason: ms.reason, reasoning, evidence: ev(r.active!) }); return ms.phase === "done"; }
      return true;
    }
    record({ path: "recovery", phase: r.phase, reason: r.reason, reasoning, evidence: ev(r.competency) });
    return false;
  };
  /** One step of a module, as the Module view does it (inside a recovery, the module does not start another one). */
  const moduleStep = (competency: string, path: TraceStep["path"], established?: Parameters<typeof moduleState>[5], inRecovery = false): ModuleState => {
    const st = d.state();
    const ms = moduleState(competency, st.records, st.evidence(competency), d.now, d.session, established, inRecovery ? undefined : st.evidence);
    if (ms.phase === "recover" && ms.original) {
      record({ path, phase: "recover", reason: ms.reason, diagnosis: ms.diagnosis ? { result: ms.diagnosis.result, confidence: ms.diagnosis.confidence, asked: ms.diagnosis.asked.length } : null, evidence: ev(competency) });
      recoveryStep(ms.original);
    } else if (ms.phase === "chapter" && ms.strategy) teach(path, ms, ms.reason);
    else if (ms.question) {
      attempt(path, ms.phase, ms.reason, ms.question, activityFor(ms));
      const last = steps.at(-1)!;
      last.diagnosis = ms.diagnosis ? { result: ms.diagnosis.result, confidence: ms.diagnosis.confidence, asked: ms.diagnosis.asked.length } : null;
    }
    return ms;
  };
  const stops = (ms: ModuleState) => ms.phase === "done" || ms.phase === "pause" || ms.phase === "unavailable" || (ms.phase !== "chapter" && ms.phase !== "recover" && !ms.question);

  const max = o.maxSteps ?? 40;
  if (o.entry === "practice") {
    // entry: the lesson's Practice stage (the queue the page builds); a wrong answer there offers "Find out what went wrong",
    // which opens recovery on that question; the learner always takes it
    const m = moduleFor(o.competency)!, scope = teachingScopeFor(m);
    const candidates = [...new Set([...modulePhasePool(m, "practice"), ...m.practice, ...m.transfer])].filter((id) => selectable(id) && !needsMarking(question(id)) && !!problemOf(id) && scope.accepts(problemOf(id)!));
    for (const qid of teachingLesson(m, candidates).practice.slice(0, 6)) {
      attempt("practice", "practice", "Practice this concept (the lesson page).", qid, "practice");
      if (steps.at(-1)!.grading!.credit === false && familyOf(qid)) { o = { ...o, recoveryFrom: qid }; break; }
    }
  }
  if (o.recoveryFrom) for (let i = 0; i < max && recoveryStep(o.recoveryFrom); i++);
  // entry: the skill's module (the lesson page's "Assessment" stage)
  for (let i = 0; i < max; i++) {
    const ms = moduleStep(o.competency, "module");
    if (stops(ms)) { record({ path: "module", phase: ms.phase, reason: ms.reason, diagnosis: ms.diagnosis ? { result: ms.diagnosis.result, confidence: ms.diagnosis.confidence, asked: ms.diagnosis.asked.length } : null, evidence: ev(o.competency) }); break; }
  }
  // later visits: the next day (fresh checks the engine needs), then after the delayed-check interval
  for (const gap of [1, o.days ?? 8]) {
    d.newSession(gap);
    for (let i = 0; i < max; i++) {
      const ms = moduleStep(o.competency, "module");
      if (stops(ms)) { record({ path: "module", phase: `${ms.phase} (day +${gap})`, reason: ms.reason, evidence: ev(o.competency) }); break; }
    }
  }
  const st = d.state();
  return { learner: mind.name, competency: o.competency, release: release.id, steps, final: ev(o.competency), next: st.next ? { kind: st.next.kind, competency: st.next.competency ?? null, reason: st.next.reason ?? null, paused: st.next.paused ?? [] } : null, supports: walkSupports(o.competency, 2).map((s) => `${s.type}:${s.id}`) };
}

export const DAY_MS = DAY;

/** The three personas of stage A1 (plus the same prerequisite gap entering through the Assessment stage). Each run gets a
 *  fresh learner model; the competencies are real Grade 10 competencies and the evidence goes through the real engine. */
export const T0 = Date.parse("2026-11-02T09:00:00Z");
export const PERSONAS = () => [
  { title: "A. Strong learner, one isolated arithmetic slip", run: () => runLearner({ name: "A-strong-one-slip", lacks: new Set(), slipAt: 2 }, { competency: "MATH.algebra.arithmetic-sequences", grade: 10, t0: T0, entry: "practice" }) },
  { title: "B. Demonstrated prerequisite gap (square roots), entering from Practice", run: () => runLearner({ name: "B-prerequisite-gap", lacks: new Set(["MATH.number.square-roots"]), learnsFromTeaching: true }, { competency: "MATH.geometry.pythagoras", grade: 10, t0: T0, entry: "practice" }) },
  { title: "B2. The same gap, entering from the Assessment stage (failed case)", run: () => runLearner({ name: "B2-prerequisite-gap-assessment-entry", lacks: new Set(["MATH.number.square-roots"]), learnsFromTeaching: true }, { competency: "MATH.geometry.pythagoras", grade: 10, t0: T0, entry: "module" }) },
  { title: "C. Apparent success entirely assisted", run: () => runLearner({ name: "C-assisted-only", lacks: new Set(), hintDependent: true }, { competency: "MATH.probability.classical", grade: 10, t0: T0, entry: "practice" }) },
];

/** The traces as Markdown (one table per learner). */
export function traceMarkdown(runs: { title: string; r: ReturnType<typeof runLearner> }[]) {
  const cell = (x: unknown) => String(x ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const out = ["# Adaptive loop traces (stage A1)", "", "Generated by `frontend/scripts/adaptive-trace.ts` from the engine at this commit. Synthetic learners only: these traces show what the program decides, not that anyone learned. Grading here is the app's own decision function (`grade`); signed-in learners are graded by the server in `OPENPATH_GRADING=shadow` mode, which differs on about 3% of formats (see GRADING_ADAPTER.md).", ""];
  for (const { title, r } of runs) {
    out.push(`## ${title}`, "", `Competency \`${r.competency}\` · release \`${r.release}\` · graph supports (depth ≤ 2): ${r.supports.length ? r.supports.map((s) => `\`${s}\``).join(", ") : "none"}`, "");
    out.push("| # | Path / phase | Question → response | Grading | Diagnosis | Teaching selected | Evidence after | What the learner is told |", "|---|---|---|---|---|---|---|---|");
    for (const s of r.steps) out.push(`| ${s.n} | ${cell(`${s.path} / ${s.phase}${s.activity ? ` (${s.activity})` : ""}`)} | ${cell(s.question ? `\`${s.question}\` → ${s.response}${s.hints ? " (hint)" : ""}${s.working ? ` · working: ${s.working.join("; ")}` : ""}` : "")} | ${cell(s.grading ? `${s.grading.verdict} (${s.grading.source})${s.grading.methodExamined ? "" : ", method not examined"}` : "")} | ${cell(s.reasoning ? `diagnostic@2 ${s.reasoning.status}: ${s.reasoning.best ?? "-"} → ${s.reasoning.plan ?? "-"}` : s.diagnosis ? `diagnostic@1 ${s.diagnosis.result ?? "pending"} (${s.diagnosis.confidence})` : "")} | ${cell(s.teaching ? `${s.teaching.competency.split(".").pop()} · ${s.teaching.strategy} (${s.teaching.kind}) · ${s.teaching.sections.map((x) => x.label + (x.violations.length ? ` ⚠ ${x.violations.join(",")}` : "")).join("; ")} · ${s.teaching.review ?? ""}` : "")} | ${cell(s.evidence ? `${s.evidence.competency.split(".").pop()}: ${s.evidence.status}, alone ${s.evidence.independent}, helped ${s.evidence.assisted}, retention ${s.evidence.retention}, engine ${s.evidence.engine}` : "")} | ${cell(s.reason)} |`);
    out.push("", `**Result:** \`${JSON.stringify(r.final)}\` · **next action:** ${r.next ? `${r.next.kind} ${r.next.competency ?? ""} — ${r.next.reason ?? ""}${r.next.paused.length ? ` · paused: ${r.next.paused.join(", ")}` : ""}` : "none"}`, "");
  }
  return out.join("\n") + "\n";
}
