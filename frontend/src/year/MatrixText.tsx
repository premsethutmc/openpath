/** matrix-text@1: a matrix written in a line of text, set out as rows and columns. The brackets and commas stay in the
 *  page's text (hidden from the eye only), so what is read aloud, copied or searched is the text as written. */
import type { ReactNode } from "react";
import { matrixPieces } from "../../../packages/learning/src/matrix-text";

export function mx(text: string | undefined | null): ReactNode {
  if (!text || !text.includes("[[")) return text ?? null;
  const pieces = matrixPieces(text);
  if (pieces.length === 1 && "text" in pieces[0]) return text;
  return pieces.map((p, i) => ("text" in p ? p.text : (
    <span key={i} className="mx" data-matrix={`${p.matrix.rows}x${p.matrix.cols}`} style={{ ["--mx-cols" as never]: p.matrix.cols }}>
      {p.matrix.parts.map((q, k) => ("hide" in q ? <span key={k} className="mx-h">{q.hide}</span> : <span key={k} className={q.bar ? "mx-c mx-bar" : "mx-c"}>{q.cell}</span>))}
    </span>
  )));
}
