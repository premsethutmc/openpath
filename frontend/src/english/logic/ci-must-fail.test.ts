// TEMPORARY (branch tmp/ci-must-fail-proof only, never merged): proves a failing frontend test fails CI.
import assert from "node:assert/strict";
import { test } from "node:test";
test("deliberate failure: CI must report this job as failed", () => assert.equal(1, 2));
