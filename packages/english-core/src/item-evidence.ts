/**
 * Assessment metadata for spelling items (Assessment Evidence v1), kept BESIDE the items.
 *
 * Existing item records are never edited to add these fields: their content (and the review fingerprints owner and
 * educator decisions are recorded against) stays byte-identical. The metadata lives in
 * content/english/spelling/evidence/item-evidence.json, keyed by id@version; generated items are covered by rule
 * from their generation record. Pure functions; no file system access.
 *
 * What it adds, per item:
 *   lemma / lexeme family   every form of one base word (stop, stopped, stopping) shares one family, so forms of a
 *                           lemma met before are not unfamiliar words
 *   exposure family         the item's own production family (unchanged)
 *   principle, polarity     the rule tested, and whether the rule must be applied ("apply") or must NOT be ("contrast")
 *   mode                    production (typed) or recognition (choice)
 *   uses                    roles the item is suitable or reserved for; several may apply, but one answer is still one
 *                           piece of evidence (see rule-evidence.ts independenceKey)
 *   transformation          what turns the lemma into the answer; checked mechanically against the accepted answer
 *
 * It also separates EVIDENCE ELIGIBILITY from availability: whether an answer may move an estimate, demonstrate or
 * verify a rule depends only on the item's validation status, never on whether it is offered or owner-approved.
 */
import { contentStatus, type ContentStatus, normaliseAnswer } from "./content.ts";
import type { Item } from "./types.ts";

export const ASSESSMENT_ROLES = ["familiar_practice", "unseen_transfer", "contrast", "misconception_probe", "delayed_retention"] as const;
export type AssessmentRole = (typeof ASSESSMENT_ROLES)[number];
export type ResponseMode = "production" | "recognition";
export type Transformation = "none" | "es" | "double" | "drop_e" | "y_to_i" | "keep_e" | "keep_y" | "ie_to_y" | "ck" | "irregular";

export interface ItemEvidence {
  principle: string;
  lemma: string;
  /** The form the ending attaches to, when it is not the lemma (forget -> forgot + -en = forgotten). */
  stem?: string;
  lexeme_family: string;
  exposure_family: string;
  suffix: string;
  transformation: Transformation;
  polarity: "apply" | "contrast";
  mode: ResponseMode;
  uses: AssessmentRole[];
  probes: string[];
  morphology: "inflectional" | "derivational";
  reserved: boolean;
  origin: string;
  lemma_source: "curated" | "authored" | "generated";
  /** Derivational items that only illustrate a principle; never inflection evidence. */
  principle_link_only?: boolean;
  exception_class?: string;
  dialect_note?: string;
  untagged_errors?: string[];
  use_source?: string;
}

export interface ItemEvidenceDoc {
  schema: "openpath.spelling.item-evidence@1";
  note?: string;
  roles: string[];
  items: Record<string, ItemEvidence>;
}

export type ItemEvidenceIndex = ReadonlyMap<string, ItemEvidence>;

export function indexItemEvidence(doc: ItemEvidenceDoc): ItemEvidenceIndex {
  if (doc.schema !== "openpath.spelling.item-evidence@1") throw new Error(`unknown item-evidence schema ${doc.schema}`);
  return new Map(Object.entries(doc.items));
}

const key = (item: { id: string; version: number }) => `${item.id}@${item.version}`;

/** The answer an item asks for (normalised): generated word, first accepted typed answer, or the correct option. */
export function answerOf(item: Item): string | null {
  if (item.kind !== "code") return null;
  if (item.generated) return normaliseAnswer(item.generated.word);
  if (item.answers?.length) return normaliseAnswer(item.answers[0]);
  if (item.options && item.answer !== undefined) return normaliseAnswer(item.options[item.answer]);
  return null;
}

export const modeOf = (item: Item): ResponseMode => (item.kind === "code" && item.format.startsWith("typed") ? "production" : "recognition");

/**
 * Metadata for an item: the recorded entry, or for a generated item one derived from its generation record
 * (base word, ending, template). Null when neither exists (an unmapped item: the audit reports it).
 */
export function evidenceOf(item: Item, index: ItemEvidenceIndex): ItemEvidence | null {
  const recorded = index.get(key(item));
  if (recorded) return recorded;
  if (item.kind !== "code" || !item.generated?.base || !item.step) return null;
  const g = item.generated;
  const contrast = (item.family ?? "").endsWith(".contrast");
  return {
    principle: item.step,
    lemma: g.base!.toLowerCase(),
    lexeme_family: `lemma:${g.base!.toLowerCase()}`,
    exposure_family: item.family ?? item.id,
    suffix: g.join ?? "",
    transformation: contrast ? "none" : (PRINCIPLE_TRANSFORMATION[item.step]?.[0] ?? "irregular"),
    polarity: contrast ? "contrast" : "apply",
    mode: modeOf(item),
    uses: ["familiar_practice"],
    probes: [...new Set([...Object.values(item.wrong ?? {}), ...Object.values(item.distractor_tags ?? {})])].sort(),
    morphology: "inflectional",
    reserved: false,
    origin: "generated",
    lemma_source: "generated",
  };
}

