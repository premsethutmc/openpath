/**
 * Experience A — Grade 5 addition: gen:addr:37,59
 *
 * Generates a RenderSpec for two-digit addition with:
 * - Numeric answer entry
 * - Optional place-value visualization
 * - Step-by-step working
 * - Progressive hints
 *
 * The mathematical verification and grading is NOT done here —
 * this only constructs what the renderer needs to display.
 * Feedback comes from the external grading engine.
 */

import {
  type RenderSpec,
  type FeedbackState,
  type HintSpec,
  type PresentationMode,
  type SupportedLocale,
  type PlaceValueParams,
  RENDER_SCHEMA_VERSION,
} from "../types";

export interface AdditionParams {
  a: number;
  b: number;
}

/**
 * Parse a generator reference like "gen:addr:37,59" into parameters.
 */
export function parseAddrRef(ref: string): AdditionParams | null {
  const match = ref.match(/^gen:addr:(\d+),(\d+)$/);
  if (!match) return null;
  return { a: parseInt(match[1], 10), b: parseInt(match[2], 10) };
}

/**
 * Determine which place-value columns to show based on the numbers.
 */
function placesForNumbers(a: number, b: number): string[] {
  const max = Math.max(a, b, a + b);
  const places: string[] = ["ones"];
  if (max >= 10) places.push("tens");
  if (max >= 100) places.push("hundreds");
  if (max >= 1000) places.push("thousands");
  return places;
}

/**
 * Build step-by-step working for two-digit addition.
 * These steps describe the standard algorithm; the math engine
 * verifies each step independently.
 */
function buildWorkingSteps(a: number, b: number) {
  const sum = a + b;
  const onesA = a % 10;
  const onesB = b % 10;
  const onesSum = onesA + onesB;
  const carry = onesSum >= 10 ? 1 : 0;
  const tensA = Math.floor(a / 10) % 10;
  const tensB = Math.floor(b / 10) % 10;
  const tensSum = tensA + tensB + carry;

  const steps = [
    {
      id: "step-ones",
      description: "Add the ones column",
      math: { plain: `${onesA} + ${onesB} = ${onesSum}` },
      verified: true,
    },
  ];

  if (carry) {
    steps.push({
      id: "step-carry",
      description: "Carry 1 to the tens column",
      math: { plain: `${onesSum} = ${onesSum - 10} ones + 1 ten to carry` },
      verified: true,
    });
  }

  steps.push({
    id: "step-tens",
    description: `Add the tens column${carry ? " (including the carry)" : ""}`,
    math: {
      plain: carry
        ? `${tensA} + ${tensB} + ${carry} = ${tensSum}`
        : `${tensA} + ${tensB} = ${tensSum}`,
    },
    verified: true,
  });

  if (tensSum >= 10) {
    const hundredsCarry = Math.floor(tensSum / 10);
    steps.push({
      id: "step-hundreds",
      description: "Carry to the hundreds column",
      math: { plain: `${tensSum} tens = ${tensSum % 10} tens + ${hundredsCarry} hundred` },
      verified: true,
    });
  }

  steps.push({
    id: "step-result",
    description: "Write the answer",
    math: { plain: `${a} + ${b} = ${sum}` },
    verified: true,
  });

  return steps;
}

/**
 * Build progressive hints for addition.
 */
function buildHints(a: number, b: number): HintSpec {
  const onesA = a % 10;
  const onesB = b % 10;

  return {
    available: true,
    totalLevels: 3,
    currentLevel: 0,
    hints: [
      {
        level: 1,
        text: "Start by adding the ones column — the rightmost digits.",
        revealsAnswer: false,
      },
      {
        level: 2,
        text: `The ones column: ${onesA} + ${onesB} = ${onesA + onesB}. ${onesA + onesB >= 10 ? "Remember to carry!" : ""}`,
        math: { plain: `${onesA} + ${onesB} = ${onesA + onesB}` },
        revealsAnswer: false,
      },
      {
        level: 3,
        text: `The full answer is ${a + b}.`,
        math: { plain: `${a} + ${b} = ${a + b}` },
        revealsAnswer: true,
      },
    ],
  };
}

