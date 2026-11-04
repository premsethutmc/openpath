/**
 * Scoring independent annotations of the synthetic essay benchmark (educator validation v1).
 *
 *   node tools/english/educator/annotation-score.ts vs-reference <annotations.csv> [--ratings <ratings.csv>] [--md]
 *        each annotator against the benchmark's synthetic reference
 *   node tools/english/educator/annotation-score.ts agreement <annotations.csv> [--ratings <ratings.csv>] [--md]
 *        each pair of annotators against each other (independent annotation agreement)
 *
 * Annotation CSV (one row per mark; see essay-validation-v1/ANNOTATION_GUIDE.md):
 *   annotator_id, essay_id, quote, competency_id, kind (error | style | strength | ambiguous), correction, note
 * Ratings CSV: annotator_id, rewrite_id, dimension, rating (not_yet | partly | mostly | fully), note
 *
 * Metrics, on the same definitions as the benchmark scorer (tools/english/essay-benchmark.ts):
 *   precision        marked errors that match a reference error / all marked errors
 *   recall           required reference errors that were marked / required reference errors ("ambiguous" = optional)
 *   false positives  errors marked on text the reference lists as correct or a valid alternative (must_not_flag)
 *   agreement        essay × competency "shows an error" yes/no: percent agreement and Cohen's kappa
 *   rewrite ratings  exact agreement and agreement within one step, per dimension
 * A match: overlapping words, the same competency (or one the reference also accepts) and a compatible kind.
 *
 * The deterministic system baseline (the pattern stand-in) stays in content/english/essay/benchmark/results-v1.json;
 * no LLM accuracy is reported until a model has actually been run.
 */
import { readFileSync } from "node:fs";
import { loadBenchmark, type Benchmark } from "../essay-benchmark.ts";
import { parseCsv } from "../pilot/review.ts";

export interface Mark {
  annotator: string;
  essay: string;
  quote: string;
  competency: string;
  kind: "error" | "style" | "strength" | "ambiguous";
  correction: string;
  note: string;
}
interface RefAnn {
  competency: string;
  kind: string;
  quote: string;
  optional?: boolean;
  acceptAlso?: string[];
  acceptKinds?: string[];
}
export interface Rating {
  annotator: string;
  rewrite: string;
  dimension: string;
  rating: string;
}

const STEPS = ["not_yet", "partly", "mostly", "fully"];

function table(csv: string, required: string[]): Record<string, string>[] {
  const t = parseCsv(csv);
  const h = (t[0] ?? []).map((x) => x.trim());
  for (const r of required) if (!h.includes(r)) throw new Error(`missing column "${r}"`);
  return t.slice(1).map((row) => Object.fromEntries(h.map((k, i) => [k, (row[i] ?? "").trim()])));
}

export function readMarks(csv: string, b: Benchmark): { marks: Mark[]; problems: string[] } {
  const rows = table(csv, ["annotator_id", "essay_id", "quote", "competency_id", "kind"]);
  const problems: string[] = [];
  const marks: Mark[] = [];
  rows.forEach((r, k) => {
    const essay = b.essays.find((e) => e.id === r.essay_id);
    const line = `row ${k + 2}`;
    if (!r.annotator_id) return problems.push(`${line}: annotator_id is required`);
    if (!essay) return problems.push(`${line}: unknown essay ${r.essay_id}`);
    if (!["error", "style", "strength", "ambiguous"].includes(r.kind)) return problems.push(`${line}: kind must be error, style, strength or ambiguous`);
    if (!locate(essay.text, r.quote)) return problems.push(`${line}: the quote is not found word for word in ${r.essay_id}: "${r.quote}"`);
    marks.push({ annotator: r.annotator_id, essay: r.essay_id, quote: r.quote, competency: r.competency_id, kind: r.kind as Mark["kind"], correction: r.correction ?? "", note: r.note ?? "" });
  });
  return { marks, problems };
}

export function readRatings(csv: string): Rating[] {
  return table(csv, ["annotator_id", "rewrite_id", "dimension", "rating"])
    .filter((r) => STEPS.includes(r.rating))
    .map((r) => ({ annotator: r.annotator_id, rewrite: r.rewrite_id, dimension: r.dimension, rating: r.rating }));
}

