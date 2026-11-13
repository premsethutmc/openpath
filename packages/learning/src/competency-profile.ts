/**
 * competency-profile@1: what a learner's own answers show, topic by topic, over a week, a month or the calendar year.
 *
 * For each topic (a strand of the mathematics graph) it gives a small vector of MEASURES, each a plain count or a median:
 *   volume        questions answered
 *   accuracy      share right at the first try without help
 *   independence  share answered without a hint, the solution or a guided step
 *   pace          first whether the answer is right, then how quick: the time on each question answered right at the
 *                 first try (timing@1) against the time that question should take (expected-time@1); at least five timed
 *   breadth       how many different skills were worked on
 * and, from these, three plain findings: the topic answered most accurately, the topic answered quickest, and the skills
 * where the answers say help is needed.
 *
 * What this is NOT: a prediction, a score against other children, or a claim that a topic is learned. "Quick" and "slow"
 * compare each right answer with OpenPath's own estimate of how long that question should take (a rule, not a measured
 * norm; see expected-time.ts). A measure is stated only when
 * there are enough answers behind it (MIN_ANSWERS, MIN_TIMED); otherwise it is null and the page says "not enough yet".
 */
export interface ProfileAttempt { at: string; competency: string; hints: number; solution: boolean; n: number; activity: string; ms?: number }
export type Period = "week" | "month" | "year";
export interface TopicMeasure {
  topic: string;
  answered: number;
  rightFirstTry: number;
  /** 0..1, or null with fewer than MIN_ANSWERS answers */
  accuracy: number | null;
  independence: number | null;
  /** seconds (median), or null with fewer than MIN_TIMED timed right-first-try answers */
  paceSeconds: number | null;
  /** the usual expected time for the timed questions in this topic (median), in seconds */
  expectedSeconds: number | null;
  /** how many timed right-first-try answers there were, and how many took no longer than expected */
  timedRight: number;
  withinExpected: number;
  /** the middle of (time taken ÷ time expected) over those answers: 0.5 is twice as fast as expected */
  ratio: number | null;
  /** from `ratio`: lightning (half the expected time or less), quick (within it), steady (up to 1.75×), slow */
  pace: Speed | null;
  skills: number;
  /** skills in this topic where the answers say help is needed (names) */
  stuck: string[];
}
export interface CompetencyProfile {
  period: Period;
  from: string; // local day YYYY-MM-DD
  to: string;
  answered: number;
  rightFirstTry: number;
  activeDays: number;
  /** minutes with a question on screen (sum of timed answers); null when nothing in the period was timed */
  minutes: number | null;
  /** the learner's usual pace in the period: the middle of their topic paces (each the median time on a question answered
   *  right at the first try); null until one topic has MIN_TIMED timed answers */
  paceSeconds: number | null;
  topics: TopicMeasure[];
  findings: { mostAccurate: TopicMeasure | null; quickest: TopicMeasure | null; mostPractised: TopicMeasure | null; stuck: { topic: string; skill: string }[] };
  /** activity for a calendar: week and month by day, year by month */
  calendar: { key: string; label: string; answered: number }[];
}
/** The topic a skill is shown under: its strand, with the large "number" strand split into the parts a parent would name. */
const STRAND: Record<string, string> = { algebra: "Algebra", geometry: "Geometry", measurement: "Measurement", statistics: "Data and statistics", reasoning: "Reasoning", probability: "Probability", coordinate: "Coordinate geometry", trigonometry: "Trigonometry", calculus: "Calculus", vectors: "Vectors" };
const NUMBER: [RegExp, string][] = [
  [/fraction|mixed|rational/, "Fractions"], [/decimal/, "Decimals"], [/percent|interest|profit|discount/, "Percentages"], [/^ratio(?!nal)|proportion|unit-rate/, "Ratio and proportion"], [/integer|negative/, "Integers"],
  [/mult|divis|equal-groups|sharing|factor|hcf|lcm|prime|tables/, "Multiplication, division and factors"], [/add|subtract/, "Addition and subtraction"],
  [/place|round|compar|order|numerat|count|roman|estimat|hundreds|thousands|large-numbers|zero/, "Place value and number sense"],
];
export function topicName(competency: string, strand: string): string {
  if (strand !== "number") return STRAND[strand] ?? strand[0].toUpperCase() + strand.slice(1);
  const tail = competency.split(".").slice(2).join(".");
  return NUMBER.find(([re]) => re.test(tail))?.[1] ?? "Other number work";
}
export const MIN_ANSWERS = 5;
export const MIN_TIMED = 5;

