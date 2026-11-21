/**
 * sim-tamil@1: simulated children take the Tamil course (ICSE and Tamil Nadu State Board) the way a real child would:
 * "where should I start?" first, then a month of one practice round a day through the real course logic (rounds, a
 * missed question coming back once, progress, moving on when a topic is done). Each child has a hidden ability per
 * strand (script, vocabulary, grammar, reading, listening) on the class scale (1-10), unrelated to the school class.
 * The chance of a right answer falls as a topic's class rises above the ability; a lucky guess is 1 in the options.
 * What is reported is how the product reacts: where it placed the child, rounds that were too hard or too easy, how much
 * "done" the screen shows against what the child really knows, repeats, and anything stuck. Behaviour only; says nothing
 * about whether a real child understands Tamil. No network, nothing stored.
 *
 * usage: node --import tsx scripts/sim-tamil.mts [--days 30] [--runs 20] [--md sim-tamil.md] [--out sim-tamil.json] [--strict]
 */
import { writeFileSync } from "node:fs";
import { type Board, type CourseTopic, type Progress, type Sitting, type Strand, CLASSES, isRight, nextTopic, record, round, strandOf, topicDone, topicsFor } from "../../packages/tamil/src/icse.ts";
import { answerPlacement, currentQuestion, startPlacement } from "../../packages/tamil/src/placement.ts";

interface Persona { name: string; about: string; board: Board; school: number; ability: Record<Strand, number>; slip: number; gain: number; guess?: boolean; voice: boolean }
const all = (x: number): Record<Strand, number> => ({ script: x, vocab: x, grammar: x, reading: x, listening: x });
const PERSONAS: Persona[] = [
  { name: "tn-class5-average", about: "TN Class 5, Tamil at home, on track", board: "tn", school: 5, ability: { script: 6, vocab: 5, grammar: 4.8, reading: 5, listening: 6 }, slip: 0.03, gain: 0.04, voice: true },
  { name: "tn-class8-strong", about: "TN Class 8, reads Tamil books", board: "tn", school: 8, ability: { script: 9, vocab: 8.5, grammar: 8.2, reading: 8.5, listening: 9 }, slip: 0.02, gain: 0.03, voice: true },
  { name: "tn-class8-behind", about: "TN Class 8, grammar well behind", board: "tn", school: 8, ability: { script: 6, vocab: 5, grammar: 3.5, reading: 4.5, listening: 6 }, slip: 0.03, gain: 0.04, voice: true },
  { name: "icse-class5-second-lang", about: "ICSE Class 5, English at home, Tamil only at school", board: "icse", school: 5, ability: { script: 3.5, vocab: 2.5, grammar: 2.5, reading: 2, listening: 3 }, slip: 0.03, gain: 0.05, voice: true },
  { name: "icse-class9-average", about: "ICSE Class 9, average", board: "icse", school: 9, ability: { script: 8, vocab: 7, grammar: 7, reading: 7, listening: 8 }, slip: 0.03, gain: 0.03, voice: false },
  { name: "adult-beginner", about: "an adult who speaks Tamil but cannot read it", board: "icse", school: 1, ability: { script: 0.3, vocab: 3, grammar: 1, reading: 0.3, listening: 6 }, slip: 0.02, gain: 0.06, voice: true },
  { name: "careless", about: "TN Class 5 average, one answer in five a slip", board: "tn", school: 5, ability: { script: 6, vocab: 5, grammar: 4.8, reading: 5, listening: 6 }, slip: 0.2, gain: 0.04, voice: true },
  { name: "guesser", about: "taps anything", board: "tn", school: 5, ability: all(0), slip: 0, gain: 0, guess: true, voice: true },
];

const rng = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const know = (ability: number, level: number) => 1 / (1 + Math.exp(-2 * (ability - level + 0.5)));

class Child {
  ability: Record<Strand, number>;
  readonly p: Persona;
  readonly r: () => number;
  constructor(p: Persona, r: () => number) {
    this.p = p;
    this.r = r;
    this.ability = { ...p.ability };
  }
  answer(t: CourseTopic, options: string[], answer: string): string {
    const wrong = options.filter((o) => o !== answer);
    const lucky = () => options[Math.floor(this.r() * options.length)];
    if (this.p.guess) return lucky();
    if (this.r() < know(this.ability[strandOf(t)], t.class) * (1 - this.p.slip)) return answer;
    return this.r() < 0.5 ? lucky() : wrong[Math.floor(this.r() * wrong.length)];
  }
  /** what the child truly knows of a topic (not what the screen says) */
  truly(t: CourseTopic) {
    return this.p.guess ? 0 : know(this.ability[strandOf(t)], t.class);
  }
}

