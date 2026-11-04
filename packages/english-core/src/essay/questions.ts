/**
 * Fresh diagnostic questions written by a language model for one suspected gap (essay-questions.v1).
 *
 * The model only proposes. Code checks every question before it can be asked:
 *   structure       the format, one blank, 3–4 distinct options (or accepted typed answers), lengths for Grade 8,
 *                   a band near the target, misconception tags the framework lists, nothing addressed to a marker;
 *   answer key      the stated correct sentence is exactly the stem with the key filled in, no distractor gives the
 *                   same sentence, and the explanation names the key;
 *   duplicates      no two questions alike, none close to a bank question, an earlier generated question, a lesson
 *                   example, or a sentence of the learner's own essay.
 * One failing question rejects the whole set (five checked questions or none), and the reasons are recorded.
 *
 * Two-track policy. Accepted questions become code items with `evidence_status: "provisional"` and a
 * `model_generated` record, on the PRACTICE track: they give formative feedback (formativeOutcome) and may serve guided
 * practice. The engine's existing content-validation gate holds every answer to a provisional item: the answer is
 * scored and kept with its provenance, and it never changes an estimate, so it can never establish demonstrated or
 * verified mastery; and they never confirm or rule out a gap. The FORMAL track (diagnosis, independent checks, the
 * delayed retention check) uses only eligible, unseen bank questions. Nobody has reviewed generated questions, and
 * nothing here says so.
 */
import { scoreCode } from "../content.ts";
import { scrubIdentifiers } from "../evaluation.ts";
import { instructionLike } from "../freeform.ts";
import { fnv1a } from "../model.ts";
import type { CapabilityId, CodeItem, EssayEvent, LedgerEvent } from "../types.ts";
import { analyses, essayRecords, EssayRefusal, type EventMeta } from "./analysis.ts";
import { teachingLeak, type BankItem } from "./allocation.ts";
import { allowedTags, type EssayContext } from "./competencies.ts";
import {
  ESSAY_CONTRACT,
  ESSAY_QUESTIONS_PROTOCOL,
  type EssayEvaluator,
  type FormativeOutcome,
  type EvaluatorRef,
  type GapHypothesis,
  type QuestionRequest,
  type QuestionSet,
} from "./contract.ts";
import { gapHypotheses } from "./gaps.ts";
import { essaySentences } from "./text.ts";

export const QUESTION_LIMITS = {
  count: 5,
  minOptions: 3,
  maxOptions: 4,
  maxStemWords: 35,
  maxOptionWords: 6,
  maxAnswers: 4,
  minExplanationChars: 15,
  maxExplanationChars: 400,
  /** The band must be within this distance of the grade target. */
  bandSpread: 1.5,
  /** Word-set similarity at or above which two questions count as the same question. */
  similar: 0.8,
  maxAvoid: 60,
  maxEvidence: 8,
} as const;

const OUT_KEYS = new Set(["request_id", "competency", "questions"]);
const Q_KEYS = new Set(["format", "stem", "options", "answer", "answers", "correct_sentence", "explanation", "band", "misconceptions"]);
const BLANK = /_{3,}/g;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const words = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/_{3,}/g, " ").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const sentence = (s: string) => words(s).join(" ");
const jaccard = (a: string, b: string) => {
  const x = new Set(words(a));
  const y = new Set(words(b));
  if (x.size < 3 || y.size < 3) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
};

/** Every recorded generation attempt, oldest first. */
export const questionSets = (events: readonly LedgerEvent[]): QuestionSet[] => essayRecords(events, "questions").map((r) => r.record.set);

/** The accepted model-written questions in a learner's record (to add to the content the engine scores against). */
export const generatedQuestionItems = (events: readonly LedgerEvent[]): BankItem[] => questionSets(events).flatMap((s) => (s.status === "accepted" ? s.items : []));

