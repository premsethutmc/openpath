/** The AI feedback panel, rendered without a browser: what a learner sees in each state. */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiFeedback } from "./Guided.tsx";
import { GUIDED } from "../logic/guided/guided.ts";
import type { FeedbackService } from "../logic/writing/feedback.ts";

const task = GUIDED.tasks.find((t) => t.id === "c1.rw8.w1")!;
const service: FeedbackService = { status: async () => ({ available: false, consent: false, limit: 3, left: 3 }), agree: async () => {}, ask: async () => { throw new Error("not called"); } };

test("AF-1 nothing about AI is shown until the server says feedback is switched on", () => {
  // effects do not run in a static render, so this is the state before any answer: the same as switched off
  assert.equal(renderToStaticMarkup(createElement(AiFeedback, { task, text: "My family.", check: null, service })), "");
});
