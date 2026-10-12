/**
 * E1 end-to-end demonstration (command line).
 *
 *   node tools/english/demo.ts            prints the walkthrough; state goes to tools/english/out/demo/
 *
 * Two invented learners, Asha and Ben, are run by the real engine. Only their
 * answers are simulated (from hidden true levels). Asha's written email is
 * evaluated by the replay evaluator (illustrative recorded output), then passes
 * through the controlled updater. Learner state is kept in local files and
 * reloaded, and one evaluation is undone.
 */
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  type Context,
  type LeafView,
  type Recommendation,
  type Decision,
  type LedgerEvent,
  Ledger,
  type WritingTask,
  aggregate,
  buildEvaluationRequest,
  leafView,
  qualify,
  recommend, summarise,
  replayEvaluator,
  rng,
} from "../../packages/english-core/src/index.ts";
import { ASHA, ASHA_EMAIL, BEN } from "./demo-data.ts";
import { FileStore } from "./file-store.ts";
import { CONTENT, REPO, loadContext, FROZEN_FRAMEWORK } from "./load.ts";
import { type SimLearner, respond } from "./sim/learners.ts";
import { anchorRequest, at, writingTasks } from "./sim/run.ts";

export interface DemoResult {
  ctx: Context;
  ledgers: Record<string, Ledger>;
  next: Record<string, { item: string; explanation: string }>;
  modes: Record<"assessment" | "learning", import("../../packages/english-core/src/index.ts").Recommendation>;
  writingDecisions: Decision[];
  reloadedIdentical: boolean;
  undoIdentical: boolean;
  retentionDemo: { capability: string; before: LeafView; after: LeafView; beforeNext: Recommendation; afterNext: Recommendation };
  lines: string[];
}

const STRANDS = ["EN.FND", "EN.VOC", "EN.GRM", "EN.SEN", "EN.RDG", "EN.WRT"];
const f = (x: number) => x.toFixed(2);
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n - 1) + "…" : s + " ".repeat(n - s.length));