/** The request for one hypothesis: its competency, the essay's quoted evidence for it, and the questions to avoid. */
export function buildQuestionRequest(ectx: EssayContext, events: readonly LedgerEvent[], hypothesis: GapHypothesis): QuestionRequest {
  const ref = ectx.profile.byCapability.get(hypothesis.competency);
  if (!ref) throw new EssayRefusal(`${hypothesis.competency} is not in profile ${ectx.profile.key}`);
  if (!ref.specified) throw new EssayRefusal(`${ref.name} is not specified in the framework yet: no descriptors to write questions from`);
  if (ref.expectedBand === null || ref.expectedBand === undefined) throw new EssayRefusal(`${ref.name} has no grade target`);
  const leaf = ectx.ctx.index.leaves.get(hypothesis.competency)!;
  const wanted = new Set(hypothesis.observations);
  const evidence = analyses(events)
    .flatMap((a) => a.observations)
    .filter((o) => wanted.has(o.id) && o.kind === "error")
    .slice(-QUESTION_LIMITS.maxEvidence)
    .map((o) => ({ quote: scrubIdentifiers(o.span.quote), ...(o.correction ? { correction: scrubIdentifiers(o.correction) } : {}), explanation: scrubIdentifiers(o.note) }));
  const earlier = generatedQuestionItems(events).filter((i) => i.target === hypothesis.competency);
  const bank = (ectx.ctx.content.byCapability.get(hypothesis.competency) ?? []).filter((i): i is BankItem => i.kind === "code" && !i.model_generated);
  const avoid = [...new Set([...earlier, ...bank].map((i) => i.prompt))].slice(0, QUESTION_LIMITS.maxAvoid);
  const attempt = questionSets(events).filter((s) => s.hypothesis === hypothesis.id).length + 1;
  return {
    protocol: ESSAY_QUESTIONS_PROTOCOL,
    rubric: ectx.profile.key,
    request_id: `q:${hypothesis.id}:${attempt}`,
    grade: ectx.profile.profile.grade,
    competency: { id: hypothesis.competency, name: ref.name, target_band: ref.expectedBand, bands: leaf.bands ?? {}, misconceptions: (leaf.misconceptions ?? []).map((m) => ({ id: m.id, description: m.description })) },
    essay_evidence: evidence,
    count: QUESTION_LIMITS.count,
    formats: ["choice", "typed"],
    avoid,
  };
}

/** Check one generated question on its own; returns its problems (empty: it passed). */
function checkQuestion(q: unknown, request: QuestionRequest, allowed: Set<string>): { problems: string[]; checks: string[] } {
  const problems: string[] = [];
  const checks: string[] = [];
  if (!isObj(q)) return { problems: ["not an object"], checks };
  for (const k of Object.keys(q)) if (!Q_KEYS.has(k)) problems.push(`unexpected field "${k}"`);
  const fmt = q.format;
  if (fmt !== "choice" && fmt !== "typed") problems.push("format must be choice or typed");
  else if (!request.formats.includes(fmt)) problems.push(`format ${fmt} was not asked for`);
  const stem = typeof q.stem === "string" ? q.stem.trim() : "";
  const blanks = stem.match(BLANK)?.length ?? 0;
  if (!stem) problems.push("no stem");
  if (blanks !== 1) problems.push(`the stem must have exactly one blank written as ___ (it has ${blanks})`);
  if (words(stem).length > QUESTION_LIMITS.maxStemWords) problems.push(`the stem is longer than ${QUESTION_LIMITS.maxStemWords} words`);
  if (/https?:\/\/|www\.|@\w/.test(stem)) problems.push("the stem contains a link or a handle");
  const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
  if (explanation.length < QUESTION_LIMITS.minExplanationChars) problems.push("no explanation");
  if (explanation.length > QUESTION_LIMITS.maxExplanationChars) problems.push("the explanation is too long");
  for (const t of [stem, explanation]) {
    const inj = instructionLike(t);
    if (inj) problems.push(`text addressed to a marker ("${inj}")`);
  }
  const band = q.band;
  const target = request.competency.target_band;
  if (typeof band !== "number" || !Number.isFinite(band) || band < 1 || band > 8) problems.push("band must be a number from 1 to 8");
  else if (Math.abs(band - target) > QUESTION_LIMITS.bandSpread) problems.push(`band ${band} is more than ${QUESTION_LIMITS.bandSpread} from the Grade ${request.grade} target (${target})`);
  const correct = typeof q.correct_sentence === "string" ? q.correct_sentence.trim() : "";
  if (!correct) problems.push("no correct_sentence");
  const fill = (x: string) => stem.replace(/_{3,}/, x.trim());
  let key = "";
  const tags = isObj(q.misconceptions) ? q.misconceptions : q.misconceptions === undefined ? {} : null;
  if (tags === null) problems.push("misconceptions must be an object");
  for (const v of Object.values(tags ?? {})) if (typeof v !== "string" || !allowed.has(v)) problems.push(`misconception ${JSON.stringify(v)} is not one the framework lists for ${request.competency.id}`);
  if (fmt === "choice") {
    const opts = Array.isArray(q.options) && q.options.every((o) => typeof o === "string" && o.trim()) ? (q.options as string[]).map((o) => o.trim()) : null;
    if (!opts) problems.push("options must be a list of non-empty strings");
    else {
      if (opts.length < QUESTION_LIMITS.minOptions || opts.length > QUESTION_LIMITS.maxOptions) problems.push(`a choice question needs ${QUESTION_LIMITS.minOptions} or ${QUESTION_LIMITS.maxOptions} options`);
      if (new Set(opts.map((o) => sentence(o))).size !== opts.length) problems.push("two options are the same");
      if (opts.some((o) => words(o).length > QUESTION_LIMITS.maxOptionWords)) problems.push(`an option is longer than ${QUESTION_LIMITS.maxOptionWords} words`);
      if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= opts.length) problems.push("answer must be the index of one option");
      else {
        key = opts[q.answer as number];
        // answer-key consistency: the key, and only the key, gives the stated correct sentence
        if (correct && sentence(fill(key)) !== sentence(correct)) problems.push("the correct sentence does not match the stem with the keyed option filled in");
        else checks.push("key gives the correct sentence");
        if (opts.some((o, i) => i !== q.answer && sentence(fill(o)) === sentence(fill(key)))) problems.push("a distractor gives the same sentence as the key");
        for (const k of Object.keys(tags ?? {})) if (!/^\d+$/.test(k) || Number(k) >= opts.length || Number(k) === q.answer) problems.push(`misconception key ${k} is not a distractor's index`);
      }
    }
    if (q.answers !== undefined) problems.push("a choice question has no typed answers");
  } else if (fmt === "typed") {
    const answers = Array.isArray(q.answers) && q.answers.every((a) => typeof a === "string" && a.trim()) ? (q.answers as string[]).map((a) => a.trim()) : null;
    if (!answers?.length) problems.push("answers must list the accepted typed answers");
    else {
      if (answers.length > QUESTION_LIMITS.maxAnswers) problems.push(`at most ${QUESTION_LIMITS.maxAnswers} accepted answers`);
      if (answers.some((a) => words(a).length > QUESTION_LIMITS.maxOptionWords)) problems.push("an accepted answer is too long to type");
      key = answers[0];
      if (correct && sentence(fill(key)) !== sentence(correct)) problems.push("the correct sentence does not match the stem with the first accepted answer filled in");
      else checks.push("key gives the correct sentence");
      for (const k of Object.keys(tags ?? {})) if (answers.some((a) => sentence(a) === sentence(k))) problems.push(`"${k}" is both an accepted answer and a wrong answer`);
    }
    if (q.options !== undefined || q.answer !== undefined) problems.push("a typed question has no options");
  }
  if (key && explanation && !sentence(explanation).includes(sentence(key))) problems.push(`the explanation does not name the key ("${key}")`);
  else if (key) checks.push("explanation names the key");
  if (!problems.length) checks.push("structure");
  return { problems, checks };
}

