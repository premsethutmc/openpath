/** worked-out@1: the full working written for a type, proved on every one of its questions. */
import assert from "node:assert/strict";
import { judge } from "../../../packages/learning/src/step-ask";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
const FAMILIES_ALL = () => [...FAMILIES.keys()];
import { checkWorkingLines } from "../../../packages/learning/src/line-check";
import { askOf } from "../../../packages/learning/src/step-ask";
import { helpMethods, stepsHelp } from "../../../packages/learning/src/step-help";
import { WORKED_OUT } from "../../../packages/learning/src/worked-out";

test("every question of a worked-out type gets the whole working, every calculation in it is true, and it ends on the answer", () => {
  for (const f of WORKED_OUT) {
    let n = 0, boxes = 0, lines = 0;
    for (const { id } of pool(f).items) {
      if (/:(mc|w)$/.test(id)) continue;
      const h = stepsHelp(id)!, q = question(id);
      n++;
      assert.ok(h.length + h.reduce((k, x) => k + (x.how?.lines.length ?? 0), 0) >= 3, `${id}: ${h.length} steps`);
      // the first thing a stuck learner is told never holds the answer
      assert.ok(!new RegExp(`(^|\\D)${q.answer}(\\D|$)`).test(h[0].next) || q.answer.length === 1 || q.prompt.includes(q.answer), `${id}: ${h[0].next}`);
      assert.ok(new RegExp(`(^|\\D)${q.answer}(\\D|$)`).test(h[h.length - 1].shown), `${id}: ${h[h.length - 1].shown}`);
      for (const s of h) {
        lines++;
        if (askOf(s.shown) || s.ask) boxes++; // a step entered as a word or a count (type-it@1) is a box too
        // every "a × b = c", "a ÷ b = c", "a − b = c" and digit sum written in the working is true
        for (const m of s.shown.matchAll(/(\d+(?: [×÷+−] \d+)+) = (\d+)/g)) assert.equal(checkWorkingLines([`${m[1]} = ${m[2]}`])[0].state, "right", `${id}: ${m[0]}`);
        assert.ok(!/undefined|NaN/.test(s.next + s.shown), id);
      }
    }
    console.log(f, n, "questions,", lines, "steps,", boxes, "to fill");
    assert.ok(n > 50 && boxes / lines > 0.2, f);
  }
});

test("the working for the smallest prime factor of 551", () => {
  const h = stepsHelp("gen:agptest:1,551")!;
  assert.equal(h[0].shown, "It is 23: 23 × 23 = 529");
  assert.ok(h.some((s) => s.shown === "7 × 78 = 546. Left over: 551 − 546 = 5"));
  assert.ok(h.some((s) => s.shown === "551 ÷ 19 = 29"));
  assert.match(h[h.length - 1].shown, /smallest prime factor is 19\.$/);
});

test("cue-numbers@1: a plain calculation's cue names its numbers and never its result", () => {
  // a long division's "50 × 6" is the learner's own choice of 50: it is not named
  const div = pool("ldiv").items[0];
  assert.ok(stepsHelp(div.id)!.every((s) => !/: multiply \d/.test(s.next)), div.id);
  let named = 0;
  for (const f of ["acstory", "aeshop", "agchange", "aedrip", "acstory4", "aebig"]) for (const { id } of pool(f).items.slice(0, 40)) for (const s of stepsHelp(id) ?? []) {
    const m = /^(?:First|Next|Last): (add|take|multiply|divide) ([\d,.]+) (?:and|away from|by) ([\d,.]+)(?:,| and|\.)/.exec(s.next);
    if (!m) continue;
    named++;
    const a = Number(m[2].replace(/,/g, "")), b = Number(m[3].replace(/,/g, "")), r = m[1] === "add" ? null : m[1] === "take" ? b - a : m[1] === "multiply" ? a * b : a / b;
    // the result is in the step as shown, and is not said in the cue
    if (r !== null) { assert.ok(s.shown.replace(/(\d),(?=\d)/g, "$1").includes(String(Math.round(r * 1000) / 1000)), `${id}: ${s.next} / ${s.shown}`); assert.ok(r !== a && r !== b, id); }
  }
  assert.ok(named > 20, String(named));
});

