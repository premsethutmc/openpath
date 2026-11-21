/**
 * sim-grammar@1: can a child who does not understand grammar get good at it? Simulated children sit the real
 * Grammar in use (GrammarSitting, levelFor, pick, spaced review and mastery) one sitting a day on five days a week,
 * for twelve weeks. Each child carries a knowledge of every topic that grows with the card, the feedback and the
 * simpler way, and fades between sittings unless a spaced review catches it. What the run reports is about the
 * app: how far children get, which topics stall, whether reviews come, and whether sentences run out.
 *
 * The learner model is an assumption, not a measurement; the numbers are for comparing the app with itself.
 *
 * usage: node --import tsx scripts/sim-grammar.mts [--runs 20] [--weeks 12] [--md ../docs/english/SIM_GRAMMAR.md] [--strict]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { GRAMMAR, GrammarSitting, LEARN, choices, fixParts, levelFor, spotWords, type GrammarItem, type GrammarRecord } from "../src/english/logic/grammar-use/grammar-use.ts";
import { dueTopics, mastery, type Timed } from "../src/english/logic/grammar-use/mastery.ts";

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const RUNS = Number(arg("runs", "20"));
const WEEKS = Number(arg("weeks", "36"));
const MD = arg("md", "");
const STRICT = process.argv.includes("--strict");

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) ^ (s + 0x9e3779b9)), ((s ^= s >>> 13) >>> 0) / 2 ** 32);
}

interface Persona {
  name: string;
  /** level the sittings start at: 1 after the level check, 3 for a school child who skipped it */
  start: number;
  /** how fast this child learns */
  rate: number;
  /** a slip on something known */
  slip: number;
  /** what the child knows of a topic of this level before starting */
  prior: (level: number) => number;
}
const PERSONAS: Persona[] = [
  { name: "beginner", start: 1, rate: 1, slip: 0.05, prior: () => 0.03 },
  { name: "beginner, no level check", start: 3, rate: 1, slip: 0.05, prior: () => 0.03 },
  { name: "slow beginner", start: 1, rate: 0.6, slip: 0.05, prior: () => 0.03 },
  { name: "careless beginner", start: 1, rate: 1, slip: 0.15, prior: () => 0.03 },
  { name: "knows the basics", start: 3, rate: 1, slip: 0.05, prior: (l) => (l <= 2 ? 0.7 : l <= 4 ? 0.3 : 0.05) },
];

const DAY = 86_400_000;
const T0 = Date.parse("2026-01-05T17:00:00Z");
const topicLevel = new Map<string, number>();
for (const it of GRAMMAR.items) topicLevel.set(it.topic, Math.min(topicLevel.get(it.topic) ?? 9, it.level));
const CORE = [...topicLevel].filter(([, l]) => l <= 2).map(([t]) => t);

/** The chance of guessing right with no knowledge. */
function guess(it: GrammarItem): number {
  if (it.kind === "choose") return 1 / (1 + (it.wrong?.length ?? 1));
  if (it.kind === "spot") return (it.right?.length ?? 1) / spotWords(it).length;
  if (it.kind === "fix") return 0.3 / fixParts(it).words.length;
  return it.kind === "build" ? 0.05 : 0.02;
}

interface Child {
  k: Map<string, number>;
  stability: Map<string, number>;
  last: Map<string, number>;
}
/** What the child can use of a topic today: its strength, faded by the days since it was last met. */
const known = (c: Child, p: Persona, t: string, day: number) => {
  const k = c.k.get(t) ?? p.prior(topicLevel.get(t) ?? 1);
  const last = c.last.get(t);
  // what the child knew before starting is long-held: it fades slowly
  const s = c.stability.get(t) ?? (c.k.has(t) ? 5 : 60);
  return last === undefined ? k : k * Math.exp(-(day - last) / s);
};
const learn = (c: Child, p: Persona, t: string, day: number, gain: number) => {
  const k = known(c, p, t, day);
  const lvl = topicLevel.get(t) ?? 1;
  if (!c.stability.has(t)) c.stability.set(t, c.k.has(t) || p.prior(lvl) < 0.2 ? 5 : 60);
  c.k.set(t, k + gain * (p.rate / (1 + 0.15 * (lvl - 1))) * (1 - k));
  c.last.set(t, day);
};

