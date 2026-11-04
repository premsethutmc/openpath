/**
 * K3: the versioned synthetic essay benchmark and its scorer (Essay Intelligence v2).
 * The benchmark is synthetic: these tests check that it is well formed and that the scorer measures what it says.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadBenchmark, recordedEvaluator, referenceEvaluator, score } from "../../../tools/english/essay-benchmark.ts";
import { loadEssayContext } from "../../../tools/english/essay-load.ts";

const b = loadBenchmark();
const ectx = loadEssayContext();

test("K3-1: the benchmark is versioned, labelled synthetic, and every quote is in its essay", () => {
  assert.equal(b.version, 1);
  assert.equal(b.status, "synthetic");
  assert.match(b.provenance, /NOT educator-validated/);
  assert.equal(b.rubric, ectx.profile.key);
  const low = (s: string) => s.toLowerCase();
  for (const e of b.essays) {
    for (const a of e.annotations) {
      assert.ok(low(e.text).includes(low(a.quote)), `${e.id}: "${a.quote}"`);
      assert.ok(ectx.profile.byCapability.has(a.competency), a.competency);
    }
    for (const n of e.must_not_flag) assert.ok(low(e.text).includes(low(n.quote)), `${e.id}: "${n.quote}"`);
  }
  for (const r of b.rewrites) assert.ok(r.words >= ectx.policy.rewriteMin && r.words <= ectx.policy.rewriteLimit, r.id);
  // the categories the brief asks for
  const focus = b.essays.flatMap((e) => e.focus).join(" ");
  for (const f of ["subject–verb", "tense", "articles", "prepositions", "run-on", "collocations", "connectives", "concision", "correct writing", "ambiguous", "valid alternatives", "slip"]) assert.match(focus, new RegExp(f), f);
  assert.ok(b.essays.filter((e) => !e.annotations.some((a) => a.kind !== "strength")).length >= 3, "at least three correct essays");
});

test("K3-4: every Grade 8 target band is labelled provisional (none is calibrated)", () => {
  const targets = ectx.profile.profile.competencies.filter((c) => c.expectedBand !== null);
  assert.ok(targets.length >= 10);
  for (const c of targets) assert.equal(c.expectedBandStatus, "provisional", c.capability);
});

test("K3-2: the reference scored against itself is perfect (the scorer is consistent)", async () => {
  const r = await score(b, referenceEvaluator(b));
  assert.equal(r.errors.precision, 1);
  assert.equal(r.errors.recall, 1);
  assert.equal(r.unsupported.rejected, 0);
  assert.equal(r.validText.errorsOnValidText, 0);
  assert.equal(r.competencyAgreement.kappa, 1);
});

test("K3-3: invented quotes, unknown competencies and false positives on valid text are measured", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bench-"));
  const ok = (competency: string, quote: string) => ({ competency, kind: "error", quote, explanation: "A synthetic judgement for the test.", confidence: "high", verification: "required" });
  const observations: Record<string, unknown> = {};
  for (const e of b.essays) observations[e.id] = { essay_id: e.id, rubric: b.rubric, observations: [], not_observable: [] };
  observations["b01-agreement"] = { essay_id: "b01-agreement", rubric: b.rubric, not_observable: [], observations: [ok("EN.GRM.VERB.sva", "my sister walk"), ok("EN.GRM.VERB.sva", "my sister walks"), ok("EN.MADE.UP", "She say")] };
  observations["b09-clean-alternatives"] = { essay_id: "b09-clean-alternatives", rubric: b.rubric, not_observable: [], observations: [ok("EN.GRM.VERB.sva", "The data on student opinions is clear")] };
  const file = join(dir, "recorded.json");
  writeFileSync(
    file,
    JSON.stringify({
      evaluator: { id: "test-llm", version: "1", model: "recorded" },
      observations,
      rewrites: {
        "r01-good": {
          rewrite_id: "r01-good",
          rubric: b.rubric,
          key_ideas: [{ original_quote: "my sister walk to school", rewrite_quote: "my sister walks to school" }],
          dimensions: [
            { dimension: "meaning_preservation", rating: "fully", quotes: [], note: "Keeps the idea." },
            { dimension: "grammar", rating: "fully", quotes: ["She says the road is safe"], note: "Correct agreement." },
            { dimension: "coherence", rating: "not_yet", quotes: ["My parents worry"], note: "A deliberately wrong rating." },
            { dimension: "clarity", rating: "fully", quotes: ["The town needs a new bus route"], note: "Clear." },
            { dimension: "concision", rating: "mostly", quotes: [], note: "Short." },
          ],
        },
      },
    }),
  );
  const r = await score(b, recordedEvaluator(file));
  assert.equal(r.unsupported.rejected, 2, "the invented quote and the unknown competency are rejected");
  assert.equal(r.errors.matched, 1);
  assert.equal(r.errors.unmatched, 1);
  assert.equal(r.errors.precision, 0.5);
  assert.equal(r.validText.errorsOnValidText, 1);
  assert.equal(r.validText.errorsOnCleanEssays, 1);
  assert.ok(r.errors.recall! < 0.1);
  assert.ok(r.competencyAgreement.kappa! < 0.3);
  assert.equal(r.rewrites.judged, 1);
  assert.ok("exact" in r.rewrites && r.rewrites.exact === 0.8, JSON.stringify(r.rewrites));
});
