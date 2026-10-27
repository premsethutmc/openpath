/** m-solids-angles-lattice claims: real steps hold, corrupted values and altered pictures are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import type { Problem, Step } from "../family-kit";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS, BASIS } from "./m-solids-angles-lattice";

const bumpDigit = (s: string, last: boolean): string | null => {
  const idx = [...s.matchAll(/\d/g)].map((m) => m.index as number);
  if (!idx.length) return null;
  const i = last ? idx[idx.length - 1] : idx[0];
  return s.slice(0, i) + String((Number(s[i]) + 1) % 10) + s.slice(i + 1);
};
const corruptions = (v: number | string, p: Problem): (number | string)[] => {
  const out: (number | string)[] = ["not a number", "", "x", "none", "0, 0, 0", "a circle", "Box C has the greater volume"];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, v + 2, v * 2 + 3, v + 10, -v - 1, String(v + 1));
    if (Array.isArray(p.options)) for (let i = 0; i < p.options.length; i++) out.push(i);
  } else {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    if (v.includes(", ")) out.push(v.split(", ").reverse().join(", "), v.split(", ").slice(1).join(", "), v + ", " + v.split(", ")[0]);
    if (v.length === 1) for (const l of "ABCDEF") out.push(l);
    out.push(v + "!", v + " ", v.toUpperCase(), v.slice(1));
    for (const o of (p.options as string[] | undefined) ?? []) out.push(o);
  }
  return out.filter((c) => c !== v && !(typeof c === "string" && typeof v === "number" && Number(c) === v));
};

const stepsOf = (key: string) => {
  const [fam, op] = key.split("/");
  return pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s })));
};

for (const key of Object.keys(CLAIMS)) {
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const steps = stepsOf(key);
    assert.ok(steps.length > 0, `no steps for ${key}`);
    const stride = Math.max(1, Math.floor(steps.length / 100));
    let seen = 0;
    for (let i = 0; i < steps.length; i += stride) {
      const { p, s } = steps[i];
      seen++;
      assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corruptions(s.value as number | string, p)) {
        // a corrupted choice index that happens to be another option is still a different value, so it must fail
        assert.equal(stepClaimHolds({ ...s, value: bad }, p), false, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
      }
    }
    assert.ok(seen >= Math.min(100, steps.length));
  });
  test(`claim ${key}: BASIS is declared`, () => {
    assert.ok(BASIS[key] === "prompt-independent" || BASIS[key] === "figure-consistent");
  });
}

test("claims return null (unchecked) when the step does not match the prompt", () => {
  for (const key of Object.keys(CLAIMS)) {
    const { p, s } = stepsOf(key)[0];
    assert.equal(stepClaimHolds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), null, `${key} inputs`);
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), null, `${key} prompt`);
  }
});

/** Same question, different picture: the step of one problem must not be confirmed against the picture of another whose answer differs. */
test("a step is not confirmed against a picture with a different answer (afcube, afview)", () => {
  for (const key of ["afcube/fold", "afview/count", "afview/max"]) {
    const steps = stepsOf(key);
    let tried = 0;
    for (const a of steps) for (const b of steps) {
      if (a.p === b.p || a.p.prompt !== b.p.prompt || a.s.value === b.s.value || JSON.stringify(a.s.inputs) !== JSON.stringify(b.s.inputs)) continue;
      assert.equal(stepClaimHolds(a.s, { ...a.p, figure: b.p.figure }), false, `${key} ${a.p.id} on ${b.p.id}`);
      assert.equal(stepClaimHolds(b.s, { ...b.p, figure: a.p.figure }), false, `${key} ${b.p.id} on ${a.p.id}`);
      if (++tried >= 300) break;
    }
    assert.ok(tried > 20, `${key} only ${tried} picture swaps`);
  }
});

