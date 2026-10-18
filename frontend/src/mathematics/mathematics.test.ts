import test from "node:test";
import assert from "node:assert/strict";
import {
  competencies,
  examTracks,
  validateGraph,
  coverage,
} from "../../../packages/mathematics/src/curriculum";
import {
  families,
  generate,
  generateBatch,
  evaluate,
  type Family,
} from "../../../packages/mathematics/src/generator";
import {
  sameNumber,
  polynomial,
  checkAnswer,
} from "../../../packages/mathematics/src/answers";
import {
  programFor,
  startProgram,
  updateProgram,
  programKey,
  completion,
} from "../../../packages/mathematics/src/program";
import { candidateResponse } from "../../../packages/mathematics/src/adapter";
test("200 competencies across every grade and required strands have a valid DAG", () => {
  assert.deepEqual(validateGraph(), []);
  assert.equal(coverage().total, 200);
  for (const s of [
    "number",
    "algebra",
    "geometry",
    "measurement",
    "statistics",
    "probability",
    "coordinate",
    "trigonometry",
    "calculus",
    "vectors",
    "reasoning",
  ])
    assert.ok(coverage().strand[s]);
  for (const c of competencies) {
    assert.equal(c.version, "1.0.0");
    assert.ok(c.lessonProgram);
    assert.ok(c.objectives.length);
    assert.equal(c.curriculumMappings[0].status, "provisional");
    assert.equal(c.curriculumMappings[1].status, "unmapped");
    for (const p of c.prerequisites)
      assert.ok(
        competencies.find((x) => x.id === p)!.gradeRange[0] <= c.gradeRange[0],
      );
  }
});
test("graph validator rejects missing references cycles duplicate IDs and unjustified roots", () => {
  const a = structuredClone(competencies);
  a[0].prerequisites = ["unknown"];
  assert.match(validateGraph(a).join(), /Missing/);
  a[0].prerequisites = [a[1].id];
  a[1].prerequisites = [a[0].id];
  assert.match(validateGraph(a).join(), /Cycle/);
  assert.match(
    validateGraph([...competencies, competencies[0]]).join(),
    /Duplicate/,
  );
  const b = structuredClone(competencies);
  b[0].rootJustification = null;
  assert.match(validateGraph(b).join(), /Unjustified/);
});
test("all family and exam mappings resolve and programs preserve versioned references", () => {
  for (const [family, definition] of Object.entries(families)) {
    const c = competencies.find((c) => c.id === definition.competency)!;
    assert.ok(c);
    assert.ok((c.questionFamilies as string[]).includes(family));
    assert.equal(
      c.lessonProgram,
      `${programFor(c).id}@${programFor(c).version}`,
    );
  }
  for (const track of examTracks) {
    assert.equal(track.timedTestEnabled, false);
    assert.equal(track.scoringRules, null);
    assert.equal(track.timingRules, null);
    assert.equal(track.source.verification, "blocked-403");
    for (const m of track.syllabusMapping)
      assert.ok(competencies.some((c) => c.id === m.competencyId));
    for (const f of track.questionFamilies)
      assert.ok(Object.hasOwn(families, f));
  }
});
test("exact numeric normalization preserves signs and rejects undefined/ambiguous notation", () => {
  for (const [a, b] of [
    ["1/2", "0.5"],
    ["-0.5", "-1/2"],
    ["2/-4", "-0.5"],
    ["−3", "-3"],
    ["+2", "2"],
  ])
    assert.ok(sameNumber(a, b));
  for (const [a, b] of [
    ["-1", "1"],
    ["1/0", "1"],
    ["1,000", "1000"],
    ["1e2", "100"],
    ["NaN", "0"],
    ["", "0"],
  ])
    assert.equal(sameNumber(a, b), false);
});
test("bounded polynomial equivalence is exact and rejects unsupported variable division", () => {
  assert.equal(polynomial("2(x + 3) + 4x"), polynomial("6*x+6"));
  assert.equal(polynomial("(x+1)^2"), polynomial("x²+2x+1"));
  assert.equal(polynomial("-x^2"), polynomial("0-x*x"));
  assert.equal(polynomial("x/2 + x/2"), polynomial("x"));
  assert.notEqual(polynomial("x+1"), polynomial("x-1"));
  for (const s of ["1/x", "x^7", "sin(x)", "process.exit()", "x/(x-x)", "x/0"])
    assert.throws(() => polynomial(s));
  assert.equal(checkAnswer({ kind: "set", value: "2,3" }, "3,2").correct, true);
  assert.equal(
    checkAnswer({ kind: "set", value: "2,3" }, "2,2,3").correct,
    false,
  );
});
// Independent formulas below are intentionally not just generate -> compare its own answer.
for (const family of Object.keys(families) as Family[])
  test(`${family}: 512 reproducible seeds satisfy independent mathematical invariants`, () => {
    for (let seed = 1; seed <= 512; seed++) {
      const item = generate(family, seed);
      assert.deepEqual(item, generate(family, seed));
      assert.equal(evaluate(item, item.answer.value).correct, true);
      assert.equal(item.provenance.official, false);
      assert.equal(item.validation.educational, "provisional");
      assert.equal(evaluate(item, item.answer.value).evidenceEligible, false);
      const p = item.difficulty.parameters;
      let expected: string | undefined;
      switch (family) {
        case "arithmetic":
          expected = String(p.x + p.y);
          break;
        case "fractions":
          expected = String(p.c * p.a);
          assert.equal(Number(item.answer.value) * p.b, p.c * p.b * p.a);
          break;
        case "percent":
          assert.equal(Number(item.answer.value) * 100, p.a * 100 * p.b);
          break;
        case "linear":
          assert.equal(p.b * Number(item.answer.value) + p.c, p.b * p.a + p.c);
          break;
        case "polynomial":
          assert.equal(
            polynomial(item.answer.value),
            polynomial(`${p.b}*(x+${p.c})+${p.a}*x`),
          );
          break;
        case "quadratic-numerical":
          assert.equal(Number(item.answer.value), p.s);
          assert.equal(p.s * p.s - (p.r + p.s) * p.s + p.r * p.s, 0);
          break;
        case "quadratic": {
          const roots = item.answer.value.split(",").map(Number);
          assert.equal(new Set(roots).size, 2);
          for (const x of roots)
            assert.equal(x * x - (p.r + p.s) * x + p.r * p.s, 0);
          break;
        }
        case "geometry":
          expected = String(p.a * p.b);
          break;
        case "trigonometry":
          assert.equal(Math.hypot(3 * p.scale, 4 * p.scale), 5 * p.scale);
          expected = "3/5";
          break;
        case "coordinate":
          assert.equal(
            Number(item.options!["ABCD".indexOf(item.answer.value)]),
            Math.hypot(3 * p.k, 4 * p.k),
          );
          assert.equal(new Set(item.options).size, 4);
          break;
        case "probability":
          assert.ok(sameNumber(item.answer.value, `${p.a}/${p.a + p.b}`));
          assert.ok(p.a > 0 && p.b > 0);
          break;
        case "calculus-numerical":
          expected = String(p.coefficient * p.power * p.at ** (p.power - 1));
          break;
        case "calculus":
          expected = `${p.coefficient * p.power}*x^${p.power - 1}`;
          assert.equal(polynomial(item.answer.value), polynomial(expected));
          expected = undefined;
          break;
        case "comparison":
          expected =
            p.a * p.d === p.c * p.b ? "C" : p.a * p.d > p.c * p.b ? "A" : "B";
          break;
      }
      if (expected !== undefined)
        assert.ok(
          item.answer.kind === "choice"
            ? item.answer.value === expected
            : sameNumber(item.answer.value, expected),
          `seed=${seed}`,
        );
    }
  });
