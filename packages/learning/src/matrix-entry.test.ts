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
