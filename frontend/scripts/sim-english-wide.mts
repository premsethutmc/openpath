/**
 * sim-english-wide@1: the activities the stream simulation (sim-english.mts) does not drive, run through the real
 * logic by simulated learners, plus a walk of every school syllabus line.
 *
 *   texts     Poems and everyday texts, Long reads, and Notes, charts and maps, a month of one sitting of each a
 *             day, by four kinds of learner (strong, average, weak, guesser); the study tasks end with the learner's
 *             own piece, written well by a strong learner and badly by a weak one, and marked by the app's rules;
 *   syllabus  every line of every board and class: the practice it points to opens and has something to give to a
 *             new learner (grammar topics have sentences, tasks with a grown-up exist, activities have a next item).
 *
 * Fails (with --strict) when an activity throws, has nothing to give before the month is out (charts and maps must
 * never run out; poems and everyday texts must last a month at any level), repeats a task, marks a strong learner's own writing poorly or a weak one's well, never steers a
 * learner to their weakest kind of study task, or a syllabus line leads nowhere. Behaviour only; no language model.
 *
 *   node --import tsx scripts/sim-english-wide.mts --runs 10 --md sim-wide.md --strict
 */
import { writeFileSync } from "node:fs";
import { KINDS, KindSitting, kindToRead, nextKind, type KindRecord } from "../src/english/logic/reading/kinds.ts";
import { LONG, LongSitting, longLevel, nextStep, type LongRecord } from "../src/english/logic/reading/long-read.ts";
import { StudySitting, chartFor, mapFor, nextStudy, notesFor, ownTrip, directions, kindStrength, type StudyKind, type StudyRecord } from "../src/english/logic/study/study.ts";
import { SYLLABUSES, taskLine, type Syllabus } from "../src/english/logic/syllabus/syllabus.ts";
import { GUIDED, tasksFor } from "../src/english/logic/guided/guided.ts";
import { GRAMMAR, pick } from "../src/english/logic/grammar-use/grammar-use.ts";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const RUNS = Number(arg("runs", "10"));
const DAYS = Number(arg("days", "30"));
const STRICT = process.argv.includes("--strict");

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

interface Persona {
  name: string;
  /** Chance of a right answer on each kind of step (a guesser picks at random). */
  p: { texts: number; notes: number; chart: number; map: number };
  /** Writes the learner's own piece well. */
  writesWell: boolean;
  guess?: boolean;
  level: number;
}
const PERSONAS: Persona[] = [
  { name: "strong", p: { texts: 0.9, notes: 0.9, chart: 0.95, map: 0.9 }, writesWell: true, level: 6 },
  { name: "average", p: { texts: 0.7, notes: 0.7, chart: 0.8, map: 0.6 }, writesWell: true, level: 4 },
  { name: "weak at maps", p: { texts: 0.7, notes: 0.75, chart: 0.8, map: 0.25 }, writesWell: false, level: 4 },
  { name: "weak", p: { texts: 0.4, notes: 0.35, chart: 0.4, map: 0.35 }, writesWell: false, level: 2 },
  { name: "guesser", p: { texts: 0, notes: 0, chart: 0, map: 0 }, writesWell: false, guess: true, level: 1 },
];

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

interface Stats {
  kinds: { sittings: number; right: number; asked: number; ranOut: number };
  long: { sittings: number; right: number; asked: number; ranOut: number };
  study: { tasks: Record<StudyKind, number>; right: number; asked: number; ownPassed: number; ownOf: number; generated: number; repeats: number };
}
const blank = (): Stats => ({ kinds: { sittings: 0, right: 0, asked: 0, ranOut: 0 }, long: { sittings: 0, right: 0, asked: 0, ranOut: 0 }, study: { tasks: { notes: 0, chart: 0, map: 0 }, right: 0, asked: 0, ownPassed: 0, ownOf: 0, generated: 0, repeats: 0 } });

/** The learner's own piece: a strong writer gives the model answer, a weak one a thin or wrong one. */
function ownPiece(s: StudySitting, well: boolean): string {
  const t = s.task;
  if (t.kind === "notes") {
    const n = notesFor(t.id);
    return well ? n.summaries.right : n.summaries.wrong[0];
  }
  if (t.kind === "chart") {
    const c = chartFor(t.id);
    return well ? c.paragraph.join(" ") : `${c.labels[0]} is big. ${c.labels[1]} is small.`;
  }
  const m = mapFor(t.id);
  const trip = ownTrip(m);
  const back = m.routes[0].moves.slice().reverse().map((x) => ({ dir: ({ N: "S", S: "N", E: "W", W: "E" } as const)[x.dir], blocks: x.blocks }));
  return well ? directions(m, trip.from, back) : "Turn left and walk to the place.";
}

