/**
 * Generate spelling items from the word bank, by template (decision 3 of 12 October 2026).
 *
 *   node tools/english/spelling/generate.ts          write content/english/spelling/generated-items.json
 *   node tools/english/spelling/generate.ts --check  fail unless the committed file matches a fresh run
 *
 * Deterministic: the same word bank always gives the same items, in the same order, with the same
 * option order. Every item records where it came from (`generated`), says its difficulty is a
 * feature-based estimate, and is candidate content. Until a person has checked an item, answers to it
 * are kept as practice and change no estimate (the core enforces this; see updater.ts).
 *
 * Versioning: an item whose content changes gets a new version, and its previous version is kept in
 * retired-generated.json, so answers given to the old version are still scored as they were answered.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT } from "../load.ts";
import type { CodeItem, Item } from "../../../packages/english-core/src/index.ts";
import { fnv1a } from "../../../packages/english-core/src/index.ts";

export const GENERATOR = "spelling-templates@1";
const DIR = join(CONTENT, "spelling");

export interface WordEntry {
  word: string;
  cap: string;
  step: string;
  base?: string;
  join?: string;
  form?: string;
  syllables?: number | null;
  variants: string[];
  misspellings: Record<string, string | null>;
  gloss?: { gloss: string; synset: string } | null;
  example?: { sentence: string; synset: string };
  homophones?: string[];
  sounds_like: string[];
  common: "ukfreq" | "base-ukfreq" | "size-35";
  sources: Record<string, string>;
}

export interface WordBank {
  version: number;
  ladder: Record<string, Record<string, number>>;
  sources: { id: string }[];
  entries: WordEntry[];
}

type Generated = { kind: "code" } & CodeItem;

const round = (x: number) => Math.round(x * 4) / 4;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Feature-based difficulty: the ladder step's band, adjusted for length, commonness and template. Not calibrated. */
export function featureDifficulty(bank: WordBank, e: WordEntry, template: string): number {
  const step = bank.ladder[e.cap]?.[e.step];
  if (step === undefined) throw new Error(`no ladder band for ${e.cap} ${e.step}`);
  const length = clamp((e.word.length - 7) * 0.1, -0.3, 0.5);
  const common = e.common === "ukfreq" ? 0 : 0.25;
  const tmpl = { choose_spelling: -0.25, add_ending: -0.25, hear_spell: 0, meaning_first_letter: 0.25, homophone_context: 0 }[template] ?? 0;
  return clamp(round(step + length + common + tmpl), 1, 8);
}

const CAP_SHORT: Record<string, string> = { "EN.FND.SPL.inflections": "infl", "EN.FND.SPL.homophones": "hom", "EN.FND.SPL.morphological": "mor" };

const suffixOf = (e: WordEntry) => (e.join ?? "").replace(/^-/, "");
const prefixOf = (e: WordEntry) => (e.join?.endsWith("-") ? e.join.slice(0, -1) : null);