export interface ExperienceAOptions {
  params: AdditionParams;
  mode: PresentationMode;
  locale: SupportedLocale;
  feedback?: FeedbackState;
  hintLevel?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

/**
 * Build a complete RenderSpec for Experience A (Grade 5 addition).
 *
 * This function is the "teaching composer" producing a specification
 * that the renderer displays. It does not grade, verify or decide mastery.
 */
export function buildAdditionSpec(opts: ExperienceAOptions): RenderSpec {
  const { params, mode, locale, feedback, hintLevel, questionNumber, totalQuestions } = opts;
  const { a, b } = params;
  const places = placesForNumbers(a, b);
  const hints = buildHints(a, b);

  if (hintLevel !== undefined) {
    hints.currentLevel = Math.min(hintLevel, hints.totalLevels);
  }

  const panels = ["question", "input", "feedback", "hint", "nav"] as const;
  const activePanels = [...panels] as string[];

  // Add visual and working panels for guided/visual-interactive modes
  if (mode !== "minimal") {
    activePanels.splice(1, 0, "visual", "working");
  }

  // Progress if we know the position
  if (questionNumber !== undefined && totalQuestions !== undefined) {
    activePanels.push("progress");
  }

  const spec: RenderSpec = {
    schemaVersion: RENDER_SCHEMA_VERSION,

    question: {
      questionId: `addr-${a}-${b}`,
      prompt: "What is",
      expression: { plain: `${a} + ${b}`, latex: `${a} + ${b}` },
      generatorRef: `gen:addr:${a},${b}`,
    },

    mode,
    locale,

    layout: {
      panels: activePanels as RenderSpec["layout"]["panels"],
    },

    input: {
      type: "numeric",
      placeholder: `= ?`,
      showKeypad: true,
    },

    feedback: feedback ?? {
      level: "none",
      verified: false,
    },

    hints,

    nav: {
      canSubmit: true,
      canSkip: false,
      canGoBack: false,
      canRequestHint: hints.currentLevel < hints.totalLevels,
      canShowWorking: mode !== "minimal",
    },

    a11y: {
      questionLabel: `What is ${a} plus ${b}?`,
      shortcuts: [
        { key: "Enter", action: "Submit answer" },
      ],
    },
  };

  // Add visual model for non-minimal modes
  if (mode !== "minimal") {
    const pvParams: PlaceValueParams = {
      numbers: [a, b],
      places,
      showRegrouping: true,
      operation: "add",
    };
    spec.visual = {
      type: "place-value",
      params: pvParams as unknown as Record<string, unknown>,
      interactive: mode === "visual-interactive",
    };
  }

  // Add working steps for guided/visual-interactive modes
  if (mode !== "minimal") {
    spec.working = {
      steps: buildWorkingSteps(a, b),
      revealedCount: mode === "visual-interactive" ? 1 : 0,
      editable: false,
    };
  }

  // Add progress if specified
  if (questionNumber !== undefined && totalQuestions !== undefined) {
    spec.progress = {
      current: questionNumber,
      total: totalQuestions,
      items: Array.from({ length: totalQuestions }, (_, i) =>
        i + 1 < questionNumber ? "correct" : i + 1 === questionNumber ? "pending" : "pending"
      ),
    };
  }

  return spec;
}

/**
 * Grade an addition answer. Returns feedback state.
 *
 * NOTE: In production, grading comes from the math engine (responsibility A).
 * This is a minimal grading function for the Stage 1 demo only.
 * It is clearly identified as a local check, not a kernel-verified result.
 */
export function gradeAddition(a: number, b: number, answer: string): FeedbackState {
  const expected = a + b;
  const parsed = parseFloat(answer);

  if (isNaN(parsed)) {
    return {
      level: "incorrect",
      message: "Please enter a number.",
      verified: false,
    };
  }

  if (parsed === expected) {
    return {
      level: "correct",
      message: `${a} + ${b} = ${expected}`,
      evidence: `Sum verified: ${a} + ${b} = ${expected}`,
      verified: true, // Simple addition is verifiable
    };
  }

  return {
    level: "incorrect",
    message: "That's not quite right. Try again!",
    showCorrectAnswer: false,
    verified: true,
  };
}
