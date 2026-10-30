import { useCallback, useReducer, useState } from "react";
import type { RendererEvent, FeedbackState, PresentationMode, SupportedLocale } from "./types";
import { LearningScreen } from "./components/LearningScreen";
import {
  type AdditionParams,
  buildAdditionSpec,
  gradeAddition,
} from "./experiences/addition";
import {
  type FractionParams,
  buildFractionSpec,
  gradeFraction,
} from "./experiences/fractions";
import {
  type AlgebraParams,
  buildAlgebraSpec,
  gradeAlgebra,
} from "./experiences/algebra";

// ── Experience type ────────────────────────────────────────────────────────

export type ExperienceId = "addition" | "fractions" | "algebra";

interface ExperienceConfig {
  id: ExperienceId;
  label: string;
  description: string;
}

const EXPERIENCES: ExperienceConfig[] = [
  { id: "addition", label: "Grade 5 Addition", description: "37 + 59" },
  { id: "fractions", label: "Fractions", description: "⅓ + ⅓" },
  { id: "algebra", label: "Algebra", description: "2x + 3 = 11" },
];

// ── Learning state ─────────────────────────────────────────────────────────

export type LearningState = "independent" | "guided" | "feedback" | "completed";

// ── State management ────────────────────────────────────────────────────────

interface AppState {
  experience: ExperienceId;
  additionParams: AdditionParams;
  fractionParams: FractionParams;
  algebraParams: AlgebraParams;
  mode: PresentationMode;
  locale: SupportedLocale;
  feedback: FeedbackState;
  hintLevel: number;
  events: RendererEvent[];
  attempts: number;
  learningState: LearningState;
}

type Action =
  | { type: "answer_submitted"; value: string }
  | { type: "hint_requested"; level: number }
  | { type: "mode_changed"; mode: PresentationMode }
  | { type: "locale_changed"; locale: SupportedLocale }
  | { type: "experience_changed"; experience: ExperienceId }
  | { type: "advance_state" }
  | { type: "reset" }
  | { type: "event_recorded"; event: RendererEvent };

function gradeAnswer(state: AppState, answer: string): FeedbackState {
  switch (state.experience) {
    case "addition":
      return gradeAddition(state.additionParams.a, state.additionParams.b, answer);
    case "fractions":
      return gradeFraction(state.fractionParams, answer);
    case "algebra":
      return gradeAlgebra(state.algebraParams, answer);
    default:
      return { level: "none", verified: false };
  }
}

const initialState: AppState = {
  experience: "addition",
  additionParams: { a: 37, b: 59 },
  fractionParams: { numA: 1, denA: 3, numB: 1, denB: 3 },
  algebraParams: { a: 2, b: 3, c: 11 },
  mode: "guided",
  locale: "en",
  feedback: { level: "none", verified: false },
  hintLevel: 0,
  events: [],
  attempts: 0,
  learningState: "independent",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "answer_submitted": {
      const fb = gradeAnswer(state, action.value);
      const nextLearningState: LearningState =
        fb.level === "correct" ? "feedback" : state.learningState;
      return {
        ...state,
        feedback: fb,
        attempts: state.attempts + 1,
        learningState: nextLearningState,
      };
    }
    case "hint_requested":
      return {
        ...state,
        hintLevel: Math.min(action.level, 3),
        learningState: state.learningState === "independent" ? "guided" : state.learningState,
      };
    case "advance_state":
      if (state.learningState === "feedback") {
        return { ...state, learningState: "completed" };
      }
      return state;
    case "mode_changed":
      return { ...state, mode: action.mode, feedback: { level: "none", verified: false } };
    case "locale_changed":
      return { ...state, locale: action.locale };
    case "experience_changed":
      return {
        ...initialState,
        experience: action.experience,
        mode: state.mode,
        locale: state.locale,
      };
    case "reset":
      return {
        ...initialState,
        experience: state.experience,
        mode: state.mode,
        locale: state.locale,
      };
    case "event_recorded":
      return { ...state, events: [...state.events, action.event] };
    default:
      return state;
  }
}

// ── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [debugMode, setDebugMode] = useState(false);

  const handleEvent = useCallback(
    (event: RendererEvent) => {
      dispatch({ type: "event_recorded", event });

      switch (event.type) {
        case "answer_submitted":
          dispatch({ type: "answer_submitted", value: event.value });
          break;
        case "hint_requested":
          dispatch({ type: "hint_requested", level: event.level });
          break;
      }
    },
    [],
  );

  // Build the appropriate RenderSpec based on current experience
  const spec = (() => {
    const common = {
      mode: state.mode,
      locale: state.locale,
      feedback: state.feedback,
      hintLevel: state.hintLevel,
      questionNumber: 1,
      totalQuestions: 5,
    };

    switch (state.experience) {
      case "fractions":
        return buildFractionSpec({ params: state.fractionParams, ...common });
      case "algebra":
        return buildAlgebraSpec({ params: state.algebraParams, ...common });
      case "addition":
      default:
        return buildAdditionSpec({ params: state.additionParams, ...common });
    }
  })();

  return (
    <div className="math-app">
      {/* Experience selector tabs */}
      <nav className="lr-exp-tabs" role="tablist" aria-label="Mathematics experiences">
        {EXPERIENCES.map((exp) => (
          <button
            key={exp.id}
            type="button"
            role="tab"
            className={`lr-exp-tab${exp.id === state.experience ? " lr-exp-tab-active" : ""}`}
            aria-selected={exp.id === state.experience}
            onClick={() => dispatch({ type: "experience_changed", experience: exp.id })}
          >
            <span className="lr-exp-tab-label">{exp.label}</span>
            <span className="lr-exp-tab-desc">{exp.description}</span>
          </button>
        ))}
      </nav>

      {/* Demo badge for unverified experiences */}
      {state.experience !== "addition" && (
        <div className="lr-demo-badge" role="note">
          Demonstration only — not yet verified by the mathematical engine
        </div>
      )}

      {/* Debug controls */}
      {debugMode && (
        <header className="lr-debug-bar">
          <div className="lr-debug-bar-inner">
            <span className="lr-debug-title">Debug</span>
            <div className="lr-debug-switches">
              <label>
                Mode{" "}
                <select
                  value={state.mode}
                  onChange={(e: { target: { value: string } }) =>
                    dispatch({ type: "mode_changed", mode: e.target.value as PresentationMode })
                  }
                >
                  <option value="minimal">Minimal</option>
                  <option value="guided">Guided</option>
                  <option value="visual-interactive">Visual-Interactive</option>
                </select>
              </label>
              <label>
                Lang{" "}
                <select
                  value={state.locale}
                  onChange={(e: { target: { value: string } }) =>
                    dispatch({ type: "locale_changed", locale: e.target.value as SupportedLocale })
                  }
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ்</option>
                </select>
              </label>
              <span className="lr-debug-state">
                State: {state.learningState} | Attempts: {state.attempts}
              </span>
              <button
                type="button"
                className="lr-debug-btn"
                onClick={() => dispatch({ type: "reset" })}
              >
                Reset
              </button>
            </div>
          </div>
        </header>
      )}

      <LearningScreen
        spec={spec}
        onEvent={handleEvent}
        learningState={state.learningState}
        experienceId={state.experience}
      />

      {/* Advance button — feedback → completed */}
      {state.learningState === "feedback" && state.feedback.level === "correct" && (
        <div className="lr-advance-bar">
          <button
            type="button"
            className="lr-advance-btn"
            onClick={() => dispatch({ type: "advance_state" })}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Event log — debug only */}
      {debugMode && state.events.length > 0 && (
        <details className="lr-debug-events">
          <summary>Events ({state.events.length})</summary>
          <pre>{JSON.stringify(state.events, null, 2)}</pre>
        </details>
      )}

      {/* Debug toggle */}
      <button
        type="button"
        className="lr-debug-toggle"
        onClick={() => setDebugMode(!debugMode)}
        aria-label={debugMode ? "Hide debug controls" : "Show debug controls"}
        title={debugMode ? "Hide debug controls" : "Show debug controls"}
      >
        {debugMode ? "×" : "⚙"}
      </button>
    </div>
  );
}
