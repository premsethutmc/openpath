/**
 * Pilot validation v1, task E: the synthetic journey is reproducible, its committed report is current, and it shows
 * exactly which stages work and which are blocked with the shipped bank. Nothing is claimed that the engine did not record.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadContent } from "../content.ts";
import { journeyMarkdown, runPilotJourney } from "./pilot-journey.ts";

const DOC = join(import.meta.dirname, "..", "..", "..", "..", "..", "docs", "product", "essay-learning", "pilot-validation-v1");

test("PILOT-JOURNEY the ten stages: what works, what is blocked, what uses recorded evaluator outputs; no mastery is fabricated", async () => {
  const content = loadContent();
  const r = await runPilotJourney(content);
  assert.deepEqual(r.stages.map((s) => [s.n, s.status]), [
    [1, "works, recorded evaluator output"],
    [2, "works, recorded evaluator output"],
    [3, "works"],
    [4, "works"],
    [5, "works"],
    [6, "blocked"],
    [7, "blocked"],
    [8, "works, recorded evaluator output"],
    [9, "works, recorded evaluator output"],
    [10, "works"],
  ]);
  assert.equal(r.final.demonstrated, false);
  assert.equal(r.final.verified, false);
  assert.equal(r.final.retention, "not_applicable");
  assert.match(r.final.pending!, /more reviewed questions are needed/);
  // reproducible: the same run gives the same report, and the committed report is that report
  const again = await runPilotJourney(content);
  assert.equal(journeyMarkdown(again), journeyMarkdown(r));
  assert.equal(readFileSync(join(DOC, "SYNTHETIC_JOURNEY.md"), "utf8"), journeyMarkdown(r), "stale: run node --import tsx scripts/essay-pilot-journey.mts");
});
