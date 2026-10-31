/**
 * Milestone 2: persistence and retention across several learners and sessions, through the Django store.
 *   export <dir>          run four learners (real components) in session 1; write their record events and in-memory summaries
 *   act    <dir> <days>   (called by Django mid-test) rebuild each learner ONLY from the events read back, come back <days> later, find the due
 *                         review, take it as the learner would; write the new events
 *   verify <dir>          rebuild every learner from the final store in a new process and check the contract; writes report.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DAY, RETENTION_DAYS } from "../../packages/learning/src/evidence.ts";
import { graph } from "../../packages/learning/src/graph.ts";
import { question } from "../../packages/learning/src/content.ts";
import { moduleState } from "../../packages/learning/src/intervention.ts";
import { learnerState } from "../../packages/learning/src/session.ts";
import { SliceFlow } from "../src/journey/flow.ts";
import { SliceSession } from "../src/journey/session.ts";
import { SCENARIOS, runScenario, T0 } from "../src/journey/scenarios.ts";
import { right, wrong } from "../src/journey/learners.ts";

const [mode, dir, arg] = process.argv.slice(2);
const IDS = ["2a", "3a", "4b", "1g"] as const;
/** what each learner does on the delayed check: forgets once (2) or remembers (1) */
const ON_RETENTION: Record<string, "forget-once" | "remember"> = { "2a": "remember", "3a": "forget-once", "4b": "forget-once", "1g": "forget-once" };
const target = (id: string) => graph.evidenceTarget(question(SCENARIOS.find((s) => s.id === id)!.start).competency);
const summary = (learnerId: string, events: any[], c: string, now: number) => {
  const st = learnerState(learnerId, events, now, {}); const ev: any = st.evidence(c);
  return { attempts: st.records.attempts.map((a: any) => [a.questionId, a.response, a.activity, a.hints, a.n, a.credit]), teaches: st.records.teaching.map((t: any) => [t.competency, t.strategy]),
    status: ev.status, verified: ev.verified, recoveryRequired: ev.recoveryRequired, independent: ev.independent, assisted: ev.assisted, retention: ev.retention, independentAt: ev.independentAt, due: ev.retentionDueAt, cycles: ev.retentionHistory, unresolved: st.records.unresolved.length };
};