test("long division is the school layout: how many fit, the product underneath, take away, bring down", async () => {
  const { pool } = await import("../../../packages/learning/src/families");
  const id = pool("ldiv").items.find((p) => /^348 ÷ 6/.test(p.prompt))!.id, h = stepsHelp(id)!;
  assert.deepEqual(h.map((s) => s.next), [
    "First: 6 is more than 3, so take the next digit with it. How many 6s fit in 34, without going over?", "Take it away. What is left from the 34?", "Bring down the next digit, 8.",
    "How many 6s fit in 48, without going over?", "Take it away. What is left from the 48?", "Last: read the answer off the top.",
  ]);
  assert.equal(h[1].shown, "34 − 30 = 4");
  assert.deepEqual(h.at(-1)!.board, ["     58", "6 ) 348", "    30", "    --", "     48", "     48", "     --", "      0"]);
  assert.equal(h[0].needs, "MATH.number.multiplication-tables");
  assert.ok(!h.slice(0, -1).some((s) => /58/.test(s.next + s.shown)), "the answer is not said before the end");
  // with a remainder, and the remainder asked for
  const r = stepsHelp("gen:avdiv:3,124,1,0")!;
  assert.deepEqual(r.at(-1)!.board, ["    124", "3 ) 373", "    3", "    -", "     7", "     6", "     -", "     13", "     12", "     --", "      1"]);
  assert.match(stepsHelp("gen:avdiv:3,124,1,1")!.at(-1)!.shown, /remainder: 1\.$/);
  // every row of every board is as wide as the layout needs and no wider
  for (const s of h) for (const row of s.board!) assert.ok(row.length <= 7, row);
});

test("the written layout of every division question is right: top line, bracket line, every product and every difference", async () => {
  const { pool, problemOf } = await import("../../../packages/learning/src/families");
  let n = 0, rules = 0;
  for (const f of ["ldiv", "avdiv"]) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const p = (item as { params: number[] }).params, [num, d] = f === "ldiv" ? [p[0] * p[1], p[1]] : [p[0] * p[1] + p[2], p[0]];
    const b = stepsHelp(item.id)!.at(-1)!.board, pad = String(d).length + 3;
    // a question that gives the divisor, quotient and remainder and asks for the number divided is not a division to lay out
    if (!b) { assert.ok(f === "avdiv" && p[3] === 2, item.id); continue; }
    n++;
    assert.equal(Number(b[0].trim()), Math.floor(num / d), `${item.id}: the top line is the quotient`);
    assert.equal(b[1], `${d} ) ${num}`, item.id);
    assert.equal(Number(b[b.length - 1].trim()), num % d, `${item.id}: what is left at the bottom is the remainder`);
    // at every rule: the row above is a product of the divisor, it is taken from the row above that (or from the leading
    // digits of the number), and the row below is what is left, with the next digit beside it if one was brought down
    for (let j = 2; j < b.length; j++) {
      if (!/^\s*-+$/.test(b[j])) continue;
      rules++;
      const product = Number(b[j - 1].trim()), have = j - 2 >= 2 ? Number(b[j - 2].trim()) : Number(String(num).slice(0, b[j - 1].length - pad));
      const left = have - product, below = b[j + 1].trim();
      assert.ok(product > 0 && product % d === 0, `${item.id}: ${product} is not a multiple of ${d}`);
      assert.ok(left >= 0 && left < d, `${item.id}: ${have} − ${product}`);
      assert.ok(below === String(left) || (below.length >= 1 && Number(below.slice(0, -1) || "0") === left), `${item.id}: under the rule is ${below}, expected ${left}`);
    }
  }
  console.log(n, "division layouts,", rules, "take-aways checked");
  assert.ok(n > 1000 && rules > 2000, `${n} ${rules}`);
});

