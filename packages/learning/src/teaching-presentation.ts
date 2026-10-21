import type { Module, Question, Screen } from "./content";
import type { Bug, Def, Problem, Step, Visual } from "./family-kit";
import { explainStep, FAMILIES } from "./families";
import { graph } from "./graph";

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
  diagramUnsupported?: string;
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
const numericAnswer = (answer: string) => {
  const fraction = answer.match(/^(-?\d+)\/(-?\d+)$/);
  return fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(answer);
};
/** Generic helper competencies (like multiplication tables) don't add conceptual context. */
const HELPER_COMPETENCIES = new Set(["MATH.number.multiplication-tables", "MATH.number.exponents", "MATH.number.addition"]);

/**
 * Look up the human-readable competency name from the graph, returning "" for unknown or helper competencies.
 * Helper competencies (like "Use multiplication facts") describe a skill, not a concept being taught,
 * so they are suppressed in favour of the family's own teaching context.
 */
function competencyContext(competencyId: string): string {
  if (HELPER_COMPETENCIES.has(competencyId)) return "";
  try { return graph.get(competencyId).name; } catch { return ""; }
}

/**
 * Shared mathematical explanation engine.
 *
 * Derives WHY each step is mathematically valid from three knowledge sources
 * that already exist in the codebase:
 *
 *   1. step.op → the mathematical operation performed
 *   2. step.competency + graph → the domain-specific concept this step serves
 *   3. family.teach.idea / .method → the overarching mathematical principle
 *
 * The templates explain the reasoning behind each operation type, contextualised
 * by the competency being taught. When the step uses a generic helper competency
 * (like multiplication tables), the family's own teach.idea provides the "why".
 *
 * This single function replaces the old generic explainOperation() for all families,
 * so one architectural change improves teaching across arithmetic, fractions, algebra,
 * and geometry without per-family branches.
 */
