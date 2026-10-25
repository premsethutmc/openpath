/** Claims of b-place-round-compare: real steps hold; corrupted stated values are rejected. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import type { Step, Problem } from "../claim-kit";

const steps = (key: string, n = 100): [Step, Problem][] => {
  const [fam, op] = key.split("/");
  const out: [Step, Problem][] = [];
  const items = pool(fam).items;
  const stride = Math.max(1, Math.floor(items.length / n));
  for (let i = 0; i < items.length; i += stride) for (const s of items[i].steps) if (s.op === op) out.push([s, items[i]]);
  return out;
};
const run = (key: string, corrupt: (s: Step, p: Problem) => unknown[], filter: (s: Step) => boolean = () => true) =>
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const all = steps(key).filter(([s]) => filter(s));
    assert.ok(all.length >= 30, `only ${all.length} steps`);
    for (const [s, p] of all) {
      assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corrupt(s, p).filter((b) => b !== s.value)) assert.notEqual(stepClaimHolds({ ...s, value: bad as Step["value"] }, p), true, `${p.id} ${s.id} corrupted to ${String(bad)}`);
    }
  });

// choice index steps: every other index, a non-index, a string
const idx = (s: Step, p: Problem) => [0, 1, 2, 3].filter((i) => i !== s.value && i < (p.options?.length ?? 0)).concat(["x", 99 as never, -1 as never]);
run("aenumf/place", idx);
run("aedpv/place", idx);

// numeric deciding digits
const digit = (s: Step) => { const n = Number(s.value); return [(n + 1) % 10, (n + 9) % 10, n + 10, "not a number", "", 5 - n === n ? 6 : 5 - n]; };
run("aerdec/compare", digit);
run("aernd/compare", digit);

// text steps
const sens = ["The answer is sensible", "The answer is too small to be right", "The answer is too big to be right"];
run("adestchk/compare", (s) => [...sens.filter((x) => x !== s.value), "sensible", 3, ""]);
run("adestchk/round", (s) => {
  const [a, b] = String(s.value).split(" and ").map(Number);
  return [`${a + 10} and ${b}`, `${a} and ${b + 10}`, `${b} and ${a}`, `${a - 10} and ${b}`, `${a}and${b}`, `${a}`, ""];
});
run("aedecc/compare", (s, p) => {
  const [x, y] = p.prompt.match(/greater: (\S+) or (\S+)\?/)!.slice(1);
  const other = String(s.value) === x ? y : x;
  return [other, "0", 1, "abc", Number(s.value) + 0.01, Number(s.value) - 0.1];
});

// ordered lists: swap neighbours, reverse, drop, change a number, wrong separator, no brackets
const lists = (s: Step) => {
  const t = String(s.value).slice(1, -1).split(", ");
  const sw = (i: number) => { const u = [...t]; [u[i], u[i + 1]] = [u[i + 1], u[i]]; return `(${u.join(", ")})`; };
  const bump = [...t]; bump[0] = String(Number(bump[0]) + (t[0].includes(".") ? 0.001 : 1));
  const dig = [...t]; dig[1] = dig[1].split("").reverse().join("");
  return [sw(0), sw(1), sw(2), `(${[...t].reverse().join(", ")})`, `(${t.slice(0, 3).join(", ")})`, `(${bump.join(", ")})`, `(${t.join(", ")}, ${t[0]})`, t.join(", "), "(a, b, c, d)", ""]
    .filter((x) => x !== s.value && x !== `(${dig.join(", ")})`).concat(dig.join(",") === t.join(",") ? [] : [`(${dig.join(", ")})`]);
};
run("aedord/compare", lists);
run("aecmp/compare", lists);

// accmpx: the "change" step states L - R, the "sign" step states the sign
run("accmpx/compare", (s) => (s.inputs.length === 3 ? [Number(s.value) + 1, Number(s.value) - 1, -Number(s.value) || 7, "<", "x"] : ["<", ">", "="].filter((x) => x !== s.value).concat([1 as never, "x"])));