import { speedOf, type Speed } from "./expected-time";

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** `expected(a)`: about how many seconds that question should take (expected-time@1), or null when it cannot be said. */
export function competencyProfile<A extends ProfileAttempt>(attempts: readonly A[], right: (a: A) => boolean, topicOf: (competency: string) => string, skillName: (competency: string) => string, period: Period, now: number, expected: (a: A) => number | null = () => null): CompetencyProfile {
  const noon = new Date(now); noon.setHours(12, 0, 0, 0);
  const today = localDay(now);
  // week: the 7 local days ending today; month: the 30 ending today; year: 1 January of this year to today
  const from = period === "year" ? `${new Date(now).getFullYear()}-01-01` : localDay(noon.getTime() - (period === "week" ? 6 : 29) * DAY);
  const when = (a: ProfileAttempt) => Date.parse(a.at);
  const inPeriod = attempts.filter((a) => { const t = when(a); if (!Number.isFinite(t) || t > now) return false; const d = localDay(t); return d >= from && d <= today; });
  const first = (a: A) => a.n === 1 && a.hints === 0 && !a.solution && a.activity !== "guided" && right(a);
  const alone = (a: A) => a.hints === 0 && !a.solution && a.activity !== "guided";
  const timed = (list: A[]) => list.filter((a) => first(a) && typeof a.ms === "number").map((a) => a.ms! / 1000);
  // right first, then how quick: each timed right answer against the time its own question should take
  const judged = (list: A[]) => list.filter((a) => first(a) && typeof a.ms === "number").flatMap((a) => { const e = expected(a); return e !== null && speedOf(a.ms!, e) !== null ? [{ ratio: a.ms! / 1000 / e, expected: e }] : []; });
  const byTopic = new Map<string, A[]>();
  for (const a of inPeriod) { const t = topicOf(a.competency); byTopic.set(t, [...(byTopic.get(t) ?? []), a]); }
  // the learner's usual pace: the middle of their topic paces, so a topic practised a great deal does not set the bar by
  // weight of numbers (with one timed topic, that topic's own pace)
  const topicPaces = [...byTopic.values()].map(timed).filter((t) => t.length >= MIN_TIMED).map((t) => median(t)!);
  const overall = median(topicPaces);
  const topics: TopicMeasure[] = [...byTopic].map(([topic, list]) => {
    const answered = list.length, rightFirstTry = list.filter(first).length;
    const t = timed(list);
    const paceSeconds = t.length >= MIN_TIMED ? median(t) : null;
    const j = judged(list);
    const ratio = j.length >= MIN_TIMED ? median(j.map((x) => x.ratio)) : null;
    const bySkill = new Map<string, A[]>();
    for (const a of list) bySkill.set(a.competency, [...(bySkill.get(a.competency) ?? []), a]);
    // the same rule as the parent page's "could use your help": of at least three, fewer than half right at the first try, or the solution opened twice
    const stuck = [...bySkill].filter(([, l]) => l.length >= 3 && (l.filter(first).length * 2 < l.length || l.filter((a) => a.solution).length >= 2)).map(([c]) => skillName(c));
    return {
      topic, answered, rightFirstTry,
      accuracy: answered >= MIN_ANSWERS ? rightFirstTry / answered : null,
      independence: answered >= MIN_ANSWERS ? list.filter(alone).length / answered : null,
      paceSeconds,
      expectedSeconds: j.length >= MIN_TIMED ? median(j.map((x) => x.expected)) : null,
      timedRight: j.length, withinExpected: j.filter((x) => x.ratio <= 1).length,
      ratio,
      pace: ratio === null ? null : ratio <= 0.5 ? "lightning" : ratio <= 1 ? "quick" : ratio <= 1.75 ? "steady" : "slow",
      skills: bySkill.size, stuck,
    };
  }).sort((a, b) => b.answered - a.answered);

  const best = <K extends keyof TopicMeasure>(pool: TopicMeasure[], key: K, dir: 1 | -1) => pool.reduce<TopicMeasure | null>((m, t) => (m === null || ((t[key] as number) - (m[key] as number)) * dir > 0 ? t : m), null);
  const rated = topics.filter((t) => t.accuracy !== null);
  const mostAccurate = rated.length >= 2 ? best(rated, "accuracy", 1) : null;
  const quick = topics.filter((t) => t.pace === "quick" || t.pace === "lightning");
  const span = period === "week" ? 7 : 30;
  const calendar: CompetencyProfile["calendar"] = period === "year"
    ? MONTHS.slice(0, new Date(now).getMonth() + 1).map((label, m) => ({ key: `${new Date(now).getFullYear()}-${pad(m + 1)}`, label, answered: 0 }))
    : Array.from({ length: span }, (_, i) => { const t = noon.getTime() - (span - 1 - i) * DAY; const d = new Date(t); return { key: localDay(t), label: period === "week" ? (i === span - 1 ? "Today" : WEEKDAY[d.getDay()]) : String(d.getDate()), answered: 0 }; });
  const slot = new Map(calendar.map((c) => [c.key, c]));
  const days = new Set<string>();
  for (const a of inPeriod) { const d = localDay(when(a)); days.add(d); const c = slot.get(period === "year" ? d.slice(0, 7) : d); if (c) c.answered++; }
  const ms = inPeriod.reduce((t, a) => t + (typeof a.ms === "number" ? a.ms : 0), 0);
  return {
    period, from, to: today,
    answered: inPeriod.length, rightFirstTry: inPeriod.filter(first).length, activeDays: days.size,
    minutes: inPeriod.some((a) => typeof a.ms === "number") ? Math.round(ms / 60_000) : null,
    paceSeconds: overall,
    topics,
    findings: { mostAccurate: mostAccurate && mostAccurate.accuracy! >= 0.7 ? mostAccurate : null, quickest: quick.length ? best(quick, "ratio", -1) : null, mostPractised: topics.length >= 2 ? topics[0] : null, stuck: topics.flatMap((t) => t.stuck.map((skill) => ({ topic: t.topic, skill }))) },
    calendar,
  };
}
