/**
 * Serving the verified question bank, and saying so plainly when it cannot (bank-serve@1, acceptance test 11).
 *
 * Nothing is generated or solved while a learner learns: an item is served only from the stored bank (the release pool of
 * every family the release uses: the same selection as tools/mathematics/tn5-bank/build-bank.mts). A request the bank
 * cannot serve gets a clear failure in plain language, and the miss is appended to a log so the gap can be filled later.
 *
 * Pure: the clock is injected (no Date.now here), and the log holds no learner names or birth dates: free text a learner
 * typed is never kept (only its length), and a topic is kept only when it looks like a short subject label.
 */
import { appendFileSync } from "node:fs";
import { boardReleases } from "./board-releases";
import { assigned } from "./curriculum";
import { FAMILIES, difficultyOf, phaseOf, pool, show as showValue, type Phase } from "./families";
import { graph } from "./graph";
import { canonicalOf } from "./answer-types";

export type Band = 1 | 2 | 3;
export const BANDS: readonly Band[] = [1, 2, 3];
export const PHASES: readonly Phase[] = ["diagnostic", "check", "practice", "retention"];

export interface BankWrongAnswer {
  id: string;
  kind: string;
  /** The skill whose teaching addresses this misunderstanding. */
  competency: string;
  says: string;
  /** What a learner with this misunderstanding answers (the family's prediction; null: none). */
  predicts: unknown;
  /** The same prediction as answer strings a learner could type or pick (empty when the family makes no prediction). */
  responses: string[];
}
export interface BankItem {
  id: string;
  family: string;
  competency: string;
  skill: string;
  form: string;
  difficulty: Band;
  phase: Phase;
  question: string;
  figure: unknown;
  options: string[] | null;
  answer: string;
  answerType: string;
  canonical: string | null;
  wrongAnswers: BankWrongAnswer[];
}
export interface Bank {
  releaseId: string;
  /** Deterministic order: families by id, then the family's pool order. */
  items: readonly BankItem[];
  byId: ReadonlyMap<string, BankItem>;
  /** Every competency of the release (some may have no stored items yet). */
  competencies: readonly string[];
  families: readonly string[];
}

const cache = new Map<string, Bank>();
/** The release's bank. Same family selection as build-bank.mts: competencies from assigned(release), then FAMILIES. */
export function loadBank(releaseId: string): Bank {
  const hit = cache.get(releaseId);
  if (hit) return hit;
  const release: any = boardReleases.find((r: any) => r.id === releaseId);
  if (!release) throw new Error(`bank-serve@1: release ${releaseId} not found`);
  const competencies = [...new Set(assigned(release).map((a) => a.competency))].sort();
  const families = [...FAMILIES.values()].filter((f) => competencies.includes(f.competency)).map((f) => f.id).sort();
  const items: BankItem[] = [];
  const seen = new Set<string>();
  for (const fam of families) {
    for (const p of pool(fam).items) {
      if (seen.has(p.id)) throw new Error(`bank-serve@1: duplicate id ${p.id}`);
      seen.add(p.id);
      items.push({
        id: p.id, family: fam, competency: p.competency, skill: p.skill, form: p.form, difficulty: difficultyOf(p) as Band, phase: phaseOf(p.id),
        question: p.prompt, figure: p.figure ?? null, options: p.options ?? null, answer: p.answer, answerType: p.type, canonical: canonicalOf(p.type, p.answer),
        wrongAnswers: p.bugs.map((b) => {
          const vals = b.predict === null ? [] : Array.isArray(b.predict) && p.type !== "set" ? b.predict : [b.predict];
          const responses = vals.map((v) => (p.type === "choice" ? "ABCD"[v as number] : showValue(v as never))).filter((s): s is string => typeof s === "string" && s !== undefined);
          return { id: b.id, kind: b.kind, competency: b.competency, says: b.says, predicts: b.predict, responses };
        }),
      });
    }
  }
  const bank: Bank = { releaseId, items, byId: new Map(items.map((i) => [i.id, i])), competencies, families };
  cache.set(releaseId, bank);
  return bank;
}