interface Result {
  level: number;
  met: number;
  learnt: number;
  mastered: number;
  coreMastered: number;
  accuracyLast2Weeks: number;
  reviews: number;
  repeats: number;
  answers: number;
  stuck: string[];
  simple: number;
  weekly: { week: number; mastered: number; level: number }[];
}

function run(p: Persona, seed: number): Result {
  const r = rng(seed);
  const c: Child = { k: new Map(), stability: new Map(), last: new Map() };
  const timed: Timed[] = [];
  const seen = new Set<string>();
  let level = p.start;
  let reviews = 0;
  let repeats = 0;
  let answers = 0;
  let simple = 0;
  const late: boolean[] = [];
  const weekly: Result["weekly"] = [];
  for (let day = 0; day < WEEKS * 7; day++) {
    if (day % 7 === 5 || day % 7 === 6) {
      if (day % 7 === 6) weekly.push({ week: day / 7 + 1 / 7, mastered: mastery(timed).filter((m) => m.stage === "mastered").length, level });
      continue;
    }
    const now = new Date(T0 + day * DAY).toISOString();
    const records = timed.map((x) => x.record);
    const due = dueTopics(timed, now);
    const s = new GrammarSitting(GRAMMAR, level, records, undefined, due);
    const push = () => {
      for (const rec of s.take()) timed.push({ at: now, record: rec });
    };
    for (let v = s.snapshot(), g = 0; v.phase !== "done" && g < 40; v = s.snapshot(), g++) {
      if (v.phase === "learn") {
        const t = GRAMMAR.items.find((x) => x.id === v.id)!.topic;
        learn(c, p, t, day, 0.45);
        if (v.learn?.simple) simple++;
        s.learned();
        continue;
      }
      if (v.phase === "feedback") {
        s.next();
        continue;
      }
      const it = GRAMMAR.items.find((x) => x.id === v.id)!;
      const k = known(c, p, it.topic, day);
      const hard = it.kind === "rewrite" || it.kind === "build" ? 1.3 : 1;
      const right = r() < guess(it) + (1 - guess(it)) * Math.pow(k, hard) * (1 - p.slip);
      if (due.includes(it.topic)) reviews++;
      if (seen.has(it.id)) repeats++;
      seen.add(it.id);
      answers++;
      if (day >= (WEEKS - 2) * 7) late.push(right);
      if (it.kind === "choose") {
        const o = choices(it);
        const key = o.indexOf(it.right![0]);
        s.choose(right ? key : (key + 1) % o.length);
      } else if (it.kind === "spot") {
        const w = spotWords(it);
        const key = w.findIndex((x) => it.right!.includes(x.replace(/[^A-Za-z'’-]/g, "")));
        s.spot(right ? key : (key + 1) % w.length);
      } else if (it.kind === "fix") s.fix(fixParts(it).wrong, right ? it.right![0] : "zzq");
      else if (it.kind === "rewrite") s.rewrite(right ? it.right![0] : it.sentence);
      else {
        const parts = it.parts ?? it.sentence.split(" ");
        s.build(right ? parts : [...parts].reverse());
      }
      const f = s.snapshot().feedback!;
      // a right answer after a gap strengthens memory (the spacing effect); any answer teaches a little
      const gap = c.last.has(it.topic) ? day - c.last.get(it.topic)! : 0;
      learn(c, p, it.topic, day, right ? 0.06 : 0.15);
      const st = c.stability.get(it.topic)!;
      if (right) c.stability.set(it.topic, Math.min(180, st * (gap >= 1 ? 2 : 1.15)));
      if (f.simple) {
        simple++;
        learn(c, p, it.topic, day, 0.15);
      }
    }
    push();
    level = levelFor(GRAMMAR, timed.map((x) => x.record), p.start);
  }
  const m = mastery(timed);
  const byTopic = new Map<string, boolean[]>();
  for (const { record: rec } of timed) if (rec.type === "answer") byTopic.set(rec.topic, [...(byTopic.get(rec.topic) ?? []), rec.correct]);
  const stuck = [...byTopic].filter(([, a]) => a.length >= 6 && a.slice(-6).filter(Boolean).length < 3).map(([t]) => t);
  return {
    level,
    met: m.length,
    learnt: m.filter((x) => x.stage !== "learning").length,
    mastered: m.filter((x) => x.stage === "mastered").length,
    coreMastered: m.filter((x) => x.stage === "mastered" && CORE.includes(x.topic)).length,
    accuracyLast2Weeks: late.length ? late.filter(Boolean).length / late.length : 0,
    reviews,
    repeats,
    answers,
    stuck,
    simple,
    weekly,
  };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const f1 = (x: number) => x.toFixed(1);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const lines: string[] = [
  `# Grammar learning simulation (sim-grammar@1)`,
  ``,
  `${RUNS} simulated children per profile, one sitting of 8 sentences a day, 5 days a week, ${WEEKS} weeks. ${GRAMMAR.items.length} sentences, ${topicLevel.size} topics, ${CORE.length} core topics (levels 1–2).`,
  ``,
  `| Profile | Level at end | Topics met | Learnt | Mastered | Core mastered (of ${CORE.length}) | Right, last 2 weeks | Review answers | Sentences repeated | Simpler way shown | Stuck topics |`,
  `|---|---|---|---|---|---|---|---|---|---|---|`,
];
const failures: string[] = [];
const stuckAll = new Map<string, number>();
const curves: string[] = [];
for (const p of PERSONAS) {
  const rs = Array.from({ length: RUNS }, (_, i) => run(p, 1000 + i * 7919 + p.name.length));
  for (const x of rs) for (const t of x.stuck) stuckAll.set(`${p.name}|${t}`, (stuckAll.get(`${p.name}|${t}`) ?? 0) + 1);
  const stuckHere = [...stuckAll].filter(([k, n]) => k.startsWith(`${p.name}|`) && n >= RUNS / 4).map(([k, n]) => `${k.split("|")[1]} (${n})`);
  lines.push(`| ${p.name} | ${f1(avg(rs.map((x) => x.level)))} | ${f1(avg(rs.map((x) => x.met)))} | ${f1(avg(rs.map((x) => x.learnt)))} | ${f1(avg(rs.map((x) => x.mastered)))} | ${f1(avg(rs.map((x) => x.coreMastered)))} | ${pct(avg(rs.map((x) => x.accuracyLast2Weeks)))} | ${f1(avg(rs.map((x) => x.reviews)))} | ${pct(avg(rs.map((x) => x.repeats / x.answers)))} | ${f1(avg(rs.map((x) => x.simple)))} | ${stuckHere.join(", ") || "none"} |`);
  const weeks = rs[0].weekly.map((w, i) => `${Math.round(w.week)}: ${f1(avg(rs.map((x) => x.weekly[i].mastered)))} mastered, level ${f1(avg(rs.map((x) => x.weekly[i].level)))}`);
  curves.push(`- **${p.name}** — ${weeks.filter((_, i) => i % 2 === 1 || i === weeks.length - 1).join("; ")}`);
  if (p.name === "beginner") {
    if (avg(rs.map((x) => x.coreMastered)) < CORE.length * 0.5) failures.push(`beginner masters ${f1(avg(rs.map((x) => x.coreMastered)))} of ${CORE.length} core topics in ${WEEKS} weeks`);
    if (avg(rs.map((x) => x.reviews)) < 10) failures.push("beginner: spaced reviews hardly come");
  }
}
lines.push(``, `Week by week (topics mastered, level):`, ``, ...curves, ``);
lines.push(failures.length ? `Checks failed: ${failures.join("; ")}.` : `Checks passed: a beginner masters at least half the core topics in ${WEEKS} weeks, and spaced reviews come.`);
const out = lines.join("\n") + "\n";
console.log(out);
// keep what is written below the results by hand
if (MD) {
  let keep = "";
  try {
    const old = readFileSync(MD, "utf8");
    keep = old.includes("\n## What it showed") ? old.slice(old.indexOf("\n## What it showed")) : "";
  } catch {}
  writeFileSync(MD, out + keep);
}
if (STRICT && failures.length) process.exit(1);
