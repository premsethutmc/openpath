/**
 * G5: geometry persistence and restart through Django (the same round trip as d1e1-persistence: family.test_integration_m1.PersistenceRoundTrip).
 * export: a geometry learner's submissions (answers + working; NO decisions: the server makes them) and the in-memory projection. Django
 * stores every record, deciding each answer with the trusted grader bundle, and a fresh client reads them back. verify: the projection of the
 * read-back events, in this new process, must equal the in-memory one; every stored decision must be the server's.
 *   node --import tsx scripts/g5-persistence.mts export <events.json> <inmem.json>
 *   node --import tsx scripts/g5-persistence.mts verify <stored.json> <inmem.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { TRIANGLE_PROPERTIES_CONFIG } from "../../packages/learning/src/subskill-config-geometry.ts";
import { projectFromEventsWith } from "../../packages/learning/src/subskill-projection.ts";
import { GEOMETRY_JOURNEYS, runGeometryJourney } from "../src/journey/geometry-journeys.ts";

const summary = (p: ReturnType<typeof projectFromEventsWith>) => p.subSkills.filter((s) => s.status !== "not-attempted").map((s) => ({ id: s.id, status: s.status, attempts: s.attempts, method: s.method }));
const [mode, a, b] = process.argv.slice(2);
if (mode === "export") {
  const t = runGeometryJourney(GEOMETRY_JOURNEYS.find((j) => j.id === "G-07")!);
  const plain = t.events.map((e) => { const { decision: _d, ...rest } = e as Record<string, unknown>; return rest; });
  writeFileSync(a, JSON.stringify(plain));
  const last = Math.max(...t.events.map((e) => Date.parse((e as { at?: string }).at ?? "")).filter(Number.isFinite));
  writeFileSync(b, JSON.stringify({ learnerId: t.learnerId, summary: summary(projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG, t.learnerId, t.events, last + 60_000)), attempts: t.submissions.length, workingVerdicts: t.submissions.filter((s) => s.working.length).map((s) => s.workingVerdict) }));
  console.log("exported", plain.length, "events");
} else {
  const stored = JSON.parse(readFileSync(a, "utf8")) as { learnerId: string; events: { kind: string; record?: string; at?: string; working?: string[]; decision?: { decidedBy?: string; verdict?: string; working?: { schema?: string; status?: string } } }[] };
  const inmem = JSON.parse(readFileSync(b, "utf8"));
  const attempts = stored.events.filter((e) => e.record === "attempt");
  const allServer = attempts.every((e) => e.decision?.decidedBy === "server" && typeof e.decision?.verdict === "string");
  const storedWorking = attempts.filter((e) => e.working?.length).map((e) => e.decision?.working?.status ?? null);
  const now = Math.max(...stored.events.map((e) => Date.parse(e.at ?? "")).filter(Number.isFinite)) + 60_000;
  const got = summary(projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG, stored.learnerId, stored.events, now));
  const again = summary(projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG, stored.learnerId, [...stored.events].reverse(), now));
  const same = JSON.stringify(got) === JSON.stringify(inmem.summary);
  const sameWorking = JSON.stringify(storedWorking) === JSON.stringify(inmem.workingVerdicts);
  console.log(JSON.stringify({ attemptsStored: attempts.length, attemptsInMemory: inmem.attempts, everyDecisionByServer: allServer, workingVerdictsAsInMemory: sameWorking, storedWorkingVerdicts: [...new Set(storedWorking)], projectionEqualsInMemory: same, reversedStoreOrderIdentical: JSON.stringify(again) === JSON.stringify(got), subSkills: got.map((s) => `${s.id}: ${s.status}`) }, null, 1));
  if (!allServer || !same || !sameWorking) { console.error("MISMATCH", JSON.stringify(inmem.summary), JSON.stringify(got)); process.exit(1); }
  console.log("PASS geometry persistence and restart");
}
