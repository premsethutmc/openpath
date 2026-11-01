// usage (from frontend/): node --import tsx ../research/synthetic-learners/scripts/traces.mts
// Representative machine-readable traces: for each profile, the boundary (learner-visible frames + learner actions), the hidden trace, and
// OpenPath's records/state after the run, in SEPARATE files. Also writes traces/summary.json (digests of two independent runs).
import { writeFileSync, mkdirSync } from "node:fs";
import { loadProfile, PROFILE_IDS } from "../src/profiles.ts";
import { runJourney } from "../src/harness.ts";
const out = new URL("../traces/", import.meta.url); mkdirSync(out, { recursive: true });
const summary: unknown[] = [];
for (const id of PROFILE_IDS) {
  const a = runJourney(loadProfile(id)), b = runJourney(loadProfile(id));
  writeFileSync(new URL(`${id}.boundary.json`, out), JSON.stringify({ profile: a.profile, seed: a.seed, schedule: a.schedule, boundary: a.boundary }, null, 1) + "\n");
  writeFileSync(new URL(`${id}.hidden.json`, out), JSON.stringify({ profile: a.profile, seed: a.seed, hidden: a.hidden }, null, 1) + "\n");
  const ev = a.openpath.evidence as { status: string; verified: boolean; retention: string; recoveryRequired: boolean; independent: unknown; retentionHistory: unknown };
  writeFileSync(new URL(`${id}.openpath.json`, out), JSON.stringify({ note: "read from OpenPath AFTER the run, for the report; never shown to the learner", evidence: ev, attempts: (a.openpath.records as { record?: string; questionId?: string; response?: string; activity?: string; working?: string[]; hints?: number }[]).filter((r) => r.record === "attempt").map((r) => ({ questionId: r.questionId, response: r.response, activity: r.activity, hints: r.hints, working: r.working ?? null })) }, null, 1) + "\n");
  const qs = a.boundary.filter((c) => c.frame.stage === "question" && c.action?.type === "answer").length;
  const right = a.boundary.filter((c) => c.frame.stage === "feedback" && (c.frame as { feedback: string }).feedback === "correct").length;
  const taught = [...new Set(a.boundary.filter((c) => c.frame.stage === "teaching").map((c) => (c.frame as { teaching: { title: string } }).teaching.title))];
  summary.push({ profile: a.profile, seed: a.seed, answers: qs, correctFeedback: right, hints: a.boundary.filter((c) => c.action?.type === "hint").length, explanationsSeen: taught, openpath: { status: ev.status, verified: ev.verified, retention: ev.retention, recoveryRequired: ev.recoveryRequired }, digests: a.digests, identicalSecondRun: JSON.stringify(a.digests) === JSON.stringify(b.digests) });
}
writeFileSync(new URL("summary.json", out), JSON.stringify(summary, null, 1) + "\n");
console.log(JSON.stringify(summary.map((s: any) => [s.profile, s.answers, s.correctFeedback, s.openpath.status, s.identicalSecondRun])));
