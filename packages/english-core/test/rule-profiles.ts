/**
 * Synthetic learners for the rule-evidence tests: the profiles from the spelling-inflections investigation,
 * answering the 24 draft questions (test fixture), the existing anchors and generated practice words.
 * Deterministic. They show that the projection applies its own policy as written; they say nothing about
 * real learners.
 */
import { readFileSync } from "node:fs";
import { type Context, type EvidenceEvent, type Item, Ledger, fnv1a, indexContent, leafView } from "../src/index.ts";
import { CONTENT, loadBundle, loadContext, viewFor } from "../../../tools/english/load.ts";

type Code = Extract<Item, { kind: "code" }>;
const fixture = JSON.parse(readFileSync(new URL("./fixtures/inflection-drafts.json", import.meta.url), "utf8")) as { items: Code[]; meta: Record<string, { role: string; root: string; ending: string }> };
const generated = JSON.parse(readFileSync(`${CONTENT}/spelling/generated-items.json`, "utf8")) as Code[];

let cached: Context | null = null;
export function profileContext(): Context {
  if (cached) return cached;
  const base = loadContext();
  const bundle = loadBundle();
  const content = indexContent(viewFor({ ...bundle, items: [...bundle.items, ...generated, ...fixture.items] }, base.index), base.index);
  return (cached = { ...base, content });
}

export const CAP = "EN.FND.SPL.inflections";

interface Meta {
  root: string;
  end: string;
  step: string;
  role: string;
  correct: string;
}
const meta = new Map<string, Meta>();
for (const i of fixture.items) {
  const m = fixture.meta[i.id];
  meta.set(i.id, { root: m.root, end: m.ending, step: i.step!, role: m.role, correct: i.answers![0] });
}
const anchors: Record<string, [string, string, string, string]> = { "spl.infl.02": ["swim", "ing", "double_short", "swimming"], "spl.infl.03": ["make", "ing", "drop_e", "making"], "spl.infl.04": ["carry", "ed", "y_to_i", "carried"] };
for (const [id, [root, end, step, correct]] of Object.entries(anchors)) meta.set(id, { root, end, step, role: "check", correct });
const practiceFor = (step: string) =>
  generated
    .filter((g) => g.target === CAP && g.step === step && g.generated!.template === "add_ending")
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 8);
for (const g of [...practiceFor("double_short"), ...practiceFor("drop_e"), ...practiceFor("y_to_i")])
  meta.set(g.id, { root: g.generated!.base!, end: g.generated!.join!.replace("-", ""), step: g.step!, role: "practice", correct: g.answers![0] });

const naive = (r: string, e: string) => r + e;
const dbl = (r: string, e: string) => r + r.at(-1) + e;
const rng = (seed: string) => {
  let h = parseInt(fnv1a(seed), 16);
  return () => (h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32;
};
const swap = (w: string, r: () => number) => {
  const i = 1 + Math.floor(r() * (w.length - 2));
  return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
};
const contrast = (m: Meta) => m.role.includes("contrast");

type Policy = (id: string, seen: Set<string>, r: () => number, phase: string) => string;
export const PROFILES: Record<string, Policy> = {
  rule_knower: (id) => meta.get(id)!.correct,
  memoriser: (id, seen) => {
    const m = meta.get(id)!;
    return seen.has(m.root) || m.role === "practice" ? m.correct : naive(m.root, m.end);
  },
  guesser: (id, _s, r) => {
    const m = meta.get(id)!;
    const opts = [m.correct, naive(m.root, m.end), dbl(m.root, m.end), m.root.slice(0, -1) + m.end];
    return opts[Math.floor(r() * opts.length)];
  },
  careless: (id, _s, r) => (r() < 0.15 ? swap(meta.get(id)!.correct, r) : meta.get(id)!.correct),
  never_doubles: (id) => {
    const m = meta.get(id)!;
    return m.step === "double_short" && !contrast(m) ? naive(m.root, m.end) : m.correct;
  },
  /** Right on doubling in the first week, then wrong on the delayed doubling questions (day 9). */
  forgets: (id, _s, _r, phase) => {
    const m = meta.get(id)!;
    return phase === "delayed" && m.step === "double_short" && !contrast(m) ? naive(m.root, m.end) : m.correct;
  },
};

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-14T09:00:00.000Z");
export const STAGES: { name: string; day: number; items: string[] }[] = [
  { name: "start", day: 0, items: ["spl.infl.02", "spl.infl.03", "spl.infl.04"] },
  { name: "practiceA", day: 0, items: practiceFor("double_short").map((g) => g.id) },
  { name: "checkA", day: 0, items: ["spl.infl.18", "spl.infl.19", "spl.infl.22", "spl.infl.24", "spl.infl.21"] },
  { name: "practiceB", day: 1, items: practiceFor("drop_e").map((g) => g.id) },
  { name: "checkB", day: 1, items: ["spl.infl.26", "spl.infl.27", "spl.infl.30", "spl.infl.32", "spl.infl.29"] },
  { name: "practiceC", day: 2, items: practiceFor("y_to_i").map((g) => g.id) },
  { name: "checkC", day: 2, items: ["spl.infl.34", "spl.infl.35", "spl.infl.38", "spl.infl.40", "spl.infl.37"] },
  { name: "delayed", day: 9, items: ["spl.infl.20", "spl.infl.23", "spl.infl.25", "spl.infl.28", "spl.infl.31", "spl.infl.33", "spl.infl.36", "spl.infl.39", "spl.infl.41"] },
];

export interface Run {
  ledger: Ledger;
  events: EvidenceEvent[];
  /** Ledger length after each stage. */
  stageEnds: Record<string, number>;
  answers: { id: string; text: string; correct: boolean; stage: string }[];
}

export function runProfile(name: string, opts: { through?: string; legacy?: boolean } = {}): Run {
  const through = opts.through ?? "delayed";
  const ctx = profileContext();
  const policy = PROFILES[name];
  const l = new Ledger(ctx, name);
  const r = rng(name);
  const seen = new Set<string>();
  const events: EvidenceEvent[] = [];
  const stageEnds: Record<string, number> = {};
  const answers: Run["answers"] = [];
  let k = 0;
  for (const s of STAGES) {
    for (const id of s.items) {
      const item = ctx.content.items.get(id) as Code;
      const text = policy(id, seen, r, s.name);
      const ev: EvidenceEvent = { kind: "evidence", id: `${name}-${k}`, at: new Date(T0 + s.day * DAY + (k + 1) * 60_000).toISOString(), session: s.name, item: { id, version: item.version }, response: { kind: "typed", text }, use: s.name.startsWith("practice") ? "practice" : s.name === "delayed" ? "retention" : "assessment", ...(opts.legacy ? {} : { provenance: { schema: "provenance@1" as const, attempt: 1, hints: [], afterFeedback: false } }) };
      k++;
      l.apply(ev);
      events.push(ev);
      answers.push({ id, text, correct: text === meta.get(id)!.correct, stage: s.name });
      if (s.name.startsWith("practice")) seen.add(meta.get(id)!.root);
    }
    stageEnds[s.name] = events.length;
    if (s.name === through) break;
  }
  return { ledger: l, events, stageEnds, answers };
}

export const engineView = (l: Ledger) => (cap: string) => {
  const v = leafView(l.composite, l.ctx.index, cap, l.composite.updatedAt ?? new Date(T0).toISOString());
  return { mean: v.mean, sd: v.sd, demonstrated: v.demonstrated, mastered: v.mastered, verification: v.verification.status };
};
