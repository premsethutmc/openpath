/** matrix-entry@1: a matrix answer as a grid of boxes. One empty box to start; − + at the side for columns, − + underneath
 *  for rows; one entry typed in each box. The size is the learner's own choice, so the grid never gives it away. What is
 *  sent is what typing the matrix would send. */
import { useRef, useState } from "react";
import { addCol, addRow, emptyGrid, gridOf, gridText, MAX_SIDE, removeCol, removeRow, setCell, sizeOf, type Grid } from "../../../packages/learning/src/matrix-entry";

export function MatrixAnswer({ value, setValue, disabled }: { value: string; setValue: (v: string) => void; disabled: boolean }) {
  const [grid, setGrid] = useState<Grid>(() => gridOf(value) ?? emptyGrid());
  const sent = useRef(value);
  const at = useRef<[number, number]>([0, 0]);
  // the answer was cleared or replaced from outside (a new try): start again from what it now is
  if (value !== sent.current) { sent.current = value; const g = gridOf(value) ?? emptyGrid(); if (gridText(g) !== gridText(grid) || value === "") setGrid(g); }
  const put = (g: Grid) => { setGrid(g); const t = gridText(g); sent.current = t; setValue(t); };
  const { rows, cols } = sizeOf(grid);
  const box = useRef<HTMLDivElement>(null);
  // the key adds to the box being typed in, and typing carries on there (the keyboard stays up)
  const key = (ch: string) => {
    const [i, j] = at.current;
    if (i >= rows || j >= cols) return;
    put(setCell(grid, i, j, grid[i][j] + ch));
    const el = box.current?.querySelectorAll("input")[i * cols + j];
    if (el) { el.focus(); requestAnimationFrame(() => { const n = el.value.length; el.setSelectionRange(n, n); }); }
  };
  const stay = (e: { preventDefault: () => void }) => e.preventDefault();
  return (
    <div className="mxa" role="group" aria-label={`Your answer: a matrix with ${rows} row${rows === 1 ? "" : "s"} and ${cols} column${cols === 1 ? "" : "s"}`} data-matrix-answer={`${rows}x${cols}`}>
      <div className="mxa-top">
        <div className="mxa-grid" ref={box} style={{ ["--mxa-cols" as never]: cols }}>
          {grid.map((r, i) => r.map((c, j) => (
            <input key={`${i}-${j}`} aria-label={`Row ${i + 1}, column ${j + 1}`} inputMode="text" autoComplete="off" autoCapitalize="off" size={3} value={c} disabled={disabled}
              onFocus={() => { at.current = [i, j]; }} onChange={(e) => put(setCell(grid, i, j, e.target.value))} />
          )))}
        </div>
        <div className="mxa-size" role="group" aria-label="Columns">
          <button type="button" className="secondary" aria-label="Remove a column" disabled={disabled || cols <= 1} onClick={() => put(removeCol(grid))}>−</button>
          <button type="button" className="secondary" aria-label="Add a column" disabled={disabled || cols >= MAX_SIDE} onClick={() => put(addCol(grid))}>+</button>
          <span className="mxa-cap">columns</span>
        </div>
      </div>
      <div className="mxa-size mxa-rows" role="group" aria-label="Rows">
        <button type="button" className="secondary" aria-label="Remove a row" disabled={disabled || rows <= 1} onClick={() => put(removeRow(grid))}>−</button>
        <button type="button" className="secondary" aria-label="Add a row" disabled={disabled || rows >= MAX_SIDE} onClick={() => put(addRow(grid))}>+</button>
        <span className="mxa-cap">rows</span>
      </div>
      {/* answer-keys@1: a phone's number keys hide the minus sign and the fraction bar */}
      <div className="mxa-keys">
        <span className="mxa-cap">Type:</span>
        <button type="button" className="secondary kid-key" aria-label="Type a minus sign" disabled={disabled} onPointerDown={stay} onClick={() => key("-")}>−</button>
        <button type="button" className="secondary kid-key" aria-label="Type a fraction bar" disabled={disabled} onPointerDown={stay} onClick={() => key("/")}>/</button>
        
      </div>
    </div>
  );
}