test("a changed picture or prompt is never confirmed (afpaint, avvcmp, aeang, aertang, afhidden)", () => {
  const first = (key: string, f: (p: Problem, s: Step) => boolean) => stepsOf(key).find(({ p, s }) => f(p, s))!;
  // painted cubes: another block size in the prompt
  const pe = first("afpaint/edges", (p) => /2 × 3 × 3|3 × 3 × 4/.test(p.prompt));
  assert.equal(stepClaimHolds(pe.s, { ...pe.p, prompt: pe.p.prompt.replace(/\d × \d × \d/, "2 × 2 × 5") }), null);
  assert.equal(stepClaimHolds(pe.s, { ...pe.p, prompt: pe.p.prompt.replace("exactly two faces", "exactly one face") }), null);
  const pc = first("afpaint/inside", () => true);
  assert.equal(stepClaimHolds(pc.s, { ...pc.p, figure: { type: "solid", name: "cube", dims: ["5 cubes on each edge"] } }), null);
  // boxes: change a dimension in the prompt but not in the picture
  const bx = first("avvcmp/compare", () => true);
  assert.equal(stepClaimHolds(bx.s, { ...bx.p, prompt: bx.p.prompt.replace(/(\d+) long/, (_, n) => `${Number(n) + 1} long`) }), null);
  // angles: change a size in the prompt but not in the table; change the table but not the prompt
  const an = first("aeang/compare", () => true);
  assert.equal(stepClaimHolds(an.s, { ...an.p, prompt: an.p.prompt.replace("P = ", "P = 1") }), null);
  const fg = an.p.figure as { head: string[]; rows: string[][] };
  assert.equal(stepClaimHolds(an.s, { ...an.p, figure: { ...fg, rows: [["Size", "15°", ...fg.rows[0].slice(2)]] } }), null);
  // right angle in a picture: the drawn angle on the other side of 90 degrees
  for (const { p, s } of stepsOf("aertang/compare").filter(({ p }) => /^Hold/.test(p.prompt)).slice(0, 40)) {
    const deg = (p.figure as { sector: number }).sector;
    for (const other of [deg < 90 ? 120 : 40, 90]) if (other !== deg) assert.notEqual(stepClaimHolds(s, { ...p, figure: { ...(p.figure as object), sector: other } }), true);
  }
  // hidden figures: the grid in the picture is not the one in the prompt
  const hs = first("afhidden/count", () => true);
  assert.equal(stepClaimHolds(hs.s, { ...hs.p, figure: { type: "grid", rows: 9, cols: 9 } }), null);
});

test("afnet: every option in turn is accepted only if it is the right one", () => {
  for (const { p, s } of stepsOf("afnet/match")) {
    for (const o of p.options as string[]) {
      const ok = o === s.value;
      // the family states the solid as an input in some questions and the option text in others; keep the inputs and change the value
      assert.equal(stepClaimHolds({ ...s, value: o }, p), ok, `${p.id} ${o}`);
    }
  }
});

test("afcube: every letter in turn is accepted only if it is the opposite face", () => {
  for (const { p, s } of stepsOf("afcube/fold").filter(({ s }) => s.inputs[0] !== "six squares").slice(0, 120)) {
    for (const L of "ABCDEF") assert.equal(stepClaimHolds({ ...s, value: L }, p), L === s.value, `${p.id} ${L}`);
  }
  for (const { p, s } of stepsOf("afcube/fold").filter(({ s }) => s.inputs[0] === "six squares").slice(0, 60)) {
    const other = s.value === "six different faces" ? "two squares land on the same face" : "six different faces";
    assert.equal(stepClaimHolds({ ...s, value: other }, p), false, p.id);
  }
});

test("afsolid and lattice: spot values", () => {
  const find = (key: string, f: (p: Problem, s: Step) => boolean) => stepsOf(key).find(({ p, s }) => f(p, s))!;
  const tp = find("afsolid/count", (p) => /faces does a triangular prism/.test(p.prompt));
  assert.equal(stepClaimHolds({ ...tp.s, value: 5 }, tp.p), true);
  assert.equal(stepClaimHolds({ ...tp.s, value: 6 }, tp.p), false);
  // prism and pyramid are not interchangeable
  assert.equal(stepClaimHolds(tp.s, { ...tp.p, prompt: tp.p.prompt.replace("prism", "pyramid") }), null);
  const lat = find("avlat/add", (p, s) => /What is 12 × 12\?/.test(p.prompt) && s.id === "d1");
  assert.equal(stepClaimHolds(lat.s, lat.p), true);
  assert.equal(stepClaimHolds({ ...lat.s, value: 5 }, lat.p), false);
  // 13 × 12 has a different second diagonal (5), so the stated 4 is refused
  assert.equal(stepClaimHolds(lat.s, { ...lat.p, prompt: lat.p.prompt.replace(/12 × 12/g, "13 × 12") }), false);
});
