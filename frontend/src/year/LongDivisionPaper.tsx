/**
 * ldiv-paper@1: the long-division layout as blank paper ("6 ) 348" with the bracket, a box for each answer digit on the
 * line, and rows of boxes underneath for the multiplying, subtracting and bringing down). It is the child's own paper:
 * nothing in it is read, checked, saved or sent, and it gives nothing away, so it is there in a test as well (where the
 * step help, which fills the layout in, is not).
 */
import { useRef, useState } from "react";

const WORK_ROWS = 6;

/** "348 ÷ 6 = ?" → { dividend: "348", divisor: "6" }; null when the question is not one written division. */
export function divisionOf(prompt: string): { dividend: string; divisor: string } | null {
  const m = prompt.replace(/(\d),(?=\d)/g, "$1").match(/(\d+)\s*÷\s*(\d+)/);
  return m && m[1].length <= 8 && m[2].length <= 3 ? { dividend: m[1], divisor: m[2] } : null;
}

export function LongDivisionPaper({ dividend, divisor }: { dividend: string; divisor: string }) {
  const n = dividend.length, rows = WORK_ROWS + 1; // the answer row, then the work rows
  const [cells, setCells] = useState<string[]>(() => Array(rows * n).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const put = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setCells((c) => c.map((x, k) => (k === i ? d : x)));
    // a digit typed moves on to the box on its right, as the pencil would
    if (d && (i + 1) % n !== 0) boxes.current[i + 1]?.focus();
  };
  const box = (i: number, label: string) => (
    <input key={i} ref={(el) => { boxes.current[i] = el; }} className="ldp-box" inputMode="numeric" autoComplete="off" maxLength={2}
      aria-label={label} value={cells[i]} onChange={(e) => put(i, e.target.value)} />
  );
  return (
    <div className="ldp" data-testid="long-division-paper" style={{ ["--ldp-n" as never]: n }}>
      <p className="small muted">Long division paper (only for you; it is not marked)</p>
      <div className="ldp-grid">
        <span className="ldp-side" />
        {Array.from({ length: n }, (_, c) => box(c, `Answer digit ${c + 1}`))}
        <span className="ldp-side ldp-divisor">{divisor} )</span>
        {dividend.split("").map((d, c) => <span key={`d${c}`} className="ldp-digit">{d}</span>)}
        {Array.from({ length: WORK_ROWS }, (_, r) => [
          <span key={`s${r}`} className="ldp-side">{r % 2 === 0 ? "−" : ""}</span>,
          ...Array.from({ length: n }, (_, c) => (
            <span key={`w${r}:${c}`} className={r % 2 === 0 ? "ldp-take" : undefined}>{box((r + 1) * n + c, `Working row ${r + 1}, column ${c + 1}`)}</span>
          )),
        ])}
      </div>
    </div>
  );
}
