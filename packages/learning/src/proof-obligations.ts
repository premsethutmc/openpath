/**
 * E7 Phase 5: per-claim proof obligations.
 *
 * For every mathematical claim of the submission the certification boundary states WHAT must be established for the claim to follow from the task
 * premises, the facts already proved and the valid assumptions, and records WHICH evidence discharged it. A route's own success status is never
 * evidence: an obligation is `proven` only by a per-claim evidence item (kernel checker + digest) bound to the claim's line. Nothing here evaluates
 * mathematics; kernels and the Phase 3/4 grounding and context supply the evidence. Obligations are expressed in the existing canonical IR.
 *
 * kinds:    derivation  the claim follows by a justified transformation from what precedes it
 *           grounding   the derivation is about the task (its numbers and symbols come from the premises / proved facts)
 *           domain      a student-introduced assumption is compatible with, and does not silently change, the task
 *           answer      the submission's conclusion states the requested quantity
 * status:   proven | disproven | unresolved | unsupported
 * Only `proven` obligations whose dependencies are proven enter the proved-fact context; unresolved, unsupported and disproven ones never do.
 */
import { canonicalizeMathematicalObject, type CanonicalMathematicalObject } from "./canonical-math-ir.ts";
import { attribute, type Provenance } from "./evidence-provenance.ts";
import { evidenceBinds, claimIdentity } from "./evidence-binding.ts";

export const PROOF_OBLIGATION_CONTRACT = "openpath-proof-obligation@1" as const;
export type ObligationKind = "derivation" | "grounding" | "domain" | "answer";
export type ObligationStatus = "proven" | "disproven" | "unresolved" | "unsupported";
export interface ProofObligation {
  id: string; kind: ObligationKind; line: number | null; claim: string; statement: string; status: ObligationStatus; reason: string;
  evidence: { checker: string; scope: string; digest: string | null; detail: string; /** E7 Phase 6: the registered mechanism / kernel that established the claim (never inferred from the label alone) */ mechanism: string | null; kernel: string | null; trusted: boolean; /** E7 repair A: the evidence was checked to establish THIS claim (identity / contained claim text) under the certifier's premises; absent for internal (context) evidence */ bound?: boolean; claimIdentity?: string | null } | null;
  dependsOn: string[]; conditionalOn: string[];
  /** the route certifies this claim only in aggregate (no per-claim evidence exists for the route): reported, never counted as proof */
  aggregateOnly?: boolean;
  canonical: CanonicalMathematicalObject;
}
export interface ObligationInput {
  text: string;
  claims: { line: number; start: number; end: number; text: string; kind: string; outcome: string; reason: string }[];
  relations: { line: number; text: string; relation: string; obligation: string | null; blocking?: boolean }[];
  records: { role?: string; text?: string; id: string; line: number; span: { start: number; end: number }; status: string; dependencies: string[]; premiseEligible: boolean; reason: string }[];
  evidence: { line: number | null; claim: string; checker: string; scope: string; outcome: string; digest?: string | null; claimIdentity?: string | null; premises?: string | null }[];
  /** digest of the task premises the certifier computed itself from the problem (evidence produced under other premises is not evidence) */
  taskDigest?: string | null;
  grounded: { line: number; grounding: { required?: boolean; relevant: boolean; reason: string; sources: { kind: string; ref: string }[] } }[];
  verdict: { classification: string; complete: boolean; independentlyVerified: boolean; route: string; justification: string };
  /** reasoner ids that took part in the assessment: evidence attribution requires the producing route to be among them */
  reasoners?: string[];
}
export interface ObligationSet { contract: typeof PROOF_OBLIGATION_CONTRACT; obligations: ProofObligation[]; proved: { ref: string; text: string }[]; summary: { total: number; proven: number; disproven: number; unresolved: number; unsupported: number; aggregateOnly: number }; blocking: ProofObligation[] }

const SCOPE_CLAIM = /\b(?:for\s+(?:all|every|any|each)\s+(?:real\s+)?(?:\w+\b|number)|everywhere|on\s+the\s+(?:whole|entire)\s+(?:domain|real\s+line)|holds\s+always|in\s+general)\b/i;

