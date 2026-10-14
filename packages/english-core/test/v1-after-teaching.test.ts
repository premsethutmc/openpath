/**
 * V1: answers given after teaching in the same session (PR #23). They update the estimate exactly as before, but
 * they cannot demonstrate, master or count as a retention check. Records without teaching read exactly as before.
 * Synthetic events only: software behaviour, not educational effectiveness.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type LedgerEvent, Ledger, leafView } from "../src/index.ts";
import { CAP, profileContext } from "./rule-profiles.ts";

const ctx = profileContext();
const IND = { schema: "provenance@1" as const, attempt: 1, hints: [], afterFeedback: false };
const at = (day: number, min: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + day * 86_400_000 + min * 60_000).toISOString();
// candidate bank items on the capability (not provisional, not generated): these reach the engine
type Bank = { id: string; version: number; format: string; answers?: string[]; answer?: number; options?: string[] };
const pool = [...ctx.content.items.values()].filter((i) => i.kind === "code" && i.target === CAP && !i.generated && !i.evidence_status) as unknown as Bank[];
const typed = pool.filter((i) => i.format.startsWith("typed") && i.answers?.length).sort((a, b) => a.id.localeCompare(b.id));
const choice = pool.filter((i) => i.format.startsWith("choice")).sort((a, b) => a.id.localeCompare(b.id));
// alternate two formats (two contexts), as a real check would
const bank: Bank[] = typed.flatMap((t, k) => (choice[k] ? [t, choice[k]] : [t]));
const responseFor = (i: Bank, right: boolean) => (i.format.startsWith("typed") ? { kind: "typed" as const, text: right ? i.answers![0] : "zzzq" } : { kind: "choice" as const, choice: right ? i.answer! : (i.answer! + 1) % i.options!.length });

function script() {
  const events: LedgerEvent[] = [];
  let n = 0;
  let next = 0;
  const api = {
    events,
    answer(right: boolean, day: number, min: number, session: string) {
      const i = bank[next++ % bank.length];
      events.push({ kind: "evidence", id: `e${n++}`, at: at(day, min), session, item: { id: i.id, version: i.version }, response: responseFor(i, right), provenance: IND });
      return api;
    },
    teach(day: number, min: number, session: string, capability = CAP) {
      events.push({ kind: "intervention", id: `iv${n++}`, at: at(day, min), session, capability, strategy: "lesson", content: "lesson:x" });
      return api;
    },
    ledger: () => Ledger.rebuild(ctx, "v1", events),
  };
  return api;
}
const view = (l: Ledger, day: number) => leafView(l.composite, ctx.index, CAP, at(day, 600));

test("V1-1 no teaching: the node is byte-identical to the interpretation before this change (no new fields)", () => {
  const l = script().answer(true, 0, 1, "a").answer(false, 0, 2, "a").answer(true, 0, 3, "a").ledger();
  const node = l.composite.nodes[CAP];
  assert.equal(node.qualifyingN, undefined);
  assert.equal(node.qualifiedLevel, undefined);
  assert.ok(node.sessions!.every((s) => s.teaching === undefined));
  assert.ok(l.decisions.every((d) => d.observation?.setting === undefined));
});

test("V1-2 five wrong, a lesson, five right in the same session: the estimate rises as before, but nothing is demonstrated", () => {
  const taught = script();
  const plain = script();
  for (let k = 0; k < 5; k++) (taught.answer(false, 0, k, "a"), plain.answer(false, 0, k, "a"));
  taught.teach(0, 10, "b");
  for (let k = 0; k < 5; k++) (taught.answer(true, 0, 11 + k, "b"), plain.answer(true, 0, 11 + k, "b"));
  const t = taught.ledger();
  const p = plain.ledger();
  // the same estimate (no change to the scoring maths) …
  assert.deepEqual(t.composite.nodes[CAP].direct, p.composite.nodes[CAP].direct);
  assert.deepEqual(t.composite.nodes[CAP].combined, p.composite.nodes[CAP].combined);
  // … but the answers after teaching are marked, and demonstrate nothing
  assert.equal(t.decisions.filter((d) => d.observation?.setting === "after_teaching").length, 5);
  const v = view(t, 0);
  assert.equal(v.demonstrated, null);
  assert.equal(v.verification.status, "not_demonstrated");
  assert.deepEqual(t.composite.nodes[CAP].demonstrations, []);
  // the same answers without the lesson would have demonstrated (so the distinction is doing the work)
  assert.notEqual(view(p, 0).verification.status, "not_demonstrated");
});

test("V1-3 fresh independent answers in a later session can then demonstrate, by the existing rules", () => {
  const s = script();
  for (let k = 0; k < 5; k++) s.answer(false, 0, k, "a");
  s.teach(0, 10, "b");
  for (let k = 0; k < 5; k++) s.answer(true, 0, 11 + k, "b");
  for (let k = 0; k < 4; k++) s.answer(true, 1, k, "c");
  const l = s.ledger();
  const demos = l.composite.nodes[CAP].demonstrations;
  assert.ok(demos.every((d) => d.session === "c"), "demonstrations come only from the session without teaching");
  assert.equal(view(l, 1).verification.status, "demonstrated");
});

test("V1-4 teaching followed by answers is never a retention check, however long after", () => {
  const s = script();
  for (let k = 0; k < 6; k++) s.answer(true, 0, k, "a"); // demonstrated on day 0
  s.teach(10, 0, "d"); // ten days later: a lesson, then answers in the same session
  for (let k = 0; k < 3; k++) s.answer(false, 10, 1 + k, "d");
  const l = s.ledger();
  const v = view(l, 10);
  assert.equal(v.retention.checks.length, 0, "not judged as a check");
  assert.equal(v.retention.status, "overdue", "still due: a fresh check is needed");
});

test("V1-5 only teaching on the same capability, earlier in the same session, counts", () => {
  const other = script();
  other.teach(0, 0, "a", "EN.GRM.VERB.sva");
  for (let k = 0; k < 3; k++) other.answer(true, 0, 1 + k, "a");
  assert.ok(other.ledger().decisions.every((d) => d.observation?.setting === undefined), "teaching on another capability");
  const later = script();
  for (let k = 0; k < 3; k++) later.answer(true, 0, k, "a");
  later.teach(0, 10, "a");
  assert.ok(later.ledger().decisions.every((d) => d.observation?.setting === undefined), "answers before the teaching qualify");
});
