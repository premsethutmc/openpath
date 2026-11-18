/** worked-out@1: the full working written for a type, proved on every one of its questions. */
import assert from "node:assert/strict";
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
      assert.ok(h.length >= 3, `${id}: ${h.length} steps`);
      // the first thing a stuck learner is told never holds the answer
      assert.ok(!new RegExp(`(^|\\D)${q.answer}(\\D|$)`).test(h[0].next) || q.answer.length === 1 || q.prompt.includes(q.answer), `${id}: ${h[0].next}`);
      assert.ok(new RegExp(`(^|\\D)${q.answer}(\\D|$)`).test(h[h.length - 1].shown), `${id}: ${h[h.length - 1].shown}`);
      for (const s of h) {
        lines++;
        if (askOf(s.shown)) boxes++;
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
  assert.deepEqual(helpMethods(id), ["Long division", "In easy parts"]);
  assert.match(stepsHelp(id, 0)![0].next, /How many 6s fit in 34/);
  assert.equal(stepsHelp(id, 1)![0].next, "First: multiply.");
  assert.equal(stepsHelp(id, 1)!.some((s) => s.board), false);
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
