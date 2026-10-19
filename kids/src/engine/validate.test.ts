/** The validator catches authoring mistakes that would break the child's experience. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ART } from "../art/catalogue.ts";
import { PRIMITIVES, initialState } from "./primitives.ts";
import type { Episode } from "./types.ts";
import { validateEpisode } from "./validate.ts";

const base = () => JSON.parse(readFileSync(new URL("../../episodes/chintoo-apple-tree.json", import.meta.url), "utf8")) as Episode;
// The interaction step, loosened so tests can break it on purpose.
const find = (ep: Episode, id: string) => ep.tracks.garden.find((s) => s.do === "interact" && s.id === id) as unknown as Record<string, any>;
const errorsAfter = (change: (ep: Episode) => void) => {
  const ep = base();
  change(ep);
  return validateEpisode(ep, ART).errors.join("\n");
};

test("an interaction without a timeout branch is rejected (the story could stop)", () => {
  assert.match(errorsAfter((ep) => delete find(ep, "pick-apple").outcomes.timeout), /no track for outcome "timeout"/);
});

test("a window too short to answer without hurry is rejected", () => {
  assert.match(errorsAfter((ep) => (find(ep, "pick-apple").window = 3000)), /at least 6000 ms/);
});

test("a window that would hold the story too long is rejected", () => {
  assert.match(errorsAfter((ep) => (find(ep, "pick-apple").window = 90000)), /at most 60000 ms/);
});

test("tracks that loop are rejected, so every story ends", () => {
  assert.match(errorsAfter((ep) => ep.tracks.picnic.splice(-1, 1, { do: "goto", track: "garden" })), /tracks loop/);
});

test("a track that just stops is rejected", () => {
  assert.match(errorsAfter((ep) => ep.tracks.picnic.pop()), /ends without goto, end or an interaction/);
});

test("steps after a goto are rejected (they would never play)", () => {
  assert.match(errorsAfter((ep) => ep.tracks.morning.push({ do: "wait", ms: 10 })), /never play/);
});

test("long lines are rejected: lines stay short for young children", () => {
  assert.match(
    errorsAfter((ep) => ep.tracks.morning.splice(1, 0, { do: "say", who: "chintoo", line: "This is a very long line that goes on and on and on for far too many words" })),
    /keep lines to 14 or fewer/,
  );
});

test("names are checked: characters, props, places, art and actions", () => {
  const errors = errorsAfter((ep) => {
    ep.tracks.morning.splice(1, 0, { do: "say", who: "nobody", line: "Hi" });
    ep.tracks.morning.splice(1, 0, { do: "act", who: "mina", action: "eat" });
    ep.tracks.morning.splice(1, 0, { do: "act", who: "chintoo", action: "walk", to: "nowhere" });
    ep.props["apple-red"].variant = "blue";
  });
  assert.match(errors, /unknown character "nobody"/);
  assert.match(errors, /rig "bird" cannot "eat"/);
  assert.match(errors, /unknown place "nowhere"/);
  assert.match(errors, /has no variant "blue"/);
});

test("a remembered choice must be bound by an interaction before it is used", () => {
  assert.match(errorsAfter((ep) => delete find(ep, "pick-apple").bind), /"choice" is used but no interaction binds it/);
});

test("an interaction must list targets the primitive can judge", () => {
  const errors = errorsAfter((ep) => {
    const step = find(ep, "pick-apple");
    step.primitive = "match-shape";
    step.params = { shape: "circle" };
    step.outcomes = { match: "mina-picks", other: "mina-picks", timeout: "apple-falls" };
  });
  assert.match(errors, /needs tag "shape"/);
});

test("every primitive has a timeout outcome", () => {
  for (const p of Object.values(PRIMITIVES)) assert.ok(p.outcomes.includes("timeout"), p.name);
});

test("primitives never judge a touch as a failure: every touch is an outcome or nothing", () => {
  const targets = [
    { id: "a", tags: { colour: "red", shape: "circle", animal: "cow", quantity: 2 } },
    { id: "b", tags: { colour: "blue", shape: "square", animal: "duck", quantity: 5 } },
  ];
  const params = { colour: "red", shape: "circle", animal: "cow", want: "more", by: "quantity", zone: "box" };
  for (const p of Object.values(PRIMITIVES)) {
    for (const input of [
      { type: "tap" as const, target: "b" },
      { type: "drop" as const, item: "b", on: null },
    ]) {
      const r = p.input(initialState(targets, params), input);
      if (r.outcome) assert.ok(p.outcomes.includes(r.outcome), `${p.name} -> ${r.outcome}`);
      assert.ok(!r.outcome || !/wrong|fail|incorrect/.test(r.outcome));
    }
  }
});
