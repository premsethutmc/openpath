/**
 * sim-english@1: simulated learners take the English app the way a real learner would: Find my level first, then a
 * month of daily practice in Words, Reading, Listen and write, Listen and answer and Grammar in use. Each learner has
 * a hidden ability in each stream, on that stream's own level scale, that has nothing to do with age or class; it
 * rises a little after each sitting at or above it. The chance of a right answer depends on how far an item's level
 * is above the ability. What is reported is how the product reacts:
 *   placed        where Find my level put the learner, against the hidden ability
 *   ended         the level the stream had reached after the month, against the ability then
 *   too hard      sittings where under half was right; too easy: sittings where every answer was right
 *   flips         the level went up and straight back down (or the other way)
 *   repeats       the same item again within seven days; stuck: a stream with nothing to give
 * Behaviour only: a simulated learner is a model of answers, and says nothing about whether a real learner
 * understands a passage or a rule. Synthetic learners only; nothing is stored; no language model is called.
 *
 * usage: node --import tsx scripts/sim-english.mts [--days 30] [--runs 20] [--out sim-english.json] [--md ../docs/english/SIM_REPORT.md] [--strict]
 */
import { writeFileSync } from "node:fs";
import {supportingSets} from "../src/english/logic/reading/check-evidence.ts";
import {sentenceChoices} from "../src/english/logic/reading/sentences.ts";
import { COURSE, type Level } from "../src/english/logic/reading/course.ts";
import { ReadingUnitSession, progress as readingProgress, recommend, type ReadingRecord } from "../src/english/logic/reading/session.ts";
import { DICTATION, DictationSitting, levelFor as dictationLevel, type DictationRecord } from "../src/english/logic/dictation/dictation.ts";
import { LISTENING, ListenSitting, choices as listenChoices, levelFor as listenLevel, type ListenRecord } from "../src/english/logic/listening/passages.ts";
import { GRAMMAR, GrammarSitting, choices as grammarChoices, fixParts, levelFor as grammarLevel, spotWords, type GrammarRecord } from "../src/english/logic/grammar-use/grammar-use.ts";
import { BANDS, WORDS, WordSitting, baseBand, progress as wordProgress, question as wordQuestion, teachBand, type Dated } from "../src/english/logic/vocabulary/daily-words.ts";
import { CHECK, SizeCheckSession } from "../src/english/logic/vocabulary/size-check.ts";
import { isBeginner } from "../src/english/logic/first/first.ts";
import { GrammarPlacement, ListeningPlacement, MIDDLE, ReadingPlacement, WORD_ROUNDS, levelsFrom, type LevelCheckRecord } from "../src/english/logic/streams/level-check.ts";

type Stream = "words" | "reading" | "dictation" | "passages" | "grammar";
const STREAMS: Stream[] = ["words", "reading", "dictation", "passages", "grammar"];
const TOP: Record<Stream, number> = { words: BANDS, reading: COURSE.levels.length, dictation: DICTATION.levels.length, passages: LISTENING.levels.length, grammar: GRAMMAR.levels.length };

interface Persona {
  name: string;
  about: string;
  /** Hidden ability per stream, on the stream's own scale (0.5 = below its first level). */
  ability: Record<Stream, number>;
  slip: number;
  guess?: boolean;
  /** How much a sitting at or above the ability raises it. */
  gain: number;
}
const all = (x: number): Record<Stream, number> => ({ words: x, reading: x, dictation: x, passages: x, grammar: x });
const PERSONAS: Persona[] = [
  { name: "beginner", about: "barely any English yet", ability: all(0.2), slip: 0.03, gain: 0.03 },
  { name: "early", about: "reads and writes short simple sentences", ability: { words: 2, reading: 1.6, dictation: 2, passages: 1.6, grammar: 1.8 }, slip: 0.03, gain: 0.03 },
  { name: "average", about: "comfortable with everyday English", ability: { words: 3.5, reading: 3.5, dictation: 3.8, passages: 3.4, grammar: 3.8 }, slip: 0.03, gain: 0.03 },
  { name: "strong", about: "reads and writes well", ability: { words: 6.5, reading: 5.6, dictation: 6.3, passages: 5.5, grammar: 6.2 }, slip: 0.02, gain: 0.02 },
  { name: "reads-but-no-grammar", about: "an older learner: reads and listens well, cannot name a noun", ability: { words: 6, reading: 5.2, dictation: 5.5, passages: 5, grammar: 1.3 }, slip: 0.03, gain: 0.03 },
  { name: "uneven", about: "reads well, but hears and spells poorly", ability: { words: 4.5, reading: 4.8, dictation: 1.8, passages: 2, grammar: 3.5 }, slip: 0.03, gain: 0.03 },
  { name: "careless", about: "average, but one answer in five is a slip", ability: { words: 3.5, reading: 3.5, dictation: 3.8, passages: 3.4, grammar: 3.8 }, slip: 0.2, gain: 0.03 },
  { name: "guesser", about: "taps anything", ability: all(0), slip: 0, gain: 0, guess: true },
];

