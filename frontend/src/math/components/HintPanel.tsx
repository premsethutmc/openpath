import type { HintSpec, LocaleStrings } from "../types";
import { KatexMath } from "./KatexMath";

interface HintPanelProps {
  hints: HintSpec;
  onRequestHint: () => void;
  strings: LocaleStrings;
}

export function HintPanel({ hints, onRequestHint, strings }: HintPanelProps) {
  if (!hints.available) return null;

  const shownHints = hints.hints.slice(0, hints.currentLevel);
  const canRequestMore = hints.currentLevel < hints.totalLevels;

  return (
    <section className="lr-panel lr-hints" role="region" aria-label="Hints">
      {shownHints.map((hint) => (
        <div
          key={hint.level}
          className={`lr-hint${hint.revealsAnswer ? " lr-hint-reveals" : ""}`}
        >
          <p className="lr-hint-label">
            {strings.hint} {hint.level}
            {hint.revealsAnswer && " (shows answer)"}
          </p>
          <p className="lr-hint-text">{hint.text}</p>
          {hint.math && (
            <div className="lr-hint-math">
              <KatexMath content={hint.math} />
            </div>
          )}
        </div>
      ))}

      {canRequestMore && (
        <button
          type="button"
          className="lr-hint-button"
          onClick={onRequestHint}
          aria-label={`${strings.hint} (level ${hints.currentLevel + 1} of ${hints.totalLevels})`}
        >
          {strings.hint}
          <span className="lr-hint-count">
            {hints.currentLevel}/{hints.totalLevels}
          </span>
        </button>
      )}
    </section>
  );
}
