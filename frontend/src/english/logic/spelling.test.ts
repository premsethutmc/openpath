/**
 * Spelling practice (logic/spelling.ts): the Spelling Bee's 100 words, scoring, levels, review, sessions, and the
 * learner's record (resume, reload, backup). Synthetic learners only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadContent } from "./content.ts";
import type { AppEvent, SpellAnswerEvent } from "./events.ts";
import { Learner, PilotRefusal } from "./learner.ts";
import { testClock } from "./journey-sim.ts";
import { parseBackup } from "./backup.ts";
import { BANK, SPELLING, bankWords, checkSpelling, levelOf, planSession, sourceProgress, spellingState } from "./spelling.ts";
import { MemoryRepo } from "./store.ts";
import beeJson from "../../../../content/english/spelling/spelling-bee.json";
import reviews from "../../../../content/english/pilot/reviews.json";

const c = loadContent({ mode: "development" });
const words = bankWords(c);
const byId = new Map(words.map((w) => [w.id, w]));
const T0 = Date.parse("2026-10-15T09:00:00.000Z");
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const DAY_MIN = 24 * 60;

/** A synthetic answer event (for the rules, without the app). */
function ans(i: number, id: string, correct: boolean, session = "s1", minute = i): SpellAnswerEvent {
  const w = byId.get(id)!;
  return { kind: "spell_answer", id: `a${i}`, at: at(minute), session, source: BANK, word: { id, text: w.word, level: w.level }, response: correct ? w.word : "zzz", correct, plays: 1, review: false };
}

test("SB-1 exactly 100 preloaded words, 20 at each of five levels, unique, each with a spelling and a sentence", () => {
  assert.equal(words.length, 100);
  for (let L = 1; L <= 5; L++) assert.equal(words.filter((w) => w.level === L).length, 20, `level ${L}`);
  assert.equal(new Set(words.map((w) => w.id)).size, 100);
  assert.equal(new Set(words.map((w) => w.word.toLowerCase())).size, 100, "no word twice");
  for (const w of words) {
    assert.match(w.word, /^[a-z]+$/, w.id);
    assert.ok(w.sentence && w.sentence.toLowerCase().includes(w.word), `${w.id}: the sentence uses the word`);
    // the word once, as a whole word (not inside another word), in a short sentence a child can follow by ear
    assert.equal((w.sentence!.match(new RegExp(`\\b${w.word}\\b`, "gi")) ?? []).length, 1, `${w.id}: the word once in its sentence`);
    assert.ok(w.sentence!.split(/\s+/).length <= 12 && /[.?!]$/.test(w.sentence!), `${w.id}: a short, complete sentence`);
    assert.deepEqual(w.variants, [], `${w.id}: British spelling, no variants in the preloaded bank`);
  }
});