function mathematicalExplanation(step: Step, family: Def): string {
  const concept = competencyContext(step.competency);
  const idea = family.teach?.idea ?? "";

  // Use the domain concept when it's specific, otherwise the family's teaching idea.
  // Trim long teach.idea strings to the first sentence for readability in step explanations.
  const trimmed = idea.includes(".") ? idea.slice(0, idea.indexOf(".") + 1) : idea;
  const why = concept || trimmed;

  const a = shown(step.inputs[0]), b = step.inputs.length > 1 ? shown(step.inputs[1]) : "";
  const result = shown(step.value);

  switch (step.op) {
    case "add":
      return why
        ? `${a} + ${b} = ${result} — adding combines the quantities (${why}).`
        : `${a} + ${b} = ${result}, combining the two quantities.`;
    case "subtract":
      return why
        ? `${a} − ${b} = ${result} — subtracting removes an equal amount from both sides (${why}).`
        : `${a} − ${b} = ${result}, removing ${b} from ${a}.`;
    case "multiply":
      return why
        ? `${a} × ${b} = ${result} — multiplying counts how many units fit (${why}).`
        : `${a} × ${b} = ${result}, each unit of one factor pairs with every unit of the other.`;
    case "divide":
      return why
        ? `${a} ÷ ${b} = ${result} — dividing finds how many equal groups fit (${why}).`
        : `${a} ÷ ${b} = ${result}, undoing multiplication to find the other factor.`;
    case "compare":
      return why
        ? `Comparing ${a} and ${b}: ${result} (${why}).`
        : `Comparing ${a} and ${b} gives ${result}.`;
    case "count":
      return why
        ? `Counting gives ${result} (${why}).`
        : `Counting the elements gives ${result}.`;
    case "measure":
      return why
        ? `Measuring gives ${result} (${why}).`
        : `Measuring the quantity gives ${result}.`;
    case "solve":
      return why
        ? `Isolating the unknown: ${result} (${why}).`
        : `Undoing the operations in reverse order gives ${result}.`;
    case "rewrite":
      return why
        ? `Rewriting into an equivalent form gives ${result} (${why}).`
        : `Rewriting the expression gives ${result}.`;
    case "pair":
      return why
        ? `Finding values whose product and sum match the coefficients: ${result} (${why}).`
        : `The pair that fits the coefficients: ${result}.`;
    case "evaluate":
      return why
        ? `Substituting the known values gives ${result} (${why}).`
        : `Evaluating with the known values gives ${result}.`;
    case "integrate":
      return why
        ? `The antiderivative gives ${result} (${why}).`
        : `Integrating gives ${result}.`;
    case "place": {
      const placeNames: Record<string, string> = { "1": "ones", "10": "tens", "100": "hundreds", "1000": "thousands", "10000": "ten-thousands", "100000": "lakhs" };
      const placeName = placeNames[String(step.inputs[1])] ?? `${b}-place`;
      return why
        ? `The digit ${a} in the ${placeName} place is worth ${result} (${why}).`
        : `The digit ${a} in the ${placeName} place is worth ${result}.`;
    }
    default: {
      const inputs = step.inputs.map(shown).join(" and ");
      return why
        ? `Applying ${step.op} to ${inputs} gives ${result} (${why}).`
        : `Applying ${step.op} to ${inputs} gives ${result}.`;
    }
  }
}

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
  const family = FAMILIES.get(problem.family);
  if (!family) return problem.steps.map((step) => ({ expression: explainStep(problem, step), explanation: mathematicalExplanation(step, { teach: undefined } as unknown as Def) }));
  return problem.steps.map((step) => ({ expression: explainStep(problem, step), explanation: mathematicalExplanation(step, family) }));
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
  if (problem.family === "aocart") {
    if (c === 1) return undefined;
    return { kind: "cartesian-grid", rows: Array.from({ length: a }, (_, index) => index + 1), columns: Array.from({ length: b }, (_, index) => String.fromCharCode(97 + index)) };
  }
  if (problem.family === "apcartn" && (a === 0 || a === 3)) {
    const columns = a === 0 ? c : d;
    return { kind: "cartesian-grid", rows: Array.from({ length: b }, (_, index) => index + 1), columns: Array.from({ length: columns }, (_, index) => String.fromCharCode(97 + index)) };
  }
  if (problem.family === "aiint") {
    return { kind: "number-line", from: a, to: c ? a - b : a + b, marks: [a, c ? a - b : a + b] };
  }
  if (problem.family === "eqfrac") {
    return { kind: "fraction-strip", numerator: a, denominator: b, comparison: { numerator: Number(problem.answer), denominator: c } };
  }
  if (problem.family === "adfcmp") {
    const [mode, k, x, y] = problem.params;
    const first = mode === 0 ? { numerator: x, denominator: k } : { numerator: k, denominator: x };
    const second = mode === 0 ? { numerator: y, denominator: k } : { numerator: k, denominator: y };
    return { kind: "fraction-strip", ...first, comparison: second };
  }
  if (problem.family === "adfname") {
    return { kind: "fraction-strip", numerator: c, denominator: a * b };
  }
  if (problem.family === "adshade") {
    return { kind: "fraction-strip", numerator: Number(problem.answer), denominator: a * b };
  }
  if (["lin", "ahone", "lneg"].includes(problem.family)) {
    if (problem.family === "ahone") {
      const [form, a, t] = problem.params;
      const x = form === 3 ? a * t : t;
      const right = form === 0 ? t + a : form === 1 ? t - a : form === 2 ? a * t : t;
      const original = [ `x + ${a} = ${right}`, `x − ${a} = ${right}`, `${a}x = ${right}`, `x ÷ ${a} = ${right}` ][form];
      const operation = [ `${right} − ${a}`, `${right} + ${a}`, `${right} ÷ ${a}`, `${right} × ${a}` ][form];
      return { kind: "equation", lines: [original, `x = ${operation}`, `x = ${x}`] };
    }
    const [a, b, x] = problem.params, right = a * x + b, middle = right - b;
    return { kind: "equation", lines: [`${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${right}`, `${a}x = ${right} − (${b}) = ${middle}`, `x = ${middle} ÷ ${a} = ${x}`].map((line) => line.replace(/-/g, "−")) };
  }
  if (problem.family === "aeind") {
    const value = Number(problem.answer);
    if (!Number.isSafeInteger(value) || value < 0 || value > 999999) return undefined;
    const places = [100000, 10000, 1000, 100, 10, 1];
    return { kind: "place-value", headings: ["L", "TTh", "Th", "H", "T", "O"], rows: [places.map((place) => Math.floor(value / place) % 10)] };
  }
  if (["rect", "aearea", "rperim"].includes(problem.family)) {
    const length = Math.max(a, b), width = Math.min(a, b);
    const measureUnit = problem.family === "rperim" ? "cm" : problem.family === "rect" ? "cm²" : "square units";
    const dimensionUnit = problem.family === "aearea" ? "units" : "cm";
    return { kind: "geometry", shape: "rectangle", labels: { length, width, [problem.family === "rperim" ? "perimeter" : "area"]: Number(problem.answer), dimensionUnit, measureUnit } };
  }
  return undefined;
}

