import type { Module, Question, Screen } from "./content";
import type { Bug, Problem, Step, Visual } from "./family-kit";
import { explainStep, FAMILIES } from "./families";

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

export interface TeachingScope {
  family: string | null;
  title: string;
  introduction: string | null;
  accepts: (problem: Problem) => boolean;
  strategyId?: string;
}

/** Scope comes from the module's declared pool and family metadata, never learner-facing text. */
export function teachingScopeFor(module: Module): TeachingScope {
  const family = module.pool?.family ?? module.pools?.[0]?.family ?? null;
  const def = family ? FAMILIES.get(family) : undefined;
  if (!family || !def) return { family, title: module.title, introduction: null, accepts: () => false };
  if (family === "aocart") return {
    family, title: "Counting elements in A × B", introduction: "Each element of A can be paired with each element of B. Multiplication counts all the ordered pairs.",
    accepts: (problem) => problem.family === family && problem.params[2] !== 1, strategyId: "grid",
  };
  return { family, title: def.title, introduction: def.teach?.idea ?? null, accepts: (problem) => problem.family === family };
}

const shown = (value: unknown) => Array.isArray(value) ? value.join(", ") : String(value).replace(/-/g, "−");
const explainOperation = (step: Step) => {
  const inputs = step.inputs.map(shown).join(" and ");
  const action: Record<string, string> = {
    add: "Add", subtract: "Subtract", multiply: "Multiply", divide: "Divide", simplify: "Simplify",
    compare: "Compare", count: "Count", measure: "Measure", solve: "Undo the operations", rewrite: "Rewrite",
  };
  return `${action[step.op] ?? "Use the stated operation with"} ${inputs}${inputs ? "" : " in this step"}. This gives ${shown(step.value)}.`;
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
  return problem.steps.map((step) => ({ expression: explainStep(problem, step), explanation: explainOperation(step) }));
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
    return { kind: "fraction-strip", numerator, denominator, ...(problem.family === "eqfrac" ? { comparison: { numerator: Number(problem.answer), denominator: c } } : {}) };
  }
  if (["lin", "ahone", "lneg"].includes(problem.family)) {
    return { kind: "equation", lines: [problem.prompt.replace(/^Solve |^Find x: /, ""), ...problem.steps.map((step) => `${step.op}: ${shown(step.value)}`)] };
  }
  if (problem.family === "aeind") {
    const value = Number(problem.answer);
    if (!Number.isSafeInteger(value) || value < 0 || value > 999999) return undefined;
    const places = [100000, 10000, 1000, 100, 10, 1];
    return { kind: "place-value", headings: ["L", "TTh", "Th", "H", "T", "O"], rows: [places.map((place) => Math.floor(value / place) % 10)] };
  }
  if (["rect", "aearea", "rperim"].includes(problem.family)) {
    const length = Math.max(a, b), width = Math.min(a, b);
    return { kind: "geometry", shape: "rectangle", labels: { length, width, [problem.family === "rperim" ? "perimeter" : "area"]: Number(problem.answer) } };
  }
  return undefined;
}

/** Checks every displayed mathematical claim used by the six typed adapters. */
export function validateTeachingPresentation(problem: Problem, presentation: Pick<TeachingPresentation, "workedExample" | "visual">): string[] {
  const errors: string[] = [];
  const family = FAMILIES.get(problem.family);
  const answer = Number(problem.answer);
  if (!family || !Number.isFinite(answer) || !family.validate(problem.params, answer)) errors.push("The family answer does not validate.");
  const expected = familyWorkedSteps(problem);
  if (!presentation.workedExample || presentation.workedExample.steps.length !== expected.length || expected.some((step, index) => step.expression !== presentation.workedExample?.steps[index]?.expression)) errors.push("Displayed worked steps differ from the checked family steps.");
  const visual = presentation.visual;
  if (["aeind", "aiint", "eqfrac", "aocart", "apcartn", "lin", "ahone", "lneg", "rect", "aearea", "rperim"].includes(problem.family) && !visual) errors.push("The family requires a typed teaching visual.");
  if (visual?.kind === "place-value" && Number(visual.rows[0]?.join("")) !== answer) errors.push("The place-value digits do not reconstruct the answer.");
  if (visual?.kind === "number-line" && (visual.from !== problem.params[0] || visual.to !== answer)) errors.push("The number-line endpoints do not match the problem.");
  if (visual?.kind === "fraction-strip") {
    if (!(visual.denominator > 0 && visual.numerator >= 0 && visual.numerator <= visual.denominator)) errors.push("The fraction strip is outside its whole.");
    if (visual.comparison && visual.numerator * visual.comparison.denominator !== visual.comparison.numerator * visual.denominator) errors.push("The two fraction strips are not equivalent.");
  }
  if (visual?.kind === "cartesian-grid") {
    const mode = problem.params[2];
    if (visual.rows.length !== problem.params[0] || visual.columns.length !== problem.params[1]) errors.push("The Cartesian grid dimensions do not match the sets.");
    if ((mode === 0 && visual.rows.length * visual.columns.length !== answer) || (mode === 2 && visual.columns.length !== answer)) errors.push("The Cartesian grid does not match the answer.");
  }
  if (visual?.kind === "equation" && !visual.lines.some((line) => line.includes(shown(problem.answer)))) errors.push("The equation transformations omit the checked answer.");
  if (visual?.kind === "geometry") {
    const l = Number(visual.labels.length), w = Number(visual.labels.width);
    const shownMeasure = problem.family === "rperim" ? 2 * (l + w) : l * w;
    if (shownMeasure !== answer) errors.push("The labelled dimensions do not produce the checked measure.");
  }
  return errors;
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
  const result: TeachingPresentation = {
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
  if (problem) {
    const errors = validateTeachingPresentation(problem, result);
    if (errors.length) return { ...result, status: "unsupported", workedExample: null, visual: undefined, unsupportedReason: errors.join(" ") };
  }
  return result;
}
