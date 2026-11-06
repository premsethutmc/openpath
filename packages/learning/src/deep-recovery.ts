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
import { moduleFor, question, type Module } from "./content";
import { DAY, evidenceFor, independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";
import { phasePool, problemKeyOf, problemOf, type Phase } from "./families";
import { graph } from "./graph";
import { establishedIds, moduleState, teachable, type ModuleState } from "./intervention";
import { modulePhasePool } from "./library";
import type { Attempt, LearnerRecords } from "./records";
import { connectedSkill, connectionConfig, validSkillTask } from "./skill-connections";
import { presentedProblems, unitOfQuestion } from "./skill-units";

export const DEEP_RECOVERY_POLICY = "deep-recovery@0" as const;
export interface DeepRecoveryOptions {
  /** effort limit for the episode: questions (probes, returns, the module's own) plus lessons */
  budget?: number;
  /** questions on one skill since the last lesson before its verdict is taken as it stands */
  perSkill?: number;
  /** test seam: replaces the graph's followed relations (e.g. to inject a cycle) */
  supportsOf?: (id: string) => string[];
  /** how the original skill counts as independently shown again (phase 3 comparison):
   *  current    one fresh unaided matching right (two if picked from options)            [phase-2 rule]
   *  two-fresh  two fresh unaided matching rights in a row
   *  selective  one typed right only for a slip without help by a learner whose skill was shown before the episode began;
   *             otherwise two (after a lesson, after "own-or-unmapped", without prior evidence, or picked from options) */
  confirm?: "current" | "two-fresh" | "selective" | "three-fresh" | "different-form";
  /** phase 5 (confidence; off by default):
   *  delayed    "add": the in-sitting rule, plus one fresh unaided goal answer in a LATER sitting before "solved";
   *             "replace": one typed right now (or two picked from options), then one in a later sitting.
   *             Until then the episode ends the sitting as "provisional" (learner-visible, nothing claimed as solved)
   *  firstTry   "provisional": a right first try (typed, unaided) is not "solved on your own" until a later-sitting check
   *  different-form (confirm): the confirming answers must include both formats (typed and picked from options) when a fresh item of
   *             the other format exists */
  delayed?: "add" | "replace";
  /** consistency: wrong goal answers since the last lesson are not forgiven by a later streak: right minus wrong must reach the
   *  rule's count (tuning seeds 5001-5010: claims were made after R W R R-type sequences, i.e. by asking until a streak appeared) */
  consistent?: boolean;
  firstTry?: "accept" | "provisional" | "confirm" | "proportionate" | "proportionate-space";
  /* phase 6 first-try policies (same sitting, no later-sitting wait):
   *  confirm              every right first try (typed, unaided) is confirmed by one fresh question before "solved"
   *  proportionate        only when the evidence is thin: a small answer space (a typed whole number between -10 and 10) OR no
   *                       independent success on this skill in the learner's record before this try
   *  proportionate-space  only for a small answer space */
  /** lesson attribution: "episode" uses a lesson's recovery id when the record has one (adjacency for older records);
   *  "adjacency" ignores ids (phase-2 behaviour, kept for comparison) */
  attribution?: "episode" | "adjacency";
  /** phase 4 (all off by default = phase-3 behaviour):
   *  reuse          a parent whose earlier answers showed it failing and that still has untested prerequisites goes on to those
   *                 before being re-checked; a re-check that is wrong again after a lesson below confirms "failing" at once
   *  sessionBudget  effort per sitting; reaching it PAUSES the episode (resumable, next step named) instead of handing over,
   *                 while `budget` stays the cap for the whole episode across sittings
   *  validDays      answers older than this many days are not used as evidence (e.g. evidence.RETENTION_DAYS after a long pause) */
  reuse?: boolean;
  sessionBudget?: number;
  validDays?: number;
}
export type Verdict = "known" | "unknown" | "unsure" | "failing";
export interface SkillReading { skill: string; verdict: Verdict; right: number; wrong: number; shownBefore: boolean }
export interface DeepRecoveryState {
  policy: typeof DEEP_RECOVERY_POLICY;
  original: string;
  phase: "attempt" | "slip-check" | "probe" | "teach" | "return" | "solved" | "solved_after_help" | "blocked" | "escalate" | "pause" | "provisional";
  /** phase "pause": what the episode will do first when the learner comes back */
  next?: { phase: "goal" | "check" | "teach"; active: string | null };
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
  /** this episode's id: lessons it delivers carry it (records.teaching[].episode) */
  episode: string | null;
  /** what the episode concluded about the cause (null while undecided):
   *  slip | prerequisite (a mapped skill below, named in `cause`) | own-or-unmapped (no mapped gap; the skill itself is taught
   *  once) | unexplained (no mapped gap and teaching the skill itself did not fix it: the cause is not identified) */
  diagnosis: "slip" | "prerequisite" | "own-or-unmapped" | "unexplained" | null;
  cause: string | null;
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
/** the first id (typed first, then from options) passing `ok`, scanning lazily: pools hold thousands of generated items */
const firstPassing = (lists: (() => string[])[], ok: (id: string) => boolean): string | null => {
  let choice: string | null = null;
  for (const list of lists) for (const id of list()) if (ok(id)) { if (!isChoice(id)) return id; choice ??= id; }
  return choice;
};
const PHASES: Phase[] = ["diagnostic", "practice", "check", "transfer", "retention"];

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
  let episode: string | null = null;
  const out = (s: Omit<DeepRecoveryState, "policy" | "original" | "readings" | "unchecked" | "originalScope" | "effort" | "episode" | "diagnosis" | "cause"> & { diagnosis?: DeepRecoveryState["diagnosis"]; cause?: string | null }): DeepRecoveryState =>
    ({ diagnosis: null, cause: null, ...s, policy: DEEP_RECOVERY_POLICY, original: originalQid, readings: [...memo.values()], unchecked: [...unchecked], originalScope: match.scope, effort, episode });
  const plain = { active: null, question: null, context: null, confidence: null } as const;
  const confirm = o.confirm ?? "current";
  if (!firsts.length) return out({ ...plain, phase: "attempt", path: [own], active: own, question: originalQid, context: `${tag(originalQid)}${own}@${own}`, reason: "Try the problem." });
  const first = firsts[0];
  // a right first try is "solved on your own" only when it was unaided and typed (a pick from options may be a lucky guess)
  const typedRightFirst = rightAnswer(first) && independentAttempt(first) && !isChoice(first.questionId);
  const smallSpace = (qid: string) => { const v = Number(String(question(base(qid)).answer).trim().replace(/−/g, "-")); return Number.isInteger(v) && Math.abs(v) <= 10; };
  const priorShown = () => { try { const pre: LearnerRecords = { ...records, attempts: records.attempts.filter((a) => a.at < first.at), teaching: records.teaching.filter((t) => t.at < first.at) }; return SHOWN.includes(evidenceFor("deep-recovery", pre, Date.parse(first.at)).get(own).status); } catch { return false; } };
  const firstCounts = typedRightFirst && (o.firstTry === "provisional" || o.firstTry === "confirm" || (o.firstTry === "proportionate" && (smallSpace(first.questionId) || !priorShown())) || (o.firstTry === "proportionate-space" && smallSpace(first.questionId)));
  /** a later sitting is owed: delayed rules, or a first try under "provisional" */
  const needSpan = !!o.delayed || (firstCounts && o.firstTry === "provisional");
  if (typedRightFirst && !firstCounts) return out({ ...plain, phase: "solved", path: [own], confidence: "direct", reason: "Solved on your own." });
  const t0 = first.at;
  episode = `deep:${originalQid}#${t0}`;

  // ---- the episode: this recovery's own answers and lessons
  const parse = (c: string) => { const [p, at] = c.slice(tag(originalQid).length).split("@"); return { path: p.split(">").filter(Boolean), skill: at ?? null }; };
  const isMine = (a: Attempt) => a.at >= t0 && (a === first || !!a.context?.startsWith(tag(originalQid)));
  const mine = records.attempts.filter(isMine);
  const ordered = [...records.attempts].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const myTeaching = records.teaching.filter((t) => {
    if (t.at <= t0) return false;
    // an explicit recovery id decides (research records); older records without one fall back to adjacency
    if (t.episode !== undefined && (o.attribution ?? "episode") === "episode") return t.episode === episode;
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
  let evB: ((id: string) => SkillEvidence) | null = null;
  const evBefore = (id: string) => (evB ??= evidenceFor("deep-recovery", before, Date.parse(t0)).get)(id);
  const presented = presentedProblems(records, (c) => moduleFor(c) ?? null);
  const fresh = (q: string) => !presented.has(problemKeyOf(q));

  // a right answer chosen from options can be a guess: the trailing run of right answers must hold an open (typed) answer, or two
  const valid = (a: Attempt) => !o.validDays || now - Date.parse(a.at) <= o.validDays * DAY;
  const enough = (xs: Attempt[]) => { const run: Attempt[] = []; for (let i = xs.length - 1; i >= 0 && rightAnswer(xs[i]); i--) run.push(xs[i]); return run.some((a) => !isChoice(a.questionId)) || run.length >= 2; };
  // sub-skills (skill-connections): a competency with a versioned sub-skill mapping is "known" only when its core sub-skills (the
  // ones a broad "shown alone" claim implies) each have a right answer in this episode; one easy sub-skill does not stand for all
  const cfgOf = (c: string) => (c === own ? undefined : connectionConfig(c));
  const subOf = (c: string, q: string) => { const cfg = cfgOf(c); if (!cfg || !q.startsWith("gen:")) return null; try { return connectedSkill(cfg, base(q)); } catch { return null; } };
  const uncovered = (c: string): string[] => {
    const cfg = cfgOf(c);
    if (!cfg) return [];
    const got = new Set(mine.filter((a) => independentAttempt(a) && rightAnswer(a) && skillOfQ(a.questionId) === c).map((a) => subOf(c, a.questionId)));
    return cfg.core.filter((id) => !got.has(id));
  };
  const reading = (c: string): SkillReading => {
    const hit = memo.get(c);
    if (hit) return hit;
    const counts = (a: Attempt) => independentAttempt(a) && (c === own ? match.accepts(a.questionId) || a === first : skillOfQ(a.questionId) === c);
    const ans = mine.filter(counts).filter(valid);
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
      // reuse: wrong again after a lesson BELOW it (never after its own lesson: that is its module's business), having been
      // failing before (two or more wrong, never right): still failing. Held-out seed 3014 (phase 4) showed the own-lesson case.
      if (o.reuse && verdict === "unsure" && c !== own && helped && !myTeaching.some((t) => target(t.competency) === c) && ans.filter((a) => a.at <= lastTeach && !rightAnswer(a)).length >= 2 && !ans.some(rightAnswer)) verdict = "failing";
    } else verdict = ans.length ? (rightAnswer(ans[ans.length - 1]) ? (enough(ans) ? "known" : "unknown") : "unknown") : shownBefore ? "known" : "unknown";
    if (verdict === "known" && ans.length && uncovered(c).length) verdict = "unsure";
    const r = { skill: c, verdict, right, wrong, shownBefore };
    memo.set(c, r);
    return r;
  };
  const ctx = (p: string[], skill: string) => `${tag(originalQid)}${p.join(">")}@${skill}`;
  /** failing on the evidence before this episode's latest lesson: two or more wrong, none right */
  const wasFailing = (c: string) => { const xs = mine.filter((a) => valid(a) && independentAttempt(a) && skillOfQ(a.questionId) === c); return xs.filter((a) => !rightAnswer(a)).length >= 2 && !xs.some(rightAnswer); };
  /** a prerequisite not yet settled either way in this episode (no verdict, or one answer only) */
  const untested = (c: string, p: string[]) => !p.includes(c) && graph.byId.has(c) && !!moduleFor(c) && (() => { const r = reading(c); return r.verdict === "unknown" || r.verdict === "unsure"; })();
  const lastWrongOn = (c: string) => mine.filter((a) => independentAttempt(a) && !rightAnswer(a) && skillOfQ(a.questionId) === c).at(-1)?.questionId ?? null;
  const poolLists = (m: Module): (() => string[])[] => [() => [...m.diagnostics, ...m.practice, ...m.transfer], ...PHASES.map((ph) => () => (m.pool ? modulePhasePool(m, ph) : []))];
  const freshOn = (c: string): string | null => {
    const m = moduleFor(c);
    if (!m) return null;
    const lists = poolLists(m);
    const usable = (id: string) => fresh(id) && skillOfQ(id) === c;
    const need = uncovered(c), cfg = cfgOf(c);
    if (cfg && need.length) {
      // a question of an uncovered core sub-skill (validated lazily: the validator grades the item)
      const hit = firstPassing(lists, (id) => { if (!usable(id)) return false; const sub = subOf(c, id); return !!sub && need.includes(sub) && validSkillTask(cfg, sub, base(id)); });
      if (hit) return hit;
    }
    return firstPassing(lists, usable);
  };
  const freshOriginal = (format?: "typed" | "choice", strict = false): string | null => {
    if (!match.scope) return null;
    if (format) {
      const want = format === "choice";
      const famF = familyOf(originalQid), mF = moduleFor(own);
      const hit = firstPassing([...(famF ? PHASES.map((ph) => () => phasePool(famF, ph)) : []), ...(mF ? poolLists(mF) : [])], (id) => isChoice(id) === want && fresh(id) && match.accepts(id));
      if (hit || strict) return hit;
    }
    const fam = familyOf(originalQid);
    const m = moduleFor(own);
    return firstPassing([...(fam ? PHASES.map((ph) => () => phasePool(fam, ph)) : []), ...(m ? poolLists(m) : [])], (id) => fresh(id) && match.accepts(id));
  };
  const teachableSkill = (c: string): { ok: boolean; why: string } => {
    const m = moduleFor(c);
    if (!m) return { ok: false, why: "there is no module for it" };
    if (!m.strategies.some((s) => teachable(m, s, establishedIds(c, records)))) return { ok: false, why: "none of its explanations has passed the teaching checks and content review" };
    return { ok: true, why: "" };
  };
  const evidenceLine = (r: SkillReading) => `${r.right} right and ${r.wrong} wrong on it in this recovery`;
  const sessEffort = mine.filter((a) => a !== first && a.session === session).length + myTeaching.filter((t) => t.session === session).length;
  const overBudget = () => effort >= budget || (o.sessionBudget !== undefined && sessEffort >= o.sessionBudget);
  const tired = (p: string[], active: string | null, next: "goal" | "check" | "teach" = "check") => o.sessionBudget !== undefined && effort < budget ? pauseAt(p, active, next) : out({ ...plain, phase: "escalate", path: p, active, confidence: "unsure", reason: `This recovery has used its effort limit (${effort} questions and lessons) without settling it. What is known so far is shown with it. Go through it with a teacher or parent.` });
  const pauseAt = (p: string[], active: string | null, next: "goal" | "check" | "teach") => {
    const done = [...new Set(myTeaching.map((t) => target(t.competency)))].filter((x) => reading(x).verdict === "known").map(nameOf);
    const what = next === "goal" ? "a fresh problem of the same kind" : next === "teach" ? `an explanation of ${nameOf(active ?? own)}` : `a fresh question on ${nameOf(active ?? own)}`;
    return out({ ...plain, phase: "pause", path: p, active, confidence: "unsure", next: { phase: next, active }, reason: `That is enough for one sitting (${sessEffort} questions and explanations). Nothing is finished yet and nothing is counted as solved. ${done.length ? `Already worked on and now right on your own: ${done.join(", ")}. ` : ""}Your place is saved: next time starts with ${what}, then back up to a fresh problem of the same kind.` });
  };
  const noFresh = (p: string[]) => out({ ...plain, phase: "escalate", path: p, active: own, confidence: "unsure", reason: match.scope ? `There is no fresh question left that tests the same skill as the original (${match.scope}), and OpenPath will not substitute a different one. Go through it with a teacher or parent.` : "There is no fresh question that OpenPath can show tests the same skill as this one (it has no skill mapping), and it will not substitute a different one. Go through it with a teacher or parent." });

  let ownShownBefore = false;
  try { ownShownBefore = SHOWN.includes(evBefore(own).status); } catch { /* none */ }
  const ownTaught = myTeaching.some((t) => target(t.competency) === own);
  /** the trailing run of fresh, unaided, matching rights on the original skill (the first try itself is never fresh) */
  const ownRun = () => { const xs = mine.filter((a) => (a !== first || firstCounts) && valid(a) && independentAttempt(a) && match.accepts(a.questionId) && (!helped || a.at > lastTeach)); const run: Attempt[] = []; for (let i = xs.length - 1; i >= 0 && rightAnswer(xs[i]); i--) run.push(xs[i]); return run; };
  const typedIn = (run: Attempt[]) => run.some((a) => !isChoice(a.questionId));
  let otherFormatFresh: Map<boolean, boolean> | null = null;
  const freshOfFormat = (choice: boolean) => { otherFormatFresh ??= new Map(); if (!otherFormatFresh.has(choice)) otherFormatFresh.set(choice, freshOriginal(choice ? "choice" : "typed", true) !== null); return otherFormatFresh.get(choice)!; };
  /** the in-sitting part of the rule (the phase-4 rules unchanged when `delayed` is off) */
  const baseOk = (run: Attempt[]): boolean => {
    if (o.delayed === "replace") return typedIn(run) || run.length >= 2;
    if (confirm === "three-fresh") return run.length >= 3;
    if (confirm === "different-form") return run.length >= 2 && (new Set(run.map((a) => isChoice(a.questionId))).size === 2 || !freshOfFormat(!isChoice(run[0].questionId)));
    return confirmedBase(run);
  };
  const spans = (run: Attempt[]) => !needSpan || new Set(run.map((a) => a.session)).size >= 2;
  /** all fresh unaided matching goal answers since the last lesson (the first try only when it counts), for `consistent` */
  const ownAll = () => mine.filter((a) => (a !== first || firstCounts) && valid(a) && independentAttempt(a) && match.accepts(a.questionId) && (!helped || a.at > lastTeach));
  const consistentOk = (run: Attempt[]) => { if (!o.consistent) return true; const xs = ownAll(); const net = xs.filter(rightAnswer).length - xs.filter((a) => !rightAnswer(a)).length; return net >= Math.min(2, Math.max(1, run.length)); };
  const confirmed = () => { const run = ownRun(); return baseOk(run) && spans(run) && consistentOk(run); };
  /** right today by the in-sitting rule, but the later-sitting check is still owed */
  const provisional = () => { if (!needSpan) return false; const run = ownRun(); return baseOk(run) && consistentOk(run) && !spans(run) && run.every((a) => a.session === session); };
  const confirmedBase = (run: Attempt[]) => {
    if (confirm === "two-fresh") return run.length >= 2;
    // tuning seeds 1-5 (phase 3): exempting episodes with a lesson let lucky typed answers through (6/10 typed-guesser runs), so
    // only an unhelped slip by a learner whose skill was shown before the episode is confirmed by one typed answer
    // phase 6: a first try under a first-try policy is never its own confirmation: at least one fresh answer besides it
    if (firstCounts && run.length < 2) return false;
    if (confirm === "selective") return run.length >= 2 || (run.length === 1 && !isChoice(run[0].questionId) && !helped && ownShownBefore);
    return true; // current: reading(own) already required a typed right or two
  };
  for (let guard = 0; guard < 64; guard++) {
    const n = path[path.length - 1];
    let rn = reading(n);
    const atTop = path.length === 1;
    if (atTop && rn.verdict === "known" && provisional()) return out({ ...plain, phase: "provisional", path, active: own, confidence: "likely", next: { phase: "goal", active: own }, reason: "Right on your own today. OpenPath will check once more, with a fresh problem next time, before calling this solved." });
    if (atTop && rn.verdict === "known" && !confirmed()) rn = { ...rn, verdict: "unsure" };
    if (atTop && rn.verdict === "known") {
      // only a fresh, unaided, matching answer of this episode reaches here (reading(own) counts nothing else as right)
      return out({ ...plain, phase: helped ? "solved_after_help" : "solved", path, confidence: "direct", diagnosis: helped ? (ownTaught && myTeaching.every((t) => target(t.competency) === own) ? "own-or-unmapped" : "prerequisite") : rightAnswer(first) ? null : "slip", cause: helped ? myTeaching.map((t) => target(t.competency)).filter((x) => x !== own)[0] ?? null : null, reason: helped ? "Right on a fresh question of the same kind after the work on what it builds on. That counts as help, not as work on your own the first time." : rightAnswer(first) ? "Right on a fresh question of the same kind, unaided." : "The next question of the same kind was right, unaided, so the first answer was most likely a slip. No extra work needed." });
    }
    if (atTop && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
      if (overBudget()) return tired(path, own, "goal");
      const run0 = ownRun();
      const q = confirm === "different-form" && run0.length === 1 ? freshOriginal(isChoice(run0[0].questionId) ? "typed" : "choice") : freshOriginal();
      if (!q) return noFresh(path);
      const another = run0.length > 0;
      if (another && needSpan && run0.every((a) => a.session !== session)) return out({ ...plain, phase: "return", path, active: own, question: q, context: ctx(path, own), reason: "The check promised last time: one fresh problem of the same kind, on your own." });
      return out({ ...plain, phase: helped ? "return" : "slip-check", path, active: own, question: q, context: ctx(path, own), reason: another ? "Right. One more fresh one of the same kind, to be sure." : helped ? "Back to a fresh problem of the same kind." : rightAnswer(first) ? (independentAttempt(first) ? "Right. One more of the same kind, to be sure it was not a lucky pick." : "That was right with help. Now a fresh one of the same kind, unaided.") : "One more of the same kind, to see whether that was a slip." });
    }
    if (!atTop && rn.verdict === "known") { path = path.slice(0, -1); continue; }
    // reuse: a parent that was failing before a lesson below, with prerequisites still untested, goes on to them first (its
    // re-check waits until they are known: one re-check instead of one per repaired child)
    const deferred = !!o.reuse && !atTop && rn.verdict === "unknown" && wasFailing(n) && candidatesOf(n, lastWrongOn(n), o).some((c) => untested(c, path));
    if (!atTop && !deferred && (rn.verdict === "unknown" || rn.verdict === "unsure")) {
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
    if (deferred) {
      // every prerequisite is known now: the deferred re-check of N itself
      if (overBudget()) return tired(path, n);
      const q = freshOn(n);
      if (!q) return out({ ...plain, phase: "escalate", path, active: n, confidence: "unsure", reason: `OpenPath has no fresh question left to check ${nameOf(n)} again. Go through it with a teacher or parent.` });
      return out({ ...plain, phase: "probe", path, active: n, question: q, context: ctx(path, n), reason: `A fresh question on ${nameOf(n)}, now that what it builds on is in place.` });
    }
    // nothing below N is missing (as far as could be checked): N itself is the most likely gap
    if (n === own) {
      // no mapped cause: either the skill itself needs teaching, or the cause is something the graph does not map. The evidence
      // does not tell these apart, so the skill itself is taught ONCE; if that does not help, recovery says the cause is not found
      const checked = [...memo.values()].filter((r) => r.skill !== own && r.verdict === "known").map((r) => nameOf(r.skill));
      if (ownTaught) return out({ ...plain, phase: "escalate", path, active: own, confidence: "unsure", diagnosis: "unexplained", reason: `No gap was found in the skills OpenPath maps under ${nameOf(own)} (right: ${checked.join(", ") || "none checked"}), and teaching ${nameOf(own)} itself did not fix it. The cause may be a skill OpenPath does not link to this one; OpenPath will not guess which. Go through the working with a teacher or parent.` });
      const t0k = teachableSkill(own);
      if (!t0k.ok) return out({ ...plain, phase: "escalate", path, active: own, confidence: "unsure", diagnosis: "unexplained", reason: `No gap was found in the skills OpenPath maps under ${nameOf(own)}, and OpenPath cannot teach ${nameOf(own)} itself (${t0k.why}). Go through it with a teacher or parent.` });
      if (overBudget()) return tired(path, own, "teach");
      const mo = moduleState(own, records, evidence(own), now, session, null);
      if (mo.phase === "pause" || mo.phase === "reentry" || (mo.phase !== "chapter" && !mo.question)) return out({ ...plain, phase: "escalate", path, active: own, confidence: "unsure", diagnosis: "unexplained", module: mo, reason: `No gap was found in the skills OpenPath maps under ${nameOf(own)}, and its module has no explanation to offer now. Go through it with a teacher or parent.` });
      return out({ ...plain, phase: "teach", path, active: own, context: ctx(path, own), confidence: "unsure", diagnosis: "own-or-unmapped", module: mo, reason: `No gap was found in the skills OpenPath maps under this one (right: ${checked.join(", ") || "none checked"}). Two things fit: ${nameOf(own)} itself needs teaching, or the cause is something OpenPath does not map. One explanation of ${nameOf(own)} now; if that does not help, a teacher should look.` });
    }
    const t = teachableSkill(n);
    const conf: DeepRecoveryState["confidence"] = unchecked.size ? "unsure" : "likely";
    const hedge = unchecked.size ? ` Some skills it builds on could not be checked here (${[...unchecked].map(nameOf).join(", ")}), so this is a best guess.` : " This is the most likely missing piece from the answers so far, not a certainty.";
    if (!t.ok) return out({ ...plain, phase: "blocked", path, active: n, confidence: conf, diagnosis: "prerequisite", cause: n, blocked: { skill: n, why: t.why }, reason: `The answers point to ${nameOf(n)} (${evidenceLine(rn)}). OpenPath cannot teach it yet: ${t.why}. That is a gap in OpenPath's content, not in you. Go through ${nameOf(n)} with a teacher or parent, then come back to the problem.${unchecked.size ? hedge : ""}` });
    if (overBudget()) return tired(path, n, "teach");
    const ms0 = moduleState(n, records, evidence(n), now, session, null);
    if (ms0.phase === "done") {
      const q = freshOn(n);
      if (q) return out({ ...plain, phase: "probe", path, active: n, question: q, context: ctx(path, n), reason: `A fresh question on ${nameOf(n)}, to see where things stand now.` });
    }
    if (ms0.phase === "pause" || ms0.phase === "reentry" || (ms0.phase !== "chapter" && !ms0.question))
      return out({ ...plain, phase: "escalate", path, active: n, confidence: conf, diagnosis: "prerequisite", cause: n, module: ms0, reason: `${nameOf(n)} looks like the missing piece, and the explanations OpenPath has for it have not clicked yet. Go through it with a teacher or parent.` });
    return out({ ...plain, phase: "teach", path, active: n, context: ctx(path, n), confidence: conf, diagnosis: "prerequisite", cause: n, module: ms0, reason: `${nameOf(n)}: ${evidenceLine(rn)}, and what it builds on was right.${hedge} We work on it now, then come back up to the problem.` });
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
