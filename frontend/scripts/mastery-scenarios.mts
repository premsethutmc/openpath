/**
 * Research for decision C (not production): how candidate mastery rules and misconception-resolution rules judge
 * concrete answer histories, run through the app's own engine.
 *
 *   node --import tsx scripts/mastery-scenarios.mts
 *
 * Each scenario answers chosen dictation words (inflections) in chosen sessions, with or without a lesson first.
 * The engine and the profile are the app's own; the two rules compared here are written out below and used nowhere
 * else. Synthetic histories: they show what each rule would decide, not how children learn.
 */
import { type Decision, leafView } from "../../packages/english-core/src/index.ts";
import { type Code, loadContent } from "../src/english/logic/content.ts";
import { Learner } from "../src/english/logic/learner.ts";
import { misconceptionFindings } from "../src/english/logic/misconceptions.ts";
import { MemoryRepo } from "../src/english/logic/store.ts";

const c = loadContent();
const CAP = "EN.FND.SPL.inflections";
const bank = c.dictation.items.filter((i) => i.target === CAP);
// dictation words, and hand-written fill-in questions (a second format: the engine needs two before it demonstrates)
const cloze = [...c.handWritten].map((id) => c.ctx.content.items.get(id) as Code).filter((i) => i.target === CAP && i.format === "typed:cloze");
const word = (w: string) => bank.find((i) => i.answers![0] === w) ?? cloze.find((i) => i.answers![0] === w)!;

type Step = { lesson?: boolean; answers: [string, boolean | string][] };

async function history(days: Step[], gapDays = 1) {
  let t = Date.parse("2026-10-01T09:00:00.000Z");
  const clock = () => new Date((t += 60_000)).toISOString();
  const l = await Learner.create(c, new MemoryRepo(), "Sim", "guardian", clock, "m");
  l.speechAvailable = true;
  for (const day of days) {
    t += gapDays * 86_400_000;
    await l.start({ type: "spelling_assess" });
    if (day.lesson) await l.finishLesson(`${CAP}#double_short`, true);
    for (const [w, ok] of day.answers) {
      const it = word(w);
      await l.answer(it, { kind: "typed", text: ok === true ? w : ok === false ? `${w}x` : ok }, { use: "assessment" });
    }
    await l.stop();
  }
  return { l, now: clock() };
}

/** Independent counted answers on the capability, oldest first (accepted, not after teaching, not repeats). */
function independent(l: Learner) {
  return l.state.ledger.decisions.filter((d) => d.capability === CAP && d.verdict === "accepted" && d.observation?.kind === "binary" && d.observation.setting !== "after_teaching" && d.observation.exposure !== "repeat");
}

const b = (d: Decision) => (c.ctx.content.items.get(d.observation!.item) as Code).b;

/** Rejected option: lifetime share of independent answers right must be at least half. */
const lifetime = (ds: Decision[]) => ds.filter((d) => d.observation!.value === 1).length * 2 >= ds.length;

/**
 * Proposed rule C' (for discussion). On top of the engine's demonstration at level L (unchanged):
 *   recent      only the latest 6 independent answers count, and none from before the latest teaching on the skill
 *               (earlier mistakes stay in the history, they just do not block a newer claim)
 *   at level    at least 2 of those recent answers right on questions at L − 0.25 or harder (at the level claimed)
 *   no contradiction  no recent wrong answer on a question at L − 1 or easier (failing clearly easier questions
 *               contradicts a claim of L)
 *   diversity   the recent right answers at level are on at least 2 different questions (the engine also asks for 2 formats)
 *   retention   "confirmed" additionally needs a right answer at a later check 7+ days after the first claim (unchanged)
 */
function proposed(ds: Decision[], L: number | null, taughtAt: string | null): { ok: boolean; why: string } {
  if (L === null) return { ok: false, why: "the engine demonstrates no level" };
  const recent = ds.filter((d) => !taughtAt || d.at > taughtAt).slice(-6);
  const atLevel = recent.filter((d) => d.observation!.value === 1 && b(d) >= L - 0.25);
  const contra = recent.filter((d) => d.observation!.value === 0 && b(d) <= L - 1);
  const distinct = new Set(atLevel.map((d) => d.observation!.item)).size;
  if (contra.length) return { ok: false, why: `${contra.length} recent wrong answer(s) on clearly easier questions (b ≤ ${L - 1})` };
  if (distinct < 2) return { ok: false, why: `only ${distinct} recent right answer(s) at level ${L} or near it` };
  return { ok: true, why: `${distinct} recent right answers at or near level ${L}; no recent error on easier questions` };
}