/**
 * Validate a writer's raw output for a request. Returns the recorded set: accepted with provisional items when
 * every question passes, otherwise rejected with the reasons. Pure: the same inputs give the same set.
 */
export function validateQuestionSet(ectx: EssayContext, events: readonly LedgerEvent[], hypothesis: GapHypothesis, request: QuestionRequest, raw: unknown, evaluator: EvaluatorRef, meta: EventMeta): QuestionSet {
  const base = { contract: ESSAY_CONTRACT, id: meta.id, essay: hypothesis.essays.at(-1)!, hypothesis: hypothesis.id, competency: hypothesis.competency, request, evaluator };
  const whole = (reasons: string[]): QuestionSet => ({ ...base, status: "rejected", reasons, rejected: [], items: [] });
  if (evaluator.protocol !== ESSAY_QUESTIONS_PROTOCOL) return whole([`the writer answered protocol ${evaluator.protocol}, not ${ESSAY_QUESTIONS_PROTOCOL}`]);
  if (evaluator.rubric !== undefined && evaluator.rubric !== ectx.profile.key) return whole([`the writer is configured for rubric ${evaluator.rubric}, not ${ectx.profile.key}`]);
  if (!isObj(raw)) return whole(["the output is not a JSON object"]);
  const shape: string[] = [];
  for (const k of Object.keys(raw)) if (!OUT_KEYS.has(k)) shape.push(`unexpected field "${k}"`);
  if (raw.request_id !== request.request_id) shape.push(`request_id must be ${request.request_id}`);
  if (raw.competency !== request.competency.id) shape.push(`competency must be ${request.competency.id}`);
  if (!Array.isArray(raw.questions)) shape.push("questions must be a list");
  else if (raw.questions.length !== request.count) shape.push(`exactly ${request.count} questions are needed (the output has ${raw.questions.length})`);
  if (shape.length) return whole(shape);

  const allowed = allowedTags(ectx, request.competency.id);
  const qs = raw.questions as unknown[];
  const checked = qs.map((q) => checkQuestion(q, request, allowed));
  const rejected: QuestionSet["rejected"] = [];
  // duplicates: within the set, against what must be avoided, and against the learner's own essays
  const stems = qs.map((q) => (isObj(q) && typeof q.stem === "string" ? q.stem : ""));
  const essayText = essayRecords(events, "submission").map((r) => r.record.submission.text);
  const essayLines = essayText.flatMap((t) => essaySentences(t));
  const teaching = ectx.teachingText?.get(request.competency.id) ?? [];
  stems.forEach((s, i) => {
    const p = checked[i].problems;
    for (let j = 0; j < i; j++) if (stems[j] && (sentence(stems[j]) === sentence(s) || jaccard(stems[j], s) >= QUESTION_LIMITS.similar)) p.push(`duplicates question ${j + 1} of this set`);
    const copied = request.avoid.find((a) => sentence(a) === sentence(s) || jaccard(a, s) >= QUESTION_LIMITS.similar);
    if (copied) p.push(`duplicates an existing question ("${copied.slice(0, 60)}")`);
    const own = essayLines.find((l) => jaccard(l, s) >= QUESTION_LIMITS.similar);
    if (own) p.push("copies a sentence of the learner's own essay");
    if (!p.length) checked[i].checks.push("no duplicate");
  });
  const items: BankItem[] = [];
  const setKey = fnv1a(meta.id);
  qs.forEach((q, i) => {
    if (checked[i].problems.length) return;
    const o = q as Record<string, unknown>;
    const id = `gen.${setKey}.${i + 1}`;
    const tags = (o.misconceptions ?? {}) as Record<string, string>;
    const common: CodeItem = {
      id,
      version: 1,
      family: id,
      target: request.competency.id,
      format: o.format === "choice" ? "choice:grammar" : "typed:cloze",
      b: Math.round((o.band as number) * 4) / 4,
      a: 1,
      prompt: (o.stem as string).trim().replace(/_{3,}/, "___"),
      explain: (o.explanation as string).trim(),
      evidence_status: "provisional",
      difficulty_source: "model_estimate",
      review: "model-generated: not reviewed by an educator",
      model_generated: { set: meta.id, request: request.request_id, evaluator: { id: evaluator.id, version: evaluator.version, ...(evaluator.model ? { model: evaluator.model } : {}), protocol: evaluator.protocol }, essay: base.essay, at: meta.at, checks: [...new Set(checked[i].checks)] },
    };
    const item: BankItem =
      o.format === "choice"
        ? { kind: "code", ...common, options: (o.options as string[]).map((x) => x.trim()), answer: o.answer as number, ...(Object.keys(tags).length ? { distractor_tags: tags } : {}) }
        : { kind: "code", ...common, answers: (o.answers as string[]).map((x) => x.trim()), ...(Object.keys(tags).length ? { wrong: Object.fromEntries(Object.entries(tags).map(([k, v]) => [sentence(k), v])) } : {}) };
    const leak = teachingLeak(item, teaching);
    if (leak) {
      checked[i].problems.push(`its answer appears in a lesson example ("${leak}")`);
      return;
    }
    items.push(item);
  });
  checked.forEach((c, index) => c.problems.length && rejected.push({ index, reasons: c.problems }));
  if (rejected.length) return { ...base, status: "rejected", reasons: [`${rejected.length} of ${qs.length} questions failed the checks, so none is used`], rejected, items: [] };
  return { ...base, status: "accepted", reasons: [`${items.length} questions passed the structure, answer-key and duplicate checks; provisional (not reviewed by an educator)`], rejected: [], items };
}