function locate(text: string, quote: string): [number, number] | null {
  const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/\s+/g, " ").toLowerCase();
  const q = norm(quote).trim();
  if (!q) return null;
  const i = norm(text).indexOf(q);
  return i < 0 ? null : [i, i + q.length];
}
const overlap = (a: [number, number] | null, b: [number, number] | null) => !!a && !!b && a[0] < b[1] && b[0] < a[1];

/** Marks as reference annotations (an annotator's "ambiguous" is optional; any kind of a pair may then match). */
const asRef = (m: Mark): RefAnn => (m.kind === "ambiguous" ? { competency: m.competency, kind: "error", quote: m.quote, optional: true, acceptKinds: ["error", "style"] } : { competency: m.competency, kind: m.kind, quote: m.quote });

interface Counts {
  matched: number;
  marked: number;
  requiredHit: number;
  required: number;
  validTextFP: number;
  cells: [boolean, boolean][];
}

/** Compare one set of marks (system side) against reference annotations, essay by essay. */
function compare(b: Benchmark, sys: (essay: string) => Mark[], ref: (essay: string) => { anns: RefAnn[]; mustNot: string[] }, competencies: string[]): Counts {
  const c: Counts = { matched: 0, marked: 0, requiredHit: 0, required: 0, validTextFP: 0, cells: [] };
  for (const e of b.essays) {
    const { anns, mustNot } = ref(e.id);
    const hit = new Set<number>();
    const flagged = new Set<string>();
    for (const m of sys(e.id).filter((x) => x.kind === "error" || x.kind === "ambiguous")) {
      const span = locate(e.text, m.quote);
      const i = anns.findIndex((a, j) => !hit.has(j) && overlap(locate(e.text, a.quote), span) && [a.competency, ...(a.acceptAlso ?? [])].includes(m.competency) && (a.acceptKinds ?? [a.kind]).includes("error"));
      if (m.kind === "ambiguous" && i < 0) continue; // an unmatched ambiguous mark is not counted against anyone
      c.marked++;
      if (i >= 0) {
        hit.add(i);
        c.matched++;
        // a match on a style annotation that also accepts "error" is not an error in that competency
        if (anns[i].kind === "error" && !(anns[i].acceptKinds ?? []).includes("style")) flagged.add(anns[i].competency);
      } else {
        flagged.add(m.competency);
        if (mustNot.some((q) => overlap(locate(e.text, q), span))) c.validTextFP++;
      }
    }
    anns.forEach((a, j) => {
      if (a.optional || a.kind !== "error" || (a.acceptKinds ?? []).includes("style")) return;
      c.required++;
      if (hit.has(j)) c.requiredHit++;
    });
    for (const cap of competencies) {
      const req = anns.filter((a) => a.competency === cap && a.kind === "error" && !(a.acceptKinds ?? []).includes("style"));
      if (req.length && req.every((a) => a.optional)) continue;
      c.cells.push([req.some((a) => !a.optional), flagged.has(cap)]);
    }
  }
  return c;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;
function kappa(cells: [boolean, boolean][]) {
  const n = cells.length;
  if (!n) return { agreement: null, kappa: null };
  const po = cells.filter(([a, b]) => a === b).length / n;
  const pa = cells.filter(([a]) => a).length / n;
  const pb = cells.filter(([, b]) => b).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return { agreement: r3(po), kappa: pe === 1 ? null : r3((po - pe) / (1 - pe)) };
}

function competencyIds(b: Benchmark, marks: Mark[]): string[] {
  return [...new Set([...b.essays.flatMap((e) => e.annotations.map((a) => a.competency)), ...marks.map((m) => m.competency)])].sort();
}

function ratingAgreement(pairs: [string, string][]) {
  if (!pairs.length) return null;
  const d = pairs.map(([x, y]) => Math.abs(STEPS.indexOf(x) - STEPS.indexOf(y)));
  return { n: pairs.length, exact: r3(d.filter((x) => x === 0).length / d.length), withinOne: r3(d.filter((x) => x <= 1).length / d.length) };
}

/** Each annotator against the synthetic reference. */
export function scoreVsReference(b: Benchmark, marks: Mark[], ratings: Rating[] = []) {
  const caps = competencyIds(b, marks);
  return [...new Set(marks.map((m) => m.annotator))].sort().map((annotator) => {
    const mine = marks.filter((m) => m.annotator === annotator);
    const c = compare(
      b,
      (essay) => mine.filter((m) => m.essay === essay),
      (essay) => {
        const e = b.essays.find((x) => x.id === essay)!;
        return { anns: e.annotations as RefAnn[], mustNot: e.must_not_flag.map((n) => n.quote) };
      },
      caps,
    );
    const pairs: [string, string][] = ratings.filter((r) => r.annotator === annotator).flatMap((r) => {
      const ref = b.rewrites.find((x) => x.id === r.rewrite)?.reference[r.dimension];
      return ref ? [[r.rating, ref] as [string, string]] : [];
    });
    return {
      annotator,
      precision: c.marked ? r3(c.matched / c.marked) : null,
      recall: c.required ? r3(c.requiredHit / c.required) : null,
      requiredMatched: c.requiredHit,
      required: c.required,
      falsePositivesOnValidText: c.validTextFP,
      competency: kappa(c.cells),
      rewriteRatings: ratingAgreement(pairs),
    };
  });
}

/** Each pair of annotators against each other: A's marks scored against B's as the reference, and the reverse. */
export function scoreAgreement(b: Benchmark, marks: Mark[], ratings: Rating[] = []) {
  const caps = competencyIds(b, marks);
  const ids = [...new Set(marks.map((m) => m.annotator))].sort();
  const out = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const A = marks.filter((m) => m.annotator === ids[i]);
      const B = marks.filter((m) => m.annotator === ids[j]);
      const side = (sys: Mark[], ref: Mark[]) => compare(b, (e) => sys.filter((m) => m.essay === e), (e) => ({ anns: ref.filter((m) => m.essay === e && m.kind !== "strength").map(asRef), mustNot: [] }), caps);
      const ab = side(A, B);
      const ba = side(B, A);
      // F1 on errors: precision of A against B, recall of A against B
      const p = ab.marked ? ab.matched / ab.marked : 0;
      const r = ab.required ? ab.requiredHit / ab.required : 0;
      const ra = new Map(ratings.filter((x) => x.annotator === ids[i]).map((x) => [`${x.rewrite}|${x.dimension}`, x.rating]));
      const pairs: [string, string][] = ratings.filter((x) => x.annotator === ids[j] && ra.has(`${x.rewrite}|${x.dimension}`)).map((x) => [ra.get(`${x.rewrite}|${x.dimension}`)!, x.rating]);
      out.push({
        a: ids[i],
        b: ids[j],
        errorF1: p + r ? r3((2 * p * r) / (p + r)) : null,
        aAgainstB: { precision: ab.marked ? r3(ab.matched / ab.marked) : null, recall: ab.required ? r3(ab.requiredHit / ab.required) : null },
        bAgainstA: { precision: ba.marked ? r3(ba.matched / ba.marked) : null, recall: ba.required ? r3(ba.requiredHit / ba.required) : null },
        competency: kappa(ab.cells),
        rewriteRatings: ratingAgreement(pairs),
      });
    }
  return out;
}

