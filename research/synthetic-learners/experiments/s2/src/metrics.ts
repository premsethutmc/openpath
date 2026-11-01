/**
 * S2 metrics (synthetic-experiment-metrics@1), PRE-REGISTERED: every metric has an explicit numerator and denominator, defined here before the
 * final run. Ground truth is the synthetic learner's HIDDEN state (an assumption of the simulator, not a fact about real students).
 *
 *   weak(kind, t)   ability < 0.6, or a misconception of that kind with strength ≥ 0.3
 *   strong(kind, t) ability ≥ 0.9 and no misconception of that kind with strength ≥ 0.1
 *   competency kinds: two-step, both-sides, brackets, modelling (the families of MATH.algebra.linear-equations); one-step belongs to the
 *   prerequisite competency and is reported only where noted.
 */
import { MISCONCEPTION_KIND, type Misconception } from "../../../src/model";
import type { JourneyTrace } from "./journey";

export const METRICS_VERSION = "synthetic-experiment-metrics@1" as const;
export const COMP_KINDS = ["two-step", "both-sides", "brackets", "modelling"] as const;
const WEAK_ABILITY = 0.6, STRONG_ABILITY = 0.9, WEAK_MISC = 0.3, STRONG_MISC = 0.1;
type Hidden = { abilities: Record<string, number>; misconceptions: Record<string, number> };
const miscOfKind = (h: Hidden, k: string) => Math.max(0, ...Object.entries(h.misconceptions).filter(([m]) => MISCONCEPTION_KIND[m as Misconception] === k).map(([, v]) => v));
export const weak = (h: Hidden, k: string) => (h.abilities[k] ?? 0) < WEAK_ABILITY || miscOfKind(h, k) >= WEAK_MISC;
export const strong = (h: Hidden, k: string) => (h.abilities[k] ?? 0) >= STRONG_ABILITY && miscOfKind(h, k) < STRONG_MISC;
/** OpenPath explanation ids (hypotheses) → the simulator misconception they describe */
export const EXPLANATION_TO_SIM: Record<string, Misconception> = {
  "same-operation": "inverse-operation", "subtract-coefficient": "inverse-operation", "add-for-multiply": "inverse-operation",
  "forgot-divide": "forgot-divide", "added-not-subtracted": "added-not-subtracted", "divided-first": "divided-first",
  "x-sign-kept": "x-sign-kept", "number-sign-kept": "number-sign-kept", "only-one-side": "only-one-side",
  "first-term-only": "first-term-only", "bracket-sign": "bracket-sign",
};
const CLAIM = new Set(["independent", "transfer", "verified"]);
const E1_CLAIM = new Set(["independently-demonstrated"]);
const FAMILY_KIND: Record<string, string> = { ahone: "one-step", lin: "two-step", lboth: "both-sides", lbrk: "brackets", auleq: "modelling", aulwp: "modelling" };

export interface Ratio { n: number; d: number; rate: number | null }
const R = (n: number, d: number): Ratio => ({ n, d, rate: d ? Math.round((n / d) * 1000) / 1000 : null });
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000 : null);

