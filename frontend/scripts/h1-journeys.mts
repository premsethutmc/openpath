/**
 * Workstream H1: hand-over and return journeys, machine-readable, and a Markdown summary (real SliceFlow, trusted grader, records).
 *   node --import tsx scripts/h1-journeys.mts <out.json> [<out.md>]
 */
import { writeFileSync } from "node:fs";
import { DAY } from "../../packages/learning/src/evidence";
import { formatInstant, delayedCheckFact } from "../../packages/learning/src/due-display";
import { counts, journey, LE, learners, START, stuck, visit } from "../src/journey/handover-journeys";
import { SliceFlow } from "../src/journey/flow";
import { T0 } from "../src/journey/scenarios";

const plans: [string, string, ReturnType<typeof stuck>, { days: number; ack?: boolean }[]][] = [
  ["H01", "initial hand-over", stuck(), []],
  ["H02", "return before eligibility (1 day)", stuck(), [{ days: 1 }]],
  ["H03", "return after eligibility (2 days)", stuck(), [{ days: 2 }]],
  ["H04", "educator acknowledgement, return after 1 day", stuck(), [{ days: 1, ack: true }]],
  ["H05", "no acknowledgement, returns 2,2,2,5", stuck(), [{ days: 2 }, { days: 2 }, { days: 2 }, { days: 5 }]],
  ["H06", "successful recheck (learns by day 2)", stuck(2), [{ days: 2 }]],
  ["H07", "failed recheck", stuck(), [{ days: 2 }]],
  ["H08", "repeated difficulty, six returns", stuck(), Array.from({ length: 6 }, () => ({ days: 2 }))],
  ["H16", "retry exhaustion, then an acknowledgement", stuck(), [...Array.from({ length: 3 }, () => ({ days: 2 })), ...Array.from({ length: 10 }, () => ({ days: 1 })), { days: 1, ack: true }, { days: 3 }]],
];
const out: unknown[] = [];
const md: string[] = [];
for (const [id, title, L, returns] of plans) {
  const j = journey(id, L, returns);
  const c = counts(j.visits);
  out.push({ id, title, learner: L.name, counts: c, visits: j.visits });
  md.push(`### ${id} ${title}`, "", `Learner: ${L.name}. Visits ${c.visits}, visits with nothing offered ${c.visitsWithNothing}, questions ${c.questions}, re-entry questions ${c.reentryQuestions}.`, "",
    "| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |", "|---|---|---|---|---|---|---|");
  for (const v of j.visits) {
    const re = v.answers.filter((a) => a.phase === "reentry").map((a) => `${a.q}: ${a.verdict}`).join("; ") || "—";
    md.push(`| ${v.visit} | ${v.at.slice(0, 16)} | ${v.offered.length} | ${re} | ${v.ended ?? "—"} | ${v.handover ? `${v.handover.route} (${v.handover.selfReentriesLeft} / ${v.handover.reentries})` : "—"} | ${v.evidence.status} / ${v.evidence.retention} |`);
  }
  const last = j.visits.at(-1)!;
  md.push("", `Last note: ${last.note ?? "—"}`, "");
}
// retention timing (H11–H13): a strong learner, the delayed check shown in three zones and probed around its instant
const f = new SliceFlow(START, "h1-ret", T0, { timeZone: "Asia/Kolkata" });
visit(f, learners.strong(), 0);
const e = f.session.state().evidence(LE);
const due = Date.parse(e.retentionDueAt!);
const zones = ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Auckland"];
const timing = { dueAt: e.retentionDueAt, shown: Object.fromEntries(zones.map((z) => [z, formatInstant(e.retentionDueAt!, z)])), probes: [] as { at: string; label: string; offered: string }[] };
for (const dt of [-DAY, -60_000, 0]) {
  const g = new SliceFlow(START, "h1-ret", T0, { timeZone: "Asia/Kolkata" }); visit(g, learners.strong(), 0);
  g.later((due + dt - g.session.now) / DAY);
  const ev = g.session.state().evidence(LE);
  const fact = delayedCheckFact(ev, "Asia/Kolkata").text;
  const at = new Date(g.session.now).toISOString();
  const v = visit(g, learners.strong(), 7);
  timing.probes.push({ at, label: fact, offered: v.offered.length ? v.offered.join(" ") : "nothing" });
}
out.push({ id: "H11-H13", title: "retention timing", ...timing });
md.push("### H11–H13 retention timing", "", `Opening instant ${timing.dueAt}.`, "", "| Zone | Shown |", "|---|---|", ...zones.map((z) => `| ${z} | ${timing.shown[z]} |`), "",
  "| Learner returns at (UTC) | Topic fact (Asia/Kolkata) | Offered |", "|---|---|---|", ...timing.probes.map((p) => `| ${p.at.slice(0, 19)} | ${p.label} | ${p.offered} |`), "");
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
if (process.argv[3]) writeFileSync(process.argv[3], md.join("\n") + "\n");
console.log(plans.map(([id], i) => `${id} ${JSON.stringify((out[i] as { counts: unknown }).counts)}`).join("\n"));
console.log(JSON.stringify(timing, null, 1));
