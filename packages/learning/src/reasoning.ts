/**
 * Diagnostic reasoning over competing explanations (diagnostic@2).
 *
 * For a problem from a supported family, the explanations of a learner's answers are:
 *   secure        knows it (an occasional slip is possible)
 *   <bug id>      a written misunderstanding (families.ts) that predicts a specific wrong answer for each problem;
 *                 the same id means the same misunderstanding in every family, so evidence accumulates across problems
 *   unexplained   something else: a mistake no written explanation predicts
 * Each answer is classified against what each explanation predicts for THAT problem (computed from its parameters,
 * so unseen problems and unseen combinations work the same way). The next question is the variant with the largest
 * expected information gain about which explanation holds. The diagnosis stops when one explanation is clearly
 * ahead ("established") or after a fixed number of follow-ups ("uncertain", with the competing explanations).
 *
 * The likelihoods are design values chosen to be cautious, NOT calibrated probabilities: the numbers are reported as
 * relative support, and an unexplained answer never produces a confident claim.
 */
import { phasePool, problemOf, show, variantsOf, type Bug, type Problem, type Value } from "./families";
import { selectable } from "./question-status";

export const REASONING_POLICY = {
  version: "diagnostic@2.1-draft",
  prior: { secure: 0.3, unexplained: 0.1 },
  /** P(the predicted wrong answer | that explanation) when it predicts one value; split when it predicts several. */
  consistency: 0.7,
  /** P(right | a misunderstanding that predicts a wrong answer here): it is not always applied. */
  notApplied: 0.15,
  slip: 0.08,
  establishAt: 0.8,
  maxFollowUps: 3,
} as const;

export interface Explanation {
  id: string;
  kind: Bug["kind"] | "secure" | "unexplained";
  competency: string | null;
  says: string;
}
export interface Observation {
  questionId: string;
  response: string;
}
export interface Reasoning {
  explanations: Explanation[];
  /** Relative support for each explanation (sums to 1; uncalibrated). */
  support: Record<string, number>;
  observed: { questionId: string; response: string; right: boolean; matches: string[] }[];
  status: "need_more" | "established" | "uncertain";
  best: Explanation | null;
  /** Competing explanations still in play (support ≥ 0.15), strongest first. */
  competing: Explanation[];
  next: string | null;
  policy: string;
}

const same = (a: Value, b: Value) => show(a) === show(b);
const asValue = (pr: Problem, raw: string): Value | null => {
  const t = raw.trim().replace(/−/g, "-");
  if (pr.type === "choice") return /^[A-D]$/i.test(t) ? "ABCD".indexOf(t.toUpperCase()) : null;
  const num = (x: string) => {
    const m = x.trim().match(/^([+-]?\d+(?:\.\d+)?)(?:\/([+-]?\d+))?$/);
    return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : NaN;
  };
  if (pr.type === "set") {
    const v = t.split(",").map(num);
    return v.some((x) => !Number.isFinite(x)) ? null : v;
  }
  const v = num(t);
  return Number.isFinite(v) ? v : null;
};
const correctValue = (pr: Problem): Value => asValue(pr, pr.answer)!;
/** The answers an explanation predicts: a fact slip predicts any of several neighbouring facts, and on a problem whose
 * answer is one value a list is a set of alternatives; a list on a set problem is one predicted set. */
const predictions = (b: Bug, pr: Problem): Value[] => (b.predict === null ? [] : Array.isArray(b.predict) && (b.id.startsWith("fact-slip:") || pr.type !== "set") ? b.predict.map((x) => x) : [b.predict]);

/** P(response class | explanation) for one problem. */
function likelihood(pr: Problem, exp: Explanation, value: Value | null): number {
  const P = REASONING_POLICY;
  const right = value !== null && same(value, correctValue(pr));
  if (exp.id === "secure") return right ? 1 - P.slip : P.slip / 6;
  if (exp.id === "unexplained") {
    const predicted = value !== null && pr.bugs.some((b) => predictions(b, pr).some((v) => same(v, value)));
    return right ? 0.3 : predicted ? 0.1 : 0.6;
  }
  const bug = pr.bugs.find((b) => b.id === exp.id);
  const preds = bug ? predictions(bug, pr).filter((v) => !same(v, correctValue(pr))) : [];
  if (!preds.length) return right ? 1 - P.slip : P.slip / 6; // this explanation predicts no mistake on this problem
  if (right) return P.notApplied;
  if (value !== null && preds.some((v) => same(v, value))) return P.consistency / preds.length;
  return (1 - P.consistency - P.notApplied) / 6; // another wrong answer
}

