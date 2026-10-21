import type { Module, Question, Screen } from "./content";
import type { Bug, Problem, Step, Visual } from "./family-kit";

export const TEACHING_PRESENTATION_VERSION = "openpath-teaching-presentation@1" as const;

export type TeachingVisual =
  | { kind: "place-value"; headings: string[]; rows: (string | number)[][] }
  | { kind: "number-line"; from: number; to: number; marks: number[]; jumps?: number[] }
  | { kind: "fraction-strip"; numerator: number; denominator: number; comparison?: { numerator: number; denominator: number } }
  | { kind: "cartesian-grid"; rows: (string | number)[]; columns: (string | number)[] }
  | { kind: "equation"; lines: string[] }
  | { kind: "geometry"; shape: "rectangle" | "triangle" | "circle" | "generic"; labels: Record<string, string | number> };

export interface TeachingPresentationStep {
  expression: string;
  explanation: string;
}

export interface TeachingPresentation {
  version: typeof TEACHING_PRESENTATION_VERSION;
  status: "supported" | "unsupported";
  concept: string;
  objective: string;
  explanation: string[];
  workedExample: { question: string; steps: TeachingPresentationStep[] } | null;
  visual?: TeachingVisual;
  misconception?: { id: string; explanation: string };
  practice: { competency: string; families: string[]; questionIds: string[] };
  unsupportedReason?: string;
}

const shown = (value: unknown) => Array.isArray(value) ? value.join(", ") : String(value).replace(/-/g, "−");
const explainOperation = (step: Step) => {
  const inputs = step.inputs.map(shown).join(" and ");
  const action: Record<string, string> = {
    add: "Add", subtract: "Subtract", multiply: "Multiply", divide: "Divide", simplify: "Simplify",
    compare: "Compare", count: "Count", measure: "Measure", solve: "Undo the operations", rewrite: "Rewrite",
  };
  return `${action[step.op] ?? "Use the rule with"} ${inputs}${inputs ? "" : " in this step"}. This gives ${shown(step.value)}.`;
};

function familyWorkedSteps(problem: Problem): TeachingPresentationStep[] {
  const [a, b, mode] = problem.params;
  if (problem.family === "aocart" || problem.family === "apcartn") {
    if (mode === 2) return [
      { expression: "n(A × B) = n(A) × n(B)", explanation: "Every choice from A pairs with every choice from B." },
      { expression: `${a * b} = ${a} × n(B)`, explanation: "Put the known sizes into the product rule." },
      { expression: `n(B) = ${a * b} ÷ ${a} = ${b}`, explanation: "Division undoes multiplication, so divide the number of pairs by the choices in A." },
    ];
    return [
      { expression: "n(A × B) = n(A) × n(B)", explanation: "Every row in the ordered-pair grid meets every column." },
      { expression: `n(A × B) = ${a} × ${b}`, explanation: `The grid has ${a} rows and ${b} columns.` },
      { expression: `n(A × B) = ${a * b}`, explanation: `The ${a * b} cells are the ${a * b} ordered pairs.` },
    ];
  }
  if (problem.family === "aiint") {
    const result = mode ? a - b : a + b;
    const movement = mode ? -b : b;
    return [
      { expression: mode ? `${shown(a)} − (${shown(b)}) = ${shown(a)} + (${shown(-b)})` : `${shown(a)} + (${shown(b)})`, explanation: mode ? "Subtracting a number means adding its opposite." : `Start at ${shown(a)} on the number line.` },
      { expression: `${shown(a)} → ${shown(result)}`, explanation: `Move ${Math.abs(movement)} places ${movement < 0 ? "left" : "right"}.` },
      { expression: `= ${shown(result)}`, explanation: `The movement ends at ${shown(result)}.` },
    ];
  }
  return problem.steps.map((step) => ({ expression: shown(step.value), explanation: explainOperation(step) }));
}

