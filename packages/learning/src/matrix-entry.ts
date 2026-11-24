/**
 * matrix-entry@1: a matrix answer built as a grid of boxes. The learner starts from one empty box, adds (or removes)
 * rows and columns to the size she thinks the answer has, and types one entry in each box. Nothing here knows the
 * answer or its size: the grid is hers. What is submitted is exactly what typing it would give: "[[1, 2], [3, 4]]".
 */
export type Grid = string[][];
export const MAX_SIDE = 4;
export const emptyGrid = (): Grid => [[""]];
export const sizeOf = (g: Grid) => ({ rows: g.length, cols: g[0].length });
export const addRow = (g: Grid): Grid => (g.length >= MAX_SIDE ? g : [...g.map((r) => [...r]), g[0].map(() => "")]);
export const addCol = (g: Grid): Grid => (g[0].length >= MAX_SIDE ? g : g.map((r) => [...r, ""]));
export const removeRow = (g: Grid): Grid => (g.length <= 1 ? g : g.slice(0, -1).map((r) => [...r]));
export const removeCol = (g: Grid): Grid => (g[0].length <= 1 ? g : g.map((r) => r.slice(0, -1)));
export const setCell = (g: Grid, i: number, j: number, v: string): Grid => g.map((r, a) => r.map((c, b) => (a === i && b === j ? v.replace(/[[\],;]/g, "") : c)));
/** Every box has something in it. */
export const filled = (g: Grid) => g.every((r) => r.every((c) => c.trim() !== ""));
/** The answer as it is typed, or "" while any box is empty (an unfinished grid is not an answer). */
export const gridText = (g: Grid) => (filled(g) ? `[[${g.map((r) => r.map((c) => c.trim()).join(", ")).join("], [")}]]` : "");
/** A typed answer back as a grid (an answer already given, shown again); null when it is not rows of equal length. */
export function gridOf(text: string): Grid | null {
  const t = text.trim();
  if (!/^\[\[[^[\]]*\](,\s*\[[^[\]]*\])*\]$/.test(t)) return null;
  const rows = [...t.matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1].split(",").map((c) => c.trim()));
  return rows.length <= MAX_SIDE && rows[0].length <= MAX_SIDE && rows.every((r) => r.length === rows[0].length && r.every((c) => c !== "")) ? rows : null;
}