export const EXPLICIT_TEACHING_FAMILIES = ["aeind", "aiint", "eqfrac", "fadd", "adfcmp", "adfname", "adshade", "aocart", "apcartn", "lin", "ahone", "lneg", "rect", "aearea", "rperim"] as const;
const explicitFamily = (family: string): family is typeof EXPLICIT_TEACHING_FAMILIES[number] => (EXPLICIT_TEACHING_FAMILIES as readonly string[]).includes(family);

function validateFamilyStructure(problem: Problem): string[] {
  const e: string[] = [];
  const p = problem.params, s = problem.steps, answer = numericAnswer(problem.answer);
  const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const stepValue = (index: number) => s[index]?.value;
  if (problem.family === "aeind") {
    const value = answer;
    const expected = [Math.floor(value / 100000) * 100000, Math.floor(value % 100000 / 1000) * 1000, value % 1000];
    if (s.length !== 3 || expected.some((valuePart, index) => stepValue(index) !== valuePart)) e.push("Place-value steps do not match the validated decimal positions.");
  } else if (problem.family === "aiint") {
    const [a, b, op] = p, result = op ? a - b : a + b;
    const last = s.at(-1);
    if (result !== answer || last?.op !== "add" || last.value !== result || Number(last.inputs[0]) + Number(last.inputs[1]) !== result) e.push("Integer movement steps do not match the operation.");
  } else if (problem.family === "eqfrac") {
    const [a, b, d] = p, k = d / b;
    if (!(b > 0 && d > 0 && Number.isInteger(k) && s[0]?.op === "divide" && s[0].value === k && s[1]?.op === "multiply" && s[1].value === a * k && a * d === b * answer)) e.push("Equivalent-fraction scaling is inconsistent.");
  } else if (problem.family === "fadd") {
    const [a, b, denominator, sign] = p, top = a + sign * b;
    if (!(denominator > 0 && s.length === 1 && s[0].value === top && answer === top / denominator)) e.push("Like-fraction operation is inconsistent.");
  } else if (problem.family === "adfcmp") {
    const [mode, k, x, y, ask] = p;
    const A = mode === 0 ? [x, k] : [k, x], B = mode === 0 ? [y, k] : [k, y];
    const chosen = A[0] * B[1] > B[0] * A[1] === !ask ? A : B;
    if (!(A[1] > 0 && B[1] > 0 && answer === chosen[0] / chosen[1])) e.push("Fraction comparison does not select the requested side.");
  } else if (problem.family === "adfname") {
    const [rows, cols, shaded] = p, total = rows * cols;
    if (!(total > 0 && shaded > 0 && shaded < total && s[0]?.value === total && answer * total === shaded)) e.push("Shaded-fraction count is inconsistent.");
  } else if (problem.family === "adshade") {
    const [rows, cols, top, bottom] = p, total = rows * cols, shaded = top * total / bottom;
    if (!(bottom > 0 && Number.isInteger(shaded) && s[0]?.value === total / bottom && s[1]?.value === shaded && answer === shaded)) e.push("Fraction-of-grid steps are inconsistent.");
  } else if (problem.family === "aocart") {
    const [m, n, mode] = p, expected = mode === 0 ? m * n : mode === 1 ? 2 ** (m * n) : n;
    if (answer !== expected || s[0]?.value !== (mode === 2 ? n : m * n)) e.push("Cartesian-product calculation is inconsistent.");
  } else if (problem.family === "apcartn") {
    const [variant, m, n, overlap] = p, expected = variant === 0 ? m * n : variant === 1 ? m * n * (overlap + 2) : variant === 2 ? 2 * m * n : m * overlap;
    if (answer !== expected || stepValue(s.length - 1) !== expected) e.push("Cartesian-product variant calculation is inconsistent.");
  } else if (["lin", "lneg"].includes(problem.family)) {
    const [a, b, x] = p, right = a * x + b;
    if (!(a !== 0 && s.length === 2 && s[0].op === "subtract" && s[0].inputs[0] === right && s[0].inputs[1] === b && s[0].value === right - b && s[1].op === "divide" && s[1].inputs[0] === right - b && s[1].inputs[1] === a && s[1].value === x && a * Number(s[1].value) + b === right)) e.push("Two-step equation transformations are not equivalent.");
  } else if (problem.family === "ahone") {
    const [form, a, t] = p, x = form === 3 ? a * t : t;
    const right = form === 0 ? t + a : form === 1 ? t - a : form === 2 ? a * t : t;
    const op = ["subtract", "add", "divide", "multiply"][form];
    const reconstructed = form === 0 ? x + a : form === 1 ? x - a : form === 2 ? a * x : x / a;
    if (!(s.length === 1 && s[0].op === op && s[0].inputs[0] === right && s[0].inputs[1] === a && s[0].value === x && reconstructed === right)) e.push("One-step equation transformation is not equivalent.");
  } else if (["rect", "aearea"].includes(problem.family)) {
    const [l, w] = p;
    if (!(l > 0 && w > 0 && answer === l * w && s.at(-1)?.value === answer)) e.push("Rectangle-area calculation is inconsistent.");
  } else if (problem.family === "rperim") {
    const [l, w] = p;
    if (!(l > 0 && w > 0 && answer === 2 * (l + w) && s[0]?.value === l + w && s[1]?.value === answer)) e.push("Rectangle-perimeter calculation is inconsistent.");
  }
  if (!number(answer)) e.push("The displayed answer is not a finite numeric value.");
  return e;
}

