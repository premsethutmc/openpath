/**
 * Experience B — Fractions: 1/3 + 1/3
 *
 * Generates a RenderSpec for fraction addition with:
 * - Fraction bar visualization
 * - Fraction input (numerator/denominator)
 * - Step-by-step working for same-denominator addition
 * - Progressive hints
 *
 * Grading: local check only, clearly marked as demo.
 * In production, grading comes from the math engine (responsibility A).
 */
import {
  type RenderSpec,
  type FeedbackState,
  type HintSpec,
  type PresentationMode,
  type SupportedLocale,
  type FractionBarParams,
  RENDER_SCHEMA_VERSION,
} from "../types";

export interface FractionParams {
  numA: number;
  denA: number;
  numB: number;
  denB: number;
}

function buildFractionHints(p: FractionParams): HintSpec {
  const sameDen = p.denA === p.denB;
  return {
    available: true,
    totalLevels: 3,
    currentLevel: 0,
    hints: [
      {
        level: 1,
        text: sameDen
          ? "These fractions have the same denominator. You only need to add the numerators."
          : "First, find a common denominator for both fractions.",
        revealsAnswer: false,
      },
      {
        level: 2,
        text: sameDen
          ? `Add the numerators: ${p.numA} + ${p.numB} = ${p.numA + p.numB}. The denominator stays the same.`
          : `The common denominator is ${p.denA * p.denB}. Convert each fraction.`,
        math: sameDen
          ? { plain: `${p.numA}/${p.denA} + ${p.numB}/${p.denB} = ${p.numA + p.numB}/${p.denA}` }
          : { plain: `LCD = ${p.denA * p.denB}` },
        revealsAnswer: false,
      },
      {
        level: 3,
        text: sameDen
          ? `The answer is ${p.numA + p.numB}/${p.denA}.`
          : `The answer is ${p.numA * p.denB + p.numB * p.denA}/${p.denA * p.denB}.`,
        math: sameDen
          ? { plain: `${p.numA + p.numB}/${p.denA}`, latex: `\\frac{${p.numA + p.numB}}{${p.denA}}` }
          : { plain: `${p.numA * p.denB + p.numB * p.denA}/${p.denA * p.denB}` },
        revealsAnswer: true,
      },
    ],
  };
}

function buildFractionWorking(p: FractionParams) {
  const sameDen = p.denA === p.denB;
  const steps = [];

  if (sameDen) {
    steps.push({
      id: "step-check-den",
      description: "Check the denominators",
      math: {
        plain: `Both fractions have denominator ${p.denA}`,
        latex: `\\text{Both have denominator } ${p.denA}`,
      },
      verified: false, // Demo experience — not kernel-verified
    });
    steps.push({
      id: "step-add-num",
      description: "Add the numerators",
      math: {
        plain: `${p.numA} + ${p.numB} = ${p.numA + p.numB}`,
        latex: `${p.numA} + ${p.numB} = ${p.numA + p.numB}`,
      },
      verified: false,
    });
    steps.push({
      id: "step-result",
      description: "Write the result",
      math: {
        plain: `${p.numA}/${p.denA} + ${p.numB}/${p.denB} = ${p.numA + p.numB}/${p.denA}`,
        latex: `\\frac{${p.numA}}{${p.denA}} + \\frac{${p.numB}}{${p.denB}} = \\frac{${p.numA + p.numB}}{${p.denA}}`,
      },
      verified: false,
    });
  } else {
    const lcd = p.denA * p.denB;
    const newNumA = p.numA * p.denB;
    const newNumB = p.numB * p.denA;
    steps.push({
      id: "step-lcd",
      description: "Find a common denominator",
      math: {
        plain: `LCD = ${p.denA} × ${p.denB} = ${lcd}`,
        latex: `\\text{LCD} = ${p.denA} \\times ${p.denB} = ${lcd}`,
      },
      verified: false,
    });
    steps.push({
      id: "step-convert",
      description: "Convert both fractions",
      math: {
        plain: `${newNumA}/${lcd} + ${newNumB}/${lcd}`,
        latex: `\\frac{${newNumA}}{${lcd}} + \\frac{${newNumB}}{${lcd}}`,
      },
      verified: false,
    });
    steps.push({
      id: "step-result",
      description: "Add the numerators",
      math: {
        plain: `${newNumA + newNumB}/${lcd}`,
        latex: `\\frac{${newNumA + newNumB}}{${lcd}}`,
      },
      verified: false,
    });
  }

  return steps;
}

