/**
 * D1 + E1: persistence and restart. export: a learner's submissions (answers + working; NO decisions: the server makes them) and the
 * in-memory projection. Django (family.test_integration_m1.PersistenceRoundTrip) stores every record, deciding each answer with the trusted
 * grader bundle (D1: the working verdict inside the stored decision), and a fresh client reads them back. verify: the projection of the
 * read-back events, in this new process, must equal the in-memory one (sub-skill status, answers, method counts).
 *   node --import tsx scripts/d1e1-persistence.mts export <events.json> <inmem.json>
 *   node --import tsx scripts/d1e1-persistence.mts verify <stored.json> <inmem.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { projectFromEvents } from "../../packages/learning/src/subskill-evidence.ts";
import { DE1_JOURNEYS } from "../src/journey/d1e1-journeys.ts";

const summary = (p: ReturnType<typeof projectFromEvents>) => p.subSkills.filter((s) => s.status !== "not-attempted").map((s) => ({ id: s.id, status: s.status, attempts: s.attempts, method: s.method }));
const [mode, a, b] = process.argv.slice(2);
if (mode === "export") {
  const t = DE1_JOURNEYS.find((j) => j.id === "J18")!.run();
  const plain = t.events.map((e) => { const { decision: _d, ...rest } = e as Record<string, unknown>; return rest; });
  writeFileSync(a, JSON.stringify(plain));
  writeFileSync(b, JSON.stringify({ learnerId: t.learnerId, summary: summary(projectFromEvents(t.learnerId, t.events, t.now)), attempts: t.submissions.length }));
  console.log("exported", plain.length, "events");
} else {
  const stored = JSON.parse(readFileSync(a, "utf8")) as { learnerId: string; events: { kind: string; record?: string; at?: string; decision?: { decidedBy?: string; working?: { schema?: string } } }[] };
  const inmem = JSON.parse(readFileSync(b, "utf8"));
  const attempts = stored.events.filter((e) => e.record === "attempt");
  const allServer = attempts.every((e) => e.decision?.decidedBy === "server" && e.decision?.working?.schema === "working-assessment@1");
  const now = Math.max(...stored.events.map((e) => Date.parse(e.at ?? "")).filter(Number.isFinite)) + 60_000;
  const got = summary(projectFromEvents(stored.learnerId, stored.events, now));
  const again = summary(projectFromEvents(stored.learnerId, [...stored.events].reverse(), now));
  const same = JSON.stringify(got) === JSON.stringify(inmem.summary);
  console.log(JSON.stringify({ attemptsStored: attempts.length, everyDecisionByServerWithWorkingVerdict: allServer, projectionEqualsInMemory: same, reversedStoreOrderIdentical: JSON.stringify(again) === JSON.stringify(got), subSkills: got.map((s) => `${s.id}: ${s.status} v${s.method.verified} f${s.method.falseStep} u${s.method.unsupported}`) }));
  if (!allServer || !same) { console.error("MISMATCH", JSON.stringify(inmem.summary), JSON.stringify(got)); process.exit(1); }
  console.log("PASS persistence and restart");
}