/**
 * Ask the evaluator for fresh practice questions on one essay hypothesis's competency, validate them, and return the
 * event to record (the question set). Practice track only: the set never becomes a diagnostic request, so it can never
 * confirm or rule out a gap, and the engine holds every answer (provisional items), so it never changes an estimate.
 * Formal diagnosis and independent checks use reviewed, eligible, unseen bank questions (gaps.ts, journey.ts). A failed
 * or invalid answer is recorded as a rejected set (no questions), never guessed around.
 */
export async function generatePractice(ectx: EssayContext, events: readonly LedgerEvent[], evaluator: EssayEvaluator, hypothesisId: string, meta: EventMeta): Promise<{ events: EssayEvent[]; set: QuestionSet }> {
  const h = gapHypotheses(ectx, events).find((x) => x.id === hypothesisId);
  if (!h) throw new EssayRefusal(`no hypothesis ${hypothesisId}`);
  if (!evaluator.questions || evaluator.protocols?.questions !== ESSAY_QUESTIONS_PROTOCOL) throw new EssayRefusal("no question writer is connected: fresh practice questions need the server's evaluator");
  const open = questionSets(events).find((s) => s.competency === h.competency && s.status === "accepted" && formativeOutcome(ectx, events, s).status === "pending");
  if (open) throw new EssayRefusal(`finish the practice questions already written for ${h.competency} first`);
  const request = buildQuestionRequest(ectx, events, h);
  const ref: EvaluatorRef = { id: evaluator.id, version: evaluator.version, protocol: ESSAY_QUESTIONS_PROTOCOL, ...(evaluator.model ? { model: evaluator.model } : {}), rubric: ectx.profile.key };
  let set: QuestionSet;
  try {
    const raw = await evaluator.questions(request);
    set = validateQuestionSet(ectx, events, h, request, raw, ref, meta);
  } catch (e) {
    set = { contract: ESSAY_CONTRACT, id: meta.id, essay: h.essays.at(-1)!, hypothesis: h.id, competency: h.competency, request, evaluator: ref, status: "rejected", reasons: [`the question writer failed: ${(e as Error).message}`], rejected: [], items: [] };
  }
  return { events: [{ kind: "essay", id: meta.id, at: meta.at, session: meta.session, record: { type: "questions", set } }], set };
}

