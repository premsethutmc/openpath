import type { FeedbackState, LocaleStrings } from "../types";
import { KatexMath } from "./KatexMath";

interface FeedbackPanelProps {
  feedback: FeedbackState;
  strings: LocaleStrings;
}

export function FeedbackPanel({ feedback, strings }: FeedbackPanelProps) {
  if (feedback.level === "none") return null;

  const levelClass =
    feedback.level === "correct"
      ? "lr-feedback-correct"
      : feedback.level === "partial"
        ? "lr-feedback-partial"
        : "lr-feedback-incorrect";

  return (
    <section
      className={`lr-panel lr-feedback ${levelClass}`}
      role="status"
      aria-live="polite"
    >
      <p className="lr-feedback-verdict">
        <span className="lr-feedback-icon" aria-hidden="true">
          {feedback.level === "correct" ? "✓" : feedback.level === "partial" ? "◐" : "✗"}
        </span>
        {feedback.level === "correct" ? strings.correct : feedback.level === "partial" ? (strings.notMarked ?? "Not marked") : strings.incorrect}
      </p>

      {feedback.message && <p className="lr-feedback-message">{feedback.message}</p>}

      {/* Educational evidence — identifies the mathematical step demonstrated */}
      {feedback.evidence && (
        <div className="lr-feedback-evidence">
          {feedback.evidence}
        </div>
      )}

      {feedback.evidence && !feedback.verified && (
        <p className="lr-feedback-unverified" role="note">
          <em>Unverified explanation</em>
        </p>
      )}

      {feedback.showCorrectAnswer && feedback.correctAnswer && (
        <p className="lr-feedback-answer">
          Correct answer: <KatexMath content={feedback.correctAnswer} />
        </p>
      )}
    </section>
  );
}