function runLearner(p: Persona, run: number): Stats {
  const r = rng(`${p.name}|${run}`);
  const right = (chance: number, options: number) => (p.guess ? r() < 1 / options : r() < chance);
  const st = blank();
  const kindRecs: KindRecord[] = [];
  const longRecs: LongRecord[] = [];
  const studyRecs: StudyRecord[] = [];
  for (let day = 0; day < DAYS; day++) {
    // a poem or everyday text
    try {
      const t = kindToRead(KINDS, kindRecs, p.level)?.text;
      if (!t) st.kinds.ranOut++;
      else {
        const s = new KindSitting(t);
        s.read();
        for (let i = 0; i < t.questions.length; i++) {
          const v = s.snapshot();
          const ans = v.question!.options.indexOf(t.questions[i].right);
          s.answer(right(p.p.texts, 3) ? ans : (ans + 1) % 3);
          s.next();
        }
        const recs = s.take();
        kindRecs.push(...recs);
        st.kinds.sittings++;
        for (const a of recs.flatMap((x) => x.answers)) (st.kinds.asked++, (st.kinds.right += a.correct ? 1 : 0));
      }
    } catch (e) {
      fail(`${p.name} ${run}: Poems and everyday texts threw: ${(e as Error).message}`);
    }
    // a part of a long read
    try {
      const lvl = longLevel(LONG, longRecs, p.level);
      const step = nextStep(LONG, longRecs, lvl);
      if (step && step.part === 0 && step.text.level > lvl + 1) fail(`${p.name} ${run}: a level ${step.text.level} long read given at level ${lvl}`);
      if (!step) st.long.ranOut++;
      else {
        const s = new LongSitting(step.text, step.part);
        s.read();
        for (let i = 0; i < s.questions.length; i++) {
          const v = s.snapshot();
          const ans = v.question!.options.indexOf(s.questions[i].right);
          s.answer(right(p.p.texts, v.question!.options.length) ? ans : (ans + 1) % v.question!.options.length);
          s.next();
        }
        const recs = s.take();
        longRecs.push(...recs);
        st.long.sittings++;
        for (const a of recs.flatMap((x) => x.answers)) (st.long.asked++, (st.long.right += a.correct ? 1 : 0));
      }
    } catch (e) {
      fail(`${p.name} ${run}: Long reads threw: ${(e as Error).message}`);
    }
    // a notes, chart or map task, chosen by the app
    try {
      const task = nextStudy(studyRecs);
      if (!task) fail(`${p.name} ${run}: Notes, charts and maps had nothing to give on day ${day + 1}`);
      else {
        if (studyRecs.some((x) => x.task === task.id)) st.study.repeats++;
        if (/\.g\d+$/.test(task.id)) st.study.generated++;
        const s = new StudySitting(task);
        s.read();
        for (const step of s.steps) {
          const ok = right(p.p[task.kind], step.kind === "choose" ? 3 : 20);
          if (step.kind === "choose") s.choose(ok ? step.answer : (step.answer + 1) % step.options.length);
          else if (step.kind === "pick") s.pick(ok ? step.answer : [...step.answer, step.options.findIndex((_, i) => !step.answer.includes(i))]);
          else s.order(ok ? step.answer : [...step.answer].reverse());
          s.next();
        }
        const mark = s.writeOwn(ownPiece(s, p.writesWell));
        if (mark) {
          st.study.ownPassed += mark.passed;
          st.study.ownOf += mark.checks.length;
          if (p.writesWell && mark.passed < mark.checks.length) fail(`${p.name} ${run}: a well-written ${task.kind} piece (${task.id}) missed a check: ${mark.checks.filter((c) => !c.ok).map((c) => c.note).join(" ")}`);
          if (!p.writesWell && mark.passed === mark.checks.length) fail(`${p.name} ${run}: a poor ${task.kind} piece (${task.id}) met every check`);
        }
        s.finish();
        const recs = s.take();
        studyRecs.push(...recs);
        st.study.tasks[task.kind]++;
        for (const a of recs.flatMap((x) => x.answers)) (st.study.asked++, (st.study.right += a.correct ? 1 : 0));
      }
    } catch (e) {
      fail(`${p.name} ${run}: Notes, charts and maps threw: ${(e as Error).message}`);
    }
  }
  // a learner weak at maps should be given more maps than either other kind
  if (p.name === "weak at maps" && !(st.study.tasks.map > st.study.tasks.notes && st.study.tasks.map > st.study.tasks.chart))
    fail(`${p.name} ${run}: never steered to maps, its weakest kind (${JSON.stringify(st.study.tasks)}; map strength ${kindStrength(studyRecs, "map")?.toFixed(2)})`);
  if (st.long.ranOut) fail(`${p.name} ${run}: Long reads ran out on ${st.long.ranOut} of ${DAYS} days`);
  if (st.kinds.ranOut) fail(`${p.name} ${run}: Poems and everyday texts ran out on ${st.kinds.ranOut} of ${DAYS} days`);
  if (st.study.repeats) fail(`${p.name} ${run}: ${st.study.repeats} study tasks repeated`);
  return st;
}