/** The rule behind the word, in plain words, with the word itself. */
export function explanation(e: WordEntry): string {
  const b = e.base ?? "";
  const s = suffixOf(e);
  const w = e.word;
  const us = e.variants.length ? ` (American spelling: ${e.variants.join(", ")}, also correct)` : "";
  switch (e.step) {
    case "plain":
      return `${b} + -${s} = ${w}. Just add the ending; the base word does not change.`;
    case "es_plural":
      return `Words ending in s, x, z, ch or sh add -es, not -s: ${b} → ${w}.`;
    case "double_short":
      return `${b} has one syllable, one short vowel and one final consonant, so the last letter doubles before -${s}: ${w}.`;
    case "drop_e":
      return `${b} ends in a silent e. Drop the e before an ending that starts with a vowel: ${w}.`;
    case "y_to_i":
      return `${b} ends in a consonant + y. Change the y to i before -${s === "s" ? "es" : s}: ${w}.`;
    case "stress_doubling":
      return `${b} is stressed on its last syllable, so the last letter doubles before -${s}: ${w}.`;
    case "no_double_unstressed":
      return `${b} is stressed on its first syllable, so the last letter does not double: ${w}.`;
    case "exceptions":
      if (b.endsWith("ie")) return `${b} ends in ie. Change ie to y before -ing: ${w}.`;
      if (b.endsWith("c")) return `Add k after the final c before -${s}, to keep the hard "k" sound: ${w}.`;
      return `In British spelling, a final l after a single vowel doubles before -${s}, even when the last syllable is not stressed: ${w}${us}.`;
    case "plain_affix":
      return prefixOf(e) ? `${prefixOf(e)}- joins ${b} without changing either part: ${w}.` : `-${s} joins ${b} without changing either part: ${w}.`;
    case "double_at_join": {
      const p = prefixOf(e);
      if (p) return `${p}- ends in ${p.slice(-1)} and ${b} starts with ${b[0]}, so both letters stay: ${w}.`;
      return `${b} ends in ${b.slice(-1)} and -${s} starts with ${s[0]}, so both letters stay: ${w}.`;
    }
    case "ful_ly_ment":
      if (b.endsWith("y") && w.includes(b.slice(0, -1) + "i")) return `${b} ends in a consonant + y, so the y changes to i before -${s}: ${w}.`;
      if (b.endsWith("le") && s === "ly") return `${b} ends in -le, so -le becomes -ly: ${w}.`;
      if (s === "ful") return `The ending -ful has only one l: ${w}.`;
      return `${b} + -${s} = ${w}. The base keeps all its letters (a final e stays before a consonant ending).`;
    case "able_ible":
      return w.endsWith("able")
        ? `${w} ends in -able. -able usually follows a whole word you can recognise (${w.slice(0, -4)}…).`
        : `${w} ends in -ible. -ible usually follows a part that is not a word on its own.`;
    case "tion_sion":
      return w.endsWith("ssion") ? `${w} ends in -ssion (as in mission, passion).` : w.endsWith("sion") ? `${w} ends in -sion, often after l, n, r or a "zh" sound (vision).` : `${w} ends in -tion, the commonest of these endings.`;
    case "common_pairs":
    case "less_common":
      return `"${w}" means: ${e.gloss?.gloss}. ${(e.homophones ?? []).map((h) => `"${h}"`).join(" and ")} ${e.homophones?.length === 1 ? "sounds" : "sound"} the same but ${e.homophones?.length === 1 ? "means" : "mean"} something different.`;
    default:
      return `The correct spelling is ${w}.`;
  }
}

