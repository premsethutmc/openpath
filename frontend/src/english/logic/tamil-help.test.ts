import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import data from "../../../../content/english/help/tamil-ui.json";

test("TH-1 every Tamil line is Tamil script and answers an English line the app really shows", () => {
  const dir = new URL("../ui/", import.meta.url);
  const source = readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n").replace(/\s+/g, " ");
  const strings = (data as { strings: Record<string, string> }).strings;
  assert.ok(Object.keys(strings).length >= 150);
  for (const [en, ta] of Object.entries(strings)) {
    assert.match(ta, /[஀-௿]/, `${en}: Tamil script`);
    assert.ok(source.includes(en.replace(/\s+/g, " ")), `not shown in the app: ${en}`);
  }
});

test("TH-2 grammar explanations in Tamil: each answers a rule, card rule or card reason in the grammar content", async () => {
  const explain = (await import("../../../../content/english/help/tamil-explain.json")).default as { strings: Record<string, string> };
  const g = (await import("../../../../content/english/grammar/in-use.json")).default as { items: { rule: string }[] };
  const l = (await import("../../../../content/english/grammar/learn.json")).default as { cards: { rule: string; mistake: { why: string } }[] };
  const known = new Set([...g.items.map((i) => i.rule), ...l.cards.flatMap((c) => [c.rule, c.mistake.why])]);
  assert.ok(Object.keys(explain.strings).length >= 400);
  for (const [en, ta] of Object.entries(explain.strings)) {
    assert.ok(known.has(en), `not a grammar explanation: ${en}`);
    assert.match(ta, /[\u0B80-\u0BFF]/, en);
  }
});
