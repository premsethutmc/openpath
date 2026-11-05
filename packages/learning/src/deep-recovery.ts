/**
 * deep-recovery@0 (RESEARCH PROTOTYPE, opt-in, not wired into the app): diagnosis-and-return without a fixed depth.
 *
 * The shipped recovery (intervention.ts `recovery`) lists supports to RECOVERY_DEPTH = 2 and hands the first unshown one to its
 * module; inside a recovery a support module never opens a recovery of its own (moduleState only does so when it is given the
 * learner's whole evidence). A gap three or more relations below the problem is therefore never assessed.
 *
 * This module replaces the fixed depth with an evidence-driven descent over the same typed graph (graph.supportsOf, plus the
 * skills the failed question's own solution steps use):
 *
 *   1. slip check   a wrong first try is followed by ONE fresh question of the same family. Right: probably a slip; no detour.
 *   2. descend      at the current skill N, the candidates (question-used skills first, then followed relations) are checked in
 *                   order. A candidate already shown, or right in this recovery, is skipped without a question. One wrong answer
 *                   is "unsure" (one more question); two wrong in a row since the last teaching is "failing": descend into it.
 *   3. root         a failing skill whose candidates are all known is the most likely missing piece: its own module teaches it
 *                   (explanation -> guided -> independent check, the existing gate decides the explanation).
 *   4. climb        once it is right on its own, the skill above it is re-checked with a FRESH question (its earlier wrong answers
 *                   predate the teaching and are stale), and so on up to the problem's own skill.
 *   5. return       a fresh question of the original family (never the same one again).
 *
 * Cycle protection: a candidate already on the current path is never followed, a skill is assessed from its records only once
 * whatever path reaches it (shared prerequisites in the DAG), and a question budget bounds the whole recovery.
 * Saved state: the only state is the learner's records. Every question this recovery asks carries the context
 * `deep:<original>|<path>`; the path is read back from the latest such attempt, so a rebuilt session (new day, new device)
 * resumes at the same place. Uncertainty: every outcome carries a confidence and the answers it rests on, and the learner-facing
 * reason says "most likely" rather than "the cause" unless the evidence is direct.
 * Missing content: a root skill with no module, or no explanation that passes the teaching-eligibility gate, stops as
 * "blocked" and names the gap as a content gap. Nothing here authors, approves or regenerates content.
 */
