import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAddrRef,
  buildAdditionSpec,
  gradeAddition,
} from "./addition";
import { RENDER_SCHEMA_VERSION } from "../types";

describe("parseAddrRef", () => {
  it("parses valid gen:addr reference", () => {
    const params = parseAddrRef("gen:addr:37,59");
    assert.deepStrictEqual(params, { a: 37, b: 59 });
  });

  it("parses single-digit numbers", () => {
    const params = parseAddrRef("gen:addr:3,7");
    assert.deepStrictEqual(params, { a: 3, b: 7 });
  });

  it("parses three-digit numbers", () => {
    const params = parseAddrRef("gen:addr:123,456");
    assert.deepStrictEqual(params, { a: 123, b: 456 });
  });

  it("rejects invalid format", () => {
    assert.strictEqual(parseAddrRef("gen:fadd:1,1,3,1"), null);
    assert.strictEqual(parseAddrRef("invalid"), null);
    assert.strictEqual(parseAddrRef("gen:addr:abc,def"), null);
  });
});

describe("buildAdditionSpec", () => {
  it("produces a valid spec for minimal mode", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "minimal",
      locale: "en",
    });

    assert.strictEqual(spec.schemaVersion, RENDER_SCHEMA_VERSION);
    assert.strictEqual(spec.mode, "minimal");
    assert.strictEqual(spec.locale, "en");
    assert.strictEqual(spec.question.expression.plain, "37 + 59");
    assert.strictEqual(spec.question.generatorRef, "gen:addr:37,59");
    assert.strictEqual(spec.input.type, "numeric");
    assert.strictEqual(spec.feedback.level, "none");
    assert.strictEqual(spec.hints.available, true);
    assert.strictEqual(spec.hints.totalLevels, 3);

    // Minimal mode: no visual or working panels
    assert.strictEqual(spec.visual, undefined);
    assert.strictEqual(spec.working, undefined);
  });

  it("produces a valid spec for guided mode", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
    });

    assert.strictEqual(spec.mode, "guided");
    assert.ok(spec.visual, "guided mode should have a visual model");
    assert.strictEqual(spec.visual!.type, "place-value");
    assert.ok(spec.working, "guided mode should have working steps");
    assert.ok(spec.working!.steps.length > 0, "should have at least one working step");
    assert.strictEqual(spec.working!.revealedCount, 0); // guided: none revealed initially
  });

  it("produces a valid spec for visual-interactive mode", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "visual-interactive",
      locale: "ta",
    });

    assert.strictEqual(spec.mode, "visual-interactive");
    assert.strictEqual(spec.locale, "ta");
    assert.ok(spec.visual);
    assert.strictEqual(spec.visual!.interactive, true);
    assert.ok(spec.working);
    assert.strictEqual(spec.working!.revealedCount, 1); // visual-interactive: first step revealed
  });

  it("same questionId across modes", () => {
    const minimal = buildAdditionSpec({ params: { a: 37, b: 59 }, mode: "minimal", locale: "en" });
    const guided = buildAdditionSpec({ params: { a: 37, b: 59 }, mode: "guided", locale: "en" });
    const visual = buildAdditionSpec({ params: { a: 37, b: 59 }, mode: "visual-interactive", locale: "en" });

    assert.strictEqual(minimal.question.questionId, guided.question.questionId);
    assert.strictEqual(guided.question.questionId, visual.question.questionId);
  });

  it("includes progress when specified", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "minimal",
      locale: "en",
      questionNumber: 3,
      totalQuestions: 5,
    });

    assert.ok(spec.progress);
    assert.strictEqual(spec.progress!.current, 3);
    assert.strictEqual(spec.progress!.total, 5);
    assert.strictEqual(spec.progress!.items.length, 5);
  });

  it("applies hint level", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
      hintLevel: 2,
    });

    assert.strictEqual(spec.hints.currentLevel, 2);
  });

  it("applies custom feedback", () => {
    const fb = { level: "correct" as const, message: "Well done!", verified: true };
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "minimal",
      locale: "en",
      feedback: fb,
    });

    assert.strictEqual(spec.feedback.level, "correct");
    assert.strictEqual(spec.feedback.message, "Well done!");
  });

  it("builds working steps with carry for 37+59", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
    });

    const steps = spec.working!.steps;
    // 7+9=16 → carry
    assert.ok(steps.some((s) => s.id === "step-ones"), "should have ones step");
    assert.ok(steps.some((s) => s.id === "step-carry"), "should have carry step (7+9=16)");
    assert.ok(steps.some((s) => s.id === "step-tens"), "should have tens step");
    assert.ok(steps.some((s) => s.id === "step-result"), "should have result step");

    // All steps should be verified
    for (const step of steps) {
      assert.strictEqual(step.verified, true, `step ${step.id} should be verified`);
    }
  });

  it("no carry step for 21+13", () => {
    const spec = buildAdditionSpec({
      params: { a: 21, b: 13 },
      mode: "guided",
      locale: "en",
    });

    const steps = spec.working!.steps;
    assert.ok(!steps.some((s) => s.id === "step-carry"), "should NOT have carry step (1+3=4)");
  });
});

describe("gradeAddition", () => {
  it("marks correct answer", () => {
    const fb = gradeAddition(37, 59, "96");
    assert.strictEqual(fb.level, "correct");
    assert.strictEqual(fb.verified, true);
  });

  it("marks incorrect answer", () => {
    const fb = gradeAddition(37, 59, "86");
    assert.strictEqual(fb.level, "incorrect");
    assert.strictEqual(fb.verified, true);
  });

  it("handles non-numeric input", () => {
    const fb = gradeAddition(37, 59, "abc");
    assert.strictEqual(fb.level, "incorrect");
  });

  it("handles empty input", () => {
    const fb = gradeAddition(37, 59, "");
    assert.strictEqual(fb.level, "incorrect");
  });

  it("handles large numbers", () => {
    const fb = gradeAddition(999, 1, "1000");
    assert.strictEqual(fb.level, "correct");
  });
});

describe("rendering contract invariants", () => {
  it("renderer cannot mark mastery — no mastery field in spec", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
    });

    // The spec should not contain any mastery/status fields
    assert.strictEqual("mastery" in spec, false);
    assert.strictEqual("status" in spec, false);
    assert.strictEqual("outcome" in spec, false);
  });

  it("unverified feedback is marked as such", () => {
    const fb = { level: "incorrect" as const, message: "Wrong", verified: false };
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
      feedback: fb,
    });

    assert.strictEqual(spec.feedback.verified, false);
  });

  it("hints that reveal the answer are marked", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "guided",
      locale: "en",
      hintLevel: 3,
    });

    const revealingHints = spec.hints.hints.filter((h) => h.revealsAnswer);
    assert.ok(revealingHints.length > 0, "at least one hint should be marked as revealing");
    assert.strictEqual(revealingHints[0].level, 3);
  });

  it("accessibility metadata is always present", () => {
    const spec = buildAdditionSpec({
      params: { a: 37, b: 59 },
      mode: "minimal",
      locale: "en",
    });

    assert.ok(spec.a11y.questionLabel, "questionLabel must be set");
    assert.ok(spec.a11y.questionLabel.includes("37"), "questionLabel should mention the numbers");
  });
});
