/**
 * The synthetic learner histories A–F for the learner profile demonstration, built with the app's own Learner
 * calls on real framework capabilities and the real question bank. Each history can stop after any stage, so
 * the same learner can be shown before and after new evidence. Deterministic: the same stage gives the same
 * events. Synthetic learners show software behaviour, not educational effectiveness.
 */
import type { EvidenceEvent } from "../../../../packages/english-core/src/index.ts";
import type { AppContent } from "./content.ts";
import type { AppEvent } from "./events.ts";
import { runJourney, testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { respond, runSession, start } from "./profile-sim.ts";
import { MemoryRepo } from "./store.ts";

export const RDG_MAIN = "EN.RDG.SUM.main_idea";
export const RDG_DETAIL = "EN.RDG.LIT.locate_detail";
export const SVA = "EN.GRM.VERB.sva";
export const INF = "EN.FND.SPL.inflections";
export const SPELLING = ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological", "EN.FND.SPL.homophones"];
export const ARTICLES = "EN.GRM.NOUN.articles";

const all = () => true;
type Clock = ReturnType<typeof testClock>;
const check = (l: Learner, id: string, policy: (i: { target: string }) => boolean, purpose: "assess" | "retention" = "assess") => runSession(l, { type: "check", capability: id, purpose }, policy);

export interface Scenario {
  key: string;
  label: string;
  /** Stage names, in order; a history stops after the named stage. */
  stages: string[];
  run: (l: Learner, clock: Clock, upTo: string) => Promise<void>;
  /** The record as an older app would have stored it (K): applied to the events before export. */
  transform?: (events: AppEvent[]) => AppEvent[];
}

/** G's start: wrong on articles on their own, then the lesson and practice the plan offers, all right. */
async function lessonThenPractice(l: Learner) {
  await start(l, (i) => i.target !== ARTICLES);
  await check(l, ARTICLES, () => false);
  await runSession(l, l.profile().activities[0].step, all); // keep learning: the lesson, then practice
}

export const SCENARIOS: Scenario[] = [
  {
    key: "A",
    label: "Strong spelling, uncertain reading comprehension",
    stages: ["profile"],
    run: async (l) => {
      await start(l, all);
      for (const id of SPELLING) await check(l, id, all);
      await l.start({ type: "check", capability: RDG_MAIN, purpose: "assess" });
      for (const ok of [true, false]) {
        const cur = await l.current();
        await l.answer(cur.next!.item, respond(cur.next!.item, ok), { use: cur.next!.use });
      }
      await l.stop();
    },
  },
  {
    key: "B",
    label: "Finds the main idea hard; the skill it builds on (finding details) has not been measured",
    stages: ["before", "after"],
    run: async (l, _c, upTo) => {
      await start(l, all);
      await check(l, RDG_MAIN, () => false);
      if (upTo === "before") return;
      await check(l, RDG_DETAIL, all); // the prerequisite check the plan asked for: shown
    },
  },
  {
    key: "C",
    label: "Finds subject–verb agreement hard; after the lesson, right in practice (awaiting confirmation)",
    stages: ["before", "after"],
    run: async (l, _c, upTo) => {
      await start(l, (i) => i.target !== SVA);
      await check(l, SVA, () => false);
      if (upTo === "before") return;
      await runSession(l, { type: "guided", capability: SVA }, all);
    },
  },
  {
    key: "D",
    label: "Showed subject–verb agreement, then was wrong at the check ten days later",
    stages: ["due", "after"],
    run: async (l, clock, upTo) => {
      await start(l, all);
      await check(l, SVA, all);
      clock.days(10);
      if (upTo === "due") return;
      await check(l, SVA, () => false, "retention");
    },
  },
  {
    key: "E",
    label: "Right in spelling practice only with help (hints), not on their own",
    stages: ["profile"],
    run: async (l) => {
      await start(l, (i) => i.target !== INF);
      await runJourney(l, { independent: (i) => (i.family ?? "").endsWith(".contrast"), guided: () => 1 });
    },
  },
  {
    key: "F",
    label: "Only three answers so far",
    stages: ["profile"],
    run: async (l) => {
      await l.start({ type: "placement" });
      for (let k = 0; k < 3; k++) {
        const cur = await l.current();
        await l.answer(cur.next!.item, respond(cur.next!.item, false), { use: cur.next!.use });
      }
      await l.stop();
    },
  },
];

SCENARIOS.push(
  {
    key: "G",
    label: "Wrong on their own, a lesson, then right in practice straight after it: improving, not shown",
    stages: ["after_lesson"],
    run: async (l) => lessonThenPractice(l),
  },
  {
    key: "H",
    label: "As G, then right on fresh questions in a separate check",
    stages: ["before", "after"],
    run: async (l, _c, upTo) => {
      await lessonThenPractice(l);
      if (upTo === "before") return;
      await runSession(l, l.profile().activities[0].step, all); // the fresh check the plan asked for
    },
  },
  {
    key: "I",
    label: "Shown after a lesson and a fresh check, then wrong at the check ten days later",
    stages: ["due", "after"],
    run: async (l, clock, upTo) => {
      await lessonThenPractice(l);
      await runSession(l, l.profile().activities[0].step, all);
      clock.days(10);
      if (upTo === "due") return;
      await check(l, ARTICLES, () => false, "retention");
    },
  },
  {
    key: "J",
    label: "Wrong first time on every question, right on the second try (help)",
    stages: ["profile"],
    run: async (l) => {
      await start(l, all);
      await runSession(l, { type: "check", capability: ARTICLES, purpose: "assess" }, () => false, { retry: true });
    },
  },
  {
    key: "K",
    label: "G's record as an older app stored it: no provenance and no record of the lesson",
    stages: ["profile"],
    run: async (l) => lessonThenPractice(l),
    transform: (events) =>
      events
        .filter((e) => e.kind !== "intervention")
        .map((e) => {
          if (e.kind !== "evidence") return e;
          const { provenance: _p, ...rest } = e as EvidenceEvent;
          return rest as AppEvent;
        }),
  },
);

SCENARIOS.push({
  key: "L",
  label: "The pilot journey on a reading skill (main idea): diagnosis, a lesson with practice, a fresh confirming check, a later check",
  stages: ["diagnosis", "after_lesson", "confirmed", "later"],
  run: async (l, clock, upTo) => {
    await start(l, all);
    for (let k = 0; k < 2; k++) await check(l, RDG_DETAIL, all); // the prerequisite, shown
    await check(l, RDG_MAIN, () => false); // diagnosis: found hard
    if (upTo === "diagnosis") return;
    await runSession(l, l.profile().activities.find((a) => a.step.capability === RDG_MAIN)!.step, all); // lesson and practice
    if (upTo === "after_lesson") return;
    await runSession(l, l.profile().activities.find((a) => a.step.capability === RDG_MAIN)!.step, all); // the fresh check
    if (upTo === "confirmed") return;
    clock.days(10);
    const later = l.profile().activities.find((a) => a.step.capability === RDG_MAIN);
    if (later) await runSession(l, later.step, all); // the later check, from the retention questions
  },
});

/** Build one scenario up to a stage, as a fresh learner with its own id. */
export async function buildScenario(content: AppContent, s: Scenario, upTo: string): Promise<Learner> {
  const clock = testClock();
  const id = `demo-${s.key}-${upTo}`;
  const l = await Learner.create(content, new MemoryRepo(), `Learner ${s.key}${s.stages.length > 1 ? ` (${upTo})` : ""}`, "guardian", clock, id);
  await s.run(l, clock, upTo);
  return l;
}
