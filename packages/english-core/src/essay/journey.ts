/**
 * A finite learning journey from essay hypotheses and the framework's prerequisites.
 *
 * Each target competency becomes a small tree (the target and any prerequisite that also shows difficulty),
 * with a fixed number of steps: teach, guided practice, an independent check. The number of trees and steps is
 * fixed when the journey is created. A step is "done" when it was carried out; it is "green" only when the
 * existing engine says the competency is demonstrated or verified. Reading a lesson never makes anything green.
 * Missing lessons or questions block a step and are reported; nothing is invented.
 */
import { leafView } from "../composite.ts";
import type { CapabilityId, EssayEvent, InterventionEvent, LedgerEvent } from "../types.ts";
import { Ledger } from "../updater.ts";
import { essayRecords, EssayRefusal, type EventMeta } from "./analysis.ts";
import { engineClaim, type EssayContext } from "./competencies.ts";
import { ESSAY_CONTRACT, type CompetencyTree, type GapHypothesis, type JourneyNode, type JourneyStep, type JourneyStepKind, type LearningJourney } from "./contract.ts";
import { countedAnalyses, currentHypotheses, pickItems } from "./gaps.ts";

const STATUS_ORDER: Record<GapHypothesis["status"], number> = { confirmed: 0, unresolved: 1, suspected: 2, weakened: 9 };

const learnerOf = (events: readonly LedgerEvent[]): string => essayRecords(events, "submission")[0]?.record.submission.learner ?? "learner";