/** What the answers to one accepted practice set show so far: formative feedback, never a gap decision or a level. */
export function formativeOutcome(ectx: EssayContext, events: readonly LedgerEvent[], set: QuestionSet, misconceptions: string[] = []): FormativeOutcome {
  const setAt = events.find((e) => e.kind === "essay" && e.record.type === "questions" && e.record.set.id === set.id)?.at ?? "";
  const ids = new Map(set.items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const answers: FormativeOutcome["answers"] = [];
  let matches = 0;
  for (const e of events) {
    if (e.kind !== "evidence" || e.at < setAt || seen.has(e.item.id)) continue;
    const item = ids.get(e.item.id);
    if (!item) continue;
    seen.add(item.id);
    const { correct, misconceptions: tags } = scoreCode(item, e.response);
    if (!correct && tags.some((t) => misconceptions.includes(t))) matches++;
    answers.push({ evidence: e.id, item: item.id, correct });
  }
  const right = answers.filter((a) => a.correct).length;
  const wrong = answers.length - right;
  const base = { set: set.id, competency: set.competency, right, answered: answers.length, total: set.items.length, misconceptionMatches: matches, answers };
  const note = "Practice on questions written by a model: formative feedback only. It does not confirm or rule out the gap and never counts as showing the skill.";
  if (answers.length < set.items.length) return { ...base, status: "pending", reason: `${answers.length} of ${set.items.length} practice questions answered.` };
  if (wrong >= ectx.policy.confirmMinWrong) return { ...base, status: "difficulty", reason: `${wrong} of ${answers.length} practice questions were wrong${matches ? `, ${matches} with the same kind of mistake as the essay` : ""}: more learning is likely to help. ${note}` };
  if (wrong === 0) return { ...base, status: "secure", reason: `All ${answers.length} practice questions were right. ${note}` };
  return { ...base, status: "mixed", reason: `${right} of ${answers.length} practice questions were right. ${note}` };
}

/** The latest formative outcome for each competency. */
export function formativeOutcomes(ectx: EssayContext, events: readonly LedgerEvent[]): Map<CapabilityId, FormativeOutcome> {
  const hyps = new Map(gapHypotheses(ectx, events).map((h) => [h.id, h]));
  const m = new Map<CapabilityId, FormativeOutcome>();
  for (const s of questionSets(events)) if (s.status === "accepted") m.set(s.competency, formativeOutcome(ectx, events, s, hyps.get(s.hypothesis)?.misconceptions ?? []));
  return m;
}

/** The next unanswered question of an open practice set, if any. */
export function nextPracticeQuestion(ectx: EssayContext, events: readonly LedgerEvent[]): { set: QuestionSet; item: BankItem; position: number; total: number } | null {
  for (const s of questionSets(events)) {
    if (s.status !== "accepted") continue;
    const o = formativeOutcome(ectx, events, s);
    if (o.status !== "pending") continue;
    const done = new Set(o.answers.map((a) => a.item));
    const item = s.items.find((i) => !done.has(i.id));
    if (item) return { set: s, item, position: done.size + 1, total: s.items.length };
  }
  return null;
}