export async function runDemo(opts: { dir?: string; quiet?: boolean } = {}): Promise<DemoResult> {
  // The E1 demonstration is defined on framework 0.1.0: its two learners have true levels for the 17 skeleton capabilities.
  const ctx = loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK }); // no educator-scored anchors exist yet (D-4)
  const dir = opts.dir ?? join(REPO, "tools", "english", "out", "demo");
  rmSync(dir, { recursive: true, force: true });
  const lines: string[] = [];
  const say = (s = "") => {
    lines.push(s);
    if (!opts.quiet) console.log(s);
  };
  const recordings = JSON.parse(readFileSync(join(CONTENT, "replay", "demo.json"), "utf8"));
  const evaluator = replayEvaluator("replay:demo-recordings", recordings);
  const goal = ctx.content.goals.get("overall")!;
  const prompt = (id: string) => {
    const p = ctx.content.items.get(id)!.prompt;
    return p.length > 90 ? p.slice(0, 89) + "…" : p;
  };

  say("OpenPath English · E1 demonstration");
  say("Two invented learners. The engine never sees their true levels; it only sees their answers.\n");

  // 1 · new learners, with an evaluator qualified against anchors
  const qual = await qualify(evaluator, writingTasks(ctx), (t, id) => anchorRequest(ctx, t, id, at(0, -1)), at(0, -1), { candidateAnchors: true });
  say(`1 · Evaluator "${evaluator.id}" scored ${Object.values(qual.detail).reduce((s, d) => s + d.n, 0)} judgements on candidate anchors (not yet educator-scored): noise ${f(qual.noise)}, bias ${f(qual.bias)} → ${qual.qualified ? "qualified" : "NOT qualified"}`);
  const stores: Record<string, FileStore> = {};
  const ledgers: Record<string, Ledger> = {};
  for (const l of [ASHA, BEN]) {
    stores[l.id] = new FileStore(join(dir, l.id));
    ledgers[l.id] = new Ledger(ctx, l.id);
    await append(stores[l.id], ledgers[l.id], qual);
  }
  const v0 = leafView(ledgers.asha.composite, ctx.index, "EN.RDG.LIT.locate_detail", at(0));
  say(`   New composites: all ${ctx.index.leafIds.length} capabilities of the framework start at ${f(v0.mean)} ± ${f(v0.sd)}, stage "${v0.stage}".\n`);

  // 2 · diagnostic: 20 code-scored items each, chosen adaptively
  const seen: Record<string, Set<string>> = { asha: new Set(), ben: new Set() };
  const recent: Record<string, { item: string; targets: string[]; format: string }[]> = { asha: [], ben: [] };
  say("2 · Two sessions of 20 items each (days 0 and 1), chosen one at a time by the selection engine (it starts in assessment mode)");
  for (const l of [ASHA, BEN]) {
    const next = rng(l.id === "asha" ? 11 : 22);
    for (let k = 0; k < 40; k++) {
      const day = k < 20 ? 0 : 1;
      const now = at(day, k % 20);
      const rec = recommend({ index: ctx.index, content: ctx.content, composite: ledgers[l.id].composite, goal, now, seen: seen[l.id], recent: recent[l.id], writingThisSession: 1, writingAvailable: false, activityIndex: k });
      const item = ctx.content.items.get(rec.choice!.item)!;
      if (item.kind !== "code") throw new Error("diagnostic expected a code item");
      const response = respond(l, item, day, next);
      const ds = await append(stores[l.id], ledgers[l.id], { kind: "evidence", id: `${l.id}:e${k}`, at: now, session: `${l.id}:s${day}`, item: { id: item.id, version: item.version }, response });
      seen[l.id].add(item.id);
      recent[l.id].unshift({ item: item.id, targets: [item.target], format: item.format });
      const d = ds[0];
      if (l.id === "asha" && k < 6)
        say(`   ${pad(ctx.index.names.get(item.target)!, 34)} ${d.observation!.value ? "right" : "wrong"} (item ${item.b})   ${f(d.before!.mean)} ± ${f(d.before!.sd)} → ${f(d.after!.mean)} ± ${f(d.after!.sd)}${d.inferred?.length ? `   +${d.inferred.length} coupled` : ""}`);
    }
  }
  say("   … (Asha's first 6 of 40 shown)\n");

  // 3 · profiles side by side
  const now1 = at(1, 30);
  say("3 · Composites after the diagnostic. Strand values summarise the 17 assessed capabilities: mean ± a conservative summary range, not a calibrated measurement");
  say(`   ${pad("", 14)}${pad("Asha", 16)}${pad("Ben", 16)}`);
  const SHORT: Record<string, string> = { "EN.FND": "Foundations", "EN.VOC": "Vocabulary", "EN.GRM": "Grammar", "EN.SEN": "Sentences", "EN.RDG": "Reading", "EN.WRT": "Writing" };
  const ag = { asha: aggregate(ledgers.asha.composite, ctx.index, now1), ben: aggregate(ledgers.ben.composite, ctx.index, now1) };
  for (const s of STRANDS) say(`   ${pad(SHORT[s], 14)}${pad(`${f(ag.asha.get(s)!.mean)} ± ${f(ag.asha.get(s)!.sd)}`, 16)}${pad(`${f(ag.ben.get(s)!.mean)} ± ${f(ag.ben.get(s)!.sd)}`, 16)}`);
  say();

  // 4 · Asha writes; the request that would go to an LLM
  const task = ctx.content.items.get("wr.email.librarian") as WritingTask & { kind: "writing" };
  const nowW = at(1, 40);
  const writing: LedgerEvent = { kind: "evidence", id: "asha:writing", at: nowW, session: "asha:s1", item: { id: task.id, version: task.version }, response: { kind: "writing", text: ASHA_EMAIL } };
  await append(stores.asha, ledgers.asha, writing);
  const before = structuredClone(ledgers.asha.composite);
  const req = buildEvaluationRequest(task, "asha:writing", ASHA_EMAIL, ledgers.asha.composite, ctx.index, nowW, "candidates");
  say(`4 · Asha writes: "${task.prompt.split("(")[0].trim()}"`);
  say(`   Evaluation request ${req.prompt_version}: ${req.targets.length} target capabilities with band descriptors and rubric criteria, ${req.anchors.length} anchors (${req.anchors.map((a) => a.id).join(", ")}),`);
  say(`   her current estimates (e.g. run-ons ${req.targets.find((t) => t.capability === "EN.SEN.CMP.run_ons")!.current.mean} ± ${req.targets.find((t) => t.capability === "EN.SEN.CMP.run_ons")!.current.sd}), and her text with identifiers removed. No name or learner id is sent.\n`);

  // 5 · proposal
  const body = (await evaluator.evaluate(req)) as { judgements: { capability: string; band: number; quotes: string[] }[] };
  say(`5 · Proposal from "${evaluator.id}" (illustrative recording): ${body.judgements.length} judgements`);
  for (const j of body.judgements) say(`   ${pad(ctx.index.names.get(j.capability)!, 40)} band ${j.band}   quote: "${j.quotes[0].slice(0, 48)}${j.quotes[0].length > 48 ? "…" : ""}"`);
  say();

  // 6 · controlled updater
  const ds = await append(stores.asha, ledgers.asha, { kind: "proposal", id: "p:asha:writing", at: nowW, evidence: "asha:writing", evaluator: { id: evaluator.id, model: evaluator.model }, body });
  say("6 · Controlled updater (OpenPath decides; the evaluator only proposed)");
  for (const d of ds) {
    const name = ctx.index.names.get(d.capability ?? "") ?? "(whole proposal)";
    const change = d.before && d.after ? `   ${f(d.before.mean)} ± ${f(d.before.sd)} → ${f(d.after.mean)} ± ${f(d.after.sd)}` : "";
    say(`   ${d.verdict.toUpperCase().padEnd(9)}${pad(name, 40)}${change}`);
    for (const r of d.reasons.slice(d.verdict === "accepted" ? 1 : 0)) say(`            ↳ ${r}`);
    if (d.observation?.misconceptions.length) say(`            ↳ misconceptions recorded: ${d.observation.misconceptions.join(", ")}`);
    if (d.inferred?.length) say(`            ↳ coupled (inferred, never counts towards a stage): ${d.inferred.map((i) => `${ctx.index.names.get(i.capability)} ${i.shift > 0 ? "+" : ""}${f(i.shift)}`).join("; ")}`);
  }
  say();

  // 7 · next activities (the engine chooses the mode)
  const next: DemoResult["next"] = {};
  say("7 · Next activity for each learner (mode chosen by the engine)");
  for (const l of [ASHA, BEN]) {
    const rec = recommend({ index: ctx.index, content: ctx.content, composite: ledgers[l.id].composite, goal, now: at(8), seen: seen[l.id], recent: [], writingThisSession: 0, writingAvailable: false });
    next[l.id] = { item: rec.choice!.item, explanation: rec.explanation };
    say(`   ${l.name} · ${rec.mode} mode · ${prompt(rec.choice!.item)}`);
    say(`     ${rec.explanation}`);
  }
  say(`   Different next activities: ${next.asha.item !== next.ben.item ? "yes" : "no"}\n`);

  // 7b · the same learner in assessment mode and in learning mode
  const modes: DemoResult["modes"] = {} as DemoResult["modes"];
  say("7b · Same learner (Asha), same moment, the two modes");
  for (const mode of ["assessment", "learning"] as const) {
    const rec = recommend({ index: ctx.index, content: ctx.content, composite: ledgers.asha.composite, goal, now: at(8), seen: seen.asha, recent: [], writingThisSession: 0, writingAvailable: false, mode });
    modes[mode] = rec;
    say(`   ${mode.toUpperCase()} → ${prompt(rec.choice!.item)}   [path: ${rec.path}]`);
    say(`     ${rec.explanation}`);
    if (rec.bankGaps.length) say(`     Item-bank gaps reported: ${rec.bankGaps.length} (${rec.bankGaps.map((g) => g.name).join(", ")})`);
  }
  say(`   Different, justified choices: ${modes.assessment.choice!.item !== modes.learning.choice!.item ? "yes" : "no"}\n`);

  // 8 · close and reopen from local files
  for (const l of [ASHA, BEN]) await stores[l.id].saveSnapshot({ composite: ledgers[l.id].composite, decisions: ledgers[l.id].decisions });
  let reloadedIdentical = true;
  for (const l of [ASHA, BEN]) {
    const store = new FileStore(join(dir, l.id));
    const reopened = Ledger.rebuild(ctx, l.id, await store.events());
    const snap = await store.loadSnapshot();
    reloadedIdentical &&= JSON.stringify(reopened.composite) === JSON.stringify(snap!.composite) && JSON.stringify(reopened.decisions) === JSON.stringify(snap!.decisions);
  }
  say(`8 · Closed and reopened from local files (${dir.replace(REPO + "/", "")}): rebuilt state ${reloadedIdentical ? "identical to the saved state" : "DIFFERENT from the saved state"}.\n`);

  // 9 · undo the whole evaluation
  for (const d of ds.filter((x) => x.verdict === "accepted")) await append(stores.asha, ledgers.asha, { kind: "revoke", id: `revoke:${d.id}`, at: at(8, 5), decision: d.id, reason: "demonstration: undo this evaluation" });
  const undoIdentical = JSON.stringify(stripMeta(ledgers.asha.composite)) === JSON.stringify(stripMeta(before));
  const rv = leafView(ledgers.asha.composite, ctx.index, "EN.SEN.CMP.run_ons", nowW);
  say(`9 · Undid Asha's evaluation (${ds.filter((x) => x.verdict === "accepted").length} decisions revoked; the evidence and proposal stay in the log): run-ons back to ${f(rv.mean)} ± ${f(rv.sd)}; composite ${undoIdentical ? "identical to its state before the evaluation" : "NOT identical"}.`);

  // 10 · an overdue retention check, before and after
  const t30 = at(30);
  const counter = ledgers.asha.events.filter((e) => e.kind === "evidence").length;
  const beforeNext = recommend({ index: ctx.index, content: ctx.content, composite: ledgers.asha.composite, goal, now: t30, seen: seen.asha, exposures: ledgers.asha.exposures, recent: [], writingThisSession: 0, writingAvailable: false, activityIndex: counter });
  const cap = beforeNext.choice!.focus!;
  const beforeView = leafView(ledgers.asha.composite, ctx.index, cap, t30);
  const status = (v: LeafView) => {
    const r = v.retention;
    const d = (x: string | null) => (x ? x.slice(0, 10) : "—");
    return `estimate ${f(v.mean)} ± ${f(v.sd)} · stage ${v.stage.replace("_", " ")} · retention ${r.status}${r.level !== null ? ` at band ${r.level}` : ""} (first demonstrated ${d(r.firstDemonstratedAt)}, last verified ${d(r.lastVerifiedAt)}, due ${d(r.dueAt)}, interval ${r.intervalDays} days)${v.masteredBefore ? ` · mastered before at ${v.masteredBefore}, not currently verified` : v.mastered ? ` · mastered at ${v.mastered}` : ""}`;
  };
  say(`\n10 · Four weeks later (${t30.slice(0, 10)}): an overdue retention check`);
  say(`   BEFORE  ${beforeView.name}: ${status(beforeView)}`);
  say(`           learner sees: ${summarise(beforeView).status} ${summarise(beforeView).estimate}`);
  say(`   Next activity [${beforeNext.schedule.reason}]: ${prompt(beforeNext.choice!.item)}`);
  say(`     ${beforeNext.explanation}`);
  const item = ctx.content.items.get(beforeNext.choice!.item)!;
  if (item.kind !== "code") throw new Error("expected a code item for the retention check");
  const answer = respond(ASHA, item, 30, rng(30));
  const checkDs = await append(stores.asha, ledgers.asha, { kind: "evidence", id: "asha:e-check", at: t30, session: "asha:s30", item: { id: item.id, version: item.version }, response: answer });
  seen.asha.add(item.id);
  const afterView = leafView(ledgers.asha.composite, ctx.index, cap, at(30, 1));
  const afterNext = recommend({ index: ctx.index, content: ctx.content, composite: ledgers.asha.composite, goal, now: at(30, 1), seen: seen.asha, exposures: ledgers.asha.exposures, recent: [{ item: item.id, targets: [item.target], format: item.format }], writingThisSession: 0, writingAvailable: false, activityIndex: counter + 1 });
  const check = afterView.retention.checks[afterView.retention.checks.length - 1];
  say(`   Asha answers: ${checkDs[0].observation!.value ? "right" : "wrong"} → the check ${check?.passed ? "PASSES" : "FAILS"} on this fresh evidence (interval now ${check?.intervalAfter} days)`);
  say(`   AFTER   ${afterView.name}: ${status(afterView)}`);
  say(`           learner sees: ${summarise(afterView).status} ${summarise(afterView).estimate}`);
  say(`   Next activity [${afterNext.schedule.reason}]: ${prompt(afterNext.choice!.item)}`);
  say(`     ${afterNext.explanation}`);
  return { ctx, ledgers, next, modes, writingDecisions: ds, reloadedIdentical, undoIdentical, retentionDemo: { capability: cap, before: beforeView, after: afterView, beforeNext, afterNext }, lines };
}

async function append(store: FileStore, ledger: Ledger, e: LedgerEvent): Promise<Decision[]> {
  await store.append(e);
  return ledger.apply(e);
}

/** The composite without bookkeeping fields that record which event was applied last. */
function stripMeta(c: { appliedThrough: string | null; updatedAt: string | null }) {
  return { ...c, appliedThrough: null, updatedAt: null };
}

if (import.meta.url === `file://${process.argv[1]}`) await runDemo();