test("column addition and subtraction: every question of two whole numbers is set out in columns and ends on the answer", () => {
  let n = 0, carried = 0, borrowed = 0;
  for (const f of FAMILIES_ALL()) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const m = /^([\d,]+) ([+−]) ([\d,]+) = \?$/.exec(item.prompt);
    if (!m) continue;
    const a = Number(m[1].replace(/,/g, "")), b = Number(m[3].replace(/,/g, ""));
    const h = stepsHelp(item.id)!, last = h.at(-1)!;
    if (!last.board) { assert.ok(Math.max(a, b) < 10 || (m[2] === "−" && a < b), `${item.id} has no columns`); continue; }
    n++;
    const want = m[2] === "+" ? a + b : a - b, rows = last.board;
    assert.equal(Number(rows.at(-1)!.replace(/[\s−+]/g, "")), want, item.id);
    assert.equal(String(want), question(item.id).answer.replace(/,/g, ""), item.id);
    assert.ok(new Set(rows.slice(-4).map((r) => r.length)).size === 1, `${item.id}: the columns line up`);
    assert.equal(Number(rows.at(-4)!.replace(/[\s−+]/g, "")), a, item.id);
    assert.equal(Number(rows.at(-3)!.replace(/[\s−+]/g, "")), b, item.id);
    for (const s of h) for (const c of s.shown.matchAll(/(\d+(?: [+−] \d+)+) = (\d+)/g)) assert.equal(checkWorkingLines([`${c[1]} = ${c[2]}`])[0].state, "right", `${item.id}: ${c[0]}`);
    if (h.some((s) => /carry 1/.test(s.shown))) carried++;
    if (h.some((s) => /Borrow 1/.test(s.shown))) borrowed++;
    assert.ok(!h.slice(0, -1).some((s) => String(want).length >= 3 && s.shown.includes(String(want))), `${item.id}: the answer is not said before the end`);
  }
  console.log(n, "column layouts,", carried, "with carrying,", borrowed, "with borrowing");
  assert.ok(n > 3000 && carried > 500 && borrowed > 300, `${n} ${carried} ${borrowed}`);
});

test("methods@1: the taught method is the first tab, and the type's own steps are a second way where they are a real alternative", () => {
  const id = pool("ldiv").items.find((p) => /^348 ÷ 6/.test(p.prompt))!.id;
  assert.deepEqual(helpMethods(id), ["Long division", "Answer at the side", "In easy parts"]);
  assert.match(stepsHelp(id, 0)![0].next, /How many 6s fit in 34/);
  assert.deepEqual(stepsHelp(id, 1)!.at(-1)!.board!.slice(0, 2), ["6 ) 348 ( 58", "    30"]);
  assert.equal(stepsHelp(id, 2)![0].next, "First: multiply them.");
  assert.equal(stepsHelp(id, 2)!.some((s) => s.board), false);
  assert.deepEqual(helpMethods("gen:adcol3:104,737,0"), ["In columns", "By place value"]);
  // borrow@1: what each digit becomes after borrowing is written above it
  assert.deepEqual(stepsHelp("gen:adcol3:860,737,1")!.at(-1)!.board, ["      5 10", "   8  6  0", "−  7  3  7", "----------", "   1  2  3"]);
  assert.deepEqual(stepsHelp("gen:adcol3:104,737,0")!.at(-1)!.board, ["   1", "  104", "+ 737", "-----", "  841"]);
  assert.deepEqual(helpMethods("not-a-question"), []);
});

test("HCF and LCM: each way that is offered ends on the answer, and every product and take-away in it is true", () => {
  const seen = new Map<string, number>(); let n = 0;
  for (const f of FAMILIES_ALL()) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id) || !/^What is the (highest common factor \(HCF\)|lowest common multiple \(LCM\)) of [\d, and]+\?$/.test(item.prompt)) continue;
    const names = helpMethods(item.id), answer = question(item.id).answer;
    assert.ok(names.length >= 1 && names[0] !== "Step by step", `${item.id}: ${names}`);
    n++;
    names.forEach((name, k) => {
      const h = stepsHelp(item.id, k)!;
      seen.set(name, (seen.get(name) ?? 0) + 1);
      // the type's own steps, offered as a second way where only one is written, end on the answer in their own words
      if (name === "Another way") assert.ok(h.at(-1)!.shown.includes(answer), `${item.id} ${name}`);
      else assert.match(h.at(-1)!.shown, new RegExp(`(HCF|LCM) is ${answer}\\.$`), `${item.id} ${name}`);
      for (const s of h) for (const c of s.shown.matchAll(/(\d+(?: [×+−] \d+)+) = (\d+)/g)) assert.equal(checkWorkingLines([`${c[1]} = ${c[2]}`])[0].state, "right", `${item.id} ${name}: ${c[0]}`);
      for (const s of h) { const m = /^(\d+) is ((?:\d+ × )*\d+)\.$/.exec(s.shown); if (m) assert.equal(m[2].split(" × ").map(Number).reduce((x, y) => x * y, 1), Number(m[1]), `${item.id}: ${s.shown}`); }
    });
  }
  console.log(n, "HCF and LCM questions;", [...seen].map(([k, v]) => `${k}: ${v}`).join(", "));
  assert.ok(n > 2000 && (seen.get("Prime factors") ?? 0) > 1500 && (seen.get("Division method") ?? 0) > 500 && (seen.get("Division ladder") ?? 0) > 200, String(n));
  assert.deepEqual(helpMethods("gen:hcf:12,18"), ["Prime factors", "List the factors", "Division method"]);
});

