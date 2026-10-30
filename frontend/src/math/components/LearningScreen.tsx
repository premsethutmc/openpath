import { useCallback, useRef, useState } from "react";
import type { RenderSpec, RendererEvent, PlaceValueParams, FractionBarParams } from "../types";
import type { ExperienceId, LearningState } from "../App";
import { getStrings } from "../i18n";
import { QuestionPanel } from "./QuestionPanel";
import { NumericInput } from "./NumericInput";
import { FractionInput } from "./FractionInput";
import { FeedbackPanel } from "./FeedbackPanel";
import { HintPanel } from "./HintPanel";
import { WorkingPanel } from "./WorkingPanel";
import { ProgressBar } from "./ProgressBar";
import { NavControls } from "./NavControls";
import { PlaceValueViz } from "./PlaceValueViz";
import { FractionBarViz } from "./FractionBarViz";
import { AlgebraWorkspace } from "./AlgebraWorkspace";
import { TeacherGuide } from "./TeacherGuide";
import { ChoiceInput } from "./ChoiceInput";

interface LearningScreenProps {
  spec: RenderSpec;
  onEvent: (event: RendererEvent) => void;
  learningState: LearningState;
  experienceId: ExperienceId;
}

/**
 * Three-panel learning screen renderer.
 *
 * Desktop: Left (question + illustration) | Center (dominant workspace) | Right (feedback + hints + progress)
 * Mobile: stacked vertically — question, workspace, input, feedback, hints
 *
 * Does NOT independently grade or determine mastery.
 */