export function metrics(ts: JourneyTrace[]) {
  const c = { idWeak: 0, weakOpp: 0, missWeak: 0, falseDiag: 0, identified: 0, estTotal: 0, estCorrect: 0, estOutside: 0, heldMisc: 0, heldMissed: 0, heldMiscCat: 0, heldMissedCat: 0, heldMiscUnrec: 0, heldMissedUnrec: 0,
    teach: 0, teachKinded: 0, teachApprop: 0, teachUnnec: 0, repeats: 0, repeatsIneffective: 0,
    claims: 0, falseClaims: 0, journeysClaim: 0, journeysFalseClaim: 0, shadowClaims: 0, falseShadow: 0, competentPairs: 0, missedShadow: 0, competentJourneys: 0, missedAuth: 0, leakClaims: 0,
    correctWithWorking: 0, correctInvalid: 0, incorrectWithWorking: 0, incorrectVerified: 0,
    cyclesDue: 0, cyclesDone: 0, cyclesFailed: 0, journeysIndependent: 0, journeysNoDue: 0, recAttempts: 0, recTargeted: 0, recoveries: 0, recLeak: 0, retAttempts: {} as Record<string, number>,
    shownNeverSampled: 0, shownPairs: 0, arrivedTooEarly: 0, scheduledArrivals: 0 };
  const gainTaught: number[] = [], gainUntaught: number[] = [], qToDiag: number[] = [], qPerShown: number[] = [], teachPer: number[] = [], attemptsPer: number[] = [];
  const outcomes: Record<string, number> = {}, ends: Record<string, number> = {};
  for (const t of ts) {
    ends[t.end] = (ends[t.end] ?? 0) + 1;
    const atts = t.visits.flatMap((v) => v.openpath.attempts), teach = t.visits.flatMap((v) => v.openpath.teaching);
    const est = t.visits.at(-1)?.openpath.established ?? [];
    // ---------------- diagnosis
    const identifiedKinds = new Set<string>([...teach.map((x) => x.kind).filter((k): k is string => !!k), ...est.map((h) => FAMILY_KIND[h.family]).filter(Boolean)]);
    for (const k of COMP_KINDS) {
      const opp = atts.some((a) => a.kind === k);
      if (weak(t.initialHidden, k) && opp) { c.weakOpp++; if (identifiedKinds.has(k)) c.idWeak++; else c.missWeak++; }
      if (identifiedKinds.has(k)) { c.identified++; if (strong(t.initialHidden, k)) c.falseDiag++; }
    }
    const seen = new Set<string>();
    for (const h of est) { if (seen.has(h.explanation)) continue; seen.add(h.explanation); c.estTotal++; const sim = EXPLANATION_TO_SIM[h.explanation]; if (!sim) { c.estOutside++; continue; } if ((t.initialHidden.misconceptions[sim] ?? 0) >= STRONG_MISC) c.estCorrect++; }
    const estSim = new Set(est.map((h) => EXPLANATION_TO_SIM[h.explanation]).filter(Boolean));
    for (const [m, v] of Object.entries(t.initialHidden.misconceptions)) {
      if (v < WEAK_MISC || m.startsWith("model-")) continue;
      const k = MISCONCEPTION_KIND[m as Misconception]; const opps = atts.filter((a) => a.kind === k || (k === "two-step" && (a.kind === "both-sides" || a.kind === "brackets")) || (k === "both-sides" && a.kind === "brackets")).length;
      if (opps < 2) continue;
      const catalogued = Object.values(EXPLANATION_TO_SIM).includes(m as Misconception);
      c.heldMisc++; if (catalogued) c.heldMiscCat++; else c.heldMiscUnrec++;
      if (!estSim.has(m as Misconception)) { c.heldMissed++; if (catalogued) c.heldMissedCat++; else c.heldMissedUnrec++; }
    }
    // ---------------- teaching
    c.teach += teach.length;
    const delivered = new Map<string, string[]>();
    teach.forEach((x, i) => {
      const ins = t.instruction[i];
      if (x.kind && ins) { c.teachKinded++; const before = { abilities: ins.abilitiesBefore, misconceptions: ins.misconceptionsBefore }; if (weak(before, x.kind)) c.teachApprop++; if (strong(before, x.kind)) c.teachUnnec++; }
      const prev = delivered.get(x.strategy);
      if (prev) { c.repeats++; if (prev.includes("none")) c.repeatsIneffective++; }
      delivered.set(x.strategy, [...(prev ?? []), ins?.outcome ?? "?"]);
      if (ins) outcomes[ins.outcome] = (outcomes[ins.outcome] ?? 0) + 1;
    });
    const taughtKinds = new Set(teach.map((x) => x.kind).filter(Boolean) as string[]);
    for (const k of COMP_KINDS) (taughtKinds.has(k) ? gainTaught : gainUntaught).push((t.finalHidden.abilities[k] ?? 0) - (t.initialHidden.abilities[k] ?? 0));
    // ---------------- mastery
    let anyClaim = false, anyFalse = false;
    for (const v of t.visits) {
      const ev = v.openpath.evidence;
      if (CLAIM.has(ev.status) || ev.verified) { c.claims++; anyClaim = true; if (COMP_KINDS.some((k) => weak(v.hiddenAfter, k))) { c.falseClaims++; anyFalse = true; } if (v.openpath.e1.discrepancy?.length) c.leakClaims++; }
      for (const k of COMP_KINDS) if (E1_CLAIM.has(v.openpath.e1.subSkills[k])) { c.shadowClaims++; if (weak(v.hiddenAfter, k)) c.falseShadow++; }
    }
    if (anyClaim) { c.journeysClaim++; if (anyFalse) c.journeysFalseClaim++; }
    const last = t.visits.at(-1)!;
    const indep = (k: string) => atts.filter((a) => a.kind === k && a.hints === 0 && a.activity !== "guided").length;
    for (const k of COMP_KINDS) if (strong(t.finalHidden, k) && indep(k) >= 4) { c.competentPairs++; if (!["independently-demonstrated", "retention-due"].includes(last.openpath.e1.subSkills[k])) c.missedShadow++; }
    if (COMP_KINDS.every((k) => strong(t.finalHidden, k)) && atts.filter((a) => a.hints === 0 && a.activity !== "guided").length >= 4) { c.competentJourneys++; if (!CLAIM.has(last.openpath.evidence.status)) c.missedAuth++; }
    for (const a of atts) {
      if (!a.working?.length || !a.workingStatus || a.workingStatus === "none") continue;
      if (a.verdict === "correct") { c.correctWithWorking++; if (a.workingStatus === "invalid") c.correctInvalid++; }
      if (a.verdict === "incorrect") { c.incorrectWithWorking++; if (a.workingStatus === "verified") c.incorrectVerified++; }
    }
    // ---------------- retention
    const end = Date.parse(t.visits.at(-1)!.at);
    const hist = (last.openpath.evidence.history as { due: string; result: string; failedAt: string | null; recoveredAt: string | null }[]) ?? [];
    if (t.visits.some((v) => CLAIM.has(v.openpath.evidence.status))) { c.journeysIndependent++; if (!t.visits.some((v) => v.openpath.evidence.retentionDueAt)) c.journeysNoDue++; }
    for (const h of hist) { if (Date.parse(h.due) > end) continue; c.cyclesDue++; if (h.result === "passed" || h.result === "failed") c.cyclesDone++; if (h.result === "failed") c.cyclesFailed++; }
    for (const a of atts.filter((x) => x.activity === "retention")) c.retAttempts[a.kind ?? "?"] = (c.retAttempts[a.kind ?? "?"] ?? 0) + 1;
    for (const h of hist.filter((x) => x.result === "failed" && x.failedAt)) {
      const failed = atts.find((a) => a.activity === "retention" && a.at === h.failedAt);
      const until = h.recoveredAt ? Date.parse(h.recoveredAt) : Infinity;
      const rec = atts.filter((a) => a.activity !== "retention" && a.hints === 0 && a.activity !== "guided" && Date.parse(a.at) > Date.parse(h.failedAt!) && Date.parse(a.at) <= until && a.competency === "MATH.algebra.linear-equations");
      c.recAttempts += rec.length; c.recTargeted += rec.filter((a) => a.kind === failed?.kind).length;
      if (h.recoveredAt) { c.recoveries++; const right = rec.filter((a) => a.verdict === "correct"); if (!right.some((a) => a.kind === failed?.kind)) c.recLeak++; }
    }
    const sampled = new Set(atts.filter((a) => a.activity === "retention").map((a) => a.kind));
    for (const k of COMP_KINDS) if (t.visits.some((v) => v.openpath.e1.subSkills[k] === "independently-demonstrated" || v.openpath.e1.subSkills[k] === "retention-due")) { c.shownPairs++; if (!sampled.has(k)) c.shownNeverSampled++; }
    for (let i = 1; i < t.visits.length; i++) if (t.visits[i].factBefore.label === "scheduled") { c.scheduledArrivals++; if (!t.visits[i].openpath.attempts.some((a) => a.activity === "retention")) c.arrivedTooEarly++; }
    // ---------------- efficiency
    const firstTeachVisit = t.visits.findIndex((v) => v.openpath.teaching.length || v.openpath.established.length);
    if (firstTeachVisit >= 0) qToDiag.push(t.visits.slice(0, firstTeachVisit).reduce((n, v) => n + v.openpath.attempts.length, 0) + (() => { const v = t.visits[firstTeachVisit]; const firstT = v.openpath.phases.indexOf("chapter"); return firstT < 0 ? v.openpath.attempts.length : v.openpath.attempts.length; })());
    const shown = COMP_KINDS.filter((k) => last.openpath.e1.subSkills[k] === "independently-demonstrated" || last.openpath.e1.subSkills[k] === "retention-due").length;
    if (shown) qPerShown.push(Math.round((atts.length / shown) * 10) / 10);
    teachPer.push(teach.length); attemptsPer.push(atts.length);
  }
  return {
    metrics: METRICS_VERSION, journeys: ts.length, ends,
    diagnosis: { correctlyIdentifiedWeak: R(c.idWeak, c.weakOpp), missedWeak: R(c.missWeak, c.weakOpp), falseDiagnosis: R(c.falseDiag, c.identified), misconceptionClassificationAccuracy: R(c.estCorrect, c.estTotal - c.estOutside), establishedOutsideSimulatorModel: R(c.estOutside, c.estTotal), missedMisconceptions: R(c.heldMissed, c.heldMisc), missedCatalogued: R(c.heldMissedCat, c.heldMiscCat), missedUnrecognised: R(c.heldMissedUnrec, c.heldMiscUnrec) },
    teaching: { appropriate: R(c.teachApprop, c.teachKinded), unnecessary: R(c.teachUnnec, c.teachKinded), repeatedIneffective: R(c.repeatsIneffective, c.repeats), instructionOutcomes: outcomes, meanGainTaughtKinds: mean(gainTaught), meanGainUntaughtKinds: mean(gainUntaught), pairsTaught: gainTaught.length, pairsUntaught: gainUntaught.length },
    mastery: { falseAuthoritativeClaims: R(c.falseClaims, c.claims), journeysWithFalseAuthoritativeClaim: R(c.journeysFalseClaim, c.journeysClaim), falseShadowClaims: R(c.falseShadow, c.shadowClaims), missedCompetenceShadow: R(c.missedShadow, c.competentPairs), missedCompetenceAuthoritative: R(c.missedAuth, c.competentJourneys), crossFamilyLeakage: R(c.leakClaims, c.claims), correctAnswerInvalidMethod: R(c.correctInvalid, c.correctWithWorking), incorrectAnswerVerifiedWorking: R(c.incorrectVerified, c.incorrectWithWorking) },
    retention: { checksCompleted: R(c.cyclesDone, c.cyclesDue), checksFailed: R(c.cyclesFailed, c.cyclesDone), shownButNoDueDate: R(c.journeysNoDue, c.journeysIndependent), recoveryTargeting: R(c.recTargeted, c.recAttempts), crossFamilyRecovery: R(c.recLeak, c.recoveries), shownSubSkillNeverSampled: R(c.shownNeverSampled, c.shownPairs), arrivedOnShownDateButCheckNotYetDue: R(c.arrivedTooEarly, c.scheduledArrivals), retentionQuestionsByKind: c.retAttempts },
    efficiency: { medianQuestionsToFirstDiagnosis: median(qToDiag), medianQuestionsPerShownSubSkill: median(qPerShown), meanTeachingPerLearner: mean(teachPer), medianAttemptsPerJourney: median(attemptsPer), boundedJourneys: R(ts.filter((t) => t.bounded).length, ts.length) },
  };
}