/** Checks every displayed mathematical claim used by the six typed adapters. */
export function validateTeachingPresentation(problem: Problem, presentation: Pick<TeachingPresentation, "workedExample" | "visual">): string[] {
  const errors: string[] = [];
  const family = FAMILIES.get(problem.family);
  const answer = numericAnswer(problem.answer);
  if (!family || !Number.isFinite(answer) || !family.validate(problem.params, answer)) errors.push("The family answer does not validate.");
  errors.push(...validateFamilyStructure(problem));
  const expected = familyWorkedSteps(problem);
  if (!presentation.workedExample || presentation.workedExample.steps.length !== expected.length || expected.some((step, index) => step.expression !== presentation.workedExample?.steps[index]?.expression)) errors.push("Displayed worked steps differ from the checked family steps.");
  const visual = presentation.visual;
  if (["aeind", "aiint", "eqfrac", "adfcmp", "adfname", "adshade", "aocart", "lin", "ahone", "lneg", "rect", "aearea", "rperim"].includes(problem.family) && !visual) errors.push("The family requires a typed teaching visual.");
  if (visual?.kind === "place-value" && Number(visual.rows[0]?.join("")) !== answer) errors.push("The place-value digits do not reconstruct the answer.");
  if (visual?.kind === "number-line" && (visual.from !== problem.params[0] || visual.to !== answer)) errors.push("The number-line endpoints do not match the problem.");
  if (visual?.kind === "fraction-strip") {
    if (!(visual.denominator > 0 && visual.numerator >= 0 && visual.numerator <= visual.denominator)) errors.push("The fraction strip is outside its whole.");
    if (visual.comparison && !(visual.comparison.denominator > 0 && visual.comparison.numerator >= 0 && visual.comparison.numerator <= visual.comparison.denominator)) errors.push("The comparison strip is outside its whole.");
    if (problem.family === "eqfrac" && visual.comparison && visual.numerator * visual.comparison.denominator !== visual.comparison.numerator * visual.denominator) errors.push("The two fraction strips are not equivalent.");
    if (problem.family === "adfcmp" && visual.comparison) {
      const [mode, k, x, y] = problem.params;
      const A = mode === 0 ? [x, k] : [k, x], B = mode === 0 ? [y, k] : [k, y];
      if (visual.numerator !== A[0] || visual.denominator !== A[1] || visual.comparison.numerator !== B[0] || visual.comparison.denominator !== B[1]) errors.push("The comparison strips do not match the two fractions.");
    }
    if (problem.family === "adfname" && (visual.numerator !== problem.params[2] || visual.denominator !== problem.params[0] * problem.params[1])) errors.push("The shaded strip does not match the shape.");
    if (problem.family === "adshade" && (visual.numerator !== answer || visual.denominator !== problem.params[0] * problem.params[1])) errors.push("The shaded strip does not match the requested fraction of the grid.");
  }
  if (visual?.kind === "cartesian-grid") {
    if (problem.family === "aocart") {
      const [m, n, mode] = problem.params;
      if (visual.rows.length !== m || visual.columns.length !== n) errors.push("The Cartesian grid dimensions do not match the sets.");
      if ((mode === 0 && visual.rows.length * visual.columns.length !== answer) || (mode === 2 && visual.columns.length !== answer)) errors.push("The Cartesian grid does not match the answer.");
    } else if (problem.family === "apcartn") {
      const [variant, m, n, overlap] = problem.params;
      const columns = variant === 0 ? n : overlap;
      if ((variant !== 0 && variant !== 3) || visual.rows.length !== m || visual.columns.length !== columns || visual.rows.length * visual.columns.length !== answer) errors.push("The Cartesian-product variant cannot be represented by this grid.");
    }
  }
  if (visual?.kind === "equation") {
    if (!["lin", "ahone", "lneg"].includes(problem.family)) errors.push("This family has no structured equation verifier.");
    const expected = familyTeachingVisual(problem);
    if (expected?.kind !== "equation" || expected.lines.length !== visual.lines.length || expected.lines.some((line, index) => line !== visual.lines[index])) errors.push("Displayed equation lines differ from the structured equivalent transformations.");
  }
  if (visual?.kind === "geometry") {
    const l = Number(visual.labels.length), w = Number(visual.labels.width);
    const shownMeasure = problem.family === "rperim" ? 2 * (l + w) : l * w;
    if (shownMeasure !== answer) errors.push("The labelled dimensions do not produce the checked measure.");
    const expectedUnit = problem.family === "rperim" ? "cm" : problem.family === "rect" ? "cm²" : problem.family === "aearea" ? "square units" : undefined;
    if (expectedUnit && visual.labels.measureUnit !== expectedUnit) errors.push("The labelled measure uses an inconsistent unit.");
    const expectedDimensionUnit = problem.family === "aearea" ? "units" : ["rect", "rperim"].includes(problem.family) ? "cm" : undefined;
    if (expectedDimensionUnit && visual.labels.dimensionUnit !== expectedDimensionUnit) errors.push("The labelled dimensions use an inconsistent unit.");
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
  const adaptedProblem = args.visualProblem ?? problem;
  const explicit = !!adaptedProblem && explicitFamily(adaptedProblem.family);
  const visual = adaptedProblem ? familyTeachingVisual(adaptedProblem) : undefined;
  const resolvedVisual = visual ?? (!explicit ? visualPresentation(args.visual ?? adaptedProblem?.figure, adaptedProblem) ?? visualPresentation(screen.widget, problem) : undefined);
  const misconception: Bug | undefined = problem?.bugs.find((bug) => bug.predict !== null);
  const supported = !!problem && steps.length > 0;
  const result: TeachingPresentation = {
    version: TEACHING_PRESENTATION_VERSION,
    status: supported ? "supported" : "unsupported",
    concept: module.title,
    objective: `Understand ${module.title.toLocaleLowerCase()} and explain each mathematical step.`,
    explanation: screen.text,
    workedExample: supported ? { question: question?.prompt ?? expressions[0] ?? problem.prompt, steps } : null,
    ...(resolvedVisual ? { visual: resolvedVisual } : {}),
    ...(problem?.family === "fadd" ? { diagramUnsupported: "Like-fraction addition and subtraction need an operation diagram; an equivalent-fraction strip would be misleading." } : {}),
    ...(problem?.family === "aocart" && problem.params[2] === 1 ? { diagramUnsupported: "Counting relations needs a subset representation; an ordered-pair grid alone would be misleading." } : {}),
    ...(problem?.family === "apcartn" && !resolvedVisual ? { diagramUnsupported: "This Cartesian-product variant needs a three-dimensional, union, or intersection representation; a two-set grid would be misleading." } : {}),
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
