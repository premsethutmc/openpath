/** general-solver@1: the typed-calculation solver. Answers are compared with an independent evaluation (JavaScript's own
 *  arithmetic on the same expression), and an equation's answer by putting it back into both sides. */
import assert from "node:assert/strict";
import test from "node:test";
import { sameAnswer, solve } from "../../../packages/learning/src/solve";

const ok = (text: string) => { const r = solve(text); assert.ok(r.ok, `${text}: ${!r.ok && r.reason}`); return r as Extract<ReturnType<typeof solve>, { ok: true }>; };
const float = (v: { n: bigint; d: bigint }) => Number(v.n) / Number(v.d);
// a small seeded generator, so a failure can be repeated
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test("S-1 plain calculations a child brings from homework", () => {
  const cases: [string, string][] = [["36 ÷ 4", "9"], ["23 x 14", "322"], ["1000 − 386", "614"], ["5/6 - 1/4", "7/12"], ["2 1/3 + 1 3/4", "49/12"], ["3 + 4 × (2 + 5)^2", "199"], ["7 ÷ 2", "3.5"], ["15% of 200", "30"], ["3/4 ÷ 2/5", "15/8"], ["24/30", "4/5"], ["-3 + 5 × -2", "−13"], ["1.5 × 0.4", "0.6"], ["what is 12 * 12?", "144"], ["1,000 + 250 =", "1250"], ["3² + 4²", "25"], ["½ + ¼", "3/4"], ["2(3+4)", "14"]];
  for (const [text, answer] of cases) assert.equal(ok(text).answer, answer, text);
});

test("S-2 one-letter linear equations, with the check step", () => {
  const cases: [string, string][] = [["2x + 1 = 7", "x = 3"], ["3(x − 2) = x + 4", "x = 5"], ["x/3 = 5", "x = 15"], ["Solve for y: 5 - 2y = 11", "y = −3"], ["4a = 10", "a = 5/2"], ["7 = 2n − 1", "n = 4"]];
  for (const [text, answer] of cases) { const r = ok(text); assert.equal(r.answer, answer, text); assert.match(r.steps.at(-1)!.explanation, /^Check:/); }
  assert.equal(ok("2x = 2x + 1").answer, "No number works");
  assert.equal(ok("2(x + 1) = 2x + 2").answer, "Every number works for x");
});

test("S-3 what is not read is refused with a reason, never guessed", () => {
  for (const text of ["Ravi has 5 apples and eats 2. How many are left?", "x^2 = 4", "x + y = 3", "5 ÷ 0", "1/0", "2 +", "(3 + 4", "3 4", "2x + 1", "", "∫ 6 dx", "1 = 2 = 3", "9".repeat(20)]) {
    const r = solve(text);
    assert.equal(r.ok, false, text);
    assert.ok(!r.ok && r.reason.length > 10);
  }
});

test("S-4 random calculations: the answer agrees with an independent evaluation, and every line of working is shown", () => {
  const rand = rng(20261113);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const number = () => { const k = rand(); return k < 0.6 ? String(1 + Math.floor(rand() * 60)) : k < 0.8 ? (Math.floor(rand() * 900) / 10 + 0.1).toFixed(1) : `${1 + Math.floor(rand() * 9)}/${2 + Math.floor(rand() * 11)}`; };
  const expr = (depth: number): string => { if (depth === 0 || rand() < 0.3) return number(); const inner = `${expr(depth - 1)} ${pick(["+", "-", "*", "÷"])} ${expr(depth - 1)}`; return rand() < 0.4 ? `(${inner})` : inner; };
  let done = 0;
  for (let i = 0; i < 3000; i++) {
    const text = expr(3);
    // the independent route: fractions and ÷ are plain divisions for JavaScript
    const js = text.replace(/÷/g, "/").replace(/(\d+)\/(\d+)/g, "($1/$2)");
    const want = Function(`"use strict"; return (${js});`)() as number;
    const r = solve(text);
    if (!Number.isFinite(want)) { assert.equal(r.ok, false, text); continue; }
    assert.ok(r.ok, `${text}: ${!r.ok && r.reason}`);
    if (!r.ok) continue;
    const got = float(r.value!);
    assert.ok(Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(want)), `${text}: ${got} ≠ ${want}`);
    assert.ok(r.steps.length >= 1 && r.steps.at(-1)!.expression === r.answer, `${text}: the last line is the answer`);
    assert.equal(sameAnswer(r, r.answer), true, `${text}: its own answer is accepted`);
    done++;
  }
  assert.ok(done > 2500);
});

test("S-5 random linear equations: the answer satisfies the equation as typed", () => {
  const rand = rng(77);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  for (let i = 0; i < 1500; i++) {
    const [a, b, c, d, k] = [int(-9, 9) || 1, int(-20, 20), int(-9, 9), int(-20, 20), int(1, 6)];
    const text = `${a}x + ${b} = ${k}(${c}x - ${d})`.replace(/\+ -/g, "- ").replace(/- -/g, "+ ");
    const r = solve(text);
    assert.ok(r.ok, `${text}: ${!r.ok && r.reason}`);
    if (!r.ok || !r.value) { assert.equal(a, k * c, text); continue; }
    const x = float(r.value);
    assert.ok(Math.abs(a * x + b - k * (c * x - d)) < 1e-7, `${text}: x = ${x}`);
  }
});

