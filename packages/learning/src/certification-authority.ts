/**
 * E7 Phase 6: the single certification authority.
 *
 * Routes (base algebra, E5 geometry/calculus, E6 calculus/numbers, typed domain reasoners) only REPORT: each produces a verdict, per-claim
 * evidence and a proof-obligation set. A route's own `verified` is never proof. This module decides the final verdict from the obligations:
 *
 *   verified  <=>  the answer obligation is proven, nothing on its dependency cone is unproven, every discharged derivation names a registered,
 *                  correctly produced mathematical mechanism, and no other route holds a standing, evidence-backed objection.
 *
 * Disagreement between routes is resolved from the obligations, never from a fixed route priority:
 *   - an objection that a trusted mechanism DISPROVED a claim stands unless the accepting route proved the very same claim, in which case two
 *     trusted mechanisms contradict each other and nothing is certified (`unsupported`);
 *   - an unresolved objection stands unless every obligation it leaves open is a derivation the accepting route proved and grounded
 *     (then it is only a limit of the objecting route's grammar, and is recorded as scope-only);
 *   - routes that could not read the working abstain.
 * The distinctions invalid / incomplete / missing-assumption / unsupported / verified are preserved.
 */
import type { AssessmentEnvelope, Classification } from "./unified-math-engine.ts";
import { assemble, internalEv, make, type ObligationSet, type ProofObligation } from "./proof-obligations.ts";
import { attribute, MECHANISMS } from "./evidence-provenance.ts";

export const CERTIFICATION_AUTHORITY_CONTRACT = "openpath-certification-authority@1" as const;

export interface RouteReport { route: string; env: AssessmentEnvelope }
type Role = "accepted" | "agrees" | "objection" | "scope-only" | "abstains";
export interface CertificationRecord {
  contract: typeof CERTIFICATION_AUTHORITY_CONTRACT; decision: string; rule: string; basis: string[];
  routes: { route: string; reported: string; role: Role; reason: string }[];
  mechanisms: Record<string, number>;
  integrity: { provenDerivations: number; attributed: number; unattributed: number };
  /** correct statements that are not about the task: reported, never credited, never used */
  sideClaims?: { line: number; text: string; status: string; reason: string }[];
}

const DEFINITE: Classification[] = ["verified", "invalid", "incomplete", "missing-assumption"];
export const obligationsOf = (env: AssessmentEnvelope): ObligationSet | undefined => env.proofObligations ?? (env.domainPayload as { proofObligations?: ObligationSet } | undefined)?.proofObligations;

/** Typed (structured) steps get the same obligation kinds as natural text. The evidence is the typed domain reasoner that judged each step against the typed problem object. */
export function structuredObligations(cand: AssessmentEnvelope): ObligationSet {
  const out: ProofObligation[] = []; const reasoners = cand.reasoners.map((r) => r.id);
  const stepObs: (ProofObligation | undefined)[] = [];
  cand.steps.forEach((s, i) => {
    const line = i + 1, claim = `typed step ${line}`;
    const pv = attribute(s.reasoner, "structured-typed", reasoners);
    const deps = (s.dependencies ?? []).map((d) => (typeof d === "number" ? d : typeof d === "string" && /^s\d+$/.test(d) ? Number(d.slice(1)) : -1)).filter((k) => k >= 0 && k < i).map((k) => stepObs[k]).filter((x): x is ProofObligation => !!x);
    let status: ProofObligation["status"], reason = s.justification, evidence: ProofObligation["evidence"] = null;
    if (s.classification === "verified") {
      if (pv.trusted && pv.kind === "typed-domain-reasoner") { status = "proven"; evidence = { checker: s.reasoner, scope: "typed domain reasoner judged the step against the typed problem object", digest: null, detail: s.justification, mechanism: pv.mechanism, kernel: pv.kernel, trusted: true }; }
      else { status = "unsupported"; reason = `the step is reported verified, but its reasoner is not a registered typed mechanism: ${pv.reason}`; }
    } else status = s.classification === "invalid" ? "disproven" : s.classification === "incomplete" || s.classification === "missing-assumption" ? "unresolved" : "unsupported";
    const bad = deps.find((d) => d.status !== "proven");
    if (status === "proven" && bad) { status = "unresolved"; reason = `it depends on ${bad.id}, which is ${bad.status}`; evidence = null; }
    const o = make(`ob:${out.length}`, "derivation", line, claim, `${claim} follows from the typed problem by its domain reasoner`, status, reason, evidence, deps.map((d) => d.id), []);
    out.push(o); stepObs[i] = o;
    // grounding for typed input is structural: the typed reasoner binds each step to the problem object; it holds exactly when that derivation is proven by a registered typed mechanism
    out.push(make(`ob:${out.length}`, "grounding", line, claim, `${claim} is about the task (typed ids are bound to the typed problem)`, status === "proven" ? "proven" : "unresolved", status === "proven" ? "bound to the typed problem object by its reasoner" : "the step is not established, so it is not established as relevant", status === "proven" ? { ...evidence!, scope: "typed binding to the problem object" } : null, [o.id], []));
  });
  const last = stepObs[stepObs.length - 1];
  const ok = !!last && last.status === "proven" && cand.classification === "verified" && cand.complete;
  const ans: ProofObligation["status"] = cand.classification === "verified" ? (ok ? "proven" : last ? "unresolved" : "unsupported") : cand.classification === "invalid" ? "disproven" : "unresolved";
  out.push(make(`ob:${out.length}`, "answer", last?.line ?? null, last?.claim ?? "", "the conclusion states the requested quantity, derived from the task", ans,
    ans === "proven" ? "the final typed step is proven and the domain reasoner reports the solution complete" : cand.steps.length ? `the solution is ${cand.classification}` : "the submission has no steps, so nothing can be certified",
    ans === "proven" ? internalEv("completeness", "completeness authority of the typed domain reasoner over the final proven step", null, cand.justification) : null, last ? [last.id] : [], []));
  return assemble(out);
}

