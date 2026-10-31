/**
 * Universal Learning Screen Renderer — Rendering Contract v1
 *
 * This schema describes everything the renderer needs to display a
 * mathematical learning experience. The renderer DOES NOT:
 *   - Grade answers or determine mastery
 *   - Select teaching content or modes
 *   - Verify mathematical correctness
 *
 * Those responsibilities belong to the math engine (A), adaptive engine (B)
 * and teaching composer (C). The renderer (D) only displays and captures.
 */

// ── Schema version ──────────────────────────────────────────────────────────

export const RENDER_SCHEMA_VERSION = "1.0.0";

// ── Presentation modes ──────────────────────────────────────────────────────

/** The learning engine selects the mode. The renderer only displays it. */
export type PresentationMode = "minimal" | "guided" | "visual-interactive";

// ── Layout ──────────────────────────────────────────────────────────────────

export type LayoutBreakpoint = "mobile" | "tablet" | "desktop";

export interface LayoutSpec {
  /** Which panels are visible and in what arrangement */
  panels: PanelId[];
  /** Breakpoint hint — the renderer auto-detects but this allows override */
  preferredBreakpoint?: LayoutBreakpoint;
}

export type PanelId =
  | "question"
  | "working"
  | "input"
  | "feedback"
  | "hint"
  | "visual"
  | "progress"
  | "nav";

// ── Mathematical content ────────────────────────────────────────────────────

/** A mathematical expression for display (not for computation). */
export interface MathContent {
  /** Plain text form: "37 + 59" */
  plain: string;
  /** Optional LaTeX form for richer display: "37 + 59" */
  latex?: string;
}

export interface QuestionContent {
  /** Human-readable question text, possibly with embedded math */
  prompt: string;
  /** The mathematical expression being asked about */
  expression: MathContent;
  /** Generator reference for traceability: "gen:addr:37,59" */
  generatorRef?: string;
  /** Unique question identity — same across modes */
  questionId: string;
}

// ── Input capabilities ──────────────────────────────────────────────────────

export type InputType =
  | "numeric"        // whole number or decimal entry
  | "fraction"       // numerator/denominator entry
  | "symbolic"       // algebraic expression entry
  | "multiple-choice";

export interface InputSpec {
  type: InputType;
  /** For multiple-choice: the options */
  choices?: { id: string; label: string; mathContent?: MathContent }[];
  /** Placeholder text for text-entry inputs */
  placeholder?: string;
  /** Whether to show a numeric keypad on mobile */
  showKeypad?: boolean;
  /** D1: the text entry also takes working lines ("3x = 15; x = 5"): letters, =, ; and operators are kept, not stripped */
  acceptsWorking?: boolean;
}

// ── Visual model ────────────────────────────────────────────────────────────

export type VisualModelType =
  | "place-value"
  | "number-line"
  | "fraction-bar"
  | "array-area"
  | "geometry"
  | "coordinate-graph"
  | "data-chart";

export interface VisualModelSpec {
  type: VisualModelType;
  /** Type-specific parameters */
  params: Record<string, unknown>;
  /** Whether the learner can interact with the visual */
  interactive: boolean;
}

/** Place-value visualization parameters */
export interface PlaceValueParams {
  /** Numbers to represent in place-value form */
  numbers: number[];
  /** Which place values to show: ones, tens, hundreds, etc. */
  places: string[];
  /** Whether to show regrouping/carrying animation */
  showRegrouping: boolean;
  /** The operation being visualized */
  operation: "add" | "subtract";
}

/** Fraction bar visualization parameters */
export interface FractionBarParams {
  /** Fractions to display as bars */
  fractions: { numerator: number; denominator: number }[];
  /** Whether to show equivalent fractions */
  showEquivalent: boolean;
  /** The operation being visualized */
  operation: "add" | "subtract" | "compare" | "display";
}

// ── Step-by-step working ────────────────────────────────────────────────────

export interface WorkingStep {
  /** Unique step identifier */
  id: string;
  /** What this step does, in words: "Add the ones column" */
  description: string;
  /** The mathematical content of this step */
  math: MathContent;
  /** Whether this step has been verified by the math engine */
  verified: boolean;
  /** Integration M1: label for the unverified badge (default "demo"); engine teaching steps say "explanation" because they are not derivations. */
  badge?: string;
  /** Substeps for detailed breakdowns */
  substeps?: WorkingStep[];
}

export interface WorkingSpec {
  /** Ordered steps the learner should work through */
  steps: WorkingStep[];
  /** How many steps to reveal initially (rest are progressive) */
  revealedCount: number;
  /** Whether the learner can enter their own working */
  editable: boolean;
}

// ── Feedback ────────────────────────────────────────────────────────────────

export type FeedbackLevel = "correct" | "incorrect" | "partial" | "none";

