/**
 * A synthetic learner (synthetic-learner@1). Its hidden knowledge state is a private field: no method returns it to a caller that drives
 * OpenPath. The learner reads only learner-visible views (question text and options, feedback level, explanation title and text) and
 * advances only on the simulation clock.
 */
import { SimClock } from "./clock";
import { applyForgetting, applyInstruction, applyPractice, initialState, type HiddenState, type Intervention, type Misconception, type Profile } from "./model";
import { readTask, type Kind } from "./reading";
import { respond, type QuestionView, type Reasoning, type Response } from "./responder";
import { Rng } from "./rng";

export interface TeachingView { title: string; text: string }
export type FeedbackLevel = "correct" | "incorrect" | "unresolved" | "none";
/** the hidden-side record of one learner event (research output only; never sent to OpenPath) */
export interface HiddenEvent { n: number; at: string; event: string; detail: unknown; state: { skill: HiddenState["skill"]; misconception: HiddenState["misconception"] } }

/** how the learner understands an explanation it is shown, from its visible title and text (the simulator's own reading table) */
const READING: { re: RegExp; kind: Kind; misconception: Misconception | null }[] = [
  { re: /finish by dividing/i, kind: "two-step", misconception: "forgot-divide" },
  { re: /opposite operation/i, kind: "two-step", misconception: "added-not-subtracted" },
  { re: /divide the whole side/i, kind: "two-step", misconception: "divided-first" },
  { re: /change both sides/i, kind: "both-sides", misconception: "only-one-side" },
  { re: /taking away an x term/i, kind: "both-sides", misconception: "x-sign-kept" },
  { re: /taking away a number/i, kind: "both-sides", misconception: "number-sign-kept" },
  { re: /multiply every term in the bracket/i, kind: "brackets", misconception: "first-term-only" },
  { re: /sign in the bracket/i, kind: "brackets", misconception: "bracket-sign" },
  { re: /x on both sides/i, kind: "both-sides", misconception: null },
  { re: /bracket/i, kind: "brackets", misconception: null },
  { re: /one step at a time|two steps/i, kind: "two-step", misconception: null },
  { re: /keep the balance|one step/i, kind: "one-step", misconception: null },
  { re: /equation (?:for|of) (?:a|the) (?:story|situation)|word problem|form an equation/i, kind: "modelling", misconception: null },
];
export function understand(t: TeachingView): Intervention {
  const hit = READING.find((r) => r.re.test(t.title)) ?? READING.find((r) => r.re.test(t.text));
  return { kind: hit?.kind ?? null, misconception: hit?.misconception ?? null, title: t.title };
}

export class SyntheticLearner {
  readonly profile: Readonly<Profile>;
  readonly clock: SimClock;
  #state: HiddenState;
  #rng: { respond: Rng; learn: Rng };
  #trace: HiddenEvent[] = [];
  #pending: { kind: Kind | null; independent: boolean; engaged: boolean } | null = null;
  constructor(profile: Profile, clock: SimClock, seed: number = profile.seed) {
    this.profile = Object.freeze(structuredClone(profile));
    this.clock = clock;
    this.#state = initialState(profile);
    const root = new Rng(seed);
    this.#rng = { respond: root.stream("respond"), learn: root.stream("learn") };
    this.#log("start", { profile: `${profile.id}@${profile.version}`, seed });
  }
  #log(event: string, detail: unknown) { this.#trace.push({ n: this.#trace.length + 1, at: this.clock.iso(), event, detail, state: structuredClone({ skill: this.#state.skill, misconception: this.#state.misconception }) }); }
  /** answer (or ask for a hint on) a visible question */
  respond(view: QuestionView): Response {
    const { r, why } = respond(view, this.#state, this.profile as Profile, this.#rng.respond);
    const t = readTask(view.prompt);
    // independent from the LEARNER's side: it used no help (it does not depend on how OpenPath classified the activity); a guess is not practice
    if (r.kind === "answer") this.#pending = { kind: t.kind === "unknown" ? null : t.kind, independent: !view.hintShown, engaged: why.mode === "solved" };
    this.#log("respond", { prompt: view.prompt, response: r, reasoning: why satisfies Reasoning });
    return r;
  }
  /** the feedback level the learner sees after answering */
  observeFeedback(level: FeedbackLevel) {
    if (!this.#pending) return;
    const p = this.#pending; this.#pending = null;
    if (p.kind && p.engaged) applyPractice(this.#state, this.profile as Profile, p.kind, level === "correct" ? true : level === "incorrect" ? false : null, p.independent, this.clock.iso());
    this.#log("feedback", { level, practice: p });
  }
  /** an explanation the learner is shown (the learner decides what it was about from what it sees) */
  observeTeaching(view: TeachingView) {
    const iv = understand(view);
    const outcome = applyInstruction(this.#state, this.profile as Profile, iv, this.#rng.learn, this.clock.iso());
    this.#log("teaching", { title: view.title, understood: iv, outcome });
  }
  /** simulated time passes (forgetting) */
  advance(days: number) { this.clock.advanceDays(days); applyForgetting(this.#state, this.profile as Profile, days, this.clock.iso()); this.#log("time", { days }); }
  /** research output only: a copy of the hidden trace (never given to the OpenPath port) */
  hiddenTrace(): HiddenEvent[] { return structuredClone(this.#trace); }
  /** research output only: a copy of the current hidden state */
  hiddenSnapshot(): HiddenState { return structuredClone(this.#state); }
}