// a small seeded generator: the same run gives the same learners
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

/** One learner's answers. `options`: how many choices (0: typed, no lucky guess). */
class Mind {
  readonly ability: Record<Stream, number>;
  constructor(readonly p: Persona, readonly r: () => number) {
    this.ability = { ...p.ability };
  }
  right(stream: Stream, level: number, options = 0): boolean {
    if (this.p.guess) return options ? this.r() < 1 / options : false;
    const know = 1 / (1 + Math.exp(-2 * (this.ability[stream] - level + 0.5)));
    if (this.r() < know * (1 - this.p.slip)) return true;
    return options ? this.r() < 1 / options : false;
  }
  /** A sitting at or near the learner's edge teaches a little; one far below teaches nothing. */
  learn(stream: Stream, level: number): void {
    if (level >= this.ability[stream] - 0.5) this.ability[stream] = Math.min(TOP[stream] + 0.5, this.ability[stream] + this.p.gain);
  }
}

const other = (n: number, right: number, r: () => number) => (right + 1 + Math.floor(r() * (n - 1))) % n;
const DAY = 86_400_000;
const at = (day: number, minute = 0) => new Date(Date.UTC(2026, 10, 1, 9, minute) + day * DAY).toISOString();

interface StreamStats {
  placed: number | null;
  abilityStart: number;
  levels: number[];
  sittings: number;
  tooHard: number;
  tooEasy: number;
  flips: number;
  repeats: number;
  stuck: number;
  errors: string[];
  abilityEnd: number;
}
const blank = (ability: number): StreamStats => ({ placed: null, abilityStart: ability, levels: [], sittings: 0, tooHard: 0, tooEasy: 0, flips: 0, repeats: 0, stuck: 0, errors: [], abilityEnd: ability });
function note(s: StreamStats, level: number, right: number, asked: number) {
  s.sittings++;
  if (asked && right / asked < 0.5) s.tooHard++;
  if (asked && right === asked) s.tooEasy++;
  const L = s.levels;
  if (L.length >= 2 && L[L.length - 1] !== L[L.length - 2] && level === L[L.length - 2]) s.flips++;
  L.push(level);
}

