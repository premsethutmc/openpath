import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  competencies,
  compose,
  diagnostic,
  evaluate,
  evidence,
  graphemes,
  items,
  normalize,
  practice,
  tamilModule,
  validate,
  type ResponseEvidence,
} from "../../../packages/tamil/src/index";
const context = (id = "response-1", learnerId = "shared-pupil") => ({
  id,
  learnerId,
  sessionId: "visit-1",
  at: "2026-10-16T12:00:00Z",
});
const find = (id: string) => items.find((i) => i.id === id)!;
test("Tamil canonical equivalence preserves pulli, vowel length and consonant identities", () => {
  assert.equal(normalize("  கொ  "), "கொ");
  assert.equal(normalize("கோ"), "கோ");
  assert.equal(normalize("கௌ"), "கௌ");
  for (const [a, b] of [
    ["க", "க்"],
    ["கி", "கீ"],
    ["கொ", "கோ"],
    ["ந", "ன"],
    ["ல", "ள"],
    ["ர", "ற"],
    ["க ல்", "கல்"],
    ["கல்.", "கல்"],
    ["க்\u200d", "க்"],
  ])
    assert.notEqual(normalize(a), normalize(b));
  assert.deepEqual(graphemes("கொடி"), ["கொ", "டி"]);
  assert.deepEqual(graphemes("கல்"), ["க", "ல்"]);
  assert.deepEqual(graphemes(" க் "), [" ", "க்", " "]);
  assert.equal(graphemes("கொ").length, 1);
});
test("all 216 native consonant-vowel compositions use logical Unicode order", () => {
  for (const c of "கஙசஞடணதநபமயரலவழளறன")
    for (const v of [
      "அ",
      "ஆ",
      "இ",
      "ஈ",
      "உ",
      "ஊ",
      "எ",
      "ஏ",
      "ஐ",
      "ஒ",
      "ஓ",
      "ஔ",
    ]) {
      const answer = compose(c + "்", v);
      assert.equal(graphemes(answer).length, 1);
      assert.ok(answer.startsWith(c));
      assert.ok(!answer.includes("்"));
    }
  assert.equal(compose("க்", "ஒ"), "கொ");
  assert.equal(compose("ம்", "ஔ"), "மௌ");
  assert.throws(() => compose("க", "அ"));
  assert.throws(() => compose("க்", "x"));
});
test("versioned sparse graph, content and activity contracts are internally consistent", () => {
  assert.equal(tamilModule.contract, "provisional-language-module.v1");
  assert.deepEqual(validate(), []);
  assert.equal(competencies.length, 22);
  assert.equal(items.length, 144);
  assert.equal(activities.length, 8);
  assert.equal(items.filter((i) => i.stage === "guided").length, 8);
  for (const i of items) {
    assert.equal(i.review, "provisional");
    assert.equal(i.provenance.educatorReviewed, false);
    assert.equal(i.difficulty.calibrated, false);
    assert.ok(i.provenance.method);
  }
  for (const c of competencies.filter((c) => c.status === "pilot")) {
    assert.ok(activities.some((a) => a.competency === c.id));
    assert.ok(
      items.some((i) => i.competencies.includes(c.id) && i.stage === "guided"),
    );
    assert.ok(
      items.some(
        (i) => i.competencies.includes(c.id) && i.stage === "independent",
      ),
    );
    if (c.id !== "TA.aytham")
      assert.ok(items.some((i) => i.competencies.includes(c.id) && i.transfer));
  }
  const bad = structuredClone(competencies);
  bad[2].requires = ["TA.missing"];
  assert.ok(validate(bad).some((e) => e.includes("Unknown")));
  const cycle = structuredClone(competencies);
  cycle[2].requires = [cycle[2].id];
  assert.ok(validate(cycle).some((e) => e.includes("Cycle")));
  const badItem = structuredClone(items[0]);
  badItem.competencies = ["TA.fake"];
  assert.ok(validate(competencies, [badItem]).length);
});
test("all answer keys score correctly and composition keys follow the Tamil rules", () => {
  for (const i of items) {
    for (const answer of i.answers) {
      assert.equal(evaluate(i, answer).correct, true, i.id);
      assert.equal(
        evaluate(i, " " + answer.normalize("NFD") + " ").correct,
        true,
        i.id,
      );
    }
    assert.equal(evaluate(i, "").correct, false);
    assert.equal(evaluate(i, "not Tamil").correct, false);
    if (i.id.startsWith("ta.join.")) {
      const [mei, vowel] = i.prompt.split(" = ")[0].split(" + ");
      assert.equal(i.answers[0], compose(mei, vowel));
    }
  }
});
test("wrong answer tags are observations, unknown mistakes are not invented diagnoses", () => {
  for (const i of items)
    for (const [wrong, tag] of Object.entries(i.wrong)) {
      const result = evaluate(i, wrong);
      assert.equal(result.correct, false);
      assert.deepEqual(result.misconceptions, [tag], i.id);
    }
  assert.deepEqual(evaluate(find("ta.join.க.2"), "கீ").misconceptions, [
    "TA.short-long",
  ]);
  assert.deepEqual(evaluate(find("ta.join.க.2"), "க்ி").misconceptions, [
    "TA.vowel-sign",
  ]);
  assert.deepEqual(evaluate(find("ta.mei.make.0"), "க").misconceptions, [
    "TA.missing-pulli",
  ]);
  assert.deepEqual(evaluate(find("ta.mei.rec.0"), "அ").misconceptions, [
    "TA.consonant-confusion",
  ]);
  assert.deepEqual(evaluate(find("ta.word.make.0"), "மறம்").misconceptions, [
    "TA.word-spelling",
  ]);
  for (const unknown of ["random", "constructor", "__proto__"]) {
    assert.deepEqual(evaluate(items[0], unknown).misconceptions, []);
  }
});
test("provisional, hinted, revealed, guided, repeated and family evidence cannot prove understanding", () => {
  const i = find("ta.join.ப.0");
  let history: ResponseEvidence[] = [];
  const fresh = evidence(i, "ப", context(), history);
  assert.equal(fresh.transfer, true);
  assert.equal(fresh.production, true);
  assert.equal(fresh.independenceCandidate, true);
  assert.equal(fresh.eligibleForInference, false);
  history = [fresh];
  const repeat = evidence(i, "ப", context("response-2"), history);
  assert.equal(repeat.exposure, "repeat");
  assert.equal(repeat.independenceCandidate, false);
  assert.equal(repeat.transfer, false);
  for (const support of [{ hint: true }, { revealed: true }])
    assert.equal(
      evidence(i, "ப", { ...context(), ...support }, []).independenceCandidate,
      false,
    );
  const guided = items.find((i) => i.stage === "guided")!;
  assert.equal(
    evidence(guided, guided.answers[0], context(), []).independenceCandidate,
    false,
  );
  const rec = find("ta.mei.rec.0");
  const production = find("ta.mei.make.0");
  const r = evidence(rec, "க்", context(), []);
  assert.equal(r.production, false);
  assert.equal(
    evidence(production, "க்", context("2"), [r]).exposure,
    "family",
  );
  assert.equal(
    evidence(
      i,
      "ப",
      {
        ...context(),
        priorPresentations: [{ itemId: i.id, family: i.family }],
      },
      [],
    ).exposure,
    "repeat",
  );
  assert.equal(
    evidence(i, "ப", context("response-3", "other-pupil"), history).exposure,
    "fresh",
  );
  assert.throws(() => evidence(i, "ப", context(), history), /Duplicate/);
  assert.throws(() => evidence(i, "ப", { ...context(), at: "bad" }, []));
});
test("bounded practice reserves different families and does not manufacture aytham transfer", () => {
  for (const d of diagnostic) {
    const e = evidence(d, d.answers[0], context(), []);
    const plan = practice(d.competencies[0], [e]);
    assert.ok(plan.some((i) => i.stage === "guided"));
    const transfer = plan.find((i) => i.transfer);
    assert.ok(transfer);
    assert.notEqual(transfer.family, d.family);
    const independent = plan.find((i) => i.stage === "independent");
    assert.notEqual(transfer.family, independent?.family);
  }
  assert.equal(
    practice("TA.aytham", []).some((i) => i.transfer),
    false,
  );
});