test("SB-2 provenance: 79 are the owner-approved dictation questions (same words); the 21 new ones are owner-approved separately (provisional, pilot use)", () => {
  type Approval = { status: string; scope: string; authority: string; reviewer: string; date: string; provenance: string; recorded_at: string };
  const entries = (beeJson as unknown as { words: { id: string; item?: { id: string; version: number }; status: string; approval?: Approval }[] }).words;
  const approved = new Set((reviews as { id: string; version: string; authority?: string }[]).filter((r) => r.authority === "product-owner").map((r) => `${r.id}@${r.version}`));
  const reused = entries.filter((e) => e.item);
  assert.equal(reused.length, 79);
  assert.deepEqual(new Set(reused.map((e) => e.item!.id)), new Set(c.dictation.items.map((i) => i.id)), "every dictation question, once");
  for (const e of reused) {
    assert.ok(approved.has(`${e.item!.id}@${e.item!.version}`), `${e.id} is owner-approved as ${e.item!.id}`);
    assert.match(e.status, /^owner-approved/);
    assert.equal(byId.get(e.id)!.word, c.dictation.items.find((i) => i.id === e.item!.id)!.answers![0], "the word comes from the question");
  }
  const fresh = entries.filter((e) => !e.item);
  assert.equal(fresh.length, 21);
  for (const e of fresh) {
    // the founder's provisional approval of 15 October 2026, recorded as such: never as an educator review
    assert.match(e.status, /^owner-approved \(provisional, for pilot use/, e.id);
    assert.match(e.status, /not an educator review or a validation; separate from the 291/, e.id);
    const a = e.approval!;
    assert.deepEqual([a.status, a.scope, a.authority, a.date], ["owner-approved", "pilot (provisional)", "product-owner", "2026-10-15"], e.id);
    assert.match(a.provenance, /^Founder instruction, 15 October 2026: .*21 additional Spelling Bee words.*not an educator review/);
    assert.ok(!Number.isNaN(Date.parse(a.recorded_at)) && a.recorded_at.startsWith("2026-10-15T"));
    assert.ok(!(reviews as { id: string }[]).some((r) => r.id === e.id), "kept apart from the 291 question approvals");
  }
  assert.ok(entries.filter((e) => e.item).every((e) => !e.approval), "the 79 keep their own (question) approval");
});

test("SB-12 levels follow the spelling rule each word tests (15 October 2026 levels)", () => {
  const entries = (beeJson as unknown as { words: { id: string; item?: { id: string } }[] }).words;
  const item = (e: { item?: { id: string } }) => c.dictation.items.find((i) => i.id === e.item!.id)!;
  const reused = entries.filter((e) => e.item).map((e) => ({ word: byId.get(e.id)!.word, level: byId.get(e.id)!.level!, rule: item(e).step as string, b: item(e).b as number }));
  const levelsOf = (rule: string) => [...new Set(reused.filter((r) => r.rule === rule).map((r) => r.level))].sort();
  // each rule at one level, except the three splits that 20 words per level forces (documented in the content's policy)
  const split = new Set(["plain_affix", "drop_e", "y_to_i", "able_ible"]);
  for (const rule of new Set(reused.map((r) => r.rule))) {
    const ls = levelsOf(rule);
    if (split.has(rule)) assert.equal(ls.length, 2, `${rule} spans two neighbouring levels`), assert.equal(ls[1] - ls[0], 1);
    else assert.equal(ls.length, 1, `${rule} is at one level, not ${ls.join(" and ")}`);
  }
  // both halves of the multi-syllable vowel-suffix rule are practised together, at level 4
  assert.deepEqual(levelsOf("stress_doubling"), [4]);
  assert.deepEqual(levelsOf("no_double_unstressed"), [4]);
  for (const w of ["opened", "entered", "happened", "ordered", "offering", "limited", "gardening"]) assert.equal(reused.find((r) => r.word === w)!.level, 4, w);
  // the progression still rises: each level's typical (median) rule band is above the one before
  const median = (L: number) => {
    const bs = reused.filter((r) => r.level === L).map((r) => r.b).sort((x, y) => x - y);
    return bs[Math.floor(bs.length / 2)];
  };
  for (let L = 1; L < 5; L++) assert.ok(median(L) < median(L + 1), `level ${L} is easier than level ${L + 1}`);
  // the founder's changes: laugh to level 2; unlock (the Year 1 prefix un-) to level 1 to keep 20 each
  assert.equal(byId.get("bee.laugh")!.level, 2);
  assert.equal(byId.get("bee.unlock")!.level, 1);
});

test("SB-3 scoring: capital letters, spaces and a final full stop do not matter; listed variants are accepted; anything else is wrong", () => {
  const w = { word: "colour", variants: ["color"] };
  for (const typed of ["colour", " Colour ", "COLOUR.", "color"]) assert.ok(checkSpelling(w, typed), typed);
  for (const typed of ["colur", "colours", "", "   ", "c olour"]) assert.ok(!checkSpelling(w, typed), typed);
  assert.ok(!checkSpelling({ word: "friend", variants: [] }, "freind"));
});

test("SB-4 the first session: 10 new words at level 1, without any placement", () => {
  const plan = planSession(spellingState([]), words, at(0));
  assert.equal(plan.ids.length, SPELLING.sessionSize);
  assert.equal(plan.level, 1);
  assert.ok(plan.ids.every((id) => byId.get(id)!.level === 1));
});

test("SB-5 levels: 4 of 5 right at the level moves up; 3 wrong moves down; never below 1 or above 5; other levels' answers do not count", () => {
  const L1 = words.filter((w) => w.level === 1).map((w) => w.id);
  const L2 = words.filter((w) => w.level === 2).map((w) => w.id);
  // 4 right, 1 wrong at level 1: up to 2
  const up = [ans(1, L1[0], true), ans(2, L1[1], false), ans(3, L1[2], true), ans(4, L1[3], true), ans(5, L1[4], true)];
  assert.equal(levelOf(spellingState(up), BANK), 2);
  // 3 of the first 5 right is not enough
  assert.equal(levelOf(spellingState([ans(1, L1[0], true), ans(2, L1[1], false), ans(3, L1[2], true), ans(4, L1[3], false), ans(5, L1[4], true)]), BANK), 1);
  // at level 2: 3 wrong goes back down
  const down = [...up, ans(6, L2[0], false), ans(7, L2[1], true), ans(8, L2[2], false), ans(9, L2[3], false)];
  const st = spellingState(down);
  assert.equal(levelOf(st, BANK), 1);
  assert.deepEqual(st.levels.get("bank:spelling-bee")!.changes.map((x) => [x.from, x.to]), [[1, 2], [2, 1]]);
  // never below 1
  assert.equal(levelOf(spellingState([ans(1, L1[0], false), ans(2, L1[1], false), ans(3, L1[2], false)]), BANK), 1);
  // an answer to a word of another level (a review, say) does not move the level
  assert.equal(levelOf(spellingState([ans(1, L2[0], true), ans(2, L2[1], true), ans(3, L2[2], true), ans(4, L2[3], true), ans(5, L2[4], true)]), BANK), 1);
  // never above 5: answer everything right
  const all = words.map((w, i) => ans(i, w.id, true));
  assert.equal(levelOf(spellingState(all), BANK), 5);
});

test("SB-6 the plan follows the level: after moving up, new words come from the new level, then the nearest", () => {
  const L1 = words.filter((w) => w.level === 1).map((w) => w.id);
  const up = L1.slice(0, 5).map((id, i) => ans(i, id, true));
  const plan = planSession(spellingState(up), words, at(60));
  assert.equal(plan.level, 2);
  assert.ok(plan.ids.every((id) => byId.get(id)!.level === 2));
  // when a level runs out, the nearest level fills the session: never stuck
  const L5 = words.filter((w) => w.level === 5).map((w) => w.id);
  const toFive = words.filter((w) => w.level! < 5).map((w, i) => ans(i, w.id, true));
  const atFive = [...toFive, ...L5.slice(0, 18).map((id, i) => ans(200 + i, id, true))];
  const p5 = planSession(spellingState(atFive), words, at(400));
  assert.equal(p5.level, 5);
  assert.equal(p5.ids.length, 2, "the last two new words at level 5, then every word has been practised");
});

test("SB-7 review: a misspelt word comes back next session (not the same one), then after 1, 3 and 7 days while it is right", () => {
  const L1 = words.filter((w) => w.level === 1).map((w) => w.id);
  const missed = L1[0];
  let events: AppEvent[] = [ans(1, missed, false, "s1", 1)];
  // not again in the session that missed it
  let st = spellingState(events);
  assert.equal(st.words.get(`bank:spelling-bee/${missed}`)!.box, 0);
  // the next session asks it first
  const next = planSession(st, words, at(10));
  assert.equal(next.ids[0], missed);
  // right in session 2: due again in 1 day, not before
  events = [...events, ans(2, missed, true, "s2", 10)];
  st = spellingState(events);
  assert.ok(!planSession(st, words, at(12 * 60)).ids.includes(missed), "not due after 12 hours");
  assert.equal(planSession(st, words, at(DAY_MIN + 11)).ids[0], missed, "due after a day");
  // right after 1 day, 3 days, 7 days: off the review list
  events = [...events, ans(3, missed, true, "s3", DAY_MIN + 11), ans(4, missed, true, "s4", 4 * DAY_MIN + 12), ans(5, missed, true, "s5", 11 * DAY_MIN + 13)];
  st = spellingState(events);
  const rec = st.words.get(`bank:spelling-bee/${missed}`)!;
  assert.equal(rec.box, null);
  assert.ok(rec.reviewed);
  // wrong again during review sends it back to the start
  const back = spellingState([...events.slice(0, 3), ans(6, missed, false, "s4", 2 * DAY_MIN)]);
  assert.equal(back.words.get(`bank:spelling-bee/${missed}`)!.box, 0);
});

test("SB-8 a word spelt right is not asked again while new words remain; when all are practised, the oldest come back", () => {
  const first = planSession(spellingState([]), words, at(0)).ids;
  const done = first.map((id, i) => ans(i, id, true, "s1", i));
  const second = planSession(spellingState(done), words, at(30)).ids;
  assert.equal(second.filter((id) => first.includes(id)).length, 0);
  const everything = words.map((w, i) => ans(i, w.id, true, `s${Math.floor(i / 10)}`, i));
  const again = planSession(spellingState(everything), words, at(500)).ids;
  assert.equal(again.length, SPELLING.sessionSize, "never stuck: practised words come back");
});

test("SB-9 in the app: a session without placement, answers recorded, the session ends by itself, and resumes after a reload", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Bee Learner", "guardian", clock, "p-bee");
  const ledgerBefore = l.state.ledger.decisions.length;
  await l.startSpelling();
  let cur = l.spellingSession()!;
  assert.equal(cur.total, 10);
  assert.equal(cur.position, 1);
  // answer 4, then "reload": a new Learner from the same stored record carries on at the same place
  for (let k = 0; k < 4; k++) await l.answerSpelling(k === 1 ? "wrongg" : l.spellingSession()!.word!.word, 2);
  const nextWord = l.spellingSession()!.word!.id;
  const again = await Learner.open(c, repo, "p-bee", clock);
  cur = again.spellingSession()!;
  assert.equal(cur.word!.id, nextWord, "the same next word after a reload");
  assert.deepEqual([cur.position, cur.right, cur.wrong], [5, 3, 1]);
  for (let k = 0; k < 6; k++) await again.answerSpelling(again.spellingSession()!.word!.word, 1);
  assert.equal(again.spellingSession(), null, "finished after 10 words");
  const st = again.spelling();
  const session = [...st.sessions.values()][0];
  assert.equal(session.end?.reason, "finished");
  assert.equal(session.answers.length, 10);
  assert.ok(session.answers.every((a) => a.source.type === "bank" && a.word.level === 1 && a.plays >= 1 && a.at));
  const p = sourceProgress(st, again.spellingWords(), clock());
  assert.deepEqual([p.total, p.practised, p.right, p.answers, p.reviewList], [100, 10, 9, 10, 1]);
  // practice only: the engine's ledger and estimates are untouched
  assert.equal(again.state.ledger.decisions.length, ledgerBefore);
  assert.equal(again.state.ledger.events.length, 0);
  // the next session starts with the misspelt word
  await again.startSpelling();
  const missed = session.answers.find((a) => !a.correct)!.word.id;
  assert.equal(again.spellingSession()!.word!.id, missed);
  // and the record goes through a backup and back
  const b = again.backup();
  const parsed = parseBackup(JSON.stringify(b));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
});

test("SB-10 a pilot build offers no Spelling Bee (it is not on the pilot allowlist)", async () => {
  const pilot = loadContent({ mode: "pilot" });
  assert.equal(bankWords(pilot).length, 0);
  const l = await Learner.create(pilot, new MemoryRepo(), "P", "guardian", testClock(), "p-pilot");
  await assert.rejects(l.startSpelling(), PilotRefusal);
});
