// Complete student derivation assessment. Built ON the verified core (`assessWorking` / `verifyWorkingStep`): it adds no new mathematics.
// It keeps SOLUTION-WIDE STATE that a single step cannot hold:
//   * every transition is judged on its own (previous line -> this line; the first one problem -> line 1);
//   * an obligation (a restriction the problem has and a line has dropped) is OPENED when a step loses it and stays on the ledger until the
//     student states it or a later line restores it -- it is never silently forgiven, and the result says whether it is still open at the end;
//   * a later valid line never repairs an earlier invalid one: the first invalid step stays the first invalid step, and `correct` stays false;
//   * mathematical validity (is each step a valid transformation?) is kept apart from pedagogical completeness (form reached, skills shown,
//     restrictions mentioned), which is reported separately and never changes the validity verdict.
// Advisory only: this module never produces a mark. A written answer is marked by an educator.
import { assessWorking, verifyWorkingStep, type WorkingOptions } from "./working-assessment.ts";

export type TransitionStatus = "valid" | "valid-with-obligation" | "no-change" | "invalid" | "unsupported";
export interface Transition {
  index: number; from: string; to: string;
  /** which line this step was judged against: the problem (first line) or the student's previous line */
  basis: "problem" | "previous-line";
  status: TransitionStatus; explanation: string;
  /** obligations this step opened / discharged (texts like "x - 1 ≠ 0") */
  opened: string[]; discharged: string[];
  /** restrictions in force when the step was taken (carried from earlier lines or declared) */
  carried: string[];
  /** true when the step is valid only on the stated/obligated domain */
  conditional: boolean;
  /** whether the line appears in the optional reference route (null when none was given); a difference is never a deduction */
  matchesReference: boolean | null;
}
export interface Obligation { text: string; openedAt: number; status: "open" | "discharged"; dischargedAt: number | null; how: "stated" | "restored" | null }
export interface DerivationConfig { requireDomain?: boolean; maxLines?: number; maxChars?: number }
export interface DerivationInput {
  problem: string; lines: string[];
  /** restrictions declared up front by the student or the task, e.g. ["x ≠ 1"]; they are treated as stated BEFORE the first step */
  declarations?: string[];
  objective?: { form?: WorkingOptions["form"]; requiredSkills?: WorkingOptions["requiredSkills"]; equivalentTo?: string; referenceRoute?: string[] };
  config?: DerivationConfig;
}
export type Mathematical = "correct" | "incorrect" | "undetermined";
export interface DerivationResult {
  /** mathematics only: every step valid (conditional ones included) / some step invalid / some step could not be decided and none invalid */
  mathematics: Mathematical;
  /** "unconditional" only when no step is conditional and no obligation was ever opened; "conditional" if obligations were opened (even if later discharged); "n/a" when not correct */
  conditionality: "unconditional" | "conditional" | "n/a";
  firstInvalidStep: number | null; firstUnsupportedStep: number | null; invalidAt: "step" | "final-claim" | null;
  transitions: Transition[];
  obligations: Obligation[]; outstandingObligations: string[];
  restrictionsCarried: { text: string; statedAt: number }[];
  narrowing: string[];
  /** the last line against the original problem (separate from step validity: an invalid route can still end on an equivalent line) */
  finalEquivalentToProblem: boolean | null;
  objective: { formAchieved: boolean | null; equivalentToTarget: boolean | null; skillsDemonstrated: string[]; skillsMissing: string[] };
  /** pedagogical completeness, kept apart from validity */
  completeness: { complete: boolean; gaps: string[] };
  /** valid steps that do not match the optional reference route (different route, same validity: never a deduction) */
  alternativeRouteSteps: number[];
  causes: string[];
  /** the invariant the harness guarantees; checked by tests */
  laterLinesDoNotRepair: boolean;
  resourceLimit: boolean;
  /** how the whole thing reads to an educator; never a mark */
  summary: string; advisory: true;
}

/** a lost restriction at irrational values cannot be written as x ≠ a, so it stays open and visible */
const IRR = "restriction at irrational values (cannot be stated as x ≠ a)";
const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const DEF = { maxLines: 40, maxChars: 400 };