test("column multiplication: by one digit, or by a number like 90, is set out in columns and ends on the answer", () => {
  let n = 0, carried = 0, zeros = 0;
  for (const f of FAMILIES_ALL()) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const m = /^([\d,]+) × ([\d,]+) = \?$/.exec(item.prompt);
    if (!m) continue;
    const a = Number(m[1].replace(/,/g, "")), b = Number(m[2].replace(/,/g, "")), lead = Number(String(b).replace(/0+$/, ""));
    const h = stepsHelp(item.id), last = h?.at(-1);
    if (!last?.board) { assert.ok(a < 13 || lead < 2 || lead > 9, `${item.id} ${item.prompt} has no columns`); continue; }
    n++;
    const rows = last.board, h2 = h!;
    assert.equal(Number(rows.at(-1)!.trim()), a * b, item.id);
    assert.equal(String(a * b), question(item.id).answer.replace(/,/g, ""), item.id);
    assert.ok(new Set(rows.slice(-4).map((r) => r.length)).size === 1, `${item.id}: the columns line up`);
    assert.equal(Number(rows.at(-4)!.trim()), a, item.id);
    assert.equal(Number(rows.at(-3)!.replace(/[\s×]/g, "")), b, item.id);
    for (const s of h2) for (const c of s.shown.matchAll(/(\d+) × (\d+) = (\d+)/g)) assert.equal(Number(c[1]) * Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
    for (const s of h2) for (const c of s.shown.matchAll(/(\d+) \+ (\d+) = (\d+)/g)) assert.equal(Number(c[1]) + Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
    if (h2.some((s) => /carry \d/.test(s.shown))) carried++;
    if (b >= 10) zeros++;
    assert.ok(!h2.slice(0, -1).some((s) => String(a * b).length >= 3 && s.shown.includes(String(a * b))), `${item.id}: the answer is not said before the end`);
    assert.equal(helpMethods(item.id)[0], "In columns", item.id);
  }
  console.log(n, "multiplication layouts,", carried, "with carrying,", zeros, "by tens or hundreds");
  assert.ok(n > 800 && carried > 400 && zeros > 200, `${n} ${carried} ${zeros}`);
});

test("long multiplication: a two-digit multiplier gets one row for its ones, one for its tens, and the rows are added", () => {
  let full = 0, part = 0;
  for (const item of pool("avpp").items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const q = question(item.id), want = Number(q.answer.replace(/,/g, "")), h = stepsHelp(item.id)!, rows = h.at(-1)!.board!;
    assert.ok(rows, `${item.id} has no columns`);
    assert.equal(helpMethods(item.id)[0], "In columns", item.id);
    assert.equal(Number(rows.at(-1)!.trim()), want, item.id);
    assert.ok(new Set((rows.length === 7 ? rows : rows.slice(-4)).map((r) => r.length)).size === 1, `${item.id}: the columns line up`);
    for (const s of h) for (const c of s.shown.matchAll(/(\d+) × (\d+) = (\d+)/g)) assert.equal(Number(c[1]) * Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
    for (const s of h) for (const c of s.shown.matchAll(/(\d+) \+ (\d+) = (\d+)/g)) assert.equal(Number(c[1]) + Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
    assert.ok(!h.slice(0, -1).some((s) => s.shown.includes(String(want))), `${item.id}: the answer is not said before the end`);
    if (rows.length === 7) { full++; assert.equal(Number(rows[3].trim()) + Number(rows[4].trim()), want, `${item.id}: the rows add to the answer`); } else part++;
  }
  console.log(full, "long multiplications,", part, "tens rows");
  assert.ok(full > 100 && part > 100, `${full} ${part}`);
});

test("unlike fractions: both are renamed over the LCM, every renaming is an equal fraction, and the working ends on the answer", () => {
  let n = 0, mixed = 0, simpler = 0;
  const val = (t: string) => { const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(t.trim()); return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(t); };
  for (const f of FAMILIES_ALL()) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const m = /^(?:(\d+) )?(\d+)\/(\d+) ([+−]) (?:(\d+) )?(\d+)\/(\d+) = \?/.exec(item.prompt);
    if (!m || (m[3] === m[7] && !m[1] && !m[5])) continue;
    const h = stepsHelp(item.id)!, q = question(item.id);
    if (helpMethods(item.id)[0] !== "Same bottom (LCM)") continue;
    n++;
    const x = val(`${m[1] ? m[1] + " " : ""}${m[2]}/${m[3]}`), y = val(`${m[5] ? m[5] + " " : ""}${m[6]}/${m[7]}`), want = m[4] === "+" ? x + y : x - y;
    const rows = h.at(-1)!.board!;
    assert.equal(rows.at(-1)!.replace(/^= /, ""), q.answer, item.id);
    for (const r of rows.slice(1)) { const t = r.replace(/^= /, ""), parts = t.split(/ [+−] /); const v = parts.length === 2 ? (m[4] === "+" ? val(parts[0]) + val(parts[1]) : val(parts[0]) - val(parts[1])) : val(t); assert.ok(Math.abs(v - want) < 1e-9, `${item.id}: ${r} is not equal to the question`); }
    for (const s of h) for (const c of s.shown.matchAll(/(\d+)\/(\d+) = (\d+)\/(\d+)/g)) assert.equal(Number(c[1]) * Number(c[4]), Number(c[2]) * Number(c[3]), `${item.id}: ${c[0]}`);
    const L = /LCM (?:of \d+ and \d+ )?is (\d+)/.exec(h.map((s) => s.shown).join(" "));
    if (L) { const l = Number(L[1]), d1 = Number(m[3]), d2 = Number(m[7]); assert.ok(l % d1 === 0 && l % d2 === 0, item.id); for (let k = 1; k < l; k++) assert.ok(k % d1 || k % d2, `${item.id}: ${k} is a smaller common multiple`); }
    assert.ok(!h.slice(0, -1).some((s) => new RegExp(`(^|[^\\d/])${q.answer}$`).test(s.shown) && q.answer.length > 2) || h.length === 1, `${item.id}: the answer is not said before the end`);
    if (m[1] || m[5]) mixed++;
    if (h.some((s) => /made simpler/.test(s.next))) simpler++;
  }
  console.log(n, "fraction workings,", mixed, "with mixed numbers,", simpler, "made simpler");
  assert.ok(n > 1000 && mixed > 300 && simpler > 100, `${n} ${mixed} ${simpler}`);
});

test("decimals in columns: the points are lined up in one column and the bottom line is the answer", () => {
  let n = 0, filled = 0, shownAdd = false;
  for (const item of pool("agdec").items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const m = /^Work out (\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?)\.$/.exec(item.prompt);
    if (!m) continue;
    const h = stepsHelp(item.id)!, q = question(item.id), rows = h.at(-1)!.board;
    if (!rows) { assert.ok(Number(m[1]) < 1 || (m[2] === "−" && Number(m[1]) < Number(m[3])), `${item.id} ${item.prompt} has no columns`); continue; }
    n++;
    assert.deepEqual(helpMethods(item.id), ["In columns"], item.id);
    const num = (r: string) => Number(r.replace(/[\s+−]/g, "")), dash = rows.findIndex((r) => /^-+$/.test(r));
    assert.ok(Math.abs(num(rows[dash - 2]) - Number(m[1])) < 1e-9 && Math.abs(num(rows[dash - 1]) - Number(m[3])) < 1e-9, `${item.id}: the two numbers are written as given`);
    assert.ok(Math.abs(num(rows[dash + 1]) - Number(q.answer)) < 1e-9, `${item.id}: bottom line ${rows[dash + 1]} is not ${q.answer}`);
    const at = [rows[dash - 2], rows[dash - 1], rows[dash + 1]].map((r) => r.indexOf("."));
    assert.ok(at[0] > 0 && at[0] === at[1] && at[1] === at[2], `${item.id}: the points are in one column\n${rows.join("\n")}`);
    assert.ok(new Set(rows.slice(dash - 2).map((r) => r.length)).size === 1, `${item.id}: the columns line up`);
    for (const s of h.slice(0, -1)) for (const b of [s.board]) if (b) { const d = b.findIndex((r) => /^-+$/.test(r)), p = b[d + 1].indexOf("."); assert.ok(p < 0 || p === at[0], `${item.id}: a point moved`); }
    if (/Fill the gap/.test(h[0].shown)) filled++;
    if (m[2] === "+" && !shownAdd) { shownAdd = true; console.log(item.prompt + "\n" + rows.join("\n")); }
  }
  console.log(n, "decimal layouts,", filled, "with zeros filled in");
  assert.ok(n > 350 && filled > 100, `${n} ${filled}`);
});

test("mixed numbers, improper fractions and percentages: the written working ends on the answer and every line is true", () => {
  const seen: Record<string, number> = {};
  for (const f of ["agmix", "agimp", "pct"]) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const h = stepsHelp(item.id)!, q = question(item.id), ways = helpMethods(item.id);
    assert.equal(ways.length, 1, item.id);
    assert.ok(["Divide", "Whole × bottom + top", "Out of 100"].includes(ways[0]), `${item.id}: ${ways[0]}`);
    seen[ways[0]] = (seen[ways[0]] ?? 0) + 1;
    assert.equal(h.at(-1)!.board!.at(-1)!.replace(/^.*= /, ""), q.answer.replace(/,/g, ""), item.id);
    for (const s of h) {
      for (const c of s.shown.matchAll(/(\d+) × (\d+) = (\d+)/g)) assert.equal(Number(c[1]) * Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
      for (const c of s.shown.matchAll(/(\d+) \+ (\d+) = (\d+)/g)) assert.equal(Number(c[1]) + Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
      for (const c of s.shown.matchAll(/(\d+) − (\d+) = (\d+)/g)) assert.equal(Number(c[1]) - Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
      for (const c of s.shown.matchAll(/(\d+) ÷ 100 = ([\d.]+)/g)) assert.ok(Math.abs(Number(c[1]) / 100 - Number(c[2])) < 1e-9, `${item.id}: ${c[0]}`);
    }
    assert.ok(!h.slice(0, -1).some((s) => new RegExp(`(^|[^\\d/.])${q.answer}$`).test(s.shown) && q.answer.length > 3), `${item.id}: the answer is not said before the end`);
  }
  console.log(JSON.stringify(seen));
  assert.ok(seen.Divide > 200 && seen["Whole × bottom + top"] > 200 && seen["Out of 100"] > 300, JSON.stringify(seen));
});

test("type-it@1: in a long division every 'how many fit' and every 'bring down' is a number the learner enters", () => {
  let fits = 0, downs = 0, typed = 0, steps = 0;
  for (const f of ["ldiv", "avdiv"]) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id) || helpMethods(item.id)[0] !== "Long division") continue;
    const h = stepsHelp(item.id)!;
    h.forEach((s, i) => {
      steps++;
      if (s.ask || /= [\d.]+$/.test(s.shown)) typed++;
      if (/How many \d+s fit in/.test(s.next)) {
        fits++;
        assert.ok(s.ask, `${item.id}: ${s.next} has no box`);
        const top = s.board![0].trim();
        assert.equal(top.at(-1), s.ask!.value, `${item.id}: the digit entered is the digit written on top`);
        assert.ok(judge({ lead: s.ask!.lead, lhs: s.ask!.value, value: s.ask!.value }, s.ask!.value) && !judge({ lead: s.ask!.lead, lhs: s.ask!.value, value: s.ask!.value }, String(Number(s.ask!.value) + 1)), item.id);
      }
      if (/^Bring down/.test(s.next)) { downs++; assert.ok(s.ask && s.board!.at(-1)!.trim() === s.ask.value, `${item.id}: ${s.next} → ${s.ask?.value} is the number at the bottom of the layout`); }
      assert.ok(!(s.ask && i === h.length - 1), `${item.id}: the answer itself is entered in the answer box, not here`);
    });
  }
  console.log(`type-it@1: ${fits} fit steps and ${downs} bring-down steps entered; ${typed} of ${steps} long-division steps are typed`);
  assert.ok(fits > 2000 && downs > 1000 && typed / steps > 0.8, `${fits} ${downs} ${typed}/${steps}`);
});

test("side-answer@1: a long division can be set out with the answer at the side, with the same steps and numbers", () => {
  let n = 0;
  for (const f of ["ldiv", "avdiv"]) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id) || helpMethods(item.id)[0] !== "Long division") continue;
    n++;
    const names = helpMethods(item.id), top = stepsHelp(item.id, 0)!, side = stepsHelp(item.id, 1)!;
    assert.equal(names[1], "Answer at the side", item.id);
    assert.equal(side.length, top.length, item.id);
    side.forEach((s, i) => {
      assert.deepEqual(s.ask, top[i].ask, `${item.id}: the same number is entered`);
      assert.ok(!/\btop\b/.test(s.next + s.shown), `${item.id}: ${s.next} ${s.shown}`);
      if (!s.board) return;
      const t = top[i].board!, m = /^(\d+) \) (\d+)(?: \( (\d+))?$/.exec(s.board[0]);
      assert.ok(m, `${item.id}: ${s.board[0]}`);
      assert.equal(`${m![1]} ) ${m![2]}`, t[1], item.id);
      assert.equal(m![3] ?? "", t[0].trim(), `${item.id}: the digits at the side are the digits on top`);
      assert.deepEqual(s.board.slice(1), t.slice(2), `${item.id}: the working underneath is the same`);
    });
  }
  const three = helpMethods(pool("ldiv").items.find((x) => helpMethods(x.id)[0] === "Long division")!.id);
  assert.deepEqual(three, ["Long division", "Answer at the side", "In easy parts"]);
  console.log(n, "long divisions with both layouts");
  assert.ok(n > 1000, String(n));
});

