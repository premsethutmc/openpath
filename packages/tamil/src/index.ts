/** Provisional language boundary. No learner estimates, vector or mastery policy live here. */
import graphData from "../../../content/tamil/ontology.v1.json";
import itemData from "../../../content/tamil/items.v1.json";
import activityData from "../../../content/tamil/activities.v1.json";

export type Competency = {
  id: string;
  name: string;
  requires: string[];
  composes: string[];
  status: string;
};
export type Item = {
  id: string;
  version: number;
  competencies: string[];
  family: string;
  format: "choice" | "text" | "compose";
  prompt: string;
  answers: string[];
  options: string[];
  wrong: Record<string, string>;
  stage: "guided" | "independent" | "transfer";
  transfer: boolean;
  difficulty: { level: number; source: string; calibrated: boolean };
  review: "provisional" | "validated";
  provenance: { source: string; method: string; educatorReviewed: boolean };
  audio: null;
  task: {
    demand: "recognition" | "construction";
    cue: string;
    audioAssessed: false;
  };
  misconceptionTags: string[];
  transferBasis: string | null;
};
export const ontology = graphData;
export const competencies: Competency[] = ontology.nodes;
// JSON inference widens literal fields and sparse distractor keys; validate() checks this authored boundary.
export const items = itemData as unknown as Item[];
export const activities = activityData;
export const misconceptions = [
  "TA.short-long",
  "TA.missing-pulli",
  "TA.vowel-sign",
  "TA.consonant-confusion",
  "TA.word-spelling",
] as const;
export type Misconception = (typeof misconceptions)[number];

/** NFC and boundary whitespace only: never remove pulli, vowel signs, joiners or punctuation. */
export const normalize = (text: string): string => text.normalize("NFC").trim();
const segmenter = new Intl.Segmenter("ta", { granularity: "grapheme" });
export const graphemes = (text: string): string[] =>
  [...segmenter.segment(text.normalize("NFC"))].map((s) => s.segment);
