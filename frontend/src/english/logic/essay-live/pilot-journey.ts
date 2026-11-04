/**
 * Pilot validation v1, task E: the complete synthetic essay-to-mastery journey through the current integrated engine,
 * stage by stage, with what actually happened at each stage read back from the engine.
 *
 * One synthetic learner (the studio's dedicated synthetic profile), in memory, on a fixed clock. It writes the built-in
 * synthetic sample essay (agreement errors), answers the agreement diagnostics wrongly and everything after teaching
 * rightly, waits seven days, rewrites, and writes a second essay a week later. Only the questions the app ships
 * (with the pilot's pools) are used; the proposed supplement is not loaded. Nothing is scripted: each stage's status
 * comes from the engine's own records. The essay analyses and the rewrite judgement are RECORDED evaluator outputs
 * (content/english/essay/samples.json), not a live model.
 *
 *   node --import tsx scripts/essay-pilot-journey.mts        writes docs/product/essay-learning/pilot-validation-v1/SYNTHETIC_JOURNEY.md
 */
import { allocateItems, engineClaim, essayView, type Item, type LedgerEvent } from "../../../../../packages/english-core/src/index.ts";
import { type AppContent } from "../content.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer, wrongAnswer } from "../test-helpers.ts";
import { EssayStudio, SAMPLES, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME, type StudioView } from "./studio.ts";

export const PILOT_JOURNEY_VERSION = "pilot-journey@1";
const SVA = "EN.GRM.VERB.sva";
const DAY = 86_400_000;
export type StageStatus = "works" | "works, recorded evaluator output" | "blocked" | "not reached";

export interface JourneyStage {
  n: number;
  stage: string;
  status: StageStatus;
  what: string[];
}

export interface PilotJourneyReport {
  version: string;
  start: string;
  stages: JourneyStage[];
  final: { competency: string; journeyCompleted: boolean | null; demonstrated: boolean; verified: boolean; currentLevel: number | null; target: number | null; retention: string; pending: string | null; profileState: string };
}

