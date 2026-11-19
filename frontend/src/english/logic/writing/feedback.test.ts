import test from "node:test";
import assert from "node:assert/strict";
import { checkWriting, type Target } from "./check.ts";
import { FEEDBACK_TIMEOUT_MS, notReady, serviceFor } from "./feedback.ts";

const T: Target = { min: 30, max: 80 };
const GOOD = "My school is near the river. It has a large playground, and we play there after lunch. I like the library most because it is quiet. When the bell rings, we walk home together. Our teachers are kind, but they expect hard work.";

test("WF-1 AI feedback opens only after the free check is clean and the length is right", () => {
  assert.equal(notReady(null, T), "Check your writing first.");
  assert.equal(notReady(checkWriting("My school is near the river.", T), T), "Write at least 30 words first.");
  assert.equal(notReady(checkWriting(`${GOOD} ${GOOD}`, T), T), "Cut it to 80 words or fewer first.");
  assert.match(notReady(checkWriting(GOOD.replace("My school", "my school").replace("library", "libary"), T), T)!, /Fix the 2 points marked/);
  assert.equal(notReady(checkWriting(GOOD, T), T), null);
  // a tip (not a fix) does not hold it back
  const tipped = checkWriting("I like my town a lot today. I like the old shops near it. I like the green park there. I like the wide river too. I like the small school and the kind people in it.", T);
  assert.ok(tipped.notes.some((n) => n.level === "tip"));
  assert.equal(notReady(tipped, T), null);
});

test("WF-2 the calls: one pupil's own path, the task by id, and a longer time limit for the model", async () => {
  const calls: unknown[][] = [];
  const api = { request: async <R,>(...args: unknown[]) => (calls.push(args), { available: true, consent: false, limit: 3, left: 3 }) as R };
  const s = serviceFor(api, "p-1");
  assert.deepEqual(await s.status(), { available: true, consent: false, limit: 3, left: 3 });
  await s.agree(true);
  await s.ask("c5.rw7.w1", "Trees give shade.", ["length"]);
  assert.deepEqual(calls, [
    ["GET", "/pupils/p-1/writing-feedback/"],
    ["POST", "/pupils/p-1/writing-feedback/consent/", { granted: true }],
    ["POST", "/pupils/p-1/writing-feedback/", { task: "c5.rw7.w1", text: "Trees give shade.", checked: ["length"] }, FEEDBACK_TIMEOUT_MS],
  ]);
});
