/**
 * A finite learning journey from essay hypotheses and the framework's prerequisites.
 *
 * Each target competency becomes a small tree (the target and any prerequisite that also shows difficulty),
 * with a fixed number of steps: teach, guided practice, an independent check. The number of trees and steps is
 * fixed when the journey is created. A step is "done" when it was carried out; it is "green" only when the
 * existing engine says the competency is demonstrated or verified. Reading a lesson never makes anything green.
 * Missing lessons or questions block a step and are reported; nothing is invented.
 */
import type { CapabilityId, EssayEvent, InterventionEvent, LedgerEvent } from "../types.ts";
import { Ledger } from "../updater.ts";
import { essayRecords, EssayRefusal, type EventMeta } from "./analysis.ts";
import { engineClaim, essayView, type EssayContext, retentionTiming, targetRetention } from "./competencies.ts";
import { ESSAY_CONTRACT, type CompetencyOutcome, type CompetencyTree, type GapHypothesis, type JourneyNode, type JourneyReview, type JourneyStep, type JourneyStepKind, type LearningJourney, type NodeDecision } from "./contract.ts";
import { pickForRole } from "./allocation.ts";
import { checkProgress, competencyOutcome, plannedChecks } from "./checks.ts";
import { countedAnalyses, currentHypotheses } from "./gaps.ts";

const STATUS_ORDER: Record<GapHypothesis["status"], number> = { confirmed: 0, unresolved: 1, suspected: 2, weakened: 9 };

const learnerOf = (events: readonly LedgerEvent[]): string => essayRecords(events, "submission")[0]?.record.submission.learner ?? "learner";

