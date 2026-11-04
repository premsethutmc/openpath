import test from "node:test"; import assert from "node:assert/strict"; import { createHash } from "node:crypto"; import { sha256Hex } from "./digest.ts";
test("sha256Hex matches node:crypto on edge lengths and unicode", () => {
  const cases = ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "a".repeat(65), "a".repeat(1000), "−√2 π ∑ 😀", JSON.stringify({ x: [1, 2, { y: "z" }] })];
  for (const s of cases) assert.equal(sha256Hex(s), createHash("sha256").update(s).digest("hex"), s.slice(0, 20));
});