const scenarios: [string, Step[]][] = [
  ["S1 wrong before teaching, right after (separate sessions)", [{ answers: [["stopped", false], ["dropped", false], ["running", false], ["clapped", false], ["cried", false]] }, { lesson: true, answers: [] }, { answers: [["sitting", true], ["swimming", true], ["writing", true], ["carried", true], ["hurried", true]] }]],
  ["S2 two right early, then four wrong on easier words (the 2-of-6 case)", [{ answers: [["beginning", true], ["forgetting", true], ["happier", true]] }, { answers: [["arriving", false], ["grabbed", false], ["brushes", false], ["clapped", false], ["running", false]] }]],
  ["S3 consistently right", [{ answers: [["stopped", true], ["running", true], ["hurried", true], ["cried", true], ["forgotten", true], ["beginning", true]] }]],
  ["S4 right on easy words only, wrong at harder ones", [{ answers: [["pointed", true], ["playing", true], ["wishes", true], ["boxes", true], ["forgotten", false], ["beginning", false]] }]],
  ["S5 alternating right and wrong at one level", [{ answers: [["stopped", true], ["dropped", false], ["running", true], ["clapped", false], ["swimming", true], ["sitting", false]] }]],
  ["S6 an old error, then steady recent success (no teaching)", [{ answers: [["stopped", false], ["running", false]] }, { answers: [["shopping", true], ["swimming", true], ["writing", true], ["carried", true], ["hurried", true], ["cried", true]] }]],
];

console.log("## Mastery: how each rule judges the same history\n");
console.log("| Scenario | Answers (independent) | Engine level | Current standing | Lifetime ≥ 50% right (rejected) | Proposed C' |");
console.log("|---|---|---|---|---|---|");
for (const [name, days] of scenarios) {
  const { l, now } = await history(days);
  const v = leafView(l.state.ledger.composite, c.index, CAP, now);
  const cap = l.profile().capabilities.find((x) => x.id === CAP)!;
  const ds = independent(l);
  const taught = l.events.filter((e) => e.kind === "lesson").at(-1)?.at ?? null;
  const L = v.verification.currentLevel ?? v.demonstrated;
  const p = proposed(ds, L, taught);
  const right = ds.filter((d) => d.observation!.value === 1).length;
  console.log(`| ${name} | ${right} of ${ds.length} right | ${L ?? "none"} | ${cap.standing} | ${lifetime(ds) ? "allows" : "blocks"} | ${p.ok ? "allows" : "blocks"}: ${p.why} |`);
}

/** Resolution: current rule (2 later right answers on questions that test the misconception) vs a proposed one. */
function proposedResolution(l: Learner, tag: string): { ok: boolean; why: string } {
  const ds = l.state.ledger.decisions.filter((d) => d.capability === CAP && d.verdict === "accepted" && d.observation?.setting !== "after_teaching" && d.observation?.exposure !== "repeat");
  const errors = ds.filter((d) => d.observation!.value === 0 && d.observation!.misconceptions.includes(tag));
  const last = errors.at(-1)!;
  const hardest = Math.max(...errors.map(b));
  const probes = (d: Decision) => Object.values((c.ctx.content.items.get(d.observation!.item) as Code).wrong ?? {}).includes(tag);
  const later = ds.filter((d) => d.at > last.at && probes(d));
  const rightAtLevel = later.filter((d) => d.observation!.value === 1 && b(d) >= hardest - 0.5);
  const laterDay = rightAtLevel.some((d) => Date.parse(d.at) - Date.parse(last.at) >= 86_400_000);
  if (later.some((d) => d.observation!.value === 0)) return { ok: false, why: "a later answer still shows it" };
  if (new Set(rightAtLevel.map((d) => d.observation!.item)).size < 2) return { ok: false, why: `fewer than 2 later right answers at the difficulty of the error (b ≥ ${hardest - 0.5})` };
  if (!laterDay) return { ok: false, why: "not yet on a later day (straight after the error it may be short-term)" };
  return { ok: true, why: `2+ right answers at b ≥ ${hardest - 0.5}, including on a later day` };
}

const R: [string, Step[]][] = [
  ["R1 error on a hard word (admitted, 5.75), then right on 2 easy words (stopped, clapped: 3.0)", [{ answers: [["admitted", "admited"]] }, { answers: [["stopped", true], ["clapped", true]] }]],
  ["R2 error on admitted, then right on 2 words as hard (regretted, permitted: 6.0) the next day", [{ answers: [["admitted", "admited"]] }, { answers: [["regretted", true], ["permitted", true]] }]],
  ["R3 error on admitted, then right on regretted and permitted straight away, same session", [{ answers: [["admitted", "admited"], ["regretted", true], ["permitted", true]] }]],
  ["R4 error on stopped (3.0), then right on dropped and grabbed (3.0–3.25) the next day", [{ answers: [["stopped", "stoped"]] }, { answers: [["dropped", true], ["grabbed", true]] }]],
];
console.log("\n## Misconception resolution: two later right answers\n");
console.log("| Scenario | Current status | Proposed |");
console.log("|---|---|---|");
for (const [name, days] of R) {
  const { l } = await history(days);
  const f = misconceptionFindings(l.state, c).find((x) => x.misconception === "no_doubling")!;
  const p = proposedResolution(l, "no_doubling");
  console.log(`| ${name} | ${f.status} (${f.reason}) | ${p.ok ? "resolved" : "not yet resolved"}: ${p.why} |`);
}
