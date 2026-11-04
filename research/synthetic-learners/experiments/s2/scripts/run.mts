// usage (from frontend/): node --import tsx ../research/synthetic-learners/experiments/s2/scripts/run.mts [cohort ...]
// Runs the pre-registered experiment (config.json) and writes traces/<cohort>.jsonl.gz and results/metrics-<cohort>.json (+ per profile).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { runS2Journey, type JourneyTrace } from "../src/journey.ts";
import { metrics } from "../src/metrics.ts";
import { validateProfile } from "../../../src/profiles.ts";
import type { Profile } from "../../../src/model.ts";
const here = new URL("../", import.meta.url);
const cfg = JSON.parse(readFileSync(new URL("config.json", here), "utf8"));
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cfg.cohorts);
mkdirSync(new URL("traces/", here), { recursive: true }); mkdirSync(new URL("results/", here), { recursive: true });
for (const cohort of want) {
  const cc = cfg.cohorts[cohort]; const all: JourneyTrace[] = []; const per: Record<string, unknown> = {};
  for (const id of cc.profiles) {
    const p = JSON.parse(readFileSync(new URL(`${cc.profileDir}/${id}.json`, here), "utf8")) as Profile;
    const e = validateProfile(p); if (e.length) throw new Error(`${id}: ${e.join(", ")}`);
    const ts: JourneyTrace[] = [];
    for (let i = 0; i < cc.seedsPerProfile; i++) ts.push(runS2Journey(p, p.seed + 7919 * i, cohort));
    all.push(...ts); per[`${id}@${p.version}`] = metrics(ts);
    console.log(cohort, id, ts.length, JSON.stringify(ts.reduce((m, t) => ({ ...m, [t.end]: ((m as Record<string, number>)[t.end] ?? 0) + 1 }), {})));
  }
  writeFileSync(new URL(`traces/${cohort}.jsonl.gz`, here), gzipSync(all.map((t) => JSON.stringify(t)).join("\n") + "\n"));
  writeFileSync(new URL(`results/metrics-${cohort}.json`, here), JSON.stringify({ cohort, label: cc.label, journeys: all.length, aggregate: metrics(all), perProfile: per }, null, 1) + "\n");
}
