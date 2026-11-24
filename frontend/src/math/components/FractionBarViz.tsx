/**
 * Fraction bar visualization — interactive SVG representation.
 *
 * Shows fractions as colored bars divided into equal parts.
 * Supports addition, comparison, and equivalence display.
 * Pure presentational — does not make mathematical decisions.
 */
import { fractionBarsMarks } from "../../../../packages/learning/src/lesson-marks";
import { MarksSvg } from "../../year/Scene";
import type { FractionBarParams } from "../types";

export function FractionBarViz({ params }: { params: FractionBarParams }) {
  const { fractions, operation } = params;
  const d = fractionBarsMarks(params);
  return (
    <div
      className="lr-fraction-viz"
      role="img"
      aria-label={`Fraction visualization: ${fractions.map((f) => `${f.numerator}/${f.denominator}`).join(` ${operation} `)}`}
    >
      <MarksSvg viewBox={`0 0 ${d.width} ${d.height}`} width="100%" style={{ maxWidth: `${d.width}px` }} marks={d.marks} />
    </div>
  );
}