/** The lemma an item asks about: recorded or generated base word; otherwise the answer itself (a conservative fallback). */
export function lemmaOf(item: Item, index: ItemEvidenceIndex): string | null {
  return evidenceOf(item, index)?.lemma ?? answerOf(item);
}

// ---------------------------------------------------------------- evidence eligibility (separate from availability)

export interface EvidenceEligibility {
  status: ContentStatus;
  /** Never assessment evidence: a generated item no person has checked. */
  practiceOnly: boolean;
  /** May move the capability estimate (production's existing rule: candidate and validated content). */
  updatesEstimate: boolean;
  /** May count towards a rule being demonstrated (recorded as a demonstration when not validated). */
  demonstrates: boolean;
  /** May stand behind VERIFIED mastery: only educator-validated content. Owner approval never changes this. */
  verifies: boolean;
}

export function evidenceEligibility(item: Item): EvidenceEligibility {
  const status = contentStatus(item);
  return {
    status,
    practiceOnly: status === "practice",
    updatesEstimate: status === "candidate" || status === "validated",
    demonstrates: status !== "practice",
    verifies: status === "validated",
  };
}

// ---------------------------------------------------------------- mechanical morphology check

const VOWEL = /[aeiou]/;

/** The form a transformation produces (lowercase). */
export function inflect(lemma: string, suffix: string, t: Transformation): string | null {
  const s = suffix.replace(/^-/, "");
  switch (t) {
    case "none":
    case "keep_e":
    case "keep_y":
      return lemma + s;
    case "es":
      return lemma + "es";
    case "double":
      return lemma + lemma.at(-1) + s;
    case "drop_e":
      return lemma.endsWith("e") ? lemma.slice(0, -1) + s : null;
    case "y_to_i":
      return lemma.endsWith("y") && !VOWEL.test(lemma.at(-2) ?? "") ? lemma.slice(0, -1) + "i" + (s === "s" ? "es" : s) : null;
    case "ie_to_y":
      return lemma.endsWith("ie") ? lemma.slice(0, -2) + "y" + s : null;
    case "ck":
      return lemma.endsWith("c") ? lemma + "k" + s : null;
    case "irregular":
      return null;
  }
}

/** The transformation a principle applies (what "apply" items use). */
export const PRINCIPLE_TRANSFORMATION: Record<string, Transformation[]> = {
  plain: ["none", "keep_y"],
  es_plural: ["es"],
  double_short: ["double"],
  drop_e: ["drop_e"],
  y_to_i: ["y_to_i"],
  stress_doubling: ["double"],
  no_double_unstressed: ["none"],
  exceptions: ["ck", "ie_to_y", "irregular", "double"],
};

/** Wrong forms that a misconception tag claims to describe, for a given lemma and ending. */
export function misconceptionForms(tag: string, lemma: string, suffix: string): string[] {
  const s = suffix.replace(/^-/, "");
  const forms = new Set<string>();
  const doubled = (stem: string) => stem + stem.at(-1) + s;
  if (tag === "no_doubling") forms.add(lemma + s);
  if (tag === "over_doubling") {
    forms.add(doubled(lemma));
    if (lemma.endsWith("e")) forms.add(doubled(lemma.slice(0, -1)));
    if (/[wxy]$/.test(lemma)) forms.add(lemma + lemma.at(-1) + s);
  }
  if (tag === "kept_silent_e") {
    forms.add(lemma + s);
    if (s === "ed" && lemma.endsWith("e")) forms.add(lemma + "ed");
  }
  if (tag === "y_not_changed") {
    forms.add(lemma + s);
    if (s === "es") forms.add(lemma + "s");
  }
  return [...forms];
}