import { moduleFor, question, type Module } from "./content";
import { DAY, independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";
import { exposureKey, phasePool, problemOf } from "./families";
import { graph } from "./graph";
import { establishedIds, fromPool, moduleState, teachable, type ModuleState } from "./intervention";
import type { Attempt, LearnerRecords } from "./records";

export const DEEP_RECOVERY_POLICY = "deep-recovery@0" as const;
export interface DeepRecoveryOptions {
  /** total questions this recovery may ask itself (probes and returns; module teaching is the module's own) */
  budget?: number;
  /** questions on one skill before its verdict is taken as it stands */
  perSkill?: number;
  /** test seam: replaces the graph's followed relations (e.g. to inject a cycle) */
  supportsOf?: (id: string) => string[];
}
export type Verdict = "known" | "unknown" | "unsure" | "failing";
export interface SkillReading { skill: string; verdict: Verdict; right: number; wrong: number; shownBefore: boolean }
export interface DeepRecoveryState {
  policy: typeof DEEP_RECOVERY_POLICY;
  original: string;
  phase: "attempt" | "slip-check" | "probe" | "teach" | "return" | "solved" | "solved_after_help" | "blocked" | "escalate";
  /** the diagnosis path from the problem's skill down to the skill being worked on */
  path: string[];
  /** the skill being probed or taught */
  active: string | null;
  /** the question to ask now (probe, slip check, return) */
  question: string | null;
  /** context to record with the answer: carries the path (saved state) */
  context: string | null;
  confidence: "direct" | "likely" | "unsure" | null;
  readings: SkillReading[];
  /** skills that could not be checked (no module, or no unseen question) */
  unchecked: string[];
  blocked?: { skill: string; why: string };
  /** for phase "teach": the module's own next step */
  module?: ModuleState;
  asked: number;
  reason: string;
}

const SHOWN = ["independent", "transfer", "verified"];
const target = (id: string) => graph.evidenceTarget(id);
const skillOfQ = (qid: string): string | null => { try { return target(question(qid).competency); } catch { return null; } };
const tag = (orig: string) => `deep:${orig}|`;
const nameOf = (id: string) => (graph.byId.has(id) ? graph.get(id).name : id);
const familyKey = (qid: string) => problemOf(qid.replace(/:(mc|w)$/, ""))?.family ?? null;

/** candidates for skill N: skills the failed question's own steps use (closest evidence), then the followed graph relations */
function candidates(n: string, lastWrongQ: string | null, o: DeepRecoveryOptions): string[] {
  const used = lastWrongQ ? (problemOf(lastWrongQ.replace(/:(mc|w)$/, ""))?.steps ?? []).map((s) => String(s.competency ?? "")).filter((id) => graph.byId.has(id)).map(target) : [];
  const rel = (o.supportsOf ?? graph.supportsOf)(n).map((id) => (graph.byId.has(id) ? target(id) : id));
  return [...new Set([...used, ...rel])].filter((id) => id !== n);
}

export function deepRecovery(originalQid: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string, o: DeepRecoveryOptions = {}): DeepRecoveryState {
  const budget = o.budget ?? 24, perSkill = o.perSkill ?? 2;
  const own = skillOfQ(originalQid)!;
  const firsts = records.attempts.filter((a) => a.questionId === originalQid);
  const base = { policy: DEEP_RECOVERY_POLICY, original: originalQid, active: null, question: null, context: null, confidence: null, readings: [] as SkillReading[], unchecked: [] as string[], asked: 0 } as const;
  if (!firsts.length) return { ...base, phase: "attempt", path: [own], question: originalQid, context: `${tag(originalQid)}${own}`, reason: "Try the problem." };
  if (rightAnswer(firsts[0])) return { ...base, phase: "solved", path: [own], confidence: "direct", reason: "Solved on your own." };
  const t0 = firsts[0].at;
  const mine = records.attempts.filter((a) => a.at > t0 && a.context?.startsWith(tag(originalQid)));
  const asked = mine.length;
  // saved state: the path the latest question of this recovery was asked on
  const last = mine.at(-1);
  let path = last ? last.context!.slice(tag(originalQid).length).split(">").filter(Boolean) : [own];
  const seen = new Set(records.attempts.map((a) => exposureKey(a.questionId)));
  const teachTimes = records.teaching.filter((t) => t.at > t0).map((t) => t.at);
  const lastTeach = teachTimes.length ? teachTimes.reduce((a, b) => (a > b ? a : b)) : t0;
  const inWindow = (a: Attempt) => a.at >= t0 && independentAttempt(a);
  const memo = new Map<string, SkillReading>();
  const reading = (c: string): SkillReading => {
    const hit = memo.get(c);
    if (hit) return hit;
    const ans = records.attempts.filter((a) => inWindow(a) && skillOfQ(a.questionId) === c);
    const right = ans.filter(rightAnswer).length, wrong = ans.length - right;
    const shownBefore = SHOWN.includes(evidence(c).status) && !ans.some((a) => !rightAnswer(a) && a.at > lastTeach);
    // wrong answers older than the latest teaching in this recovery are stale: what they rested on may have been fixed since
    const post = ans.filter((a) => a.at > lastTeach || (lastTeach === t0 && a.at >= t0));
    let verdict: Verdict;
    if (post.length) {
      let trailing = 0;
      for (let i = post.length - 1; i >= 0 && !rightAnswer(post[i]); i--) trailing++;
      // a lone wrong answer after right ones (or the per-skill cap reached) is taken as it stands only once the cap is used
      verdict = trailing === 0 ? "known" : trailing >= 2 || post.length > perSkill ? "failing" : "unsure";
    } else verdict = ans.length ? (rightAnswer(ans[ans.length - 1]) ? "known" : "unknown") : shownBefore ? "known" : "unknown";
    const r = { skill: c, verdict, right, wrong, shownBefore };
    memo.set(c, r);
    return r;
  };
  const out = (s: Omit<DeepRecoveryState, "policy" | "original" | "readings" | "unchecked" | "asked">): DeepRecoveryState => ({ ...s, policy: DEEP_RECOVERY_POLICY, original: originalQid, readings: [...memo.values()], unchecked: [...unchecked], asked });
  const unchecked = new Set<string>();
  const ctx = (p: string[]) => `${tag(originalQid)}${p.join(">")}`;
  const lastWrongOn = (c: string) => records.attempts.filter((a) => inWindow(a) && !rightAnswer(a) && skillOfQ(a.questionId) === c).at(-1)?.questionId ?? null;
  const freshOn = (c: string): string | null => {
    const m = moduleFor(c);
    if (!m) return null;
    const pick = [...m.diagnostics, ...m.practice, ...m.transfer].find((id) => !seen.has(exposureKey(id)));
    return pick ?? fromPool(m, "check", records) ?? fromPool(m, "practice", records);
  };
  const freshOriginal = (): string | null => {
    const fam = familyKey(originalQid);
    if (fam) for (const ph of ["check", "practice", "transfer", "diagnostic"] as const) {
      const id = phasePool(fam, ph).find((x) => !seen.has(exposureKey(x)));
      if (id) return id;
    }
    const m = moduleFor(own);
    return m ? fromPool(m, "check", records) : null;
  };
  const teachableSkill = (c: string): { ok: boolean; why: string; m: Module | null } => {
    const m = moduleFor(c);
    if (!m) return { ok: false, why: "there is no module for it", m: null };
    if (!m.strategies.some((s) => teachable(m, s, establishedIds(c, records)))) return { ok: false, why: "none of its explanations has passed the teaching checks and content review", m };
    return { ok: true, why: "", m };
  };
  const evidenceLine = (r: SkillReading) => `${r.right} right and ${r.wrong} wrong on it in this recovery`;
  const overBudget = () => asked >= budget;

  // the climb/descent: evaluate from the deepest skill on the saved path upward
  for (let guard = 0; guard < 64; guard++) {
    const n = path[path.length - 1];
    const rn = reading(n);
    const atTop = path.length === 1;
    // 1. the problem's own skill: slip check, solved, or descend
    if (atTop && (rn.verdict === "known")) {
      const helped = teachTimes.length > 0;
      return out({ phase: helped ? "solved_after_help" : "solved", path, active: null, question: null, context: null, confidence: "direct", reason: helped ? "Right on a fresh question after the work on what it builds on. That counts as help, not as work on your own the first time." : "The next question like it was right, so the first answer was most likely a slip. No extra work needed." });
    }
    if (atTop && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
      if (overBudget()) return out({ phase: "escalate", path, active: null, question: null, context: null, confidence: "unsure", reason: "OpenPath has asked as many questions as it should in one go without pinning this down. Go through it with a teacher or parent." });
      const q = freshOriginal();
      if (!q) return out({ phase: "escalate", path, active: null, question: null, context: null, confidence: "unsure", reason: "There is no fresh question of this kind left to try. Go through it with a teacher or parent." });
      return out({ phase: teachTimes.length ? "return" : "slip-check", path, active: own, question: q, context: ctx(path), confidence: null, reason: teachTimes.length ? "Back to a fresh problem of the same kind." : "One more like it, to see whether that was a slip." });
    }
    // 2. a skill below the top that is right again (after teaching or on a fresh check): climb
    if (!atTop && rn.verdict === "known") { path = path.slice(0, -1); continue; }
    if (!atTop && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
      const q = freshOn(n);
      if (!q || overBudget()) return out({ phase: "escalate", path, active: n, question: null, context: null, confidence: "unsure", reason: `OpenPath cannot check ${nameOf(n)} again here (${!q ? "no fresh question left" : "question budget used"}). Go through it with a teacher or parent.` });
      return out({ phase: "probe", path, active: n, question: q, context: ctx(path), confidence: null, reason: `A fresh question on ${nameOf(n)}, to see where things stand now.` });
    }
    // 3. N is failing: check what it builds on, in order
    let descended = false;
    for (const c of candidates(n, lastWrongOn(n), o)) {
      if (path.includes(c)) continue; // cycle protection
      if (!graph.byId.has(c) || !moduleFor(c)) { unchecked.add(c); continue; }
      const rc = reading(c);
      if (rc.verdict === "known") continue;
      if (rc.verdict === "failing") { path = [...path, c]; descended = true; break; }
      const q = freshOn(c);
      if (!q) { unchecked.add(c); continue; }
      if (overBudget()) return out({ phase: "escalate", path, active: c, question: null, context: null, confidence: "unsure", reason: `OpenPath has asked as many questions as it should in one go. So far: ${nameOf(n)} is not secure yet; what it builds on is only partly checked. Go through it with a teacher or parent.` });
      return out({ phase: "probe", path, active: c, question: q, context: ctx(path), confidence: null, reason: rc.verdict === "unsure" ? `One more question on ${nameOf(c)}: one answer is not enough to tell a slip from a gap.` : `${nameOf(n)} builds on ${nameOf(c)}. A quick question on it first.` });
    }
    if (descended) continue;
    // 4. nothing below N is missing (as far as could be checked): N itself is the most likely gap
    const t = teachableSkill(n);
    const conf: DeepRecoveryState["confidence"] = unchecked.size ? "unsure" : "likely";
    const hedge = unchecked.size ? ` Some skills it builds on could not be checked here (${[...unchecked].map(nameOf).join(", ")}), so this is a best guess.` : " This is the most likely missing piece from the answers so far, not a certainty.";
    if (!t.ok) return out({ phase: "blocked", path, active: n, question: null, context: null, confidence: conf, blocked: { skill: n, why: t.why }, reason: `The answers point to ${nameOf(n)} (${evidenceLine(rn)}). OpenPath cannot teach it yet: ${t.why}. That is a gap in OpenPath's content, not in you. Go through ${nameOf(n)} with a teacher or parent, then come back to the problem.${unchecked.size ? hedge : ""}` });
    const ms0 = moduleState(n, records, evidence(n), now, session, null);
    if (ms0.phase === "done") {
      // the module considers it shown: confirm with a fresh question in this recovery rather than assume
      const q = freshOn(n);
      if (q && !overBudget()) return out({ phase: "probe", path, active: n, question: q, context: ctx(path), confidence: null, reason: `A fresh question on ${nameOf(n)}, to see where things stand now.` });
    }
    if (ms0.phase === "pause" || ms0.phase === "reentry" || (ms0.phase !== "chapter" && !ms0.question))
      return out({ phase: "escalate", path, active: n, question: null, context: null, confidence: conf, module: ms0, reason: `${nameOf(n)} looks like the missing piece, and the explanations OpenPath has for it have not clicked yet. Go through it with a teacher or parent.` });
    return out({ phase: "teach", path, active: n, question: null, context: null, confidence: conf, module: ms0, reason: `${nameOf(n)}: ${evidenceLine(rn)}, and what it builds on was right.${hedge} We work on it now, then come back up to the problem.` });
  }
  return out({ phase: "escalate", path, active: null, question: null, context: null, confidence: "unsure", reason: "Recovery could not settle on a next step. Go through it with a teacher or parent." });
}

/** days since the original first try (for a resume note) */
export const deepRecoveryAge = (records: LearnerRecords, originalQid: string, now: number) => {
  const a = records.attempts.find((x) => x.questionId === originalQid);
  return a ? Math.floor((now - Date.parse(a.at)) / DAY) : null;
};
