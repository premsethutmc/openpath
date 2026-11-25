/**
 * step-scene@1 in the child build's lesson: a worked question with step help is worked by the child ("Work it with me",
 * WorkedByYou), and for Class 1–5 adding and taking away "Break it down" opens the counter and the lift above those steps.
 * Also: Start here's own steps keep their written reasons ("Why?") from Class 4 only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { modules } from "../../../packages/learning/src/content";
import { stepsHelp } from "../../../packages/learning/src/step-help";
import { liftFor } from "../../../packages/learning/src/step-scenes";
import { foundationsOf } from "../../../packages/learning/src/foundations";
import { classOfQuestion } from "./StepCoach";

// the test runner may compile .tsx with the classic JSX transform (React.createElement); give it the same React
(globalThis as { React?: unknown }).React = React;
const { LiftHelp, FoundationCard } = await import("./StartHere");
const { ScenePlayer } = await import("./Scene");

/** The worked questions of a skill's lessons that the child build gives to the child to work (Learn.tsx's `byYou`). */
const workedByChild = (competency: string) => modules.filter((m) => m.competency === competency).flatMap((m) => m.strategies.flatMap((s) => s.screens)).filter((x) => x.instance && x.math && stepsHelp(x.instance)).map((x) => x.instance!);

test("step-scene@1: a Class 1 adding lesson worked by the child offers the lift, and it is drawn (not 'not available')", () => {
  for (const competency of ["MATH.number.addition", "MATH.number.subtraction"]) {
    const qs = workedByChild(competency);
    assert.ok(qs.length > 0, `${competency}: the lesson has a worked question the child works`);
    const withLift = qs.filter((q) => liftFor(q, classOfQuestion(q)));
    assert.ok(withLift.length > 0, `${competency}: one of them gets the lift`);
    const q = withLift[0];
    if (competency === "MATH.number.addition") assert.equal(classOfQuestion(q), 1);
    const html = renderToStaticMarkup(createElement(LiftHelp, { qid: q }));
    assert.match(html, /data-lift-help/);
    assert.match(html, /Break it down/);
    const scene = renderToStaticMarkup(createElement(ScenePlayer, { scene: liftFor(q, classOfQuestion(q))! }));
    assert.match(scene, /data-scene="tally"/);
    assert.doesNotMatch(scene, /not available/);
  }
  // Class 6 and up: not here (the written reasons stay theirs)
  const neg = workedByChild("MATH.number.integers").find((q) => (classOfQuestion(q) ?? 0) >= 6);
  if (neg) assert.equal(renderToStaticMarkup(createElement(LiftHelp, { qid: neg })), "");
});

test("step-scene@1: Start here steps show no written reasons for Class 1–3, and keep them from Class 4", () => {
  const screen = { title: "Add", text: ["Put them together."], steps: [{ do: "Count on", lines: ["2 + 1 = 3"], why: ["One more."] }] } as Parameters<typeof FoundationCard>[0]["s"];
  for (const cls of [1, 3]) {
    const html = renderToStaticMarkup(createElement(FoundationCard, { s: screen, cls }));
    assert.match(html, /Count on/);
    assert.doesNotMatch(html, /Why\?|Break it down/, `Class ${cls}`);
  }
  for (const cls of [4, 5, undefined]) assert.match(renderToStaticMarkup(createElement(FoundationCard, { s: screen, cls })), /Why\?/);
  // a real Class 1 entry with steps
  const one = ["MATH.number.addition", "MATH.number.subtraction"].flatMap((c) => foundationsOf(c)).find((f) => f.class <= 3 && f.screens.some((s) => s.steps?.length));
  if (one) for (const s of one.screens) assert.doesNotMatch(renderToStaticMarkup(createElement(FoundationCard, { s, cls: one.class })), /Why\?/);
});
