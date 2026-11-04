/**
 * Fraction bar visualization — interactive SVG representation.
 *
 * Shows fractions as colored bars divided into equal parts.
 * Supports addition, comparison, and equivalence display.
 * Pure presentational — does not make mathematical decisions.
 */
import type { FractionBarParams } from "../types";

const COLORS = [
  { fill: "#4a8fe7", stroke: "#3570b8", label: "A" },
  { fill: "#e7824a", stroke: "#b86435", label: "B" },
  { fill: "#47b87a", stroke: "#358f5e", label: "Result" },
];

const BAR_HEIGHT = 48;
const BAR_GAP = 16;
const LABEL_WIDTH = 48;
const BAR_WIDTH = 280;

interface FractionInfo {
  numerator: number;
  denominator: number;
}

function FractionBar({
  fraction,
  colorIndex,
  y,
  width,
  highlight,
}: {
  fraction: FractionInfo;
  colorIndex: number;
  y: number;
  width: number;
  highlight?: number; // how many segments to highlight
}) {
  const { numerator, denominator } = fraction;
  const color = COLORS[colorIndex % COLORS.length];
  const segW = width / denominator;
  const filled = highlight ?? numerator;

  return (
    <g>
      {/* Label */}
      <text
        x={0}
        y={y + BAR_HEIGHT / 2 + 5}
        className="lr-frac-label"
        fill="var(--lr-text)"
        fontSize="15"
        fontWeight="600"
      >
        {numerator}/{denominator}
      </text>
      {/* Segments */}
      {Array.from({ length: denominator }, (_, i) => (
        <rect
          key={i}
          x={LABEL_WIDTH + i * segW}
          y={y}
          width={segW - 2}
          height={BAR_HEIGHT}
          rx={4}
          fill={i < filled ? color.fill : "var(--lr-surface-warm, #f5f0e8)"}
          stroke={i < filled ? color.stroke : "var(--lr-border, #d4c9b8)"}
          strokeWidth={1.5}
          opacity={i < filled ? 1 : 0.5}
        />
      ))}
    </g>
  );
}

export function FractionBarViz({ params }: { params: FractionBarParams }) {
  const { fractions, operation, showEquivalent } = params;
  const barCount = fractions.length + (operation === "add" ? 1 : 0);
  const totalHeight = barCount * (BAR_HEIGHT + BAR_GAP) + 24;
  const svgWidth = LABEL_WIDTH + BAR_WIDTH + 16;

  // For addition: compute result
  let resultFraction: FractionInfo | null = null;
  if (operation === "add" && fractions.length === 2) {
    const [a, b] = fractions;
    if (a.denominator === b.denominator) {
      resultFraction = { numerator: a.numerator + b.numerator, denominator: a.denominator };
    } else {
      // Cross multiply for common denominator
      const cd = a.denominator * b.denominator;
      resultFraction = {
        numerator: a.numerator * b.denominator + b.numerator * a.denominator,
        denominator: cd,
      };
    }
  }

  return (
    <div
      className="lr-fraction-viz"
      role="img"
      aria-label={`Fraction visualization: ${fractions.map((f) => `${f.numerator}/${f.denominator}`).join(` ${operation} `)}`}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${totalHeight}`}
        width="100%"
        style={{ maxWidth: `${svgWidth}px` }}
      >
        {fractions.map((f, i) => (
          <g key={i}>
            <FractionBar
              fraction={f}
              colorIndex={i}
              y={i * (BAR_HEIGHT + BAR_GAP) + 8}
              width={BAR_WIDTH}
            />
          </g>
        ))}

        {/* Operation symbol between bars */}
        {fractions.length === 2 && (
          <text
            x={svgWidth / 2}
            y={(BAR_HEIGHT + BAR_GAP) - 2}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="var(--lr-text-muted, #666)"
          >
            {operation === "add" ? "+" : operation === "subtract" ? "−" : operation === "compare" ? "vs" : ""}
          </text>
        )}

        {/* Result bar for addition */}
        {resultFraction && (
          <>
            {/* Separator line */}
            <line
              x1={LABEL_WIDTH}
              y1={fractions.length * (BAR_HEIGHT + BAR_GAP) - 4}
              x2={LABEL_WIDTH + BAR_WIDTH}
              y2={fractions.length * (BAR_HEIGHT + BAR_GAP) - 4}
              stroke="var(--lr-border-strong, #888)"
              strokeWidth={2}
            />
            <FractionBar
              fraction={resultFraction}
              colorIndex={2}
              y={fractions.length * (BAR_HEIGHT + BAR_GAP) + 8}
              width={BAR_WIDTH}
            />
            <text
              x={0}
              y={fractions.length * (BAR_HEIGHT + BAR_GAP) - 8}
              fontSize="13"
              fill="var(--lr-text-muted, #666)"
            >
              =
            </text>
          </>
        )}

        {/* Equivalent fraction note */}
        {showEquivalent && resultFraction && resultFraction.numerator > 1 && (
          <text
            x={LABEL_WIDTH + BAR_WIDTH + 8}
            y={fractions.length * (BAR_HEIGHT + BAR_GAP) + BAR_HEIGHT / 2 + 12}
            fontSize="12"
            fill="var(--lr-text-muted, #666)"
          >
            = {simplify(resultFraction.numerator, resultFraction.denominator)}
          </text>
        )}
      </svg>
    </div>
  );
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function simplify(num: number, den: number): string {
  const g = gcd(num, den);
  const sn = num / g;
  const sd = den / g;
  if (sd === 1) return `${sn}`;
  return `${sn}/${sd}`;
}