test("S-6 a typed answer is compared by value", () => {
  const r = ok("5/6 - 1/4");
  assert.equal(sameAnswer(r, "7/12"), true);
  assert.equal(sameAnswer(r, "14/24"), true);
  assert.equal(sameAnswer(r, "7/11"), false);
  assert.equal(sameAnswer(ok("2x + 1 = 7"), "x = 3"), true);
  assert.equal(sameAnswer(ok("2x + 1 = 7"), "3"), true);
  assert.equal(sameAnswer(ok("7 ÷ 2"), "3 1/2"), true);
  assert.equal(sameAnswer(r, "seven twelfths"), null);
});

test("S-7 long multiplication and long division are also set out in columns, and the columns are right", () => {
  const rand = rng(5);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  for (let i = 0; i < 2000; i++) {
    const [a, b] = [int(10, 99999), int(10, 9999)];
    const m = ok(`${a} × ${b}`);
    const rows = m.steps[0].layout!;
    assert.ok(rows, `${a} × ${b} has columns`);
    assert.equal(rows.at(-1)!.trim(), String(a * b));
    const partial = rows.slice(3, -2).map((r) => Number(r.trim().split(/\s+/)[0]));
    assert.equal(partial.reduce((t, v) => t + v, 0), a * b, `${a} × ${b}: the rows add up`);
    const [x, y] = [int(100, 9999999), int(2, 999)];
    const d = ok(`${x} ÷ ${y}`);
    const lines = d.steps[0].layout!;
    assert.ok(lines, `${x} ÷ ${y} has columns`);
    assert.equal(lines[0].trim(), String(Math.floor(x / y)), `${x} ÷ ${y}: the quotient on top`);
    assert.equal(lines.at(-1)!.trim().split(/\s+/)[0], String(x % y), `${x} ÷ ${y}: what is left over`);
  }
  assert.equal(ok("7 × 8").steps[0].layout, undefined, "a times-table fact needs no columns");
});

test("S-8 HCF, LCM, prime factors and factors", () => {
  assert.equal(ok("hcf of 12 and 18").answer, "6");
  assert.equal(ok("LCM of 4, 6 and 10").answer, "60");
  assert.equal(ok("HCF and LCM of 24 and 36").answer, "HCF = 12, LCM = 72");
  assert.equal(ok("Find the highest common factor of 45 and 60?").answer, "15");
  assert.equal(ok("prime factors of 84").answer, "2 × 2 × 3 × 7");
  assert.equal(ok("factors of 36").answer, "1, 2, 3, 4, 6, 9, 12, 18, 36");
  assert.equal(ok("hcf of 7 and 13").answer, "1");
  const rand = rng(9);
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  for (let i = 0; i < 1500; i++) {
    const [a, b] = [1 + Math.floor(rand() * 5000), 1 + Math.floor(rand() * 5000)];
    assert.equal(ok(`hcf of ${a} and ${b}`).answer, String(g(a, b)));
    assert.equal(ok(`lcm of ${a} and ${b}`).answer, String((a / g(a, b)) * b));
  }
  assert.equal(solve("hcf of 0 and 5").ok, false);
});

test("S-9 units: metric length, mass and capacity, time, rupees", () => {
  const cases: [string, string][] = [["3.5 km in m", "3500 m"], ["250 cm to m", "2.5 m"], ["2 h 30 min in minutes", "150 minutes"], ["how many grams in 2 1/2 kg", "2500 g"], ["convert 90 minutes to hours", "1.5 hours"], ["1500 ml to l", "1.5 l"], ["3 weeks in days", "21 days"], ["250 paise in rupees", "2.5 rupees"], ["4 km 250 m in m", "4250 m"], ["45 min in hours", "0.75 hours"]];
  for (const [text, answer] of cases) assert.equal(ok(text).answer, answer, text);
  assert.equal(solve("5 kg to m").ok, false);
  assert.equal(sameAnswer(ok("3.5 km in m"), "3500 m"), true);
  assert.equal(sameAnswer(ok("3.5 km in m"), "3500"), true);
  assert.equal(sameAnswer(ok("3.5 km in m"), "350"), false);
});

test("S-10 addition and subtraction set out in columns, decimal points in line", () => {
  const rand = rng(31);
  for (let i = 0; i < 2000; i++) {
    const [a, b] = [Math.floor(rand() * 900000) / 100 + 10, Math.floor(rand() * 90000) / 100 + 10].map((v) => Number(v.toFixed(rand() < 0.5 ? 2 : 0)));
    const [hi, lo] = a >= b ? [a, b] : [b, a];
    for (const [text, want] of [[`${hi} + ${lo}`, hi + lo], [`${hi} - ${lo}`, hi - lo]] as [string, number][]) {
      const rows = ok(text).steps[0].layout!;
      assert.ok(rows, `${text} has columns`);
      assert.ok(Math.abs(Number(rows.at(-1)!.trim()) - want) < 1e-6, `${text}: ${rows.at(-1)}`);
      // the decimal points are in one column
      const dots = rows.filter((r) => r.includes(".")).map((r) => r.indexOf("."));
      assert.ok(dots.every((d) => d === dots[0]), `${text}: decimal points in line`);
    }
  }
  assert.equal(ok("3 + 4").steps[0].layout, undefined);
});

