import type { LocaleStrings } from "../types";

interface TeacherGuideProps {
  /** The guidance message to display */
  message: string;
  /** Optional secondary detail text */
  detail?: string;
  /** Tone of the guidance — changes character expression and color */
  tone?: "neutral" | "encouraging" | "celebrating" | "thinking";
  /** Whether to show the character illustration */
  showCharacter?: boolean;
  strings: LocaleStrings;
}

/**
 * Reusable teacher-guidance component.
 *
 * Displays a friendly character alongside pedagogical guidance.
 * The character's expression changes with the tone.
 * Used for hints, encouragement, and post-feedback teaching.
 *
 * This component is purely presentational — it does not make
 * pedagogical decisions or grade answers.
 */
export function TeacherGuide({
  message,
  detail,
  tone = "neutral",
  showCharacter = true,
}: TeacherGuideProps) {
  return (
    <div className={`lr-teacher lr-teacher-${tone}`} role="region" aria-label="Teacher guidance">
      {showCharacter && (
        <div className="lr-teacher-character" aria-hidden="true">
          <CharacterSVG tone={tone} />
        </div>
      )}
      <div className="lr-teacher-content">
        <p className="lr-teacher-message">{message}</p>
        {detail && <p className="lr-teacher-detail">{detail}</p>}
      </div>
    </div>
  );
}

/**
 * Inline SVG character — a friendly owl.
 * Expression changes by tone: eyes, beak, accessories.
 */
function CharacterSVG({ tone }: { tone: string }) {
  // Eye shapes by tone
  const eyeOpen = tone !== "thinking";
  const mouthHappy = tone === "celebrating" || tone === "encouraging";
  const hasSparkles = tone === "celebrating";
  const hasThinkBubble = tone === "thinking";

  return (
    <svg viewBox="0 0 80 80" width="56" height="56" className="lr-owl">
      {/* Body */}
      <ellipse cx="40" cy="48" rx="26" ry="24" fill="var(--lr-owl-body)" />
      {/* Belly */}
      <ellipse cx="40" cy="54" rx="16" ry="14" fill="var(--lr-owl-belly)" />
      {/* Left ear tuft */}
      <path d="M20 28 Q14 16 22 22 Q18 14 26 24" fill="var(--lr-owl-body)" />
      {/* Right ear tuft */}
      <path d="M60 28 Q66 16 58 22 Q62 14 54 24" fill="var(--lr-owl-body)" />
      {/* Left eye circle */}
      <circle cx="30" cy="40" r="10" fill="white" stroke="var(--lr-owl-body)" strokeWidth="1.5" />
      {/* Right eye circle */}
      <circle cx="50" cy="40" r="10" fill="white" stroke="var(--lr-owl-body)" strokeWidth="1.5" />
      {/* Pupils */}
      {eyeOpen ? (
        <>
          <circle cx="31" cy="40" r="5" fill="var(--lr-ink)" />
          <circle cx="51" cy="40" r="5" fill="var(--lr-ink)" />
          {/* Highlights */}
          <circle cx="33" cy="38" r="1.5" fill="white" />
          <circle cx="53" cy="38" r="1.5" fill="white" />
        </>
      ) : (
        <>
          {/* Thinking — half-closed eyes */}
          <path d="M25 40 Q30 43 35 40" fill="none" stroke="var(--lr-ink)" strokeWidth="2" strokeLinecap="round" />
          <path d="M45 40 Q50 43 55 40" fill="none" stroke="var(--lr-ink)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* Beak */}
      <path
        d={mouthHappy ? "M36 48 L40 54 L44 48 Z" : "M37 48 L40 52 L43 48 Z"}
        fill="var(--lr-owl-beak)"
      />
      {/* Feet */}
      <g fill="var(--lr-owl-beak)">
        <path d="M30 70 Q28 74 24 74 Q26 72 28 72 Q26 74 22 75 Q26 71 30 72 Z" />
        <path d="M50 70 Q52 74 56 74 Q54 72 52 72 Q54 74 58 75 Q54 71 50 72 Z" />
      </g>
      {/* Celebration sparkles */}
      {hasSparkles && (
        <g className="lr-sparkle">
          <polygon points="8,20 10,16 12,20 10,22" fill="var(--lr-accent)" />
          <polygon points="68,18 70,14 72,18 70,20" fill="var(--lr-carry)" />
          <polygon points="14,54 16,50 18,54 16,56" fill="var(--lr-accent)" />
        </g>
      )}
      {/* Thinking bubble */}
      {hasThinkBubble && (
        <g>
          <circle cx="66" cy="24" r="3" fill="var(--lr-hint-bg)" stroke="var(--lr-hint-border)" strokeWidth="0.8" />
          <circle cx="72" cy="16" r="5" fill="var(--lr-hint-bg)" stroke="var(--lr-hint-border)" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}
