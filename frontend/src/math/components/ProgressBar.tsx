import type { ProgressSpec, LocaleStrings } from "../types";

interface ProgressBarProps {
  progress: ProgressSpec;
  strings: LocaleStrings;
}

export function ProgressBar({ progress, strings }: ProgressBarProps) {
  return (
    <div className="lr-progress" role="navigation" aria-label={strings.questionOf(progress.current, progress.total)}>
      <span className="lr-progress-label">{strings.questionOf(progress.current, progress.total)}</span>
      <div className="lr-progress-dots">
        {progress.items.map((status, i) => (
          <span
            key={i}
            className={`lr-progress-dot lr-progress-${status}${i + 1 === progress.current ? " lr-progress-current" : ""}`}
            aria-label={`Question ${i + 1}: ${status}`}
          />
        ))}
      </div>
    </div>
  );
}