test("S-11 area and perimeter of rectangles, squares and triangles", () => {
  const cases: [string, string][] = [["area of a rectangle 7 cm by 6 cm", "42 cm²"], ["perimeter of a square of side 5 m", "20 m"], ["area and perimeter of a rectangle with length 12 cm and breadth 5 cm", "Area = 60 cm², Perimeter = 34 cm"], ["area of a triangle with base 6 cm and height 4 cm", "12 cm²"], ["perimeter of a triangle with sides 3 cm, 4 cm and 5 cm", "12 cm"], ["Find the area of a square of side 2.5 m.", "6.25 m²"], ["perimeter of a rectangle 8 by 3", "22 units"]];
  for (const [text, answer] of cases) assert.equal(ok(text).answer, answer, text);
  assert.equal(sameAnswer(ok("area of a rectangle 7 cm by 6 cm"), "42 cm2"), true);
  assert.equal(sameAnswer(ok("area of a rectangle 7 cm by 6 cm"), "42"), true);
  assert.equal(sameAnswer(ok("area of a rectangle 7 cm by 6 cm"), "42 m2"), null, "a different unit is not accepted");
  // a question that only mentions a shape is not guessed at
  for (const text of ["area of a rectangle 2 m by 50 cm", "the area of a rectangle is 42 and its length is 7, find the breadth", "area of a circle of radius 7 cm", "area of a triangle with sides 3, 4 and 5"]) assert.equal(solve(text).ok, false, text);
});

test("S-12 ratios and simple interest", () => {
  assert.equal(ok("12:18").answer, "2 : 3");
  assert.equal(ok("simplify 24:36:60").answer, "2 : 3 : 5");
  assert.equal(ok("7:5").answer, "7 : 5");
  assert.equal(ok("divide ₹600 in the ratio 2:3").answer, "₹240 and ₹360");
  assert.equal(ok("share 84 sweets in the ratio 3:4").answer, "36 sweets and 48 sweets");
  assert.equal(ok("divide 100 in the ratio 1:2").answer, "33 1/3 and 66 2/3");
  assert.equal(ok("simple interest on ₹5000 at 8% for 3 years").answer, "₹1200");
  assert.equal(ok("find the amount on rs 1200 at 5% per annum for 6 months").answer, "₹1230");
  assert.equal(ok("simple interest and amount on 2000 at 7.5% for 2 years").answer, "Interest = ₹300, Amount = ₹2300");
  assert.equal(sameAnswer(ok("simple interest on ₹5000 at 8% for 3 years"), "₹1200"), true);
  const rand = rng(41);
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  for (let i = 0; i < 1000; i++) {
    const [a, b] = [1 + Math.floor(rand() * 400), 1 + Math.floor(rand() * 400)];
    assert.equal(ok(`${a}:${b}`).answer, `${a / g(a, b)} : ${b / g(a, b)}`);
    const [P, R, T] = [100 * (1 + Math.floor(rand() * 200)), 1 + Math.floor(rand() * 15), 1 + Math.floor(rand() * 9)];
    assert.equal(ok(`simple interest on ${P} at ${R}% for ${T} years`).answer, `₹${(P * R * T) / 100}`);
  }
});

test("S-13 clock time: adding, taking away and the time between", () => {
  const cases: [string, string][] = [["2:45 pm + 1 h 30 min", "4:15 pm"], ["what time is 50 minutes before 9:20 am", "8:30 am"], ["from 9:15 am to 2:40 pm", "5 h 25 min"], ["how long is it from 10:30 pm to 6:15 am", "7 h 45 min"], ["11:30 pm + 2 hours", "1:30 am the next day"], ["14:20 - 45 min", "13:35"], ["3 hours after 12:00 pm", "3:00 pm"], ["from 9:10 am to 9:50 am", "40 min"]];
  for (const [text, answer] of cases) assert.equal(ok(text).answer, answer, text);
  const rand = rng(51);
  const show = (at: number) => `${String(Math.floor(at / 60)).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}`;
  for (let i = 0; i < 2000; i++) {
    const [a, b] = [Math.floor(rand() * 1440), Math.floor(rand() * 1440)];
    const span = (b - a + 1440) % 1440;
    if (span === 0) continue;
    const [h, m] = [Math.floor(span / 60), span % 60];
    assert.equal(ok(`from ${show(a)} to ${show(b)}`).answer, [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" "), `from ${show(a)} to ${show(b)}`);
    const later = ok(`${show(a)} + ${h ? `${h} h ` : ""}${m ? `${m} min` : ""}`.trim()).answer;
    assert.equal(later, show(b) + (a + span >= 1440 ? " the next day" : ""), `${show(a)} + ${span} min`);
  }
  assert.equal(solve("25:10 + 1 h").ok, false);
});
