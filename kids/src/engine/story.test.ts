/**
 * Story branching and automatic continuation, played in virtual time.
 *
 * A recording Director stands in for the browser, and a SimClock replaces real
 * time, so a five-minute episode plays in milliseconds and every touch happens
 * at an exact story time.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ART } from "../art/catalogue.ts";
import { SimClock } from "./clock.ts";
import { MemorySink } from "./events.ts";
import type { Feedback, Input } from "./primitives.ts";
import { type Director, type RunResult, Runner, type WindowSpec } from "./runner.ts";
import type { Episode, Level, Step } from "./types.ts";
import { storyLength, validateEpisode } from "./validate.ts";

const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as Episode;
const appleTree = () => load("../../episodes/chintoo-apple-tree.json");
const sample = () => load("./fixtures/sample-primitives.json");

type Touch = { window: string; after: number; input: Input };

/** Records what the player would have been asked to do, and delivers scripted touches. */
class RecordingDirector implements Director {
  performed: Array<{ at: number; step: Step; ms: number }> = [];
  windows: Array<{ id: string; openedAt: number; closedAt: number | null }> = [];
  lines: string[] = [];
  fed: string[] = [];
  hints: number[] = [];
  constructor(
    private clock: SimClock,
    private touches: Touch[] = [],
  ) {}
  perform(step: Step, ms: number) {
    this.performed.push({ at: this.clock.now(), step, ms });
    if (step.do === "say") this.lines.push(step.line);
  }
  openWindow(spec: WindowSpec, input: (i: Input) => void) {
    const record = { id: spec.id, openedAt: this.clock.now(), closedAt: null as number | null };
    this.windows.push(record);
    for (const t of this.touches.filter((t) => t.window === spec.id)) this.clock.after(t.after, () => input(t.input));
    return () => {
      record.closedAt = this.clock.now();
    };
  }
  feedback(_spec: WindowSpec, fb: Feedback) {
    this.fed.push(fb.kind === "counted" ? `${fb.target}=${fb.n}` : `${fb.kind}:${fb.target}`);
  }
}

async function play(episode: Episode, opts: { level?: Level; touches?: Touch[] } = {}) {
  const clock = new SimClock();
  const director = new RecordingDirector(clock, opts.touches);
  const sink = new MemorySink();
  const runner = new Runner(episode, director, clock, { level: opts.level ?? "younger", sink });
  let result: RunResult | null = null;
  const done = runner.run().then((r) => (result = r));
  await clock.runUntilIdle();
  await done;
  assert.ok(result, "the story finished");
  return { result: result as RunResult, director, sink, clock };
}

const tap = (window: string, target: string, after = 2000): Touch => ({ window, after, input: { type: "tap", target } });