function fixedClock(start: string) {
  let t = Date.parse(start);
  const clock = () => {
    t += 60_000;
    return new Date(t).toISOString();
  };
  clock.days = (n: number) => void (t += n * DAY);
  return clock;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export async function runPilotJourney(content: AppContent, start = "2026-10-19T09:00:00.000Z"): Promise<PilotJourneyReport> {
  const clock = fixedClock(start);
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner);
  const items = studio.ectx.ctx.content.items;
  const b = (id: string) => (items.get(id) as { b?: number } | undefined)?.b;
  const desc = (id: string) => `\`${id}\` (b ${b(id) ?? "?"})`;
  const decision = (id: string) => learner.state.ledger.decisions.find((d) => d.source === id)?.verdict ?? "none";
  const stages: JourneyStage[] = [];
  const add = (n: number, stage: string, status: StageStatus, what: string[]) => stages.push({ n, stage, status, what });
  const [library, weekend] = SAMPLES.essays;
  // what the shipped bank can supply agreement for one learner, before anything is used
  const supply = allocateItems(studio.ectx, [], SVA);

  // 1. an essay with agreement errors
  let v: StudioView = await studio.submit(library.text);
  const svaObs = v.analysis?.observations.filter((o) => o.competency === SVA) ?? [];
  add(1, "Submit an essay with agreement errors", v.analysis?.status === "accepted" ? "works, recorded evaluator output" : "blocked", [
    `Synthetic sample "${library.title}" (${words(library.text)} words), data use \`${v.essay?.source.dataUse}\`.`,
    `Analysed by: ${v.analysedBy} (evaluator \`${v.analysis?.evaluator.id}@${v.analysis?.evaluator.version}\`): a recorded output replayed by fingerprint, not a live model. Status ${v.analysis?.status}; ${v.analysis?.observations.length ?? 0} observations passed the core's validation (quotes checked against the text).`,
    `Agreement observations: ${svaObs.map((o) => `"${o.span.quote}"`).join(", ") || "none"}.`,
  ]);

  // 2. a provisional competency observation
  const h1 = v.hypotheses.find((h) => h.competency === SVA);
  const p1 = v.profile.competencies.find((c) => c.competency === SVA);
  add(2, "Receive a provisional competency observation", h1?.status === "suspected" ? "works, recorded evaluator output" : "blocked", [
    `Agreement: \`${h1?.status}\`, a suspected gap from the essay only. Basis: ${h1?.basis.join("; ") ?? "none"}.`,
    `Profile state for agreement: \`${p1?.state}\`. No estimate changed: essay observations are not evidence.`,
    `Other suspected gaps from the same essay (outside the pilot's three competencies): ${v.hypotheses.filter((h) => h.competency !== SVA && h.status === "suspected").map((h) => `\`${h.competency}\``).join(", ") || "none"}.`,
  ]);

  // 3. independent diagnostic questions: agreement wrong, everything else right
  const before = [...studio.events];
  const asked: { item: Item; competency: string }[] = [];
  for (let guard = 0; guard < 30 && v.nextDiagnostic; guard++) {
    const { item, request } = v.nextDiagnostic;
    asked.push({ item, competency: request.competency });
    v = (await studio.answerDiagnostic(request.competency === SVA ? wrongAnswer(item) : rightAnswer(item))).view;
  }
  const dSva = v.diagnostics.find((d) => d.request.competency === SVA);
  const u = studio.updates(before).find((x) => x.competency === SVA);
  add(3, "Answer independent diagnostic questions", dSva?.outcome.status === "confirmed" ? "works" : "blocked", [
    `Agreement questions planned (diagnosis pool, unseen): ${dSva?.request.items.map((i) => desc(i.id)).join(", ")}. Asked and answered wrongly by the synthetic learner, each an independent first answer: ${dSva?.outcome.answers.map((a) => desc(a.item)).join(", ")}; the outcome was decided after ${dSva?.outcome.answers.length} wrong answers (the policy's confirmMinWrong is ${studio.ectx.policy.confirmMinWrong}), so the rest were not asked.`,
    `Engine decisions: ${dSva?.outcome.answers.map((a) => `${a.item} ${decision(a.evidence)}`).join(", ")}. Gap: ${u?.gapFrom} → **${u?.gapTo}**; estimate changed: ${u?.estimateChanged}.`,
    `${asked.some((a) => a.competency !== SVA) ? `Other diagnostics, answered rightly: ${asked.filter((a) => a.competency !== SVA).length}.` : "No other competency had diagnostic questions."}${v.diagnostics.filter((d) => d.request.contentGap).length ? ` No questions exist for ${v.diagnostics.filter((d) => d.request.contentGap).map((d) => `\`${d.request.competency}\``).join(", ")} (reported, not filled).` : ""}`,
  ]);

  // 4–6. the journey: teaching, guided practice, the independent check
  v = await studio.plan();
  const tree = v.journey!.trees.find((t) => t.root === SVA);
  const node = tree?.nodes.find((n) => n.competency === SVA);
  const lessons: string[] = [];
  const practiced: string[] = [];
  const checked: string[] = [];
  for (let guard = 0; guard < 40 && v.next; guard++) {
    const n = v.next;
    if (n.step.kind === "teach") {
      if (n.node.competency === SVA) lessons.push(n.lesson!.id);
      v = await studio.readLesson(n.lesson!.id, true);
    } else {
      if (n.node.competency === SVA) (n.step.kind === "independent_check" ? checked : practiced).push(n.item!.id);
      v = (await studio.answerStep(rightAnswer(n.item!))).view;
    }
  }
  const sNode = v.journey!.trees.find((t) => t.root === SVA)?.nodes.find((n) => n.competency === SVA);
  const step = (k: string) => sNode?.steps.find((s) => s.kind === k);
  add(4, "Receive targeted instruction", lessons.length ? "works" : "blocked", [
    `Journey trees: ${v.journey!.trees.map((t) => `\`${t.root}\``).join(", ")}. Agreement steps: ${node?.steps.map((s) => s.kind).join(" → ")}.`,
    `Lessons read (candidate content, not educator-reviewed): ${lessons.map((l) => `\`${l}\``).join(", ")}. Step status: \`${step("teach")?.status}\`.`,
  ]);
  add(5, "Complete guided practice", practiced.length ? "works" : "blocked", [
    `Practice questions (answered rightly, with help available): ${practiced.map(desc).join(", ")}. Recorded as ${studio.events.filter((e) => e.kind === "assisted_response" && practiced.includes(e.item.id)).length} assisted responses (policy assisted@1), which never count as evidence of independent skill; independent evidence events for them: ${studio.events.filter((e) => e.kind === "evidence" && practiced.includes(e.item.id)).length}. Step status: \`${step("guided_practice")?.status}\`.`,
  ]);
  const t = Date.parse(clock());
  const claim6 = engineClaim(studio.ectx, SVA, essayView(studio.ectx, learner.state.ledger.composite, SVA, new Date(t).toISOString()));
  const check = step("independent_check");
  add(6, "Demonstrate the skill independently", checked.length && claim6.level !== "none" ? "works" : "blocked", [
    `Independent check step: \`${check?.status}\`. ${check?.content.note ?? ""}`.trim(),
    `Questions asked in the check: ${checked.length ? checked.map(desc).join(", ") : "none"}.`,
    `What the shipped bank reserves for agreement (before the journey): independent verification ${supply.reserved.independent_verification.map(desc).join(", ") || "none"}; delayed retention ${supply.reserved.delayed_retention.map(desc).join(", ") || "none"}. The policy needs ${studio.ectx.policy.checkItems} for the check and ${studio.ectx.policy.retentionItems} for retention. Shortfall reported by the allocation: ${supply.shortfall.join("; ") || "none"}.`,
    `Engine claim at the provisional target (band ${claim6.target}): **${claim6.level}** (current level ${claim6.currentLevel ?? "none"}).`,
  ]);

  // 7. the delayed retention check, seven days later
  v = await studio.planLaterChecks();
  const o7 = v.outcomes.find((x) => x.competency === SVA);
  const plannedSva = v.checks.filter((c) => c.competency === SVA);
  clock.days(7);
  v = await studio.planLaterChecks();
  const o7b = v.outcomes.find((x) => x.competency === SVA);
  const retentionAsked: string[] = [];
  for (let guard = 0; guard < 10 && v.laterCheck; guard++) {
    if (v.laterCheck.check.competency === SVA) retentionAsked.push(v.laterCheck.item.id);
    v = (await studio.answerLaterCheck(rightAnswer(v.laterCheck.item))).view;
  }
  const o7c = v.outcomes.find((x) => x.competency === SVA);
  add(7, "Return for a delayed retention check (≥ 7 days)", o7c?.retention === "demonstrated" ? "works" : "blocked", [
    `After the journey: demonstrated ${o7?.demonstrated}, retention \`${o7?.retention}\`. Later checks planned for agreement: ${plannedSva.length}. Pending: ${o7?.pending}.`,
    `Seven days later: retention \`${o7b?.retention}\`; later-check questions asked: ${retentionAsked.length ? retentionAsked.map(desc).join(", ") : "none"}. Pending: ${o7c?.pending}.`,
    "A retention check is planned only after the target has been shown without help, so it cannot be reached here; nothing is offered early or invented.",
  ]);

  // 8. the 20–50-word rewrite
  const rw = SAMPLES.rewrites.find((r) => r.essay === library.id)!;
  const nodesBefore = JSON.stringify(learner.state.ledger.composite.nodes);
  v = await studio.rewrite(rw.text);
  add(8, "Rewrite the essay in 20–50 words", v.rewrite?.status === "evaluated" ? "works, recorded evaluator output" : "blocked", [
    `Rewrite: ${words(rw.text)} words. Status \`${v.rewrite?.status}\`; dimensions: ${v.rewrite?.dimensions.map((d) => `${d.dimension} ${d.rating ?? "–"} (${d.status})`).join(", ")}.`,
    `Judged from a recorded judgement (the only rewrite with one); any other rewrite text would be kept and held, unjudged. Affects estimates: ${v.rewrite?.affectsEstimates}; composite unchanged: ${JSON.stringify(learner.state.ledger.composite.nodes) === nodesBefore}.`,
  ]);

  // 9. a second essay a week later
  clock.days(7);
  const usedBefore = new Set((studio.events as LedgerEvent[]).flatMap((e) => ("item" in e && e.item ? [e.item.id] : [])));
  v = await studio.submit(weekend.text);
  const h2 = v.hypotheses.filter((x) => x.competency === SVA).at(-1);
  add(9, "Submit a second essay", v.analysis?.status === "accepted" ? "works, recorded evaluator output" : "blocked", [
    `Synthetic sample "${weekend.title}" (${words(weekend.text)} words), analysed by ${v.analysedBy} (recorded output). ${v.analysis?.observations.filter((o) => o.competency === SVA).length ?? 0} agreement observation(s).`,
  ]);

  // 10. the second journey, informed by the profile
  const asked2: string[] = [];
  for (let guard = 0; guard < 30 && v.nextDiagnostic; guard++) {
    if (v.nextDiagnostic.request.competency === SVA) asked2.push(v.nextDiagnostic.item.id);
    v = (await studio.answerDiagnostic(rightAnswer(v.nextDiagnostic.item))).view;
  }
  v = await studio.plan();
  const h2b = v.hypotheses.filter((x) => x.competency === SVA).at(-1);
  const reused = asked2.filter((i) => usedBefore.has(i));
  const skipped = v.journey!.skipped.find((x) => x.competency === SVA);
  const informed = h2?.essays.length === 2 && /earlier essay/.test(h2.basis.join(" ")) && reused.length === 0;
  add(10, "Second journey informed by the learner profile", informed ? "works" : "blocked", [
    `Before diagnosis, agreement is \`${h2?.status}\` across essays ${h2?.essays.join(", ")}. Basis: ${h2?.basis.join("; ")}.`,
    `Second-round agreement diagnostics (all unseen; answered rightly): ${asked2.map(desc).join(", ") || "none"}; questions reused from the first journey: ${reused.length}. Result: \`${h2b?.status}\`.`,
    `Second journey trees: ${v.journey!.trees.map((t) => `\`${t.root}\``).join(", ") || "none"}.${skipped ? ` Agreement skipped: ${skipped.reason.replace(/\.$/, "")}.` : ""}`,
  ]);

  const o = v.outcomes.find((x) => x.competency === SVA) ?? o7c!;
  const now = clock();
  const finalClaim = engineClaim(studio.ectx, SVA, essayView(studio.ectx, learner.state.ledger.composite, SVA, now));
  return {
    version: PILOT_JOURNEY_VERSION,
    start,
    stages,
    final: {
      competency: SVA,
      journeyCompleted: o7c?.journeyCompleted ?? null,
      demonstrated: finalClaim.level !== "none",
      verified: finalClaim.level === "verified",
      currentLevel: finalClaim.currentLevel,
      target: finalClaim.target,
      retention: o?.retention ?? "not_applicable",
      pending: o7c?.pending ?? null,
      profileState: v.profile.competencies.find((c) => c.competency === SVA)?.state ?? "none",
    },
  };
}

export function journeyMarkdown(r: PilotJourneyReport): string {
  const out = [
    "# Synthetic journey report (pilot validation v1)",
    "",
    `Generated by \`node --import tsx scripts/essay-pilot-journey.mts\` (frontend), ${r.version}, fixed clock from ${r.start.slice(0, 10)}. Do not edit by hand: the frontend test \`pilot-journey.test.ts\` fails if this file is stale.`,
    "",
    "One **synthetic** learner on the studio's dedicated synthetic profile, in memory, through the current integrated engine (EssayStudio → Learner → ledger → core). Questions come only from the bank the app ships, with the pilot's pools; the proposed supplement is not loaded. Essay analyses and the rewrite judgement are **recorded evaluator outputs** replayed by text fingerprint, not a live model. The learner's answers are fixed: agreement diagnostics wrong, everything after teaching right, second-essay diagnostics right.",
    "",
    "| # | Stage | Status |",
    "|---:|---|---|",
    ...r.stages.map((s) => `| ${s.n} | ${s.stage} | ${s.status === "blocked" ? "**blocked**" : s.status} |`),
    "",
  ];
  for (const s of r.stages) out.push(`## ${s.n}. ${s.stage}: ${s.status}`, "", ...s.what.map((w) => `- ${w}`), "");
  const f = r.final;
  out.push(
    "## Final state for agreement",
    "",
    `- Journey completed: ${f.journeyCompleted}. Shown at the provisional target without help: **${f.demonstrated}**. Verified (shown, then kept at a delayed check): **${f.verified}**.`,
    `- Current level: ${f.currentLevel ?? "none"}; provisional target: band ${f.target}. Retention: \`${f.retention}\`. Profile state: \`${f.profileState}\`.`,
    `- Pending (the engine's own reason): ${f.pending}`,
    "",
    "No mastery is claimed. With the shipped bank, agreement cannot be checked independently at the target, so stages 6 and 7 are blocked, and the journey ends with the reason stated. The pilot matrix (`../PILOT_COVERAGE.md`) shows that the 41 round-1 questions, if an educator approves them, are enough for one full sequence under the locked pilot policy.",
    "",
  );
  return out.join("\n");
}