test("facts@1: a times-table fact is reached by counting in equal jumps, and a hard one from the fives fact", () => {
  let n = 0, built = 0;
  for (const f of FAMILIES_ALL()) for (const item of pool(f).items) {
    if (/:(mc|w)$/.test(item.id)) continue;
    const m = /^(\d+) × (\d+) = \?$/.exec(item.prompt);
    if (!m || Number(m[1]) > 12 || Number(m[2]) > 12 || Number(m[1]) < 2 || Number(m[2]) < 2) continue;
    const a = Number(m[1]), b = Number(m[2]), names = helpMethods(item.id);
    assert.match(names[0], /^Count in \d+s$/, item.id);
    n++;
    names.forEach((name, k) => {
      const h = stepsHelp(item.id, k)!;
      assert.ok(h.at(-1)!.shown.endsWith(`= ${a * b}`), `${item.id} ${name}: ends on the answer`);
      assert.ok(!h.slice(0, -1).some((s) => new RegExp(`(^|[^\\d])${a * b}([^\\d]|$)`).test(s.shown)), `${item.id} ${name}: the answer is not said before the end`);
      for (const s of h) for (const c of s.shown.matchAll(/(\d+) × (\d+) = (\d+)/g)) assert.equal(Number(c[1]) * Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
      for (const s of h) for (const c of s.shown.matchAll(/(\d+) \+ (\d+) = (\d+)/g)) assert.equal(Number(c[1]) + Number(c[2]), Number(c[3]), `${item.id}: ${c[0]}`);
    });
    const jump = Number(/\d+/.exec(names[0])![0]), list = stepsHelp(item.id, 0)![0].shown.split(", ").map(Number);
    assert.ok(jump === a || jump === b, item.id);
    assert.ok(list.every((x, i) => x === jump * (i + 1)) && list.length === (a * b) / jump - 1, `${item.id}: the jumps are equal and stop one short`);
    if (names.includes("From a fact you know")) built++;
  }
  console.log(n, "table facts,", built, "also built from a fives fact");
  assert.ok(n > 150 && built > 30, `${n} ${built}`);
});
