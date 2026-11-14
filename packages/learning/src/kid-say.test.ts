/** kid-say@1: every Class 5 question reads as one short ask, invents no numbers, and its answer shape still produces an
 * answer the existing marking accepts (the maths and the marking are unchanged). */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { modules, question, isCorrect } from "./content.ts";
import { familySpec } from "./spec.ts";
import { compose, kidQuestion } from "./kid-say.ts";

const names = JSON.parse(readFileSync(new URL("../../../content/learning/short-names.v1.json", import.meta.url), "utf8")).names as Record<string, string>;
const fams = [...new Set(Object.keys(names).flatMap((c) => modules.filter((m) => m.competency === c).flatMap((m) => ((m as unknown as { pools?: { family: string }[] }).pools ?? []).map((p) => p.family))))];
const ids = fams.flatMap((f) => (familySpec(f)?.examples ?? []).slice(0, 12));
const nums = (t: string) => (t.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

describe("kid-say@1 (Class 5 child wording)", () => {
  test("covers the Class 5 families", () => {
    expect(fams.length).toBeGreaterThan(150);
    expect(ids.length).toBeGreaterThan(1000);
  });
  test("one short ask, no typing instructions, no invented numbers", () => {
    const bad: string[] = [];
    for (const id of ids) {
      const q = question(id);
      let k;
      try { k = kidQuestion(q); } catch (e) { bad.push(String(e).slice(0, 220)); continue; }
      const where = `${id}: "${k.say}"`;
      if (/Write the (answer|list|time)|for example|in brackets|Choose one|without commas|Write it like/.test(k.say)) bad.push(`instruction left in ${where}`);
      if (!k.say.trim()) bad.push(`empty ${where}`);
      const given = new Set([...nums(q.prompt), ...nums(JSON.stringify(q.figure ?? {})), 1, 2, 3, 10, 100]);
      const extra = nums(k.say).filter((n) => !given.has(n));
      if (extra.length) bad.push(`numbers ${extra} not in the question: ${where}`);
      if (words(k.say) > 40) bad.push(`${words(k.say)} words: ${where}`);
    }
    expect(bad).toEqual([]);
  });
  test("a whole number typed with commas is read as the number", () => {
    expect(compose({ kind: "box" }, ["5,07,699"], "507699", "integer")).toBe("507699");
    expect(compose({ kind: "box", before: "₹" }, ["₹ 26.60"], "26.6", "fraction")).toBe("26.60");
  });
  test("pictures that give the answer away or repeat the sentence are left out; primes typed with ×", () => {
    expect(compose({ kind: "product" }, ["11 × 3 × 3"])).toBe("(3, 3, 11)");
    const k = kidQuestion(question("gen:ajpf:99"));
    expect(k.ask.kind).toBe("product");
    expect(isCorrect(question("gen:ajpf:99"), compose(k.ask, ["3 x 3 x 11"]))).toBe(true);
    expect(kidQuestion(question("gen:aepat:21,9,8")).figure).toBeUndefined();
    expect(kidQuestion(question("gen:aeshop:11,3,17,2,2")).figure).toBeUndefined();
    expect(kidQuestion(question("gen:acgrow:2,1,7")).figure).toBeDefined();
    expect(kidQuestion(question("gen:acpaise:3,10,1")).figure).toBeDefined();
  });
  test("the answer shape gives back an answer the marking accepts", () => {
    const bad: string[] = [];
    for (const id of ids) {
      const q = question(id);
      let k;
      try { k = kidQuestion(q); } catch { continue; }
      const a = k.ask;
      if (a.kind === "box") continue;
      if (a.kind === "product") {
        const typed = q.answer.replace(/^\(|\)$/g, "").split(/,\s*/).reverse().join(" × ");
        if (!isCorrect(q, compose(a, [typed], q.answer))) bad.push(`${id}: product ${typed} not read back as ${q.answer}`);
        continue;
      }
      if (a.kind === "tap") {
        const right = a.items.filter((x) => isCorrect(q, compose(a, [x.value], q.answer)));
        if (right.length !== 1) bad.push(`${id}: ${right.length} right taps`);
      } else if (a.kind === "fields") {
        const m = q.answer.match(/^\((−?[\d.]+), (−?[\d.]+)\)$/);
        if (!m || !isCorrect(q, compose(a, [m[1], m[2]], q.answer))) bad.push(`${id}: fields do not rebuild ${q.answer}`);
      } else {
        const want = q.answer.replace(/^\(|\)$/g, "").split(/,\s*/);
        const plain = (s: string) => s.replace(/,(?=\d)/g, "");
        const byAnswer = want.map((w) => a.items.find((x) => plain(x) === w || Number(plain(x).replace("−", "-")) === Number(w.replace("−", "-"))));
        if (byAnswer.some((x) => x === undefined) || a.items.length !== want.length) bad.push(`${id}: order items ${a.items} vs answer ${q.answer}`);
        else if (!isCorrect(q, compose(a, byAnswer as string[], q.answer))) bad.push(`${id}: order does not rebuild ${q.answer}`);
        else if (isCorrect(q, compose(a, [...(byAnswer as string[])].reverse(), q.answer))) bad.push(`${id}: reversed order also marked right`);
      }
    }
    expect(bad).toEqual([]);
  });
});
