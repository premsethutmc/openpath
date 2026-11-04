// Staging smoke test helper: replays a learner's saved records exactly as the app does on load (grading mode from the server, recorded
// decisions merged in, records read, evidence derived) and prints the credit of every attempt and the status of every skill touched.
// Usage: bun tools/mathematics/server-grader/staging-replay.ts <GET /api/pupils/<id>/events/?subject=mathematics response.json> <now ISO>
import { readFileSync } from "node:fs";
import { setGradingMode } from "../../../packages/learning/src/grading/mode";
import { readRecords, withDecisions } from "../../../packages/learning/src/records";
import { evidenceFor, rightAnswer } from "../../../packages/learning/src/evidence";

const [file, nowIso] = process.argv.slice(2);
const got = JSON.parse(readFileSync(file, "utf8"));
const mode = setGradingMode(got.gradingMode);
const events = got.events as { kind: string; learnerId?: string }[];
const learner = (events.find((e) => e.learnerId) as { learnerId: string }).learnerId;
const records = readRecords(learner, withDecisions(events, got.decisions));
const now = Date.parse(nowIso ?? new Date().toISOString());
const ev = evidenceFor(learner, records, now);
const skills = [...new Set(records.attempts.map((a) => a.competency))].sort();
console.log(JSON.stringify({
  mode,
  attempts: Object.fromEntries(records.attempts.map((a) => [a.id, rightAnswer(a)])),
  unresolved: records.unresolved.map((u) => u.id).sort(),
  skills: Object.fromEntries(skills.map((s) => { const e = ev.get(s) as unknown as Record<string, unknown>; return [s, e.status ?? e]; })),
}));
