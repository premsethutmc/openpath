/**
 * Essay benchmark scorer (Essay Intelligence v2).
 *
 * Runs an essay evaluator over content/english/essay/benchmark/essay-benchmark-v1.json, puts every answer through
 * the same validation the app uses (validateObservations / validateRewrite), and compares what survives with the
 * benchmark's SYNTHETIC reference annotations. The annotations are not educator-validated, so every number here
 * is agreement with one synthetic reference, not with teachers.
 *
 *   node tools/english/essay-benchmark.ts                       reference sanity check + pattern stand-in
 *   node tools/english/essay-benchmark.ts --recorded FILE       also score recorded outputs (e.g. from the server's
 *                                                               LLM evaluator): { evaluator:{id,version,model},
 *                                                               observations:{essayId: raw}, rewrites:{rewriteId: raw} }
 *   node tools/english/essay-benchmark.ts --requests            print the essay-observe.v2 / essay-rewrite.v2 requests
 *                                                               (to send through the server and record the answers)
 *   node tools/english/essay-benchmark.ts --md                  Markdown report instead of JSON
 *
 * Metrics (errors and style suggestions are scored separately; strengths are reported, not scored):
 *   precision      accepted error observations that match a reference annotation / all accepted error observations
 *   recall         required reference errors matched / required reference errors (optional = ambiguous, not counted)
 *   unsupported    observations the validator rejected (invented quotes, unknown competencies, malformed, contradictory)
 *   valid-text FP  error observations on text the reference marks as correct or a valid alternative
 *   agreement      essay × competency: "the essay shows an error in this competency" yes/no, percent agreement and
 *                  Cohen's kappa; cells where the reference is only optional are left out
 * A match is: an overlapping span, the annotation's competency (or one it also accepts) and an accepted kind.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildObservationRequest,
  buildRewriteRequest,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  type EssayEvaluator,
  type EssaySubmission,
  type EvaluatorRef,
  fingerprint,
  patternEssayEvaluator,
  type RewriteSubmission,
  validateObservations,
  validateRewrite,
  wordCount,
} from "../../packages/english-core/src/index.ts";
import { loadEssayContext } from "./essay-load.ts";
import { CONTENT } from "./load.ts";

export const BENCHMARK_FILE = join(CONTENT, "essay", "benchmark", "essay-benchmark-v1.json");

interface Annotation {
  competency: string;
  kind: "error" | "style" | "strength";
  quote: string;
  note: string;
  misconception?: string;
  optional?: boolean;
  slip?: boolean;
  acceptAlso?: string[];
  acceptKinds?: string[];
}
interface BenchEssay {
  id: string;
  focus: string[];
  prompt: string;
  text: string;
  words: number;
  annotations: Annotation[];
  must_not_flag: { quote: string; why: string }[];
}
interface BenchRewrite {
  id: string;
  essay: string;
  text: string;
  words: number;
  reference: Record<string, string>;
}
export interface Benchmark {
  id: string;
  version: number;
  rubric: string;
  status: string;
  provenance: string;
  essays: BenchEssay[];
  rewrites: BenchRewrite[];
}

export const loadBenchmark = (path = BENCHMARK_FILE): Benchmark => JSON.parse(readFileSync(path, "utf8")) as Benchmark;

const ectx = loadEssayContext();
const AT = "2026-10-18T09:00:00.000Z";

function submission(e: BenchEssay): EssaySubmission {
  return {
    contract: "essay-contract@1",
    id: e.id,
    learner: "benchmark",
    session: "benchmark",
    at: AT,
    text: e.text,
    words: wordCount(e.text),
    fingerprint: fingerprint(e.text),
    source: { kind: "synthetic", prompt: e.prompt, grade: 8, profile: ectx.profile.key, dataUse: "synthetic_test" },
  } as EssaySubmission;
}

function rewriteSubmission(r: BenchRewrite): RewriteSubmission {
  return { contract: "essay-contract@1", id: r.id, essay: r.essay, at: AT, session: "benchmark", text: r.text, words: wordCount(r.text), limit: ectx.policy.rewriteLimit } as RewriteSubmission;
}

/** Where a quote sits in the text (case- and space-insensitive), or null. */
function locate(text: string, quote: string): [number, number] | null {
  const norm = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase();
  const i = norm(text).indexOf(norm(quote).replace(/\s+/g, " ").trim());
  return i < 0 ? null : [i, i + quote.trim().length];
}