/**
 * The legacy typed calculus rule kernels answer "is this claim justified by the SELECTED rule?". Their `invalid` therefore means "not the form that rule
 * produces", which is not a refutation of the mathematics (a correct antiderivative in another form is rejected). It is evidence of non-justification,
 * never a trusted disproof, and cannot contradict a claim that exact kernels proved.
 */
const RULE_FORM_KERNELS = new Set(["calculus:exact", "calculus:methods"]);
const ruleFormOnly = (env: AssessmentEnvelope): boolean => { const bad = env.steps.filter((s) => s.classification === "invalid"); return bad.length > 0 && bad.every((s) => RULE_FORM_KERNELS.has(s.reasoner)); };
const claimKey = (c: string) => c.replace(/\s+/g, "").toLowerCase();
const provenCount = (o?: ObligationSet) => o?.summary.proven ?? 0;

function integrityOf(reports: RouteReport[]): CertificationRecord["integrity"] & { mechanisms: Record<string, number> } {
  const mech: Record<string, number> = {}; let proven = 0, attributed = 0;
  for (const r of reports) for (const o of obligationsOf(r.env)?.obligations ?? []) if (o.kind === "derivation" && o.status === "proven") {
    proven++; const ev = o.evidence;
    if (ev?.mechanism && ev.trusted && MECHANISMS[ev.mechanism]) { attributed++; mech[ev.mechanism] = (mech[ev.mechanism] ?? 0) + 1; }
  }
  return { provenDerivations: proven, attributed, unattributed: proven - attributed, mechanisms: mech };
}

/**
 * A route can only be counted as verified when its OWN obligations say so: the answer obligation is proven, nothing on its cone is open, and every proven
 * derivation names a registered mechanism. A `verified` classification without that is a route's claim about itself, which is not evidence.
 */
export function standsOnObligations(env: AssessmentEnvelope): { ok: boolean; why: string } {
  if (env.classification !== "verified") return { ok: false, why: "not an acceptance" };
  const o = obligationsOf(env); if (!o) return { ok: false, why: "no proof obligations exist for this acceptance" };
  const ans = o.obligations[o.obligations.length - 1];
  if (!ans || ans.kind !== "answer" || ans.status !== "proven") return { ok: false, why: "the answer obligation is not proven" };
  if (o.blocking.length) return { ok: false, why: `obligation ${o.blocking[0].id} is ${o.blocking[0].status}` };
  const bad = o.obligations.find((x) => x.kind === "derivation" && x.status === "proven" && !(x.evidence?.trusted && x.evidence.mechanism && MECHANISMS[x.evidence.mechanism]));
  if (bad) return { ok: false, why: `the proof of ${bad.id} names no registered mathematical mechanism` };
  return { ok: true, why: "" };
}

