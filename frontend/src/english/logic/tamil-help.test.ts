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
