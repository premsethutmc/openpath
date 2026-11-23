/**
 * The word check: measured content, placement by elimination, and the rule it must never break: it may place a
 * learner low, never high. VC-4 holds it to that with simulated learners of known vocabulary, so a change that
 * makes the check generous cannot be merged.
 */
import test from "node:test";
import assert from "node:assert/strict";
import checkJson from "../../../../../content/english/vocabulary/size-check.json";
import { ABOUT, CHECK, KNOW_MAX, OPTIONS, PICK_MAX_UNTRUSTED, SizeCheckSession, belief, checkProblems, falseYes, latestResult, levelLine, measure, seenWords, startBand, wordPracticeBand, type Evidence, type VocabRecord } from "./size-check.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const byWord = new Map(CHECK.words.map((w) => [w.word, w]));
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
};

/** Sit the check as a learner who knows exactly the words up to a level and answers honestly. */
function sit(knowsUpTo: number, history: VocabRecord[] = [], start = startBand(null)) {
  const s = new SizeCheckSession(CHECK, start, history);
  const asked: { word: string; kind: string }[] = [];
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot()) {
    const item = v.item!;
    const w = byWord.get(item.word);
    asked.push({ word: item.word, kind: item.kind });
    assert.ok(!("answer" in item), "the screen never holds the answer key");
    if (item.kind === "know") s.answer(!!w && w.band <= knowsUpTo);
    else s.answer(w!.band <= knowsUpTo ? w!.answer : null);
  }
  return { result: s.snapshot().result!, asked, records: [...history, ...s.take()] };
}

type Style = "honest" | "guesser" | "halfclaimer" | "overclaimer";
/**
 * A simulated learner whose words reach `t`: they know a word of level b with a chance that falls as b rises above
 * t (a gentler curve than the one the check assumes, so the check is not marking its own homework).
 *   honest       says yes only to words they know; says "I don't know" when they do not
 *   guesser      says yes only to words they know; guesses a choice when they do not
 *   halfclaimer  also says yes to 4 in 10 words they do not know (invented ones too), and guesses
 *   overclaimer  says yes to 9 in 10 words whatever they are, and guesses
 */
function simulate(t: number, style: Style, r: () => number) {
  const known = new Map<string, boolean>();
  const knowsWord = (word: string) => {
    if (!known.has(word)) known.set(word, r() < 1 / (1 + Math.exp(-(1.4 * (t - byWord.get(word)!.band) + 1.0))));
    return known.get(word)!;
  };
  const s = new SizeCheckSession(CHECK, startBand(null), []);
  for (;;) {
    const v = s.snapshot();
    if (v.phase === "done") return { band: v.result!.band, asked: v.asked };
    const item = v.item!;
    const real = byWord.get(item.word);
    const k = real ? knowsWord(item.word) : false;
    if (item.kind === "know") s.answer(style === "overclaimer" ? r() < 0.9 : style === "halfclaimer" ? k || r() < 0.4 : k);
    else if (k && r() < 0.95) s.answer(real!.answer);
    else s.answer(style === "honest" ? null : Math.floor(r() * OPTIONS));
  }
}
/** Shares of `n` simulated sittings: placed above the true level, two or more above, two or more below, and at level `at`. */
function shares(t: number, style: Style, n: number, seed: number) {
  const r = rng(seed);
  const placed = Array<number>(9).fill(0);
  let questions = 0;
  let longest = 0;
  for (let i = 0; i < n; i++) {
    const o = simulate(t, style, r);
    placed[o.band]++;
    questions += o.asked;
    longest = Math.max(longest, o.asked);
  }
  const from = (lo: number, hi = 8) => placed.slice(Math.max(0, lo), hi + 1).reduce((a, b) => a + b, 0) / n;
  return { high: from(t + 1), high2: from(t + 2), low2: from(0, t - 2), at: (b: number) => placed[b] / n, upTo: (b: number) => from(0, b), questions: questions / n, longest };
}

test("VC-1 content: every level is measured from word frequency, ten or more words a level, four close one-word choices, invented words", () => {
  assert.deepEqual(checkProblems(CHECK), []);
  const raw = checkJson as unknown as { bands: { id: number; rank: number | null }[]; words: [number, number, string, string, ...string[]][] };
  for (const [level, rank, , word] of raw.words) {
    const upper = raw.bands[level - 1].rank ?? Infinity;
    const lower = level > 1 ? raw.bands[level - 2].rank! : 0;
    assert.ok(rank > lower && rank <= upper, `${word}: level ${level} does not match its measured rank ${rank}`);
  }
  for (const b of CHECK.bands) assert.ok(CHECK.words.filter((w) => w.band === b.id).length >= 10, `level ${b.id}`);
  assert.equal(CHECK.bands.length, 8);
  assert.ok(CHECK.fake.length >= 16 && CHECK.fake.every((f) => !byWord.has(f.word)));
  // the right choice does not sit in the same place every time
  const position = [0, 1, 2, 3].map((p) => CHECK.words.filter((w) => w.answer === p).length);
  for (const k of position) assert.ok(k >= 15, `answer positions ${position}`);
});

