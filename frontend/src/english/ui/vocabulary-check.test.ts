/** Word check screens: the word and its meanings, always a way to say "I don't know", and a carefully worded result. */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHECK, SizeCheckSession } from "../logic/vocabulary/size-check.ts";
(globalThis as { React?: unknown }).React = React;
const { VocabularyIntro, VocabularyView } = await import("./VocabularyCheck.tsx");
const html = (el: React.ReactElement) => renderToStaticMarkup(el).replaceAll("&#x27;", "'");

test("VU-1 intro, both kinds of question and a result that does not read as marks", () => {
  assert.match(html(React.createElement(VocabularyIntro, { last: null, onStart() {}, onBack() {} })), /Some of the words are made up[\s\S]*everyone meets some/);
  assert.match(html(React.createElement(VocabularyIntro, { last: { band: 3 }, onStart() {}, onBack() {} })), /Last time: wider reading words \(word level 3 on a scale of 1 to 8\)[\s\S]*Check again</);
  const s = new SizeCheckSession(CHECK, 4);
  let v = s.snapshot();
  let page = html(React.createElement(VocabularyView, { check: CHECK, view: v, onAnswer() {}, onLeave() {} }));
  assert.match(page, /Question 1 of about \d+</);
  assert.match(page, /Do you know this word\?[\s\S]*Yes, I know it[\s\S]*No, I don't know it/);
  assert.ok(page.includes(`>${v.item!.word}<`) && !page.includes("is-right"));
  const known = (word: string) => (CHECK.words.find((x) => x.word === word)?.band ?? 9) <= 4;
  let fakes = 0;
  for (; v.phase === "asking" && v.item!.kind === "know"; v = s.snapshot()) {
    // says yes to the invented words too
    if (!CHECK.words.some((x) => x.word === v.item!.word)) fakes++;
    s.answer(known(v.item!.word) || !CHECK.words.some((x) => x.word === v.item!.word));
  }
  const w = CHECK.words.find((x) => x.word === v.item!.word)!;
  page = html(React.createElement(VocabularyView, { check: CHECK, view: v, onAnswer() {}, onLeave() {} }));
  assert.match(page, /Which word is closest in meaning\?/);
  assert.ok(page.includes(`>${w.word}<`) && w.options.every((o) => page.includes(`>${o}<`)));
  assert.match(page, /I don't know this word/);
  for (; v.phase === "asking"; v = s.snapshot()) {
    const x = CHECK.words.find((y) => y.word === v.item!.word)!;
    s.answer(x.band <= 4 ? x.answer : null);
  }
  page = html(React.createElement(VocabularyView, { check: CHECK, view: v, onAnswer() {}, onLeave() {} }));
  const band = v.result!.band;
  assert.ok(band === 3 || band === 4);
  assert.ok(page.includes(`Your words reach ${CHECK.bands[band - 1].label}<`));
  assert.ok(page.includes(`Word level ${band} on a scale of 1 to 8.`));
  assert.match(page, /not marks out of eight/);
  assert.ok(page.includes(`${fakes} of the ${fakes} made-up words were marked as known`));
  assert.ok(!/\d+ of \d+ (meanings )?correct/.test(page), "no score that reads as marks");
});
