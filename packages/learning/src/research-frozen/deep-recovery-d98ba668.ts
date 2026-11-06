// FROZEN COPY of packages/learning/src/deep-recovery.ts at d98ba668 (phase-2 prototype), imports re-pointed and (phase 7) one type-only cast on PHASES for the typecheck (same run-time values). For paired comparison in the phase-3 simulation; logic never edited.
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
 *   1. slip check   a wrong first try is followed by ONE fresh question that tests the same skill. Right: probably a slip.
 *   2. descend      at the current skill N, the candidates (question-used skills first, then followed relations) are checked in
 *                   order. A candidate shown before this recovery began, or right in it, is skipped without a question. One wrong
 *                   answer is "unsure" (one more question); two wrong in a row since this recovery's last lesson is "failing".
 *   3. root         a failing skill whose candidates are all known is the most likely missing piece: its own module teaches it
 *                   (explanation -> guided -> independent check, the existing gate decides the explanation).
 *   4. climb        once it is right on its own, the skill above it is re-checked with a FRESH question, and so on upward.
 *   5. return       a fresh question that tests the original skill (never the same problem again, never a different skill).
 *
 * Episode (risk tests R1-R6): every question this recovery asks, including the module's questions while it teaches, carries the
 * context `deep:<original>|<path>@<skill>`. Only those answers are evidence for its decisions; a skill's standing before the
 * recovery began comes from the records before its first wrong try. A lesson counts as this recovery's (for staleness and for
 * "help") only when the answer just before it, in the same session, is this recovery's and the lesson's skill is on its path or
 * the skill it was asking about. Teaching records carry no episode context, so this is attribution by adjacency (see report).
 *
 * The original skill: a question tests it when the existing mapping says so: the competency's sub-skill mapping
 * (skill-connections), else the module's scoped skill unit (skill-units), else the same generator family. A fixed item with none
 * of these has no fresh equivalent: recovery stops and says so rather than substitute another question.
 * Independence: evidence.independentAttempt (no hint, no shown solution, not guided, first try). Freshness: families.problemKeyOf
 * against everything presented or answered (skill-units.presentedProblems).
 * Guessing: a right answer chosen from options is weak evidence: "known" or "solved" needs a typed right answer or two rights in a
 * row; open-response questions are preferred when choosing. (Simulation finding on the tuning seeds: 8/10 false reassurance.)
 * Effort: the budget counts every question of the episode (probes, returns and the module's own) and every lesson.
 * Cycle protection: a candidate already on the path is never followed; skills are read from records once (shared prerequisites).
 * Missing content: a root skill with no module, or no explanation that passes the teaching-eligibility gate, stops as "blocked".
 * Nothing here authors, approves or regenerates content.
 */
import { moduleFor, question, type Module } from "../content";
import { DAY, evidenceFor, independentAttempt, rightAnswer, type SkillEvidence } from "../evidence";
import { phasePool, problemKeyOf, problemOf, type Phase } from "../families";
import { graph } from "../graph";
import { establishedIds, moduleState, teachable, type ModuleState } from "../intervention";
import { modulePhasePool } from "../library";
import type { Attempt, LearnerRecords } from "../records";
import { connectedSkill, connectionConfig, validSkillTask } from "../skill-connections";
import { presentedProblems, unitOfQuestion } from "../skill-units";

export const DEEP_RECOVERY_POLICY = "deep-recovery@0" as const;
export interface DeepRecoveryOptions {
  /** effort limit for the episode: questions (probes, returns, the module's own) plus lessons */
  budget?: number;
  /** questions on one skill since the last lesson before its verdict is taken as it stands */
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
  /** context to record with every answer of this step, the module's too: carries the path (saved state) */
  context: string | null;
  confidence: "direct" | "likely" | "unsure" | null;
  readings: SkillReading[];
  /** skills that could not be checked (no module, or no fresh question) */
  unchecked: string[];
  blocked?: { skill: string; why: string };
  /** for phase "teach": the module's own next step */
  module?: ModuleState;
  /** how the original skill is matched: "sub-skill:<id>", "unit:<key>", "family:<f>" or null (no fresh equivalent exists) */
  originalScope: string | null;
  /** effort used: questions and lessons of this episode */
  effort: number;
  reason: string;
}

const SHOWN = ["independent", "transfer", "verified"];
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const target = (id: string) => graph.evidenceTarget(id);
const skillOfQ = (qid: string): string | null => { try { return target(question(qid).competency); } catch { return null; } };
const tag = (orig: string) => `deep:${orig}|`;
const nameOf = (id: string) => (graph.byId.has(id) ? graph.get(id).name : id);
const familyOf = (qid: string) => (qid.startsWith("gen:") ? problemOf(base(qid))?.family ?? null : null);
/** a question answered by choosing among options (the ":mc" format, or a choice item) */
const isChoice = (qid: string) => { if (qid.endsWith(":mc")) return true; try { return !!question(qid).options?.length; } catch { return false; } };
const openFirst = (ids: string[]) => ids.find((id) => !isChoice(id)) ?? ids[0] ?? null;
// "transfer" is not a pool Phase (families.ts); its pool is empty at run time. Cast kept so the scan order is byte-for-byte unchanged.
const PHASES = ["diagnostic", "practice", "check", "transfer", "retention"] as Phase[];

/** How a question is judged to test the same skill as the original, from the existing mappings only. */
export function originalMatcher(originalQid: string): { scope: string | null; accepts: (qid: string) => boolean } {
  const own = skillOfQ(originalQid)!;
  const same = (q: string) => skillOfQ(q) === own;
  const cfg = connectionConfig(own);
  const sub = cfg && originalQid.startsWith("gen:") ? connectedSkill(cfg, base(originalQid)) : null;
  if (cfg && sub) return { scope: `sub-skill:${sub}`, accepts: (q) => same(q) && q.startsWith("gen:") && validSkillTask(cfg, sub, base(q)) };
  const m = moduleFor(own);
  const unit = m ? unitOfQuestion(m, originalQid) : null;
  if (unit) return { scope: `unit:${unit.key}`, accepts: (q) => same(q) && unit.accepts(q) };
  const fam = familyOf(originalQid);
  if (fam) return { scope: `family:${fam}`, accepts: (q) => same(q) && familyOf(q) === fam };
  return { scope: null, accepts: () => false };
}

export function deepRecovery(originalQid: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string, o: DeepRecoveryOptions = {}): DeepRecoveryState {
  const budget = o.budget ?? 40, perSkill = o.perSkill ?? 2;
  const own = skillOfQ(originalQid)!;
  const match = originalMatcher(originalQid);
  const firsts = records.attempts.filter((a) => a.questionId === originalQid);
  const unchecked = new Set<string>();
  const memo = new Map<string, SkillReading>();
  let effort = 0;
  const out = (s: Omit<DeepRecoveryState, "policy" | "original" | "readings" | "unchecked" | "originalScope" | "effort">): DeepRecoveryState =>
    ({ ...s, policy: DEEP_RECOVERY_POLICY, original: originalQid, readings: [...memo.values()], unchecked: [...unchecked], originalScope: match.scope, effort });
  const plain = { active: null, question: null, context: null, confidence: null } as const;
  if (!firsts.length) return out({ ...plain, phase: "attempt", path: [own], active: own, question: originalQid, context: `${tag(originalQid)}${own}@${own}`, reason: "Try the problem." });
  const first = firsts[0];
  // a right first try is "solved on your own" only when it was unaided and typed (a pick from options may be a lucky guess)
  if (rightAnswer(first) && independentAttempt(first) && !isChoice(first.questionId)) return out({ ...plain, phase: "solved", path: [own], confidence: "direct", reason: "Solved on your own." });
  const t0 = first.at;

  // ---- the episode: this recovery's own answers and lessons
  const parse = (c: string) => { const [p, at] = c.slice(tag(originalQid).length).split("@"); return { path: p.split(">").filter(Boolean), skill: at ?? null }; };
  const isMine = (a: Attempt) => a.at >= t0 && (a === first || !!a.context?.startsWith(tag(originalQid)));
  const mine = records.attempts.filter(isMine);
  const ordered = [...records.attempts].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const myTeaching = records.teaching.filter((t) => {
    if (t.at <= t0) return false;
    const prev = ordered.filter((a) => a.at <= t.at).at(-1);
    if (!prev || !isMine(prev) || prev.session !== t.session || !prev.context) return prev === first && prev.session === t.session && target(t.competency) === own;
    const c = parse(prev.context);
    return [...c.path, c.skill].includes(target(t.competency));
  });
  effort = mine.length - 1 + myTeaching.length;
  const helped = myTeaching.length > 0;
  const lastTeach = myTeaching.length ? myTeaching.map((t) => t.at).reduce((a, b) => (a > b ? a : b)) : t0;
  const lastMine = mine.filter((a) => a !== first).at(-1);
  let path = lastMine?.context ? parse(lastMine.context).path : [own];
  if (!path.length || path[0] !== own) path = [own];

  // standing before the recovery began (unrelated later work is not mixed in)
  const before: LearnerRecords = { ...records, attempts: records.attempts.filter((a) => a.at < t0), teaching: records.teaching.filter((t) => t.at < t0) };
  const evBefore = evidenceFor("deep-recovery", before, Date.parse(t0)).get;
  const presented = presentedProblems(records, (c) => moduleFor(c) ?? null);
  const fresh = (q: string) => !presented.has(problemKeyOf(q));

  // a right answer chosen from options can be a guess: the trailing run of right answers must hold an open (typed) answer, or two
  const enough = (xs: Attempt[]) => { const run: Attempt[] = []; for (let i = xs.length - 1; i >= 0 && rightAnswer(xs[i]); i--) run.push(xs[i]); return run.some((a) => !isChoice(a.questionId)) || run.length >= 2; };
  const reading = (c: string): SkillReading => {
    const hit = memo.get(c);
    if (hit) return hit;
    const counts = (a: Attempt) => independentAttempt(a) && (c === own ? match.accepts(a.questionId) || a === first : skillOfQ(a.questionId) === c);
    const ans = mine.filter(counts);
    const right = ans.filter(rightAnswer).length, wrong = ans.length - right;
    let shownBefore = false;
    try { shownBefore = c !== own && SHOWN.includes(evBefore(c).status); } catch { /* unknown skill */ }
    // wrong answers older than this recovery's latest lesson are stale: what they rested on may have been fixed since
    const post = helped ? ans.filter((a) => a.at > lastTeach) : ans;
    let verdict: Verdict;
    if (post.length) {
      let trailing = 0;
      for (let i = post.length - 1; i >= 0 && !rightAnswer(post[i]); i--) trailing++;
      verdict = trailing === 0 ? (enough(post) ? "known" : "unsure") : trailing >= 2 || post.length > perSkill ? "failing" : "unsure";
    } else verdict = ans.length ? (rightAnswer(ans[ans.length - 1]) ? (enough(ans) ? "known" : "unknown") : "unknown") : shownBefore ? "known" : "unknown";
    const r = { skill: c, verdict, right, wrong, shownBefore };
    memo.set(c, r);
    return r;
  };
  const ctx = (p: string[], skill: string) => `${tag(originalQid)}${p.join(">")}@${skill}`;
  const lastWrongOn = (c: string) => mine.filter((a) => independentAttempt(a) && !rightAnswer(a) && skillOfQ(a.questionId) === c).at(-1)?.questionId ?? null;
  const pools = (m: Module) => [...m.diagnostics, ...m.practice, ...m.transfer, ...PHASES.flatMap((ph) => (m.pool ? modulePhasePool(m, ph) : []))];
  const freshOn = (c: string): string | null => {
    const m = moduleFor(c);
    return m ? openFirst(pools(m).filter((id) => skillOfQ(id) === c && fresh(id))) : null;
  };
  const freshOriginal = (): string | null => {
    if (!match.scope) return null;
    const fam = familyOf(originalQid);
    const m = moduleFor(own);
    const cands = [...(fam ? PHASES.flatMap((ph) => phasePool(fam, ph)) : []), ...(m ? pools(m) : [])];
    return openFirst(cands.filter((id) => fresh(id) && match.accepts(id)));
  };
  const teachableSkill = (c: string): { ok: boolean; why: string } => {
    const m = moduleFor(c);
    if (!m) return { ok: false, why: "there is no module for it" };
    if (!m.strategies.some((s) => teachable(m, s, establishedIds(c, records)))) return { ok: false, why: "none of its explanations has passed the teaching checks and content review" };
    return { ok: true, why: "" };
  };
  const evidenceLine = (r: SkillReading) => `${r.right} right and ${r.wrong} wrong on it in this recovery`;
  const overBudget = () => effort >= budget;
  const tired = (p: string[], active: string | null) => out({ ...plain, phase: "escalate", path: p, active, confidence: "unsure", reason: `This recovery has used its effort limit (${effort} questions and lessons) without settling it. What is known so far is shown with it. Go through it with a teacher or parent.` });
  const noFresh = (p: string[]) => out({ ...plain, phase: "escalate", path: p, active: own, confidence: "unsure", reason: match.scope ? `There is no fresh question left that tests the same skill as the original (${match.scope}), and OpenPath will not substitute a different one. Go through it with a teacher or parent.` : "There is no fresh question that OpenPath can show tests the same skill as this one (it has no skill mapping), and it will not substitute a different one. Go through it with a teacher or parent." });

  for (let guard = 0; guard < 64; guard++) {
    const n = path[path.length - 1];
    const rn = reading(n);
    const atTop = path.length === 1;
    if (atTop && rn.verdict === "known") {
      // only a fresh, unaided, matching answer of this episode reaches here (reading(own) counts nothing else as right)
      return out({ ...plain, phase: helped ? "solved_after_help" : "solved", path, confidence: "direct", reason: helped ? "Right on a fresh question of the same kind after the work on what it builds on. That counts as help, not as work on your own the first time." : rightAnswer(first) ? "Right on a fresh question of the same kind, unaided." : "The next question of the same kind was right, unaided, so the first answer was most likely a slip. No extra work needed." });
    }
    if (atTop && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
      if (overBudget()) return tired(path, own);
      const q = freshOriginal();
      if (!q) return noFresh(path);
      return out({ ...plain, phase: helped ? "return" : "slip-check", path, active: own, question: q, context: ctx(path, own), reason: helped ? "Back to a fresh problem of the same kind." : rightAnswer(first) ? (independentAttempt(first) ? "Right. One more of the same kind, to be sure it was not a lucky pick." : "That was right with help. Now a fresh one of the same kind, unaided.") : "One more of the same kind, to see whether that was a slip." });
    }
    if (!atTop && rn.verdict === "known") { path = path.slice(0, -1); continue; }
    if (!atTop && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
      if (overBudget()) return tired(path, n);
      const q = freshOn(n);
      if (!q) return out({ ...plain, phase: "escalate", path, active: n, confidence: "unsure", reason: `OpenPath has no fresh question left to check ${nameOf(n)} again. Go through it with a teacher or parent.` });
      return out({ ...plain, phase: "probe", path, active: n, question: q, context: ctx(path, n), reason: `A fresh question on ${nameOf(n)}, to see where things stand now.` });
    }
    // N is failing: check what it builds on, in order
    let descended = false;
    for (const c of candidatesOf(n, lastWrongOn(n), o)) {
      if (path.includes(c)) continue; // cycle protection
      if (!graph.byId.has(c) || !moduleFor(c)) { unchecked.add(c); continue; }
      const rc = reading(c);
      if (rc.verdict === "known") continue;
      if (rc.verdict === "failing") { path = [...path, c]; descended = true; break; }
      const q = freshOn(c);
      if (!q) { unchecked.add(c); continue; }
      if (overBudget()) return tired(path, c);
      return out({ ...plain, phase: "probe", path, active: c, question: q, context: ctx(path, c), reason: rc.verdict === "unsure" ? `One more question on ${nameOf(c)}: one answer is not enough to tell a slip from a gap.` : `${nameOf(n)} builds on ${nameOf(c)}. A quick question on it first.` });
    }
    if (descended) continue;
    // nothing below N is missing (as far as could be checked): N itself is the most likely gap
    const t = teachableSkill(n);
    const conf: DeepRecoveryState["confidence"] = unchecked.size ? "unsure" : "likely";
    const hedge = unchecked.size ? ` Some skills it builds on could not be checked here (${[...unchecked].map(nameOf).join(", ")}), so this is a best guess.` : " This is the most likely missing piece from the answers so far, not a certainty.";
    if (!t.ok) return out({ ...plain, phase: "blocked", path, active: n, confidence: conf, blocked: { skill: n, why: t.why }, reason: `The answers point to ${nameOf(n)} (${evidenceLine(rn)}). OpenPath cannot teach it yet: ${t.why}. That is a gap in OpenPath's content, not in you. Go through ${nameOf(n)} with a teacher or parent, then come back to the problem.${unchecked.size ? hedge : ""}` });
    if (overBudget()) return tired(path, n);
    const ms0 = moduleState(n, records, evidence(n), now, session, null);
    if (ms0.phase === "done") {
      const q = freshOn(n);
      if (q) return out({ ...plain, phase: "probe", path, active: n, question: q, context: ctx(path, n), reason: `A fresh question on ${nameOf(n)}, to see where things stand now.` });
    }
    if (ms0.phase === "pause" || ms0.phase === "reentry" || (ms0.phase !== "chapter" && !ms0.question))
      return out({ ...plain, phase: "escalate", path, active: n, confidence: conf, module: ms0, reason: `${nameOf(n)} looks like the missing piece, and the explanations OpenPath has for it have not clicked yet. Go through it with a teacher or parent.` });
    return out({ ...plain, phase: "teach", path, active: n, context: ctx(path, n), confidence: conf, module: ms0, reason: `${nameOf(n)}: ${evidenceLine(rn)}, and what it builds on was right.${hedge} We work on it now, then come back up to the problem.` });
  }
  return out({ ...plain, phase: "escalate", path, confidence: "unsure", reason: "Recovery could not settle on a next step. Go through it with a teacher or parent." });
}

/** candidates for skill N: skills the failed question's own steps use (closest evidence), then the followed graph relations */
function candidatesOf(n: string, lastWrongQ: string | null, o: DeepRecoveryOptions): string[] {
  const used = lastWrongQ ? (problemOf(base(lastWrongQ))?.steps ?? []).map((s) => String(s.competency ?? "")).filter((id) => graph.byId.has(id)).map(target) : [];
  const rel = (o.supportsOf ?? graph.supportsOf)(n).map((id) => (graph.byId.has(id) ? target(id) : id));
  return [...new Set([...used, ...rel])].filter((id) => id !== n);
}

/** days since the original first try (for a resume note) */
export const deepRecoveryAge = (records: LearnerRecords, originalQid: string, now: number) => {
  const a = records.attempts.find((x) => x.questionId === originalQid);
  return a ? Math.floor((now - Date.parse(a.at)) / DAY) : null;
};
