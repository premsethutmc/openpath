/**
 * The required demonstration, reproducible: one synthetic pupil hears words, misspells one by a spelling rule, gets a
 * follow-up word on the same pattern, spells it right, and the Learner Vector moves with each answer.
 *
 *   node --import tsx scripts/demo-dictation.mts        (prints a Markdown table)
 *
 * Every number comes from the app's own code (Learner, the engine's recommend and binaryUpdate, the ledger). The
 * pupil answers by fixed rules: it demonstrates the software, not how real children spell, and nothing here is
 * evidence of calibration.
 */
import { leafView } from "../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "../src/english/logic/content.ts";
import type { TraceEvent } from "../src/english/logic/events.ts";
import { Learner } from "../src/english/logic/learner.ts";
import { misconceptionFindings } from "../src/english/logic/misconceptions.ts";
import { respond } from "../src/english/logic/profile-sim.ts";
import { MemoryRepo } from "../src/english/logic/store.ts";

const c = loadContent();
let t = Date.parse("2026-10-15T09:00:00.000Z");
const l = await Learner.create(c, new MemoryRepo(), "Demo pupil", "guardian", () => new Date((t += 30_000)).toISOString(), "demo");
l.speechAvailable = true;
l.voiceInfo = { name: "Device voice", lang: "en-GB", local: true };
// placement: this pupil is right on questions up to band 3.5 (a pupil around band 3–4)
await l.start({ type: "placement" });
for (let i = 0; i < 40; i++) {
  const cur = await l.current();
  if (!cur.next) break;
  await l.answer(cur.next.item, respond(cur.next.item, (cur.next.item as Code).b <= 3.5), { use: cur.next.use });
}
const est = (cap: string) => leafView(l.state.ledger.composite, c.index, cap, l.clock());
const fmt = (cap: string) => `${est(cap).mean.toFixed(2)} ± ${est(cap).sd.toFixed(2)}`;
const short = (cap: string) => cap.split(".").pop();
console.log(`Start: inflections ${fmt("EN.FND.SPL.inflections")}, morphological ${fmt("EN.FND.SPL.morphological")} (after placement)\n`);
console.log("| # | Word (pattern, band b) | Why this word (recorded rule and reason) | Typed | Result and evidence | Estimate before → after | Misconception status after |");
console.log("|---|---|---|---|---|---|---|");
let cur = await l.start({ type: "spelling_assess" });
let k = 0;
let erred = false;
while (cur.next) {
  const it = cur.next.item as Code;
  const word = it.answers![0];
  const before = fmt(it.target);
  // the rule: misspell the first word that has a rule error listed, with that error; then right up to band 4.5
  const ruleError = !erred ? Object.entries(it.wrong ?? {})[0] : undefined;
  if (ruleError) erred = true;
  const text = ruleError ? ruleError[0] : it.b <= 4.5 ? word : `${word.slice(0, -2)}${word.slice(-1)}`;
  const fb = await l.answer(it, { kind: "typed", text }, { use: cur.next.use });
  const d = l.state.ledger.decisions.at(-1)!;
  const tr = l.events.filter((e): e is TraceEvent => e.kind === "trace" && e.item?.id === it.id).at(-1)!.selection!;
  const findings = misconceptionFindings(l.state, c).filter((f) => f.capability === it.target).map((f) => `${f.misconception.replace(/_/g, " ")}: ${f.status}`);
  console.log(
    `| ${++k} | ${word} (${short(it.target)}/${it.step}, b ${it.b}) | ${tr.spelling!.rule.replace(/_/g, " ")}: ${tr.spelling!.reasons[0]} | ${text} | ${fb.correct ? "right" : `wrong${fb.misconceptions.length ? ` (rule error: ${fb.misconceptions.join(", ").replace(/_/g, " ")})` : ""}`}; ${d.verdict === "accepted" ? "independent, counted" : d.verdict} | ${before} → ${d.after ? `${d.after.mean.toFixed(2)} ± ${d.after.sd.toFixed(2)}` : "unchanged"} | ${findings.join("; ") || "–"} |`,
  );
  cur = await l.current();
}
const stop = [...l.events].reverse().find((e): e is TraceEvent => e.kind === "trace" && !!e.selection?.spelling && !e.item);
console.log(`\nStopped: ${stop?.selection?.spelling?.reasons[0] ?? "(no reason recorded)"}`);
console.log(`End: inflections ${fmt("EN.FND.SPL.inflections")}, morphological ${fmt("EN.FND.SPL.morphological")}`);
const prof = l.profile();
for (const x of prof.capabilities.filter((x) => x.id.startsWith("EN.FND.SPL.") && x.id !== "EN.FND.SPL.homophones"))
  console.log(`${x.name}: ${x.standing}; ${x.evidence.independentRight} of ${x.evidence.independent} right on their own; ${[...x.strengths, ...x.difficulties].join(" ") || "–"}`);
console.log(`Today next: ${prof.activities.map((a) => a.title).join(" | ")}`);