/** Build a journey for the learner's current hypotheses. Returns the ledger event to append. */
export function createJourney(ectx: EssayContext, events: readonly LedgerEvent[], meta: EventMeta, essayId: string): { event: EssayEvent; journey: LearningJourney } {
  const p = ectx.policy;
  const learner = learnerOf(events);
  if (!essayRecords(events, "submission").some((r) => r.record.submission.id === essayId)) throw new EssayRefusal(`essay ${essayId} is not recorded`);
  const ledger = Ledger.rebuild(ectx.ctx, learner, events as LedgerEvent[]);
  const view = (cap: CapabilityId) => essayView(ectx, ledger.composite, cap, meta.at);
  const level = (cap: CapabilityId) => engineClaim(ectx, cap, view(cap), events, meta.at).level;
  // the delayed check that can verify the target: the ONE clock, anchored at the target (retention.ts)
  const timing = (cap: CapabilityId) => retentionTiming(ectx, cap, view(cap));
  const name = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.name ?? ectx.ctx.index.names.get(cap) ?? cap;
  const hyps = currentHypotheses(ectx, events);
  const skipped: LearningJourney["skipped"] = [];
  const contentGaps: LearningJourney["contentGaps"] = [];

  // isolated errors: observed, not suspected
  const errorCaps = new Map<CapabilityId, number>();
  for (const a of countedAnalyses(events)) for (const o of a.observations) if (o.kind === "error") errorCaps.set(o.competency, (errorCaps.get(o.competency) ?? 0) + 1);
  for (const [cap] of errorCaps) if (!hyps.has(cap)) skipped.push({ competency: cap, reason: `${name(cap)}: one error seen, which may be a slip. Not taught; it is watched in the next essay.` });

  const order = [...ectx.profile.byCapability.keys()];
  /** A review after the latest failed delayed check was carried out: a new essay checks first rather than re-teaching. */
  const reviewed = (cap: CapabilityId) => competencyOutcome(ectx, events, cap, meta.at, null, ledger).review?.complete === true;
  const openReview = (cap: CapabilityId) => plannedChecks(events).find((c) => c.competency === cap && c.review && !checkProgress(ectx, events, c, ledger).complete);
  const candidates = [...hyps.values()]
    .filter((h) => {
      // A2 (policy @3): a skill shown or verified since is not re-taught merely because an earlier essay's
      // hypothesis is still in the record. Only this essay's evidence can reopen it. (An earlier gap that was never
      // resolved is still carried, as before; earlier journeys and their steps are never changed.)
      if (!h.essays.includes(essayId)) {
        const v = view(h.competency);
        const shownSince = level(h.competency) !== "none" || timing(h.competency) !== null || (v.verification.historicalLevel ?? -Infinity) >= (ectx.profile.byCapability.get(h.competency)?.expectedBand ?? Infinity);
        if (shownSince) {
          skipped.push({ competency: h.competency, reason: `${name(h.competency)}: the difficulty was seen in an earlier essay (${h.essays.join(", ")}), not in this one, and the skill has been shown at the grade target since. Not taught again; any delayed check still follows its schedule.` });
          return false;
        }
      }
      // policy @4: shown at the target before, and this essay's evidence is not enough to reopen it
      if (h.reassessment?.reason === "held") {
        skipped.push({ competency: h.competency, reason: `${name(h.competency)}: ${h.reassessment.note}. Not taught or checked again; the next essay can reopen it.` });
        return false;
      }
      // policy @4: a review after a failed delayed check is already recorded: it is in the existing journey, not repeated
      const review = openReview(h.competency);
      if (review) {
        skipped.push({ competency: h.competency, reason: `${name(h.competency)}: a review after the failed delayed check is already planned (${review.id}); it continues in the existing journey.` });
        return false;
      }
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
  // Practice uses questions below the target band (or not fit to be evidence), pitched at the learner's current
  // estimate; the check uses unseen questions at or above the target, never one kept for the retention check
  // (allocation.ts). Questions at or above the target are never spent on practice.
  const estimate = (cap: CapabilityId) => view(cap).mean;
  const practice = (cap: CapabilityId): JourneyStep => {
    const items = specified(cap) ? pickForRole(ectx, events, cap, "guided_practice", p.guidedItems, { exclude: used, level: estimate(cap) }) : [];
    items.forEach((i) => used.add(i.id));
    if (!items.length) contentGaps.push({ competency: cap, what: `no unseen practice questions below the target band for ${name(cap)}` });
    return step(cap, "guided_practice", "Practice with help available: these answers are practice and never count as independent evidence.", items.map((i) => i.id), items.length > 0, items.length ? `${items.length} question${items.length === 1 ? "" : "s"} with hints` : `No unseen practice questions for ${name(cap)}`);
  };
  const check = (cap: CapabilityId): JourneyStep => {
    const items = specified(cap) ? pickForRole(ectx, events, cap, "independent_verification", p.checkItems, { exclude: used }) : [];
    items.forEach((i) => used.add(i.id));
    const ok = items.length >= p.checkItems;
    if (!ok) contentGaps.push({ competency: cap, what: `fewer than ${p.checkItems} unseen questions at the target band or above to check ${name(cap)} without help` });
    return step(cap, "independent_check", "Without help, on questions not used before, at the grade target. It turns green only when the engine counts the skill as demonstrated at the grade target.", ok ? items.map((i) => i.id) : [], ok, ok ? `${items.length} unseen questions, no hints` : `Not enough unseen questions at the target band to check ${name(cap)}: a later check is needed once more reviewed questions exist`);
  };
  const specified = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.specified ?? false;
  /** The delayed retention check as a journey step (questions from the retention reserve), or null when too few. */
  const retentionStep = (cap: CapabilityId): JourneyStep | "wait" | null => {
    // a delayed check the essay layer already planned is the same check: reuse its questions (never a second one);
    // if it is not due yet, nothing is asked or taught before its date
    const answered = new Set(events.flatMap((e) => (e.kind === "evidence" ? [e.item.id] : [])));
    const planned = essayRecords(events, "check").map((r) => r.record.check).filter((c) => c.competency === cap && c.kind === "retention" && c.items.some((i) => !answered.has(i.id))).at(-1);
    if (planned && planned.notBefore > meta.at) return "wait";
    if (planned) {
      planned.items.forEach((i) => used.add(i.id));
      return { ...step(cap, "independent_check", `The delayed check planned for ${planned.notBefore.slice(0, 10)} is due: without help, on the questions kept for it. Teaching follows only if it does not show the skill was kept.`, planned.items.map((i) => i.id), true, `${planned.items.length} questions kept for the delayed check, no hints`), purpose: "retention" };
    }
    const items = specified(cap) ? pickForRole(ectx, events, cap, "delayed_retention", p.retentionItems, { exclude: used }) : [];
    if (items.length < p.retentionItems) return null;
    items.forEach((i) => used.add(i.id));
    return { ...step(cap, "independent_check", "The delayed check is due: without help, on questions kept for it. Teaching follows only if it does not show the skill was kept.", items.map((i) => i.id), true, `${items.length} unseen questions kept for the delayed check, no hints`), purpose: "retention" };
  };
  /** After conditional teaching, a check without help as in any journey — only when the bank still has the questions. */
  const afterCheck = (cap: CapabilityId, steps: JourneyStep[]) => {
    const items = specified(cap) ? pickForRole(ectx, events, cap, "independent_verification", p.checkItems, { exclude: used }) : [];
    if (items.length < p.checkItems) return;
    items.forEach((i) => used.add(i.id));
    steps.push(conditional(step(cap, "independent_check", "After the lesson and practice: without help, on questions not used before, at the grade target.", items.map((i) => i.id), true, `${items.length} unseen questions, no hints`)));
  };
  const conditional = (s: JourneyStep): JourneyStep => ({ ...s, condition: "if_not_shown", reason: `${s.reason} Only if the check before it does not show the skill; otherwise it stays available but is not needed.` });

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
      let decision: NodeDecision;
      const t = role === "target" ? timing(cap) : null;
      const due = t === "due";
      const retention = t === "waiting" ? "wait" : due ? retentionStep(cap) : null;
      if (retention === "wait") {
        // its delayed check is already planned and not yet due: no re-teaching before it (and no node)
        waiting = true;
        return;
      } else if (retention) {
        // A3/B1: shown before and the delayed check is due: check first, re-teach only if it does not hold
        decision = "retention_due";
        steps.push(retention, conditional(teach(cap, "Shown before; the delayed check did not show it was kept: a short refresher.")), conditional(practice(cap)));
        afterCheck(cap, steps);
      } else if (role === "target" && targetRetention(ectx, cap, view(cap)).status === "failed" && !reviewed(cap)) {
        // policy @4: the latest delayed check failed: evidence the skill was not kept, so the review teaches first
        decision = "review";
        steps.push(teach(cap, `Shown at the grade target before, but the latest delayed check did not show it was kept: the lesson again. ${why}`), practice(cap), check(cap));
      } else if (lv === "none" && role === "target" && !due && hyp && hyp.status !== "confirmed") {
        // B2: insufficient evidence is not a confirmed gap: check at the target first when the bank can
        const c = check(cap);
        decision = "insufficient_evidence";
        if (c.status !== "blocked") {
          steps.push(c, conditional(teach(cap, why)), conditional(practice(cap)));
          afterCheck(cap, steps);
        }
        // too few questions at the target to check first: teach, as before (the research found this helps)
        else steps.push(teach(cap, why), practice(cap), c);
      } else if (lv === "none") {
        decision = role === "prerequisite" ? "prerequisite" : "gap";
        steps.push(teach(cap, why), practice(cap), check(cap));
      } else if (hyp?.status === "confirmed") {
        decision = "refresher";
        steps.push(teach(cap, `Shown before (${lv}), but the essay and the diagnostic questions now both show difficulty: a short refresher.`), practice(cap), check(cap));
      } else {
        decision = "check_only";
        steps.push(check(cap));
      }
      nodes.push({ competency: cap, role, requires, reason: why, steps, green: false, level: lv, decision });
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
    let waiting = false;
    addNode(h.competency, "target", 0, why, h);
    if (waiting) {
      skipped.push({ competency: h.competency, reason: `${name(h.competency)}: shown at the grade target before; its delayed check is already planned and not yet due, so nothing is re-taught before it.` });
      continue;
    }
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
  /** Did the engine show the skill at the target once all this check's questions were answered (false until then)? */
  const shownWhenAnswered = (check: JourneyStep): boolean => {
    if (check.status === "blocked") return false;
    const answers = check.content.refs.map((r) => after.find((e) => (e.kind === "evidence" || e.kind === "assisted_response") && e.item.id === r));
    if (answers.some((e) => !e)) return false;
    const at = answers.reduce((m, e) => (e!.at > m ? e!.at : m), "");
    const L = Ledger.rebuild(ectx.ctx, learner, events.filter((e) => e.at <= at) as LedgerEvent[]);
    return engineClaim(ectx, check.competency, essayView(ectx, L.composite, check.competency, at), events.filter((e) => e.at <= at), at).level !== "none";
  };
  for (const t of j.trees)
    for (const node of t.nodes) {
      node.level = engineClaim(ectx, node.competency, essayView(ectx, ledger.composite, node.competency, now), events, now).level;
      // the node's first check decides its conditional steps (policy @3), as of when it was answered (policy @4): a later
      // failure never turns a step the check made unnecessary back into an assigned one (a review is recorded instead)
      const firstCheck = node.steps.find((x) => x.kind === "independent_check");
      const shownByCheck = firstCheck && node.steps.some((x) => x.condition) ? shownWhenAnswered(firstCheck) : false;
      for (const s of node.steps) {
        if (s.status === "blocked") continue;
        if (s.condition === "if_not_shown" && shownByCheck) {
          // the check showed the skill: the step stays assigned (it can still be opened) but is not needed
          const started = s.kind === "teach" ? after.some((e) => e.kind === "intervention" && e.capability === node.competency) : s.content.refs.some((r) => after.some((e) => (e.kind === "evidence" || e.kind === "assisted_response") && e.item.id === r));
          if (!started) {
            s.status = "skipped";
            continue;
          }
        }
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
  // the separate claims (journey completed, shown, verified, retention), from the same ledger
  for (const t of j.trees) for (const node of t.nodes) node.outcome = competencyOutcome(ectx, events, node.competency, now, j, ledger);
  const targets = j.trees.flatMap((t) => t.nodes.filter((n) => n.role === "target"));
  const finished = j.trees.every((t) => t.nodes.every((n) => n.steps.every((s) => s.status !== "pending")));
  // progress through the assigned sequence: step statuses only, never the engine (kept apart from proficiency)
  const all = j.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps));
  const doneish = (s: JourneyStep) => s.status === "done" || s.status === "green";
  const lessons = all.filter((s) => s.kind === "teach");
  j.progress = {
    stepsTotal: all.length,
    stepsDone: all.filter(doneish).length,
    stepsSkipped: all.filter((s) => s.status === "skipped").length,
    stepsBlocked: all.filter((s) => s.status === "blocked").length,
    lessonsAssigned: lessons.length,
    lessonsCompleted: lessons.filter(doneish).length,
    percent: all.length ? Math.round((100 * all.filter(doneish).length) / all.length) : 100,
  };
  j.reviews = reviewsFor(ectx, events, j, ledger, now);
  j.complete = targets.length === 0 || targets.every((n) => n.green);
  j.finalRewrite = finished
    ? { available: true, reason: j.complete ? "Every skill in the journey is shown: time for the 50-word rewrite." : "All steps are done. Some skills are not yet shown without help; the rewrite can still go ahead." }
    : { available: false, reason: "After the journey's steps (lessons, practice and checks)." };
  return j;
}

/**
 * The outcome of every target competency any journey has worked on, each from the latest journey that holds it
 * (policy @3). A later journey that leaves out a skill shown since (A2) must not drop that skill's later and delayed
 * checks: they keep their schedule. Latest journey first, then earlier ones.
 */
export function journeyOutcomes(ectx: EssayContext, events: readonly LedgerEvent[], now: string): CompetencyOutcome[] {
  const out: CompetencyOutcome[] = [];
  const seen = new Set<CapabilityId>();
  for (const rec of essayRecords(events, "journey").reverse()) {
    const caps = rec.record.journey.trees.flatMap((t) => t.nodes.filter((n) => n.role === "target").map((n) => n.competency)).filter((c) => !seen.has(c));
    if (!caps.length) continue;
    const st = journeyStatus(ectx, events, rec.record.journey.id, now);
    for (const c of caps) {
      const o = st.trees.flatMap((t) => t.nodes).find((n) => n.competency === c)?.outcome;
      if (o) out.push(o);
      seen.add(c);
    }
  }
  return out;
}

/**
 * Review requirements after a failed delayed check (policy @4), as steps in the learner's existing journey: for this
 * journey's skills, and on the latest journey for every skill (so a review never waits for another essay). Statuses
 * come from the ledger like the journey's own steps; the journey's `trees` and `progress` are untouched.
 */
function reviewsFor(ectx: EssayContext, events: readonly LedgerEvent[], j: LearningJourney, ledger: Ledger, now: string): JourneyReview[] {
  const latest = essayRecords(events, "journey").at(-1)?.record.journey.id === j.id;
  const mine = new Set(j.trees.flatMap((t) => t.nodes.map((n) => n.competency)));
  const out: JourneyReview[] = [];
  for (const c of plannedChecks(events)) {
    if (!c.review || !(latest || mine.has(c.competency))) continue;
    if (c.at > now) continue;
    const after = events.filter((e) => e.at >= c.at);
    const pr = checkProgress(ectx, events, c, ledger);
    const name = ectx.profile.byCapability.get(c.competency)?.name ?? c.competency;
    const taught = after.filter((e): e is InterventionEvent => e.kind === "intervention" && e.capability === c.competency);
    const answered = (refs: string[]) => after.filter((e) => (e.kind === "evidence" || e.kind === "assisted_response") && refs.includes(e.item.id));
    const practised = answered(c.review.practice);
    const base = (k: JourneyStepKind, n: number): Pick<JourneyStep, "id" | "competency" | "kind" | "order"> => ({ id: `${c.id}:r${n}`, competency: c.competency, kind: k, order: n });
    const steps: JourneyStep[] = [
      { ...base("teach", 1), content: { available: c.review.lessons.length > 0, refs: c.review.lessons, note: c.review.lessons.length ? `${c.review.lessons.length} lesson part${c.review.lessons.length === 1 ? "" : "s"}` : `No lesson for ${name} yet` }, status: !c.review.lessons.length ? "blocked" : taught.length ? "done" : c.review.lessonNeeded === false ? "skipped" : "pending", evidence: taught.map((e) => e.id), reason: c.review.lessonNeeded === false ? "Review: some answers in the delayed check were right, so the lesson is available but not required." : "Review: the delayed check had no right answer, so the lesson comes first." },
      { ...base("guided_practice", 2), content: { available: c.review.practice.length > 0, refs: c.review.practice, note: c.review.practice.length ? `${c.review.practice.length} question${c.review.practice.length === 1 ? "" : "s"} with hints` : `No unseen practice questions for ${name}` }, status: !c.review.practice.length ? "blocked" : c.review.practice.every((r) => practised.some((e) => (e as { item: { id: string } }).item.id === r)) ? "done" : "pending", evidence: practised.map((e) => e.id), reason: "Practice with help available: never independent evidence." },
      { ...base("independent_check", 3), content: { available: c.items.length > 0, refs: c.items.map((i) => i.id), note: c.items.length ? `${c.items.length} unseen questions, no hints, from ${c.notBefore.slice(0, 10)} in a new sitting` : "Not enough unseen questions at the target band: more reviewed questions are needed" }, status: !c.items.length ? "blocked" : pr.complete ? "done" : "pending", evidence: pr.valid.map((v) => v.evidence), reason: "A check without help, at the grade target. It counts only as the engine decides." },
    ];
    out.push({ competency: c.competency, check: c.id, after: c.review.after, at: c.at, reason: c.reason, steps, complete: steps.every((x) => x.status !== "pending") });
  }
  return out;
}