/** Explanations relevant to a set of problems (the union of their written bugs, with secure and unexplained). */
function explanationsFor(problems: Problem[]): Explanation[] {
  const out: Explanation[] = [{ id: "secure", kind: "secure", competency: null, says: "Knows it; the mistake was a slip." }];
  for (const pr of problems) for (const b of pr.bugs) if (!out.some((e) => e.id === b.id)) out.push({ id: b.id, kind: b.kind, competency: b.competency, says: b.says });
  out.push({ id: "unexplained", kind: "unexplained", competency: null, says: "A mistake none of the written explanations predicts." });
  return out;
}
function prior(exps: Explanation[]): Record<string, number> {
  const P = REASONING_POLICY.prior;
  const rest = exps.filter((e) => e.id !== "secure" && e.id !== "unexplained");
  return Object.fromEntries(exps.map((e) => [e.id, e.id === "secure" ? P.secure : e.id === "unexplained" ? P.unexplained : (1 - P.secure - P.unexplained) / rest.length]));
}
const normalise = (s: Record<string, number>) => {
  const t = Object.values(s).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v / t]));
};
const entropy = (s: Record<string, number>) => -Object.values(s).reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);

/** Expected entropy after asking `pr` (over the distinct answers the explanations predict, plus right and other). */
function expectedEntropy(pr: Problem, exps: Explanation[], s: Record<string, number>): number {
  const classes: (Value | null)[] = [correctValue(pr), ...pr.bugs.flatMap((b) => predictions(b, pr)), null];
  const distinct = classes.filter((v, i) => v === null || classes.findIndex((w) => w !== null && same(w, v)) === i);
  let h = 0;
  for (const v of distinct) {
    const joint = Object.fromEntries(exps.map((e) => [e.id, s[e.id] * likelihood(pr, e, v === null ? NaN : v)]));
    const pv = Object.values(joint).reduce((a, b) => a + b, 0);
    if (pv > 0) h += pv * entropy(normalise(joint));
  }
  return h;
}

/** How many problems of a family's diagnostic part are considered as follow-ups when it writes no variants. */
const POOL_FOLLOW_UPS = 8;
/** Other problems of the same family to ask next: its written variants, or, for a family that writes none, a fixed
 * selection from the diagnostic part of its release pool (typed form), so that a misunderstanding can be seen again
 * on a different problem in every family. */
function followUpsOf(root: Problem): Problem[] {
  const own = variantsOf(root);
  if (own.length) return own;
  const out: Problem[] = [];
  for (const id of phasePool(root.family, "diagnostic")) {
    if (out.length >= POOL_FOLLOW_UPS) break;
    const p = problemOf(id.replace(/:mc$/, ""));
    if (p && selectable(p.id) && p.id !== root.id && !out.some((x) => x.id === p.id)) out.push(p);
  }
  return out;
}

/**
 * Reason about the answers to `original` and any follow-ups (generated variants, of any supported family).
 * `observations` are the learner's first answers, in order (the original first).
 */