export function internalEv(checker: string, scope: string, digest: string | null, detail: string): NonNullable<ProofObligation["evidence"]> {
  const pv = attribute(checker, "natural-other", []);
  return { checker, scope, digest, detail, mechanism: pv.mechanism, kernel: pv.kernel, trusted: pv.trusted };
}

export function make(id: string, kind: ObligationKind, line: number | null, claim: string, statement: string, status: ObligationStatus, reason: string, evidence: ProofObligation["evidence"], dependsOn: string[], conditionalOn: string[], aggregateOnly = false): ProofObligation {
  const canonical = canonicalizeMathematicalObject({
    mathematicalType: "proof-obligation", value: { kind, line, claim },
    dependencies: dependsOn, assumptions: conditionalOn,
    outstandingObligations: status === "proven" ? [] : [`${status}: ${reason}`],
    verificationStatus: status === "proven" ? (conditionalOn.length ? "conditional" : "verified") : "unverified",
  });
  return { id, kind, line, claim, statement, status, reason, evidence, dependsOn, conditionalOn, ...(aggregateOnly ? { aggregateOnly: true } : {}), canonical };
}

export function buildObligations(inp: ObligationInput): ObligationSet {
  const out: ProofObligation[] = []; const byLineDeriv = new Map<number, ProofObligation>(); const byRecordDeriv = new Map<string, ProofObligation>();
  const perClaim = inp.evidence.some((e) => e.line !== null);
  // narrowing assumptions that are disclosed scoping choices make everything after them conditional (a legitimate conditional derivation)
  const scoping = inp.relations.filter((r) => r.relation === "narrows" && r.blocking === false);
  // a mathematical line the ledger recognised no claim in (a bare expression step) is still a step of the proof: its own record is the claim
  const covered = new Set(inp.claims.map((c) => c.line));
  const synth = inp.records.filter((r) => (r.role === "claim-step" || r.role === "given-matched") && !covered.has(r.line) && r.text)
    .map((r) => ({ line: r.line, start: r.span.start, end: r.span.end, text: r.text!, kind: "relation", outcome: r.status === "verified-valid" ? "proven" : r.status === "verified-invalid" ? "disproven" : r.status === "incomplete" ? "unresolved" : "unsupported", reason: r.reason }));
  const allClaims = [...inp.claims, ...synth].sort((a, b) => a.line - b.line || a.start - b.start);
  for (const c of allClaims) {
    if (c.kind === "assumption") {
      const rel = inp.relations.find((r) => r.line === c.line && r.text === c.text);
      const st: ObligationStatus = c.outcome === "proven" ? "proven" : c.outcome === "disproven" ? "disproven" : c.outcome === "unresolved" ? "unresolved" : "unsupported";
      out.push(make(`ob:${out.length}`, "domain", c.line, c.text, `the student assumption "${c.text}" is compatible with the task and does not silently change it`, st, rel?.obligation ?? c.reason, st === "proven" ? internalEv("proof-context", "classification against the immutable task domain (branches kept as alternatives)", null, c.reason) : null, [], []));
      continue;
    }
    const rec = inp.records.find((r) => r.line === c.line && r.span.start < c.end && c.start < r.span.end) ?? inp.records.find((r) => r.line === c.line);
    const deps = (rec?.dependencies ?? []).map((d) => byRecordDeriv.get(d)).filter((x): x is ProofObligation => !!x);
    const cond = scoping.filter((s) => s.line < c.line).map((s) => s.text);
    let status: ObligationStatus, reason = c.reason, evidence: ProofObligation["evidence"] = null, aggregate = false;
    const rs = rec?.status;
    if (c.outcome === "disproven" && (!rec || rs === "verified-invalid")) status = "disproven";
    else if (c.outcome !== "proven") { // the status is the record's own: a line that was never checked is not disproven
      status = rs === "verified-invalid" ? "disproven" : rs === "incomplete" || rs === "inconclusive" || c.outcome === "unresolved" ? "unresolved" : "unsupported";
      if (c.outcome === "disproven" && rs !== "verified-invalid") { const first = inp.records.find((r) => r.status === "verified-invalid"); if (first && first.line < c.line) { status = "unresolved"; reason = `it comes after line ${first.line}, which is disproven; this line was not independently checked`; } }
    }
    else {
      if (rec?.role === "given-matched" && rec.status === "verified-valid") { status = "proven"; evidence = internalEv("problem-data-match", rec.reason || "the line restates the typed task data", null, "restates a task premise (matched to the problem's canonical data)"); }
      const onLine = status === "proven" ? [] : inp.evidence.filter((e) => e.line === c.line && (e.outcome === "verified" || e.outcome === "verified-valid"));
      // E7 repair A: evidence is bound to the CLAIM, not to its line number: it must establish this claim under the certifier's premises
      let ev: (typeof onLine)[number] | undefined, bindWhy = "";
      for (const e of onLine) { const b = evidenceBinds(e, c.text, inp.taskDigest); if (b.ok) { ev = e; break; } bindWhy ||= b.reason; }
      if (status === "proven") { /* discharged by matching the task's own data */ }
      else if (ev) {
        const pv: Provenance = attribute(ev.checker, inp.verdict.route, inp.reasoners ?? [], c.text);
        if (pv.trusted && (pv.kind !== "internal")) { status = "proven"; evidence = { checker: ev.checker, scope: ev.scope, digest: ev.digest ?? null, detail: ev.claim, mechanism: pv.mechanism, kernel: pv.kernel, trusted: true, bound: true, claimIdentity: ev.claimIdentity ?? claimIdentity(c.text) }; }
        else { status = "unsupported"; reason = `the evidence for this line is not attributable to a trusted mathematical mechanism: ${pv.reason}`; }
      }
      else if (onLine.length) { status = "unsupported"; reason = `evidence exists on this line but does not establish this claim: ${bindWhy}`; }
      else if (perClaim) { status = "unsupported"; reason = "the route reports this line verified but recorded no independent per-claim evidence for it"; }
      else { status = "unsupported"; aggregate = true; reason = "the route certifies this submission in aggregate only; no per-claim evidence exists for this claim"; }
    }
    const bad = deps.find((d) => d.status !== "proven");
    // E7 repair D: a claim that rests on a premise line which is not about the task (an ungrounded line) inherits that gap; a derivation is only as grounded as what it rests on
    const gbadDep = deps.map((d) => out.find((x) => x.kind === "grounding" && x.line === d.line)).find((x) => x && x.status !== "proven" && inp.grounded.some((gg) => gg.line === x.line && !gg.grounding.relevant && gg.grounding.sources.some((q) => q.kind === "task-premise" || q.kind === "derived-fact"))); // a line wholly unrelated to the task is a side claim, not a premise of what follows
    if (status === "proven" && bad) { status = "unresolved"; reason = `it depends on ${bad.id} (line ${bad.line}), which is ${bad.status}`; evidence = null; }
    else if (status === "proven" && gbadDep) { status = "unresolved"; reason = `it rests on line ${gbadDep.line}, whose numbers are not shown to come from the task (${gbadDep.reason})`; evidence = null; }
    const o = make(`ob:${out.length}`, "derivation", c.line, c.text, `"${c.text}" follows from the task premises and the facts already proved by a justified transformation`, status, reason, evidence, deps.map((d) => d.id), cond, aggregate);
    out.push(o); byLineDeriv.set(c.line, o); if (rec) byRecordDeriv.set(rec.id, o);
    // grounding: only where a route computed it (the exact number-chain checker); its sources on earlier lines are dependencies
    const g = inp.grounded.find((x) => x.line === c.line)?.grounding;
    if (g && g.required !== false) {
      const gdeps = g.sources.filter((s) => s.kind === "derived-fact" && /^line-\d+$/.test(s.ref)).map((s) => byLineDeriv.get(Number(s.ref.slice(5)))).filter((x): x is ProofObligation => !!x);
      const gbad = gdeps.find((d) => d.status !== "proven");
      const gs: ObligationStatus = !g.relevant ? "unresolved" : gbad ? "unresolved" : "proven";
      out.push(make(`ob:${out.length}`, "grounding", c.line, c.text, `"${c.text}" is about the task: its numbers and symbols come from the premises or from proved facts`, gs, !g.relevant ? g.reason : gbad ? `it rests on ${gbad.id}, which is ${gbad.status}` : g.reason, gs === "proven" ? internalEv("grounding", "claim-grounding@1 over the task premises and proved facts", null, g.reason) : null, [o.id, ...gdeps.map((d) => d.id)], cond));
    }
  }
  // a student claim about the WHOLE domain after a disclosed narrowing is not covered by the conditional derivation
  if (scoping.length) {
    const lines = inp.text.split("\n");
    lines.forEach((l, i) => { if (i + 1 > Math.min(...scoping.map((s) => s.line)) && SCOPE_CLAIM.test(l) && !scoping.some((s) => s.line === i + 1)) out.push(make(`ob:${out.length}`, "domain", i + 1, l.trim(), `a claim about the whole domain is justified although the derivation assumed "${scoping[0].text}"`, "unresolved", `the derivation was conditional on "${scoping[0].text}", which the task does not give; it does not establish a statement for the entire domain`, null, [], [])); });
  }
  // the conclusion answers the requested quantity: only the final claim's own obligations (and the route's completeness) can say so
  const claimObs = out.filter((o) => o.kind === "derivation");
  const last = claimObs[claimObs.length - 1];
  const lastG = last ? out.find((o) => o.kind === "grounding" && o.line === last.line) : undefined;
  const v = inp.verdict;
  const ansStatus: ObligationStatus = v.classification !== "verified" ? (v.classification === "invalid" ? "disproven" : "unresolved") : last && last.status === "proven" && (!lastG || lastG.status === "proven") && v.complete ? "proven" : (last?.aggregateOnly ? "unsupported" : "unresolved");
  out.push(make(`ob:${out.length}`, "answer", last?.line ?? null, last?.claim ?? "", "the conclusion states the requested quantity, derived from the task", ansStatus, v.classification === "verified" ? (ansStatus === "proven" ? "the final claim is proven" + (lastG ? " and grounded" : "") + " and the route's completeness authority confirms it states the requested quantity" : "the final claim's obligations are not all proven") : v.justification,
    ansStatus === "proven" ? internalEv("completeness", "completeness authority of the accepting route over the final proven claim", last?.evidence?.digest ?? null, `${v.route}: ${v.justification}`) : null, last ? [last.id, ...(lastG ? [lastG.id] : [])] : [], last?.conditionalOn ?? []));
  return assemble(out);
}