export function visualPresentation(visual: Visual | Screen["widget"] | undefined, problem?: Problem | null): TeachingVisual | undefined {
  if (!visual) return undefined;
  if (visual.type === "table" && Array.isArray(visual.head) && Array.isArray(visual.rows)) {
    return { kind: "place-value", headings: visual.head.map(String), rows: visual.rows as (string | number)[][] };
  }
  if (visual.type === "numberline") {
    return { kind: "number-line", from: Number(visual.from ?? 0), to: Number(visual.to ?? 10), marks: Array.isArray(visual.marks) ? visual.marks.map(Number) : [], ...(Array.isArray(visual.jumps) ? { jumps: visual.jumps.map(Number) } : {}) };
  }
  if ((visual.type === "strips" || visual.type === "grid") && Number(visual.cols) > 0 && Number(visual.shaded) >= 0 && (visual.type === "strips" || Number(visual.shaded) < Number(visual.cols) * Number(visual.rows ?? 1))) {
    const denominator = Number(visual.cols) * Number(visual.rows ?? 1);
    return { kind: "fraction-strip", numerator: Number(visual.shaded), denominator };
  }
  if (visual.type === "shape" || visual.type === "triangle" || visual.type === "circle") {
    const shape = visual.type === "triangle" || visual.type === "circle" ? visual.type : visual.shape === "rectangle" ? "rectangle" : "generic";
    const labels = Object.fromEntries(Object.entries(visual).filter(([key, value]) => key !== "type" && (typeof value === "string" || typeof value === "number"))) as Record<string, string | number>;
    return { kind: "geometry", shape, labels };
  }
  if (problem?.steps.some((step) => step.op === "solve" || step.op === "rewrite")) {
    return { kind: "equation", lines: problem.steps.map((step) => shown(step.value)) };
  }
  return undefined;
}

/** Family data adapter. It translates parameters to presentation data; rendering stays concept-agnostic. */
export function familyTeachingVisual(problem: Problem): TeachingVisual | undefined {
  const [a, b, c, d] = problem.params;
  if (problem.family === "aocart" || problem.family === "apcartn") {
    return { kind: "cartesian-grid", rows: Array.from({ length: a || c }, (_, index) => index + 1), columns: Array.from({ length: b || d }, (_, index) => String.fromCharCode(97 + index)) };
  }
  if (problem.family === "aiint") {
    return { kind: "number-line", from: a, to: c ? a - b : a + b, marks: [a, c ? a - b : a + b] };
  }
  if (["eqfrac", "fadd", "adfcmp", "adfname", "adshade"].includes(problem.family)) {
    const numerator = Math.max(0, a);
    const denominator = Math.max(1, b);
    return { kind: "fraction-strip", numerator, denominator };
  }
  if (["lin", "ahone", "lneg"].includes(problem.family)) {
    return { kind: "equation", lines: [problem.prompt.replace(/^Solve |^Find x: /, ""), ...problem.steps.map((step) => `${step.op}: ${shown(step.value)}`)] };
  }
  if (problem.family === "aeind") {
    const value = problem.steps.reduce((total, step) => total + (typeof step.value === "number" ? step.value : 0), 0);
    return { kind: "place-value", headings: ["L", "TTh", "Th", "H", "T", "O"], rows: [String(value).padStart(6, "0").split("")] };
  }
  if (["rect", "aearea", "rperim"].includes(problem.family)) {
    return { kind: "geometry", shape: "rectangle", labels: { length: Math.max(a, b), width: Math.min(a, b), area: a * b } };
  }
  return undefined;
}

export function teachingPresentationFrom(args: {
  module: Module;
  screen: Screen;
  problem: Problem | null;
  question: Question | null;
  visual?: Visual | Screen["widget"];
  visualProblem?: Problem | null;
  practiceIds: string[];
}): TeachingPresentation {
  const { module, screen, problem, question, practiceIds } = args;
  const expressions = screen.math ?? [];
  const steps = problem ? familyWorkedSteps(problem)
    : expressions.slice(1).map((expression, index) => ({ expression, explanation: screen.text[index] ?? screen.text.at(-1) ?? "Follow this calculation." }));
  const visual = (args.visualProblem ? familyTeachingVisual(args.visualProblem) : problem ? familyTeachingVisual(problem) : undefined)
    ?? visualPresentation(args.visual ?? args.visualProblem?.figure ?? problem?.figure, args.visualProblem ?? problem)
    ?? visualPresentation(screen.widget, problem);
  const misconception: Bug | undefined = problem?.bugs.find((bug) => bug.predict !== null);
  const supported = !!problem && steps.length > 0;
  return {
    version: TEACHING_PRESENTATION_VERSION,
    status: supported ? "supported" : "unsupported",
    concept: module.title,
    objective: `Understand ${module.title.toLocaleLowerCase()} and explain each mathematical step.`,
    explanation: screen.text,
    workedExample: supported ? { question: question?.prompt ?? expressions[0] ?? problem.prompt, steps } : null,
    ...(visual ? { visual } : {}),
    ...(misconception ? { misconception: { id: misconception.id, explanation: misconception.says } } : {}),
    practice: { competency: module.competency, families: [...new Set([module.pool?.family, ...(module.pools ?? []).map((pool) => pool.family)].filter((family): family is string => !!family))], questionIds: practiceIds },
    ...(!supported ? { unsupportedReason: problem ? "This family has no ordered worked steps yet." : "No deterministic family example is available for this concept." } : {}),
  };
}