// ---------------------------------------------------------------- Find my level
function placement(m: Mind) {
  const records: LevelCheckRecord[] = [];
  // words: the vocabulary check, four rounds
  const wc = new SizeCheckSession(CHECK, 3, [], WORD_ROUNDS);
  for (let v = wc.snapshot(), g = 0; v.phase === "asking" && g < 40; v = wc.snapshot(), g++) {
    const w = CHECK.words.find((x) => x.word === v.word!.word)!;
    const right = m.right("words", w.band, 3);
    // a learner who does not know a word says so, unless they guess
    wc.answer(right ? w.answer : m.p.guess ? other(3, w.answer, m.r) : null);
  }
  const wr = wc.snapshot().result!;
  records.push({ type: "words", band: wr.band, estimate: wr.estimate, answered: wr.answered });
  // reading: a text with four questions, moved by two then one
  const rp = new ReadingPlacement(COURSE, MIDDLE.reading);
  for (let v = rp.snapshot(), g = 0; v.phase === "asking" && g < 30; v = rp.snapshot(), g++) {
    const q = COURSE.questions.find((x) => x.prompt === v.question!.prompt && COURSE.passages.get(x.passage)!.title === v.passage!.title)!;
    rp.answer(m.right("reading", v.level, q.options.length) ? q.answer : other(q.options.length, q.answer, m.r));
  }
  records.push({ type: "reading", ...rp.result() });
  // listening: four sentences to write
  const lp = new ListeningPlacement(DICTATION, MIDDLE.listening, []);
  for (let g = 0; !lp.finished && g < 10; g++) {
    const text = lp.spoken()!;
    const s = DICTATION.sentences.find((x) => x.text === text)!;
    lp.check(m.right("dictation", s.level) ? text : garble(text), 1);
  }
  records.push({ type: "listening", ...lp.result() });
  // grammar: a noun and a verb, then four on a staircase
  const gp = new GrammarPlacement(GRAMMAR, MIDDLE.grammar);
  for (let v = gp.snapshot(), g = 0; v.phase === "ask" && g < 10; v = gp.snapshot(), g++) {
    const it = GRAMMAR.items.find((x) => x.id === v.id)!;
    const target = it.kind === "spot" ? spotWords(it).findIndex((w) => it.right!.includes(w.replace(/[^A-Za-z'’-]/g, ""))) : fixParts(it).wrong;
    gp.answer(m.right("grammar", it.level, v.words.length) ? target : other(v.words.length, target, m.r));
  }
  records.push({ type: "grammar", ...gp.result() });
  records.push({ type: "done" });
  return levelsFrom(records, COURSE.levels.length);
}
/** A sentence written by someone who did not follow it: every other word wrong. */
const garble = (text: string) => text.split(" ").map((w, i) => (i % 2 ? "zzq" : w)).join(" ");

// ---------------------------------------------------------------- a month of practice
function run(p: Persona, days: number, seed: number) {
  const m = new Mind(p, rng(`${p.name}|${seed}`));
  const stats = Object.fromEntries(STREAMS.map((s) => [s, blank(p.ability[s])])) as Record<Stream, StreamStats>;
  const levels = placement(m);
  const firstWords = isBeginner(levels);
  stats.words.placed = levels.words?.band ?? null;
  stats.reading.placed = levels.reading?.start ?? null;
  stats.dictation.placed = levels.listening?.level ?? null;
  stats.passages.placed = levels.listening ? Math.min(TOP.passages, levels.listening.level) : null;
  stats.grammar.placed = levels.grammar?.level ?? null;

  const words: Dated[] = [];
  const reading: ReadingRecord[] = [];
  const dictation: DictationRecord[] = [];
  const passages: ListenRecord[] = [];
  const grammar: GrammarRecord[] = [];
  // a needless repeat: shown again within seven days after it was answered right
  const seen: Record<Stream, Map<string, { day: number; right: boolean }>> = Object.fromEntries(STREAMS.map((s) => [s, new Map()])) as never;
  const saw = (s: Stream, id: string, day: number, right: boolean) => {
    const last = seen[s].get(id);
    if (last && last.right && day - last.day < 7) stats[s].repeats++;
    seen[s].set(id, { day, right });
  };
  const guard = (s: Stream, fn: () => void) => {
    try {
      fn();
    } catch (e) {
      stats[s].errors.push(String((e as Error).message).slice(0, 120));
    }
  };

  for (let day = 0; day < days; day++) {
    // Words: five new words and the ones due again
    guard("words", () => {
      const band = teachBand(WORDS, wordProgress(words), baseBand(levels.words?.band, null));
      const s = new WordSitting(WORDS, baseBand(levels.words?.band, null), words, at(day, 1));
      let right = 0;
      let asked = 0;
      for (let v = s.snapshot(), g = 0; v.phase !== "done"; v = s.snapshot(), g++) {
        if (g > 300) throw new Error("words: the sitting does not end");
        if (v.phase === "meet") s.met();
        else if (v.phase === "ask") {
          const q = v.question!;
          const w = q.kind === "meaning" ? WORDS.words.find((x) => x.word === q.prompt)! : WORDS.words.find((x) => q.options.includes(x.word) && wordQuestion(WORDS, x, "gap").prompt === q.prompt)!;
          const key = wordQuestion(WORDS, w, q.kind);
          const ok = m.right("words", w.band, key.options.length);
          asked++;
          if (ok) right++;
          s.answer(ok ? key.answer : other(key.options.length, key.answer, m.r));
          s.next();
        } else s.next();
      }
      for (const r of s.take()) words.push({ record: r, at: at(day, 1) });
      if (asked) note(stats.words, band, right, asked);
      else stats.words.stuck++;
      m.learn("words", band);
    });
    // Reading: the unit the course recommends
    guard("reading", () => {
      const rec = recommend(COURSE, readingProgress(COURSE, reading), (levels.reading?.start ?? 1) as Level);
      if (!rec) return void stats.reading.stuck++;
      let s = new ReadingUnitSession(COURSE, rec.unit, "learn", reading);
      let resumed=false;
      let right = 0;
      let asked = 0;
      for (let v = s.snapshot(), g = 0; v.phase !== "result" && v.phase !== "no_fresh_check"; v = s.snapshot(), g++) {
        if (g > 200) throw new Error("reading: the visit does not end");
        if (v.phase === "lesson") {
          if (v.steps < v.lesson.worked.steps.length) s.nextStep();
          else s.startPractice();
        } else if (v.phase === "practice") {
          const pv = v.practice;
          if (pv.solved || pv.revealed) s.nextPractice();
          else {
            const q = COURSE.questions.find((x) => x.id === pv.question.id)!;
            const ok = m.right("reading", q.level, q.options.length - pv.wrong.length);
            const choices = [...q.options.keys()].filter((i) => !pv.wrong.includes(i) && i !== q.answer);
            s.answerPractice(ok || !choices.length ? q.answer : choices[Math.floor(m.r() * choices.length)]);
          }
        } else if (v.phase === "check") {
          const q = COURSE.questions.find((x) => x.id === v.question.id)!;
          if(!v.draft.locked){
            const ok = m.right("reading", q.level, q.options.length);
            saw("reading", q.id, day, ok);asked++;if(ok)right++;
            s.selectCheckAnswer(ok?q.answer:other(q.options.length,q.answer,m.r));s.lockCheckAnswer();
          }else{
            const keys=supportingSets(COURSE,q),ok=m.right("reading",q.level,3);
            const irrelevant=sentenceChoices(COURSE.passages.get(q.passage)!.text).map((_,i)=>i).find(i=>!keys.some(set=>set.includes(i)));
            s.selectCheckEvidence(ok?keys[0]:[irrelevant??keys[0][0]]);
            if(!resumed){reading.push(...s.take());s=new ReadingUnitSession(COURSE,rec.unit,"check_me",reading);resumed=true;const restored=s.snapshot();if(restored.phase!=="check"||!restored.draft.locked||!restored.draft.sentences.length)throw Error("reading: interrupted evidence draft lost");}
            s.submitCheckEvidence();
          }
        }
      }
      if (s.snapshot().phase === "no_fresh_check") stats.reading.stuck++;
      const result=s.snapshot();if(result.phase==='result'&&result.result.review.some(r=>!r.evidenceFinding))throw Error('reading: evidence selection was skipped');
      for (const r of s.take()) reading.push(r);
      note(stats.reading, rec.unit.level, right, asked);
      m.learn("reading", rec.unit.level);
    });
    // Listen and write: five sentences
    guard("dictation", () => {
      const level = dictationLevel(DICTATION, dictation, levels.listening?.level ?? 3);
      const s = new DictationSitting(DICTATION, level, dictation);
      let right = 0;
      let asked = 0;
      for (let v = s.snapshot(), g = 0; v.phase !== "done"; v = s.snapshot(), g++) {
        if (g > 100) throw new Error("dictation: the sitting does not end");
        if (v.phase === "write" || v.phase === "retry") {
          const text = s.spoken()!;
          const sentence = DICTATION.sentences.find((x) => x.id === v.id)!;
          const ok = m.right("dictation", sentence.level);
          if (v.phase === "write") saw("dictation", sentence.id, day, ok), asked++;
          if (ok && v.phase === "write") right++;
          s.check(ok ? text : garble(text), 1);
        } else s.next();
      }
      for (const r of s.take()) dictation.push(r);
      note(stats.dictation, level, right, asked);
      m.learn("dictation", level);
    });
    // Listen and answer: a passage and four questions
    guard("passages", () => {
      const level = listenLevel(LISTENING, passages, Math.min(TOP.passages, levels.listening?.level ?? 3));
      const s = new ListenSitting(LISTENING, level, passages);
      const start = s.snapshot();
      const passage = LISTENING.passages.find((x) => x.id === start.passage)!;
      s.played();
      s.ready();
      let right = 0;
      for (let v = s.snapshot(), i = 0; v.phase === "ask"; v = s.snapshot(), i++) {
        if (i > 10) throw new Error("passages: the questions do not end");
        const c = listenChoices(passage.questions[i]);
        const ok = m.right("passages", passage.level, 3);
        if (ok) right++;
        s.answer(ok ? c.answer : other(3, c.answer, m.r));
      }
      saw("passages", passage.id, day, right >= 3);
      for (const r of s.take()) passages.push(r);
      note(stats.passages, passage.level, right, passage.questions.length);
      m.learn("passages", passage.level);
    });
    // Grammar in use: eight sentences
    guard("grammar", () => {
      const level = grammarLevel(GRAMMAR, grammar, levels.grammar?.level ?? 3);
      const s = new GrammarSitting(GRAMMAR, level, grammar);
      let right = 0;
      let asked = 0;
      for (let v = s.snapshot(), g = 0; v.phase !== "done"; v = s.snapshot(), g++) {
        if (g > 60) throw new Error("grammar: the sitting does not end");
        if (v.phase === "feedback") {
          s.next();
          continue;
        }
        const it = GRAMMAR.items.find((x) => x.id === v.id)!;
        asked++;
        const before = right;
        if (it.kind === "choose") {
          const opts = grammarChoices(it);
          const key = opts.indexOf(it.right![0]);
          const ok = m.right("grammar", it.level, opts.length);
          if (ok) right++;
          s.choose(ok ? key : other(opts.length, key, m.r));
        } else {
          const ok = m.right("grammar", it.level);
          if (ok) right++;
          if (it.kind === "fix") {
            const p = fixParts(it);
            s.fix(ok ? p.wrong : (p.wrong + 1) % p.words.length, ok ? it.right![0] : "zzq");
          } else if (it.kind === "spot") {
            const words = spotWords(it);
            const key = words.findIndex((w) => it.right!.includes(w.replace(/[^A-Za-z'’-]/g, "")));
            s.spot(ok ? key : other(words.length, key, m.r));
          } else {
            const parts = it.parts ?? it.sentence.split(" ");
            s.build(ok ? parts : [...parts].reverse());
          }
        }
        saw("grammar", it.id, day, right > before);
      }
      for (const r of s.take()) grammar.push(r);
      note(stats.grammar, level, right, asked);
      m.learn("grammar", level);
    });
  }
  for (const s of STREAMS) stats[s].abilityEnd = m.ability[s];
  // reading moves skill by skill: its level at the end is the highest level passed, averaged over the six skills
  const rp = readingProgress(COURSE, reading);
  const best = COURSE.skills.map((k) => Math.max(0, ...COURSE.levels.map((l) => l.id).filter((lv) => ["passed_own", "passed_after_help"].includes(rp.units.get(`${k.id}@${lv}`)?.status ?? ""))));
  stats.reading.levels.push(best.reduce((a, b) => a + b, 0) / best.length);
  return { name: p.name, about: p.about, stats, firstWords };
}

// ---------------------------------------------------------------- report
const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const days = Number(opt("--days", "30"));
const RUNS = Number(opt("--runs", "20"));
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const results = PERSONAS.map((p) => {
  const runs = Array.from({ length: RUNS }, (_, i) => run(p, days, i));
  const per = Object.fromEntries(
    STREAMS.map((s) => {
      const t = runs.map((r) => r.stats[s]);
      const placed = t.map((x) => x.placed ?? 0);
      return [
        s,
        {
          ability: p.ability[s],
          placed: avg(placed),
          placedNear: t.filter((x) => Math.abs((x.placed ?? 0) - Math.max(1, Math.round(x.abilityStart))) <= 1).length / RUNS,
          abilityEnd: avg(t.map((x) => x.abilityEnd)),
          levelEnd: avg(t.map((x) => x.levels.at(-1) ?? 0)),
          tooHard: avg(t.map((x) => x.tooHard / Math.max(1, x.sittings))),
          tooEasy: avg(t.map((x) => x.tooEasy / Math.max(1, x.sittings))),
          flips: avg(t.map((x) => x.flips)),
          repeats: avg(t.map((x) => x.repeats)),
          stuck: avg(t.map((x) => x.stuck)),
          errors: [...new Set(t.flatMap((x) => x.errors))],
        },
      ];
    }),
  ) as Record<Stream, { ability: number; placed: number; placedNear: number; abilityEnd: number; levelEnd: number; tooHard: number; tooEasy: number; flips: number; repeats: number; stuck: number; errors: string[] }>;
  return { name: p.name, about: p.about, per, firstWords: runs.filter((r) => r.firstWords).length / RUNS };
});
const NAMES: Record<Stream, string> = { words: "Words", reading: "Reading", dictation: "Listen and write", passages: "Listen and answer", grammar: "Grammar in use" };
const f1 = (x: number) => (x < 0.95 ? "below 1" : x.toFixed(1));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const lines: string[] = [];
lines.push(`# Simulated English learners (sim-english@1)`, ``);
lines.push(`${PERSONAS.length} kinds of learner, ${RUNS} of each, take Find my level and then ${days} days of every English stream, one sitting of each a day. A learner's ability in a stream is hidden and on that stream's own scale; it rises a little after each sitting at or above it. Figures are averages over the ${RUNS}. Behaviour only: see frontend/scripts/sim-english.mts for the numbers assumed.`, ``);
lines.push(`Reading: "level at end" is the highest level passed, averaged over its six skills. "Placed within one level" compares Find my level's start with the hidden ability.`, ``);
for (const s of STREAMS) {
  lines.push(`## ${NAMES[s]} (levels 1 to ${TOP[s]})`, ``);
  lines.push(`| Learner | Ability at start | Placed at | Placed within one level | Ability at end | Level at end | Sittings too hard | Sittings all right | Flips | Needless repeats | Stuck | Errors |`, `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|`);
  for (const r of results) {
    const t = r.per[s];
    lines.push(`| ${r.name} | ${f1(t.ability)} | ${t.placed.toFixed(1)} | ${pct(t.placedNear)} | ${f1(t.abilityEnd)} | ${t.levelEnd.toFixed(1)} | ${pct(t.tooHard)} | ${pct(t.tooEasy)} | ${t.flips.toFixed(1)} | ${t.repeats.toFixed(1)} | ${t.stuck.toFixed(1)} | ${t.errors.length ? t.errors.join("; ") : 0} |`);
  }
  lines.push(``);
}
lines.push(`## Sent to First words by Find my level`, ``, `| Learner | Share of runs |`, `|---|---:|`, ...results.map((r) => `| ${r.name} | ${pct(r.firstWords)} |`), ``);
lines.push(`## The learners`, ``, ...PERSONAS.map((p) => `- **${p.name}**: ${p.about}.`), ``);
const md = lines.join("\n");
const out = opt("--out", "");
if (out) writeFileSync(out, JSON.stringify({ days, results }, null, 1));
const mdPath = opt("--md", "");
if (mdPath) writeFileSync(mdPath, md + "\n");
console.log(md);
// Recovery preflight is a state check, not an added learner success or learning gain.
{
 const unit={skill:"detail",level:1} as const;
 const first=new ReadingUnitSession(COURSE,unit,"check_me");const history=first.take();
 const alternate=new ReadingUnitSession(COURSE,{skill:"sequence",level:1},"check_me",history);history.push(...alternate.take());
 const interrupted=new ReadingUnitSession(COURSE,unit,"learn",history);
 if(interrupted.snapshot().phase!=="interrupted")throw Error("reading recovery: shared exposure was not detected");
 interrupted.closeInterruptedCheck();history.push(...interrupted.take());
 if(new ReadingUnitSession(COURSE,unit,"learn",history).snapshot().phase!=="lesson"||history.some(r=>r.type==="check_result"))throw Error("reading recovery: archive blocked learning or invented a score");
 console.log("Reading recovery preflight: exposed pending check archived, lesson reopened, no score.");
}
// --strict: fail when a stream threw or had nothing to give (for CI); the rest of the report is for reading
if (args.includes("--strict")) {
  const bad = results.flatMap((r) => STREAMS.filter((s) => r.per[s].errors.length || r.per[s].stuck > 0 || (s === "reading" && r.per[s].repeats > 0)).map((s) => `${r.name} / ${NAMES[s]}: ${r.per[s].errors.join("; ") || `stuck ${r.per[s].stuck}, needless repeats ${r.per[s].repeats}`}`));
  if (bad.length) {
    console.error(`sim-english: ${bad.length} problems\n${bad.join("\n")}`);
    process.exit(1);
  }
}