/** Every line of every syllabus: its practice opens and has something to give a new learner. */
function walkSyllabus(s: Syllabus): number {
  let lines = 0;
  for (const st of s.strands)
    for (const o of st.outcomes) {
      lines++;
      const where = `${s.id} ${o.id}`;
      if (o.coverage === "not") continue;
      if (o.where === "grammar" && pick(GRAMMAR, 2, [], o.topics).length < 3) fail(`${where}: its grammar topics give fewer than three sentences`);
      if (o.where === "guided") {
        const line = taskLine(s, o);
        if (tasksFor(GUIDED, line.syllabus, line.outcome).length < 2) fail(`${where}: fewer than two tasks with a grown-up`);
      }
      if (o.where === "study" && !nextStudy([])) fail(`${where}: Notes, charts and maps has nothing to give`);
      if (o.where === "kinds" && !nextKind(KINDS, [], 3)) fail(`${where}: Poems and everyday texts has nothing to give`);
      if (o.where === "long" && !nextStep(LONG, [], 3)) fail(`${where}: Long reads has nothing to give`);
    }
  return lines;
}

const rows: { persona: string; s: Stats }[] = [];
for (const p of PERSONAS) for (let run = 0; run < RUNS; run++) rows.push({ persona: p.name, s: runLearner(p, run) });
const lines = SYLLABUSES.reduce((n, s) => n + walkSyllabus(s), 0);

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "–");
const out: string[] = [
  "# Simulated learners: texts, notes, charts and maps, and every syllabus line",
  "",
  `${PERSONAS.length} kinds of learner, ${RUNS} of each, ${DAYS} days, one sitting of each activity a day. Behaviour only; see frontend/scripts/sim-english-wide.mts.`,
  "",
  "| learner | texts right | long reads right | study right | own writing checks met | notes / charts / maps | generated tasks | texts ran out (days) |",
  "|---|---|---|---|---|---|---|---|",
];
for (const p of PERSONAS) {
  const rs = rows.filter((x) => x.persona === p.name).map((x) => x.s);
  const sum = (f: (s: Stats) => number) => rs.reduce((a, s) => a + f(s), 0);
  out.push(`| ${p.name} | ${pct(sum((s) => s.kinds.right), sum((s) => s.kinds.asked))} | ${pct(sum((s) => s.long.right), sum((s) => s.long.asked))} | ${pct(sum((s) => s.study.right), sum((s) => s.study.asked))} | ${pct(sum((s) => s.study.ownPassed), sum((s) => s.study.ownOf))} | ${avg(rs.map((s) => s.study.tasks.notes))} / ${avg(rs.map((s) => s.study.tasks.chart))} / ${avg(rs.map((s) => s.study.tasks.map))} | ${avg(rs.map((s) => s.study.generated))} | ${avg(rs.map((s) => s.kinds.ranOut + s.long.ranOut))} |`);
}
out.push("", `Syllabus: ${SYLLABUSES.length} syllabuses, ${lines} lines walked.`, "", problems.length ? `## Problems (${problems.length})\n\n${[...new Set(problems)].slice(0, 50).map((x) => `- ${x}`).join("\n")}` : "No problems found.");
const md = out.join("\n");
const file = arg("md", "");
if (file) writeFileSync(file, md + "\n");
console.log(md);
if (STRICT && problems.length) process.exit(1);
