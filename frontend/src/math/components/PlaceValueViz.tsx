import type { PlaceValueParams } from "../types";

/**
 * Place-value visualization for addition/subtraction.
 *
 * Shows numbers broken into place-value columns (ones, tens, hundreds).
 * For addition, shows regrouping/carrying when applicable.
 */
export function PlaceValueViz({ params }: { params: PlaceValueParams }) {
  const { numbers, places, showRegrouping, operation } = params;

  // Break each number into place-value digits
  const breakdown = numbers.map((n) => decompose(n, places));

  // Calculate result
  const result = operation === "add" ? numbers.reduce((a, b) => a + b, 0) : numbers[0] - numbers[1];
  const resultBreakdown = decompose(result, places);

  // Detect carries for regrouping
  const carries: Record<string, number> = {};
  if (showRegrouping && operation === "add") {
    let carry = 0;
    for (const place of places) {
      const colSum = breakdown.reduce((sum, bd) => sum + (bd[place] ?? 0), 0) + carry;
      const placeMultiplier = placeValue(place);
      const nextPlaceMultiplier = placeMultiplier * 10;
      if (colSum >= nextPlaceMultiplier / placeMultiplier) {
        carry = Math.floor(colSum / 10);
        carries[place] = carry;
      } else {
        carry = 0;
      }
    }
  }

  return (
    <div className="lr-place-value" role="img" aria-label={`Place value breakdown: ${numbers.join(` ${operation === "add" ? "+" : "−"} `)} = ${result}`}>
      <table className="lr-pv-table">
        <thead>
          <tr>
            <th className="lr-pv-label" />
            {[...places].reverse().map((p) => (
              <th key={p} className="lr-pv-header">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Carry row */}
          {showRegrouping && Object.keys(carries).length > 0 && (
            <tr className="lr-pv-carry-row">
              <td className="lr-pv-label" />
              {[...places].reverse().map((p) => (
                <td key={p} className="lr-pv-carry">
                  {carries[p] ? <span className="lr-pv-carry-digit">{carries[p]}</span> : null}
                </td>
              ))}
            </tr>
          )}

          {/* Number rows */}
          {breakdown.map((bd, i) => (
            <tr key={i} className="lr-pv-number-row">
              <td className="lr-pv-label">
                {i > 0 && (operation === "add" ? "+" : "−")}
              </td>
              {[...places].reverse().map((p) => (
                <td key={p} className="lr-pv-digit">
                  <span className="lr-pv-block">{bd[p] ?? 0}</span>
                </td>
              ))}
            </tr>
          ))}

          {/* Separator */}
          <tr className="lr-pv-separator">
            <td colSpan={places.length + 1}><hr /></td>
          </tr>

          {/* Result row */}
          <tr className="lr-pv-result-row">
            <td className="lr-pv-label">=</td>
            {[...places].reverse().map((p) => (
              <td key={p} className="lr-pv-digit lr-pv-result">
                <span className="lr-pv-block lr-pv-block-result">{resultBreakdown[p] ?? 0}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Decompose a number into place-value components */
function decompose(n: number, places: string[]): Record<string, number> {
  const abs = Math.abs(n);
  const result: Record<string, number> = {};
  for (const place of places) {
    const pv = placeValue(place);
    result[place] = Math.floor(abs / pv) % 10;
  }
  return result;
}

function placeValue(place: string): number {
  switch (place) {
    case "ones": return 1;
    case "tens": return 10;
    case "hundreds": return 100;
    case "thousands": return 1000;
    case "ten-thousands": return 10000;
    default: return 1;
  }
}
