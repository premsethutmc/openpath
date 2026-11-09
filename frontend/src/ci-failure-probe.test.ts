// TEMPORARY (reverted in the next commit): proves a failing test in one shard fails "Frontend tests (all shards)".
import assert from "node:assert/strict";
import { test } from "node:test";
test("ci-failure-probe: this must fail CI", () => assert.equal(1, 2));
