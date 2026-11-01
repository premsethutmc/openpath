/**
 * Hidden knowledge state and the learning / forgetting model (synthetic-learning-model@1).
 *
 * EVERY NUMBER HERE AND IN profiles/*.json IS A SYNTHETIC, CONFIGURABLE PARAMETER chosen to make each profile behave as its description says.
 * None is an empirical statistic about real students. The model is deliberately simple and explicit:
 *   - skill[k].stable / skill[k].fragile in [0,1]: the chance that the learner carries out the step of kind k correctly is
 *     min(1, stable + fragile) (fragile knowledge is what instruction adds before it is consolidated by independent practice);
 *   - misconception[id] in [0,1]: the chance that, at an opportunity for that error, the learner makes it;
 *   - instruction: an outcome is DRAWN (full / partial / none) from the profile, and applies only to the kind and misconception that the
 *     delivered explanation actually addresses (as the learner can see it); nothing is guaranteed;
 *   - practice: answering alone and seeing the result consolidates fragile knowledge (by a profile rate) and nudges stable knowledge;
 *   - forgetting: exponential decay with a profile half-life towards a floor; fragile knowledge decays faster; a reduced misconception can relapse.
 */
import type { Rng } from "./rng";
import type { Kind } from "./reading";

export const MODEL_VERSION = "synthetic-learning-model@1" as const;
export const KINDS: readonly Kind[] = ["one-step", "two-step", "both-sides", "brackets", "modelling"];
/** S2 (cohort B): error patterns that OpenPath's teaching taxonomy does not represent: bracket-add, coefficient-dropped, reversed-subtraction,
 *  negate-on-divide (and divide-wrong-way, from S1). They are drawn only when a profile gives them a strength (no draw otherwise, so
 *  earlier profiles replay unchanged). */
export const MISCONCEPTIONS = ["bracket-add", "coefficient-dropped", "reversed-subtraction", "negate-on-divide", "divide-wrong-way", "inverse-operation", "added-not-subtracted", "forgot-divide", "divided-first", "only-one-side", "x-sign-kept", "number-sign-kept", "first-term-only", "bracket-sign", "model-swap", "model-sign"] as const;
export type Misconception = (typeof MISCONCEPTIONS)[number];