export interface FractionExperienceOptions {
  params: FractionParams;
  mode: PresentationMode;
  locale: SupportedLocale;
  feedback?: FeedbackState;
  hintLevel?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export function buildFractionSpec(opts: FractionExperienceOptions): RenderSpec {
  const { params, mode, locale, feedback, hintLevel, questionNumber, totalQuestions } = opts;
  const { numA, denA, numB, denB } = params;
  const hints = buildFractionHints(params);

  if (hintLevel !== undefined) {
    hints.currentLevel = Math.min(hintLevel, hints.totalLevels);
  }

  const panels: string[] = ["question", "input", "feedback", "hint", "nav"];
  if (mode !== "minimal") {
    panels.splice(1, 0, "visual", "working");
  }
  if (questionNumber !== undefined && totalQuestions !== undefined) {
    panels.push("progress");
  }

  const fbParams: FractionBarParams = {
    fractions: [
      { numerator: numA, denominator: denA },
      { numerator: numB, denominator: denB },
    ],
    showEquivalent: true,
    operation: "add",
  };

  const spec: RenderSpec = {
    schemaVersion: RENDER_SCHEMA_VERSION,

    question: {
      questionId: `fadd-${numA}-${denA}-${numB}-${denB}`,
      prompt: "What is",
      expression: {
        plain: `${numA}/${denA} + ${numB}/${denB}`,
        latex: `\\frac{${numA}}{${denA}} + \\frac{${numB}}{${denB}}`,
      },
      generatorRef: `gen:fadd:${numA},${denA},${numB},${denB}`,
    },

    mode,
    locale,

    layout: { panels: panels as RenderSpec["layout"]["panels"] },

    input: {
      type: "fraction",
      placeholder: "numerator/denominator",
    },

    feedback: feedback ?? { level: "none", verified: false },

    hints,

    nav: {
      canSubmit: true,
      canSkip: false,
      canGoBack: false,
      canRequestHint: hints.currentLevel < hints.totalLevels,
      canShowWorking: mode !== "minimal",
    },

    a11y: {
      questionLabel: `What is ${numA} over ${denA} plus ${numB} over ${denB}?`,
      shortcuts: [{ key: "Enter", action: "Submit answer" }],
    },
  };

  if (mode !== "minimal") {
    spec.visual = {
      type: "fraction-bar",
      params: fbParams as unknown as Record<string, unknown>,
      interactive: mode === "visual-interactive",
    };
    spec.working = {
      steps: buildFractionWorking(params),
      revealedCount: mode === "visual-interactive" ? 1 : 0,
      editable: false,
    };
  }

  if (questionNumber !== undefined && totalQuestions !== undefined) {
    spec.progress = {
      current: questionNumber,
      total: totalQuestions,
      items: Array.from({ length: totalQuestions }, (_, i) =>
        i + 1 < questionNumber ? "correct" : "pending"
      ),
    };
  }

  return spec;
}

/**
 * Grade a fraction answer. Returns feedback state.
 *
 * NOTE: This is a DEMONSTRATION grading function. In production,
 * grading comes from the math engine (responsibility A).
 * Marked as unverified to distinguish from kernel-verified results.
 */
export function gradeFraction(params: FractionParams, answer: string): FeedbackState {
  const { numA, denA, numB, denB } = params;

  // Parse answer as "num/den" or a whole number
  const parts = answer.split("/").map((s) => parseInt(s.trim(), 10));
  if (parts.some(isNaN) || parts.length === 0 || parts.length > 2) {
    return {
      level: "incorrect",
      message: "Enter your answer as a fraction, like 2/3.",
      verified: false,
    };
  }

  const ansNum = parts[0];
  const ansDen = parts.length === 2 ? parts[1] : 1;

  if (ansDen === 0) {
    return { level: "incorrect", message: "The denominator cannot be zero.", verified: false };
  }

  // Compute expected value
  const expectedNum = numA * denB + numB * denA;
  const expectedDen = denA * denB;

  // Compare by cross-multiplication to avoid floating point
  if (ansNum * expectedDen === ansDen * expectedNum) {
    return {
      level: "correct",
      message: `${numA}/${denA} + ${numB}/${denB} = ${ansNum}/${ansDen}`,
      evidence: `Fraction addition verified: ${numA}/${denA} + ${numB}/${denB} = ${ansNum}/${ansDen}`,
      verified: false, // Demo — not kernel-verified
    };
  }

  return {
    level: "incorrect",
    message: "Not quite right. Try again!",
    showCorrectAnswer: false,
    verified: false,
  };
}
