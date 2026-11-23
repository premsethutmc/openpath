/** Word check screens: the word and its meanings, always a way to say "I don't know", and a carefully worded result. */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHECK, SizeCheckSession } from "../logic/vocabulary/size-check.ts";
(globalThis as { React?: unknown }).React = React;
const { VocabularyIntro, VocabularyView } = await import("./VocabularyCheck.tsx");
const html = (el: React.ReactElement) => renderToStaticMarkup(el).replaceAll("&#x27;", "'");

test("VU-1 intro, a question and the result", () => {
  assert.match(html(React.createElement(VocabularyIntro, { last: null, onStart() {}, onBack() {} })), /checks recognition/);
  assert.match(html(React.createElement(VocabularyIntro, { last: { correct: 9, answered: 15 }, onStart() {}, onBack() {} })), /Last time: 9 of 15 correct[\s\S]*Check again</);
  const s = new SizeCheckSession(CHECK, 3);
  let v = s.snapshot();
  const w = CHECK.words.find((x) => x.word === v.word!.word)!;
  let page = html(React.createElement(VocabularyView, { check: CHECK, view: v, onAnswer() {}, onLeave() {} }));
  assert.ok(page.includes(`>${w.word}<`) && w.options.every((o) => page.includes(o)));
  assert.match(page, /I don't know this word/);
  assert.match(page, /Word 1</);
  assert.ok(!page.includes("is-right"));
  for (; v.phase === "asking"; v = s.snapshot()) s.answer(CHECK.words.find((x) => x.word === v.word!.word)!.band <= 4 ? CHECK.words.find((x) => x.word === v.word!.word)!.answer : null);
  page = html(React.createElement(VocabularyView, { check: CHECK, view: v, onAnswer() {}, onLeave() {} }));
  assert.match(page, /9 of 15 meanings correct/);
  assert.match(page, /Knows words up to level 4 of 8/);
  assert.match(page, /short recognition check/);
  assert.match(page, /6 of 6 correct/);
});