export interface Profile {
  schema: "synthetic-learner-profile@1"; id: string; version: string; name: string; description: string; seed: number;
  skills: Record<Kind, number>;
  misconceptions: Partial<Record<Misconception, number>>;
  /** chance of an arithmetic slip at each computed step */
  slip: number;
  /** chance of not engaging at all and guessing (a random choice, or a plausible number) */
  guess: number;
  /** when the learner knows the answer: chance that the written working is invalid anyway (copied answer, invented lines) */
  invalidWorkingWithCorrectAnswer: number;
  working: { full: number; partial: number; bare: number; none: number; unsupportedNotation: number };
  hints: { seek: number; help: number };
  instruction: { full: number; partial: number; gain: number; fragileShare: number; misconceptionReduction: number; misconceptionResponse: number; offTargetGain: number };
  practice: { consolidate: number; gainRight: number; gainWrong: number };
  forgetting: { halfLifeDays: number; floor: number; fragileHalfLifeDays: number; relapse: number };
  /** S2 (optional): the experimental cohort, the instruction-response model, and knowledge that starts fragile (misleading early success) */
  cohort?: "A" | "B" | "C";
  learningModel?: "title" | "content-features";
  initialFragile?: Partial<Record<Kind, number>>;
}
/** the kind of step at which each misconception occurs (the content-features model reduces it only through an explanation of that kind) */
export const MISCONCEPTION_KIND: Record<Misconception, Kind> = {
  "bracket-add": "brackets", "first-term-only": "brackets", "bracket-sign": "brackets",
  "coefficient-dropped": "both-sides", "only-one-side": "both-sides", "x-sign-kept": "both-sides", "number-sign-kept": "both-sides",
  "reversed-subtraction": "two-step", "added-not-subtracted": "two-step", "divided-first": "two-step", "forgot-divide": "two-step", "negate-on-divide": "two-step", "divide-wrong-way": "two-step",
  "inverse-operation": "one-step", "model-swap": "modelling", "model-sign": "modelling",
};
export interface SkillState { stable: number; fragile: number }
export interface HiddenState {
  model: typeof MODEL_VERSION; profile: string;
  skill: Record<Kind, SkillState>;
  misconception: Partial<Record<Misconception, number>>;
  /** initial misconception strength (a reduced one can relapse towards it) */
  misconceptionOrigin: Partial<Record<Misconception, number>>;
  history: { at: string; event: string; detail: string }[];
}
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ability = (s: HiddenState, k: Kind) => clamp(s.skill[k].stable + s.skill[k].fragile);
export function initialState(p: Profile): HiddenState {
  const skill = Object.fromEntries(KINDS.map((k) => [k, { stable: clamp(p.skills[k] ?? 0), fragile: clamp(p.initialFragile?.[k] ?? 0) }])) as Record<Kind, SkillState>;
  return { model: MODEL_VERSION, profile: `${p.id}@${p.version}`, skill, misconception: { ...p.misconceptions }, misconceptionOrigin: { ...p.misconceptions }, history: [] };
}
const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** what the learner understood an explanation to be about (from its visible title and text), and what it delivered */
export interface Intervention { kind: Kind | null; misconception: Misconception | null; title: string }
/** instruction: an outcome is drawn; only what the explanation addresses can improve */
export function applyInstruction(s: HiddenState, p: Profile, iv: Intervention, rng: Rng, at: string): "full" | "partial" | "none" {
  const r = rng.next();
  const outcome = r < p.instruction.full ? "full" : r < p.instruction.full + p.instruction.partial ? "partial" : "none";
  const g = outcome === "full" ? p.instruction.gain : outcome === "partial" ? p.instruction.gain / 2 : 0;
  for (const k of KINDS) {
    if (!iv.kind) break;                                         // an explanation the learner cannot place teaches nothing
    const target = iv.kind === k;
    const gk = target ? g : g * p.instruction.offTargetGain;   // an explanation of another kind barely helps this one
    if (!gk) continue;
    const room = 1 - ability(s, k);
    const add = gk * room;
    s.skill[k].fragile = round(s.skill[k].fragile + add * p.instruction.fragileShare);
    s.skill[k].stable = round(clamp(s.skill[k].stable + add * (1 - p.instruction.fragileShare)));
  }
  if (p.learningModel === "content-features") {
    // neutral: no title is recognised; any explanation whose worked examples are of a kind can reduce the misconceptions of that kind, all equally
    if (iv.kind && outcome !== "none") for (const m of Object.keys(s.misconception).sort() as Misconception[])
      if ((s.misconception[m] ?? 0) > 0 && MISCONCEPTION_KIND[m] === iv.kind && rng.chance(p.instruction.misconceptionResponse)) s.misconception[m] = round((s.misconception[m] ?? 0) * (1 - p.instruction.misconceptionReduction));
  } else if (iv.misconception && (s.misconception[iv.misconception] ?? 0) > 0 && outcome !== "none" && rng.chance(p.instruction.misconceptionResponse))
    s.misconception[iv.misconception] = round((s.misconception[iv.misconception] ?? 0) * (1 - p.instruction.misconceptionReduction));
  s.history.push({ at, event: "instruction", detail: `${iv.title} → ${outcome}${iv.kind ? ` (${iv.kind})` : ""}${iv.misconception ? ` [${iv.misconception}]` : ""}` });
  return outcome;
}
/** independent practice on a kind, after seeing whether the answer was right */
export function applyPractice(s: HiddenState, p: Profile, k: Kind, right: boolean | null, independent: boolean, at: string) {
  if (!independent || right === null) return;
  const sk = s.skill[k];
  const moved = sk.fragile * p.practice.consolidate;          // consolidation: fragile becomes stable through use alone
  sk.fragile = round(sk.fragile - moved); sk.stable = round(clamp(sk.stable + moved));
  const g = right ? p.practice.gainRight : p.practice.gainWrong;
  sk.stable = round(clamp(sk.stable + g * (1 - ability(s, k))));
  s.history.push({ at, event: "practice", detail: `${k} ${right ? "right" : "wrong"}` });
}
/** forgetting over `days` */
export function applyForgetting(s: HiddenState, p: Profile, days: number, at: string) {
  if (days <= 0) return;
  const f = Math.pow(0.5, days / p.forgetting.halfLifeDays), ff = Math.pow(0.5, days / p.forgetting.fragileHalfLifeDays);
  for (const k of KINDS) {
    const sk = s.skill[k];
    const floor = Math.min(sk.stable, p.forgetting.floor);
    sk.stable = round(floor + (sk.stable - floor) * f);
    sk.fragile = round(sk.fragile * ff);
  }
  for (const [m, v] of Object.entries(s.misconception) as [Misconception, number][]) {
    const o = s.misconceptionOrigin[m] ?? 0;
    if (v < o) s.misconception[m] = round(v + (o - v) * p.forgetting.relapse * (1 - f));
  }
  s.history.push({ at, event: "time", detail: `${days} day(s)` });
}
