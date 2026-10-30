import { useCallback, useRef, useState } from "react";
import type { RenderSpec, RendererEvent, PlaceValueParams } from "../types";
import { getStrings } from "../i18n";
import { QuestionPanel } from "./QuestionPanel";
import { NumericInput } from "./NumericInput";
import { FeedbackPanel } from "./FeedbackPanel";
import { HintPanel } from "./HintPanel";
import { WorkingPanel } from "./WorkingPanel";
import { ProgressBar } from "./ProgressBar";
import { NavControls } from "./NavControls";
import { PlaceValueViz } from "./PlaceValueViz";
import { TeacherGuide } from "./TeacherGuide";

interface LearningScreenProps {
  spec: RenderSpec;
  onEvent: (event: RendererEvent) => void;
}

/**
 * The universal learning screen renderer.
 *
 * Receives a RenderSpec and displays the appropriate components.
 * Captures student interactions and returns structured events.
 *
 * Does NOT independently grade or determine mastery.
 */
export function LearningScreen({ spec, onEvent }: LearningScreenProps) {
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

  // Determine teacher guidance tone and message based on current state
  const teacherState = getTeacherState(spec, strings);

  return (
    <main
      className={`lr-screen ${modeClass}`}
      lang={spec.locale}
      aria-label={spec.a11y.questionLabel}
    >
      {/* Progress bar */}
      {hasProgress && spec.progress && (
        <ProgressBar progress={spec.progress} strings={strings} />
      )}

      {/* Main content area — responsive grid */}
      <div className="lr-content">
        {/* Left / Top: Question + Teacher guidance */}
        <div className="lr-left">
          <QuestionPanel question={spec.question} />

          {/* Teacher guidance — contextual to current state */}
          {spec.mode !== "minimal" && teacherState && (
            <TeacherGuide
              message={teacherState.message}
              detail={teacherState.detail}
              tone={teacherState.tone}
              showCharacter={true}
              strings={strings}
            />
          )}

          {/* Hints below teacher on desktop */}
          {hasHints && (
            <HintPanel hints={spec.hints} onRequestHint={handleHintRequest} strings={strings} />
          )}
        </div>

        {/* Right / Bottom: Visual (dominant) + Working + Input + Feedback */}
        <div className="lr-right">
          {/* Place-value visualization — the dominant interactive element */}
          {hasVisual && spec.visual?.type === "place-value" && (
            <PlaceValueViz params={spec.visual.params as unknown as PlaceValueParams} />
          )}

          {/* Working steps */}
          {hasWorking && spec.working && (
            <WorkingPanel
              working={spec.working}
              onStepRevealed={handleStepRevealed}
              onToggle={handleWorkingToggle}
              strings={strings}
            />
          )}

          {/* Input area */}
          {spec.layout.panels.includes("input") && spec.input.type === "numeric" && (
            <div className="lr-panel lr-input-panel">
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
            </div>
          )}

          {/* Feedback */}
          {hasFeedback && (
            <FeedbackPanel feedback={spec.feedback} strings={strings} />
          )}
        </div>
      </div>

      {/* Navigation controls — always at bottom */}
      {spec.layout.panels.includes("nav") && (
        <NavControls
          nav={{ ...spec.nav, canSubmit: spec.nav.canSubmit && currentValue.trim().length > 0 }}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          onBack={handleBack}
          strings={strings}
        />
      )}

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
 * Determine the teacher guidance state based on the current spec.
 * Returns message, detail and tone for the TeacherGuide component.
 *
 * This function reads from the spec — it does NOT make pedagogical decisions.
 * The teaching composer (layer C) controls what appears in the spec.
 */
function getTeacherState(
  spec: RenderSpec,
  _strings: ReturnType<typeof getStrings>,
): { message: string; detail?: string; tone: "neutral" | "encouraging" | "celebrating" | "thinking" } | null {
  // After correct answer — celebrate and identify the mathematical step
  if (spec.feedback.level === "correct") {
    return {
      message: spec.feedback.evidence ?? "Well done!",
      detail: spec.feedback.message,
      tone: "celebrating",
    };
  }

  // After incorrect answer — encourage retry
  if (spec.feedback.level === "incorrect") {
    return {
      message: spec.feedback.message ?? "Let’s try again!",
      detail: "Look at the place-value chart above. Start with the ones column.",
      tone: "encouraging",
    };
  }

  // Hints are being shown — thinking mode
  if (spec.hints.currentLevel > 0) {
    return {
      message: "Take your time working through each column.",
      tone: "thinking",
    };
  }

  // Default — neutral welcome
  return {
    message: "Break the numbers into ones and tens, then add each column.",
    tone: "neutral",
  };
}