type Day = { topic: string; cls: number; right: number; total: number; repeats: number };
function simulate(p: Persona, run: number, days: number) {
  const r = rng(`${p.name}:${run}`);
  const c = new Child(p, r);
  // 1. where should I start?
  let s = startPlacement(p.school);
  let guard = 0;
  while (!s.done && guard++ < 40) {
    const q = currentQuestion(s, p.board);
    const t = topicsFor(s.cls, p.board).find((x) => x.questions.includes(q))!;
    s = answerPlacement(s, isRight(q, c.answer(t, q.options, q.answer)));
  }
  const placed = s.start ?? 1;
  const trueStart = (() => {
    for (const cls of CLASSES) {
      const ts = topicsFor(cls, p.board).filter((t) => !t.listen);
      const avg = ts.reduce((a, t) => a + c.truly(t), 0) / ts.length;
      if (avg < 0.8) return cls;
    }
    return 10;
  })();
  // 2. a month of one round a day, from the placed class (or the school class if placed above it)
  let progress: Progress = {};
  let cls = Math.min(placed, p.school);
  const log: Day[] = [];
  let stuck = 0;
  const history: Sitting[] = [];
  let stepBacks = 0;
  for (let d = 0; d < days; d++) {
    const next = nextTopic(cls, p.board, progress, history, p.voice);
    if (!next) {
      if (cls === 10) { stuck++; continue; }
      cls++;
      d--;
      continue;
    }
    const topic = next.topic;
    if (next.stepBack) stepBacks++;
    const queue = [...round(topic, progress)];
    if (!queue.length) { stuck++; continue; }
    const seen = new Map<string, number>();
    const retried = new Set<string>();
    let right = 0, total = 0, repeats = 0;
    while (queue.length) {
      const q = queue.shift()!;
      seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
      if (seen.get(q.id)! > 1 && !retried.has(q.id)) repeats++;
      const ok = isRight(q, c.answer(topic, q.options, q.answer));
      progress = record(progress, q, ok);
      total++;
      if (ok) right++;
      else if (!retried.has(q.id)) { retried.add(q.id); queue.push(q); }
    }
    if (right / total >= 0.6 && topic.class >= c.ability[strandOf(topic)] - 0.5) c.ability[strandOf(topic)] += p.gain;
    log.push({ topic: topic.id, cls: topic.class, right, total, repeats });
    history.push({ topic: topic.id, right, total, stepBack: next.stepBack });
  }
  // what the screen says is done against what the child truly knows, over topics touched
  const touched = [...new Set(log.map((l) => l.topic))].map((id) => topicsFor(Number(id.split(".c")[1].split(".")[0]), p.board).find((t) => t.id === id)!);
  const shown = touched.reduce((a, t) => a + topicDone(t, progress), 0) / Math.max(1, touched.length);
  const real = touched.reduce((a, t) => a + c.truly(t), 0) / Math.max(1, touched.length);
  return {
    placed, trueStart, asked: s.asked, endClass: cls,
    tooHard: log.filter((l) => l.right / l.total < 0.5).length, tooEasy: log.filter((l) => l.right === l.total).length,
    topics: touched.length, shown, real, repeats: log.reduce((a, l) => a + l.repeats, 0), stuck, sittings: log.length, stepBacks,
  };
}

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const days = Number(arg("--days", "30")), runs = Number(arg("--runs", "20"));
const rows = PERSONAS.map((p) => {
  const rs = Array.from({ length: runs }, (_, i) => simulate(p, i, days));
  const avg = (f: (x: (typeof rs)[number]) => number) => rs.reduce((a, x) => a + f(x), 0) / rs.length;
  return {
    persona: p.name, about: p.about, board: p.board, school: p.school,
    placed: avg((x) => x.placed), trueStart: avg((x) => x.trueStart), placedOff: avg((x) => Math.abs(x.placed - x.trueStart)), asked: avg((x) => x.asked),
    tooHard: avg((x) => x.tooHard / Math.max(1, x.sittings)), tooEasy: avg((x) => x.tooEasy / Math.max(1, x.sittings)),
    topics: avg((x) => x.topics), endClass: avg((x) => x.endClass), shownDone: avg((x) => x.shown), trulyKnown: avg((x) => x.real),
    repeats: avg((x) => x.repeats), stuck: avg((x) => x.stuck), stepBacks: avg((x) => x.stepBacks),
  };
});
const f = (n: number, d = 1) => n.toFixed(d);
const md = [
  `# Simulated children: Tamil (${runs} of each, ${days} days)`,
  "",
  "Behaviour of the product only: placement, difficulty of daily rounds, and whether the progress shown matches what the child knows.",
  "",
  "| child | board | school class | placed | should start | off by | questions to place | too hard | too easy | topics | ended in class | shown done | truly known | step-backs | stuck days |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.persona} | ${r.board} | ${r.school} | ${f(r.placed)} | ${f(r.trueStart)} | ${f(r.placedOff)} | ${f(r.asked)} | ${f(r.tooHard * 100, 0)}% | ${f(r.tooEasy * 100, 0)}% | ${f(r.topics)} | ${f(r.endClass)} | ${f(r.shownDone * 100, 0)}% | ${f(r.trulyKnown * 100, 0)}% | ${f(r.stepBacks)} | ${f(r.stuck)} |`),
  "",
].join("\n");
const problems: string[] = [];
const g = rows.find((r) => r.persona === "guesser")!;
if (g.shownDone > 0.3) problems.push(`a child who only guesses is shown ${f(g.shownDone * 100, 0)}% done`);
for (const r of rows) if (r.stuck > 0) problems.push(`${r.persona}: ${f(r.stuck)} days with nothing to practise`);
for (const r of rows) if (r.persona !== "guesser" && r.placedOff > 1.5) problems.push(`${r.persona}: placed ${f(r.placedOff)} classes from where it should start`);
for (const r of rows) if (r.persona !== "guesser" && r.tooHard > 0.4) problems.push(`${r.persona}: ${f(r.tooHard * 100, 0)}% of rounds too hard`);
const out = md + (problems.length ? `\n## Problems\n\n${problems.map((p) => `- ${p}`).join("\n")}\n` : "\nNo problems found by the checks.\n");
console.log(out);
if (args.includes("--md")) writeFileSync(arg("--md", "sim-tamil.md"), out);
if (args.includes("--out")) writeFileSync(arg("--out", "sim-tamil.json"), JSON.stringify(rows, null, 1));
if (args.includes("--strict") && problems.length) process.exit(1);
