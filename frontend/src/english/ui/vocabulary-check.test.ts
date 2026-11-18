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
  assert.match(html(React.createElement(VocabularyIntro, { last: null, onStart() {}, onBack() {} })), /guessing makes the result worse/);
  assert.match(html(React.createElement(VocabularyIntro, { last: { estimate: 4500, low: 4000, high: 5000 }, onStart() {}, onBack() {} })), /Last time: about 4,500 word families[\s\S]*Check again</);
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
  assert.match(page, /About 4,000 word families/);
  assert.match(page, /Most likely between 3,500 and 4,500/);
  assert.match(page, /rough first estimate from 15 words/);
  assert.match(page, /6 of 6 known/);
});