export const compose = (mei: string, vowel: string): string => {
  const vowels = ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ"];
  const signs = ["", "ா", "ி", "ீ", "ு", "ூ", "ெ", "ே", "ை", "ொ", "ோ", "ௌ"];
  const index = vowels.indexOf(normalize(vowel));
  if (index < 0 || !/^[கஙசஞடணதநபமயரலவழளறன]்$/u.test(normalize(mei)))
    throw Error("Invalid Tamil composition");
  return normalize(mei).slice(0, -1) + signs[index];
};
export const misconceptionFeedback: Record<Misconception, string> = {
  "TA.short-long": "குறில், நெடில் வேறுபாட்டைக் கவனி. அ — ஆ; இ — ஈ; உ — ஊ.",
  "TA.missing-pulli":
    "மெய்யெழுத்தின் புள்ளியை மறக்க வேண்டாம். க என்பது உயிர்மெய்; க் என்பது மெய்.",
  "TA.vowel-sign":
    "மெய்யின் புள்ளியை நீக்கி சரியான உயிர்க்குறியைச் சேர். க் + இ = கி.",
  "TA.consonant-confusion":
    "மெய்யெழுத்தில் புள்ளி இருக்கும். எழுத்தின் வடிவத்தைக் கவனி.",
  "TA.word-spelling":
    "ஒவ்வொரு எழுத்தையும் அதன் குறியையும் கவனி. ல, ள; ர, ற ஆகியவை வேறு எழுத்துகள்.",
};
export function evaluate(item: Item, response: string) {
  const answer = normalize(response);
  const correct = item.answers.some((a) => normalize(a) === answer);
  const tag =
    !correct && Object.hasOwn(item.wrong, answer)
      ? item.wrong[answer]
      : undefined;
  // A distractor is evidence consistent with a misconception, not a diagnosis of the child.
  return {
    correct,
    normalized: answer,
    misconceptions: tag ? [tag as Misconception] : [],
    feedback: correct
      ? "சரி! நன்றாக முயன்றாய்."
      : `${tag ? misconceptionFeedback[tag as Misconception] : "மீண்டும் கவனிப்போம்."} சரியான விடை: ${item.answers[0]}`,
  };
}
export interface ResponseEvidence {
  schema: "openpath.language-evidence.v1";
  language: "ta";
  ontology: string;
  id: string;
  learnerId: string;
  sessionId: string;
  at: string;
  item: { id: string; version: number; family: string };
  competencies: string[];
  response: string;
  normalized: string;
  correct: boolean;
  misconceptions: Misconception[];
  format: Item["format"];
  stage: Item["stage"];
  transfer: boolean;
  support: { hint: boolean; revealed: boolean; instructionBefore: boolean };
  exposure: "fresh" | "family" | "repeat";
  production: boolean;
  task: Item["task"];
  independenceCandidate: boolean;
  eligibleForInference: boolean;
  review: Item["review"];
  provenance: Item["provenance"];
  difficulty: Item["difficulty"];
}
export function evidence(
  item: Item,
  response: string,
  context: {
    id: string;
    learnerId: string;
    sessionId: string;
    at: string;
    hint?: boolean;
    revealed?: boolean;
    instructionBefore?: boolean;
    priorPresentations?: { itemId: string; family: string }[];
  },
  history: ResponseEvidence[],
): ResponseEvidence {
  if (
    !context.id ||
    !context.learnerId ||
    !context.sessionId ||
    !Number.isFinite(Date.parse(context.at))
  )
    throw Error("Invalid evidence context");
  if (history.some((e) => e.id === context.id))
    throw Error("Duplicate evidence id");
  const prior = history.filter(
    (e) => e.learnerId === context.learnerId && e.language === "ta",
  );
  const shown = context.priorPresentations ?? [];
  const exposure =
    prior.some((e) => e.item.id === item.id) ||
    shown.some((p) => p.itemId === item.id)
      ? "repeat"
      : prior.some((e) => e.item.family === item.family) ||
          shown.some((p) => p.family === item.family)
        ? "family"
        : "fresh";
  const result = evaluate(item, response);
  const support = {
    hint: !!context.hint,
    revealed: !!context.revealed,
    instructionBefore: !!context.instructionBefore,
  };
  const independent =
    exposure === "fresh" &&
    !support.hint &&
    !support.revealed &&
    item.stage !== "guided";
  return {
    schema: "openpath.language-evidence.v1",
    language: "ta",
    ontology: `${ontology.id}@${ontology.version}`,
    id: context.id,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    at: context.at,
    item: { id: item.id, version: item.version, family: item.family },
    competencies: [...item.competencies],
    response,
    normalized: result.normalized,
    correct: result.correct,
    misconceptions: result.misconceptions,
    format: item.format,
    stage: item.stage,
    transfer: item.transfer && exposure === "fresh",
    support,
    exposure,
    production: item.format !== "choice",
    task: item.task,
    independenceCandidate: independent,
    eligibleForInference:
      independent &&
      item.review === "validated" &&
      item.provenance.educatorReviewed,
    review: item.review,
    provenance: item.provenance,
    difficulty: item.difficulty,
  };
}
export const diagnostic = [
  "vowels",
  "consonants",
  "length",
  "composition",
  "signs",
  "spelling",
].map(
  (cap) =>
    items.find(
      (i) => i.competencies.includes(`TA.${cap}`) && i.stage === "independent",
    )!,
);
/** A bounded demonstration sequence, not adaptive inference. Never select previously seen families as transfer. */
export function practice(
  competency: string,
  history: ResponseEvidence[],
  presentations: { family: string }[] = [],
) {
  const pool = items.filter((i) => i.competencies.includes(competency));
  const seen = new Set([
    ...history.map((e) => e.item.family),
    ...presentations.map((p) => p.family),
  ]);
  const guided = pool.find((i) => i.stage === "guided");
  if (guided) seen.add(guided.family);
  const independent = pool.find(
    (i) => i.stage === "independent" && !seen.has(i.family),
  );
  if (independent) seen.add(independent.family);
  const transfer = pool.find(
    (i) => i.stage === "transfer" && !seen.has(i.family),
  );
  return [guided, independent, transfer].filter((i): i is Item => !!i);
}
export function validate(
  graph: Competency[] = competencies,
  bank: Item[] = items,
): string[] {
  const errors: string[] = [];
  const ids = new Set(graph.map((c) => c.id));
  if (ids.size !== graph.length) errors.push("Duplicate competency");
  const walk = (
    id: string,
    path: Set<string>,
    edge: "requires" | "composes",
  ): void => {
    if (path.has(id)) {
      errors.push(`Cycle: ${id}`);
      return;
    }
    const c = graph.find((c) => c.id === id);
    if (!c) {
      errors.push(`Unknown competency: ${id}`);
      return;
    }
    for (const next of c[edge]) walk(next, new Set([...path, id]), edge);
  };
  for (const c of graph) {
    walk(c.id, new Set(), "requires");
    walk(c.id, new Set(), "composes");
  }
  const itemIds = new Set<string>();
  for (const i of bank) {
    if (itemIds.has(i.id)) errors.push(`Duplicate item: ${i.id}`);
    itemIds.add(i.id);
    if (
      !["choice", "text", "compose"].includes(i.format) ||
      !["guided", "independent", "transfer"].includes(i.stage) ||
      !["provisional", "validated"].includes(i.review)
    )
      errors.push(`Invalid item schema: ${i.id}`);
    if (
      !i.task ||
      !["recognition", "construction"].includes(i.task.demand) ||
      !i.task.cue ||
      i.task.audioAssessed !== false ||
      i.audio !== null
    )
      errors.push(`Invalid task: ${i.id}`);
    if (
      i.misconceptionTags.some(
        (tag) => !Object.values(i.wrong).includes(tag),
      ) ||
      Object.values(i.wrong).some((tag) => !i.misconceptionTags.includes(tag))
    )
      errors.push(`Invalid misconception metadata: ${i.id}`);
    if (!i.competencies.length || i.competencies.some((c) => !ids.has(c)))
      errors.push(`Invalid targets: ${i.id}`);
    if (
      !i.family ||
      !i.answers.length ||
      !i.provenance.source ||
      !i.difficulty.source
    )
      errors.push(`Missing metadata: ${i.id}`);
    if (
      i.transfer !== (i.stage === "transfer") ||
      (i.transfer && !i.transferBasis)
    )
      errors.push(`Invalid transfer: ${i.id}`);
    if (i.format === "choice" && !i.answers.every((a) => i.options.includes(a)))
      errors.push(`Missing choice: ${i.id}`);
    if (
      Object.values(i.wrong).some(
        (tag) => !misconceptions.includes(tag as Misconception),
      )
    )
      errors.push(`Unknown misconception: ${i.id}`);
    if (Object.keys(i.wrong).some((a) => i.answers.includes(a)))
      errors.push(`Correct distractor: ${i.id}`);
  }
  return errors;
}
/** Replace this boundary when the shared Elastic Lexi Vector contract is available. */
export const tamilModule = {
  contract: "provisional-language-module.v1",
  language: "ta",
  ontology,
  competencies,
  items,
  activities,
  misconceptions,
  evaluate,
  evidence,
} as const;