if (mode === "export") {
  const out: Record<string, unknown> = {};
  for (const id of IDS) {
    const r = runScenario(SCENARIOS.find((s) => s.id === id)!);
    out[id] = { learnerId: r.f.session.learnerId, competency: target(id), events: r.f.session.events, verdicts: r.f.session.replies.map((x) => x.verdict), summary: summary(r.f.session.learnerId, r.f.session.events as any[], target(id), r.f.session.now), now: r.f.session.now };
  }
  writeFileSync(`${dir}/session1.json`, JSON.stringify(out));
} else if (mode === "act") {
  // ONLY the stored events (each with the server's decision) are read: the in-memory run of session 1 is not consulted
  const stored = JSON.parse(readFileSync(`${dir}/stored-1.json`, "utf8")) as Record<string, { pupil: string; events: any[] }>;
  const plan = JSON.parse(readFileSync(`${dir}/session1.json`, "utf8")) as Record<string, { learnerId: string; competency: string; now: number }>;
  const out: Record<string, unknown> = {};
  for (const id of IDS) {
    const { pupil, events } = stored[id], c = plan[id].competency;
    const lastAt = Math.max(...events.map((e) => Date.parse(e.at)));
    const now = lastAt + Number(arg) * DAY;
    const before = summary(pupil, events, c, now);
    // discoverable: the evidence the app's lists read says the check is due, and opening the skill asks it (repeated reads change nothing)
    const reads = [0, 1, 2].map(() => { const st = learnerState(pupil, events, now, {}); const ms = moduleState(c, st.records, st.evidence(c), now, "s2", null, st.evidence); return JSON.stringify([st.evidence(c).retention, ms.phase, ms.question]); });
    const session = SliceSession.fromEvents(pupil, c, events, now, `learn:${pupil}:s2`);
    const f = new SliceFlow(SCENARIOS.find((s) => s.id === id)!.start, pupil, now, { resume: session });
    const firstStep = { phase: f.currentPhase, question: f.currentQuestion, stage: f.stage };
    let forgot = false;
    for (let i = 0; i < 120 && f.stage !== "summary"; i++) {
      if (f.stage === "question") {
        const q = f.currentQuestion!;
        const forget = ON_RETENTION[id] === "forget-once" && f.currentPhase === "retention" && !forgot;
        if (forget) forgot = true;
        f.on({ type: "answer_submitted", value: forget ? wrong(q) : right(q), timestamp: 0 });
      } else f.on({ type: "skip_requested", timestamp: 0 });
    }
    const added = session.events.slice(events.length);
    out[id] = { before, reads, firstStep, added, ended: f.ended, phases: f.frames.map((x) => x.phase), now: f.session.now };
  }
  writeFileSync(`${dir}/session2.json`, JSON.stringify(out));
} else if (mode === "verify") {
  const s1 = JSON.parse(readFileSync(`${dir}/session1.json`, "utf8")); const s2 = JSON.parse(readFileSync(`${dir}/session2.json`, "utf8"));
  const st1 = JSON.parse(readFileSync(`${dir}/stored-1.json`, "utf8")); const fin = JSON.parse(readFileSync(`${dir}/stored-final.json`, "utf8"));
  const report: Record<string, unknown> = {};
  for (const id of IDS) {
    const { pupil, events } = fin[id]; const c = s1[id].competency; const now = s2[id].now;
    const a = s1[id].summary, b = summary(pupil, st1[id].events, c, s1[id].now);
    const fz = summary(pupil, events, c, now);
    const fz2 = summary(pupil, events, c, now);
    const dec = events.filter((e: any) => e.record === "attempt");
    const cycles = fz.cycles ?? [];
    const firstDue = Date.parse(b.due), indepAt = Date.parse(b.independentAt);
    report[id] = {
      learner: pupil, competency: c,
      "attempts and decisions survive": JSON.stringify(a.attempts.map((x: any[]) => x.slice(0, 5))) === JSON.stringify(b.attempts.map((x: any[]) => x.slice(0, 5))) && dec.every((e: any) => e.decision?.schema === "grading-decision@1" && e.decision?.decidedBy === "server"),
      "server verdicts equal the slice's": JSON.stringify(st1[id].events.filter((e: any) => e.record === "attempt").map((e: any) => e.decision?.verdict)) === JSON.stringify(s1[id].verdicts.filter((v: string) => v !== "unresolved" && v !== "pending-educator")) || JSON.stringify(st1[id].events.filter((e: any) => e.record === "attempt").map((e: any) => e.decision?.verdict)) === JSON.stringify(s1[id].verdicts),
      "evidence reconstructed consistently": a.status === b.status && JSON.stringify(a.independent) === JSON.stringify(b.independent) && JSON.stringify(a.assisted) === JSON.stringify(b.assisted) && a.retention === b.retention,
      "teaching and assistance history": JSON.stringify(a.teaches) === JSON.stringify(b.teaches) && JSON.stringify(a.attempts.map((x: any[]) => [x[3], x[4]])) === JSON.stringify(b.attempts.map((x: any[]) => [x[3], x[4]])),
      "due date = independent answer + RETENTION_DAYS": Math.round((firstDue - indepAt) / DAY) === RETENTION_DAYS,
      "due review discoverable (evidence says due, opening the skill asks it)": s2[id].before.retention === "due" && s2[id].firstStep.phase === "retention" && !!s2[id].firstStep.question,
      "repeated reads identical": new Set(s2[id].reads).size === 1 && JSON.stringify(fz) === JSON.stringify(fz2),
      "retention outcome": ON_RETENTION[id] === "remember" ? cycles.some((x: any) => x.result === "passed") : (cycles.some((x: any) => x.result === "failed") && cycles.at(-1).result !== "failed" && Date.parse(cycles.at(-1).due) > Date.parse(cycles.find((x: any) => x.result === "failed").failedAt) && fz.status !== "verified"),
      // recovery steps: investigation or teaching, or fresh questions alone (verify), which is how decision B's recovery lifts the requirement
      "failed check leads to recovery steps": ON_RETENTION[id] === "remember" ? true : s2[id].phases.some((p: string) => ["explore", "chapter", "guided", "check", "recover", "investigate", "verify"].includes(p)),
      // decision B, in a new process from the stored records cut off just after the failed delayed check
      "failed check: review, not verified, recovery required, earlier achievement kept": ON_RETENTION[id] === "remember" ? true : (() => {
        const failedAt = (cycles.find((x: any) => x.result === "failed") ?? {}).failedAt; if (!failedAt) return false;
        const cut = summary(pupil, events.filter((e: any) => e.at <= failedAt), c, Date.parse(failedAt) + 60_000);
        return cut.status === "review" && cut.verified === false && cut.recoveryRequired === true && cut.independentAt === b.independentAt;
      })(),
      "after recovery: requirement lifted, still not verified": ON_RETENTION[id] === "remember" ? true : fz.recoveryRequired === false && fz.verified === false,
      "no duplicate review or intervention": cycles.filter((x: any) => x.result === "pending").length <= 1 && events.filter((e: any) => e.record === "teach").length === new Set(events.filter((e: any) => e.record === "teach").map((e: any) => e.id)).size,
      detail: { session1: { status: b.status, retention: b.retention, due: b.due }, session2: { first: s2[id].firstStep, ended: s2[id].ended?.phase }, final: { status: fz.status, cycles: cycles.map((x: any) => x.result), due: fz.due, events: events.length } },
    };
  }
  writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 1));
  const bad = Object.entries(report).flatMap(([id, r]: any) => Object.entries(r).filter(([k, v]) => v === false).map(([k]) => `${id}: ${k}`));
  console.log(bad.length ? `FAIL ${bad.join("; ")}` : `PASS ${Object.keys(report).length} learners`);
  if (bad.length) process.exitCode = 1;
}