/** The reference annotations as a v2 evaluator answer: scoring it must give perfect agreement (a scorer check). */
export function referenceEvaluator(b: Benchmark): EssayEvaluator {
  return {
    id: "benchmark-reference",
    version: `v${b.version}`,
    model: "synthetic-annotations",
    protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
    async observe(req) {
      const e = b.essays.find((x) => x.id === req.essay.id)!;
      return {
        essay_id: e.id,
        rubric: b.rubric,
        observations: e.annotations.map((a) => ({
          competency: a.competency,
          kind: a.kind,
          quote: a.quote,
          explanation: a.note,
          ...(a.kind === "error" ? { correction: `(corrected) ${a.quote}` } : {}),
          ...(a.misconception ? { misconception: a.misconception } : {}),
          confidence: a.optional ? "low" : "high",
          verification: a.kind === "error" ? "required" : "not_required",
          ...(a.slip ? { possible_slip: true } : {}),
        })),
        not_observable: [],
      };
    },
    async rewrite() {
      throw new Error("the reference has rewrite ratings, not quoted judgements");
    },
  };
}

/** Recorded raw outputs, keyed by essay id and rewrite id. */
export function recordedEvaluator(file: string): EssayEvaluator {
  const r = JSON.parse(readFileSync(file, "utf8")) as { evaluator: { id: string; version: string; model?: string }; observations?: Record<string, unknown>; rewrites?: Record<string, unknown> };
  return {
    ...r.evaluator,
    protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
    async observe(req) {
      if (!r.observations || !(req.essay.id in r.observations)) throw new Error(`no recorded output for ${req.essay.id}`);
      return r.observations[req.essay.id];
    },
    async rewrite(req) {
      if (!r.rewrites || !(req.rewrite.id in r.rewrites)) throw new Error(`no recorded output for ${req.rewrite.id}`);
      return r.rewrites[req.rewrite.id];
    },
  };
}

const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : null);

function kappa(pairs: [boolean, boolean][]): { agreement: number | null; kappa: number | null; cells: number } {
  const n = pairs.length;
  if (!n) return { agreement: null, kappa: null, cells: 0 };
  const agree = pairs.filter(([a, b]) => a === b).length / n;
  const pa = pairs.filter(([a]) => a).length / n;
  const pb = pairs.filter(([, b]) => b).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return { agreement: Math.round(agree * 1000) / 1000, kappa: pe === 1 ? null : Math.round(((agree - pe) / (1 - pe)) * 1000) / 1000, cells: n };
}

