/**
 * matrix-text@1: a matrix written in a line of text, "[[1, 2], [3, 4]]", found so it can be set out as a grid.
 *
 * Lessons, questions and options write a matrix row by row in one line, because that is how an answer is typed. Read,
 * it is far clearer as rows and columns (mirror positions, a row meeting a column). This finds each matrix in a text
 * and gives its cells in reading order. The characters between the cells (brackets, commas, the bar of an augmented
 * matrix) are kept as `hide` parts, so the words on the page stay exactly the text that was written.
 *
 * A matrix that shows how to TYPE an answer ("written as [[a, b], [c, d]]", "e.g. [[1/2, 0], [−3/2, 1]]") stays a line of
 * text: it is the form the answer box takes.
 */
export type MatrixPart = { hide: string } | { cell: string; bar?: true };
export type MatrixPiece = { text: string } | { matrix: { cols: number; rows: number; parts: MatrixPart[]; raw: string } };

const LITERAL = /\[\[[^[\]]*\](?:,\s*\[[^[\]]*\])*\]/g;
const TYPED = /(?:written as|writ(?:e|ing) (?:it|the \w+|[A-Z][ᵀ′']?|A⁻¹) as|typed|e\.g\.|for example|one row at a time:|row by row:)[^.[\]]{0,24}$/i;

function parse(raw: string): { cols: number; rows: number; parts: MatrixPart[] } | null {
  const parts: MatrixPart[] = [], counts: number[] = [];
  let hide = "", cell = "", n = 0, bar = false;
  const flush = () => { if (cell.trim()) { const lead = cell.match(/^\s*/)![0], tail = cell.match(/\s*$/)![0]; hide += lead; if (hide) parts.push({ hide }); hide = tail; parts.push(bar ? { cell: cell.trim(), bar: true } : { cell: cell.trim() }); n++; bar = false; } else hide += cell; cell = ""; };
  for (let i = 1; i < raw.length - 1; i++) {
    const ch = raw[i];
    if (ch === "[" || ch === "]" || ch === "," || ch === "|") {
      flush(); hide += ch;
      if (ch === "|") bar = true;
      if (ch === "]") { counts.push(n); n = 0; }
    } else cell += ch;
  }
  parts.unshift({ hide: "[" }); parts.push({ hide: hide + "]" });
  // merge neighbouring hidden parts
  const merged: MatrixPart[] = [];
  for (const p of parts) { const last = merged[merged.length - 1]; if ("hide" in p && last && "hide" in last) last.hide += p.hide; else merged.push({ ...p }); }
  if (!counts.length || counts[0] < 1 || counts[0] > 6 || counts.length > 6 || counts.some((c) => c !== counts[0])) return null;
  const cells = merged.filter((p): p is { cell: string; bar?: true } => "cell" in p);
  if (cells.every((c) => c.cell === "…") || cells.some((c) => c.cell.length > 14)) return null;
  return { cols: counts[0], rows: counts.length, parts: merged };
}

/** A text as pieces: plain text, and each matrix in it. The pieces' text, joined, is the text given. */
export function matrixPieces(text: string): MatrixPiece[] {
  if (!text.includes("[[")) return [{ text }];
  const out: MatrixPiece[] = [];
  let at = 0;
  for (const m of text.matchAll(LITERAL)) {
    const before = text.slice(0, m.index);
    const g = TYPED.test(before) ? null : parse(m[0]);
    if (!g) continue;
    if (m.index! > at) out.push({ text: text.slice(at, m.index) });
    out.push({ matrix: { ...g, raw: m[0] } });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
/** The text of pieces, as written. */
export const piecesText = (ps: MatrixPiece[]) => ps.map((p) => ("text" in p ? p.text : p.matrix.parts.map((q) => ("hide" in q ? q.hide : q.cell)).join(""))).join("");