/** Decide the final verdict from the certified route reports. */
export function adjudicate(reports0: RouteReport[], problem: unknown): AssessmentEnvelope {
  const reports = reports0.map((r) => { if (r.env.classification !== "verified") return r; const c = standsOnObligations(r.env); return c.ok ? r : { route: r.route, env: { ...r.env, classification: "unsupported" as Classification, correct: null, complete: false, justification: `acceptance withdrawn: ${c.why}`, outstandingObligations: [...r.env.outstandingObligations, c.why] } }; });
  const task = (problem as { task?: string } | null)?.task;
  const stamp = (env: AssessmentEnvelope, rule: string, roles: CertificationRecord["routes"], basis: string[], decision?: string): AssessmentEnvelope => {
    const { mechanisms, ...integrity } = integrityOf([{ route: "final", env }]);
    const rec: CertificationRecord = { contract: CERTIFICATION_AUTHORITY_CONTRACT, decision: decision ?? env.classification, rule, basis, routes: roles, mechanisms, integrity };
    return { ...env, certification: rec };
  };
  const role = (r: RouteReport, role: Role, reason: string) => ({ route: r.route, reported: r.env.classification, role, reason });
  if (reports.length === 1) return stamp(reports[0].env, "single-route", [role(reports[0], reports[0].env.classification === "verified" ? "accepted" : "agrees", "only route that assessed the working")], obligationsOf(reports[0].env)?.obligations.filter((o) => o.kind === "answer").map((o) => o.id) ?? []);
  const V = reports.filter((r) => r.env.classification === "verified");
  const I = reports.filter((r) => r.env.classification === "invalid");
  const O = reports.filter((r) => r.env.classification === "incomplete" || r.env.classification === "missing-assumption");
  const N = reports.filter((r) => !DEFINITE.includes(r.env.classification));
  const roles: CertificationRecord["routes"] = [];
  const done = (pick: RouteReport, rule: string, basis: string[] = []) => stamp(pick.env, rule, roles, basis);

  if (V.length) {
    const best = [...V].sort((a, b) => provenCount(obligationsOf(b.env)) - provenCount(obligationsOf(a.env)))[0];
    const provenClaims = new Map<string, ProofObligation>(); for (const r of V) for (const o of obligationsOf(r.env)?.obligations ?? []) if (o.kind === "derivation" && o.status === "proven") provenClaims.set(claimKey(o.claim), o);
    const groundedLines = new Set<number | null>();
    for (const r of V) { const os = obligationsOf(r.env)?.obligations ?? []; for (const o of os) if (o.kind === "derivation" && o.status === "proven" && os.every((g) => g.kind !== "grounding" || g.line !== o.line || g.status === "proven")) groundedLines.add(o.line); }
    for (const r of V) roles.push(role(r, r === best ? "accepted" : "agrees", r === best ? "its answer obligation is proven and nothing on its cone is open" : "independently reached the same acceptance"));
    // objections
    let standing: { r: RouteReport; why: string } | null = null;
    for (const d of [...I, ...O, ...N.filter((r) => r.env.classification === "ambiguous")]) {
      const dObs = obligationsOf(d.env);
      if (d.env.classification === "invalid" && !ruleFormOnly(d.env)) {
        const disproven = (dObs?.obligations ?? []).filter((o) => o.kind === "derivation" && o.status === "disproven");
        const clash = disproven.find((o) => provenClaims.has(claimKey(o.claim)));
        if (clash) { roles.push(role(d, "objection", `contradicts a proven claim: ${clash.claim}`)); return stamp({ ...best.env, classification: "unsupported", correct: null, complete: false, justification: `trusted mechanisms disagree about "${clash.claim}": one proved it, another disproved it, so nothing is certified`, outstandingObligations: [...best.env.outstandingObligations, `kernel disagreement about "${clash.claim}"`] }, "kernel-contradiction", roles, [clash.id]); }
        roles.push(role(d, "objection", disproven[0] ? `a trusted mechanism disproved "${disproven[0].claim}"` : "it reports the working invalid")); standing ??= { r: d, why: "disproven claim" }; continue;
      }
      const open = (dObs?.blocking ?? []);
      // a missing assumption is an explicit statement of an unmet domain requirement; an accepting route that does not model domains cannot have discharged it
      if (d.env.classification === "missing-assumption") { roles.push(role(d, "objection", open[0] ? `${open[0].kind} obligation ${open[0].id} is ${open[0].status}: ${open[0].reason}` : "it names a missing assumption")); if (!standing || standing.r.env.classification !== "invalid") standing = { r: d, why: "missing assumption" }; continue; }
      // a report that established nothing about this working (it could not read it) holds no objection: it abstains
      const informative = (dObs?.obligations ?? []).some((o) => o.kind === "derivation" && (o.status === "proven" || o.status === "disproven")) || open.some((o) => o.kind === "domain" || (o.kind === "grounding" && o.status === "unresolved"));
      // an ambiguity can only be raised by a route competent in the task's notation: the generic text route has no derivative / integral / limit / figure notation, so its "ambiguity" is a misreading of the notation
      if (d.env.classification === "ambiguous" && d.route === "base") { roles.push(role(d, "abstains", "the generic text route does not read this task's notation, while a specialised route did; its ambiguity is not an objection")); continue; }
      if (d.env.classification === "ambiguous") { roles.push(role(d, "objection", "a route competent in this notation found more than one reading; the accepting route fixed one without justification")); standing ??= { r: d, why: "ambiguous reading" }; continue; }
      if (!informative) { roles.push(role(d, "abstains", "it established nothing about this working (it could not read it), so it holds no objection")); continue; }
      // the objecting route's own answer obligation restates "the conclusion is not reached in my grammar"; the accepting route's proven answer covers that
      const covered = open.every((o) => o.kind === "answer" || (o.kind === "derivation" && o.line !== null && groundedLines.has(o.line)));
      if (covered) { roles.push(role(d, "scope-only", "everything it leaves open was proven and grounded by the accepting route")); continue; }
      roles.push(role(d, "objection", open[0] ? `${open[0].kind} obligation ${open[0].id} is ${open[0].status}: ${open[0].reason}` : `it reports the working ${d.env.classification}`));
      if (!standing || (d.env.classification === "missing-assumption" && standing.r.env.classification !== "missing-assumption" && standing.r.env.classification !== "invalid")) standing = { r: d, why: "open obligation" };
    }
    for (const r of N.filter((x) => x.env.classification !== "ambiguous")) roles.push(role(r, "abstains", "could not read or decide the working"));
    if (standing) return done(standing.r, "objection-stands", (obligationsOf(standing.r.env)?.blocking ?? []).map((o) => o.id));
    return done(best, "accepted-by-obligations", (obligationsOf(best.env)?.obligations ?? []).filter((o) => o.kind === "answer").map((o) => o.id));
  }
  for (const r of reports) roles.push(role(r, DEFINITE.includes(r.env.classification) || r.env.classification === "ambiguous" ? "agrees" : "abstains", `reported ${r.env.classification}`));
  // a missing integration constant is a missing assumption, not a refutation (D5 contract revision); it needs no disproven derivation anywhere
  if (task === "indefinite-integral") { const m = O.find((r) => r.env.classification === "missing-assumption"); if (m) return done(m, "missing-constant-contract", (obligationsOf(m.env)?.blocking ?? []).map((o) => o.id)); }
  if (I.length) return done(I[0], "disproven-claim", (obligationsOf(I[0].env)?.obligations ?? []).filter((o) => o.status === "disproven").map((o) => o.id));
  if (O.length) {
    const pick = [...O].sort((a, b) => provenCount(obligationsOf(b.env)) - provenCount(obligationsOf(a.env)) || (b.env.classification === "missing-assumption" ? 1 : 0) - (a.env.classification === "missing-assumption" ? 1 : 0))[0];
    return done(pick, "open-obligations", (obligationsOf(pick.env)?.blocking ?? []).map((o) => o.id));
  }
  const exhausted = N.find((r) => r.env.classification === "resource-exhausted"); if (exhausted) return done(exhausted, "resource-bound");
  const amb = N.find((r) => r.env.classification === "ambiguous" && r.route !== "base"); if (amb) return done(amb, "ambiguous-reading");
  // every report abstains: nothing is certified. The report shown is the specialised route that read the working (a presentation choice among non-verdicts)
  const order = ["e6", "e5", "base"]; return done([...N].sort((a, b) => order.indexOf(a.route) - order.indexOf(b.route))[0], "no-route-decided");
}
