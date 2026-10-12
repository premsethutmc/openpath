/**
 * Writes content/english/replay/demo.json: ILLUSTRATIVE evaluator outputs for the demonstration,
 * written by OpenPath (not produced by any LLM), keyed by request fingerprint.
 *  - one output per anchor response (so the replay evaluator can be qualified like any other)
 *  - one output for Asha's email, including one judgement that quotes words she never wrote
 *   node tools/english/make-demo-recordings.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildEvaluationRequest, createComposite, firstSentence, requestFingerprint, type WritingTask } from "../../packages/english-core/src/index.ts";
import { ASHA_EMAIL } from "./demo-data.ts";
import { CONTENT, loadContext } from "./load.ts";

const ctx = loadContext({ allowCandidateAnchors: true });
const tasks = [...ctx.content.items.values()].filter((i) => i.kind === "writing") as WritingTask[];
const blank = createComposite(ctx.index, "recording");
const at = "2026-10-12T10:00:00.000Z";
const offsets = [0, 0.5, -0.5, 0, 0.5, -0.5, 0.5];
const recordings: Record<string, unknown> = {
  _note: "Illustrative evaluator outputs written by OpenPath for the E1 demonstration. Not produced by an LLM.",
};
let k = 0;
for (const task of tasks)
  for (const anchor of task.anchors) {
    const req = buildEvaluationRequest(task, `anchor:${anchor.id}`, anchor.text, blank, ctx.index, at, "candidates");
    recordings[requestFingerprint(req)] = {
      evidence_id: `anchor:${anchor.id}`,
      item: { id: task.id, version: task.version },
      judgements: task.targets.map((cap) => ({
        capability: cap,
        band: Math.min(8, Math.max(1, anchor.scores[cap] + offsets[k++ % offsets.length])),
        confidence: "medium",
        quotes: [firstSentence(anchor.text)],
        misconceptions: [],
        rationale: "Illustrative recording.",
      })),
      not_observable: [],
      flags: { off_task: false, too_short: false, possibly_copied: false, safeguarding: false },
    };
  }
const email = tasks.find((t) => t.id === "wr.email.librarian")!;
const req = buildEvaluationRequest(email, "asha:writing", ASHA_EMAIL, blank, ctx.index, at, "candidates");
recordings[requestFingerprint(req)] = {
  evidence_id: "asha:writing",
  item: { id: email.id, version: email.version },
  judgements: [
    {
      capability: "EN.SEN.CMP.run_ons",
      band: 3.5,
      confidence: "medium",
      criteria: [{ id: "boundaries_marked", score: 1, max: 3 }],
      quotes: ["I want to ask you to order a book for our library, it is called The Secret of the Stars", "I read the first chapter at my cousin's house I could not stop reading"],
      misconceptions: ["comma_splice", "fused_sentence"],
      rationale: "Three of five sentences join independent clauses with a comma or with nothing.",
    },
    { capability: "EN.WRT.TSK.task_response", band: 5.5, confidence: "high", quotes: ["I want to ask you to order a book for our library", "Thank you for your help"], misconceptions: [], rationale: "Names the book, gives a reason and thanks the librarian." },
    { capability: "EN.WRT.ORG.paragraphing", band: 5, confidence: "medium", quotes: ["In conclusion, I hope you will agree with my request"], misconceptions: [], rationale: "Clear opening, body and closing paragraphs." },
    { capability: "EN.WRT.ACC.grammar", band: 5, confidence: "medium", quotes: ["The story is about two children who build a telescope"], misconceptions: [], rationale: "Verb forms and agreement mostly correct." },
    { capability: "EN.WRT.ACC.spelling", band: 6.5, confidence: "high", quotes: ["Many students in my class like science"], misconceptions: [], rationale: "No spelling errors." },
  ],
  not_observable: [],
  flags: { off_task: false, too_short: false, possibly_copied: false, safeguarding: false },
  surprise: { capability: "EN.SEN.CMP.run_ons", note: "Sentence boundaries weaker than other writing skills." },
};
writeFileSync(join(CONTENT, "replay", "demo.json"), JSON.stringify(recordings, null, 1) + "\n");
console.log(`wrote ${Object.keys(recordings).length - 1} recordings`);
