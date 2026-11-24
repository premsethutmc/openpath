import { describe, expect, it } from "bun:test";
import { addCol, addRow, emptyGrid, gridOf, gridText, MAX_SIDE, removeCol, removeRow, setCell, sizeOf } from "./matrix-entry";
import { FAMILIES, pool } from "./families";
import { sameAnswer } from "./answer-types";

describe("matrix-entry@1: a matrix answer built box by box", () => {
  it("starts as one empty box and grows and shrinks within 1 to 4 a side", () => {
    let g = emptyGrid();
    expect(sizeOf(g)).toEqual({ rows: 1, cols: 1 });
    expect(removeRow(g)).toBe(g); expect(removeCol(g)).toBe(g);
    for (let k = 0; k < 6; k++) g = addCol(addRow(g));
    expect(sizeOf(g)).toEqual({ rows: MAX_SIDE, cols: MAX_SIDE });
    expect(sizeOf(removeCol(removeRow(g)))).toEqual({ rows: 3, cols: 3 });
  });
  it("is an answer only when every box is filled, and then reads as typed", () => {
    let g = addCol(addRow(emptyGrid()));
    g = setCell(setCell(setCell(g, 0, 0, "1"), 0, 1, " -1/2 "), 1, 0, "0");
    expect(gridText(g)).toBe("");
    g = setCell(g, 1, 1, "3");
    expect(gridText(g)).toBe("[[1, -1/2], [0, 3]]");
    expect(setCell(g, 0, 0, "[1],")[0][0]).toBe("1");
    expect(gridOf("[[1, -1/2], [0, 3]]")).toEqual([["1", "-1/2"], ["0", "3"]]);
    expect(gridOf("[[1, 2], [3]]")).toBeNull();
    expect(gridOf("12")).toBeNull();
  });
  it("gives, for every released matrix answer, what typing it gives", () => {
    let seen = 0;
    for (const f of FAMILIES.values()) {
      if (!f.domain || f.type !== "matrix") continue;
      for (const p of pool(f.id).items.slice(0, 40)) {
        const g = gridOf(String(p.answer));
        expect(g).not.toBeNull();
        expect(sameAnswer("matrix", gridText(g!), String(p.answer))).toBe(true);
        // a wrong size is a wrong answer, not an unreadable one
        expect(sameAnswer("matrix", gridText(addRow(g!).map((r) => r.map((c) => c || "0"))), String(p.answer))).toBe(false);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(300);
  });
});

import { gridWording } from "./matrix-entry";
import { problemOf } from "./families";
import { matrixPieces } from "./matrix-text";
describe("grid-wording@1: a grid answer is not asked for in brackets", () => {
  it("leaves out only how the matrix is typed", () => {
    expect(gridWording("A = [[1, 2], [3, 4]] and B = [[0, 1], [1, 0]]. Find AB, written as [[a, b], [c, d]].")).toBe("A = [[1, 2], [3, 4]] and B = [[0, 1], [1, 0]]. Find AB.");
    expect(gridWording("A = [[1, 0, 0], [0, 1, 0], [0, 0, 2]]. Find A⁻¹, written as [[a, b, c], [d, e, f], [g, h, i]] (fractions are fine as entries).")).toBe("A = [[1, 0, 0], [0, 1, 0], [0, 0, 2]]. Find A⁻¹ (fractions are fine as entries).");
    expect(gridWording("A = [[2, 1], [1, 1]]. Find A⁻¹. (Fractions are fine as entries, e.g. [[1/2, 0], [−3/2, 1]].)")).toBe("A = [[2, 1], [1, 1]]. Find A⁻¹. (Fractions are fine as entries.)");
    expect(gridWording("Find QP, written as a column [[a], [b]].")).toBe("Find QP.");
    expect(gridWording("Write the product as [[a, b], [c, d]] (canteen P first; batter, then oil).")).toBe("Write the product (canteen P first; batter, then oil).");
    expect(gridWording("aᵢⱼ = i + j, and write its transpose Aᵀ. Write Aᵀ as [[…], […]], row by row. (Fractions are fine as entries.)")).toBe("aᵢⱼ = i + j, and write its transpose Aᵀ. (Fractions are fine as entries.)");
  });
  it("leaves no typing form in any released matrix-answer question, and keeps its numbers", () => {
    let seen = 0;
    for (const f of FAMILIES.values()) {
      if (!f.domain || f.type !== "matrix") continue;
      for (const p of pool(f.id).items) for (const t of [p.prompt, f.word ? problemOf(`${p.id}:w`)?.prompt : undefined]) {
        if (!t) continue;
        const g = gridWording(t);
        expect(g).not.toMatch(/written as (a column )?\[\[|written as a matrix|row by row|e\.g\. \[\[|\[\[[^\]]*[a-z…][^\]]*\]/);
        // every matrix of numbers in the question is still there
        const nums = (s: string) => matrixPieces(s).flatMap((x) => ("matrix" in x && !/[a-z…]/.test(x.matrix.raw) ? [x.matrix.raw] : []));
        expect(nums(g)).toEqual(nums(t));
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(5000);
  });
});