export interface FeedbackState {
  level: FeedbackLevel;
  /** Feedback message from the grading engine */
  message?: string;
  /** Mathematical evidence for the feedback */
  evidence?: string;
  /** Whether to show the correct answer */
  showCorrectAnswer?: boolean;
  /** The correct answer (only sent when showCorrectAnswer is true) */
  correctAnswer?: MathContent;
  /** Whether this feedback is from a verified (kernel-backed) source */
  verified: boolean;
}

// ── Hints ───────────────────────────────────────────────────────────────────

export interface HintSpec {
  /** Whether hints are available for this question */
  available: boolean;
  /** How many hint levels exist */
  totalLevels: number;
  /** Current hint level (0 = no hint shown) */
  currentLevel: number;
  /** The hints to display (up to currentLevel) */
  hints: HintContent[];
}

export interface HintContent {
  level: number;
  /** Text description of the hint */
  text: string;
  /** Optional mathematical content in the hint */
  math?: MathContent;
  /** Whether this hint reveals the answer */
  revealsAnswer: boolean;
}

// ── Worked example ──────────────────────────────────────────────────────────

export interface WorkedExample {
  /** Title: "How to add two-digit numbers" */
  title: string;
  /** The example question */
  question: MathContent;
  /** Step-by-step solution */
  steps: WorkingStep[];
  /** Whether this is a verified example */
  verified: boolean;
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface ProgressSpec {
  /** Current question number (1-based) */
  current: number;
  /** Total questions in this session */
  total: number;
  /** Status of each question */
  items: ("pending" | "correct" | "incorrect" | "skipped")[];
}

// ── Navigation ──────────────────────────────────────────────────────────────

export interface NavSpec {
  canSubmit: boolean;
  canSkip: boolean;
  canGoBack: boolean;
  canRequestHint: boolean;
  canShowWorking: boolean;
  submitLabel?: string;
  /** Integration M1: engine-supplied label for the skip/continue action (the renderer's default "Skip" is wrong for "continue to the next step"). */
  skipLabel?: string;
  /** Integration M2: engine-supplied label for the back action ("Try again" for a bounded retry). */
  backLabel?: string;
}

// ── Accessibility ───────────────────────────────────────────────────────────

export interface AccessibilityMeta {
  /** ARIA label for the question */
  questionLabel: string;
  /** Announcement text for screen readers on state changes */
  liveAnnouncement?: string;
  /** Keyboard shortcut hints */
  shortcuts?: { key: string; action: string }[];
}

// ── Localization ────────────────────────────────────────────────────────────

export type SupportedLocale = "en" | "ta";

export interface LocaleStrings {
  submit: string;
  skip: string;
  hint: string;
  next: string;
  back: string;
  correct: string;
  /** D1: the verdict label for working that was looked at but not marked right or wrong (feedback level "partial") */
  notMarked?: string;
  incorrect: string;
  tryAgain: string;
  showWorking: string;
  hideWorking: string;
  enterAnswer: string;
  questionOf: (current: number, total: number) => string;
}

// ── Interaction events (renderer → application) ─────────────────────────────

export type RendererEvent =
  | { type: "answer_submitted"; value: string; timestamp: number }
  | { type: "hint_requested"; level: number; timestamp: number }
  | { type: "working_toggled"; visible: boolean; timestamp: number }
  | { type: "step_revealed"; stepId: string; timestamp: number }
  | { type: "visual_interaction"; action: string; data: Record<string, unknown>; timestamp: number }
  | { type: "skip_requested"; timestamp: number }
  | { type: "back_requested"; timestamp: number }
  | { type: "input_changed"; value: string; timestamp: number };

// ── The complete rendering specification ────────────────────────────────────

/**
 * Everything the renderer needs to display one learning screen.
 *
 * The same question is renderable in different modes without changing
 * its mathematical identity (questionId stays the same).
 */
export interface RenderSpec {
  /** Schema version for forward compatibility */
  schemaVersion: typeof RENDER_SCHEMA_VERSION;

  /** The question to display */
  question: QuestionContent;

  /** Presentation mode selected by the learning engine */
  mode: PresentationMode;

  /** Language */
  locale: SupportedLocale;

  /** Which panels to show */
  layout: LayoutSpec;

  /** How the learner enters their answer */
  input: InputSpec;

  /** Optional visual model */
  visual?: VisualModelSpec;

  /** Optional step-by-step working */
  working?: WorkingSpec;

  /** Current feedback state */
  feedback: FeedbackState;

  /** Hint availability and content */
  hints: HintSpec;

  /** Optional worked example */
  workedExample?: WorkedExample;

  /** Session progress */
  progress?: ProgressSpec;

  /** Navigation controls */
  nav: NavSpec;

  /** Accessibility metadata */
  a11y: AccessibilityMeta;

  /**
   * Integration M1: guidance text SUPPLIED by the learning engine (its reason / the selected explanation's title). When present the
   * renderer shows it verbatim instead of its built-in per-experience prompts, which are demonstration text, not engine decisions.
   */
  teacherGuide?: { message: string; detail?: string; tone: "neutral" | "encouraging" | "celebrating" | "thinking" };
}
