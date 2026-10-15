/** X1: the word-difficulty extension point exists and changes nothing (PR product/ux-integration-v1). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { NO_WORD_FEATURES, wordOf } from "../src/index.ts";
import { profileContext } from "./rule-profiles.ts";

const ctx = profileContext();

test("X1-1 every spelling item, generated or hand-written, names its word; other items name none", () => {
  const items = [...ctx.content.items.values()].filter((i) => i.kind === "code");
  const spelling = items.filter((i) => i.kind === "code" && i.target === "EN.FND.SPL.inflections" && i.format.startsWith("typed"));
  assert.ok(spelling.length > 10);
  for (const i of spelling) assert.match(wordOf(i) ?? "", /^[a-z'-]+$/, i.id);
  const gen = items.find((i) => i.kind === "code" && i.generated)!;
  assert.equal(wordOf(gen), gen.kind === "code" ? gen.generated!.word.toLowerCase() : "");
  assert.equal(wordOf(items.find((i) => i.kind === "code" && i.target.startsWith("EN.GRM"))!), undefined);
});

test("X1-2 the default source knows no word, so selection and scoring are unchanged", () => {
  assert.equal(NO_WORD_FEATURES.vectorFor("hopping"), undefined);
  assert.equal(NO_WORD_FEATURES.version, "word-features@none");
});
