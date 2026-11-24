import { describe, expect, it } from "bun:test";
import { matrixPieces, piecesText } from "./matrix-text";
import { FAMILIES, pool } from "./families";
import { ALL_RECIPES } from "./recipe";

const grids = (t: string) => matrixPieces(t).flatMap((p) => ("matrix" in p ? [p.matrix] : []));
const cells = (t: string) => grids(t).map((g) => g.parts.flatMap((p) => ("cell" in p ? [p.cell] : [])));

describe("matrix-text@1: a matrix in a line of text is found, and the text is kept", () => {
  it("finds the rows and columns", () => {
    const g = grids("A = [[1, −4, −3], [−4, −2, 2], [2, 0, 4]]. Write A = P + Q.");
    expect(g).toHaveLength(1);
    expect([g[0].rows, g[0].cols]).toEqual([3, 3]);
    expect(cells("A = [[1, −4, −3], [−4, −2, 2], [2, 0, 4]].")[0]).toEqual(["1", "−4", "−3", "−4", "−2", "2", "2", "0", "4"]);
  });
  it("reads fractions, letters, columns and an augmented matrix", () => {
    expect(cells("[[1/2, −1], [−1/2, 2]]")[0]).toEqual(["1/2", "−1", "−1/2", "2"]);
    expect(cells("If [[x + 3, 2y], [z − 4, 7]] = [[−1, 10], [−5, 7]]")).toEqual([["x + 3", "2y", "z − 4", "7"], ["−1", "10", "−5", "7"]]);
    expect(grids("T[[6], [5]]")[0]).toMatchObject({ rows: 2, cols: 1 });
    const aug = grids("[A | B] = [[1, 1 | 5], [1, −1 | 1]]")[0];
    expect(aug).toMatchObject({ rows: 2, cols: 3 });
    expect(aug.parts.filter((p) => "cell" in p && p.bar).map((p) => ("cell" in p ? p.cell : ""))).toEqual(["5", "1"]);
  });
  it("leaves the form an answer is typed in as a line of text", () => {
    expect(grids("Find Q, written as [[a, b, c], [d, e, f], [g, h, k]].")).toHaveLength(0);
    expect(grids("(Fractions are fine as entries, e.g. [[1/2, 0], [−3/2, 1]].)")).toHaveLength(0);
    expect(grids("Write A as [[…], […]], row by row.")).toHaveLength(0);
    expect(grids("In this app a matrix is typed row by row: [[1, 2, 3], [4, 5, 6]] has first row 1, 2, 3")).toHaveLength(0);
    expect(grids("A = [[1, 2], [3, 4]] and B = [[0, 1], [1, 0]]. Find AB, written as [[a, b], [c, d]].")).toHaveLength(2);
  });
  it("leaves rows of unequal length alone", () => {
    expect(grids("[[1, 2], [3]]")).toHaveLength(0);
  });
  it("keeps every released matrix question, option and recipe text exactly as written", () => {
    let seen = 0;
    for (const f of FAMILIES.values()) {
      if (!f.domain || !/matri|determinant/.test(f.competency)) continue;
      for (const p of pool(f.id).items.slice(0, 60)) {
        for (const t of [p.prompt, String(p.answer), ...(p.options ?? [])]) { expect(piecesText(matrixPieces(t))).toBe(t); seen += grids(t).length; }
        // the matrix a question is about is set out as a grid
        if (/^[A-Z] = \[\[/.test(p.prompt)) expect(grids(p.prompt).length).toBeGreaterThan(0);
      }
    }
    expect(seen).toBeGreaterThan(1000);
    for (const r of ALL_RECIPES) for (const t of [...(r.question ?? []), ...r.name, r.choose.ask, ...r.choose.choices.flatMap((c) => [c.label, c.reply])]) expect(piecesText(matrixPieces(t))).toBe(t);
  });
});