test("VC-2 elimination: it starts in the middle, jumps on the answer, and everyone meets words they do not know", () => {
  const four = sit(4);
  assert.equal(byWord.get(four.asked[0].word)!.band, 4, "an adult's first word is from the middle of the scale");
  const firstNo = four.asked.findIndex((a) => a.kind === "know" && byWord.has(a.word) && byWord.get(a.word)!.band > 4);
  assert.ok(firstNo >= 0 && firstNo <= 2, "a right start is followed at once by a much harder word");
  assert.ok(byWord.get(four.asked[firstNo].word)!.band >= 6, "a jump, not a step");
  assert.ok(four.result.band === 4 || four.result.band === 3, `knows levels 1 to 4: placed ${four.result.band}`);
  assert.ok(four.asked.filter((a) => a.kind === "know" && !byWord.has(a.word)).length >= 2, "invented words are mixed in");
  assert.ok(four.asked.some((a) => a.kind === "pick"), "then closest-word questions");
  assert.equal(new Set(four.asked.filter((a) => a.kind === "know").map((a) => a.word)).size, four.asked.filter((a) => a.kind === "know").length, "no word twice in the first part");
  // a closest-word question is never about a word the learner said they did not know
  const said = new Map(four.records.flatMap((x) => (x.type === "answer" && x.kind === "know" ? [[x.word, x.outcome] as const] : [])));
  for (const a of four.asked.filter((x) => x.kind === "pick")) assert.notEqual(said.get(a.word), "no", a.word);

  const none = sit(0);
  assert.equal(none.result.band, 0);
  assert.ok(none.asked.length <= 18, `a learner who knows none of the words is done in ${none.asked.length} questions`);
  const all = sit(8);
  assert.equal(all.result.band, 8, "knowing every word, the rarest included, is level 8");
  assert.ok(all.asked.some((a) => byWord.get(a.word)?.band === 8));
  for (const upTo of [1, 2, 3, 5, 6, 7]) {
    const b = sit(upTo).result.band;
    assert.ok(b === upTo || b === upTo - 1, `knows levels 1 to ${upTo}: placed ${b}`);
  }
  assert.equal(sit(2, [], startBand("early")).asked[0].word, CHECK.words.find((w) => w.band === 2)!.word, "a young child starts lower");
});

test("VC-3 a yes is never taken on trust: invented words, and no level without right closest-word answers", () => {
  const yes = (band: number): Evidence => ({ kind: "know", band, outcome: "yes" });
  const fake = (outcome: "yes" | "no"): Evidence => ({ kind: "know", band: 0, outcome });
  const claims = [yes(4), yes(6), yes(7), yes(8), yes(8), yes(8)];
  assert.equal(measure(claims).band, 0, "saying yes to every word places nobody");
  assert.ok(falseYes([fake("yes"), fake("yes"), fake("yes")]) > falseYes([fake("no"), fake("no"), fake("no")]));
  const top = (e: Evidence[]) => belief(e).slice(-5).reduce((a, b) => a + b, 0);
  assert.ok(top([...claims, fake("yes"), fake("yes"), fake("yes")]) < top([...claims, fake("no"), fake("no"), fake("no")]), "yes to invented words makes every yes count for less");
  // one lucky closest-word answer high up is not a level
  const lucky: Evidence[] = [...claims, fake("no"), fake("no"), { kind: "pick", band: 7, outcome: "right", claimed: true }, { kind: "pick", band: 7, outcome: "wrong", claimed: true }, { kind: "pick", band: 6, outcome: "wrong", claimed: true }];
  assert.ok(measure(lucky).band < 6);
  // someone who taps yes on everything and the first choice every time
  const s = new SizeCheckSession(CHECK, startBand(null));
  let n = 0;
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot(), n++) s.answer(v.item!.kind === "know" ? true : 0);
  assert.ok(s.snapshot().result!.band <= 1, `yes to everything, first choice every time: placed ${s.snapshot().result!.band}`);
  assert.ok(n <= KNOW_MAX + KNOW_MAX / 3 + PICK_MAX_UNTRUSTED);
  assert.equal(s.snapshot().result!.fakeYes, s.snapshot().result!.fakes);
});

