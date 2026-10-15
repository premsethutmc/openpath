/**
 * Synthetic answer histories for the evidence rules (C′, misconception resolution, dictation alone), run through
 * the app's own engine, ledger and profile. Used by mastery-gate.test.ts and scripts/mastery-scenarios.mts.
 *
 * Each history answers chosen questions in chosen sessions (a day apart unless said otherwise), with or without a
 * lesson first. They show what the rules decide on a given record; they are not evidence of how children learn.
 */
import { leafView } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, type Code, loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { misconceptionFindings } from "./misconceptions.ts";
import { MemoryRepo } from "./store.ts";

export const CAP = "EN.FND.SPL.inflections";

/** One answer: the word (dictation word, or a hand-written fill-in answer), right / wrong / the typed text, and options. */
export type Answer = [word: string, outcome: boolean | string, opts?: { assisted?: boolean }];
export interface Day {
  /** A lesson first: true is the doubling lesson (double_short); a string names the step taught. */
  lesson?: boolean | string;
  answers: Answer[];
  /** Days since the previous session (default 1). */
  gap?: number;
}

export function finder(c: AppContent) {
  const bank = c.dictation.items.filter((i) => i.target === CAP);
  // hand-written fill-in questions: a second format, as in the scenarios proposed for approval
  const cloze = [...c.handWritten].map((id) => c.ctx.content.items.get(id) as Code).filter((i) => i.target === CAP && i.format === "typed:cloze");
  return (w: string): Code => {
    const it = bank.find((i) => i.answers![0] === w) ?? cloze.find((i) => i.answers![0] === w);
    if (!it) throw new Error(`no question for "${w}"`);
    return it;
  };
}

export async function history(days: Day[], c: AppContent = loadContent(), start = "2026-10-01T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = Object.assign(() => new Date((t += 60_000)).toISOString(), { days: (n: number) => (t += n * 86_400_000) });
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, "Sim", "guardian", clock, "m");
  l.speechAvailable = true;
  l.voiceInfo = { name: "Test voice", lang: "en-GB", local: true };
  const word = finder(c);
  for (const day of days) {
    t += (day.gap ?? 1) * 86_400_000;
    await l.start({ type: "spelling_assess" });
    if (day.lesson) await l.finishLesson(`${CAP}#${day.lesson === true ? "double_short" : day.lesson}`, true);
    for (const [w, ok, o] of day.answers) {
      const it = word(w);
      await l.answer(it, { kind: "typed", text: ok === true ? w : ok === false ? `${w}x` : ok }, { use: "assessment", ...(o?.assisted ? { assisted: true } : {}) });
    }
    await l.stop();
  }
  return { l, repo, clock, c };
}

/** What the profile says about the capability, and why. */
export function judge(l: Learner, c: AppContent, cap = CAP) {
  const now = l.clock();
  const v = leafView(l.state.ledger.composite, c.index, cap, now);
  const p = l.profile().capabilities.find((x) => x.id === cap)!;
  return { engineLevel: v.verification.currentLevel ?? v.demonstrated, engineStatus: v.verification.status, standing: p.standing, mastery: p.mastery, gate: p.gate, profile: p };
}

export const MASTERY_SCENARIOS: [string, string, Day[]][] = [
  ["S1", "wrong before teaching, right after (separate sessions)", [{ answers: [["stopped", false], ["dropped", false], ["running", false], ["clapped", false], ["cried", false]] }, { lesson: true, answers: [] }, { answers: [["sitting", true], ["swimming", true], ["writing", true], ["carried", true], ["hurried", true]] }]],
  ["S2", "two right early, then four wrong on easier words (the 2-of-6 case)", [{ answers: [["beginning", true], ["forgetting", true], ["happier", true]] }, { answers: [["arriving", false], ["grabbed", false], ["brushes", false], ["clapped", false], ["running", false]] }]],
  ["S3", "consistently right", [{ answers: [["stopped", true], ["running", true], ["hurried", true], ["cried", true], ["forgotten", true], ["beginning", true]] }]],
  ["S4", "right on easy words only, wrong at harder ones", [{ answers: [["pointed", true], ["playing", true], ["wishes", true], ["boxes", true], ["forgotten", false], ["beginning", false]] }]],
  ["S5", "alternating right and wrong at one level", [{ answers: [["stopped", true], ["dropped", false], ["running", true], ["clapped", false], ["swimming", true], ["sitting", false]] }]],
  ["S6", "an old error, then steady recent success (no teaching)", [{ answers: [["stopped", false], ["running", false]] }, { answers: [["shopping", true], ["swimming", true], ["writing", true], ["carried", true], ["hurried", true], ["cried", true]] }]],
];

/** Dictation alone (one question format): demonstrated only with words on different patterns at level. */
export const DICTATION_SCENARIOS: [string, string, Day[]][] = [
  ["D1", "dictation only, right at level on words of two patterns", [{ answers: [["hurried", true], ["happier", true], ["forgotten", true], ["admitted", true], ["opened", true], ["happened", true]] }]],
  ["D2", "dictation only, right on six words, but those at the level claimed are all one pattern", [{ answers: [["stopped", true], ["smiling", true], ["hurried", true], ["happier", true], ["writing", true], ["dropped", true]] }]],
  ["D3", "dictation only, right on six words of one easy pattern", [{ answers: [["stopped", true], ["dropped", true], ["shopping", true], ["clapped", true], ["grabbed", true], ["planned", true]] }]],
];

/** The engine estimates 4; the recent answers support 3 (one right answer above 3.25), so 3 is shown and 4 is not yet. */
export const ESTIMATE_4_SHOWN_3: Day[] = [{ answers: [["stopped", true], ["churches", true], ["dropped", true], ["shopping", true], ["happier", true], ["admitted", false]] }];

export const RESOLUTION_SCENARIOS: [string, string, Day[]][] = [
  ["R1", "error on a hard word (admitted, 5.75), then right on 2 easy words (stopped, clapped: 3.0) the next day", [{ answers: [["admitted", "admited"]] }, { answers: [["stopped", true], ["clapped", true]] }]],
  ["R2", "error on admitted, then right on 2 words as hard (regretted, permitted: 6.0) the next day", [{ answers: [["admitted", "admited"]] }, { answers: [["regretted", true], ["permitted", true]] }]],
  ["R3", "error on admitted, then right on regretted and permitted straight away, same session", [{ answers: [["admitted", "admited"], ["regretted", true], ["permitted", true]] }]],
  ["R4", "error on stopped (3.0), then right on dropped and grabbed (3.0–3.25) the next day", [{ answers: [["stopped", "stoped"]] }, { answers: [["dropped", true], ["grabbed", true]] }]],
];

export function finding(l: Learner, c: AppContent, tag = "no_doubling") {
  return misconceptionFindings(l.state, c).find((x) => x.capability === CAP && x.misconception === tag)!;
}