describe("Chintoo and the Apple Tree", () => {
  test("is a valid episode for the art library", () => {
    const report = validateEpisode(appleTree(), ART);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.warnings, []);
  });

  test("lasts 3–5 minutes when the child never touches anything, at both ages", () => {
    for (const level of ["younger", "older"] as const) {
      const { untouched } = storyLength(appleTree(), level);
      assert.ok(untouched >= 180_000 && untouched <= 300_000, `${level}: ${untouched} ms`);
    }
  });

  test("plays from beginning to end with no touches at all (younger)", async () => {
    const { result, director, sink } = await play(appleTree());
    assert.deepEqual(result.path, ["morning", "garden", "apple-falls", "more-apples", "count-younger", "chintoo-counts", "picnic"]);
    assert.deepEqual(result.outcomes, { "pick-apple": "timeout", "count-apples-3": "timeout" });
    assert.equal(result.stopped, false);
    // The story carried on by itself: each window closed at exactly its own timeout.
    for (const w of director.windows) assert.ok(w.closedAt !== null && w.closedAt - w.openedAt > 0);
    assert.equal(result.endedAt, storyLength(appleTree(), "younger").untouched);
    // Natural consequence: the fallen apple is muddy, then washed clean.
    assert.ok(director.lines.includes("Oh no! It fell in the mud."));
    assert.ok(director.lines.includes("Splash, splash! Now it's clean!"));
    assert.ok(director.lines.includes("Three apples!"));
    // Nothing was touched, so the only evidence is exposure.
    assert.deepEqual(
      sink.events.map((e) => [e.interaction, e.evidence, e.engaged]),
      [
        ["pick-apple", "exposure", false],
        ["count-apples-3", "exposure", false],
      ],
    );
  });

  test("plays to the end with no touches at the older level, with three and two more", async () => {
    const { result, director } = await play(appleTree(), { level: "older" });
    assert.deepEqual(result.path, ["morning", "garden", "apple-falls", "more-apples", "count-younger", "count-older", "chintoo-counts", "picnic"]);
    assert.ok(director.lines.includes("And two more!"));
    assert.ok(director.lines.includes("Three apples and two more make five!"));
    assert.ok(!director.lines.includes("Three apples!"));
    assert.equal(result.endedAt, storyLength(appleTree(), "older").untouched);
  });

  test("a tapped apple is the one the bird picks, and the line names its colour", async () => {
    const { result, director, sink } = await play(appleTree(), { touches: [tap("pick-apple", "apple-green", 3000)] });
    assert.equal(result.outcomes["pick-apple"], "tapped");
    assert.equal(result.vars.choice, "apple-green");
    assert.deepEqual(result.path.slice(0, 4), ["morning", "garden", "mina-picks", "more-apples"]);
    assert.ok(director.lines.includes("A green apple!"));
    assert.ok(director.lines.includes("A green apple for me!"));
    const fly = director.performed.find((p) => p.step.do === "act" && p.step.action === "fly" && p.step.to === "apple-green");
    assert.ok(fly, "the bird flies to the chosen apple");
    const event = sink.events.find((e) => e.interaction === "pick-apple");
    assert.equal(event?.evidence, "participation");
    assert.deepEqual(event?.touched, ["apple-green"]);
    assert.equal(event?.openFor, 3000);
  });

  test("every apple colour leads into the same story", async () => {
    for (const target of ["apple-red", "apple-green", "apple-yellow"]) {
      const { result, director } = await play(appleTree(), { touches: [tap("pick-apple", target)] });
      assert.equal(result.path.at(-1), "picnic");
      assert.ok(director.lines.some((l) => l.startsWith("A ") && l.endsWith(" apple!") && !l.includes("{")));
    }
  });

  test("counting every apple ends the window early; each apple counts once", async () => {
    const { result, director, sink } = await play(appleTree(), {
      touches: [tap("count-apples-3", "b2", 1000), tap("count-apples-3", "b2", 1500), tap("count-apples-3", "b1", 2500), tap("count-apples-3", "b3", 4000)],
    });
    assert.equal(result.outcomes["count-apples-3"], "counted");
    assert.ok(result.path.includes("counted-together"));
    assert.ok(!result.path.includes("chintoo-counts"));
    assert.deepEqual(director.fed, ["b2=1", "b1=2", "b3=3"]);
    const w = director.windows.find((x) => x.id === "count-apples-3");
    assert.equal((w?.closedAt ?? 0) - (w?.openedAt ?? 0), 4000);
    const event = sink.events.find((e) => e.interaction === "count-apples-3");
    assert.deepEqual(event?.touched, ["b2", "b1", "b3"]);
    assert.equal(event?.claimsMastery, false);
  });

  test("counting some apples and stopping: Chintoo finishes the counting himself", async () => {
    const { result, sink } = await play(appleTree(), { touches: [tap("count-apples-3", "b1", 1000), tap("count-apples-3", "b2", 2000)] });
    assert.equal(result.outcomes["count-apples-3"], "timeout");
    assert.ok(result.path.includes("chintoo-counts"));
    const event = sink.events.find((e) => e.interaction === "count-apples-3");
    assert.equal(event?.engaged, true);
    assert.equal(event?.evidence, "participation");
  });

  test("touches after a window has closed change nothing", async () => {
    const quiet = await play(appleTree());
    const late = await play(appleTree(), { touches: [tap("pick-apple", "apple-red", 999_999)] });
    assert.deepEqual(late.result.path, quiet.result.path);
    assert.equal(late.result.endedAt, quiet.result.endedAt);
  });

  test("touching something that is not a target does nothing", async () => {
    const { result } = await play(appleTree(), { touches: [tap("pick-apple", "b1", 1000)] });
    assert.equal(result.outcomes["pick-apple"], "timeout");
  });

  test("a hint plays after a pause, and only while the window is open", async () => {
    const quiet = await play(appleTree());
    const window = quiet.director.windows.find((w) => w.id === "pick-apple")!;
    const hintLine = quiet.director.performed.find((p) => p.step.do === "say" && p.step.line === "Red, green or yellow?");
    assert.ok(hintLine, "the hint played");
    assert.ok(hintLine.at >= window.openedAt + 7000 && hintLine.at < (window.closedAt ?? 0));

    const quick = await play(appleTree(), { touches: [tap("pick-apple", "apple-red", 2000)] });
    assert.ok(!quick.director.lines.includes("Red, green or yellow?"), "no hint after the child has chosen");
  });

  test("is deterministic: the same touches give the same story, step for step", async () => {
    const touches = [tap("pick-apple", "apple-yellow", 5000), tap("count-apples-3", "b3", 3000)];
    const a = await play(appleTree(), { touches });
    const b = await play(appleTree(), { touches });
    const trace = (d: RecordingDirector) => d.performed.map((p) => `${p.at}:${JSON.stringify(p.step)}`);
    assert.deepEqual(trace(a.director), trace(b.director));
  });

  test("no learning event ever claims mastery", async () => {
    for (const touches of [[], [tap("pick-apple", "apple-red"), tap("count-apples-3", "b1"), tap("count-apples-3", "b2", 2500), tap("count-apples-3", "b3", 3000)]]) {
      const { sink } = await play(appleTree(), { touches });
      assert.ok(sink.events.length > 0);
      for (const e of sink.events) {
        assert.equal(e.claimsMastery, false);
        assert.ok(e.evidence === "exposure" || e.evidence === "participation");
        assert.equal(JSON.stringify(e).match(/child|name|learner|device/i), null, "no personal data in an event");
      }
    }
  });

  test("stopping the player ends the story at once", async () => {
    const clock = new SimClock();
    const runner = new Runner(appleTree(), new RecordingDirector(clock), clock);
    const done = runner.run();
    clock.at(20_000, () => runner.stop());
    await clock.runUntilIdle();
    const result = await done;
    assert.equal(result.stopped, true);
    assert.equal(result.path.at(-1), "morning");
  });
});