test("seed and batch validation, uniqueness and exhaustion fail closed", () => {
  assert.throws(() => generate("arithmetic", -1));
  assert.throws(() => generate("arithmetic", 1.1));
  const batch = generateBatch("arithmetic", 1, 40);
  assert.equal(new Set(batch.map((x) => x.id)).size, 40);
  assert.equal(new Set(batch.map((x) => x.fingerprint)).size, 40);
  const seen = new Set(batch.map((x) => x.fingerprint));
  const more = generateBatch("arithmetic", 1, 20, seen);
  assert.ok(more.every((x) => !seen.has(x.fingerprint)));
  assert.throws(() => generateBatch("trigonometry", 1, 13), /exhausted/);
});
test("fixed program resumes through JSON persistence without inferring proficiency", () => {
  const def = programFor(
    competencies.find((c) => c.id === families.linear.competency)!,
  );
  let r = startProgram("same-learner", "school", def);
  const before = JSON.stringify(def);
  r = updateProgram(def, r, { kind: "complete", stage: "concept" });
  r = JSON.parse(JSON.stringify(r));
  assert.equal(r.current, "worked");
  assert.equal(completion(def, r), 14);
  r = updateProgram(def, r, { kind: "complete", stage: "worked" });
  assert.throws(
    () => updateProgram(def, r, { kind: "complete", stage: "guided" }),
    /attempt/,
  );
  const item = generate("linear", 12),
    receipt = {
      id: "r1",
      itemId: item.id,
      familyId: item.familyId,
      seed: item.seed,
      stage: "guided" as const,
      at: "2026-10-18T10:00:00Z",
      response: item.answer.value,
      correct: true,
      hints: 1,
      solutionSeen: true,
      elapsedMs: 4200,
    };
  r = updateProgram(def, r, { kind: "attempt", receipt });
  r = updateProgram(def, r, { kind: "attempt", receipt });
  assert.equal(r.attempts.length, 1);
  assert.equal(r.elapsedMs, 4200);
  assert.deepEqual(r.independentEvidenceIds, []);
  r = updateProgram(def, r, { kind: "complete", stage: "guided" });
  assert.equal(r.current, "independent");
  assert.equal(JSON.stringify(def), before);
  assert.throws(
    () =>
      updateProgram({ ...def, version: "2" }, r, {
        kind: "open",
        stage: "concept",
      }),
    /version/,
  );
  assert.throws(
    () => updateProgram(def, r, { kind: "complete", stage: "retention" }),
    /host/,
  );
  assert.throws(
    () =>
      updateProgram(def, r, {
        kind: "attempt",
        receipt: { ...receipt, elapsedMs: -1 },
      }),
    /Invalid/,
  );
});
test("shared competency identity does not mix exam and school progress", () => {
  const def = programFor(
    competencies.find((c) => c.id === families.comparison.competency)!,
  );
  const school = startProgram("learner", "school", def),
    gre = startProgram("learner", "gre-quant", def);
  assert.equal(school.programId, gre.programId);
  assert.notEqual(programKey(school), programKey(gre));
  assert.equal(
    completion(
      def,
      updateProgram(def, school, { kind: "complete", stage: "concept" }),
    ),
    14,
  );
  assert.equal(completion(def, gre), 0);
  assert.ok(
    examTracks
      .find((t) => t.id === "gre-quant")!
      .syllabusMapping.some((m) => m.competencyId === school.programId),
  );
});
test("candidate evidence retains hints repeats provenance and cannot become admissible", () => {
  const item = generate("linear", 12);
  const e = candidateResponse({
    learnerId: "same",
    journeyId: "jee-main",
    at: "2026-10-18T10:00:00Z",
    item,
    response: "bad",
    correct: false,
    elapsedMs: 1400,
    hintCount: 2,
    solutionSeen: true,
    exposure: "repeat",
    priorItemExposures: 2,
    priorFamilyExposures: 3,
  });
  assert.equal(e.admissible, false);
  assert.equal(e.hintCount, 2);
  assert.equal(e.exposure, "repeat");
  assert.deepEqual(e.misconceptions, []);
  assert.equal(e.item.provenance.kind, "original-generated");
});

