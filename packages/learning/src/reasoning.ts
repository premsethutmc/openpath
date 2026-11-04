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
import { exposureKey, phasePool, problemOf, show, variantsOf, type Bug, type Problem, type Value } from "./families";
import { selectable } from "./question-status";
import { canonicalOf, readable, sameAnswer, SAMPLED, HUMAN } from "./answer-types";
import { principleOf } from "./answer-feedback";

export const REASONING_POLICY = {
  version: "diagnostic@2.2-draft",
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

const legacyType = (pr: Problem) => ["integer", "fraction", "set", "choice"].includes(pr.type);
/** Keep ordered answer arrays ordered; family-kit.show intentionally sorts legacy sets. */
const answerText = (pr: Problem, value: Value): string => pr.type === "choice" && typeof value === "number" ? "ABCD"[value] ?? String(value)
  : pr.type === "tuple" && Array.isArray(value) ? value.map(String).join(",") : show(value);
const same = (pr: Problem, a: Value | null, b: Value | null) => a !== null && b !== null && (legacyType(pr) ? show(a) === show(b) : sameAnswer(pr.type, answerText(pr, a), answerText(pr, b)));
const asValue = (pr: Problem, raw: string): Value | null => {
  if (!legacyType(pr)) {
    // Approximate identity sampling and educator-marked text are not diagnostic authority.
    if (SAMPLED.has(pr.type) || HUMAN.has(pr.type)) return null;
    return readable(pr.type, raw) && canonicalOf(pr.type, raw) !== null ? raw : null;
  }
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
const correctValue = (pr: Problem): Value | null => asValue(pr, pr.answer);
/** The answers an explanation predicts: a fact slip predicts any of several neighbouring facts, and on a problem whose
 * answer is one value a list is a set of alternatives; a list on a set problem is one predicted set. */
const predictions = (b: Bug, pr: Problem): Value[] => {
  const values = b.predict === null ? [] : Array.isArray(b.predict) && (b.id.startsWith("fact-slip:") || !["set", "tuple"].includes(pr.type)) ? b.predict : [b.predict];
  const normal = values.map((value) => pr.type === "choice" && typeof value === "number" ? (Number.isInteger(value) && value >= 0 && value < 4 ? value : null) : asValue(pr, answerText(pr, value)));
  return normal.filter((value): value is Value => value !== null).filter((value, i, all) => all.findIndex(v => same(pr, value, v)) === i);
};

type EvidenceContract = NonNullable<Bug["evidence"]>;
type ParameterGroup = EvidenceContract["scope"];
const validParameterGroup = (pr: Problem, group: unknown): group is ParameterGroup => Array.isArray(group) && group.length > 0
  && group.every(p => p && typeof p === "object" && Object.keys(p).every(k => k === "index" || k === "values")
    && Number.isInteger(p.index) && p.index >= 0 && p.index < pr.params.length && Array.isArray(p.values) && p.values.length > 0 && p.values.every((v: unknown) => typeof v === "number" && Number.isFinite(v)))
  && new Set(group.map(p => p.index)).size === group.length;
const matchesParameters = (pr: Problem, group: unknown) => validParameterGroup(pr, group) && group.every(p => p.values.includes(pr.params[p.index]));
const validEvidence = (pr: Problem, value: unknown): value is EvidenceContract => !!value && typeof value === "object"
  && Object.keys(value).every(k => k === "scope" || k === "correctContrasts")
  && "scope" in value && matchesParameters(pr, value.scope)
  && "correctContrasts" in value && Array.isArray(value.correctContrasts) && value.correctContrasts.length > 0
  && value.correctContrasts.every(group => validParameterGroup(pr, group));
const evidenceFor = (root: Problem, id: string) => root.bugs.find(b => b.id === id)?.evidence;
const inEvidenceScope = (root: Problem, pr: Problem, id: string) => {
  const evidence = evidenceFor(root, id);
  return evidence === undefined || (validEvidence(root, evidence) && pr.family === root.family && matchesParameters(pr, evidence.scope));
};
/** Apply an established claim's declared task scope to later teaching/probes without changing legacy scopes. */
export function diagnosticScopeAccepts(original: string, candidate: string, explanation: string): boolean {
  const root = problemOf(original), pr = problemOf(candidate);
  return !!root && !!pr && root.bugs.some(b => b.id === explanation) && inEvidenceScope(root, pr, explanation);
}

function missingContrasts(root: Problem, id: string, observed: Reasoning["observed"]): ParameterGroup[] {
  const evidence = evidenceFor(root, id);
  const first = observed.filter((o, i) => observed.findIndex(other => exposureKey(other.questionId) === exposureKey(o.questionId)) === i);
  return evidence?.correctContrasts.filter(group => !first.some(o => {
    const pr = problemOf(o.questionId);
    return o.right && pr?.family === root.family && exposureKey(pr.id) !== exposureKey(root.id) && matchesParameters(pr, group);
  })) ?? [];
}
function evidenceProblems(root: Problem): Problem[] {
  const groups = root.bugs.flatMap(b => b.evidence ? [b.evidence.scope, ...b.evidence.correctContrasts] : []);
  if (!groups.length) return [];
  const candidates = phasePool(root.family, "diagnostic").map(id => problemOf(id)).filter((p): p is Problem => !!p && selectable(p.id) && p.form !== "mc" && correctValue(p) !== null);
  return groups.flatMap(group => candidates.filter(p => matchesParameters(p, group)).slice(0, 2));
}

/** P(response class | explanation) for one problem. */
function likelihood(pr: Problem, exp: Explanation, value: Value | null, root = pr): number {
  const P = REASONING_POLICY;
  const right = value !== null && same(pr, value, correctValue(pr));
  if (exp.id === "secure") return right ? 1 - P.slip : P.slip / 6;
  if (exp.id === "unexplained") {
    const predicted = value !== null && pr.bugs.some((b) => predictions(b, pr).some((v) => same(pr, v, value)));
    return right ? 0.3 : predicted ? 0.1 : 0.6;
  }
  const bug = inEvidenceScope(root, pr, exp.id) ? pr.bugs.find((b) => b.id === exp.id) : undefined;
  const preds = bug ? predictions(bug, pr).filter((v) => !same(pr, v, correctValue(pr))) : [];
  if (!preds.length) return right ? 1 - P.slip : P.slip / 6; // this explanation predicts no mistake on this problem
  if (right) return P.notApplied;
  if (value !== null && preds.some((v) => same(pr, v, value))) return P.consistency / preds.length;
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
function expectedEntropy(pr: Problem, exps: Explanation[], s: Record<string, number>, root: Problem): number {
  const classes: (Value | null)[] = [correctValue(pr), ...pr.bugs.flatMap((b) => predictions(b, pr)), null];
  const distinct = classes.filter((v, i) => v === null || classes.findIndex((w) => w !== null && same(pr, w, v)) === i);
  let h = 0;
  for (const v of distinct) {
    const joint = Object.fromEntries(exps.map((e) => [e.id, s[e.id] * likelihood(pr, e, v === null ? NaN : v, root)]));
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
function followUpsOf(root: Problem, prefer?: (p: Problem) => boolean): Problem[] {
  const own = variantsOf(root);
  if (own.length) return own;
  const all: Problem[] = [];
  for (const id of phasePool(root.family, "diagnostic")) {
    const p = problemOf(id.replace(/:mc$/, ""));
    if (p && selectable(p.id) && p.id !== root.id && !all.some((x) => x.id === p.id)) all.push(p);
  }
  // with a preference (the original's own skill), the fixed selection takes its problems first, then the others
  const ordered = prefer ? [...all.filter(prefer), ...all.filter((p) => !prefer(p))] : all;
  return ordered.slice(0, POOL_FOLLOW_UPS);
}

/**
 * Reason about the answers to `original` and any follow-ups (generated variants, of any supported family).
 * `observations` are the learner's first answers, in order (the original first).
 */
/** `prefer` (optional) only orders the follow-up: a candidate it accepts is asked before one it does not (e.g. the same skill of the
 * competency's skill mapping); it never changes what the answers establish. */
export function reason(original: string, observations: Observation[], prefer?: (p: Problem) => boolean): Reasoning | null {
  const root = problemOf(original);
  if (!root || root.bugs.some(b => b.evidence !== undefined && !validEvidence(root, b.evidence))) return null;
  // The caller's investigation root must be the first recorded exposure. Unrelated correct work is not security evidence here.
  if (observations.length && exposureKey(observations[0].questionId) !== exposureKey(root.id)) return null;
  const asked = observations.map((o) => ({ o, pr: problemOf(o.questionId) })).filter((x): x is { o: Observation; pr: Problem } => x.pr !== null);
  // follow-ups: other problems of the same family, and the direct probe of each explanation (e.g. the fact itself)
  const probes = root.bugs.flatMap((b) => (b.probe ? [problemOf(b.probe)] : [])).filter((p): p is Problem => p !== null);
  const pool = [root, ...probes, ...followUpsOf(root, prefer), ...evidenceProblems(root)];
  const exps = explanationsFor([root, ...asked.map((x) => x.pr)]);
  let s = prior(exps);
  const observed: Reasoning["observed"] = [];
  const exposures = new Set<string>();
  for (const { o, pr } of asked) {
    const fresh = !exposures.has(exposureKey(pr.id));
    exposures.add(exposureKey(pr.id));
    const v = asValue(pr, o.response);
    if (fresh) s = normalise(Object.fromEntries(exps.map((e) => [e.id, s[e.id] * likelihood(pr, e, v === null ? NaN : v, root)])));
    observed.push({ questionId: o.questionId, response: o.response, right: v !== null && same(pr, v, correctValue(pr)), matches: pr.bugs.filter((b) => fresh && inEvidenceScope(root, pr, b.id) && v !== null && !same(pr, v, correctValue(pr)) && predictions(b, pr).some((p) => same(pr, p, v))).map((b) => b.id) });
  }
  const ranked = [...exps].sort((a, b) => s[b.id] - s[a.id]);
  const top = ranked[0];
  const followUps = exposures.size - 1;
  const firstRight = observed[0]?.right ?? false;
  const P = REASONING_POLICY;
  // never established on one answer: a misunderstanding must be seen again on a different problem
  const decided = root.bugs.some(b => b.id === top.id) && s[top.id] >= P.establishAt && top.id !== "unexplained" && observed.filter((o) => o.matches.includes(top.id)).length >= 2 && inEvidenceScope(root, root, top.id) && missingContrasts(root, top.id, observed).length === 0;
  // stopping rule (adaptive-loop repair): follow-ups can only tell written explanations apart. When none is still in play (the
  // same 0.15 support threshold as `competing`), more questions could only separate "a slip" from "unexplained", which lead to
  // the same next step, so the investigation stops at once (uncertain), instead of asking up to maxFollowUps questions.
  const inPlay = ranked.filter((e) => e.id !== "secure" && e.id !== "unexplained" && s[e.id] >= 0.15);
  const nothingToTellApart = !firstRight && observed.length > 0 && !inPlay.length;
  const out = followUps >= P.maxFollowUps || decided || firstRight || nothingToTellApart;
  let next: string | null = null;
  if (!out) {
    const askedIds = new Set(asked.map((x) => exposureKey(x.pr.id)));
    const candidates = pool.filter((p) => !askedIds.has(exposureKey(p.id)) && correctValue(p) !== null);
    const outstanding = inPlay.flatMap(e => missingContrasts(root, e.id, observed));
    const contrasts = candidates.filter(p => p.family === root.family && outstanding.some(group => matchesParameters(p, group)));
    const awaitingRepeat = inPlay.filter(e => evidenceFor(root, e.id) && observed.filter(o => o.matches.includes(e.id)).length < 2);
    const scoped = candidates.filter(p => awaitingRepeat.some(e => inEvidenceScope(root, p, e.id) && p.bugs.some(b => b.id === e.id && predictions(b, p).some(v => !same(p, v, correctValue(p))))));
    const tier = contrasts.length ? contrasts : scoped.length ? scoped : candidates;
    const preferred = prefer ? tier.filter(prefer) : [];
    next = (preferred.length ? preferred : tier).map((p) => ({ p, h: expectedEntropy(p, exps, s, root) })).sort((a, b) => a.h - b.h || a.p.id.localeCompare(b.p.id))[0]?.p.id ?? null;
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
  if (right === null) return { discriminates: false, predicted: [], correct: null, reading: response === undefined ? null : "unreadable" };
  const discriminates = preds.length > 0 && !preds.some((v) => same(pr, v, right));
  if (response === undefined) return { discriminates, predicted: preds.map(v => answerText(pr, v)), correct: answerText(pr, right), reading: null };
  const v = asValue(pr, response);
  const reading = v === null ? "unreadable" : same(pr, v, right) ? "correct" : preds.some((x) => same(pr, x, v)) ? "predicted" : "other";
  return { discriminates, predicted: preds.map(v => answerText(pr, v)), correct: answerText(pr, right), reading };
}

/**
 * contrast-wording@1: two matching answers are a suspicion, not a fact. A claim is worded as what happened only when its family
 * declares contrast evidence (bug.evidence.correctContrasts, met before it is established); otherwise the learner is told neutrally
 * that two answers went the same way, and is taught the method in general. Educators still see the suspected claim, labelled as such.
 */
export function contrastBacked(original: string, explanation: string): boolean {
  const root = problemOf(original.replace(/:(mc|w)$/, ""));
  const evidence = root ? evidenceFor(root, explanation) : undefined;
  return !!root && evidence !== undefined && validEvidence(root, evidence);
}
export const NEUTRAL_CLAIM = "Two of your answers went the same way. That can happen for more than one reason, so OpenPath does not say what caused it: here is the method, step by step.";
/** a claim sentence followed by what comes next; the neutral sentence already says it (no "rebuild" for a suspicion) */
export const withTail = (claim: string, tail: string) => (claim === NEUTRAL_CLAIM ? claim : `${claim} ${tail}`);
export const claimWording = (original: string | null | undefined, explanation: string, says: string) => (original && contrastBacked(original, explanation) ? says : NEUTRAL_CLAIM);

/** What to do next, from a diagnosis: the defensible next activity, and why. */
export function nextFromReasoning(r: Reasoning, problemCompetency: string): { kind: "practise" | "teach" | "support" | "unsure"; competency: string | null; why: string } {
  if (r.status !== "established" || !r.best) {
    // unsure-wording@1: an uncertain reading names no cause (contrast-wording@1, answer-feedback@1); the mathematics of the
    // mix-ups still in play is kept as the step to check. Educators still see the competing explanations themselves.
    const mixups = r.competing.filter((e) => e.id !== "unexplained" && e.kind !== "secure");
    const slip = r.competing.some((e) => e.kind === "secure");
    const steps = [...new Set(mixups.map((e) => principleOf(e.says)).filter((x): x is string => !!x))];
    if (!mixups.length && !slip) return { kind: "unsure", competency: null, why: "Not sure why yet: the answers do not match any explanation OpenPath knows, so it will not guess." };
    const why = mixups.length
      ? `Not sure yet why: these answers can come about in more than one way, so OpenPath does not say what caused them.${steps.length ? ` Check this step: ${steps.join(" ")}` : ""}`
      : "Not sure yet why: it may have been a slip.";
    return { kind: "unsure", competency: null, why };
  }
  if (r.best.kind === "secure") return { kind: "practise", competency: problemCompetency, why: "You know how to do this; the mistake looks like a slip." };
  const why = claimWording(r.observed[0]?.questionId, r.best.id, r.best.says);
  if (r.best.competency && r.best.competency !== problemCompetency) return { kind: "support", competency: r.best.competency, why };
  return { kind: "teach", competency: r.best.competency ?? problemCompetency, why };
}
