/** play@1: more questions just for fun — fresh practice questions of a topic, easy first, harder as she gets them right. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { exposureKey, phaseOf, pool } from "../../../packages/learning/src/families";
import { ease } from "../../../packages/learning/src/intervention";
import { PLAY_CONTEXT, PLAY_STEPS, playLevel, playNext, playPool, playTopics, playedSince } from "../../../packages/learning/src/play";
import type { LearnerRecords } from "../../../packages/learning/src/records";

const competency = pool("ldiv").items[0].competency;
const recs = (attempts: { questionId: string; credit: boolean; hints?: number; context?: string }[]): LearnerRecords => ({
  enrolments: [], goals: new Map(), curricula: new Map(), teaching: [], skips: [], sessions: {}, pending: [], unresolved: [], acknowledgements: [],
  attempts: attempts.map((a, i) => ({ id: `a${i}`, at: new Date(Date.UTC(2026, 10, 20, 10, i)).toISOString(), session: "s", questionId: a.questionId, response: "", activity: "practice", hints: a.hints ?? 0, solution: false, competency, n: 1, context: a.context ?? PLAY_CONTEXT, credit: a.credit })),
} as unknown as LearnerRecords);

test("play starts on the easiest unseen practice question, never a check or later-check one", () => {
  const empty = recs([]);
  const open = playPool(competency, empty);
  assert.ok(open.length > 20, "plenty to play with");
  assert.ok(open.every((id) => phaseOf(id.replace(/:(mc|w)$/, "")) === "practice"), "checks stay fresh");
  const first = playNext(competency, empty)!;
  assert.equal(first, open[0]);
  assert.ok(open.every((id) => ease(id) >= ease(first)));
  assert.deepEqual(playTopics(empty), [], "nothing to play before a topic is met");
});

test("right answers on her own move up, help stays put, a wrong one steps back; asked questions are not asked again", () => {
  const open = playPool(competency, recs([]));
  const rights = recs(open.slice(0, PLAY_STEPS).map((questionId) => ({ questionId, credit: true })));
  assert.equal(playLevel(competency, rights), PLAY_STEPS);
  const hard = playNext(competency, rights)!;
  assert.ok(!open.slice(0, PLAY_STEPS).some((id) => exposureKey(id) === exposureKey(hard)), "fresh");
  assert.ok(ease(hard) >= ease(playNext(competency, recs([]))!), "harder than the first");
  assert.equal(playLevel(competency, recs([{ questionId: open[0], credit: true, hints: 1 }])), 0, "with help: stays");
  assert.equal(playLevel(competency, recs([{ questionId: open[0], credit: true }, { questionId: open[1], credit: false }])), 0, "wrong: back down");
  assert.deepEqual(playTopics(rights), [competency]);
  assert.deepEqual(playedSince(rights, 0), { played: PLAY_STEPS, right: PLAY_STEPS });
  assert.equal(playLevel(competency, recs([{ questionId: open[0], credit: true, context: "study:x" }])), 0, "only play answers set the level");
});

test("the child's app offers Play on the home screen and after a topic, saved as practice marked play", () => {
  const main = readFileSync(new URL("./Main.tsx", import.meta.url), "utf8"), play = readFileSync(new URL("./Play.tsx", import.meta.url), "utf8");
  assert.match(main, /onPlay=\{\(\) => setView\(\{ name: "play" \}\)\}/);
  assert.match(main, /More questions like this, just for fun/);
  assert.match(main, /Practised for fun this week/);
  assert.match(play, /<Ask key=\{qid\} qid=\{qid\} activity="practice" context=\{PLAY_CONTEXT\} hintAllowed/);
});