/** Build a journey for the learner's current hypotheses. Returns the ledger event to append. */
export function createJourney(ectx: EssayContext, events: readonly LedgerEvent[], meta: EventMeta, essayId: string): { event: EssayEvent; journey: LearningJourney } {
  const p = ectx.policy;
  const learner = learnerOf(events);
  if (!essayRecords(events, "submission").some((r) => r.record.submission.id === essayId)) throw new EssayRefusal(`essay ${essayId} is not recorded`);
  const ledger = Ledger.rebuild(ectx.ctx, learner, events as LedgerEvent[]);
  const level = (cap: CapabilityId) => engineClaim(ectx, cap, leafView(ledger.composite, ectx.ctx.index, cap, meta.at)).level;
  const name = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.name ?? ectx.ctx.index.names.get(cap) ?? cap;
  const hyps = currentHypotheses(ectx, events);
  const skipped: LearningJourney["skipped"] = [];
  const contentGaps: LearningJourney["contentGaps"] = [];

  // isolated errors: observed, not suspected
  const errorCaps = new Map<CapabilityId, number>();
  for (const a of countedAnalyses(events)) for (const o of a.observations) if (o.kind === "error") errorCaps.set(o.competency, (errorCaps.get(o.competency) ?? 0) + 1);
  for (const [cap] of errorCaps) if (!hyps.has(cap)) skipped.push({ competency: cap, reason: `${name(cap)}: one error seen, which may be a slip. Not taught; it is watched in the next essay.` });

  const order = [...ectx.profile.byCapability.keys()];
  const candidates = [...hyps.values()]
    .filter((h) => {
      if (h.status !== "weakened") return true;
      skipped.push({ competency: h.competency, reason: `${name(h.competency)}: the essay suggested a gap, but questions answered without help were right. Not taught.` });
      return false;
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.observations.length - a.observations.length || order.indexOf(a.competency) - order.indexOf(b.competency));

  const used = new Set<string>();
  const trees: CompetencyTree[] = [];
  let stepNo = 0;
  const step = (cap: CapabilityId, kind: JourneyStepKind, reason: string, refs: string[], available: boolean, note: string): JourneyStep => ({
    id: `${meta.id}:s${++stepNo}`,
    competency: cap,
    kind,
    order: stepNo,
    content: { available, refs, note },
    status: available ? "pending" : "blocked",
    evidence: [],
    reason,
  });
  const teach = (cap: CapabilityId, why: string): JourneyStep => {
    const lessons = ectx.lessons.get(cap) ?? [];
    if (!lessons.length) contentGaps.push({ competency: cap, what: `no lesson for ${name(cap)} in the app yet` });
    return step(cap, "teach", why, lessons, lessons.length > 0, lessons.length ? `${lessons.length} lesson part${lessons.length === 1 ? "" : "s"}` : `No lesson for ${name(cap)} yet`);
  };
  const practice = (cap: CapabilityId): JourneyStep => {
    const items = specified(cap) ? pickItems(ectx, events, cap, p.guidedItems, used) : [];
    items.forEach((i) => used.add(i.id));
    if (!items.length) contentGaps.push({ competency: cap, what: `no unseen practice questions for ${name(cap)}` });
    return step(cap, "guided_practice", "Practice with help available: these answers are practice and never count as independent evidence.", items.map((i) => i.id), items.length > 0, items.length ? `${items.length} question${items.length === 1 ? "" : "s"} with hints` : `No unseen questions for ${name(cap)}`);
  };
  const check = (cap: CapabilityId): JourneyStep => {
    const items = specified(cap) ? pickItems(ectx, events, cap, p.checkItems, used) : [];
    items.forEach((i) => used.add(i.id));
    const ok = items.length >= p.checkItems;
    if (!ok) contentGaps.push({ competency: cap, what: `fewer than ${p.checkItems} unseen questions to check ${name(cap)} without help` });
    return step(cap, "independent_check", "Without help, on questions not used before. It turns green only when the engine counts the skill as demonstrated at the grade target.", items.map((i) => i.id), ok, ok ? `${items.length} unseen questions, no hints` : `Not enough unseen questions to check ${name(cap)}`);
  };
  const specified = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.specified ?? false;

  for (const h of candidates) {
    if (trees.length >= p.maxTrees) {
      skipped.push({ competency: h.competency, reason: `${name(h.competency)}: beyond this journey's size (${p.maxTrees} skills); kept for the next one.` });
      continue;
    }
    if (trees.some((t) => t.nodes.some((n) => n.competency === h.competency))) continue;
    const nodes: JourneyNode[] = [];
    const addNode = (cap: CapabilityId, role: JourneyNode["role"], depth: number, why: string, hyp?: GapHypothesis) => {
      const lv = level(cap);
      const requires = ectx.ctx.index.requires.get(cap) ?? [];
      const steps: JourneyStep[] = [];
      if (!specified(cap)) contentGaps.push({ competency: cap, what: `${name(cap)} is not specified in the framework yet (no descriptors, questions or lessons)` });
      if (lv === "none") steps.push(teach(cap, why), practice(cap), check(cap));
      else if (hyp?.status === "confirmed") steps.push(teach(cap, `Shown before (${lv}), but the essay and the diagnostic questions now both show difficulty: a short refresher.`), practice(cap), check(cap));
      else steps.push(check(cap));
      nodes.push({ competency: cap, role, requires, reason: why, steps, green: false, level: lv });
      if (depth >= p.prerequisiteDepth) return;
      for (const pre of requires) {
        if (nodes.some((n) => n.competency === pre) || trees.some((t) => t.nodes.some((n) => n.competency === pre))) continue;
        const preLevel = level(pre);
        const preHyp = hyps.get(pre);
        const struggling = preHyp ? preHyp.status !== "weakened" : (errorCaps.get(pre) ?? 0) > 0;
        if (preLevel !== "none" || !struggling) continue;
        addNode(pre, "prerequisite", depth + 1, `${name(cap)} builds on ${name(pre)}, which the essays also show difficulty with.`, preHyp);
      }
    };
    const why =
      h.status === "confirmed"
        ? `The essay showed it (${h.basis[0]}) and questions answered without help agreed.`
        : h.status === "unresolved"
          ? `The essay showed it (${h.basis[0]}); the questions were mixed, so practice and a fresh check follow.`
          : `The essay suggests it (${h.basis[0]}); not yet checked with questions.`;
    addNode(h.competency, "target", 0, why, h);
    // a prerequisite is taught before what depends on it
    nodes.sort((a, b) => (a.role === b.role ? 0 : a.role === "prerequisite" ? -1 : 1));
    trees.push({ root: h.competency, nodes });
  }
  // number steps in teaching order (prerequisites first within each tree)
  let n = 0;
  for (const t of trees) for (const node of t.nodes) for (const s of node.steps) s.order = ++n;
  const totalSteps = n;
  const journey: LearningJourney = {
    contract: ESSAY_CONTRACT,
    id: meta.id,
    essay: essayId,
    learner,
    at: meta.at,
    policy: p.version,
    trees,
    skipped,
    contentGaps: dedupe(contentGaps),
    limits: { maxTrees: p.maxTrees, maxStepsPerNode: 3, totalSteps },
    finalRewrite: { available: trees.length === 0, reason: trees.length === 0 ? "Nothing to work on first: the rewrite can start now." : "After the journey's steps (lessons, practice and checks)." },
    complete: trees.length === 0,
  };
  return { event: { kind: "essay", id: meta.id, at: meta.at, session: meta.session, record: { type: "journey", journey } }, journey };
}

/** One line per gap; for a competency the framework does not specify, that single fact says it all. */
const dedupe = (gaps: LearningJourney["contentGaps"]) => {
  const seen = new Set<string>();
  const unspecified = new Set(gaps.filter((g) => / is not specified in the framework/.test(g.what)).map((g) => g.competency));
  return gaps.filter((g) => {
    if (unspecified.has(g.competency) && !/ is not specified in the framework/.test(g.what)) return false;
    const k = `${g.competency}|${g.what}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * The journey as it stands now: each step's status from the ledger, and green only where the engine permits.
 * Deterministic: the same events give the same statuses.
 */
export function journeyStatus(ectx: EssayContext, events: readonly LedgerEvent[], journeyId: string, now: string): LearningJourney {
  const rec = essayRecords(events, "journey").find((r) => r.record.journey.id === journeyId);
  if (!rec) throw new EssayRefusal(`journey ${journeyId} is not recorded`);
  const j: LearningJourney = structuredClone(rec.record.journey);
  const learner = j.learner;
  const ledger = Ledger.rebuild(ectx.ctx, learner, events as LedgerEvent[]);
  const after = events.filter((e) => e.at >= j.at);
  for (const t of j.trees)
    for (const node of t.nodes) {
      node.level = engineClaim(ectx, node.competency, leafView(ledger.composite, ectx.ctx.index, node.competency, now)).level;
      for (const s of node.steps) {
        if (s.status === "blocked") continue;
        if (s.kind === "teach") {
          const taught = after.filter((e): e is InterventionEvent => e.kind === "intervention" && e.capability === node.competency);
          s.evidence = taught.map((e) => e.id);
          s.status = taught.length ? "done" : "pending";
        } else {
          const refs = new Set(s.content.refs);
          const answered = after.filter((e) => (e.kind === "evidence" || e.kind === "assisted_response") && refs.has(e.item.id));
          s.evidence = answered.map((e) => e.id);
          const all = s.content.refs.every((r) => answered.some((e) => (e as { item: { id: string } }).item.id === r));
          if (s.kind === "independent_check") s.status = all ? (node.level !== "none" ? "green" : "done") : "pending";
          else s.status = all ? "done" : "pending";
        }
      }
      const check = node.steps.find((s) => s.kind === "independent_check");
      node.green = node.level !== "none" && (!check || check.status === "green");
    }
  const targets = j.trees.flatMap((t) => t.nodes.filter((n) => n.role === "target"));
  const finished = j.trees.every((t) => t.nodes.every((n) => n.steps.every((s) => s.status !== "pending")));
  j.complete = targets.length === 0 || targets.every((n) => n.green);
  j.finalRewrite = finished
    ? { available: true, reason: j.complete ? "Every skill in the journey is shown: time for the 50-word rewrite." : "All steps are done. Some skills are not yet shown without help; the rewrite can still go ahead." }
    : { available: false, reason: "After the journey's steps (lessons, practice and checks)." };
  return j;
}
