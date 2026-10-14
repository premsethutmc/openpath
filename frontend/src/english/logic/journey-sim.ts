/**
 * Synthetic learners for the doubling journey: deterministic answer policies driven through the app's own
 * learner calls (the same calls the screens make). Used by the journey tests; they establish software
 * behaviour, not educational effectiveness.
 */
import type { Item, Response } from "../../../../packages/english-core/src/index.ts";
import type { Code } from "./content.ts";
import type { Learner } from "./learner.ts";
import type { JourneyView } from "./journey.ts";

export const DAY = 86_400_000;

export function testClock(start = "2026-10-14T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = () => new Date((t += 60_000)).toISOString();
  clock.days = (n: number) => (t += n * DAY);
  return clock;
}

/** The right answer, or the form a learner who does not double would write. */
export const right = (item: Item): Response => ({ kind: "typed", text: (item as Code).answers![0] });
export function noDouble(item: Item): Response {
  const c = item as Code;
  if (c.generated) return { kind: "typed", text: c.generated.base! + c.generated.join!.replace("-", "") };
  const tagged = Object.entries(c.wrong ?? {}).find(([, tag]) => tag === "no_doubling")?.[0];
  return tagged ? { kind: "typed", text: tagged } : right(item); // contrast items: not doubling is right
}

export interface Behaviour {
  /** Independent questions: right? */
  independent: (item: Code, l: Learner) => boolean;
  /** Guided practice: the number of hints after which the learner gets it right (0 = first try; Infinity = never). */
  guided: (item: Code, l: Learner) => number;
}

export const strategiesTaught = (l: Learner) => l.events.filter((e) => e.kind === "intervention").map((e) => (e as { strategy: string }).strategy);

export interface Trace {
  steps: string[];
  outcome: string | undefined;
  decision: string;
  diagnosis: string;
}

export async function runJourney(l: Learner, b: Behaviour): Promise<Trace> {
  const t = await runJourney0(l, b);
  if (process.env.TRACE) console.log(l.profileId, JSON.stringify(t));
  return t;
}
async function runJourney0(l: Learner, b: Behaviour): Promise<Trace> {
  const steps: string[] = [];
  await l.startJourney();
  for (let guard = 0; guard < 200; guard++) {
    const v = await l.journey();
    const s = v.step;
    if (s.kind === "summary") {
      await l.finishJourney();
      return { steps, outcome: v.decision.outcome, decision: v.decision.action, diagnosis: v.decision.diagnosis.kind };
    }
    await stepJourney(l, b, v, steps);
  }
  throw new Error("journey did not finish");
}

/** Carry out one journey step for a synthetic learner. */
export async function stepJourney(l: Learner, b: Behaviour, v: JourneyView, steps: string[] = []): Promise<void> {
  const s = v.step;
  {
    if (s.kind === "summary") return;
    if (s.kind === "teach") {
      steps.push(`teach:${s.strategy.id}`);
      await l.teach(s.strategy, v.decision.reason);
    } else if (s.kind === "question") {
      const ok = b.independent(s.item, l);
      steps.push(`${s.purpose}:${s.item.id}:${ok ? "right" : "wrong"}`);
      await l.answerJourney(s.item, ok ? right(s.item) : noDouble(s.item), s.purpose);
    } else {
      const need = b.guided(s.item, l);
      const tries = s.attempts.length;
      const hints = s.hints.length;
      if (tries > hints) await l.hint(s.item, s.strategy); // the last try was wrong: ask for the next hint
      else await l.answerGuided(s.item, hints >= need ? right(s.item) : noDouble(s.item), s.intervention);
      if (tries === 0) steps.push(`guided:${s.item.id}`);
    }
  }
}


const contrast = (i: Code) => (i.family ?? "").endsWith(".contrast");

/** The six demonstration learners. F also returns after `returnAfterDays` and answers the retention check. */
export const LEARNERS: Record<string, { label: string; behaviour: (l: Learner) => Behaviour; returnAfterDays?: number; returnBehaviour?: Behaviour }> = {
  A: { label: "Understands doubling and succeeds on their own", behaviour: () => ({ independent: () => true, guided: () => 0 }) },
  B: { label: "Fails at first, responds to teaching, then succeeds on unfamiliar words", behaviour: (l) => ({ independent: () => strategiesTaught(l).length > 0, guided: () => 0 }) },
  C: { label: "The first explanation does not work; a different approach does", behaviour: (l) => ({ independent: (i) => strategiesTaught(l).includes("sound_first") || contrast(i), guided: () => (strategiesTaught(l).includes("sound_first") ? 0 : Infinity) }) },
  D: { label: "Succeeds only after hints", behaviour: () => ({ independent: (i) => contrast(i), guided: () => 1 }) },
  E: { label: "Repeatedly fails; the app stops and recommends support", behaviour: () => ({ independent: (i) => contrast(i), guided: () => Infinity }) },
  F: { label: "Succeeds, then fails the check a week later", behaviour: () => ({ independent: () => true, guided: () => 0 }), returnAfterDays: 8, returnBehaviour: { independent: (i) => contrast(i), guided: () => 0 } },
};