/** A deterministic shuffle (by FNV-1a of a key), so option order never gives the answer away. */
function order<T>(xs: T[], key: string): T[] {
  return xs
    .map((x, i) => ({ x, k: fnv1a(`${key}|${i}|${String(x)}`) }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .map((o) => o.x);
}

function base(e: WordEntry, template: string, bank: WordBank): Omit<Generated, "format" | "prompt"> {
  const sources = [...new Set(Object.values(e.sources).map((s) => s.replace(/-gloss$/, "")))].sort();
  return {
    kind: "code",
    id: `gen.${CAP_SHORT[e.cap]}.${template}.${e.word}`,
    version: 1,
    family: `gen.word.${e.word}`,
    target: e.cap,
    b: featureDifficulty(bank, e, template),
    a: 1.1,
    step: e.step,
    difficulty_source: "feature_estimate",
    review: "candidate-generated",
    rationale: `Generated (${template}); difficulty from the ladder step "${e.step}", word length and commonness, not calibrated.`,
    explain: explanation(e),
    generated: { generator: GENERATOR, template, word: e.word, ...(e.base ? { base: e.base } : {}), ...(e.join ? { join: e.join } : {}), sources },
  };
}

const typedWrong = (e: WordEntry) => Object.fromEntries(Object.entries(e.misspellings).filter(([, m]) => m).map(([w, m]) => [w, m as string]));

export function itemsFor(e: WordEntry, bank: WordBank): Generated[] {
  const out: Generated[] = [];
  const answers = [e.word, ...e.variants];
  const nonWords = Object.keys(e.misspellings).filter((m) => !(e.homophones ?? []).includes(m));
  const isHomophone = e.cap === "EN.FND.SPL.homophones";

  // 1. Add the ending (or prefix): the base is given.
  if (e.base && e.join && !isHomophone) {
    const p = prefixOf(e);
    const s = suffixOf(e);
    const label = p ? `${p}-` : s === "s" ? "-s or -es" : `-${s}`;
    out.push({ ...base(e, "add_ending", bank), format: "typed:word_form", prompt: `Add ${label} to "${e.base}" and write the new word.`, answers, wrong: typedWrong(e) });
  }
  // 2. Hear and spell: only when the word cannot be confused with another word that sounds the same.
  if (!isHomophone && !e.sounds_like.length) {
    out.push({ ...base(e, "hear_spell", bank), format: "typed:dictation", prompt: "Listen, then type the word you hear.", speak: e.word, answers, wrong: typedWrong(e) });
  }
  // 3. Choose the spelling: the word among rule-made misspellings that are not words.
  if (nonWords.length && !isHomophone) {
    const options = order([e.word, ...nonWords.slice(0, 3)], `${e.word}|choose`);
    const tags: Record<string, string> = {};
    options.forEach((o, i) => {
      const m = e.misspellings[o];
      if (m) tags[String(i)] = m;
    });
    const hint = e.base && e.join ? ` (${prefixOf(e) ? `${prefixOf(e)}- + ${e.base}` : `${e.base} + ${e.join === "-s" ? "-s/-es" : e.join}`})` : "";
    out.push({ ...base(e, "choose_spelling", bank), format: "choice:spelling", prompt: `Which spelling is correct?${hint}`, options, answer: options.indexOf(e.word), distractor_tags: tags });
  }
  // 4. Meaning and first letter.
  if (e.gloss && (e.cap === "EN.FND.SPL.morphological" || isHomophone)) {
    const sounds = isHomophone ? ` It sounds like "${e.homophones![0]}".` : "";
    out.push({ ...base(e, "meaning_first_letter", bank), format: "typed:clue", prompt: `Write the word that means "${e.gloss.gloss}". It starts with "${e.word[0]}" and has ${e.word.length} letters.${sounds}`, answers, wrong: typedWrong(e) });
  }
  // 5. Homophone in context: a sentence from Open English WordNet with the word missing.
  if (isHomophone && e.example && e.homophones?.length) {
    const blanked = e.example.sentence.replace(new RegExp(`\\b${e.word}\\b`, "i"), "___");
    const options = order([e.word, ...e.homophones], `${e.word}|context`);
    const tags: Record<string, string> = {};
    options.forEach((o, i) => {
      if (o !== e.word) tags[String(i)] = "familiar_spelling";
    });
    out.push({ ...base(e, "homophone_context", bank), format: "choice:spelling", prompt: `Which word fits? ${blanked}`, options, answer: options.indexOf(e.word), distractor_tags: tags });
  }
  return out;
}

export function generate(bank: WordBank): Generated[] {
  return bank.entries.flatMap((e) => itemsFor(e, bank));
}

/** Give each item a version: unchanged content keeps its version; changed content gets the next one. */
export function version(fresh: Generated[], committed: Generated[], retired: Generated[]): { items: Generated[]; retired: Generated[] } {
  const old = new Map(committed.map((i) => [i.id, i]));
  const strip = (i: Generated) => JSON.stringify({ ...i, version: 0 });
  const newRetired = [...retired];
  const items = fresh.map((i) => {
    const prev = old.get(i.id);
    if (!prev) return i;
    if (strip(prev) === strip(i)) return { ...i, version: prev.version };
    newRetired.push(prev);
    return { ...i, version: prev.version + 1 };
  });
  return { items, retired: newRetired };
}

const read = <T>(f: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(join(DIR, f), "utf8")) as T;
  } catch {
    return fallback;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const bank = read<WordBank>("wordbank.json", null as unknown as WordBank);
  const committed = read<Generated[]>("generated-items.json", []);
  const retired = read<Generated[]>("retired-generated.json", []);
  const { items, retired: nextRetired } = version(generate(bank), committed, retired);
  const text = JSON.stringify(items, null, 1) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(join(DIR, "generated-items.json"), "utf8") !== text) {
      console.error("generated-items.json differs from a fresh generation: run node tools/english/spelling/generate.ts and review the diff");
      process.exit(1);
    }
    console.log(`generated-items.json matches a fresh generation (${items.length} items)`);
  } else {
    writeFileSync(join(DIR, "generated-items.json"), text);
    writeFileSync(join(DIR, "retired-generated.json"), JSON.stringify(nextRetired, null, 1) + "\n");
    const by = new Map<string, number>();
    for (const i of items) by.set(i.generated!.template, (by.get(i.generated!.template) ?? 0) + 1);
    console.log(`wrote ${items.length} generated items:`, Object.fromEntries(by));
  }
}

export type { Item };