// ---------------------------------------------------------------- requests, failures, the missed-item log

export interface ItemRequest {
  competency?: string;
  difficulty?: Band;
  excludeIds?: readonly string[];
  phase?: Phase;
  /** Multiple choice ("choice") or an answer the learner writes ("typed"); omitted: either. */
  format?: "choice" | "typed";
  /** A topic by name (a strand such as "geometry", or a skill's name). */
  topic?: string;
  /** Something the learner typed. The bank never answers free text. */
  freeText?: string;
}
export type MissKind = "free-text" | "unsupported-topic" | "unknown-competency" | "outside-release" | "no-items-for-skill" | "band-exhausted" | "bad-request";
export interface Served { ok: true; item: BankItem }
export interface Refused {
  ok: false;
  kind: MissKind;
  /** Plain language, for the learner or the parent. */
  reason: string;
  /** For an exhausted band: the bands of the same request that still have unserved items. */
  otherBands?: Band[];
}
export type Outcome = Served | Refused;

/** What the log keeps of a request: never free text, never a long topic, only counts of excluded ids. */
export interface LoggedRequest { competency?: string; difficulty?: number; phase?: string; format?: string; topic?: string; freeTextLength?: number; excluded?: number }
export interface MissedItem { at: string; kind: MissKind; request: LoggedRequest; reason: string }
export interface MissedItemLog {
  /** Stamps the entry with the injected clock and keeps it. */
  append(e: Omit<MissedItem, "at">): MissedItem;
  entries(): readonly MissedItem[];
}
/** An in-memory log; `sink` (optional) also receives each entry, e.g. the JSONL writer. */
export function memoryMissedLog(clock: () => string, sink?: (e: MissedItem) => void): MissedItemLog {
  const all: MissedItem[] = [];
  return {
    append(e) {
      const entry: MissedItem = { at: clock(), ...e };
      all.push(entry);
      sink?.(entry);
      return entry;
    },
    entries: () => all,
  };
}
export const toJsonl = (entries: readonly MissedItem[]) => entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
/** A sink that appends each entry as one JSON line to a file. */
export const jsonlFileSink = (path: string) => (e: MissedItem) => appendFileSync(path, JSON.stringify(e) + "\n");
/** Writes (appends) entries to a JSONL file. */
export function writeMissedLog(path: string, entries: readonly MissedItem[]) {
  if (entries.length) appendFileSync(path, toJsonl(entries));
}

