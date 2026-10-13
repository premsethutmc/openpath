/**
 * Web app (W1): generated spelling items enter through the same ledger and update as every other item,
 * but an answer to a generated item changes no estimate until a person has checked the item
 * (decision 3 of 12 October 2026). Evidence records why it was collected (decision 8).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { type CodeItem, type EvidenceEvent, type Item, Ledger, indexContent, leafView, validateContent } from "../src/index.ts";
import { CONTENT, loadBundle, loadContext, viewFor } from "../../../tools/english/load.ts";
import { generate, type WordBank } from "../../../tools/english/spelling/generate.ts";

type Code = Extract<Item, { kind: "code" }>;
const base = loadContext();
const generated = JSON.parse(readFileSync(join(CONTENT, "spelling", "generated-items.json"), "utf8")) as Code[];
const bank = JSON.parse(readFileSync(join(CONTENT, "spelling", "wordbank.json"), "utf8")) as WordBank;
const content = indexContent(viewFor({ ...loadBundle(), items: [...loadBundle().items, ...generated] }, base.index), base.index);
const ctx = { ...base, content };
const at = "2026-10-12T10:00:00.000Z";
const ev = (id: string, item: Code, text: string, use?: EvidenceEvent["use"]): EvidenceEvent => ({ kind: "evidence", id, at, session: "s1", item: { id: item.id, version: item.version }, response: item.format.startsWith("choice") ? { kind: "choice", choice: Number(text) } : { kind: "typed", text }, ...(use ? { use } : {}) });

test("the committed generated items are exactly what the generator makes from the committed word bank", () => {
  const fresh = generate(bank);
  assert.equal(fresh.length, generated.length);
  for (let i = 0; i < fresh.length; i++) assert.deepEqual({ ...fresh[i], version: 0 }, { ...generated[i], version: 0 }, fresh[i].id);
});

test("every generated item is valid content, names its sources, and says its difficulty is a feature estimate", () => {
  assert.ok(generated.length > 1000);
  assert.deepEqual(validateContent({ items: generated, passages: [], goals: [], misspellings: {} }, base.index), []);
  const sourceIds = new Set(bank.sources.map((s) => s.id));
  for (const g of generated) {
    assert.equal(g.difficulty_source, "feature_estimate", g.id);
    assert.ok(g.generated && g.generated.sources.every((s) => sourceIds.has(s)), g.id);
    assert.equal(g.generated!.checked, undefined, `${g.id} is unchecked`);
    assert.ok(g.target.startsWith("EN.FND.SPL."), g.id);
    if (g.format.startsWith("choice")) {
      assert.equal(g.options![g.answer!], g.generated!.word, `${g.id}: the keyed option is the word`);
      assert.equal(new Set(g.options).size, g.options!.length, `${g.id}: options are distinct`);
    } else assert.equal(g.answers![0], g.generated!.word, g.id);
  }
});

test("a hand-written item may not claim a feature-based difficulty", () => {
  const hand = base.content.items.get("spl.infl.07") as Code;
  const problems = validateContent({ items: [{ ...hand, difficulty_source: "feature_estimate" } as Item], passages: [], goals: [], misspellings: {} }, base.index);
  assert.ok(problems.some((p) => p.includes("no generation record")));
});

test("an answer to an unchecked generated item is kept, scored and counted as seen, but changes no estimate", () => {
  const item = generated.find((g) => g.generated!.template === "add_ending" && g.target === "EN.FND.SPL.inflections")!;
  const l = new Ledger(ctx, "x");
  const before = structuredClone(l.composite);
  const [d] = l.apply(ev("e1", item, item.answers![0], "practice"));
  assert.equal(d.verdict, "held");
  assert.match(d.reasons[0], /not yet checked by a person/);
  assert.equal(d.observation!.value, 1);
  assert.equal(d.observation!.use, "practice");
  assert.equal(d.before, undefined);
  assert.deepEqual(l.composite.nodes[item.target], before.nodes[item.target], "the estimate is untouched");
  assert.ok(l.exposures.has(item.id), "the item now counts as seen");
  // a wrong answer is tagged with the misconception the misspelling shows, still without an update
  const wrongItem = generated.find((g) => g.generated!.template === "add_ending" && Object.keys(g.wrong ?? {}).length)!;
  const [w] = l.apply(ev("e2", wrongItem, Object.keys(wrongItem.wrong!)[0]));
  assert.equal(w.observation!.value, 0);
  assert.deepEqual(w.observation!.misconceptions, [Object.values(wrongItem.wrong!)[0]]);
  assert.deepEqual(l.composite.nodes[wrongItem.target].direct, before.nodes[wrongItem.target].direct);
});

test("once a person has checked a generated item, its answers update the estimate exactly as a hand-written item of the same difficulty would", () => {
  const g = generated.find((x) => x.generated!.template === "add_ending" && x.target === "EN.FND.SPL.inflections")!;
  const checked: Code = { ...g, generated: { ...g.generated!, checked: { by: "reviewer-1", date: "2026-10-12" } } };
  const hand: Code = { ...g, id: "hand.equivalent", family: undefined, generated: undefined, difficulty_source: "expert_estimate" };
  const run = (item: Code) => {
    const c = indexContent({ items: [item], passages: [], goals: [], misspellings: {} }, base.index);
    const l = new Ledger({ ...base, content: c }, "x");
    const [d] = l.apply(ev("e1", item, item.answers![0], "assessment"));
    return { d, node: l.composite.nodes[item.target] };
  };
  const a = run(checked);
  const b = run(hand);
  assert.equal(a.d.verdict, "accepted");
  assert.deepEqual(a.d.after, b.d.after);
  assert.deepEqual(a.node.direct, b.node.direct);
  assert.equal(a.d.observation!.use, "assessment");
});

test("evidence without a recorded use behaves exactly as before (E1–E3a histories are unchanged)", () => {
  const item = base.content.items.get("spl.infl.01") as Code;
  const l1 = new Ledger(base, "x");
  const l2 = new Ledger(base, "x");
  const [d1] = l1.apply(ev("e1", item, "playing"));
  const [d2] = l2.apply(ev("e1", item, "playing", "assessment"));
  assert.equal(d1.observation!.use, undefined);
  assert.deepEqual(d1.after, d2.after);
  assert.deepEqual(leafView(l1.composite, base.index, item.target, at).direct, leafView(l2.composite, base.index, item.target, at).direct);
});

test("no generated item reuses a hand-written id, and dictation is never used for words that sound like another word", () => {
  for (const g of generated) assert.ok(!base.content.items.has(g.id), g.id);
  const soundsLike = new Map(bank.entries.map((e) => [e.word, e.sounds_like]));
  for (const g of generated.filter((x) => x.generated!.template === "hear_spell")) {
    assert.equal(g.speak, g.generated!.word);
    assert.deepEqual(soundsLike.get(g.generated!.word), [], g.id);
  }
});

// keep the type import used
export type { CodeItem };