export async function score(b: Benchmark, evaluator: EssayEvaluator) {
  const protocol = evaluator.protocols?.observe ?? "essay-observe.v1";
  const ref: EvaluatorRef = { id: evaluator.id, version: evaluator.version, protocol, ...(evaluator.model ? { model: evaluator.model } : {}), ...(protocol === ESSAY_OBSERVE_PROTOCOL_V2 ? { rubric: ectx.profile.key } : {}) };
  const t = { errTP: 0, errFP: 0, reqErr: 0, reqErrHit: 0, optErrHit: 0, styTP: 0, styFP: 0, reqSty: 0, reqStyHit: 0, strengths: 0, strengthsMatched: 0, rejected: 0, proposed: 0, validTextFP: 0, cleanEssayErrors: 0, failedEssays: 0, slipsMarked: 0, slips: 0 };
  const cells: [boolean, boolean][] = [];
  const perEssay: { id: string; status: string; accepted: number; rejected: number; missed: string[]; unmatched: string[]; rejections: string[] }[] = [];
  for (const e of b.essays) {
    const sub = submission(e);
    let analysis;
    try {
      analysis = validateObservations(ectx, sub, await evaluator.observe(buildObservationRequest(ectx, sub, protocol)), ref, `bench:${e.id}`);
    } catch (err) {
      analysis = { status: "failed", observations: [], rejected: [], reasons: [String((err as Error).message)] };
    }
    if (analysis.status !== "accepted") t.failedEssays++;
    t.rejected += analysis.rejected.length;
    t.proposed += analysis.observations.length + analysis.rejected.filter((r) => r.index >= 0).length;
    const hit = new Set<number>();
    const unmatched: string[] = [];
    const flagged = new Set<string>();
    for (const o of analysis.observations) {
      const span: [number, number] = [o.span.start, o.span.end];
      const i = e.annotations.findIndex((a, j) => {
        const at = locate(e.text, a.quote);
        const kinds = a.acceptKinds ?? [a.kind];
        return !hit.has(j) && at && at[0] < span[1] && span[0] < at[1] && [a.competency, ...(a.acceptAlso ?? [])].includes(o.competency) && kinds.includes(o.kind);
      });
      const a = i >= 0 ? e.annotations[i] : null;
      if (a) hit.add(i);
      if (o.kind === "strength") {
        t.strengths++;
        if (a) t.strengthsMatched++;
        continue;
      }
      if (a?.kind === "style") t.styTP++; // a style annotation reported as an error still marks the same place
      else if (o.kind === "error") {
        a ? t.errTP++ : t.errFP++;
        flagged.add(a ? a.competency : o.competency);
        if (a?.slip) t.slipsMarked += o.possibleSlip ? 1 : 0;
      } else a ? t.styTP++ : t.styFP++;
      if (!a) unmatched.push(`${o.kind} ${o.competency} "${o.span.quote}"`);
      if (o.kind === "error" && !a && e.must_not_flag.some((n) => { const at = locate(e.text, n.quote); return at && at[0] < span[1] && span[0] < at[1]; })) t.validTextFP++;
      if (o.kind === "error" && !e.annotations.some((x) => x.kind !== "strength")) t.cleanEssayErrors++;
    }
    const missed: string[] = [];
    e.annotations.forEach((a, j) => {
      if (a.slip) t.slips++;
      const isErr = a.kind === "error" && !(a.acceptKinds ?? []).includes("style");
      if (a.optional) {
        if (hit.has(j) && isErr) t.optErrHit++;
        return;
      }
      if (a.kind === "strength") return;
      if (isErr) {
        t.reqErr++;
        if (hit.has(j)) t.reqErrHit++;
      } else {
        t.reqSty++;
        if (hit.has(j)) t.reqStyHit++;
      }
      if (!hit.has(j)) missed.push(`${a.kind} ${a.competency} "${a.quote}"`);
    });
    // competency-level agreement: does the essay show an error in this competency?
    for (const c of ectx.profile.profile.competencies) {
      const anns = e.annotations.filter((a) => a.competency === c.capability && a.kind === "error" && !(a.acceptKinds ?? []).includes("style"));
      const required = anns.some((a) => !a.optional);
      if (!required && anns.length) continue; // only ambiguous annotations: left out
      cells.push([required, flagged.has(c.capability)]);
    }
    perEssay.push({ id: e.id, status: analysis.status, accepted: analysis.observations.length, rejected: analysis.rejected.length, missed, unmatched, rejections: analysis.rejected.map((r) => r.reason) });
  }

  // rewrites: per-dimension agreement with the reference rating (exact, and within one step)
  const steps = ["not_yet", "partly", "mostly", "fully"];
  const rw = { judged: 0, dims: 0, exact: 0, withinOne: 0, notMeasured: 0, rejectedDims: 0 };
  const rewriteRef: EvaluatorRef = { id: evaluator.id, version: evaluator.version, protocol: evaluator.protocols?.rewrite ?? "essay-rewrite.v1", ...(evaluator.model ? { model: evaluator.model } : {}) };
  for (const r of b.rewrites) {
    const original = submission(b.essays.find((e) => e.id === r.essay)!);
    const rs = rewriteSubmission(r);
    let raw: unknown;
    try {
      raw = await evaluator.rewrite(buildRewriteRequest(original, rs, rewriteRef.protocol as never, ectx.profile.key));
    } catch {
      rw.notMeasured++;
      continue;
    }
    const ev = validateRewrite(ectx, original, rs, raw, rewriteRef);
    rw.judged++;
    for (const d of ev.dimensions) {
      rw.dims++;
      if (d.rating === null) {
        rw.rejectedDims++;
        continue;
      }
      const diff = Math.abs(steps.indexOf(d.rating) - steps.indexOf(r.reference[d.dimension]));
      if (diff === 0) rw.exact++;
      if (diff <= 1) rw.withinOne++;
    }
  }

  return {
    evaluator: { id: evaluator.id, version: evaluator.version, model: evaluator.model ?? null, protocol },
    benchmark: `${b.id}@${b.version}`,
    essays: b.essays.length,
    errors: { precision: ratio(t.errTP, t.errTP + t.errFP), recall: ratio(t.reqErrHit, t.reqErr), matched: t.errTP, unmatched: t.errFP, required: t.reqErr, requiredMatched: t.reqErrHit, optionalMatched: t.optErrHit },
    style: { precision: ratio(t.styTP, t.styTP + t.styFP), recall: ratio(t.reqStyHit, t.reqSty), required: t.reqSty },
    strengths: { proposed: t.strengths, matchedReference: t.strengthsMatched },
    unsupported: { rejected: t.rejected, proposed: t.proposed, rate: ratio(t.rejected, t.proposed), essaysNotAccepted: t.failedEssays },
    validText: { errorsOnValidText: t.validTextFP, errorsOnCleanEssays: t.cleanEssayErrors },
    slips: { reference: t.slips, markedPossibleSlip: t.slipsMarked },
    competencyAgreement: kappa(cells),
    rewrites: rw.judged ? { judged: rw.judged, dimensions: rw.dims, exact: ratio(rw.exact, rw.dims - rw.rejectedDims), withinOne: ratio(rw.withinOne, rw.dims - rw.rejectedDims), rejectedDimensions: rw.rejectedDims } : { judged: 0, note: "not measured: this evaluator does not judge rewrites" },
    perEssay,
  };
}