export function reason(original: string, observations: Observation[]): Reasoning | null {
  const root = problemOf(original);
  if (!root) return null;
  const asked = observations.map((o) => ({ o, pr: problemOf(o.questionId) })).filter((x): x is { o: Observation; pr: Problem } => x.pr !== null);
  // follow-ups: other problems of the same family, and the direct probe of each explanation (e.g. the fact itself)
  const probes = root.bugs.flatMap((b) => (b.probe ? [problemOf(b.probe)] : [])).filter((p): p is Problem => p !== null);
  const pool = [root, ...probes, ...followUpsOf(root)];
  const exps = explanationsFor([root, ...asked.map((x) => x.pr)]);
  let s = prior(exps);
  const observed: Reasoning["observed"] = [];
  for (const { o, pr } of asked) {
    const v = asValue(pr, o.response);
    s = normalise(Object.fromEntries(exps.map((e) => [e.id, s[e.id] * likelihood(pr, e, v === null ? NaN : v)])));
    observed.push({ questionId: o.questionId, response: o.response, right: v !== null && same(v, correctValue(pr)), matches: pr.bugs.filter((b) => v !== null && predictions(b, pr).some((p) => same(p, v))).map((b) => b.id) });
  }
  const ranked = [...exps].sort((a, b) => s[b.id] - s[a.id]);
  const top = ranked[0];
  const followUps = asked.length - 1;
  const firstRight = observed[0]?.right ?? false;
  const P = REASONING_POLICY;
  // never established on one answer: a misunderstanding must be seen again on a different problem
  const decided = s[top.id] >= P.establishAt && top.id !== "unexplained" && observed.filter((o) => o.matches.includes(top.id)).length >= 2;
  // stopping rule (adaptive-loop repair): follow-ups can only tell written explanations apart. When none is still in play (the
  // same 0.15 support threshold as `competing`), more questions could only separate "a slip" from "unexplained", which lead to
  // the same next step, so the investigation stops at once (uncertain), instead of asking up to maxFollowUps questions.
  const inPlay = ranked.filter((e) => e.id !== "secure" && e.id !== "unexplained" && s[e.id] >= 0.15);
  const nothingToTellApart = !firstRight && observed.length > 0 && !inPlay.length;
  const out = followUps >= P.maxFollowUps || decided || firstRight || nothingToTellApart;
  let next: string | null = null;
  if (!out) {
    const askedIds = new Set(asked.map((x) => x.pr.id));
    const candidates = pool.filter((p) => !askedIds.has(p.id));
    next = candidates.map((p) => ({ p, h: expectedEntropy(p, exps, s) })).sort((a, b) => a.h - b.h || a.p.id.localeCompare(b.p.id))[0]?.p.id ?? null;
  }
  const status: Reasoning["status"] = firstRight ? "established" : decided ? "established" : out || !next ? "uncertain" : "need_more";
  return {
    explanations: exps,
    support: Object.fromEntries(ranked.map((e) => [e.id, Math.round(s[e.id] * 1000) / 1000])),
    observed,
    status,
    best: status === "established" ? (firstRight ? exps[0] : top) : null,
    competing: ranked.filter((e) => s[e.id] >= 0.15),
    next: status === "need_more" ? next : null,
    policy: P.version,
  };
}

/**
 * probe@1: how one question bears on one explanation (a modelled misunderstanding). It DISCRIMINATES when the
 * explanation predicts at least one wrong answer here and none of its predictions is the right answer; a response is
 * then read as the target understanding ("correct"), the misunderstanding ("predicted"), something else ("other"), or
 * not read at all ("unreadable"). Family-independent: it uses only the problem's own explanations and values.
 */
export function probeReading(qid: string, explanation: string, response?: string): { discriminates: boolean; predicted: string[]; correct: string | null; reading: "correct" | "predicted" | "other" | "unreadable" | null } {
  const pr = problemOf(qid);
  const b = pr?.bugs.find((x) => x.id === explanation);
  if (!pr || !b) return { discriminates: false, predicted: [], correct: null, reading: null };
  const right = correctValue(pr);
  const preds = predictions(b, pr);
  const discriminates = preds.length > 0 && !preds.some((v) => same(v, right));
  if (response === undefined) return { discriminates, predicted: preds.map(show), correct: show(right), reading: null };
  const v = asValue(pr, response);
  const reading = v === null ? "unreadable" : same(v, right) ? "correct" : preds.some((x) => same(x, v)) ? "predicted" : "other";
  return { discriminates, predicted: preds.map(show), correct: show(right), reading };
}

/** What to do next, from a diagnosis: the defensible next activity, and why. */
export function nextFromReasoning(r: Reasoning, problemCompetency: string): { kind: "practise" | "teach" | "support" | "unsure"; competency: string | null; why: string } {
  if (r.status !== "established" || !r.best) {
    const names = r.competing.filter((e) => e.id !== "unexplained").map((e) => e.says.replace(/\.$/, "").toLowerCase());
    return { kind: "unsure", competency: null, why: names.length ? `Not sure yet. It could be: ${names.join("; or ")}.` : "Not sure why yet: the answers do not match any explanation OpenPath knows, so it will not guess." };
  }
  if (r.best.kind === "secure") return { kind: "practise", competency: problemCompetency, why: "You know how to do this; the mistake looks like a slip." };
  if (r.best.competency && r.best.competency !== problemCompetency) return { kind: "support", competency: r.best.competency, why: r.best.says };
  return { kind: "teach", competency: r.best.competency ?? problemCompetency, why: r.best.says };
}
