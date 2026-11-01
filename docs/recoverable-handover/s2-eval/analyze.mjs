// H1 vs S2: hand-over and return metrics from S2 journey traces (traces/<cohort>.jsonl.gz). Usage: node analyze.mjs <label> <tracesDir> <cohort...>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const [label, dir, ...cohorts] = process.argv.slice(2);
const KINDS = ["two-step", "both-sides", "brackets", "modelling"];
const weak = (h, k) => (h.abilities[k] ?? 1) < 0.6 || Object.entries(h.misconceptions ?? {}).some(([m, v]) => v >= 0.3 && m.startsWith(k));
const out = {};
for (const c of cohorts) {
  const T = gunzipSync(readFileSync(`${dir}/${c}.jsonl.gz`)).toString().trim().split("\n").map((l) => JSON.parse(l));
  const m = { journeys: T.length, ends: {}, pauseVisits: 0, journeysWithPause: 0, journeysWithReentry: 0, reentryQuestions: 0, reentryRight: 0, reentryWrong: 0,
    stalled: 0, stalledNeedsTeacher: 0, stalledWaiting: 0, stalledOther: 0, returnVisits: 0, returnVisitsWithAction: 0, returnsAfterPause: 0, returnsAfterPauseWithAction: 0,
    retentionDateReturns: 0, retentionDateReturnsTooEarly: 0,
    claimsAfterReentry: 0, falseClaimsAfterReentry: 0, journeysFalseClaimAfterReentry: 0, totalQuestions: 0, totalVisits: 0, repeatedSameExplanation: 0 };
  for (const t of T) {
    m.ends[t.end] = (m.ends[t.end] ?? 0) + 1; m.totalVisits += t.visits.length;
    let paused = false, reentered = false, falseAfter = false;
    t.visits.forEach((v, i) => {
      const acted = v.openpath.attempts.length > 0 || v.openpath.teaching.length > 0;
      m.totalQuestions += v.openpath.attempts.length;
      const re = v.openpath.phases.filter((p) => p === "reentry").length;
      if (re) { reentered = true; const ra = v.openpath.attempts.filter((a) => a.activity === "diagnostic"); }
      // re-entry answers: diagnostic attempts in a visit whose phases include reentry, the first one
      if (v.openpath.phases.includes("reentry")) { m.reentryQuestions++; const a = v.openpath.attempts[0]; if (a?.verdict === "correct") m.reentryRight++; else m.reentryWrong++; }
      if (i > 0) { m.returnVisits++; if (acted) m.returnVisitsWithAction++; }
      if (i > 0 && /teacher or parent/i.test(t.visits[i - 1].summary ?? "")) { m.returnsAfterPause++; if (acted) m.returnsAfterPauseWithAction++; }
      if (/teacher or parent/i.test(v.summary ?? "")) { m.pauseVisits++; paused = true; }
      if (v.factBefore?.label === "scheduled" && i > 0) { m.retentionDateReturns++; if (!v.openpath.attempts.some((a) => a.activity === "retention")) { m.retentionDateReturnsTooEarly++; } }
      const claim = ["independent", "transfer", "verified"].includes(v.openpath.evidence.status);
      if (reentered && claim) { m.claimsAfterReentry++; if (KINDS.some((k) => weak(v.hiddenAfter, k))) { m.falseClaimsAfterReentry++; falseAfter = true; } }
    });
    if (paused) m.journeysWithPause++; if (reentered) m.journeysWithReentry++; if (falseAfter) m.journeysFalseClaimAfterReentry++;
    if (t.end === "stalled") { m.stalled++; const s = t.visits.at(-1).summary ?? ""; if (/once a teacher|needs a teacher|go through it with a teacher\.|go through it with a teacher$/i.test(s)) m.stalledNeedsTeacher++; else if (/after a short break|try this again on your own/i.test(s)) m.stalledWaiting++; else m.stalledOther++; }
    const seen = new Map(); for (const ins of t.instruction ?? []) { const k = ins.title; seen.set(k, (seen.get(k) ?? 0) + 1); } for (const n of seen.values()) if (n > 1) m.repeatedSameExplanation += n - 1;
  }
  out[c] = m;
}
console.log(JSON.stringify({ label, ...out }, null, 1));
