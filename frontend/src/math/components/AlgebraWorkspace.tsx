/**
 * Algebra step-by-step workspace visualization.
 *
 * Shows equation transformations as a vertical sequence of steps,
 * with each transformation labeled and color-coded.
 * Uses KaTeX for beautiful math rendering.
 *
 * Pure presentational — does not solve or verify equations.
 */
import type { WorkingStep } from "../types";
import { KatexRaw } from "./KatexMath";

interface AlgebraWorkspaceProps {
  steps: WorkingStep[];
  revealedCount: number;
}

const STEP_COLORS = [
  "var(--lr-accent, #4a8fe7)",
  "var(--lr-accent-warm, #e7824a)",
  "var(--lr-correct, #47b87a)",
  "var(--lr-accent, #4a8fe7)",
];

export function AlgebraWorkspace({ steps, revealedCount }: AlgebraWorkspaceProps) {
  const shown = steps.slice(0, revealedCount);

  return (
    <div className="lr-algebra-workspace" role="region" aria-label="Algebra workspace">
      <div className="lr-algebra-steps">
        {shown.map((step, i) => (
          <div
            key={step.id}
            className={`lr-algebra-step${i === shown.length - 1 ? " lr-algebra-step-current" : ""}`}
          >
            {/* Step label */}
            <div
              className="lr-algebra-step-label"
              style={{ borderLeftColor: STEP_COLORS[i % STEP_COLORS.length] }}
            >
              <span className="lr-algebra-step-num">{i + 1}</span>
              <span className="lr-algebra-step-desc">{step.description}</span>
              {!step.verified && (
                <span className="lr-algebra-unverified" role="note">{step.badge ?? "demo"}</span>
              )}
            </div>
            {/* Math expression */}
            {(step.math.latex ?? step.math.plain) && (<div className="lr-algebra-step-math">
              <KatexRaw latex={step.math.latex ?? step.math.plain} display={true} />
            </div>)}
            {/* Arrow to next step */}
            {i < shown.length - 1 && (
              <div className="lr-algebra-arrow" aria-hidden="true">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
