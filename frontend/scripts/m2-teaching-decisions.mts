/**
 * Milestone 2 closure, stage 3: for each teaching decision the engine made in representative scenarios, the evidence it rested on, rebuilt from the
 * records just before the explanation was delivered (real learnerState / moduleState / hypotheses / investigationTrigger; learner actions scripted only).
 *   justified    an established misconception (learner-hypothesis@1), or the problem's own skill after recovery found no gap, or a second explanation after a
 *                failed check following the first
 *   plausible    a diagnosis from the module's own starting check (posterior) or an uncertain reading, with no established hypothesis: reasonable, unverified
 */
import { readFileSync, writeFileSync } from "node:fs";
import { graph } from "../../packages/learning/src/graph.ts";
import { hypotheses } from "../../packages/learning/src/hypotheses.ts";
import { moduleState } from "../../packages/learning/src/intervention.ts";
import { learnerState } from "../../packages/learning/src/session.ts";
import { SCENARIOS, runScenario, CATEGORY } from "../src/journey/scenarios.ts";

const review: Record<string, string> = JSON.parse(readFileSync(process.argv[2], "utf8"));
const IDS = ["1b", "1a", "2a", "2b", "2c", "2h", "3a", "3c", "3d", "3h", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6e"];
const out: unknown[] = [];
for (const id of IDS) {
  const s = SCENARIOS.find((x) => x.id === id)!, r = runScenario(s);
  const ev = r.f.session.events as any[];
  const decisions: unknown[] = [];
  ev.forEach((e, i) => {
    if (e.record !== "teach") return;
    const prior = ev.slice(0, i), now = Date.parse(e.at) - 1;
    const st = learnerState(r.f.session.learnerId, prior, now, {});
    const c = graph.evidenceTarget(e.competency);
    const ms = moduleState(c, st.records, st.evidence(c), now, e.sessionId, null, st.evidence);
    const hs = hypotheses(st.records).filter((h) => h.scope.observedIn === c || h.scope.about === c);
    const est = hs.find((h) => h.status === "established");
    const earlierHere = prior.filter((x) => x.record === "teach" && graph.evidenceTarget(x.competency) === c).length;
    const failedCheckSince = earlierHere && st.records.attempts.some((a) => graph.evidenceTarget(a.competency) === c && a.activity === "check" && a.credit === false && a.at > prior.filter((x) => x.record === "teach").at(-1).at);
    const viaRecovery = r.f.session.trace.some((t) => t.component === "intervention.recovery" && (t.output as any).active === c);
    const ownAfterNoGap = r.f.session.trace.some((t) => t.component === "intervention.recovery" && (t.output as any).phase === "teach" && (t.output as any).active === c && /No gap was found/.test((t.output as any).reason ?? ""));
    const basis = est ? `established misconception: ${est.claim?.explanation} (${est.supporting.length} supporting answer(s))`
      : failedCheckSince ? "the independent check after the previous explanation was wrong"
      : ownAfterNoGap ? "recovery found no gap in the skills it builds on; the problem is still wrong"
      : viaRecovery ? `recovery named this skill (${(r.f.session.trace.filter((t) => t.component === "intervention.recovery" && (t.output as any).active === c).at(-1)!.output as any).status ?? "plan"})`
      : `module starting check: ${ms.diagnosis?.result ?? "?"} (confidence ${ms.diagnosis?.confidence ?? "?"}); hypotheses ${hs.map((h) => h.status).join(",") || "none"}`;
    const verdict = est || failedCheckSince || ownAfterNoGap ? "justified" : "plausible, unverified";
    decisions.push({ competency: c.split(".").pop(), strategy: e.strategy, basis, verdict, content: review[`${c}|${e.strategy}`] ?? "not reviewed" });
  });
  const rec = r.f.session.trace.filter((t) => t.component === "intervention.recovery").map((t) => (t.output as any).phase);
  out.push({ id, category: CATEGORY[s.category], learner: s.learner().name, ended: r.f.ended?.phase ?? null, actions: { assessed: r.f.session.trace.some((t) => t.component === "intervention.moduleState" && (t.output as any).phase === "explore" && !String((t.output as any).context ?? "").startsWith("investigate:")), investigated: r.f.session.trace.some((t) => t.component === "intervention.moduleState" && String((t.output as any).context ?? "").startsWith("investigate:")) || rec.includes("investigate") || rec.includes("support"), taught: decisions.length, retried: r.actions.filter((a) => a.act === "retry").length, paused: r.f.ended?.phase === "pause", escalated: rec.includes("escalate") }, decisions });
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log("scenarios", out.length);