test("VC-4 placement on simulated learners: may place low, never high", () => {
  const N = 1200;
  for (const style of ["honest", "guesser"] as const)
    for (let t = 1; t <= 8; t++) {
      const x = shares(t, style, N, 7000 + 13 * t + style.length);
      assert.ok(x.high <= 0.1, `${style}, words reach ${t}: placed above it ${(100 * x.high).toFixed(1)}% of the time`);
      assert.ok(x.high2 <= 0.01, `${style}, words reach ${t}: placed two levels up ${(100 * x.high2).toFixed(1)}%`);
      assert.ok(x.low2 <= 0.06, `${style}, words reach ${t}: placed two levels down ${(100 * x.low2).toFixed(1)}%`);
      assert.ok(x.at(t) + x.at(t - 1) >= 0.9, `${style}, words reach ${t}: at ${t} or ${t - 1} ${(100 * (x.at(t) + x.at(t - 1))).toFixed(0)}%`);
      assert.ok(x.longest <= 30 && x.questions <= ABOUT + 3, `${style} ${t}: ${x.questions.toFixed(1)} questions on average, ${x.longest} at most`);
    }
  for (let t = 1; t <= 8; t++) {
    const half = shares(t, "halfclaimer", N, 9000 + t);
    assert.ok(half.high <= 0.1 && half.high2 <= 0.04, `says yes to words they do not know, words reach ${t}: above ${(100 * half.high).toFixed(1)}%, two up ${(100 * half.high2).toFixed(1)}%`);
    const over = shares(t, "overclaimer", N, 9500 + t);
    assert.ok(over.high <= 0.1 && over.high2 <= 0.05, `says yes to nearly everything, words reach ${t}: above ${(100 * over.high).toFixed(1)}%, two up ${(100 * over.high2).toFixed(1)}%`);
    assert.ok(over.longest <= 30);
  }
  // the two people the check was first judged against: a weak reader (about 2) who is sure of himself, and a strong one (about 5)
  for (const style of ["guesser", "halfclaimer", "overclaimer"] as const) {
    const weak = shares(2, style, N, 4242 + style.length);
    assert.ok(weak.upTo(3) >= 0.97 && weak.upTo(2) >= 0.9, `${style}, words reach 2: at 3 or below ${(100 * weak.upTo(3)).toFixed(1)}%, at 2 or below ${(100 * weak.upTo(2)).toFixed(1)}%`);
    assert.ok(weak.at(7) + weak.at(8) <= 0.005, "never the 7 of 8 the old check gave");
  }
  const strong = shares(5, "honest", N, 555);
  assert.ok(strong.at(4) + strong.at(5) >= 0.95);
  // knowing the rarest words with room to spare is level 8; knowing nothing is over quickly
  assert.ok(shares(9, "honest", N, 99).at(8) >= 0.9);
  const none = shares(0, "honest", N, 11);
  assert.ok(none.at(0) >= 0.95 && none.questions <= 18, `knows almost nothing: ${none.questions.toFixed(1)} questions`);
});

test("VC-5 a retake uses unseen words first, and only a result of today's check is used", () => {
  const first = sit(4);
  const second = sit(4, first.records);
  const firstWords = new Set(first.asked.map((a) => a.word));
  const firstKnow = second.asked.filter((a) => a.kind === "know").slice(0, 3);
  assert.ok(firstKnow.every((a) => !firstWords.has(a.word)), "a second sitting opens with other words");
  assert.ok(second.result.band === 4 || second.result.band === 3);
  assert.equal(seenWords(second.records).size, new Set([...first.asked, ...second.asked].map((a) => a.word)).size);
  assert.equal(latestResult(second.records)!.band, second.result.band);
  assert.equal(latestResult([]), null);
  const old = { type: "result", check: "5", band: 7, answered: 12, correct: 12 } as const;
  assert.equal(latestResult([old]), null, "a result on an older check used other levels");
  assert.equal(wordPracticeBand([old], 2), 2);
  assert.equal(wordPracticeBand([old, ...second.records], 6), second.result.band);
  assert.deepEqual([startBand("early"), startBand("school"), startBand("older"), startBand(null)], [2, 3, 4, 4]);
  assert.match(levelLine(3), /^wider reading words \(word level 3 on a scale of 1 to 8\)$/);
  assert.match(levelLine(0), /below everyday words/);
});

test("VC-6 the record is kept with the learner and never reaches the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Words", "guardian", clock, "p-vocab");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const done = sit(5);
  await l.recordVocab(done.records);
  const events = await repo.load("p-vocab");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-vocab", clock);
  assert.equal(latestResult(again.vocabRecords())!.band, done.result.band);
  assert.match(String(eventProblem({ kind: "vocab", id: "x", at: clock(), record: {} })), /without its type/);
});