const SUBJECT_LABEL = /^[A-Za-z][A-Za-z \-']{0,39}$/;
function loggable(r: ItemRequest): LoggedRequest {
  const out: LoggedRequest = {};
  if (r.competency !== undefined) out.competency = String(r.competency).slice(0, 80);
  if (r.difficulty !== undefined) out.difficulty = r.difficulty;
  if (r.phase !== undefined) out.phase = r.phase;
  if (r.format !== undefined) out.format = r.format;
  if (r.topic !== undefined) out.topic = SUBJECT_LABEL.test(r.topic.trim()) ? r.topic.trim() : "[not kept]";
  if (r.freeText !== undefined) out.freeTextLength = r.freeText.length;
  if (r.excludeIds?.length) out.excluded = r.excludeIds.length;
  return out;
}

const nameOf = (c: string) => (graph.byId.has(c) ? graph.get(c).name : c);
const strandOf = (c: string) => c.split(".")[1] ?? "";

/** The competencies a topic names within this bank: a strand ("geometry") or a skill's name; [] when it names nothing here. */
export function topicCompetencies(bank: Bank, topic: string): string[] {
  const t = topic.trim().toLowerCase();
  if (!t) return [];
  return bank.competencies.filter((c) => strandOf(c).toLowerCase() === t || nameOf(c).toLowerCase() === t);
}

/**
 * Serves one item from the bank, or says why it cannot. Deterministic: among the items that fit, the one from the family
 * the learner has met least among `excludeIds` (so evidence is varied), then bank order. Never invents an item.
 */
export function requestItem(bank: Bank, request: ItemRequest, log: MissedItemLog): Outcome {
  const miss = (kind: MissKind, reason: string, extra: Partial<Refused> = {}): Refused => {
    log.append({ kind, request: loggable(request), reason });
    return { ok: false, kind, reason, ...extra };
  };
  if (request.freeText !== undefined)
    return miss("free-text", "OpenPath only gives you questions that were checked and stored in advance. It does not make up or solve new ones from what is typed, so pick a skill from your year instead.");
  if (request.difficulty !== undefined && !BANDS.includes(request.difficulty)) return miss("bad-request", "There are three levels of difficulty, 1 (gentle), 2 (middle) and 3 (stretch). Pick one of those.");
  if (request.format !== undefined && request.format !== "choice" && request.format !== "typed") return miss("bad-request", "Questions are either multiple choice or typed answers. Pick one of those.");
  if (request.phase !== undefined && !PHASES.includes(request.phase)) return miss("bad-request", "That kind of question (diagnostic, check, practice or delayed check) is not one the bank has.");

  let comps: string[] | null = request.competency !== undefined ? [request.competency] : null;
  if (request.topic !== undefined) {
    const named = topicCompetencies(bank, request.topic);
    if (!named.length) return miss("unsupported-topic", "That topic is not one OpenPath can set questions on for Grade 5 yet. Choose one of the Grade 5 topics: number, algebra, geometry, measurement, reasoning or statistics.");
    comps = comps ? comps.filter((c) => named.includes(c)) : named;
    if (!comps.length) return miss("outside-release", "That skill is not part of the topic you chose.");
  }
  for (const c of comps ?? []) {
    if (!graph.byId.has(c)) return miss("unknown-competency", "OpenPath does not know that skill, so there is no question to give. Pick a skill from your year.");
    if (!bank.competencies.includes(c)) return miss("outside-release", `${nameOf(c)} is not part of the Grade 5 year, so it has no questions here. It will come in the grade where it belongs.`);
  }

  const inScope = bank.items.filter((i) => (!comps || comps.includes(i.competency)) && (!request.phase || i.phase === request.phase) && (!request.format || (request.format === "choice") === (i.answerType === "choice")));
  if (!inScope.length) {
    const some = comps?.length ? nameOf(comps[0]) : "that";
    return miss("no-items-for-skill", `There are no stored questions of that kind for ${some} yet. This has been noted so the gap can be filled; nothing is made up in the meantime.`);
  }
  const excluded = new Set(request.excludeIds ?? []);
  const fresh = inScope.filter((i) => !excluded.has(i.id));
  const inBand = request.difficulty ? fresh.filter((i) => i.difficulty === request.difficulty) : fresh;
  if (!inBand.length) {
    const otherBands = BANDS.filter((b) => b !== request.difficulty && fresh.some((i) => i.difficulty === b));
    const what = request.difficulty ? `level ${request.difficulty}` : "this";
    return miss(
      "band-exhausted",
      otherBands.length
        ? `You have been through every stored question at ${what} for this skill. There are still questions at level ${otherBands.join(" and ")}; carry on there, or come back later.`
        : "You have been through every stored question of this kind for this skill. A teacher or parent can go through it with you; nothing is repeated as new evidence.",
      { otherBands },
    );
  }
  const met = new Map<string, number>();
  for (const id of excluded) {
    const f = bank.byId.get(id)?.family;
    if (f) met.set(f, (met.get(f) ?? 0) + 1);
  }
  let best = inBand[0];
  for (const i of inBand) if ((met.get(i.family) ?? 0) < (met.get(best.family) ?? 0)) best = i;
  return { ok: true, item: best };
}