/** Problems with one item's metadata (empty when consistent). */
export function checkItemEvidence(item: Item, m: ItemEvidence): string[] {
  const out: string[] = [];
  const k = key(item);
  if (item.kind !== "code") return [`${k}: metadata on a non-code item`];
  const answers = (item.format.startsWith("typed") ? item.answers ?? [] : item.options && item.answer !== undefined ? [item.options[item.answer]] : []).map(normaliseAnswer);
  if (m.principle !== item.step && !m.principle_link_only) out.push(`${k}: principle ${m.principle} differs from step ${item.step}`);
  if (m.mode !== modeOf(item)) out.push(`${k}: mode ${m.mode} does not match format ${item.format}`);
  if (m.exposure_family !== (item.family ?? item.id)) out.push(`${k}: exposure_family ${m.exposure_family} differs from the item's family`);
  if (m.lexeme_family !== `lemma:${m.lemma}`) out.push(`${k}: lexeme_family must be lemma:${m.lemma}`);
  if ((m.polarity === "contrast") !== (item.family ?? "").endsWith(".contrast") && m.morphology === "inflectional") out.push(`${k}: polarity ${m.polarity} disagrees with the family's contrast marker`);
  for (const u of m.uses) if (!(ASSESSMENT_ROLES as readonly string[]).includes(u)) out.push(`${k}: unknown use ${u}`);
  if ((m.polarity === "contrast") !== m.uses.includes("contrast")) out.push(`${k}: contrast items, and only they, carry the contrast use`);
  const stem = m.stem ?? m.lemma;
  const expected = inflect(stem, m.suffix, m.transformation);
  if (m.transformation !== "irregular") {
    if (expected === null) out.push(`${k}: transformation ${m.transformation} cannot apply to ${stem}`);
    else if (!answers.includes(expected)) out.push(`${k}: ${stem} + ${m.suffix} by ${m.transformation} gives ${expected}, not ${answers.join("/")}`);
  }
  const allowed = PRINCIPLE_TRANSFORMATION[m.principle] ?? [];
  if (m.morphology === "inflectional") {
    if (m.polarity === "apply" && !allowed.includes(m.transformation)) out.push(`${k}: an apply item for ${m.principle} must use ${allowed.join("/")}, not ${m.transformation}`);
    if (m.polarity === "contrast" && allowed.includes(m.transformation)) out.push(`${k}: a contrast item for ${m.principle} must NOT use ${m.transformation}`);
  }
  const tagged: [string, string][] = [
    ...Object.entries(item.wrong ?? {}),
    ...Object.entries(item.distractor_tags ?? {}).map(([i, tag]) => [normaliseAnswer(item.options?.[Number(i)] ?? ""), tag] as [string, string]),
  ];
  for (const [form, tag] of tagged) {
    const ok = misconceptionForms(tag, stem, m.suffix);
    if (ok.length && !ok.includes(form)) out.push(`${k}: wrong answer "${form}" is tagged ${tag}, but ${tag} predicts ${ok.join("/")}`);
  }
  const probes = [...new Set(tagged.map(([, t]) => t))].sort();
  if (JSON.stringify(probes) !== JSON.stringify([...m.probes].sort())) out.push(`${k}: probes ${m.probes.join(",")} differ from the item's tags ${probes.join(",")}`);
  if (probes.length > 0 !== m.uses.includes("misconception_probe")) out.push(`${k}: misconception_probe use must match whether the item has tagged wrong answers`);
  return out;
}

/** Every regular inflected form of a lemma (used to find the lemma anywhere else in the content). */
export function formsOf(lemma: string): Set<string> {
  const out = new Set([lemma]);
  for (const suffix of ["-s", "-es", "-ed", "-ing", "-er", "-est", "-en"])
    for (const t of ["none", "double", "drop_e", "y_to_i", "ie_to_y", "ck"] as Transformation[]) {
      const f = inflect(lemma, suffix, t);
      if (f) out.add(f);
    }
  return out;
}

/** Reserved lemmas (for unseen-word transfer and delayed checks) must appear in no other spelling item at all. */
export function reservedLemmaProblems(items: Iterable<Item>, index: ItemEvidenceIndex): string[] {
  const out: string[] = [];
  const all = [...items].filter((i) => i.kind === "code" && i.target.startsWith("EN.FND.SPL"));
  const holders = new Map<string, Set<string>>();
  for (const it of all) {
    const words = [evidenceOf(it, index)?.lemma, answerOf(it), it.kind === "code" ? it.generated?.base?.toLowerCase() : undefined, it.kind === "code" ? it.speak?.toLowerCase() : undefined];
    for (const w of words) if (w) holders.set(w, (holders.get(w) ?? new Set()).add(key(it)));
  }
  for (const it of all) {
    const m = index.get(key(it));
    if (!m?.reserved) continue;
    const others = new Set<string>();
    for (const f of formsOf(m.lemma)) for (const x of holders.get(f) ?? []) if (x !== key(it)) others.add(x);
    if (others.size) out.push(`${key(it)}: reserved lemma ${m.lemma} also appears in ${[...others].sort().join(", ")}`);
  }
  return out;
}