export function assessDerivation(input: DerivationInput): DerivationResult {
  const cfg = { ...DEF, ...(input.config ?? {}) };
  const decl = input.declarations ?? [];
  const badDecl = decl.some((d) => !/(?:≠|!=|=\/=)/.test(d));
  const lines = [...decl, ...input.lines];
  const base = (extra: Partial<DerivationResult>): DerivationResult => ({
    mathematics: "undetermined", conditionality: "n/a", firstInvalidStep: null, firstUnsupportedStep: null, invalidAt: null, transitions: [], obligations: [], outstandingObligations: [],
    restrictionsCarried: [], narrowing: [], finalEquivalentToProblem: null, objective: { formAchieved: null, equivalentToTarget: null, skillsDemonstrated: [], skillsMissing: [] },
    completeness: { complete: false, gaps: [] }, alternativeRouteSteps: [], causes: [], laterLinesDoNotRepair: true, resourceLimit: false, summary: "", advisory: true, ...extra });
  if (lines.length > cfg.maxLines || input.problem.length > cfg.maxChars || lines.some((l) => l.length > cfg.maxChars))
    return base({ resourceLimit: true, summary: "not assessed: the working exceeds the size limits (unsupported, not wrong)" });
  if (badDecl) return base({ summary: "not assessed: a declaration is not a restriction (expected a form such as x ≠ 1)" });
  const restrictionOnly = (l: string) => l.split(/,|;|\b(?:and|for|where|when|provided|if|with)\b/i).map((x) => x.trim()).filter(Boolean).every((x) => /(?:≠|!=|=\/=)/.test(x));
  if (input.lines.every(restrictionOnly)) return base({ summary: "not assessed: no expression line to assess" });
  const opts: WorkingOptions = { form: input.objective?.form, requiredSkills: input.objective?.requiredSkills, requireDomain: cfg.requireDomain };
  const full = assessWorking(input.problem, lines, opts);
  if (full.resourceLimit) return base({ resourceLimit: true, summary: "not assessed: a computation limit was reached (unsupported, not wrong)" });
  const sub = (full.symbolic ?? full.multivariate) as { steps: { status: string }[]; domain: { missing: string[]; stated: string[]; narrowed: string[] }; final: { form: string }; skills: { demonstrated: string[]; missing: string[] } } | undefined;
  // declarations are not student steps: a restriction-only line is "no-change" in the engines; keep the indices of the student's own lines
  const off = decl.length;
  // ---- obligation ledger by prefixes: the domain state after each line
  const missingAfter: string[][] = []; const statedAfter: string[][] = [];
  for (let k = 1; k <= lines.length; k++) {
    const a = k === lines.length ? full : assessWorking(input.problem, lines.slice(0, k), opts);
    const d = (a.symbolic ?? a.multivariate)?.domain as { missing: string[]; stated: string[]; irrationalLost?: boolean; status?: string } | undefined;
    // a prefix without domain information (an invalid or unreadable step) must not forgive an open obligation: keep the previous state
    if (!d || d.status === "n/a") { missingAfter.push(missingAfter[k - 2] ?? []); statedAfter.push(statedAfter[k - 2] ?? []); continue; }
    missingAfter.push([...d.missing, ...(d.irrationalLost ? [IRR] : [])]); statedAfter.push(d.stated);
  }
  const trans: Transition[] = []; const ledger: Obligation[] = []; let prevMissing: string[] = []; let prevStated: string[] = [];
  const refSet = new Set((input.objective?.referenceRoute ?? []).map(norm));
  const hasRef = refSet.size > 0;
  full.steps.forEach((st, i) => {
    const raw = sub?.steps[i]?.status ?? st.status;
    let status: TransitionStatus = raw === "ambiguous" ? "unsupported" : (raw as TransitionStatus);
    if (full.outcome === "ambiguous" && status === "invalid") status = "unsupported";   // invalid only under one reading of the text: not a verdict
    const missing = missingAfter[i] ?? []; const stated = statedAfter[i] ?? [];
    const opened = missing.filter((m) => !prevMissing.includes(m)); const discharged = prevMissing.filter((m) => !missing.includes(m));
    for (const o of opened) ledger.push({ text: o, openedAt: i + 1 - off, status: "open", dischargedAt: null, how: null });
    for (const t of discharged) { const o = ledger.find((x) => x.text === t && x.status === "open"); if (o) { o.status = "discharged"; o.dischargedAt = i + 1 - off; o.how = stated.length > prevStated.length ? "stated" : "restored"; } }
    trans.push({ index: i + 1 - off, from: st.from, to: st.to, basis: i <= off ? "problem" : "previous-line", status, explanation: st.explanation, opened, discharged, carried: [...prevStated],
      conditional: status === "valid-with-obligation", matchesReference: hasRef ? refSet.has(norm(st.to)) : null });
    prevMissing = missing; prevStated = stated;
  });
  const own = trans.filter((t) => t.index >= 1);        // declarations (index <= 0) are not steps
  const firstInvalid = own.find((t) => t.status === "invalid")?.index ?? null;
  const firstUnsupported = own.find((t) => t.status === "unsupported")?.index ?? null;
  // The whole-working outcome of the core decides the verdict (so a final-claim error, an unfinished working or an ambiguous reading are respected);
  // the step scan only locates the first invalid / unsupported step.
  const mathematics: Mathematical = full.outcome === "invalid" ? "incorrect" : full.outcome === "verified" || full.outcome === "incomplete" ? (firstInvalid !== null ? "incorrect" : "correct") : "undetermined";
  const invalidAt: "step" | "final-claim" | null = mathematics !== "incorrect" ? null : firstInvalid !== null ? "step" : "final-claim";
  const outstanding = ledger.filter((o) => o.status === "open").map((o) => o.text);
  const conditionalSeen = own.some((t) => t.conditional) || ledger.length > 0;
  const lastCarried = sub?.domain.stated ?? [];
  const formAchieved = sub ? (sub.final.form === "ok" ? true : sub.final.form === "not-requested-form" ? false : null) : null;
  let eqTarget: boolean | null = null;
  if (input.objective?.equivalentTo && own.length) { try { const v = verifyWorkingStep(input.problem, own[own.length - 1].to, input.objective.equivalentTo); eqTarget = v.outcome === "verified" ? true : v.outcome === "invalid" ? false : null; } catch { eqTarget = null; } }
  let finalEq: boolean | null = null;
  if (own.length) { try { const v = verifyWorkingStep(input.problem, input.problem.replace(/^\s*(?:expand|factori[sz]e|factor|simplify|collect)\s*/i, ""), own[own.length - 1].to); finalEq = v.outcome === "verified" ? true : v.outcome === "invalid" ? false : null; } catch { finalEq = null; } }
  const gaps: string[] = [];
  if (full.outcome === "incomplete") gaps.push(sub ? "the working has not reached the requested final form" : "the working stops before a final answer");
  if (formAchieved === false) gaps.push("the requested final form was not reached");
  if (sub && sub.skills.missing.length) gaps.push(`skills not shown: ${sub.skills.missing.join(", ")}`);
  if (outstanding.length) gaps.push(`restrictions not stated: ${outstanding.join(", ")}`);
  if ((sub?.domain.narrowed ?? []).length) gaps.push(`stated restrictions the problem did not need: ${sub!.domain.narrowed.join(", ")}`);
  const summary = mathematics === "incorrect" && firstInvalid === null ? "The steps are valid but the final claim is wrong (for example a value the problem excludes)." : mathematics === "incorrect" ? `Step ${firstInvalid} is not a valid transformation. Later lines do not repair it${finalEq === true ? " (the last line happens to equal the problem, but the route to it is not valid)" : ""}.`
    : mathematics === "undetermined" ? `Not decided${firstUnsupported !== null ? ` at step ${firstUnsupported}` : ""}: this is not a judgement that the working is wrong.`
    : outstanding.length ? `Every step is valid, with outstanding restrictions: ${outstanding.join(", ")}.` : conditionalSeen ? "Every step is valid; the restrictions it needed were stated." : "Every step is valid, with no conditions.";
  return {
    mathematics, conditionality: mathematics === "correct" ? (conditionalSeen ? "conditional" : "unconditional") : "n/a", firstInvalidStep: firstInvalid, firstUnsupportedStep: firstUnsupported, invalidAt,
    transitions: own, obligations: ledger, outstandingObligations: outstanding,
    restrictionsCarried: lastCarried.map((text) => ({ text, statedAt: Math.max(1, trans.findIndex((t) => t.carried.includes(text)) + 1 - off) })),
    narrowing: sub?.domain.narrowed ?? [], finalEquivalentToProblem: finalEq,
    objective: { formAchieved, equivalentToTarget: eqTarget, skillsDemonstrated: sub?.skills.demonstrated ?? [], skillsMissing: sub?.skills.missing ?? [] },
    completeness: { complete: mathematics === "correct" && gaps.length === 0, gaps },
    alternativeRouteSteps: hasRef ? own.filter((t) => (t.status === "valid" || t.status === "valid-with-obligation") && t.matchesReference === false).map((t) => t.index) : [],
    causes: full.causes, laterLinesDoNotRepair: !(firstInvalid !== null && mathematics === "correct"), resourceLimit: full.resourceLimit === true, summary, advisory: true };
}