function markdown(b: Benchmark, results: Awaited<ReturnType<typeof score>>[]): string {
  const f = (x: number | null | undefined) => (x === null || x === undefined ? "–" : x.toFixed(2));
  const rows = results.map((r) => {
    const rwText = "exact" in r.rewrites ? `${f(r.rewrites.exact)} exact / ${f(r.rewrites.withinOne)} within one` : "not measured";
    return `| ${r.evaluator.id}@${r.evaluator.version} | ${f(r.errors.precision)} | ${f(r.errors.recall)} (${r.errors.requiredMatched}/${r.errors.required}) | ${f(r.style.recall)} | ${r.unsupported.rejected} of ${r.unsupported.proposed} | ${r.validText.errorsOnValidText} / ${r.validText.errorsOnCleanEssays} | ${f(r.competencyAgreement.agreement)} / κ ${f(r.competencyAgreement.kappa)} | ${rwText} |`;
  });
  return [
    `Benchmark ${b.id}@${b.version} (${b.essays.length} essays, ${b.rewrites.length} rewrites). Status: **${b.status}**. ${b.provenance}`,
    "",
    "| Evaluator | Error precision | Error recall | Style recall | Rejected by validation | Errors on valid text / clean essays | Competency agreement | Rewrite ratings |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

const argv = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const b = loadBenchmark();
  if (argv.includes("--requests")) {
    const out = {
      observe: b.essays.map((e) => buildObservationRequest(ectx, submission(e), ESSAY_OBSERVE_PROTOCOL_V2)),
      rewrite: b.rewrites.map((r) => buildRewriteRequest(submission(b.essays.find((e) => e.id === r.essay)!), rewriteSubmission(r), ESSAY_REWRITE_PROTOCOL_V2, ectx.profile.key)),
    };
    console.log(JSON.stringify(out, null, 1));
  } else {
    const evaluators: EssayEvaluator[] = [referenceEvaluator(b), patternEssayEvaluator()];
    const rec = argv.indexOf("--recorded");
    if (rec >= 0) evaluators.push(recordedEvaluator(argv[rec + 1]));
    const results = [];
    for (const e of evaluators) results.push(await score(b, e));
    console.log(argv.includes("--md") ? markdown(b, results) : JSON.stringify(results, null, 1));
  }
}
