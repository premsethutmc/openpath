import { useCallback, useReducer } from "react";
import type { RendererEvent, FeedbackState, PresentationMode, SupportedLocale } from "./types";
import { LearningScreen } from "./components/LearningScreen";
import {
  type AdditionParams,
  buildAdditionSpec,
  gradeAddition,
} from "./experiences/addition";

// ── State management ────────────────────────────────────────────────────────

interface AppState {
  params: AdditionParams;
  mode: PresentationMode;
  locale: SupportedLocale;
  feedback: FeedbackState;
  hintLevel: number;
  events: RendererEvent[];
  attempts: number;
}

type Action =
  | { type: "answer_submitted"; value: string }
  | { type: "hint_requested"; level: number }
  | { type: "mode_changed"; mode: PresentationMode }
  | { type: "locale_changed"; locale: SupportedLocale }
  | { type: "reset" }
  | { type: "event_recorded"; event: RendererEvent };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "answer_submitted": {
      const fb = gradeAddition(state.params.a, state.params.b, action.value);
      return {
        ...state,
        feedback: fb,
        attempts: state.attempts + 1,
      };
    }
    case "hint_requested": {
      return {
        ...state,
        hintLevel: Math.min(action.level, 3),
      };
    }
    case "mode_changed":
      return { ...state, mode: action.mode, feedback: { level: "none", verified: false } };
    case "locale_changed":
      return { ...state, locale: action.locale };
    case "reset":
      return { ...initialState, params: state.params, mode: state.mode, locale: state.locale };
    case "event_recorded":
      return { ...state, events: [...state.events, action.event] };
    default:
      return state;
  }
}

const initialState: AppState = {
  params: { a: 37, b: 59 },
  mode: "guided",
  locale: "en",
  feedback: { level: "none", verified: false },
  hintLevel: 0,
  events: [],
  attempts: 0,
};

// ── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleEvent = useCallback(
    (event: RendererEvent) => {
      // Record every event for the evidence trail
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

  const spec = buildAdditionSpec({
    params: state.params,
    mode: state.mode,
    locale: state.locale,
    feedback: state.feedback,
    hintLevel: state.hintLevel,
    questionNumber: 1,
    totalQuestions: 1,
  });

  return (
    <div className="math-app">
      {/* Mode & locale switcher (for demo/testing — not part of the renderer) */}
      <header className="demo-controls">
        <div className="demo-controls-inner">
          <span className="demo-title">OpenPath Math Renderer</span>
          <div className="demo-switches">
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
            {state.feedback.level !== "none" && (
              <button
                type="button"
                className="demo-reset"
                onClick={() => dispatch({ type: "reset" })}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <LearningScreen spec={spec} onEvent={handleEvent} />

      {/* Event log (for testing/demo — shows the renderer's output) */}
      {state.events.length > 0 && (
        <details className="demo-events">
          <summary>Event log ({state.events.length} events)</summary>
          <pre>{JSON.stringify(state.events, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
