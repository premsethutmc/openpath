import { useState } from "react";
import type { WorkingSpec, LocaleStrings } from "../types";
import { KatexMath } from "./KatexMath";

interface WorkingPanelProps {
  working: WorkingSpec;
  onStepRevealed: (stepId: string) => void;
  onToggle: (visible: boolean) => void;
  strings: LocaleStrings;
}

export function WorkingPanel({ working, onStepRevealed, onToggle, strings }: WorkingPanelProps) {
  const [visible, setVisible] = useState(working.revealedCount > 0);
  const [revealedSteps, setRevealedSteps] = useState(working.revealedCount);

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    onToggle(next);
  };

  const revealNext = () => {
    if (revealedSteps < working.steps.length) {
      const step = working.steps[revealedSteps];
      setRevealedSteps(revealedSteps + 1);
      onStepRevealed(step.id);
    }
  };

  return (
    <section className="lr-panel lr-working" role="region" aria-label="Working">
      <button type="button" className="lr-working-toggle" onClick={toggle}>
        {visible ? strings.hideWorking : strings.showWorking}
      </button>

      {visible && (
        <ol className="lr-steps">
          {working.steps.slice(0, revealedSteps).map((step) => (
            <li key={step.id} className="lr-step">
              <p className="lr-step-desc">{step.description}</p>
              <div className="lr-step-math">
                <KatexMath content={step.math} />
              </div>
              {!step.verified && (
                <span className="lr-step-unverified" role="note">unverified</span>
              )}
            </li>
          ))}
        </ol>
      )}

      {visible && revealedSteps < working.steps.length && (
        <button type="button" className="lr-step-reveal" onClick={revealNext}>
          Show next step
        </button>
      )}
    </section>
  );
}
