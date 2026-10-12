/**
 * Research only (E3a review, 12 October): code-detectable grammar error patterns as diagnostic signals.
 *
 * These detectors were briefly used in E3a to cap evaluator bands. That use was removed before merge:
 * they must not cap bands or change any estimate without separate validation and approval. Here they
 * only annotate decisions after the fact, so their agreement with evaluators and educators can be
 * studied (for example, against educator-scored anchors in the pilot).
 *
 *   node tools/english/research/grammar-signals.ts   prints each signal's matches across OpenPath's own
 *                                                    content (a first look at false positives)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CapabilityId, Decision } from "../../../packages/english-core/src/index.ts";
import { CONTENT, loadContext } from "../load.ts";

export interface GrammarSignal {
  id: string;
  pattern: string;
  capabilities: CapabilityId[];
  note: string;
}

export const SIGNALS_FILE = join(CONTENT, "research", "grammar-signals.json");
export const loadSignals = (): GrammarSignal[] => JSON.parse(readFileSync(SIGNALS_FILE, "utf8")).signals;

/** Distinct signal patterns found in a text that bear on a capability. */
export function grammarHits(text: string, signals: GrammarSignal[], cap?: CapabilityId): { id: string; match: string }[] {
  const out: { id: string; match: string }[] = [];
  for (const s of signals) {
    if (cap && !s.capabilities.includes(cap)) continue;
    const m = text.match(new RegExp(s.pattern, "i"));
    if (m) out.push({ id: s.id, match: m[0] });
  }
  return out;
}

/**
 * Annotate accepted evaluator judgements with the signals found in their response. Read-only: returns
 * notes for analysis and never changes a decision, an estimate or a stage.
 */
export function diagnose(decisions: Decision[], textOf: (decision: Decision) => string | undefined, signals = loadSignals()) {
  return decisions
    .filter((d) => d.verdict === "accepted" && d.observation?.kind === "band" && d.capability)
    .map((d) => {
      const text = textOf(d) ?? "";
      return { decision: d.id, capability: d.capability!, band: d.observation!.value, signals: grammarHits(text, signals, d.capability!) };
    })
    .filter((x) => x.signals.length > 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ctx = loadContext();
  const signals = loadSignals();
  const texts: { where: string; text: string }[] = [];
  for (const i of ctx.content.items.values()) {
    if (i.kind === "writing") for (const a of i.anchors) texts.push({ where: `anchor ${a.id}`, text: a.text });
    if (i.kind === "short") {
      for (const a of i.anchors) texts.push({ where: `anchor ${a.id}`, text: a.text });
      for (const m of i.model_answers) texts.push({ where: `model answer ${i.id}`, text: m });
    }
  }
  for (const p of ctx.content.passages.values()) texts.push({ where: `passage ${p.id}`, text: p.text });
  console.log("Grammar signals (research only): matches in OpenPath content\n");
  for (const s of signals) {
    const hits = texts.filter((t) => new RegExp(s.pattern, "i").test(t.text));
    console.log(`${s.id.padEnd(20)} ${String(hits.length).padStart(3)}  ${hits.map((h) => h.where).join(", ")}`);
  }
}
