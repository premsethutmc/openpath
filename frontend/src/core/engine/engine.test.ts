/**
 * The on-device engine must agree with the Python reference engine on every
 * golden case. If this fails after a rule change, port the change here and
 * regenerate the cases with `python -m assessment.export_golden`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { Curriculum } from "../types";
import { buildProfile, evaluateSession, planNextSession } from "./index";

const shared = new URL("../../../../shared/", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, shared), "utf8"));
const curriculum: Curriculum = read("curriculum/math-early-number.json");
const golden = read("golden/cases.json");

test("golden cases were generated for this curriculum", () => {
  assert.equal(golden.curriculum_version, curriculum.version);
  assert.ok(golden.sessions.length >= 9);
  assert.ok(golden.histories.length >= 8);
});

for (const scenario of golden.sessions) {
  test(`session: ${scenario.name}`, () => {
    assert.deepEqual(evaluateSession(scenario.events), scenario.expected);
  });
}

for (const scenario of golden.histories) {
  test(`history: ${scenario.name}`, () => {
    const profile = buildProfile(curriculum, scenario.observations, new Date(scenario.now));
    assert.deepEqual(profile, scenario.expected_profile);
    assert.deepEqual(planNextSession(profile, scenario.sessions_completed), scenario.expected_plan);
  });
}

test("event order follows seq, not arrival order", () => {
  const events = golden.sessions[0].events;
  assert.deepEqual(evaluateSession([...events].reverse()), evaluateSession(events));
});