/** The reference itself as annotation marks (used by the tests and as a worked example of the CSV). */
export function referenceMarks(b: Benchmark, annotator = "reference"): Mark[] {
  return b.essays.flatMap((e) => e.annotations.map((a) => ({ annotator, essay: e.id, quote: a.quote, competency: a.competency, kind: (a.optional ? "ambiguous" : a.kind) as Mark["kind"], correction: "", note: a.note })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const b = loadBenchmark();
  const ratingsFile = rest.includes("--ratings") ? rest[rest.indexOf("--ratings") + 1] : null;
  if (!file || !["vs-reference", "agreement"].includes(cmd)) {
    console.error("usage: annotation-score.ts vs-reference|agreement <annotations.csv> [--ratings <ratings.csv>] [--md]");
    process.exit(2);
  }
  const { marks, problems } = readMarks(readFileSync(file, "utf8"), b);
  for (const p of problems) console.error(p);
  const ratings = ratingsFile ? readRatings(readFileSync(ratingsFile, "utf8")) : [];
  const res = cmd === "vs-reference" ? scoreVsReference(b, marks, ratings) : scoreAgreement(b, marks, ratings);
  console.log(JSON.stringify({ benchmark: `${b.id}@${b.version}`, status: b.status, mode: cmd, results: res }, null, 1));
}
