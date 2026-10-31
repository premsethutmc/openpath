// usage (from frontend/): node --import tsx scripts/e1-store-replay.mts <M2_DIR>   (after scripts/m2-persistence.sh with M2_DIR set)
// Workstream E1: the sub-skill projection over events READ BACK from the Django store (stored-final.json), in this process. Prints one digest per
// learner (run twice, in two processes, to show replay determinism), plus the authoritative state from the same events, unchanged.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { learnerState } from "../../packages/learning/src/session.ts";
import { COMPETENCY, projectFromEvents } from "../../packages/learning/src/subskill-evidence.ts";
const dir = process.argv[2];
const stored = JSON.parse(readFileSync(`${dir}/stored-final.json`, "utf8")) as Record<string, { pupil: string; events: { kind: string; at?: string }[] }>;
for (const [k, v] of Object.entries(stored)) {
  const now = Math.max(...v.events.map((e) => Date.parse(e.at ?? "")).filter(Number.isFinite)) + 60_000;
  const st = learnerState(v.pupil, v.events, now); const ev = st.evidence(COMPETENCY);
  const p = projectFromEvents(v.pupil, v.events, now, { status: ev.status, verified: ev.verified });
  const rev = projectFromEvents(v.pupil, [...v.events].reverse(), now, { status: ev.status, verified: ev.verified });
  const d = createHash("sha256").update(JSON.stringify(p)).digest("hex").slice(0, 16);
  console.log(JSON.stringify({ learner: k, events: v.events.length, authoritative: { status: ev.status, verified: ev.verified, retention: ev.retention }, projection: p.outcome, digest: d, reversedStoreOrderIdentical: JSON.stringify(rev) === JSON.stringify(p),
    subSkills: Object.fromEntries(p.subSkills.filter((s) => s.status !== "not-attempted").map((s) => [s.id.split(".")[1].replace("@1", ""), s.status])), unknown: p.unknown.byReason, discrepancy: p.discrepancies.length > 0 }));
}