describe("the format supports every learning interaction", () => {
  test("the sample episode is structurally valid", () => {
    assert.deepEqual(validateEpisode(sample()).errors, []);
  });

  test("with no touches every window times out and the story still ends", async () => {
    const { result } = await play(sample());
    assert.deepEqual(Object.values(result.outcomes), ["timeout", "timeout", "timeout", "timeout", "timeout", "timeout"]);
    assert.equal(result.path.at(-1), "rain-falls");
  });

  test("a different colour is a branch of the story, not a wrong answer", async () => {
    const { result, director } = await play(sample(), { touches: [tap("blue-ball", "ball-red")] });
    assert.equal(result.outcomes["blue-ball"], "other");
    assert.ok(director.lines.includes("Ooh, a red ball! Here is the blue one."));
    const matched = await play(sample(), { touches: [tap("blue-ball", "ball-blue")] });
    assert.ok(matched.director.lines.includes("Yes! A blue ball!"));
  });

  test("shape, animal, comparison, drag and cause-and-effect windows close on the child's action", async () => {
    const { result } = await play(sample(), {
      touches: [
        tap("find-circle", "circle"),
        tap("says-moo", "duck"),
        tap("more-food", "plate-4"),
        { window: "ball-in-box", after: 1500, input: { type: "drop", item: "ball-red", on: null } },
        { window: "ball-in-box", after: 3000, input: { type: "drop", item: "ball-red", on: "box" } },
        tap("make-rain", "cloud"),
      ],
    });
    assert.equal(result.outcomes["find-circle"], "match");
    assert.equal(result.outcomes["says-moo"], "other");
    assert.equal(result.outcomes["more-food"], "match");
    assert.equal(result.outcomes["ball-in-box"], "placed");
    assert.equal(result.outcomes["make-rain"], "triggered");
  });
});
