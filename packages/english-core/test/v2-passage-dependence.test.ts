/**
 * V2: reading evidence dependence (passage@1, PR #25). Answers on one reading passage are not independent, so under
 * passage@1 only the first counted answer on a passage changes that capability's estimate. A later fresh answer on
 * the same passage is held: kept, with its score and misconceptions, for diagnosis and reporting. Answers recorded
 * without the policy mark (everything before it) replay exactly as before.
 * Synthetic events only: software behaviour, not educational effectiveness.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type EvidenceEvent, type LedgerEvent, Ledger, PASSAGE_POLICY, leafView } from "../src/index.ts";
import { profileContext } from "./rule-profiles.ts";

const ctx = profileContext();
const DET = "EN.RDG.LIT.locate_detail";
const MAIN = "EN.RDG.SUM.main_idea";
const OLD = { schema: "provenance@1" as const, attempt: 1, hints: [], afterFeedback: false };
const NEW = { ...OLD, policies: [PASSAGE_POLICY] };
const at = (day: number, min: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + day * 86_400_000 + min * 60_000).toISOString();

function answer(n: number, id: string, right: boolean, session: string, day: number, min: number, provenance: EvidenceEvent["provenance"] = NEW): EvidenceEvent {
  const i = ctx.content.items.get(id)!;
  assert.ok(i.kind === "code" && i.options, id);
  return { kind: "evidence", id: `e${n}`, at: at(day, min), session, item: { id, version: i.version }, response: { kind: "choice", choice: right ? i.answer! : (i.answer! + 1) % i.options.length }, provenance };
}
const build = (events: LedgerEvent[]) => Ledger.rebuild(ctx, "pd", events);
const node = (l: Ledger, cap = DET) => l.composite.nodes[cap];

test("V2-1 a second answer on the same passage is held: the estimate and its uncertainty are those of the first answer alone", () => {
  const one = build([answer(1, "rdg.p1.q1", true, "a", 0, 1)]);
  const two = build([answer(1, "rdg.p1.q1", true, "a", 0, 1), answer(2, "rdg.p1.q2", true, "a", 0, 2)]);
  assert.deepEqual(node(two).direct, node(one).direct, "no extra confidence from the second question on the passage");
  assert.deepEqual(node(two).combined, node(one).combined);
  assert.equal(node(two).directN, 1);
  const d = two.decisions.find((x) => x.source === "e2")!;
  assert.equal(d.verdict, "held");
  assert.deepEqual(d.observation?.samePassage, { passage: "rdg.p1", counted: "d:e1:EN.RDG.LIT.locate_detail" });
  assert.match(d.reasons[0], /same reading passage \(rdg\.p1\).*passage@1/);
});

test("V2-2 the held answer is preserved for diagnosis and reporting: response, score, item and use stay in the ledger", () => {
  const l = build([answer(1, "rdg.p1.q1", true, "a", 0, 1), answer(2, "rdg.p1.q2", false, "a", 0, 2)]);
  assert.equal(l.events.filter((e) => e.kind === "evidence").length, 2, "both responses are kept");
  const d = l.decisions.find((x) => x.source === "e2")!;
  assert.equal(d.observation?.item, "rdg.p1.q2");
  assert.equal(d.observation?.value, 0, "its score is recorded");
  assert.equal(d.observation?.exposure, "fresh");
  assert.ok(l.exposures.has("rdg.p1.q2"), "it counts as seen, so it is not asked again");
});

test("V2-3 historical records (no policy mark) replay exactly as before: both answers count", () => {
  const events = [answer(1, "rdg.p1.q1", true, "a", 0, 1, OLD), answer(2, "rdg.p1.q2", true, "a", 0, 2, OLD), answer(3, "rdg.p2.q1", false, "b", 1, 1, OLD)];
  const l = build(events);
  assert.ok(l.decisions.every((d) => d.verdict === "accepted" && d.observation?.samePassage === undefined));
  assert.equal(node(l).directN, 3);
  // legacy records without any provenance are untouched too
  const legacy = build(events.map(({ provenance: _p, ...e }) => e as EvidenceEvent));
  assert.equal(node(legacy).directN, 3);
  assert.deepEqual(node(legacy).direct, node(l).direct);
});

test("V2-4 continuing an old record: a passage already counted in history is not counted again by a new answer", () => {
  const l = build([answer(1, "rdg.p1.q1", true, "a", 0, 1, OLD), answer(2, "rdg.p1.q2", true, "b", 3, 1, NEW), answer(3, "rdg.p2.q1", true, "b", 3, 2, NEW)]);
  assert.equal(l.decisions.find((d) => d.source === "e1")!.verdict, "accepted", "history is unchanged");
  assert.equal(l.decisions.find((d) => d.source === "e2")!.verdict, "held", "the passage was already counted (in an earlier session)");
  assert.equal(l.decisions.find((d) => d.source === "e3")!.verdict, "accepted", "a new passage counts");
});

test("V2-5 the rule is per capability: a main-idea question and a detail question on one passage each count once for their own skill", () => {
  const l = build([answer(1, "rdg.p1.q1", true, "a", 0, 1), answer(2, "rdg.p1.q5", true, "a", 0, 2), answer(3, "rdg.p1.q6", true, "a", 0, 3)]);
  const v = (src: string) => l.decisions.find((d) => d.source === src)!.verdict;
  assert.deepEqual([v("e1"), v("e2"), v("e3")], ["accepted", "accepted", "held"]);
  assert.equal(node(l, DET).directN, 1);
  assert.equal(node(l, MAIN).directN, 1);
});

test("V2-6 confidence comes from passages, not questions: four right answers on two passages count as two", () => {
  const ids = ["rdg.p1.q1", "rdg.p1.q2", "rdg.p2.q1", "rdg.p2.q2"];
  const marked = build(ids.map((id, k) => answer(k, id, true, "a", 0, k)));
  const unmarked = build(ids.map((id, k) => answer(k, id, true, "a", 0, k, OLD)));
  assert.equal(node(marked).directN, 2);
  assert.equal(node(unmarked).directN, 4);
  assert.ok(node(marked).direct.variance > node(unmarked).direct.variance, "less certainty than four independent answers would give");
  // the same two passages answered once each give exactly the marked result
  const once = build(["rdg.p1.q1", "rdg.p2.q1"].map((id, k) => answer(k === 0 ? 0 : 2, id, true, "a", 0, k === 0 ? 0 : 2)));
  assert.deepEqual(node(marked).direct, node(once).direct);
});

test("V2-7 a repeated question keeps its existing handling (recorded for later checks only), and a revoked answer does not use up its passage", () => {
  const rep = build([answer(1, "rdg.p1.q1", true, "a", 0, 1), answer(2, "rdg.p1.q1", true, "b", 20, 1)]);
  const d = rep.decisions.find((x) => x.source === "e2")!;
  assert.equal(d.verdict, "accepted");
  assert.equal(d.observation?.exposure, "repeat");
  assert.equal(d.observation?.samePassage, undefined);
  const revoked = build([answer(1, "rdg.p1.q1", true, "a", 0, 1), answer(2, "rdg.p1.q2", true, "a", 0, 2), { kind: "revoke", id: "r1", at: at(0, 3), decision: "d:e1:EN.RDG.LIT.locate_detail", reason: "test" }]);
  assert.equal(revoked.decisions.find((x) => x.source === "e2")!.verdict, "accepted");
});

test("V2-8 deterministic: the same events give the same decisions and composite, whatever the run", () => {
  const events = [answer(1, "rdg.p1.q1", false, "a", 0, 1), answer(2, "rdg.p1.q2", true, "a", 0, 2), answer(3, "rdg.p2.q1", true, "b", 1, 1), answer(4, "rdg.p1.q5", true, "b", 1, 2)];
  assert.deepEqual(JSON.stringify(build(events).decisions), JSON.stringify(build(events).decisions));
  assert.deepEqual(build(events).composite, build(events).composite);
  assert.equal(leafView(build(events).composite, ctx.index, DET, at(2, 0)).direct.n, 2);
});
