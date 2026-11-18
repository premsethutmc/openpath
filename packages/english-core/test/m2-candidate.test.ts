/**
 * Candidate learner model (research M002), comparison only: it matches the research reference, it is scored
 * honestly against the production estimator on the same answers, and running it changes nothing for a learner.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { type CodeItem, type EvidenceEvent, type LedgerEvent, CANDIDATE_MODEL_VERSION, CandidateModel, Ledger, M002_CANDIDATE, compareModels, handLogit, itemParams, pCorrect, scorePredictions as score, strandOf } from "../src/index.ts";
import { T, ctx } from "./helpers.ts";

const golden = JSON.parse(readFileSync(new URL("./fixtures/m002-candidate-golden.json", import.meta.url), "utf8")) as { trust: number; rows: { learner: string; skill: string; strand: string; item: string; correct: boolean; hand: number; c: number; expected: number }[] };

const choice = () => [...ctx().content.items.values()].filter((i): i is { kind: "code" } & CodeItem => i.kind === "code" && i.format.startsWith("choice") && !i.passage);
function answers(learner: number, n: number, rightEvery: number, offset = 0): LedgerEvent[] {
  const items = choice();
  return Array.from({ length: n }, (_, k): EvidenceEvent => {
    const it = items[(offset + k * 7) % items.length];
    const right = (k + learner) % rightEvery !== 0;
    return { kind: "evidence", id: `e${learner}:${k}`, at: T(k, learner), session: `s${learner}:${Math.floor(k / 8)}`, item: { id: it.id, version: it.version }, response: { kind: "choice", choice: right ? it.answer! : (it.answer! + 1) % it.options!.length } };
  });
}

test("C-1 the TypeScript model reproduces the research reference, answer by answer", () => {
  const m = new CandidateModel();
  for (const [i, r] of golden.rows.entries()) assert.ok(Math.abs(m.update(r) - r.expected) < 1e-9, `answer ${i}`);
  assert.ok(Math.abs(m.trust - golden.trust) < 1e-9);
  assert.equal(golden.rows.length, 600);
});

test("C-2 it predicts before it learns, respects the guessing floor, and narrows its uncertainty", () => {
  const m = new CandidateModel();
  const x = { learner: "u", skill: "EN.GRM.VERB.sva", strand: "EN.GRM", item: "q", hand: 0, c: 0.25 };
  const before = m.predict(x);
  assert.equal(before, 0.25 + 0.75 * 0.5);
  assert.equal(m.update({ ...x, correct: false }), before);
  assert.ok(m.predict(x) < before);
  for (let i = 0; i < 60; i++) m.update({ ...x, item: `q${i}`, correct: false });
  assert.ok(m.predict({ ...x, item: "new" }) >= 0.25);
  assert.ok(m.ability("u").sd < 0.5 && m.ability("nobody").sd === 1);
  // a harder hand-set band lowers the starting prediction, by the starting trust
  assert.ok(m.predict({ ...x, learner: "v", item: "hard", hand: 2 }) < m.predict({ ...x, learner: "v", item: "easy", hand: -2 }));
  assert.equal(strandOf("EN.RDG.LIT.locate_detail"), "EN.RDG");
  assert.equal(handLogit({ a: 1.2, b: 6, c: 0 }, 4), 2.4);
});

test("C-3 both models are scored on the same answers, each prediction made before the answer", () => {
  const histories = [0, 1, 2].map((u) => ({ learner: `L${u}`, events: answers(u, 30, 3 + u, u * 11) }));
  const r = compareModels(ctx(), histories, { minAnswers: 50, minLearners: 3 });
  assert.equal(r.candidateModel, CANDIDATE_MODEL_VERSION);
  assert.equal(r.learners, 3);
  assert.ok(r.answers > 60 && r.answers <= 90, `${r.answers} scored`);
  assert.ok(r.enough);
  for (const row of r.rows) assert.ok(row.live > 0 && row.live < 1 && row.candidate > 0 && row.candidate < 1);
  // the first live prediction is the production prior at that question
  const first = r.rows.find((x) => x.learner === "L0")!;
  const item = ctx().content.items.get(first.item) as CodeItem;
  assert.equal(first.live, pCorrect(ctx().index.framework.prior.mean, itemParams(item)));
  // changing one answer changes no earlier prediction, for either model
  const flipped = structuredClone(histories);
  const e = flipped[1].events[12] as EvidenceEvent;
  const it = ctx().content.items.get(e.item.id) as CodeItem;
  e.response = { kind: "choice", choice: ((e.response as { choice: number }).choice + 1) % it.options!.length };
  const r2 = compareModels(ctx(), flipped, { minAnswers: 50, minLearners: 3 });
  const at = r.rows.findIndex((x) => x.evidence === e.id);
  assert.ok(at > 0);
  assert.deepEqual(r2.rows.slice(0, at + 1).map((x) => [x.live, x.candidate]), r.rows.slice(0, at + 1).map((x) => [x.live, x.candidate]));
  assert.notDeepEqual(r2.rows.slice(at + 1).map((x) => x.candidate), r.rows.slice(at + 1).map((x) => x.candidate));
  // deterministic, and independent of the order the histories are given in
  assert.deepEqual(compareModels(ctx(), [...histories].reverse(), { minAnswers: 50, minLearners: 3 }).rows, r.rows);
  assert.equal(r.logLossDifference, r.candidate!.logLoss - r.live!.logLoss);
});

test("C-4 a repeated question and an answer given with help are not scored", () => {
  const base = answers(0, 6, 99);
  const again = { ...(base[2] as EvidenceEvent), id: "again", at: T(20) };
  // a second attempt after a hint on a question not met before: kept, counted as seen, never evidence
  const helped: EvidenceEvent = { ...(answers(0, 8, 99)[7] as EvidenceEvent), id: "helped", at: T(21), provenance: { schema: "provenance@1", attempt: 2, hints: ["h1"], afterFeedback: true, policies: ["assisted@1"] } };
  assert.ok(!base.some((e) => (e as EvidenceEvent).item.id === helped.item.id));
  const r = compareModels(ctx(), [{ learner: "L", events: [...base, again, helped] }]);
  assert.deepEqual(r.rows.map((x) => x.evidence), base.map((e) => e.id));
  assert.equal(r.enough, false, "six answers from one learner is not a comparison");
});

test("C-5 running the comparison changes nothing: the events and the learner's estimates are as before", () => {
  const events = answers(4, 25, 4);
  const frozen = JSON.stringify(events);
  const before = JSON.stringify(Ledger.rebuild(ctx(), "L4", events).composite);
  const deep = (o: unknown): unknown => (o && typeof o === "object" ? (Object.values(o).forEach(deep), Object.freeze(o)) : o);
  deep(events);
  compareModels(ctx(), [{ learner: "L4", events }]);
  assert.equal(JSON.stringify(events), frozen);
  assert.equal(JSON.stringify(Ledger.rebuild(ctx(), "L4", events).composite), before);
});

test("C-6 scoring: log loss, Brier and calibration error on known cases", () => {
  assert.equal(score([]), null);
  const s = score([{ correct: true, p: 0.5 }, { correct: false, p: 0.5 }])!;
  assert.ok(Math.abs(s.logLoss - Math.log(2)) < 1e-12 && s.brier === 0.25 && s.calibrationError === 0);
  assert.equal(score([{ correct: false, p: 0.9 }, { correct: false, p: 0.9 }])!.calibrationError, 0.9);
  assert.deepEqual(Object.keys(M002_CANDIDATE).length, 15);
});