test("exam speed and strategy receipts stay separate; unverified timed/scoring paths fail closed", async () => {
  const { startExamJourney, recordExamAttempt, schoolProgramLink } =
    await import("../../../packages/mathematics/src/exams");
  const gre = startExamJourney("one-learner", "gre-quant");
  const receipt = {
    id: "exam1",
    mode: "practice" as const,
    itemIds: ["sample"],
    startedAt: "2026-10-18T10:00:00Z",
    elapsedMs: 45000,
    strategyNotes: ["compare denominators"],
    conceptualCandidateIds: ["candidate1"],
  };
  const done = recordExamAttempt(gre, receipt);
  assert.equal(done.attempts.length, 1);
  assert.equal(gre.attempts.length, 0);
  assert.equal(done.readiness, "not-estimated");
  assert.equal(recordExamAttempt(done, receipt).attempts.length, 1);
  assert.throws(
    () => recordExamAttempt(gre, { ...receipt, mode: "timed" }),
    /unverified/,
  );
  assert.throws(
    () =>
      recordExamAttempt(gre, {
        ...receipt,
        hostScore: { value: 1, maximum: 1, policyVersion: "invented" },
      }),
    /not verified/,
  );
  assert.notEqual(
    schoolProgramLink("one-learner", families.comparison.competency),
    gre.programKeys[0],
  );
});

test("each initial competitive track delivers original practice in its configured candidate formats", () => {
  for (const id of ["jee-main", "jee-advanced", "gre-quant"]) {
    const track = examTracks.find((t) => t.id === id)!;
    assert.ok(track.questionFamilies.length);
    for (const family of track.questionFamilies) {
      const item = generate(family as Family, 74);
      assert.ok((track.candidateFormats as string[]).includes(item.format));
      assert.ok(
        track.syllabusMapping.some((m) => m.competencyId === item.competencyId),
      );
      assert.equal(item.provenance.official, false);
      assert.equal(item.validation.educational, "provisional");
    }
  }
});

test("instructional time receipts persist idempotently and cannot verify proficiency", () => {
  const def = programFor(
    competencies.find((c) => c.id === families.linear.competency)!,
  );
  let r = startProgram("learner", "school", def);
  const action = {
    kind: "time" as const,
    id: "t1",
    stage: "concept" as const,
    elapsedMs: 12500,
  };
  r = updateProgram(def, r, action);
  r = JSON.parse(JSON.stringify(r));
  r = updateProgram(def, r, action);
  assert.equal(r.elapsedMs, 12500);
  assert.equal(r.timeReceipts.length, 1);
  assert.equal(completion(def, r), 0);
  assert.deepEqual(r.independentEvidenceIds, []);
  assert.throws(
    () => updateProgram(def, r, { ...action, id: "bad", elapsedMs: -1 }),
    /duration/,
  );
});