/** proved facts, summary and the answer's dependency cone for an assembled obligation list (the last obligation is the answer) */
export function assemble(out: ProofObligation[]): ObligationSet {
  const proved: { ref: string; text: string }[] = [];
  for (const o of out) if (o.kind === "derivation" && o.status === "proven") {
    const g = out.find((x) => x.kind === "grounding" && x.line === o.line);
    if (!g || g.status === "proven") proved.push({ ref: `line-${o.line}`, text: o.claim });
  }
  const count = (s: ObligationStatus) => out.filter((o) => o.status === s).length;
  // only what the conclusion DEPENDS ON can block it: an unrelated true side fact that is not grounded stays reported (and is never a proved fact), but it is not on the proof path
  const ans = out[out.length - 1], byId = new Map(out.map((o) => [o.id, o])), cone = new Set<string>(); const stack = [ans.id];
  while (stack.length) { const id = stack.pop()!; if (cone.has(id)) continue; cone.add(id); for (const d of byId.get(id)?.dependsOn ?? []) stack.push(d); }
  const blocking = out.filter((o) => o.status !== "proven" && !o.aggregateOnly && (o.kind === "domain" || o.kind === "answer" || cone.has(o.id)));
  return { contract: PROOF_OBLIGATION_CONTRACT, obligations: out, proved, summary: { total: out.length, proven: count("proven"), disproven: count("disproven"), unresolved: count("unresolved"), unsupported: count("unsupported"), aggregateOnly: out.filter((o) => o.aggregateOnly).length }, blocking };
}