export function LearningScreen({ spec, onEvent, learningState, experienceId }: LearningScreenProps) {
  const strings = getStrings(spec.locale);
  const [currentValue, setCurrentValue] = useState("");
  const startTime = useRef(Date.now());

  const ts = () => Date.now() - startTime.current;

  const handleSubmit = useCallback(() => {
    if (!currentValue.trim()) return;
    onEvent({ type: "answer_submitted", value: currentValue.trim(), timestamp: ts() });
  }, [currentValue, onEvent]);

  const handleSkip = useCallback(() => {
    onEvent({ type: "skip_requested", timestamp: ts() });
  }, [onEvent]);

  const handleBack = useCallback(() => {
    onEvent({ type: "back_requested", timestamp: ts() });
  }, [onEvent]);

  const handleHintRequest = useCallback(() => {
    onEvent({ type: "hint_requested", level: spec.hints.currentLevel + 1, timestamp: ts() });
  }, [onEvent, spec.hints.currentLevel]);

  const handleInputChange = useCallback(
    (value: string) => {
      setCurrentValue(value);
      onEvent({ type: "input_changed", value, timestamp: ts() });
    },
    [onEvent],
  );

  const handleWorkingToggle = useCallback(
    (visible: boolean) => {
      onEvent({ type: "working_toggled", visible, timestamp: ts() });
    },
    [onEvent],
  );

  const handleStepRevealed = useCallback(
    (stepId: string) => {
      onEvent({ type: "step_revealed", stepId, timestamp: ts() });
    },
    [onEvent],
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const showKeypad = spec.input.showKeypad ?? isMobile;
  const hasVisual = spec.visual && spec.layout.panels.includes("visual");
  const hasWorking = spec.working && spec.layout.panels.includes("working");
  const hasHints = spec.hints.available && spec.layout.panels.includes("hint");
  const hasProgress = spec.progress && spec.layout.panels.includes("progress");
  const hasFeedback = spec.layout.panels.includes("feedback");

  const modeClass = `lr-mode-${spec.mode}`;
  const stateClass = `lr-state-${learningState}`;

  const teacherState = getTeacherState(spec, learningState, experienceId);

  // Completed state — show full summary
  if (learningState === "completed") {
    return (
      <main className={`lr-screen ${modeClass} ${stateClass}`} lang={spec.locale} aria-label={spec.a11y.questionLabel}>
        <div className="lr-completed">
          <div className="lr-completed-header">
            <TeacherGuide
              message={spec.teacherGuide?.message ?? "Excellent work! You solved it correctly."}
              detail={spec.teacherGuide ? spec.teacherGuide.detail : spec.feedback.evidence}
              tone="celebrating"
              showCharacter={true}
              strings={strings}
            />
          </div>

          {/* Show full working in completed state */}
          {spec.working && (
            <div className="lr-completed-working">
              <h3 className="lr-completed-section-title">Complete solution</h3>
              {experienceId === "algebra" ? (
                <AlgebraWorkspace
                  steps={spec.working.steps}
                  revealedCount={spec.working.steps.length}
                />
              ) : (
                <WorkingPanel
                  working={{ ...spec.working, revealedCount: spec.working.steps.length }}
                  onStepRevealed={handleStepRevealed}
                  onToggle={handleWorkingToggle}
                  strings={strings}
                />
              )}
            </div>
          )}

          {/* Visual in completed state */}
          {hasVisual && spec.visual?.type === "fraction-bar" && (
            <div className="lr-completed-visual">
              <FractionBarViz params={spec.visual.params as unknown as FractionBarParams} />
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      className={`lr-screen ${modeClass} ${stateClass}`}
      lang={spec.locale}
      aria-label={spec.a11y.questionLabel}
    >
      {/* Progress bar — spans all columns on desktop */}
      {hasProgress && spec.progress && (
        <div className="lr-progress-row">
          <ProgressBar progress={spec.progress} strings={strings} />
        </div>
      )}

      {/* Three-panel content area */}
      <div className="lr-three-panel">
        {/* ── LEFT PANEL: Question + Illustration ── */}
        <div className="lr-panel-left">
          <QuestionPanel question={spec.question} />

          {/* Teacher guidance */}
          {spec.mode !== "minimal" && teacherState && (
            <TeacherGuide
              message={teacherState.message}
              detail={teacherState.detail}
              tone={teacherState.tone}
              showCharacter={true}
              strings={strings}
            />
          )}

          {/* Illustration / visual for the problem (small version in left panel on desktop) */}
          {hasVisual && spec.visual?.type === "place-value" && (
            <div className="lr-left-visual">
              <PlaceValueViz params={spec.visual.params as unknown as PlaceValueParams} />
            </div>
          )}
          {hasVisual && spec.visual?.type === "fraction-bar" && (
            <div className="lr-left-visual">
              <FractionBarViz params={spec.visual.params as unknown as FractionBarParams} />
            </div>
          )}
        </div>

        {/* ── CENTER PANEL: Dominant workspace ── */}
        <div className="lr-panel-center">
          {/* Working steps — primary workspace content */}
          {hasWorking && spec.working && experienceId === "algebra" && (
            <div className="lr-workspace-section">
              <AlgebraWorkspace
                steps={spec.working.steps}
                revealedCount={
                  learningState === "feedback"
                    ? spec.working.steps.length
                    : Math.max(spec.working.revealedCount, 1)
                }
              />
            </div>
          )}

          {hasWorking && spec.working && experienceId !== "algebra" && (
            <div className="lr-workspace-section">
              <WorkingPanel
                working={spec.working}
                onStepRevealed={handleStepRevealed}
                onToggle={handleWorkingToggle}
                strings={strings}
              />
            </div>
          )}

          {/* Input area — center of workspace */}
          {spec.layout.panels.includes("input") && (
            <div className="lr-workspace-input">
              {spec.input.type === "multiple-choice" ? (
                <ChoiceInput choices={spec.input.choices} disabled={spec.feedback.level === "correct"} onChange={handleInputChange} />
              ) : spec.input.type === "fraction" ? (
                <FractionInput
                  placeholder={spec.input.placeholder}
                  disabled={spec.feedback.level === "correct"}
                  onSubmit={(v) => {
                    setCurrentValue(v);
                    onEvent({ type: "answer_submitted", value: v, timestamp: ts() });
                  }}
                  onChange={handleInputChange}
                  strings={strings}
                />
              ) : (
                <NumericInput
                  placeholder={spec.input.placeholder}
                  showKeypad={showKeypad}
                  disabled={spec.feedback.level === "correct"}
                  onSubmit={(v) => {
                    setCurrentValue(v);
                    onEvent({ type: "answer_submitted", value: v, timestamp: ts() });
                  }}
                  onChange={handleInputChange}
                  strings={strings}
                />
              )}
            </div>
          )}

          {/* Navigation controls — bottom of workspace */}
          {spec.layout.panels.includes("nav") && (
            <NavControls
              nav={{ ...spec.nav, canSubmit: spec.nav.canSubmit && currentValue.trim().length > 0 }}
              onSubmit={handleSubmit}
              onSkip={handleSkip}
              onBack={handleBack}
              strings={strings}
            />
          )}
        </div>

        {/* ── RIGHT PANEL: Feedback + Hints + Progress details ── */}
        <div className="lr-panel-right">
          {/* Feedback */}
          {hasFeedback && spec.feedback.level !== "none" && (
            <FeedbackPanel feedback={spec.feedback} strings={strings} />
          )}

          {/* Hints */}
          {hasHints && (
            <HintPanel hints={spec.hints} onRequestHint={handleHintRequest} strings={strings} />
          )}

          {/* Learning state indicator */}
          <div className="lr-state-indicator">
            <div className={`lr-state-dot lr-state-dot-${learningState}`} />
            <span className="lr-state-label">
              {learningState === "independent" && "Try it yourself"}
              {learningState === "guided" && "Getting some help"}
              {learningState === "feedback" && "Reviewing your answer"}
              {(learningState as string) === "completed" && "Completed"}
            </span>
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      {spec.a11y.liveAnnouncement && (
        <div className="sr-only" role="status" aria-live="assertive">
          {spec.a11y.liveAnnouncement}
        </div>
      )}
    </main>
  );
}

/**
 * Determine teacher guidance state from spec and learning state.
 * Reads from spec — does NOT make pedagogical decisions.
 */
function getTeacherState(
  spec: RenderSpec,
  learningState: string,
  experienceId: ExperienceId,
): { message: string; detail?: string; tone: "neutral" | "encouraging" | "celebrating" | "thinking" } | null {
  if (spec.teacherGuide) return spec.teacherGuide;   // Integration M1: engine-supplied guidance replaces the demo prompts
  if (spec.feedback.level === "correct") {
    return {
      message: spec.feedback.evidence ?? "Well done!",
      detail: spec.feedback.message,
      tone: "celebrating",
    };
  }

  if (spec.feedback.level === "incorrect") {
    const detail = experienceId === "addition"
      ? "Look at the place-value chart. Start with the ones column."
      : experienceId === "fractions"
        ? "Look at the fraction bars. What happens when you add the shaded parts?"
        : "Try isolating x step by step.";
    return {
      message: spec.feedback.message ?? "Let's try again!",
      detail,
      tone: "encouraging",
    };
  }

  if (learningState === "guided" || spec.hints.currentLevel > 0) {
    return {
      message: "Take your time. Use the hints if you need them.",
      tone: "thinking",
    };
  }

  // Default prompt per experience
  const prompts: Record<ExperienceId, string> = {
    addition: "Break the numbers into ones and tens, then add each column.",
    fractions: "Look at the fraction bars. What do you notice about the denominators?",
    algebra: "What operation will isolate x on one side of the equation?",
  };

  return { message: prompts[experienceId], tone: "neutral" };
}
