/**
 * The developer-dashboard report for a device-only record: read an exported backup file and write the same redacted
 * diagnostic report the dashboard makes (every answer, its difficulty, help status, Learner Vector change, why it was
 * chosen, plan decisions, levels and the evidence gate). Read-only: the backup is never changed, nothing is sent.
 *
 *   node --import tsx scripts/backup-report.mts <backup.json> [out.md] [--unredacted]
 *
 * The time "now" is the backup's export time, so the report shows what the app showed when it was exported.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseBackup } from "../src/english/logic/backup.ts";
import { loadContent } from "../src/english/logic/content.ts";
import { buildReport, diagnose } from "../src/english/logic/diagnostics.ts";

const [file, out] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node --import tsx scripts/backup-report.mts <backup.json> [out.md] [--unredacted]");
  process.exit(2);
}
const parsed = parseBackup(readFileSync(file, "utf8"));
if (!parsed.ok) {
  console.error(`not a usable backup: ${parsed.error}`);
  process.exit(1);
}
const b = parsed.backup;
const d = await diagnose(loadContent(), { pupil: { id: b.profile.id, name: b.profile.name, own: true }, events: b.events, now: b.exported_at });
const report = buildReport(d, { redact: !process.argv.includes("--unredacted") });
if (out) {
  writeFileSync(out, report.text);
  console.log(`wrote ${out} (${b.events.length} events, exported ${b.exported_at})`);
} else console.log(report.text);
