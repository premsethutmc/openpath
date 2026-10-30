/**
 * Experience C — Algebra: solve 2x + 3 = 11
 *
 * Generates a RenderSpec for solving a linear equation with:
 * - Symbolic input (text-based, MathLive unavailable)
 * - Stepwise algebra workspace
 * - Progressive hints
 *
 * DEMONSTRATION ONLY. The current engine does not verify algebraic
 * transformations. All steps are marked unverified.
 * In production, grading comes from the math engine (responsibility A).
 */
import {
  type RenderSpec,
  type FeedbackState,
  type HintSpec,
  type PresentationMode,
  type SupportedLocale,
  RENDER_SCHEMA_VERSION,
} from "../types";

export interface AlgebraParams {
  /** coefficient of x */
  a: number;
  /** constant added to ax */
  b: number;
  /** right-hand side */
  c: number;
}

/** Solve ax + b = c → x = (c - b) / a */
function solve(p: AlgebraParams): { x: number; exact: boolean } {
  const diff = p.c - p.b;
  const x = diff / p.a;
  return { x, exact: Number.isInteger(x) };
}

function buildAlgebraHints(p: AlgebraParams): HintSpec {
  const { x } = solve(p);
  return {
    available: true,
    totalLevels: 3,
    currentLevel: 0,
    hints: [
      {
        level: 1,
        text: `To isolate x, first move the constant (${p.b}) to the other side.`,
        revealsAnswer: false,
      },
      {
        level: 2,
        text: `Subtract ${p.b} from both sides: ${p.a}x = ${p.c} − ${p.b} = ${p.c - p.b}.`,
        math: {
          plain: `${p.a}x = ${p.c - p.b}`,
          latex: `${p.a}x = ${p.c - p.b}`,
        },
        revealsAnswer: false,
      },
      {
        level: 3,
        text: `Divide both sides by ${p.a}: x = ${p.c - p.b}/${p.a} = ${x}.`,
        math: {
          plain: `x = ${x}`,
          latex: `x = ${x}`,
        },
        revealsAnswer: true,
      },
    ],
  };
}

function buildAlgebraWorking(p: AlgebraParams) {
  const diff = p.c - p.b;
  const { x } = solve(p);

  return [
    {
      id: "step-original",
      description: "Start with the equation",
      math: {
        plain: `${p.a}x + ${p.b} = ${p.c}`,
        latex: `${p.a}x + ${p.b} = ${p.c}`,
      },
      verified: false, // Demo — not kernel-verified
    },
    {
      id: "step-subtract",
      description: `Subtract ${p.b} from both sides`,
      math: {
        plain: `${p.a}x + ${p.b} − ${p.b} = ${p.c} − ${p.b}`,
        latex: `${p.a}x + \\cancel{${p.b}} - \\cancel{${p.b}} = ${p.c} - ${p.b}`,
      },
      verified: false,
    },
    {
      id: "step-simplify",
      description: "Simplify",
      math: {
        plain: `${p.a}x = ${diff}`,
        latex: `${p.a}x = ${diff}`,
      },
      verified: false,
    },
    {
      id: "step-divide",
      description: `Divide both sides by ${p.a}`,
      math: {
        plain: `x = ${diff}/${p.a} = ${x}`,
        latex: `x = \\frac{${diff}}{${p.a}} = ${x}`,
      },
      verified: false,
    },
    {
      id: "step-verify",
      description: "Check: substitute back",
      math: {
        plain: `${p.a}(${x}) + ${p.b} = ${p.a * x + p.b} ✓`,
        latex: `${p.a}(${x}) + ${p.b} = ${p.a * x + p.b} \\checkmark`,
      },
      verified: false,
    },
  ];
}

export interface AlgebraExperienceOptions {
  params: AlgebraParams;
  mode: PresentationMode;
  locale: SupportedLocale;
  feedback?: FeedbackState;
  hintLevel?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export function buildAlgebraSpec(opts: AlgebraExperienceOptions): RenderSpec {
  const { params, mode, locale, feedback, hintLevel, questionNumber, totalQuestions } = opts;
  const { a, b, c } = params;
  const hints = buildAlgebraHints(params);

  if (hintLevel !== undefined) {
    hints.currentLevel = Math.min(hintLevel, hints.totalLevels);
  }

  const panels: string[] = ["question", "input", "feedback", "hint", "nav"];
  if (mode !== "minimal") {
    panels.splice(1, 0, "working");
  }
  if (questionNumber !== undefined && totalQuestions !== undefined) {
    panels.push("progress");
  }

  const spec: RenderSpec = {
    schemaVersion: RENDER_SCHEMA_VERSION,

    question: {
      questionId: `alg-${a}x+${b}=${c}`,
      prompt: "Solve for x",
      expression: {
        plain: `${a}x + ${b} = ${c}`,
        latex: `${a}x + ${b} = ${c}`,
      },
      generatorRef: `gen:alg:${a},${b},${c}`,
    },

    mode,
    locale,

    layout: { panels: panels as RenderSpec["layout"]["panels"] },

    input: {
      type: "symbolic",
      placeholder: "x = ?",
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
      questionLabel: `Solve: ${a}x plus ${b} equals ${c}`,
      shortcuts: [{ key: "Enter", action: "Submit answer" }],
    },
  };

  if (mode !== "minimal") {
    spec.working = {
      steps: buildAlgebraWorking(params),
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
 * Grade an algebra answer. Returns feedback state.
 *
 * NOTE: DEMONSTRATION ONLY. The current mathematical engine does not
 * verify algebraic transformations. This is a local check marked as
 * unverified. In production, grading comes from the math engine.
 */
export function gradeAlgebra(params: AlgebraParams, answer: string): FeedbackState {
  const { x, exact } = solve(params);

  // Parse: accept "4", "x=4", "x = 4"
  const cleaned = answer.replace(/^x\s*=\s*/i, "").trim();
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return {
      level: "incorrect",
      message: "Enter a number for x.",
      verified: false,
    };
  }

  if (parsed === x) {
    return {
      level: "correct",
      message: `${params.a}(${x}) + ${params.b} = ${params.a * x + params.b} ✓`,
      evidence: `Solution verified (demonstration): x = ${x}`,
      verified: false, // DEMO — not kernel-verified
    };
  }

  return {
    level: "incorrect",
    message: "Not quite right. Try isolating x step by step.",
    showCorrectAnswer: false,
    verified: false,
  };
}
