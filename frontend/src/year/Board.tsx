/**
 * board@1: working as it is written on paper, in fixed-width rows so the columns line up.
 * bracket@1: the row of a long division that holds the divisor and the number being shared ("6 ) 348") is drawn with
 * the line over the number, joined to the bracket: the symbol a school book uses, with the answer sitting on the line.
 * Only that row is touched, and no character is added, so every column stays where it was.
 */
import React from "react";

export const DIVISION_ROW = /^(\s*\d+ \))( \d+)$/;

export function Board({ rows, label, testid }: { rows: string[]; label?: string; testid?: string }) {
  // fit@1 (found by the screen check): a layout with long lines is set a little smaller so it is never cut off on a phone
  rows = rows.filter((r) => typeof r === "string");
  const width = Math.max(0, ...rows.map((r) => r.length));
  return (
    <pre className={`coach-board${width > 22 ? " widest" : width > 18 ? " wide" : ""}`} aria-label={label} data-testid={testid}>
      {rows.map((r, i) => {
        const m = DIVISION_ROW.exec(r);
        return <React.Fragment key={i}>{i ? "\n" : ""}{m ? <>{m[1]}<span className="ld-bar">{m[2]}</span></> : r}</React.Fragment>;
      })}
    </pre>
  );
}
