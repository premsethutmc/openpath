import assert from "node:assert/strict";
import { test } from "node:test";
import { fold, merge } from "./account";

test("answers kept in the account fold into progress, and device progress is not lost on sign-in", () => {
  const p = fold([
    { kind: "tamil.answer", q: "a", right: false },
    { kind: "tamil.answer", q: "a", right: true },
    { kind: "tamil.writing" },
    { kind: "tamil.answer", q: "b", right: true },
  ]);
  assert.deepEqual(p, { a: { right: 1, wrong: 1, streak: 1 }, b: { right: 1, wrong: 0, streak: 1 } });
  assert.deepEqual(merge(p, { a: { right: 3, wrong: 0, streak: 3 }, c: { right: 0, wrong: 2, streak: 0 } }), {
    a: { right: 3, wrong: 1, streak: 3 },
    b: { right: 1, wrong: 0, streak: 1 },
    c: { right: 0, wrong: 2, streak: 0 },
  });
});
