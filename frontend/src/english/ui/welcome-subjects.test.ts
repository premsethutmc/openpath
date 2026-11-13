/** subjects-home@1: the welcome screen shows one tile for each subject only in a build that carries maths. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
(globalThis as { React?: unknown }).React = React;
const { Welcome, MATHS_BUILT } = await import("./Onboarding");

const html = (maths?: boolean) => renderToStaticMarkup(React.createElement(Welcome, { accounts: false, privateWindow: false, onBegin: () => {}, onSignIn: () => {}, onDevice: () => {}, ...(maths === undefined ? {} : { maths }) }));

test("an ordinary build has English only: one button, no maths link", () => {
  assert.equal(MATHS_BUILT, false);
  const h = html();
  assert.match(h, /Let(&#x27;|')s begin/);
  assert.ok(!h.includes("/year/") && !h.includes("subject-tile"));
  assert.match(h, /Learn English through little discoveries/);
});

test("a build that carries maths shows two tiles: English begins the English app, Maths opens /year/", () => {
  const h = html(true);
  const tiles = [...h.matchAll(/<(button|a)[^>]*class="subject-tile[^"]*"[^>]*>(.*?)<\/\1>/g)];
  assert.equal(tiles.length, 2);
  assert.match(tiles[0][0], /^<button type="button"[^>]*>.*English/);
  assert.match(tiles[1][0], /^<a [^>]*href="\/year\/"[^>]*>.*Maths/);
  assert.ok(!/Let(&#x27;|')s begin/.test(h), "the tiles replace the single button");
  assert.match(h, /Choose a subject/);
});
