/**
 * Program questions in the unified grading path (Phase C stage 9, D14). The fixed mathematics programs (completing the square, JEE quadratics,
 * equivalent fractions) and the foundation programs used to be marked by english-core scoreCode in the browser only: a boolean, no
 * unresolved, an unreadable answer marked wrong, never decided by the server. Now each program question has a contract
 * (semantics from its declared type, required forms from its own instruction) and is decided by the same parser, value verifier and form
 * rules as every other question, in the app and in the trusted server grader, with a grading-decision@1.
 *
 *   ids: "program:<program id>:<question id>"  and  "foundation:<program id>:<question id>"
 * Program questions are not covered by the generated-question audit: their decisions are provisional (certified: false).
 */
import completing from "../../../../content/mathematics/programs/completing-the-square.v1.json";
import fractions from "../../../../content/mathematics/programs/equivalent-fractions.v2.json";
import quadratics from "../../../../content/mathematics/programs/jee-quadratics.v1.json";
import foundation from "../../../../content/mathematics/foundation/programs.v1.json";
import { sha256Hex } from "../digest.ts";
import { judgeForm, statedRules, type FormRuleId } from "./forms.ts";
import { parseResponse, PARSER_VERSION, type Semantics } from "./parse.ts";
import { compareValues } from "./verify.ts";
import { GRADING_POLICY, type GradingDecision, type ReasonCode } from "./decision.ts";
import { CERTIFICATIONS_HASH } from "./certify.ts";

type PQ = { id: string; prompt: string; answer: string; type?: string; responseFormat?: string; options?: string[]; fields?: unknown[] };
const PROGRAMS: Record<string, { questions: PQ[] }> = {
  "completing-the-square": completing as unknown as { questions: PQ[] },
  "equivalent-fractions": fractions as unknown as { questions: PQ[] },
  "jee-quadratics": quadratics as unknown as { questions: PQ[] },
};
const FOUNDATION: Record<string, { questions: PQ[] }> = Object.fromEntries((foundation as unknown as { programs: { id: string; questions: PQ[] }[] }).programs.map((p) => [p.id, p]));

export interface ProgramContract {
  schema: "openpath-assessment@2"; questionId: string; source: { kind: "program"; program: string; question: string };
  semantics: Semantics; expected: { stored: string; canonical: string | null; value: string | null }; form: { rule: FormRuleId; instruction: string }[];
  keyAuthority: "generator-only"; status: "provisional"; inconsistencies: string[]; contractHash: string;
}

export function programQuestion(id: string): PQ | null {
  const m = /^(program|foundation):([a-z0-9-]+):([A-Za-z0-9._-]+)$/.exec(id);
  if (!m) return null;
  const set = m[1] === "program" ? PROGRAMS[m[2]] : FOUNDATION[m[2]];
  return set?.questions.find((q) => q.id === m[3]) ?? null;
}
export const isProgramQuestion = (id: string) => programQuestion(id) !== null;

function semanticsOfProgram(q: PQ): Semantics {
  const t = q.type ?? "number";
  if (t === "choice") return { kind: "choice", mixed: false, options: (q.options ?? []).length || 4 };
  // "x =", "or x =": the solutions of one equation, in any order (a multiset); labelled fields ("p", "q"): an ordered tuple
  if (t === "values") return (q.fields ?? []).slice(1).every((f) => /^or\b/i.test(String(f))) && (q.fields ?? []).length > 1 ? { kind: "roots", mixed: false } : { kind: "tuple", mixed: false };
  return { kind: "rational", mixed: false };
}

const cache = new Map<string, ProgramContract>();
export function programContract(id: string): ProgramContract | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const q = programQuestion(id);
  if (!q) return null;
  const [kind, program, question] = id.split(":");
  const semantics = semanticsOfProgram(q);
  const form = statedRules(q.prompt, semantics.kind).filter((r) => r.judgeable).map(({ rule, instruction }) => ({ rule, instruction }));
  const p = parseResponse(semantics, q.answer), inconsistencies: string[] = [];
  if (p.status !== "parsed") inconsistencies.push(`the stored answer "${q.answer}" is not read by the strict parser`);
  else {
    for (const f of form) if (judgeForm(f.rule, semantics.kind, p) === "violated") inconsistencies.push(`the stored answer violates its own form rule ${f.rule}`);
    if ((semantics.kind === "tuple" || semantics.kind === "roots") && q.fields && p.value.split(",").length !== q.fields.length) inconsistencies.push("the stored answer does not have one value per field");
  }
  const body = { schema: "openpath-assessment@2" as const, questionId: id, source: { kind: "program" as const, program: `${kind}:${program}`, question }, semantics,
    expected: { stored: q.answer, canonical: p.status === "parsed" ? p.canonical : null, value: p.status === "parsed" ? p.value : null }, form,
    keyAuthority: "generator-only" as const, status: "provisional" as const, inconsistencies };
  const c = { ...body, contractHash: sha256Hex(JSON.stringify(body)) };
  cache.set(id, c);
  return c;
}

/** THE decision for a program question (same schema, parser, verifiers and form rules as every other question) */
export function gradeProgram(id: string, raw: string, working: readonly string[] = []): GradingDecision {
  const c = programContract(id);
  const d = (verdict: GradingDecision["verdict"], reason: ReasonCode, extra: Partial<GradingDecision> = {}): GradingDecision => ({
    schema: "grading-decision@1", policy: GRADING_POLICY, questionId: id, contract: c && { schema: c.schema, hash: c.contractHash, status: c.status, keyAuthority: c.keyAuthority },
    parser: PARSER_VERSION, verifier: null, certified: false, certifications: CERTIFICATIONS_HASH, verdict, reason, response: { raw, working: [...working] },
    interpretation: null, form: null, method: { examined: false, verified: false }, diagnosis: null, ...extra,
  });
  if (!c) throw new Error(`unknown program question ${id}`);
  if (c.inconsistencies.length) return d("unresolved", "unresolved.contract-inconsistency");
  const p = parseResponse(c.semantics, raw);
  if (p.status === "ambiguous") return d("unresolved", "unresolved.ambiguous", { interpretation: { readings: p.readings } });
  if (p.status !== "parsed") return d("unresolved", "unresolved.invalid-response");
  if ((c.semantics.kind === "tuple" || c.semantics.kind === "roots") && p.value.split(",").length !== c.expected.value!.split(",").length) return d("unresolved", "unresolved.invalid-response", { interpretation: { canonical: p.canonical, value: p.value } });
  const eq = compareValues(c.semantics.kind, { canonical: p.canonical, value: p.value }, { canonical: c.expected.canonical!, value: c.expected.value! });
  const interpretation = { canonical: p.canonical, value: p.value }, verifier = `${eq.verifier.id}@${eq.verifier.version}`;
  if (eq.eq === "undecided") return d("unresolved", "unresolved.unsupported", { verifier, interpretation });
  if (eq.eq === "different") return d("incorrect", "incorrect.value", { verifier, interpretation });
  for (const f of c.form) {
    const r = judgeForm(f.rule, c.semantics.kind, p);
    if (r === "violated") return d("incorrect", "incorrect.required-form", { verifier, interpretation, form: { rule: f.rule, result: "violated" } });
    if (r === "undeterminable") return d("unresolved", "unresolved.form-undeterminable", { verifier, interpretation });
  }
  return d("correct", "correct.equal", { verifier, interpretation });
}
